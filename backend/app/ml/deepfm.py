"""
DeepFM - 精排模型
- 用途: CTR 预估, 特征交互建模
- 原理: FM (二阶交叉) + DNN (高阶交叉) 并行, 共享 Embedding
- 论文: DeepFM: A Factorization-Machine based Neural Network (Huawei, IJCAI 2017)
- 工业应用: 华为应用商店推荐, 广告 CTR

架构:
  Sparse Features → Embedding Layer (共享)
                  ↙              ↘
          FM Component      Deep Component
          (二阶交叉)         (高阶非线性)
                  ↘              ↙
              Concat → Sigmoid → CTR

优势:
  - 不需要手工特征工程
  - FM 捕获低阶交互, DNN 捕获高阶交互
  - 共享 Embedding 避免参数冗余
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class FMLayer(nn.Module):
    """
    Factorization Machine 二阶交叉层
    FM(x) = 0.5 * sum[(sum_i v_i*x_i)^2 - sum_i (v_i*x_i)^2]
    复杂度 O(kn) 而非朴素的 O(kn^2)
    """

    def forward(self, embeddings):
        """
        Args:
            embeddings: [B, num_fields, emb_dim] 各字段的 embedding
        Returns:
            fm_out: [B, 1]
        """
        # sum of square: (sum v_i)^2
        sum_square = embeddings.sum(dim=1).pow(2).sum(dim=-1, keepdim=True)
        # square of sum: sum(v_i^2)
        square_sum = embeddings.pow(2).sum(dim=1).sum(dim=-1, keepdim=True)
        # FM 交叉项
        fm_out = 0.5 * (sum_square - square_sum)
        return fm_out


class DeepFM(nn.Module):
    """
    DeepFM 完整实现
    
    特征配置:
      - sparse_fields: [(field_name, vocab_size), ...]
      - dense_fields: [field_name, ...]
    """

    def __init__(self, config):
        super().__init__()
        emb_dim = config.get('emb_dim', 16)
        sparse_fields = config['sparse_fields']

        # 一阶特征 (线性部分)
        self.first_order_embeddings = nn.ModuleDict({
            name: nn.Embedding(vocab, 1)
            for name, vocab in sparse_fields
        })

        # 二阶特征 (FM 部分) - 共享 embedding
        self.second_order_embeddings = nn.ModuleDict({
            name: nn.Embedding(vocab, emb_dim)
            for name, vocab in sparse_fields
        })

        # Dense feature projection
        num_dense = config.get('num_dense_feats', 0)
        if num_dense > 0:
            self.dense_layer = nn.Linear(num_dense, emb_dim)
        else:
            self.dense_layer = None

        # FM Layer
        self.fm = FMLayer()

        # Deep Network
        num_fields = len(sparse_fields) + (1 if num_dense > 0 else 0)
        deep_input_dim = num_fields * emb_dim
        hidden_units = config.get('hidden_units', [256, 128, 64])

        layers = []
        input_dim = deep_input_dim
        for hidden in hidden_units:
            layers.extend([
                nn.Linear(input_dim, hidden),
                nn.BatchNorm1d(hidden),
                nn.ReLU(),
                nn.Dropout(config.get('dropout', 0.2)),
            ])
            input_dim = hidden
        self.deep_net = nn.Sequential(*layers)

        # Output
        # 一阶 (1) + FM (1) + Deep (last_hidden)
        self.output_layer = nn.Linear(1 + 1 + hidden_units[-1], 1)

    def forward(self, sparse_inputs, dense_inputs=None):
        """
        Args:
            sparse_inputs: dict {field_name: [B] tensor}
            dense_inputs: [B, num_dense] or None
        Returns:
            logit: [B, 1]
        """
        # === 一阶部分 ===
        first_order_out = sum(
            self.first_order_embeddings[name](sparse_inputs[name])
            for name in self.first_order_embeddings
        )  # [B, 1]

        # === 二阶 FM 部分 ===
        emb_list = [
            self.second_order_embeddings[name](sparse_inputs[name])
            for name in self.second_order_embeddings
        ]  # list of [B, D]

        if self.dense_layer is not None and dense_inputs is not None:
            dense_emb = self.dense_layer(dense_inputs)  # [B, D]
            emb_list.append(dense_emb)

        embeddings = torch.stack(emb_list, dim=1)  # [B, F, D]
        fm_out = self.fm(embeddings)  # [B, 1]

        # === Deep 部分 ===
        deep_input = embeddings.flatten(1)  # [B, F*D]
        deep_out = self.deep_net(deep_input)  # [B, last_hidden]

        # === 组合输出 ===
        combined = torch.cat([first_order_out, fm_out, deep_out], dim=-1)
        logit = self.output_layer(combined)
        return logit

    def predict(self, *args, **kwargs):
        return torch.sigmoid(self.forward(*args, **kwargs))


# 示例配置
DEEPFM_CONFIG = {
    'sparse_fields': [
        ('user_id', 10000),
        ('item_id', 5000),
        ('category', 20),
        ('city', 10),
        ('device', 5),
        ('hour', 24),
        ('weekday', 7),
    ],
    'num_dense_feats': 5,  # price, rating, distance, popularity, freshness
    'emb_dim': 16,
    'hidden_units': [256, 128, 64],
    'dropout': 0.2,
}
