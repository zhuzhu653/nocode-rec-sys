"""
因果推断与 Uplift Modeling 模块

实现:
  1. Uplift Model — 增量效应预估 (处理组 vs 对照组)
  2. IPW Estimator — 逆倾向加权因果效应估计
  3. Doubly Robust — 双重稳健估计器
  4. Counterfactual Reasoning — 反事实推理 (推荐去偏)

应用场景:
  - 优惠券发放: 该用户发券后增量转化有多大?
  - Push 通知: 发 push 是否真的提升活跃?
  - 策略评估: 新推荐策略的因果效果 (非关联效果)

参考论文:
  - [Kuaishou] Coarse-to-fine Dynamic Uplift Modeling
  - [Alibaba] Entire Space Counterfactual Multi-Task Model (ESCM2)
  - Doubly Robust Joint Learning for Recommendation (DR)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Optional, Tuple


class UpliftNet(nn.Module):
    """
    Uplift Model — 直接建模增量效应 τ(x)

    τ(x) = E[Y(1) - Y(0) | X=x]
         = 接受处理后的期望收益 - 不接受时的期望收益

    架构: Two-Model Approach (T-Learner)
      - Model_T: P(Y=1 | X, T=1)  处理组模型
      - Model_C: P(Y=1 | X, T=0)  对照组模型
      - Uplift = Model_T(x) - Model_C(x)

    也实现 S-Learner (单模型 + treatment 作为特征)
    """

    def __init__(self, input_dim=64, hidden_dim=128, approach='t_learner'):
        super().__init__()
        self.approach = approach

        if approach == 't_learner':
            # 处理组模型
            self.treatment_model = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(hidden_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 1),
            )
            # 对照组模型
            self.control_model = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(hidden_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 1),
            )
        else:
            # S-Learner: treatment 作为特征输入
            self.model = nn.Sequential(
                nn.Linear(input_dim + 1, hidden_dim),  # +1 for treatment indicator
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(hidden_dim, 64),
                nn.ReLU(),
                nn.Linear(64, 1),
            )

    def forward(self, features, treatment=None):
        """
        Args:
            features: [B, input_dim] 用户/上下文特征
            treatment: [B] 处理标识 (0/1), 训练时使用
        Returns:
            如果 training: (pred_outcome, uplift)
            如果 inference: uplift score
        """
        if self.approach == 't_learner':
            pred_t = torch.sigmoid(self.treatment_model(features)).squeeze(-1)
            pred_c = torch.sigmoid(self.control_model(features)).squeeze(-1)
            uplift = pred_t - pred_c

            if treatment is not None:
                # 训练: 只对对应组的模型计算 loss
                pred = treatment * pred_t + (1 - treatment) * pred_c
                return pred, uplift
            return uplift
        else:
            # S-Learner
            feat_t1 = torch.cat([features, torch.ones(features.size(0), 1, device=features.device)], dim=-1)
            feat_t0 = torch.cat([features, torch.zeros(features.size(0), 1, device=features.device)], dim=-1)
            pred_t1 = torch.sigmoid(self.model(feat_t1)).squeeze(-1)
            pred_t0 = torch.sigmoid(self.model(feat_t0)).squeeze(-1)
            uplift = pred_t1 - pred_t0

            if treatment is not None:
                feat = torch.cat([features, treatment.unsqueeze(-1)], dim=-1)
                pred = torch.sigmoid(self.model(feat)).squeeze(-1)
                return pred, uplift
            return uplift

    def compute_loss(self, features, treatment, outcome):
        """
        训练损失

        Args:
            features: [B, D]
            treatment: [B] 0/1
            outcome: [B] 真实结果 (是否转化)
        """
        pred, uplift = self.forward(features, treatment)
        # BCE loss
        loss = F.binary_cross_entropy(pred, outcome)
        return loss, uplift.detach()


class DoublyRobustEstimator:
    """
    双重稳健估计器 (DR) — 因果效应估计

    公式:
      τ_DR = E[ (T·Y)/(e(X)) - ((T-e(X))·μ₁(X))/(e(X))
                - ((1-T)·Y)/(1-e(X)) - ((T-e(X))·μ₀(X))/(1-e(X)) ]

    其中:
      - e(X) = P(T=1|X): 倾向性得分
      - μ₁(X) = E[Y|X, T=1]: 处理组结果模型
      - μ₀(X) = E[Y|X, T=0]: 对照组结果模型

    优势:
      - 只要 e(X) 或 μ(X) 之一正确, 估计就是一致的
      - 对模型误差更鲁棒
    """

    def __init__(self, clip_propensity=(0.05, 0.95)):
        self.clip_min, self.clip_max = clip_propensity

    def estimate_ate(self, outcomes, treatments, propensity_scores,
                     mu1_predictions, mu0_predictions):
        """
        估计 Average Treatment Effect (ATE)

        Args:
            outcomes: [N] 真实结果
            treatments: [N] 处理标识 (0/1)
            propensity_scores: [N] P(T=1|X)
            mu1_predictions: [N] E[Y|X, T=1] 预测
            mu0_predictions: [N] E[Y|X, T=0] 预测

        Returns:
            ATE estimate, standard error
        """
        outcomes = np.array(outcomes)
        treatments = np.array(treatments)
        ps = np.clip(np.array(propensity_scores), self.clip_min, self.clip_max)
        mu1 = np.array(mu1_predictions)
        mu0 = np.array(mu0_predictions)

        n = len(outcomes)

        # DR 估计
        dr_scores = (
            treatments * (outcomes - mu1) / ps + mu1
            - (1 - treatments) * (outcomes - mu0) / (1 - ps) - mu0
        )

        ate = np.mean(dr_scores)
        se = np.std(dr_scores) / np.sqrt(n)

        return {
            'ate': ate,
            'se': se,
            'ci_lower': ate - 1.96 * se,
            'ci_upper': ate + 1.96 * se,
            'significant': abs(ate) > 1.96 * se,
        }

    def estimate_cate(self, features, outcomes, treatments, propensity_scores,
                      mu1_predictions, mu0_predictions, n_groups=5):
        """
        估计 Conditional ATE (CATE) — 分组因果效应

        将用户按 uplift 预测值分组, 估计每组的真实因果效应
        → 验证 uplift model 的校准性
        """
        dr_scores = self._compute_dr_scores(
            outcomes, treatments, propensity_scores, mu1_predictions, mu0_predictions
        )

        # 按 uplift 预测分桶
        predicted_uplift = mu1_predictions - mu0_predictions
        bucket_indices = np.digitize(
            predicted_uplift,
            np.percentile(predicted_uplift, np.linspace(0, 100, n_groups + 1)[1:-1])
        )

        group_results = []
        for g in range(n_groups):
            mask = bucket_indices == g
            if mask.sum() > 0:
                group_results.append({
                    'group': g,
                    'n_samples': int(mask.sum()),
                    'predicted_uplift': float(predicted_uplift[mask].mean()),
                    'actual_uplift': float(dr_scores[mask].mean()),
                })

        return group_results

    def _compute_dr_scores(self, outcomes, treatments, ps, mu1, mu0):
        outcomes = np.array(outcomes)
        treatments = np.array(treatments)
        ps = np.clip(np.array(ps), self.clip_min, self.clip_max)
        mu1 = np.array(mu1)
        mu0 = np.array(mu0)

        return (
            treatments * (outcomes - mu1) / ps + mu1
            - (1 - treatments) * (outcomes - mu0) / (1 - ps) - mu0
        )


class CounterfactualRecommender(nn.Module):
    """
    反事实推荐 — 去除曝光/热度混淆

    问题:
      用户点击 item A, 是因为真的感兴趣, 还是因为:
        - A 被放在了显眼位置 (position bias)
        - A 本身很热门, 大家都点 (conformity)
        - A 是系统强推的 (selection bias)

    方法:
      反事实提问: "如果 A 没有被推荐, 用户还会点吗?"
      → 用因果推断剥离混淆因子

    架构:
      user_interest = f(user_features, item_features)  # 真实兴趣
      confounders = g(position, popularity, exposure)  # 混淆因子
      observed_click = interest + confounders           # 观测到的
      counterfactual = interest                         # 反事实 (去混淆)
    """

    def __init__(self, user_dim=64, item_dim=64, confounder_dim=32):
        super().__init__()
        # 兴趣建模 (因果部分)
        self.interest_net = nn.Sequential(
            nn.Linear(user_dim + item_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
        )
        # 混淆因子建模 (非因果部分)
        self.confounder_net = nn.Sequential(
            nn.Linear(confounder_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, user_features, item_features, confounder_features=None, mode='train'):
        """
        Args:
            user_features: [B, user_dim]
            item_features: [B, item_dim]
            confounder_features: [B, confounder_dim] (position, popularity, etc.)
            mode: 'train' | 'infer'
        """
        interest = self.interest_net(
            torch.cat([user_features, item_features], dim=-1)
        ).squeeze(-1)

        if mode == 'train' and confounder_features is not None:
            confound = self.confounder_net(confounder_features).squeeze(-1)
            return torch.sigmoid(interest + confound), torch.sigmoid(interest)
        else:
            # 推理: 只用因果部分 (去混淆)
            return torch.sigmoid(interest)

    def compute_loss(self, user_features, item_features, confounder_features, labels):
        """
        训练: 联合建模观测结果
        """
        pred_observed, pred_counterfactual = self.forward(
            user_features, item_features, confounder_features, mode='train'
        )
        # 观测 loss
        loss_obs = F.binary_cross_entropy(pred_observed, labels)
        # 正则: 混淆因子不应过大 (因果应占主导)
        loss_reg = F.mse_loss(pred_observed, pred_counterfactual) * 0.1
        return loss_obs + loss_reg


class CausalEvaluator:
    """
    因果推断评估工具

    评估指标:
      - AUUC (Area Under Uplift Curve): uplift 模型排序能力
      - Qini Coefficient: 类似 AUC, 但针对 uplift
      - Calibration: 预测增量 vs 实际增量的校准

    使用:
      evaluator = CausalEvaluator()
      metrics = evaluator.evaluate(predicted_uplift, treatments, outcomes)
    """

    def compute_auuc(self, predicted_uplift, treatments, outcomes):
        """
        AUUC: 按 uplift 预测值排序, 累计计算实际增量效果

        理想情况: 高 uplift 用户放前面, 曲线快速上升
        """
        n = len(predicted_uplift)
        sorted_idx = np.argsort(predicted_uplift)[::-1]

        treatments = np.array(treatments)[sorted_idx]
        outcomes = np.array(outcomes)[sorted_idx]

        # 累计 uplift curve
        cum_treat = np.cumsum(treatments)
        cum_control = np.arange(1, n+1) - cum_treat
        cum_treat_outcome = np.cumsum(treatments * outcomes)
        cum_control_outcome = np.cumsum((1-treatments) * outcomes)

        # 避免除零
        treat_rate = cum_treat_outcome / np.maximum(cum_treat, 1)
        control_rate = cum_control_outcome / np.maximum(cum_control, 1)
        uplift_curve = treat_rate - control_rate

        # AUUC (归一化面积)
        auuc = np.trapz(uplift_curve, dx=1.0/n)
        return {
            'auuc': auuc,
            'uplift_curve': uplift_curve.tolist(),
        }

    def compute_qini(self, predicted_uplift, treatments, outcomes):
        """Qini coefficient — uplift 版 AUC"""
        n = len(predicted_uplift)
        sorted_idx = np.argsort(predicted_uplift)[::-1]

        treatments = np.array(treatments)[sorted_idx]
        outcomes = np.array(outcomes)[sorted_idx]

        n_t = treatments.sum()
        n_c = n - n_t

        cum_t_outcomes = np.cumsum(treatments * outcomes)
        cum_c_outcomes = np.cumsum((1 - treatments) * outcomes)
        cum_t = np.cumsum(treatments)
        cum_c = np.arange(1, n+1) - cum_t

        # Qini curve
        qini = cum_t_outcomes - cum_c_outcomes * (cum_t / np.maximum(cum_c, 1))

        # 归一化
        qini_max = cum_t_outcomes[-1] - cum_c_outcomes[-1] * (n_t / max(n_c, 1))
        qini_coeff = np.trapz(qini, dx=1.0/n) / max(abs(qini_max), 1e-8)

        return {
            'qini_coefficient': qini_coeff,
            'qini_curve': qini.tolist(),
        }

    def evaluate(self, predicted_uplift, treatments, outcomes):
        """综合评估"""
        auuc = self.compute_auuc(predicted_uplift, treatments, outcomes)
        qini = self.compute_qini(predicted_uplift, treatments, outcomes)
        return {**auuc, **qini}
