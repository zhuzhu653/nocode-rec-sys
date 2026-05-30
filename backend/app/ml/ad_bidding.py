"""
广告竞价与 eCPM 优化模块

实现:
  1. eCPM 排序 — CTR × Bid × Quality Score
  2. GSP (Generalized Second Price) 竞价
  3. Deep Bidding — 深度出价策略 (ROI 约束)
  4. Budget Pacing — 预算平滑消耗
  5. Creative Selection — 最优创意选择

参考论文:
  - [Google 2022] On the Factory Floor: ML for Ads
  - [Alibaba] OCPC: Optimized Cost Per Click
  - [LinkedIn 2020] Ads Allocation in Feed via Constrained Optimization
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Optional


class eCPMRanker:
    """
    eCPM (effective Cost Per Mille) 广告排序

    核心公式:
      eCPM = pCTR × pCVR × Bid × QualityScore × 1000

    多目标:
      - 平台收入最大化: max Σ eCPM
      - 用户体验约束: min 广告打扰度
      - 广告主 ROI 约束: 实际 CPA ≤ 目标 CPA
    """

    def __init__(self, alpha=1.0, beta=0.5, quality_weight=0.3):
        self.alpha = alpha      # CTR 权重
        self.beta = beta        # CVR 权重
        self.quality_weight = quality_weight

    def compute_ecpm(self, ads: List[Dict]) -> List[Dict]:
        """
        计算广告 eCPM 并排序

        Args:
            ads: [{
                'ad_id': int,
                'bid': float,           # 广告主出价 (元/click 或 元/conversion)
                'pctr': float,          # 预估 CTR
                'pcvr': float,          # 预估 CVR
                'quality_score': float, # 质量分 (相关性 + 体验)
                'billing_type': 'cpc' | 'ocpc' | 'cpm',
            }]
        """
        for ad in ads:
            billing = ad.get('billing_type', 'cpc')

            if billing == 'cpc':
                # CPC: eCPM = pCTR × Bid × 1000
                ecpm = ad['pctr'] * ad['bid'] * 1000
            elif billing == 'ocpc':
                # OCPC: eCPM = pCTR × pCVR × Bid(per conversion) × 1000
                ecpm = ad['pctr'] * ad['pcvr'] * ad['bid'] * 1000
            elif billing == 'cpm':
                # CPM: eCPM = Bid (直接是千次展示价格)
                ecpm = ad['bid']
            else:
                ecpm = ad['pctr'] * ad['bid'] * 1000

            # 质量分调节 (防止低质广告靠高价排前面)
            quality = ad.get('quality_score', 0.5)
            ecpm *= (1 + self.quality_weight * (quality - 0.5))

            ad['ecpm'] = ecpm

        # 按 eCPM 降序排列
        ads.sort(key=lambda x: x['ecpm'], reverse=True)
        return ads

    def gsp_pricing(self, ranked_ads: List[Dict]) -> List[Dict]:
        """
        GSP (广义第二价格) 定价

        第 k 名广告主实际支付 = 第 k+1 名的 eCPM / 第 k 名的 pCTR
        → 鼓励真实出价, 防止虚高
        """
        for i, ad in enumerate(ranked_ads):
            if i < len(ranked_ads) - 1:
                next_ecpm = ranked_ads[i + 1]['ecpm']
                if ad['pctr'] > 0:
                    actual_cost = next_ecpm / (ad['pctr'] * 1000) + 0.01
                else:
                    actual_cost = 0.01
            else:
                actual_cost = 0.01  # 最后一名支付底价

            ad['actual_cpc'] = min(actual_cost, ad['bid'])  # 不超过出价

        return ranked_ads


class DeepBidding(nn.Module):
    """
    深度出价模型 — 自动调整出价以满足 ROI 约束

    问题:
      广告主设置目标 CPA, 系统需要自动调整每次竞价的出价
      约束优化: max conversions s.t. actual_CPA ≤ target_CPA

    方法:
      - 学习出价函数 bid(context, ad) = base_bid × multiplier(context)
      - Lagrangian 对偶方法处理 ROI 约束
      - PID 控制器实时调节
    """

    def __init__(self, context_dim=64, ad_dim=32):
        super().__init__()
        # 出价倍率网络
        self.bid_multiplier = nn.Sequential(
            nn.Linear(context_dim + ad_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Softplus(),  # 确保 > 0
        )
        # Lagrange 乘子 (可学习)
        self.lambda_param = nn.Parameter(torch.tensor(1.0))

    def forward(self, context_features, ad_features, base_bid):
        """
        Args:
            context_features: [B, context_dim] 上下文 (时段/用户/位置)
            ad_features: [B, ad_dim] 广告特征
            base_bid: [B] 基础出价
        Returns:
            adjusted_bid: [B] 调整后出价
        """
        x = torch.cat([context_features, ad_features], dim=-1)
        multiplier = self.bid_multiplier(x).squeeze(-1)  # [B]
        adjusted_bid = base_bid * multiplier
        return adjusted_bid

    def compute_loss(self, predicted_bid, pcvr, actual_cost, target_cpa):
        """
        Lagrangian 损失

        max: Σ pcvr_i * I(win_i)  (最大化转化)
        s.t.: Σ cost_i / Σ cvr_i ≤ target_cpa
        """
        # 期望转化
        conversion_value = pcvr.sum()
        # ROI 约束违反
        actual_cpa = actual_cost.sum() / (pcvr.sum() + 1e-8)
        constraint_violation = F.relu(actual_cpa - target_cpa)
        # Lagrangian
        loss = -conversion_value + self.lambda_param * constraint_violation
        return loss


class BudgetPacing:
    """
    预算平滑消耗 (Budget Pacing)

    问题:
      广告主日预算 1000 元, 如果不控制, 可能上午就花完
      需要平滑消耗, 全天均匀展示

    方法:
      - Throttling: 根据剩余预算/剩余时间调整参竞率
      - PID Controller: 实时调节出价倍率
    """

    def __init__(self, daily_budget: float, n_hours: int = 24):
        self.daily_budget = daily_budget
        self.n_hours = n_hours
        self.spent = 0.0
        self.hour_budget = daily_budget / n_hours

        # PID 控制器参数
        self.kp = 0.5   # 比例
        self.ki = 0.1   # 积分
        self.kd = 0.05  # 微分
        self.integral = 0.0
        self.prev_error = 0.0

    def get_pacing_multiplier(self, current_hour: int) -> float:
        """
        获取当前时段的出价倍率

        Returns:
            multiplier: 0~2 之间, <1 表示降价(省钱), >1 表示加价(花钱)
        """
        # 理想消耗
        ideal_spent = self.hour_budget * (current_hour + 1)
        # 误差: 花少了 → 加价, 花多了 → 降价
        error = (ideal_spent - self.spent) / max(self.daily_budget, 1)

        # PID
        self.integral += error
        derivative = error - self.prev_error
        self.prev_error = error

        multiplier = 1.0 + self.kp * error + self.ki * self.integral + self.kd * derivative
        return np.clip(multiplier, 0.1, 2.0)

    def record_cost(self, cost: float):
        self.spent += cost

    def should_participate(self, current_hour: int) -> bool:
        """是否参与竞价 (throttling)"""
        remaining_budget = self.daily_budget - self.spent
        remaining_hours = self.n_hours - current_hour
        if remaining_budget <= 0:
            return False
        # 如果花得太快, 随机跳过
        pace_ratio = self.spent / max(self.hour_budget * (current_hour + 1), 1)
        if pace_ratio > 1.2:
            return np.random.random() < 0.5
        return True


class CreativeSelector:
    """
    广告创意选择 — 同一广告多套素材, 选最优

    问题:
      一个广告可能有 N 套创意 (标题/图片/描述)
      需要选择对当前用户 CTR 最高的创意

    方法:
      - Multi-Armed Bandit (Thompson Sampling)
      - 考虑 user×creative 交互
    """

    def __init__(self):
        # 每个 creative 的 alpha/beta (Beta 分布参数)
        self.creative_stats = {}  # creative_id → {'alpha': int, 'beta': int}

    def select(self, creative_ids: List[int]) -> int:
        """Thompson Sampling 选择最优创意"""
        best_id = creative_ids[0]
        best_sample = -1

        for cid in creative_ids:
            stats = self.creative_stats.get(cid, {'alpha': 1, 'beta': 1})
            sample = np.random.beta(stats['alpha'], stats['beta'])
            if sample > best_sample:
                best_sample = sample
                best_id = cid

        return best_id

    def update(self, creative_id: int, clicked: bool):
        """更新统计"""
        if creative_id not in self.creative_stats:
            self.creative_stats[creative_id] = {'alpha': 1, 'beta': 1}
        if clicked:
            self.creative_stats[creative_id]['alpha'] += 1
        else:
            self.creative_stats[creative_id]['beta'] += 1


class AdSystem:
    """
    广告系统综合框架 — 完整 pipeline

    流程:
      1. 广告召回: 根据用户+场景, 从广告库召回候选
      2. CTR/CVR 预估: 精排模型打分
      3. eCPM 排序: CTR × Bid × Quality
      4. 预算平滑: 控制消耗速度
      5. GSP 定价: 确定实际扣费
      6. 创意选择: Thompson Sampling 选最优素材
      7. 广告混排: 与自然结果交叉排列

    与推荐的融合:
      - 自然推荐 feed 中穿插广告
      - 约束: 广告占比 ≤ 20%, 间隔 ≥ 3 个自然结果
    """

    def __init__(self, daily_budget_map: Dict[int, float] = None):
        self.ecpm_ranker = eCPMRanker()
        self.creative_selector = CreativeSelector()
        self.pacing = {}
        if daily_budget_map:
            for ad_id, budget in daily_budget_map.items():
                self.pacing[ad_id] = BudgetPacing(budget)

    def serve(self, user_features: Dict, candidates: List[Dict],
              n_slots: int = 2, current_hour: int = 12) -> List[Dict]:
        """
        广告 serving

        Args:
            user_features: 用户画像
            candidates: 广告候选 (已完成 CTR/CVR 预估)
            n_slots: 可用广告位数
            current_hour: 当前小时

        Returns:
            selected_ads: 胜出广告列表
        """
        # 1. 预算过滤
        eligible = []
        for ad in candidates:
            ad_id = ad['ad_id']
            if ad_id in self.pacing:
                if not self.pacing[ad_id].should_participate(current_hour):
                    continue
            eligible.append(ad)

        if not eligible:
            return []

        # 2. eCPM 排序
        ranked = self.ecpm_ranker.compute_ecpm(eligible)

        # 3. GSP 定价
        ranked = self.ecpm_ranker.gsp_pricing(ranked)

        # 4. 选择 top-N
        winners = ranked[:n_slots]

        # 5. 创意选择
        for ad in winners:
            if 'creative_ids' in ad:
                ad['selected_creative'] = self.creative_selector.select(ad['creative_ids'])

        # 6. 记录消耗
        for ad in winners:
            if ad['ad_id'] in self.pacing:
                self.pacing[ad['ad_id']].record_cost(ad.get('actual_cpc', 0))

        return winners

    def mix_with_organic(self, organic_results: List[Dict], ads: List[Dict],
                         max_ad_ratio: float = 0.2, min_interval: int = 3) -> List[Dict]:
        """
        广告与自然结果混排

        规则:
          - 广告占比不超过 max_ad_ratio
          - 两个广告之间至少间隔 min_interval 个自然结果
        """
        total = len(organic_results) + len(ads)
        max_ads = int(total * max_ad_ratio)
        ads_to_insert = ads[:max_ads]

        result = []
        ad_idx = 0
        since_last_ad = min_interval  # 允许第一个位置放广告

        for item in organic_results:
            result.append(item)
            since_last_ad += 1

            if ad_idx < len(ads_to_insert) and since_last_ad >= min_interval:
                ad = ads_to_insert[ad_idx]
                ad['is_ad'] = True
                result.append(ad)
                ad_idx += 1
                since_last_ad = 0

        return result
