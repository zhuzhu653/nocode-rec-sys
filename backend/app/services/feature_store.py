"""
Feature Store - 特征服务
- 用途: 实时/离线特征的统一管理与组装
- 职责: 
  1. 用户特征: 基础画像 + 实时行为序列 + 统计特征
  2. 物品特征: 静态属性 + 实时统计 (CTR/热度)
  3. 交叉特征: user-item 交互特征
  4. 上下文特征: 时间/位置/设备

工业实践:
  - 离线特征: 每日更新 (用户画像, 物品统计)
  - 近线特征: 分钟级更新 (近 1 小时行为)
  - 实时特征: 请求时计算 (当前上下文)
"""
import time
from collections import defaultdict
from typing import Dict, List, Optional
import numpy as np


class FeatureStore:
    """
    特征服务 (简化内存版, 生产环境用 Redis/Flink)
    """

    def __init__(self):
        # 用户特征缓存
        self.user_profiles = {}       # user_id → {age, gender, city, ...}
        self.user_behaviors = defaultdict(list)  # user_id → [(item_id, action, ts), ...]
        self.user_stats = {}          # user_id → {click_count, like_count, ...}

        # 物品特征缓存
        self.item_features = {}       # item_id → {category, city, price, ...}
        self.item_stats = {}          # item_id → {ctr, view_count, like_count, ...}
        self.item_embeddings = {}     # item_id → np.array (预计算向量)

        # 实时统计
        self.realtime_counters = defaultdict(lambda: defaultdict(int))

    # ====== 用户特征 ======

    def get_user_features(self, user_id: str) -> Dict:
        """获取用户完整特征"""
        profile = self.user_profiles.get(user_id, {})
        stats = self.user_stats.get(user_id, {})
        behavior_seq = self.get_user_behavior_sequence(user_id, max_len=50)

        return {
            'profile': profile,
            'stats': stats,
            'behavior_sequence': behavior_seq,
            'realtime': self._get_realtime_user_features(user_id),
        }

    def get_user_behavior_sequence(self, user_id: str, max_len: int = 50) -> List[str]:
        """获取用户最近行为序列 (item_id 列表)"""
        behaviors = self.user_behaviors.get(user_id, [])
        # 按时间排序, 取最近 max_len 个
        recent = sorted(behaviors, key=lambda x: x[2], reverse=True)[:max_len]
        return [b[0] for b in recent]  # 返回 item_id 列表

    def _get_realtime_user_features(self, user_id: str) -> Dict:
        """实时用户特征"""
        counters = self.realtime_counters.get(user_id, {})
        return {
            'session_clicks': counters.get('click', 0),
            'session_views': counters.get('view', 0),
            'last_active_gap': time.time() - counters.get('last_ts', time.time()),
        }

    # ====== 物品特征 ======

    def get_item_features(self, item_id: str) -> Dict:
        """获取物品完整特征"""
        static = self.item_features.get(item_id, {})
        stats = self.item_stats.get(item_id, {})
        embedding = self.item_embeddings.get(item_id)

        return {
            'static': static,
            'stats': stats,
            'embedding': embedding,
            'realtime': self._get_realtime_item_features(item_id),
        }

    def _get_realtime_item_features(self, item_id: str) -> Dict:
        """实时物品特征"""
        counters = self.realtime_counters.get(f'item:{item_id}', {})
        return {
            'recent_clicks': counters.get('click', 0),
            'recent_views': counters.get('view', 0),
        }

    # ====== 上下文特征 ======

    def get_context_features(self, request_context: Dict) -> Dict:
        """组装上下文特征"""
        now = time.localtime()
        return {
            'hour': now.tm_hour,
            'weekday': now.tm_wday,
            'is_weekend': now.tm_wday >= 5,
            'city_id': request_context.get('city_id'),
            'device': request_context.get('device', 'mobile'),
            'os': request_context.get('os', 'unknown'),
        }

    # ====== 特征组装 ======

    def assemble_ranking_features(
        self,
        user_id: str,
        item_ids: List[str],
        context: Dict,
    ) -> Dict:
        """
        为精排模型组装完整特征
        Args:
            user_id: 用户 ID
            item_ids: 候选 item 列表
            context: 请求上下文
        Returns:
            features: 组装好的特征字典
        """
        user_feat = self.get_user_features(user_id)
        context_feat = self.get_context_features(context)

        item_features_list = []
        for item_id in item_ids:
            item_feat = self.get_item_features(item_id)
            # 交叉特征
            cross_feat = self._compute_cross_features(user_feat, item_feat)
            item_features_list.append({
                'item': item_feat,
                'cross': cross_feat,
            })

        return {
            'user': user_feat,
            'items': item_features_list,
            'context': context_feat,
        }

    def _compute_cross_features(self, user_feat: Dict, item_feat: Dict) -> Dict:
        """计算 user-item 交叉特征"""
        return {
            'same_city': (
                user_feat.get('profile', {}).get('city') ==
                item_feat.get('static', {}).get('city')
            ),
            'category_preference': 0.0,  # 用户对该品类的偏好分
            'historical_interaction': False,  # 是否历史交互过
        }

    # ====== 行为上报 ======

    def record_behavior(self, user_id: str, item_id: str, action: str):
        """记录用户行为"""
        ts = time.time()
        self.user_behaviors[user_id].append((item_id, action, ts))

        # 更新实时计数
        self.realtime_counters[user_id][action] = (
            self.realtime_counters[user_id].get(action, 0) + 1
        )
        self.realtime_counters[user_id]['last_ts'] = ts
        self.realtime_counters[f'item:{item_id}'][action] = (
            self.realtime_counters[f'item:{item_id}'].get(action, 0) + 1
        )

    # ====== 初始化 ======

    def load_from_db(self, items_data: List[Dict], users_data: List[Dict] = None):
        """从数据库加载特征"""
        for item in items_data:
            item_id = str(item.get('id', ''))
            self.item_features[item_id] = {
                'name': item.get('name', ''),
                'category': item.get('category', ''),
                'city_id': item.get('city_id'),
                'description': item.get('description', ''),
            }

        if users_data:
            for user in users_data:
                user_id = str(user.get('id', ''))
                self.user_profiles[user_id] = user


# 全局实例
feature_store = FeatureStore()
