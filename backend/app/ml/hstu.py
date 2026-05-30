"""
HSTU (Hierarchical Sequential Transduction Units)
- 来源: Meta 2024, "Actions Speak Louder than Words" (KDD 2024)
- 用途: 统一的序列推荐骨干网络, 替代传统 Transformer
- 核心创新:
  1. Pointwise Aggregated Attention: O(n) 复杂度替代 O(n²) self-attention
  2. Stochastic Length (随机长度裁剪): 训练时动态截断序列
  3. 跨特征融合: 将用户行为的异构信号统一建模
  
- 工业优势:
  - 比标准 Transformer 推理快 15.2x
  - Meta 线上服务 1.5 trillion 参数级模型的骨干
  - 支持 8192+ 长度序列

架构:
  Input: 用户行为序列 [(action_type, item_id, timestamp), ...]
       → 异构 Embedding (action + item + time)
       → Pointwise Aggregated Attention (多层)
       → 生成式输出 (下一个 action 预测)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional


class PointwiseAggregatedAttention(nn.Module):
    """
    HSTU 核心: Pointwise Aggregated Attention
    
    vs 标准 Self-Attention:
      标准: Attn(Q,K,V) = softmax(QK^T/√d) @ V  →  O(n²d)
      HSTU: 用 element-wise 操作替代矩阵乘法 → O(nd)
    
    公式:
      a_i = σ(q_i ⊙ (Σ_{j≤i} k_j)) ⊙ (Σ_{j≤i} v_j)  (causal)
    
    其中 Σ_{j≤i} 用 cumsum 高效实现
    """

    def __init__(self, dim, num_heads=4, dropout=0.1):
        super().__init__()
        self.dim = dim
        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        assert dim % num_heads == 0

        self.q_proj = nn.Linear(dim, dim)
        self.k_proj = nn.Linear(dim, dim)
        self.v_proj = nn.Linear(dim, dim)
        self.out_proj = nn.Linear(dim, dim)

        self.gate = nn.Linear(dim, dim)
        self.dropout = nn.Dropout(dropout)
        self.norm = nn.LayerNorm(dim)

    def forward(self, x, causal=True):
        """
        Args:
            x: [B, T, D]
            causal: 是否因果 (只看过去)
        Returns:
            output: [B, T, D]
        """
        B, T, D = x.size()
        
        q = self.q_proj(x)  # [B, T, D]
        k = self.k_proj(x)  # [B, T, D]
        v = self.v_proj(x)  # [B, T, D]

        # Reshape to multi-head
        q = q.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)  # [B, H, T, d]
        k = k.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)

        if causal:
            # Causal cumulative sum: 每个位置只聚合之前的 key/value
            k_cumsum = torch.cumsum(k, dim=2)  # [B, H, T, d]
            v_cumsum = torch.cumsum(v, dim=2)  # [B, H, T, d]
        else:
            # 全局聚合
            k_cumsum = k.sum(dim=2, keepdim=True).expand_as(k)
            v_cumsum = v.sum(dim=2, keepdim=True).expand_as(v)

        # Pointwise aggregation: a = σ(q ⊙ k_agg) ⊙ v_agg
        attn_weights = torch.sigmoid(q * k_cumsum)  # [B, H, T, d]
        output = attn_weights * v_cumsum  # [B, H, T, d]

        # Merge heads
        output = output.transpose(1, 2).contiguous().view(B, T, D)
        
        # Gating mechanism
        gate = torch.sigmoid(self.gate(x))
        output = gate * self.out_proj(output)
        output = self.dropout(output)
        
        return self.norm(x + output)


class HSTUBlock(nn.Module):
    """HSTU 单层 Block"""

    def __init__(self, dim, num_heads=4, ffn_ratio=4, dropout=0.1):
        super().__init__()
        self.attention = PointwiseAggregatedAttention(dim, num_heads, dropout)
        self.ffn = nn.Sequential(
            nn.Linear(dim, dim * ffn_ratio),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * ffn_ratio, dim),
            nn.Dropout(dropout),
        )
        self.norm = nn.LayerNorm(dim)

    def forward(self, x, causal=True):
        x = self.attention(x, causal=causal)
        residual = x
        x = self.norm(x)
        x = residual + self.ffn(x)
        return x


class HSTU(nn.Module):
    """
    HSTU 完整模型 (Generative Recommendation)
    
    输入: 异构行为序列
      - action_type: click, view, like, purchase, search, dwell
      - item_id: 被交互的物品
      - timestamp: 交互时间
      
    输出: 下一个交互的 item 概率分布 (生成式)
    
    训练目标: 
      - Next-Action Prediction (联合预测 action_type + item_id)
      - Auxiliary: 用户停留时长预测
    
    关键技巧:
      1. Stochastic Length: 训练时随机截断序列, 增强泛化
      2. 时间编码: 相对时间间隔 + 绝对时间位置
      3. Action-aware: 不同行为类型用不同权重
    """

    def __init__(self, config):
        super().__init__()
        self.num_items = config['num_items']
        self.num_actions = config.get('num_actions', 6)  # click/view/like/purchase/search/dwell
        self.max_seq_len = config.get('max_seq_len', 512)
        dim = config.get('hidden_dim', 128)
        num_layers = config.get('num_layers', 4)
        num_heads = config.get('num_heads', 4)
        dropout = config.get('dropout', 0.1)

        # Embedding
        self.item_emb = nn.Embedding(self.num_items + 1, dim, padding_idx=0)
        self.action_emb = nn.Embedding(self.num_actions + 1, dim)
        
        # 时间编码 (相对时间间隔)
        self.time_proj = nn.Sequential(
            nn.Linear(1, dim // 4),
            nn.ReLU(),
            nn.Linear(dim // 4, dim),
        )
        
        # 位置编码 (可学习)
        self.pos_emb = nn.Embedding(self.max_seq_len, dim)
        
        # 融合层: item + action + time → unified representation
        self.fusion = nn.Linear(dim * 3, dim)
        self.emb_norm = nn.LayerNorm(dim)
        self.emb_dropout = nn.Dropout(dropout)

        # HSTU Blocks
        self.blocks = nn.ModuleList([
            HSTUBlock(dim, num_heads, ffn_ratio=4, dropout=dropout)
            for _ in range(num_layers)
        ])

        self.final_norm = nn.LayerNorm(dim)
        
        # 输出头
        self.item_head = nn.Linear(dim, self.num_items)  # 预测下一个 item
        self.action_head = nn.Linear(dim, self.num_actions)  # 预测下一个 action type

    def forward(self, item_seq, action_seq, time_deltas, stochastic_length=True):
        """
        Args:
            item_seq: [B, T] item id 序列
            action_seq: [B, T] action type 序列
            time_deltas: [B, T] 时间间隔 (秒, log-scaled)
            stochastic_length: 是否启用随机长度截断 (训练时)
        Returns:
            item_logits: [B, T, num_items]
            action_logits: [B, T, num_actions]
        """
        B, T = item_seq.size()
        device = item_seq.device

        # Stochastic Length (训练技巧)
        if stochastic_length and self.training:
            # 随机截断为原长度的 50%~100%
            min_len = max(T // 2, 1)
            truncated_len = torch.randint(min_len, T + 1, (1,)).item()
            item_seq = item_seq[:, :truncated_len]
            action_seq = action_seq[:, :truncated_len]
            time_deltas = time_deltas[:, :truncated_len]
            T = truncated_len

        # Embedding
        item_feat = self.item_emb(item_seq)  # [B, T, D]
        action_feat = self.action_emb(action_seq)  # [B, T, D]
        time_feat = self.time_proj(time_deltas.unsqueeze(-1))  # [B, T, D]

        # 位置编码
        positions = torch.arange(T, device=device).unsqueeze(0).expand(B, -1)
        pos_feat = self.pos_emb(positions)

        # 融合
        fused = self.fusion(torch.cat([item_feat, action_feat, time_feat], dim=-1))
        x = self.emb_norm(fused + pos_feat)
        x = self.emb_dropout(x)

        # HSTU Blocks
        for block in self.blocks:
            x = block(x, causal=True)

        x = self.final_norm(x)

        # 预测输出
        item_logits = self.item_head(x)  # [B, T, num_items]
        action_logits = self.action_head(x)  # [B, T, num_actions]

        return item_logits, action_logits

    def compute_loss(self, item_seq, action_seq, time_deltas, target_items, target_actions):
        """
        训练损失: item prediction loss + action prediction loss
        """
        item_logits, action_logits = self.forward(item_seq, action_seq, time_deltas)
        
        # Item prediction loss (cross-entropy)
        item_loss = F.cross_entropy(
            item_logits[:, :-1].reshape(-1, self.num_items),
            target_items[:, 1:].reshape(-1),
            ignore_index=0,  # padding
        )
        
        # Action prediction loss
        action_loss = F.cross_entropy(
            action_logits[:, :-1].reshape(-1, self.num_actions),
            target_actions[:, 1:].reshape(-1),
            ignore_index=0,
        )
        
        return item_loss + 0.1 * action_loss

    @torch.no_grad()
    def generate_next(self, item_seq, action_seq, time_deltas, top_k=20):
        """
        生成式推理: 预测下一个最可能交互的 item
        """
        self.eval()
        item_logits, action_logits = self.forward(
            item_seq, action_seq, time_deltas, stochastic_length=False
        )
        
        # 取最后一个位置的预测
        last_item_logits = item_logits[:, -1, :]  # [B, num_items]
        last_action_logits = action_logits[:, -1, :]  # [B, num_actions]
        
        # Top-K items
        item_probs = F.softmax(last_item_logits, dim=-1)
        top_scores, top_items = item_probs.topk(top_k, dim=-1)
        
        # 预测的 action type
        action_probs = F.softmax(last_action_logits, dim=-1)
        predicted_action = action_probs.argmax(dim=-1)
        
        return top_items, top_scores, predicted_action


HSTU_CONFIG = {
    'num_items': 5000,
    'num_actions': 6,
    'max_seq_len': 512,
    'hidden_dim': 128,
    'num_layers': 4,
    'num_heads': 4,
    'dropout': 0.1,
}
