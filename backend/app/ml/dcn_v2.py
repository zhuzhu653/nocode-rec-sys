"""
DCN-V2 (Deep & Cross Network V2)
- 用途: CTR 预估精排
- 原理: 显式建模有界次数的特征交叉, 替代手工特征工程
- 论文: DCN V2: Improved Deep & Cross Network (Google, WWW 2021)
- 工业应用: Google Ads, YouTube 推荐

核心思想:
  - Cross Network: x_{l+1} = x_0 ⊙ (W_l · x_l + b_l) + x_l
  - 每一层 Cross Layer 显式增加一阶交叉
  - L 层 Cross Network 建模最高 L+1 阶特征交叉
  
V2 改进:
  - 用矩阵 W 替代向量 w (V1), 表达能力更强
  - 支持 Mixture of Low-Rank Experts
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class CrossNetV2(nn.Module):
    """
    DCN-V2 Cross Network
    x_{l+1} = x_0 ⊙ (W_l · x_l + b_l) + x_l
    """

    def __init__(self, input_dim, num_layers=3):
        super().__init__()
        self.num_layers = num_layers
        self.W = nn.ParameterList([
            nn.Parameter(torch.randn(input_dim, input_dim) * 0.01)
            for _ in range(num_layers)
        ])
        self.b = nn.ParameterList([
            nn.Parameter(torch.zeros(input_dim))
            for _ in range(num_layers)
        ])

    def forward(self, x0):
        """
        Args:
            x0: [B, D] 原始输入
        Returns:
            xl: [B, D] L 层交叉后的输出
        """
        xl = x0
        for i in range(self.num_layers):
            # x_{l+1} = x_0 * (W_l @ x_l + b_l) + x_l
            cross = x0 * (torch.matmul(xl, self.W[i]) + self.b[i])
            xl = cross + xl
        return xl


class CrossNetMix(nn.Module):
    """
    DCN-V2 with Mixture of Low-Rank Experts
    - 用多个低秩专家替代单一全秩矩阵, 提高效率
    - W = sum_k(g_k * U_k @ V_k^T), g = softmax(gate(x))
    """

    def __init__(self, input_dim, num_layers=3, num_experts=4, low_rank=32):
        super().__init__()
        self.num_layers = num_layers
        self.num_experts = num_experts

        self.U = nn.ParameterList([
            nn.Parameter(torch.randn(num_experts, input_dim, low_rank) * 0.01)
            for _ in range(num_layers)
        ])
        self.V = nn.ParameterList([
            nn.Parameter(torch.randn(num_experts, low_rank, input_dim) * 0.01)
            for _ in range(num_layers)
        ])
        self.gates = nn.ModuleList([
            nn.Linear(input_dim, num_experts)
            for _ in range(num_layers)
        ])
        self.b = nn.ParameterList([
            nn.Parameter(torch.zeros(input_dim))
            for _ in range(num_layers)
        ])

    def forward(self, x0):
        xl = x0
        for i in range(self.num_layers):
            # Gate
            gate_score = F.softmax(self.gates[i](xl), dim=-1)  # [B, E]

            # Expert outputs: sum_k g_k * (U_k @ V_k^T @ x_l)
            expert_out = torch.zeros_like(xl)
            for k in range(self.num_experts):
                # [B, D] @ [D, R] @ [R, D] = [B, D]
                tmp = torch.matmul(xl, self.U[i][k])       # [B, R]
                tmp = torch.matmul(tmp, self.V[i][k])      # [B, D]
                expert_out += gate_score[:, k:k+1] * tmp

            xl = x0 * (expert_out + self.b[i]) + xl
        return xl


class DCNV2(nn.Module):
    """
    DCN-V2 完整模型 (Stacked 结构)
    
    架构: Input → Cross Network → Deep Network → Output
    (也可用 Parallel 结构: Cross 和 Deep 并行再 concat)
    """

    def __init__(self, config):
        super().__init__()
        # Embedding
        self.item_emb = nn.Embedding(config['num_items'], config['emb_dim'])
        self.user_emb = nn.Embedding(config['num_users'], config['emb_dim'])
        self.category_emb = nn.Embedding(config['num_categories'], 8)
        self.city_emb = nn.Embedding(config['num_cities'], 8)

        # 数值特征
        self.dense_proj = nn.Linear(config.get('num_dense_feats', 5), 16)

        input_dim = config['emb_dim'] * 2 + 8 + 8 + 16  # user + item + cat + city + dense

        # Cross Network (V2 with Mix-of-Experts)
        self.cross_net = CrossNetMix(
            input_dim,
            num_layers=config.get('cross_layers', 3),
            num_experts=config.get('num_experts', 4),
            low_rank=config.get('low_rank', 32),
        )

        # Deep Network
        self.deep_net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Dropout(0.1),
            nn.Linear(128, 64),
            nn.ReLU(),
        )

        # Output (Stacked: cross output → deep → prediction)
        self.output_layer = nn.Linear(input_dim + 64, 1)

    def forward(self, user_id, item_id, category_id, city_id, dense_feats):
        """
        Args:
            user_id: [B]
            item_id: [B]
            category_id: [B]
            city_id: [B]
            dense_feats: [B, num_dense] 数值特征 (价格/评分/距离等)
        """
        user_feat = self.user_emb(user_id)
        item_feat = self.item_emb(item_id)
        cat_feat = self.category_emb(category_id)
        city_feat = self.city_emb(city_id)
        dense_feat = self.dense_proj(dense_feats)

        # 拼接所有特征
        x0 = torch.cat([user_feat, item_feat, cat_feat, city_feat, dense_feat], dim=-1)

        # Cross Network
        cross_out = self.cross_net(x0)  # [B, D]

        # Deep Network
        deep_out = self.deep_net(x0)  # [B, 64]

        # Stacked output
        combined = torch.cat([cross_out, deep_out], dim=-1)
        logit = self.output_layer(combined)
        return logit

    def predict(self, *args, **kwargs):
        return torch.sigmoid(self.forward(*args, **kwargs))


DCN_CONFIG = {
    'num_users': 10000,
    'num_items': 5000,
    'num_categories': 20,
    'num_cities': 10,
    'emb_dim': 32,
    'num_dense_feats': 5,
    'cross_layers': 3,
    'num_experts': 4,
    'low_rank': 32,
}
