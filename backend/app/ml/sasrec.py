"""
SASRec (Self-Attentive Sequential Recommendation)
- 用途: 序列推荐召回 + 精排
- 原理: 用单向 Transformer 建模用户行为序列, 预测下一个交互 item
- 论文: Self-Attentive Sequential Recommendation (ICDM 2018)
- 工业应用: 抖音/快手 feed 流推荐, 序列召回

核心思想:
  - 将用户行为序列视为"句子", item 视为"token"
  - 用 Causal Self-Attention (类似 GPT) 建模序列依赖
  - 预测序列中下一个 item (next-item prediction)
  
优势:
  - 比 GRU4Rec 更好地捕捉长距离依赖
  - 训练高效 (不像 RNN 需要序列化计算)
  - 可以捕捉不同时间尺度的用户兴趣模式
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import math


class PointWiseFeedForward(nn.Module):
    """Position-wise Feed-Forward Network"""

    def __init__(self, hidden_dim, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim * 4),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 4, hidden_dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)


class SASRecBlock(nn.Module):
    """单个 Transformer Block (Causal)"""

    def __init__(self, hidden_dim, num_heads, dropout=0.1):
        super().__init__()
        self.attention = nn.MultiheadAttention(
            hidden_dim, num_heads, dropout=dropout, batch_first=True
        )
        self.ffn = PointWiseFeedForward(hidden_dim, dropout)
        self.norm1 = nn.LayerNorm(hidden_dim)
        self.norm2 = nn.LayerNorm(hidden_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, attn_mask=None, key_padding_mask=None):
        # Self-Attention with causal mask
        residual = x
        x = self.norm1(x)
        x, _ = self.attention(x, x, x, attn_mask=attn_mask, key_padding_mask=key_padding_mask)
        x = self.dropout(x) + residual

        # FFN
        residual = x
        x = self.norm2(x)
        x = self.ffn(x) + residual
        return x


class SASRec(nn.Module):
    """
    SASRec 完整实现
    
    输入: 用户行为序列 [item_1, item_2, ..., item_T]
    输出: 每个位置预测下一个 item 的概率分布
    
    训练:
      - 正样本: 序列中下一个实际点击的 item
      - 负样本: 随机采样 + popularity-based sampling
      - Loss: Binary Cross-Entropy (per-position)
    
    推理:
      - 取最后一个位置的 hidden state 作为用户表示
      - 与所有 item embedding 内积 → top-K 召回
    """

    def __init__(self, config):
        super().__init__()
        self.num_items = config['num_items']
        self.max_seq_len = config.get('max_seq_len', 50)
        hidden_dim = config.get('hidden_dim', 64)
        num_heads = config.get('num_heads', 2)
        num_layers = config.get('num_layers', 2)
        dropout = config.get('dropout', 0.2)

        # Item Embedding + Position Embedding
        self.item_emb = nn.Embedding(self.num_items + 1, hidden_dim, padding_idx=0)
        self.pos_emb = nn.Embedding(self.max_seq_len, hidden_dim)
        self.emb_dropout = nn.Dropout(dropout)

        # Transformer Blocks (Causal)
        self.blocks = nn.ModuleList([
            SASRecBlock(hidden_dim, num_heads, dropout)
            for _ in range(num_layers)
        ])

        self.final_norm = nn.LayerNorm(hidden_dim)

    def _causal_mask(self, seq_len, device):
        """生成 causal attention mask (下三角)"""
        mask = torch.triu(torch.ones(seq_len, seq_len, device=device), diagonal=1)
        return mask.bool()  # True = masked

    def forward(self, item_seq, return_all_positions=False):
        """
        Args:
            item_seq: [B, T] item id 序列 (0=padding)
            return_all_positions: 是否返回所有位置的输出
        Returns:
            如果 return_all_positions: [B, T, D]
            否则: [B, D] (最后一个有效位置)
        """
        B, T = item_seq.size()
        device = item_seq.device

        # Embedding
        positions = torch.arange(T, device=device).unsqueeze(0).expand(B, -1)
        x = self.item_emb(item_seq) + self.pos_emb(positions)
        x = self.emb_dropout(x)

        # Causal mask only (不用 key_padding_mask 避免全 mask 导致 NaN)
        causal_mask = self._causal_mask(T, device)

        # Transformer blocks
        for block in self.blocks:
            x = block(x, attn_mask=causal_mask, key_padding_mask=None)

        x = self.final_norm(x)

        if return_all_positions:
            return x  # [B, T, D]

        # 取最后一个有效位置
        lengths = (item_seq != 0).sum(dim=1) - 1  # [B]
        last_hidden = x[torch.arange(B, device=device), lengths]  # [B, D]
        return last_hidden

    def predict_next(self, item_seq, candidate_items=None):
        """
        预测下一个 item
        Args:
            item_seq: [B, T]
            candidate_items: [B, K] 候选 item id (如为 None, 对所有 item 打分)
        Returns:
            scores: [B, K] or [B, num_items]
        """
        user_emb = self.forward(item_seq)  # [B, D]

        if candidate_items is not None:
            # 对指定候选打分
            item_emb = self.item_emb(candidate_items)  # [B, K, D]
            scores = torch.bmm(item_emb, user_emb.unsqueeze(-1)).squeeze(-1)  # [B, K]
        else:
            # 对所有 item 打分
            all_item_emb = self.item_emb.weight[1:]  # [N, D] (skip padding)
            scores = torch.matmul(user_emb, all_item_emb.T)  # [B, N]

        return scores

    def compute_loss(self, item_seq, pos_items, neg_items):
        """
        BPR-style loss for training
        Args:
            item_seq: [B, T] 输入序列
            pos_items: [B, T] 正样本 (next item)
            neg_items: [B, T] 负样本 (random)
        """
        seq_output = self.forward(item_seq, return_all_positions=True)  # [B, T, D]

        pos_emb = self.item_emb(pos_items)  # [B, T, D]
        neg_emb = self.item_emb(neg_items)  # [B, T, D]

        pos_score = (seq_output * pos_emb).sum(dim=-1)  # [B, T]
        neg_score = (seq_output * neg_emb).sum(dim=-1)  # [B, T]

        # Mask padding
        mask = (item_seq != 0).float()
        loss = -torch.log(torch.sigmoid(pos_score - neg_score) + 1e-8)
        loss = (loss * mask).sum() / mask.sum()
        return loss


SASREC_CONFIG = {
    'num_items': 5000,
    'max_seq_len': 50,
    'hidden_dim': 64,
    'num_heads': 2,
    'num_layers': 2,
    'dropout': 0.2,
}
