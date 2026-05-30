"""
冷启动模块: 解决新用户/新物品的推荐问题

实现:
  1. DropoutNet — 内容特征补充 ID embedding (随机 dropout ID)
  2. MetaEmbedding — 基于 meta-learning 快速适应新 item
  3. POSO — 个性化冷启动模块 (快手)
  4. ContentWarm — 用内容特征热启动新 item embedding

参考论文:
  - [2017] DropoutNet: Addressing Cold Start in Recommender Systems
  - [2020] Learning Graph Meta Embeddings for Cold-Start Ads
  - [2021][Kuaishou] POSO: Personalized Cold Start Modules
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class DropoutNet(nn.Module):
    """
    DropoutNet — 训练时随机 dropout ID embedding, 迫使模型依赖内容特征

    原理:
      - 冷启动时 ID embedding 全零 (新物品无历史)
      - 训练时随机将部分样本的 ID embedding 置零
      - 模型学会用内容特征 (文本/图像/属性) 补偿
      - 推理时: 有 ID → 用 ID; 无 ID → 自然退化为内容特征

    架构:
      content_branch: 文本/类别/属性 → content embedding
      id_branch: item_id → id embedding (训练时随机 drop)
      fused = content_emb + dropout(id_emb)
    """

    def __init__(self, n_items, embed_dim=64, content_dim=32, n_categories=8, dropout_rate=0.5):
        super().__init__()
        self.dropout_rate = dropout_rate

        # ID 分支
        self.id_embedding = nn.Embedding(n_items + 1, embed_dim, padding_idx=0)

        # 内容分支 (类别 + 数值属性)
        self.category_embedding = nn.Embedding(n_categories + 1, 16)
        self.content_mlp = nn.Sequential(
            nn.Linear(16 + content_dim, embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, embed_dim),
        )

        # 融合层
        self.fusion = nn.Sequential(
            nn.Linear(embed_dim * 2, embed_dim),
            nn.ReLU(),
            nn.LayerNorm(embed_dim),
        )

    def forward(self, item_ids, category_ids, content_features, training=True):
        """
        Args:
            item_ids: [B] item ID
            category_ids: [B] 类别 ID
            content_features: [B, content_dim] 内容特征 (价格/评分等)
            training: 是否训练模式
        """
        # ID embedding
        id_emb = self.id_embedding(item_ids)  # [B, embed_dim]

        # 训练时随机 dropout ID embedding (模拟冷启动)
        if training:
            mask = torch.bernoulli(
                torch.full_like(id_emb[:, 0], 1 - self.dropout_rate)
            ).unsqueeze(-1)  # [B, 1]
            id_emb = id_emb * mask

        # 内容 embedding
        cat_emb = self.category_embedding(category_ids)  # [B, 16]
        content_input = torch.cat([cat_emb, content_features], dim=-1)
        content_emb = self.content_mlp(content_input)  # [B, embed_dim]

        # 融合
        fused = self.fusion(torch.cat([id_emb, content_emb], dim=-1))
        return fused

    def get_cold_start_embedding(self, category_ids, content_features):
        """冷启动: 纯内容特征 (无 ID)"""
        batch_size = category_ids.size(0)
        zero_id_emb = torch.zeros(batch_size, self.id_embedding.embedding_dim,
                                   device=category_ids.device)
        cat_emb = self.category_embedding(category_ids)
        content_input = torch.cat([cat_emb, content_features], dim=-1)
        content_emb = self.content_mlp(content_input)
        fused = self.fusion(torch.cat([zero_id_emb, content_emb], dim=-1))
        return fused


class MetaEmbedding(nn.Module):
    """
    Meta Embedding — 用 meta-learning 为新 item 快速生成 embedding

    原理:
      - 新 item 只有少量 (< 10) 交互数据
      - 利用 item 属性 (类别/价格/描述) 通过 meta-learner 生成初始 embedding
      - 随着交互增多, 逐渐过渡到学习到的 ID embedding

    类似 MAML 思路: learn-to-initialize
    """

    def __init__(self, n_items, embed_dim=64, n_categories=8, meta_dim=32):
        super().__init__()
        self.embed_dim = embed_dim

        # ID embedding (warm items)
        self.id_embedding = nn.Embedding(n_items + 1, embed_dim, padding_idx=0)

        # Meta generator: 属性 → 初始 embedding
        self.meta_generator = nn.Sequential(
            nn.Linear(n_categories + meta_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embed_dim),
            nn.Tanh(),  # 限制范围
        )

        # 置信度门控: 根据交互次数决定用 ID emb 还是 meta emb
        self.confidence_gate = nn.Sequential(
            nn.Linear(1, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, item_ids, item_features, interaction_counts):
        """
        Args:
            item_ids: [B]
            item_features: [B, n_categories + meta_dim] one-hot cat + numeric
            interaction_counts: [B] 每个 item 的历史交互次数
        """
        id_emb = self.id_embedding(item_ids)  # [B, embed_dim]
        meta_emb = self.meta_generator(item_features)  # [B, embed_dim]

        # 门控: 交互越多 → 越信任 ID embedding
        gate = self.confidence_gate(
            torch.log1p(interaction_counts.float()).unsqueeze(-1)
        )  # [B, 1]

        # 融合
        output = gate * id_emb + (1 - gate) * meta_emb
        return output


class POSO(nn.Module):
    """
    POSO (Personalized Cold Start) — 快手冷启动方案

    原理:
      不同用户对冷启动 item 的容忍度不同:
        - 探索型用户: 愿意点击新 item
        - 保守型用户: 只点击热门

      POSO 为每种用户类型学习不同的冷启动策略:
        - 用户画像 → soft routing → 多组冷启动参数

    架构:
      user_type_router: user_features → [K] 概率分布
      cold_experts: K 组不同的冷启动网络
      output = Σ router_k * expert_k(item_features)
    """

    def __init__(self, user_dim=64, item_feature_dim=32, embed_dim=64, n_experts=4):
        super().__init__()
        self.n_experts = n_experts

        # 用户类型路由
        self.router = nn.Sequential(
            nn.Linear(user_dim, 32),
            nn.ReLU(),
            nn.Linear(32, n_experts),
            nn.Softmax(dim=-1),
        )

        # 多组冷启动专家
        self.experts = nn.ModuleList([
            nn.Sequential(
                nn.Linear(item_feature_dim, embed_dim),
                nn.ReLU(),
                nn.Linear(embed_dim, embed_dim),
            ) for _ in range(n_experts)
        ])

    def forward(self, user_features, item_features):
        """
        Args:
            user_features: [B, user_dim]
            item_features: [B, item_feature_dim]
        Returns:
            cold_start_embedding: [B, embed_dim]
        """
        # 路由权重
        routing_weights = self.router(user_features)  # [B, K]

        # 各专家输出
        expert_outputs = torch.stack([
            expert(item_features) for expert in self.experts
        ], dim=1)  # [B, K, embed_dim]

        # 加权融合
        output = torch.einsum('bk,bke->be', routing_weights, expert_outputs)
        return output


class ColdStartManager:
    """
    冷启动管理器 — 统一入口

    策略选择:
      - 新 item (0 交互) → MetaEmbedding / DropoutNet
      - 少量交互 (1-10) → POSO + 探索加权
      - 充足交互 (>10) → 正常 ID embedding

    与 Explore/Exploit 配合:
      冷启动 item 额外获得探索奖励 (Thompson Sampling / ε-greedy)
    """

    def __init__(self, n_items, embed_dim=64, warmup_threshold=10):
        self.warmup_threshold = warmup_threshold
        self.dropout_net = DropoutNet(n_items, embed_dim)
        self.meta_emb = MetaEmbedding(n_items, embed_dim)

        # 跟踪每个 item 的交互次数
        self.interaction_counts = np.zeros(n_items + 1, dtype=np.int32)

    def record_interaction(self, item_id):
        """记录交互, 更新 item 状态"""
        if item_id < len(self.interaction_counts):
            self.interaction_counts[item_id] += 1

    def is_cold(self, item_id):
        """判断是否冷启动"""
        return self.interaction_counts[item_id] < self.warmup_threshold

    def get_exploration_bonus(self, item_id, strategy='thompson'):
        """
        冷启动 item 的探索奖励

        Thompson Sampling: 交互越少 → 不确定性越大 → 更高概率被探索
        """
        count = self.interaction_counts[item_id]
        if strategy == 'thompson':
            # Beta(α, β) 其中 α=成功+1, β=失败+1
            alpha = max(count * 0.3, 1)  # 假设 30% 点击率
            beta_param = max(count * 0.7, 1)
            bonus = np.random.beta(alpha, beta_param)
            # 交互越少, 方差越大 → 探索更多
            return bonus
        elif strategy == 'ucb':
            # UCB1: 置信上界
            total = max(self.interaction_counts.sum(), 1)
            return np.sqrt(2 * np.log(total) / max(count, 1))
        else:
            return 0.0
