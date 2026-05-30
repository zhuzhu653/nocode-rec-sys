"""
TIGER (Semantic ID-based Generative Recommendation)
- 来源: Google 2024, "Recommender Systems with Generative Retrieval" (NeurIPS 2023)
        + TIGER: "Text-to-ID Generative Retrieval" (Google 2024)
- 用途: 用语义 ID 做生成式检索, 统一召回和排序
- 核心创新:
  1. Semantic ID: 用 RQ-VAE 将 item embedding 离散化为语义 token 序列
  2. Generative Retrieval: 自回归生成 Semantic ID, 不需要 ANN 索引
  3. 统一框架: 召回和排序在同一模型内完成

架构:
  Phase 1 - Semantic ID 生成:
    Item Text/Features → Encoder → Continuous Embedding → RQ-VAE → Semantic ID Tokens
    例: "隐世书局" → [42, 17, 83] (3层量化码本)
    
  Phase 2 - 生成式推荐:
    User Behavior Sequence → Transformer → 自回归生成 Semantic ID
    [user actions...] → Model → [42] → [42, 17] → [42, 17, 83] → 解码为 "隐世书局"

优势:
  - 不需要 FAISS/ANN 索引, 生成过程即检索
  - 语义 ID 保留了 item 的语义结构
  - 新 item 可以通过 encoder 获得 Semantic ID (解决冷启动)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional, Tuple


class ResidualQuantizer(nn.Module):
    """
    RQ-VAE (Residual Quantized Variational Auto-Encoder)
    将连续向量量化为多层离散 token
    
    过程:
      x → 查找最近码字 c1 → 残差 r1 = x - c1
      r1 → 查找最近码字 c2 → 残差 r2 = r1 - c2
      ...
      Semantic ID = [c1_idx, c2_idx, ..., cL_idx]
    """

    def __init__(self, input_dim, num_codebooks=3, codebook_size=256, hidden_dim=128):
        super().__init__()
        self.num_codebooks = num_codebooks
        self.codebook_size = codebook_size

        # 投影到量化空间
        self.input_proj = nn.Linear(input_dim, hidden_dim)

        # 多层码本
        self.codebooks = nn.ParameterList([
            nn.Parameter(torch.randn(codebook_size, hidden_dim) * 0.01)
            for _ in range(num_codebooks)
        ])

        # EMA 更新统计
        self.register_buffer('_ema_counts', torch.zeros(num_codebooks, codebook_size))
        self.register_buffer('_ema_means', torch.zeros(num_codebooks, codebook_size, hidden_dim))

    def quantize_single(self, x, codebook_idx):
        """单层量化"""
        codebook = self.codebooks[codebook_idx]  # [K, D]
        
        # 计算距离
        distances = torch.cdist(x.unsqueeze(0), codebook.unsqueeze(0)).squeeze(0)  # [B, K]
        
        # 最近邻
        indices = distances.argmin(dim=-1)  # [B]
        quantized = codebook[indices]  # [B, D]
        
        return indices, quantized

    def forward(self, x):
        """
        Args:
            x: [B, input_dim] item embedding
        Returns:
            semantic_ids: [B, num_codebooks] 语义 ID token 序列
            quantized: [B, hidden_dim] 量化后的向量
            commitment_loss: VQ-VAE 训练损失
        """
        h = self.input_proj(x)  # [B, D]
        
        all_indices = []
        residual = h
        quantized_total = torch.zeros_like(h)
        commitment_loss = 0

        for i in range(self.num_codebooks):
            indices, quantized = self.quantize_single(residual, i)
            all_indices.append(indices)
            
            # 直通梯度 (Straight-Through Estimator)
            quantized_st = residual + (quantized - residual).detach()
            quantized_total = quantized_total + quantized_st
            
            # Commitment loss
            commitment_loss += F.mse_loss(residual.detach(), quantized) + \
                             F.mse_loss(residual, quantized.detach())
            
            # 残差
            residual = residual - quantized.detach()

        semantic_ids = torch.stack(all_indices, dim=-1)  # [B, L]
        return semantic_ids, quantized_total, commitment_loss

    @torch.no_grad()
    def encode(self, x):
        """推理: item embedding → Semantic ID"""
        semantic_ids, _, _ = self.forward(x)
        return semantic_ids

    @torch.no_grad()
    def decode(self, semantic_ids):
        """Semantic ID → 量化向量"""
        B, L = semantic_ids.size()
        result = torch.zeros(B, self.codebooks[0].size(1), device=semantic_ids.device)
        for i in range(L):
            result += self.codebooks[i][semantic_ids[:, i]]
        return result


class TIGERModel(nn.Module):
    """
    TIGER: 生成式推荐模型
    
    训练流程:
      Phase 1: 训练 RQ-VAE, 为所有 item 生成 Semantic ID
      Phase 2: 训练生成模型, 根据用户行为序列自回归预测 Semantic ID
    
    推理流程:
      User Seq → 自回归生成 → Beam Search → 候选 Semantic IDs → 查表得到 Items
    """

    def __init__(self, config):
        super().__init__()
        self.num_items = config['num_items']
        self.num_codebooks = config.get('num_codebooks', 3)
        self.codebook_size = config.get('codebook_size', 256)
        dim = config.get('hidden_dim', 128)
        num_layers = config.get('num_layers', 4)
        num_heads = config.get('num_heads', 4)
        max_seq_len = config.get('max_seq_len', 100)

        # RQ-VAE for Semantic ID generation
        self.rq_vae = ResidualQuantizer(
            input_dim=config.get('item_emb_dim', 768),
            num_codebooks=self.num_codebooks,
            codebook_size=self.codebook_size,
            hidden_dim=dim,
        )

        # User behavior encoder
        self.item_emb = nn.Embedding(self.num_items + 1, dim, padding_idx=0)
        self.pos_emb = nn.Embedding(max_seq_len, dim)
        
        # Transformer encoder (编码用户行为)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=dim, nhead=num_heads, dim_feedforward=dim * 4,
            dropout=0.1, batch_first=True,
        )
        self.user_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Semantic ID decoder (自回归生成)
        # 输入: [BOS] + semantic_id_tokens
        self.sid_emb = nn.Embedding(self.codebook_size + 2, dim)  # +2 for BOS/EOS
        self.BOS_TOKEN = self.codebook_size
        self.EOS_TOKEN = self.codebook_size + 1
        
        decoder_layer = nn.TransformerDecoderLayer(
            d_model=dim, nhead=num_heads, dim_feedforward=dim * 4,
            dropout=0.1, batch_first=True,
        )
        self.sid_decoder = nn.TransformerDecoder(decoder_layer, num_layers=2)
        
        # 输出: 预测下一个 token
        self.token_heads = nn.ModuleList([
            nn.Linear(dim, self.codebook_size)
            for _ in range(self.num_codebooks)
        ])

        # Semantic ID → Item 查找表 (推理时构建)
        self.sid_to_item = {}  # tuple(semantic_id) → item_id

    def encode_user(self, item_seq):
        """编码用户行为序列"""
        B, T = item_seq.size()
        device = item_seq.device
        
        positions = torch.arange(T, device=device).unsqueeze(0).expand(B, -1)
        x = self.item_emb(item_seq) + self.pos_emb(positions)
        
        # Causal mask
        mask = nn.Transformer.generate_square_subsequent_mask(T, device=device)
        padding_mask = (item_seq == 0)
        
        user_repr = self.user_encoder(x, mask=mask, src_key_padding_mask=padding_mask)
        return user_repr[:, -1, :]  # 取最后位置 [B, D]

    def decode_semantic_id(self, user_emb, target_sid=None):
        """
        自回归解码 Semantic ID
        Args:
            user_emb: [B, D] 用户表示
            target_sid: [B, L] 训练时的目标 Semantic ID (teacher forcing)
        Returns:
            logits: list of [B, codebook_size] 每层的预测 logits
        """
        B = user_emb.size(0)
        device = user_emb.device

        # Memory: 用户表示作为 cross-attention 的 memory
        memory = user_emb.unsqueeze(1)  # [B, 1, D]

        logits = []
        
        if target_sid is not None:
            # Teacher forcing
            for i in range(self.num_codebooks):
                if i == 0:
                    # 第一层: 只用 BOS
                    bos = torch.full((B, 1), self.BOS_TOKEN, device=device, dtype=torch.long)
                    decoder_input = self.sid_emb(bos)
                else:
                    # 后续层: BOS + 之前的 token
                    prev_tokens = torch.cat([
                        torch.full((B, 1), self.BOS_TOKEN, device=device, dtype=torch.long),
                        target_sid[:, :i],
                    ], dim=1)
                    decoder_input = self.sid_emb(prev_tokens)

                decoded = self.sid_decoder(decoder_input, memory)
                layer_logits = self.token_heads[i](decoded[:, -1, :])  # [B, K]
                logits.append(layer_logits)
        else:
            # 自回归生成
            generated_tokens = []
            for i in range(self.num_codebooks):
                if i == 0:
                    bos = torch.full((B, 1), self.BOS_TOKEN, device=device, dtype=torch.long)
                    decoder_input = self.sid_emb(bos)
                else:
                    prev = torch.cat([
                        torch.full((B, 1), self.BOS_TOKEN, device=device, dtype=torch.long),
                        torch.stack(generated_tokens, dim=1),
                    ], dim=1)
                    decoder_input = self.sid_emb(prev)

                decoded = self.sid_decoder(decoder_input, memory)
                layer_logits = self.token_heads[i](decoded[:, -1, :])
                logits.append(layer_logits)
                
                # Greedy decode
                token = layer_logits.argmax(dim=-1)  # [B]
                generated_tokens.append(token)

        return logits

    def forward(self, item_seq, target_sids):
        """
        训练前向
        Args:
            item_seq: [B, T] 用户行为序列
            target_sids: [B, num_codebooks] 目标 item 的 Semantic ID
        Returns:
            loss: 生成损失
        """
        user_emb = self.encode_user(item_seq)
        logits = self.decode_semantic_id(user_emb, target_sid=target_sids)
        
        # Cross-entropy loss for each codebook level
        loss = 0
        for i, layer_logits in enumerate(logits):
            loss += F.cross_entropy(layer_logits, target_sids[:, i])
        
        return loss / self.num_codebooks

    @torch.no_grad()
    def generate(self, item_seq, beam_size=10, top_k=20):
        """
        Beam Search 生成推荐
        Args:
            item_seq: [B, T]
            beam_size: beam 宽度
            top_k: 最终返回数量
        Returns:
            recommended_sids: [B, top_k, num_codebooks] 生成的 Semantic IDs
            scores: [B, top_k] 生成概率
        """
        self.eval()
        B = item_seq.size(0)
        device = item_seq.device
        
        user_emb = self.encode_user(item_seq)  # [B, D]
        
        # Beam search (simplified for batch_size=1)
        # 逐层生成, 每层保留 top-beam_size 候选
        beams = [([], 0.0)]  # (token_list, log_prob)
        
        memory = user_emb.unsqueeze(1)  # [B, 1, D]
        
        for layer_idx in range(self.num_codebooks):
            new_beams = []
            for tokens, score in beams:
                # 构建 decoder input
                if not tokens:
                    bos = torch.full((1, 1), self.BOS_TOKEN, device=device, dtype=torch.long)
                    decoder_input = self.sid_emb(bos)
                else:
                    prev = torch.tensor([[self.BOS_TOKEN] + tokens], device=device, dtype=torch.long)
                    decoder_input = self.sid_emb(prev)
                
                decoded = self.sid_decoder(decoder_input, memory[:1])
                logits = self.token_heads[layer_idx](decoded[:, -1, :])  # [1, K]
                log_probs = F.log_softmax(logits, dim=-1).squeeze(0)  # [K]
                
                # Top-beam_size extensions
                top_probs, top_tokens = log_probs.topk(beam_size)
                for prob, token in zip(top_probs.tolist(), top_tokens.tolist()):
                    new_beams.append((tokens + [token], score + prob))
            
            # 保留 top beams
            new_beams.sort(key=lambda x: x[1], reverse=True)
            beams = new_beams[:beam_size]
        
        # 返回 top-k 结果
        results = []
        scores = []
        for tokens, score in beams[:top_k]:
            results.append(tokens)
            scores.append(score)
        
        return results, scores

    def build_sid_index(self, all_item_embeddings, all_item_ids):
        """
        构建 Semantic ID → Item 查找表
        Args:
            all_item_embeddings: [N, emb_dim] 所有 item 的原始 embedding
            all_item_ids: [N] 对应的 item_id
        """
        semantic_ids = self.rq_vae.encode(all_item_embeddings)  # [N, L]
        for i, item_id in enumerate(all_item_ids):
            sid_tuple = tuple(semantic_ids[i].cpu().tolist())
            self.sid_to_item[sid_tuple] = item_id

    def sid_to_items(self, semantic_ids_list):
        """将生成的 Semantic ID 转换回 item_id"""
        items = []
        for sid in semantic_ids_list:
            sid_tuple = tuple(sid)
            item_id = self.sid_to_item.get(sid_tuple)
            if item_id is not None:
                items.append(item_id)
        return items


TIGER_CONFIG = {
    'num_items': 5000,
    'item_emb_dim': 768,  # text2vec 输出维度
    'num_codebooks': 3,
    'codebook_size': 256,
    'hidden_dim': 128,
    'num_layers': 4,
    'num_heads': 4,
    'max_seq_len': 100,
}
