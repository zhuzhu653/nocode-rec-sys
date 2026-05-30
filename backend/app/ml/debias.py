"""
Debias 模块: 消除推荐系统中的各种偏差

实现:
  1. IPW (Inverse Propensity Weighting) — 曝光偏差矫正
  2. PAL (Position-Aware Learning) — 位置偏差建模
  3. Duration Deconfounding — 时长偏差因果去混淆
  4. Popularity Debias — 热度偏差矫正 (因果干预)

参考论文:
  - [Huawei 2019] PAL: Position-bias aware learning framework for CTR prediction
  - [Recommendations as Treatments] IPS for unbiased learning
  - [DICE 2021] Disentangling Interest and Conformity with Causal Embedding
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class InversePropensityWeighting(nn.Module):
    """
    IPW (逆倾向加权) — 曝光偏差矫正

    原理:
      观测数据中, 用户只能对被曝光的 item 产生行为
      → 未曝光 ≠ 不感兴趣, 观测到的负样本有偏
      → 用倾向性得分 P(O=1|x) 加权, 矫正选择偏差

    loss_IPW = Σ (1/P(O=1|x_i)) * L(y_i, ŷ_i)
    """

    def __init__(self, n_positions=20, n_items=100, clip_range=(0.1, 10.0)):
        super().__init__()
        # 位置倾向性 (可学习)
        self.position_propensity = nn.Embedding(n_positions, 1)
        # Item 热度倾向性
        self.item_propensity = nn.Embedding(n_items + 1, 1)
        self.clip_min, self.clip_max = clip_range

        # 初始化: 位置越靠前, 倾向性越高
        with torch.no_grad():
            for i in range(n_positions):
                self.position_propensity.weight[i] = 1.0 / (1 + 0.1 * i)

    def estimate_propensity(self, positions, item_ids):
        """估计曝光倾向性 P(O=1 | position, item)"""
        pos_prop = torch.sigmoid(self.position_propensity(positions)).squeeze(-1)
        item_prop = torch.sigmoid(self.item_propensity(item_ids)).squeeze(-1)
        propensity = pos_prop * item_prop
        return propensity.clamp(self.clip_min, self.clip_max)

    def compute_weighted_loss(self, predictions, labels, positions, item_ids, base_loss_fn=None):
        """IPW 加权损失"""
        if base_loss_fn is None:
            base_loss_fn = F.binary_cross_entropy_with_logits

        propensity = self.estimate_propensity(positions, item_ids)
        weights = 1.0 / propensity  # 逆倾向权重
        weights = weights / weights.mean()  # 归一化 (SNIPS)

        # 逐样本加权
        per_sample_loss = F.binary_cross_entropy_with_logits(
            predictions, labels, reduction='none'
        )
        weighted_loss = (per_sample_loss * weights).mean()
        return weighted_loss


class PositionAwareLearning(nn.Module):
    """
    PAL — 位置偏差解耦模型

    原理:
      CTR = P(click | item, position)
           = P(examine | position) × P(click | examine, item)
      训练时联合建模, 推理时去掉 position 因子

    架构:
      - 主模型: f(user, item) → relevance score
      - 位置塔: g(position) → examine probability
      - 训练: σ(f(u,i) + g(pos)) → CTR
      - 推理: σ(f(u,i)) → unbiased CTR
    """

    def __init__(self, main_model_dim=64, n_positions=20):
        super().__init__()
        # 位置浅层塔 (推理时不使用)
        self.position_tower = nn.Sequential(
            nn.Embedding(n_positions, 16),
        )
        self.position_fc = nn.Linear(16, 1)
        self.n_positions = n_positions

    def forward(self, main_logit, position=None, training=True):
        """
        Args:
            main_logit: 主模型输出的 relevance logit [B]
            position: 位置编码 [B] (训练时必须提供)
            training: 是否训练模式
        Returns:
            CTR logit
        """
        if training and position is not None:
            pos_emb = self.position_tower[0](position)  # [B, 16]
            pos_bias = self.position_fc(pos_emb).squeeze(-1)  # [B]
            # 乘法解耦: log P(click) = log P(rel) + log P(examine)
            return main_logit + pos_bias
        else:
            # 推理: 去掉位置偏差
            return main_logit


class PopularityDebias(nn.Module):
    """
    热度偏差因果去混淆 (DICE 思路)

    原理:
      用户点击 = 兴趣驱动 + 从众效应(conformity)
      需要解耦 interest embedding 和 conformity embedding

    实现:
      - Interest: 建模真实兴趣
      - Conformity: 建模随大流行为 (popularity-driven)
      - 因果干预: do(popularity=uniform) 去除混淆
    """

    def __init__(self, n_items, embed_dim=64):
        super().__init__()
        self.interest_embedding = nn.Embedding(n_items + 1, embed_dim)
        self.conformity_embedding = nn.Embedding(n_items + 1, embed_dim)
        self.popularity_score = nn.Parameter(torch.zeros(n_items + 1))

    def forward(self, item_ids, mode='train'):
        """
        Args:
            item_ids: [B]
            mode: 'train' (联合), 'infer' (去混淆)
        """
        interest = self.interest_embedding(item_ids)
        conformity = self.conformity_embedding(item_ids)

        if mode == 'train':
            # 训练: 联合建模
            return interest + conformity
        else:
            # 推理: 因果干预, 去掉 conformity 分量
            return interest

    def discrepancy_loss(self, item_ids):
        """
        正则化: interest 和 conformity embedding 应正交
        鼓励解耦
        """
        interest = self.interest_embedding(item_ids)
        conformity = self.conformity_embedding(item_ids)
        # 余弦相似度最小化
        cos_sim = F.cosine_similarity(interest, conformity, dim=-1)
        return cos_sim.abs().mean()


class DurationDeconfounding(nn.Module):
    """
    时长偏差去混淆 (用于短视频/内容推荐)

    原理:
      视频时长是混淆变量:
        长视频 → 观看时长自然长 (非因果)
        推荐系统不应偏好推荐长视频
      方法: Watch Time Gain = 实际观看 - 期望观看(给定时长)

    实现:
      duration_model: 预测 E[watch_time | duration]
      final_score = actual_watch_time - predicted_baseline
    """

    def __init__(self, duration_bins=20):
        super().__init__()
        self.duration_bins = duration_bins
        # 分桶回归: 每个时长区间的平均观看时长
        self.baseline_predictor = nn.Sequential(
            nn.Linear(1, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def compute_wtg(self, watch_time, video_duration):
        """
        Watch Time Gain
        Args:
            watch_time: 实际观看时长 [B]
            video_duration: 视频总时长 [B]
        Returns:
            WTG score [B]
        """
        # 预测 baseline (期望观看时长)
        baseline = self.baseline_predictor(video_duration.unsqueeze(-1)).squeeze(-1)
        # WTG = 实际 - 基线
        wtg = watch_time - baseline
        return wtg

    def forward(self, watch_time, video_duration):
        return self.compute_wtg(watch_time, video_duration)


# =================== 综合 Debias 训练包装器 ===================

class DebiasedTrainer:
    """
    将多种 debias 策略组合到训练 loop 中

    使用示例:
        trainer = DebiasedTrainer(
            main_model=dcn_model,
            debias_strategies=['ipw', 'pal', 'popularity'],
            n_items=50, n_positions=20,
        )
        loss = trainer.compute_loss(batch)
    """

    def __init__(self, main_model, debias_strategies=None, n_items=50, n_positions=20):
        self.main_model = main_model
        self.strategies = debias_strategies or ['ipw']

        self.modules = {}
        if 'ipw' in self.strategies:
            self.modules['ipw'] = InversePropensityWeighting(n_positions, n_items)
        if 'pal' in self.strategies:
            self.modules['pal'] = PositionAwareLearning(n_positions=n_positions)
        if 'popularity' in self.strategies:
            self.modules['popularity'] = PopularityDebias(n_items)

    def compute_loss(self, logits, labels, positions=None, item_ids=None):
        """综合 debias 损失"""
        total_loss = 0.0

        if 'ipw' in self.modules and positions is not None:
            total_loss += self.modules['ipw'].compute_weighted_loss(
                logits, labels, positions, item_ids
            )
        else:
            total_loss += F.binary_cross_entropy_with_logits(logits, labels)

        if 'pal' in self.modules and positions is not None:
            logits = self.modules['pal'](logits, positions, training=True)

        if 'popularity' in self.modules and item_ids is not None:
            total_loss += 0.1 * self.modules['popularity'].discrepancy_loss(item_ids)

        return total_loss

    def get_all_parameters(self):
        """获取所有可训练参数"""
        params = list(self.main_model.parameters())
        for module in self.modules.values():
            params.extend(module.parameters())
        return params
