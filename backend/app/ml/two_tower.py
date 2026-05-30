"""
双塔模型 (Two-Tower / DSSM)
- 用途: 召回阶段 + 粗排
- 原理: User Tower 和 Item Tower 分别编码, 内积计算相似度
- 论文: Learning Deep Structured Semantic Models (Microsoft, 2013)
- 工业应用: YouTube DNN, 美团/阿里搜索召回

架构:
  User Tower:  [user_id, age, gender, city, behavior_seq] → MLP → user_emb (64-dim)
  Item Tower:  [item_id, category, city, text_emb] → MLP → item_emb (64-dim)
  Score = cosine(user_emb, item_emb)

训练:
  - 正样本: 用户点击/收藏/预约的 item
  - 负样本: In-batch negatives + Random negatives + Hard negatives
  - Loss: Sampled Softmax / InfoNCE
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class UserTower(nn.Module):
    """用户塔: 将用户特征编码为低维向量"""

    def __init__(self, config):
        super().__init__()
        self.user_emb = nn.Embedding(config['num_users'], config['emb_dim'])
        self.city_emb = nn.Embedding(config['num_cities'], 16)
        self.age_emb = nn.Embedding(10, 8)  # 年龄分桶

        # 行为序列编码 (简化版 DIN attention, 完整版见 din.py)
        self.seq_attention = nn.MultiheadAttention(
            embed_dim=config['emb_dim'], num_heads=4, batch_first=True
        )

        input_dim = config['emb_dim'] + 16 + 8 + config['emb_dim']  # user + city + age + seq
        self.mlp = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Linear(128, config['output_dim']),
        )

    def forward(self, user_id, city_id, age_bucket, behavior_seq, behavior_mask=None):
        """
        Args:
            user_id: [B]
            city_id: [B]
            age_bucket: [B]
            behavior_seq: [B, seq_len, emb_dim] 用户历史行为的 item embedding
            behavior_mask: [B, seq_len] padding mask
        """
        user_feat = self.user_emb(user_id)
        city_feat = self.city_emb(city_id)
        age_feat = self.age_emb(age_bucket)

        # Self-attention 聚合行为序列
        seq_out, _ = self.seq_attention(
            behavior_seq, behavior_seq, behavior_seq,
            key_padding_mask=behavior_mask
        )
        seq_feat = seq_out.mean(dim=1)  # [B, emb_dim]

        x = torch.cat([user_feat, city_feat, age_feat, seq_feat], dim=-1)
        return F.normalize(self.mlp(x), dim=-1)


class ItemTower(nn.Module):
    """物品塔: 将物品特征编码为低维向量"""

    def __init__(self, config):
        super().__init__()
        self.item_emb = nn.Embedding(config['num_items'], config['emb_dim'])
        self.category_emb = nn.Embedding(config['num_categories'], 16)
        self.city_emb = nn.Embedding(config['num_cities'], 16)

        # 文本特征投影 (from text2vec 768-dim → emb_dim)
        self.text_proj = nn.Linear(768, config['emb_dim'])

        input_dim = config['emb_dim'] + 16 + 16 + config['emb_dim']
        self.mlp = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Linear(128, config['output_dim']),
        )

    def forward(self, item_id, category_id, city_id, text_emb):
        """
        Args:
            item_id: [B]
            category_id: [B]
            city_id: [B]
            text_emb: [B, 768] 预计算的文本向量
        """
        item_feat = self.item_emb(item_id)
        cat_feat = self.category_emb(category_id)
        city_feat = self.city_emb(city_id)
        text_feat = self.text_proj(text_emb)

        x = torch.cat([item_feat, cat_feat, city_feat, text_feat], dim=-1)
        return F.normalize(self.mlp(x), dim=-1)


class TwoTowerModel(nn.Module):
    """
    双塔模型完整实现
    训练时: 计算 batch 内 user-item 相似度矩阵, InfoNCE loss
    推理时: 分别编码 user/item, ANN 检索
    """

    def __init__(self, config):
        super().__init__()
        self.user_tower = UserTower(config)
        self.item_tower = ItemTower(config)
        self.temperature = nn.Parameter(torch.tensor(0.07))

    def forward(self, user_features, item_features):
        """训练前向: 返回 logits matrix"""
        user_emb = self.user_tower(**user_features)   # [B, D]
        item_emb = self.item_tower(**item_features)   # [B, D]

        # In-batch negatives: [B, B] similarity matrix
        logits = torch.matmul(user_emb, item_emb.T) / self.temperature.exp()
        return logits

    def compute_loss(self, logits):
        """InfoNCE Loss (对角线为正样本)"""
        labels = torch.arange(logits.size(0), device=logits.device)
        loss = F.cross_entropy(logits, labels)
        return loss

    @torch.no_grad()
    def encode_user(self, user_features):
        """推理时编码用户"""
        return self.user_tower(**user_features)

    @torch.no_grad()
    def encode_item(self, item_features):
        """推理时编码物品"""
        return self.item_tower(**item_features)


# === 默认配置 ===
DEFAULT_CONFIG = {
    'num_users': 10000,
    'num_items': 5000,
    'num_cities': 10,
    'num_categories': 20,
    'emb_dim': 64,
    'output_dim': 64,
}
