"""
DIN (Deep Interest Network) - 精排模型
- 用途: CTR 预估精排
- 原理: 用 Target Attention 加权用户历史行为, 动态捕捉用户对当前候选 item 的兴趣
- 论文: Deep Interest Network for Click-Through Rate Prediction (Alibaba, KDD 2018)
- 工业应用: 淘宝推荐/广告, 美团搜索排序

核心创新:
  传统方法: 对用户行为序列做 pooling (sum/mean) → 信息损失
  DIN: 用候选 item 作为 query, attention 加权行为序列 → 自适应兴趣表达

扩展: DIEN (Deep Interest Evolution Network, 2019)
  - 在 DIN 基础上加入 GRU 建模兴趣演化
  - Auxiliary Loss 监督兴趣抽取
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class DiceActivation(nn.Module):
    """
    Dice 激活函数 (DIN 提出)
    - 自适应的 PReLU: 根据数据分布动态调整激活点
    - 比 ReLU/PReLU 更适合稀疏 CTR 数据
    """

    def __init__(self, emb_size):
        super().__init__()
        self.bn = nn.BatchNorm1d(emb_size, affine=False)
        self.alpha = nn.Parameter(torch.zeros(emb_size))

    def forward(self, x):
        # x: [B, emb_size]
        x_normed = self.bn(x)
        p = torch.sigmoid(x_normed)
        return p * x + (1 - p) * self.alpha * x


class AttentionUnit(nn.Module):
    """
    DIN Attention Unit
    - 计算候选 item 与历史行为中每个 item 的注意力权重
    - 特征: [query, key, query-key, query*key] → MLP → attention score
    """

    def __init__(self, emb_dim, hidden_units=(64, 32)):
        super().__init__()
        input_dim = emb_dim * 4  # [q, k, q-k, q*k]
        layers = []
        for hidden in hidden_units:
            layers.extend([
                nn.Linear(input_dim, hidden),
                DiceActivation(hidden),
            ])
            input_dim = hidden
        layers.append(nn.Linear(input_dim, 1))
        self.mlp = nn.Sequential(*layers)

    def forward(self, query, keys, keys_mask=None):
        """
        Args:
            query: [B, D] 候选 item embedding
            keys: [B, T, D] 历史行为序列 embedding
            keys_mask: [B, T] 1=valid, 0=padding
        Returns:
            output: [B, D] 加权后的用户兴趣表示
        """
        B, T, D = keys.size()
        query_expanded = query.unsqueeze(1).expand(-1, T, -1)  # [B, T, D]

        # 构造交互特征
        att_input = torch.cat([
            query_expanded,
            keys,
            query_expanded - keys,
            query_expanded * keys,
        ], dim=-1)  # [B, T, 4D]

        att_score = self.mlp(att_input).squeeze(-1)  # [B, T]

        # Mask padding positions
        if keys_mask is not None:
            att_score = att_score.masked_fill(keys_mask == 0, -1e9)

        att_weight = F.softmax(att_score, dim=-1)  # [B, T]

        # 加权求和
        output = torch.bmm(att_weight.unsqueeze(1), keys).squeeze(1)  # [B, D]
        return output


class DIN(nn.Module):
    """
    DIN 完整模型
    
    输入特征:
      - 用户侧: user_id, city, age, gender
      - 行为侧: 用户点击过的 item 序列
      - 候选侧: target item 的特征
      - 上下文: 时间, 设备, 位置
    
    输出: CTR 预估概率
    """

    def __init__(self, config):
        super().__init__()
        emb_dim = config.get('emb_dim', 32)

        # Embedding layers
        self.user_emb = nn.Embedding(config['num_users'], emb_dim)
        self.item_emb = nn.Embedding(config['num_items'], emb_dim)
        self.category_emb = nn.Embedding(config['num_categories'], emb_dim)
        self.city_emb = nn.Embedding(config['num_cities'], 8)

        # DIN Attention
        self.attention = AttentionUnit(emb_dim, hidden_units=(64, 32))

        # MLP: 精排打分
        mlp_input_dim = emb_dim * 3 + 8  # user + target_item + attention_out + city
        self.mlp = nn.Sequential(
            nn.Linear(mlp_input_dim, 256),
            DiceActivation(256),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            DiceActivation(128),
            nn.Dropout(0.1),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
        )

    def forward(self, user_id, target_item_id, behavior_item_ids, behavior_mask, city_id):
        """
        Args:
            user_id: [B]
            target_item_id: [B]
            behavior_item_ids: [B, T] 用户历史点击 item id 序列
            behavior_mask: [B, T] 1=valid
            city_id: [B]
        Returns:
            logit: [B, 1] CTR 预估 logit
        """
        # Embedding
        user_feat = self.user_emb(user_id)                    # [B, D]
        target_feat = self.item_emb(target_item_id)           # [B, D]
        behavior_feat = self.item_emb(behavior_item_ids)      # [B, T, D]
        city_feat = self.city_emb(city_id)                    # [B, 8]

        # DIN Attention: 用 target item 作为 query
        interest_feat = self.attention(target_feat, behavior_feat, behavior_mask)  # [B, D]

        # 拼接所有特征
        x = torch.cat([user_feat, target_feat, interest_feat, city_feat], dim=-1)

        # MLP 打分
        logit = self.mlp(x)
        return logit

    def predict(self, *args, **kwargs):
        """推理: 返回 CTR 概率"""
        logit = self.forward(*args, **kwargs)
        return torch.sigmoid(logit)


class DIEN(nn.Module):
    """
    DIEN (Deep Interest Evolution Network)
    在 DIN 基础上加入 GRU 建模兴趣演化过程
    
    创新点:
    1. Interest Extractor: GRU 抽取行为序列中的兴趣状态
    2. Interest Evolution: AUGRU 根据 target item 演化兴趣
    3. Auxiliary Loss: 用下一个点击监督每一步的兴趣状态
    """

    def __init__(self, config):
        super().__init__()
        emb_dim = config.get('emb_dim', 32)

        self.item_emb = nn.Embedding(config['num_items'], emb_dim)
        self.user_emb = nn.Embedding(config['num_users'], emb_dim)
        self.city_emb = nn.Embedding(config['num_cities'], 8)

        # Interest Extractor Layer (GRU)
        self.interest_gru = nn.GRU(emb_dim, emb_dim, batch_first=True)

        # Interest Evolution Layer (AUGRU - Attention-based GRU)
        self.evolution_gru = nn.GRUCell(emb_dim, emb_dim)
        self.attention = AttentionUnit(emb_dim, hidden_units=(64, 32))

        # Output MLP
        mlp_input_dim = emb_dim * 3 + 8
        self.mlp = nn.Sequential(
            nn.Linear(mlp_input_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 1),
        )

    def forward(self, user_id, target_item_id, behavior_item_ids, behavior_mask, city_id):
        user_feat = self.user_emb(user_id)
        target_feat = self.item_emb(target_item_id)
        behavior_feat = self.item_emb(behavior_item_ids)
        city_feat = self.city_emb(city_id)

        # Interest Extractor
        interest_states, _ = self.interest_gru(behavior_feat)  # [B, T, D]

        # Interest Evolution (simplified AUGRU)
        interest_evolved = self.attention(target_feat, interest_states, behavior_mask)

        x = torch.cat([user_feat, target_feat, interest_evolved, city_feat], dim=-1)
        return self.mlp(x)


# 默认配置
DIN_CONFIG = {
    'num_users': 10000,
    'num_items': 5000,
    'num_categories': 20,
    'num_cities': 10,
    'emb_dim': 32,
}
