"""
重排模型 (Re-Ranking)
包含: MMR, DPP, Position Bias Calibration

- 用途: 在精排打分之后, 对最终展示列表进行重新排序
- 目标: 平衡 相关性/多样性/新鲜度/探索/商业目标

工业应用:
  - MMR: 搜索引擎去重
  - DPP: 美团/阿里 feed 多样性
  - Calibration: YouTube 观看时长预估校准
"""
import torch
import torch.nn as nn
import numpy as np
from typing import List, Tuple


class MMR:
    """
    Maximal Marginal Relevance (最大边际相关性)
    - 原理: 贪心选择, 每步选择与已选集合最不相似且与 query 最相关的 item
    - 公式: MMR = argmax[λ * sim(d, q) - (1-λ) * max_{d'∈S} sim(d, d')]
    
    参数:
      - lambda_param: 相关性 vs 多样性的权衡 (0~1)
        - λ=1: 纯相关性排序
        - λ=0: 纯多样性
        - 推荐值: 0.5~0.7
    """

    def __init__(self, lambda_param: float = 0.6):
        self.lambda_param = lambda_param

    def rerank(
        self,
        relevance_scores: np.ndarray,
        item_embeddings: np.ndarray,
        top_k: int = 10,
    ) -> List[int]:
        """
        MMR 重排
        Args:
            relevance_scores: [N] 精排分数
            item_embeddings: [N, D] item 向量
            top_k: 最终输出数量
        Returns:
            selected_indices: 重排后的 item 索引
        """
        n = len(relevance_scores)
        if n <= top_k:
            return list(range(n))

        # 归一化 embedding
        norms = np.linalg.norm(item_embeddings, axis=1, keepdims=True) + 1e-8
        item_embeddings = item_embeddings / norms

        # 预计算相似度矩阵
        sim_matrix = item_embeddings @ item_embeddings.T  # [N, N]

        selected = []
        candidates = list(range(n))

        for _ in range(top_k):
            if not candidates:
                break

            best_idx = -1
            best_score = -float('inf')

            for idx in candidates:
                relevance = relevance_scores[idx]

                # 与已选集合的最大相似度
                if selected:
                    max_sim = max(sim_matrix[idx][s] for s in selected)
                else:
                    max_sim = 0.0

                # MMR score
                mmr_score = (
                    self.lambda_param * relevance -
                    (1 - self.lambda_param) * max_sim
                )

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            selected.append(best_idx)
            candidates.remove(best_idx)

        return selected


class DPP:
    """
    确定性点过程 (Deterministic Point Process)
    - 原理: 通过行列式衡量子集的多样性, 选择行列式最大的子集
    - 核矩阵: L_{ij} = q_i * q_j * S_{ij}
      - q_i: item i 的质量分数 (精排分)
      - S_{ij}: item i 和 j 的相似度
    - det(L_S) ∝ Π(quality) * Volume(diversity)
    
    贪心近似 (精确 DPP 是 NP-hard):
      每步选择使行列式增量最大的 item
    """

    def __init__(self, alpha: float = 0.5):
        """
        Args:
            alpha: 质量 vs 多样性的平衡参数
                   质量分 = score^alpha, 多样性核 = sim^(1-alpha)
        """
        self.alpha = alpha

    def rerank(
        self,
        quality_scores: np.ndarray,
        item_embeddings: np.ndarray,
        top_k: int = 10,
    ) -> List[int]:
        """
        DPP 贪心重排
        Args:
            quality_scores: [N] 质量分 (精排分数, 归一化到 0~1)
            item_embeddings: [N, D] item 向量
            top_k: 输出数量
        Returns:
            selected: 重排后的索引列表
        """
        n = len(quality_scores)
        if n <= top_k:
            return list(range(n))

        # 归一化
        norms = np.linalg.norm(item_embeddings, axis=1, keepdims=True) + 1e-8
        item_embeddings = item_embeddings / norms

        # 构造 DPP 核矩阵 L
        # L_ij = q_i * q_j * sim_ij
        q = np.power(quality_scores + 1e-8, self.alpha)
        S = item_embeddings @ item_embeddings.T  # 相似度矩阵
        L = np.outer(q, q) * S

        # 贪心选择 (基于条件增益)
        selected = []
        remaining = list(range(n))

        # Cholesky-based greedy (高效实现)
        cis = np.zeros((top_k, n))  # 增量 Cholesky 因子
        di2s = np.copy(np.diag(L))  # 对角线: 单 item 的"质量"

        for k in range(top_k):
            if not remaining:
                break

            # 选择增益最大的
            best_idx = remaining[np.argmax(di2s[remaining])]
            selected.append(best_idx)
            remaining.remove(best_idx)

            if k == top_k - 1:
                break

            # 更新 Cholesky 因子
            ci = L[best_idx, :] - (cis[:k, best_idx:best_idx+1].T @ cis[:k, :]).flatten()
            di = np.sqrt(max(di2s[best_idx], 1e-10))
            cis[k, :] = ci / di

            # 更新对角增益
            di2s -= (ci / di) ** 2
            di2s = np.maximum(di2s, 0)

        return selected


class PositionBiasCalibration:
    """
    位置偏差校准
    - 问题: 排在前面的 item 天然获得更多点击, 导致 CTR 模型有位置偏差
    - 解决: Inverse Propensity Weighting (IPW) / Position-Aware Learning (PAL)
    
    方法:
    1. 估计位置偏差: P(click|pos) / P(click|pos=1) 
    2. 训练时: 加权样本 weight = 1 / propensity(position)
    3. 推理时: 不使用位置特征, 得到无偏分数
    """

    def __init__(self, max_position: int = 20):
        self.max_position = max_position
        # 经验性位置偏差 (通常通过 randomization 实验估计)
        self.position_bias = self._default_position_bias()

    def _default_position_bias(self) -> np.ndarray:
        """默认位置偏差: 指数衰减"""
        positions = np.arange(1, self.max_position + 1)
        # P(examine|pos) ≈ 1/pos^0.5 (cascade model)
        bias = 1.0 / np.power(positions, 0.5)
        return bias / bias[0]  # 归一化, pos=1 bias=1

    def get_ipw_weights(self, positions: np.ndarray) -> np.ndarray:
        """
        获取 IPW 权重用于训练
        Args:
            positions: [N] 样本的展示位置 (1-indexed)
        Returns:
            weights: [N] IPW 权重
        """
        positions = np.clip(positions, 1, self.max_position)
        propensity = self.position_bias[positions - 1]
        return 1.0 / (propensity + 1e-8)

    def debias_scores(self, scores: np.ndarray, positions: np.ndarray) -> np.ndarray:
        """
        对已有分数去偏
        Args:
            scores: [N] 带位置偏差的预估分
            positions: [N] 展示位置
        Returns:
            debiased: [N] 去偏后的分数
        """
        positions = np.clip(positions, 1, self.max_position)
        propensity = self.position_bias[positions - 1]
        return scores / (propensity + 1e-8)


class ExplorationStrategy:
    """
    探索与利用策略
    - 解决冷启动和信息茧房问题
    - 方法: ε-Greedy, Thompson Sampling, UCB
    """

    def __init__(self, strategy: str = 'thompson', epsilon: float = 0.1):
        self.strategy = strategy
        self.epsilon = epsilon
        # item 点击统计 (Thompson Sampling 用)
        self.alpha = {}  # 成功次数 (点击)
        self.beta = {}   # 失败次数 (曝光未点击)

    def should_explore(self) -> bool:
        """ε-Greedy: 是否探索"""
        return np.random.random() < self.epsilon

    def thompson_sample(self, item_ids: List[int]) -> np.ndarray:
        """
        Thompson Sampling: 从 Beta 分布采样
        Args:
            item_ids: 候选 item 列表
        Returns:
            sampled_scores: 采样分数
        """
        scores = []
        for item_id in item_ids:
            a = self.alpha.get(item_id, 1)  # prior: Beta(1, 1) = Uniform
            b = self.beta.get(item_id, 1)
            score = np.random.beta(a, b)
            scores.append(score)
        return np.array(scores)

    def update(self, item_id: int, clicked: bool):
        """更新统计"""
        if item_id not in self.alpha:
            self.alpha[item_id] = 1
            self.beta[item_id] = 1

        if clicked:
            self.alpha[item_id] += 1
        else:
            self.beta[item_id] += 1

    def blend_scores(
        self,
        item_ids: List[int],
        model_scores: np.ndarray,
        explore_ratio: float = 0.1,
    ) -> np.ndarray:
        """
        混合模型分数和探索分数
        Args:
            item_ids: 候选 item 列表
            model_scores: 模型预测分
            explore_ratio: 探索分数的混合比例
        Returns:
            blended: 混合后分数
        """
        if self.strategy == 'epsilon_greedy':
            if self.should_explore():
                # 探索: 随机打分
                return np.random.random(len(item_ids))
            return model_scores

        elif self.strategy == 'thompson':
            thompson_scores = self.thompson_sample(item_ids)
            return (1 - explore_ratio) * model_scores + explore_ratio * thompson_scores

        elif self.strategy == 'ucb':
            # Upper Confidence Bound
            ucb_bonus = []
            total = sum(self.alpha.get(i, 1) + self.beta.get(i, 1) for i in item_ids)
            for item_id in item_ids:
                n_i = self.alpha.get(item_id, 1) + self.beta.get(item_id, 1)
                bonus = np.sqrt(2 * np.log(total + 1) / (n_i + 1))
                ucb_bonus.append(bonus)
            return model_scores + explore_ratio * np.array(ucb_bonus)

        return model_scores
