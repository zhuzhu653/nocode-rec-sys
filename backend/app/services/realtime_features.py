"""
实时特征服务 — Redis-based Feature Store

实现:
  1. 实时用户特征: 最近 N 次行为序列、实时统计 (点击数/停留时长)
  2. 实时 item 特征: 实时 CTR、近期曝光数、热度衰减
  3. 交叉特征: user×item 实时交互计数
  4. 特征缓存: 多级缓存 (L1 内存 + L2 Redis)

架构:
  Online Serving:
    request → L1 cache → L2 Redis → 计算 fallback
  Nearline Update:
    行为日志 → Flink/Spark Streaming → 实时特征更新 → Redis

使用:
  store = RealtimeFeatureStore(redis_url="redis://localhost:6379")
  features = store.get_user_realtime_features(user_id)
"""
import time
import json
import logging
from typing import Dict, List, Optional, Any
from collections import defaultdict, OrderedDict

import numpy as np

logger = logging.getLogger(__name__)

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class LRUCache:
    """L1 内存缓存 (LRU)"""

    def __init__(self, capacity=10000, ttl_seconds=60):
        self.capacity = capacity
        self.ttl = ttl_seconds
        self.cache = OrderedDict()
        self.timestamps = {}

    def get(self, key):
        if key in self.cache:
            # 检查过期
            if time.time() - self.timestamps[key] > self.ttl:
                del self.cache[key]
                del self.timestamps[key]
                return None
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.capacity:
                oldest = next(iter(self.cache))
                del self.cache[oldest]
                del self.timestamps[oldest]
        self.cache[key] = value
        self.timestamps[key] = time.time()


class RealtimeFeatureStore:
    """
    实时特征存储服务

    特征层级:
      - 用户实时特征: 最近行为序列、session 内统计、实时兴趣 embedding
      - 物品实时特征: 实时 CTR (滑动窗口)、近 1h 曝光/点击数、热度分
      - 上下文特征: 时间 (小时/星期)、设备、位置
      - 交叉特征: user×item 历史交互次数

    存储设计 (Redis):
      用户行为序列: ZSET  user:{uid}:behavior_seq  (score=timestamp)
      用户统计: HASH   user:{uid}:stats  {click_1h, view_1h, ...}
      物品统计: HASH   item:{iid}:stats  {ctr_1h, exposure_1h, ...}
      实时 CTR: STRING item:{iid}:rt_ctr
    """

    def __init__(self, redis_url: str = "redis://localhost:6379", use_mock=True):
        self.use_mock = use_mock or not REDIS_AVAILABLE
        self.l1_cache = LRUCache(capacity=10000, ttl_seconds=30)

        if not self.use_mock and REDIS_AVAILABLE:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
        else:
            # Mock: 内存模拟
            self.mock_store = {
                'user_behaviors': defaultdict(list),
                'user_stats': defaultdict(lambda: {'click_1h': 0, 'view_1h': 0, 'dwell_sum': 0}),
                'item_stats': defaultdict(lambda: {'exposure_1h': 0, 'click_1h': 0, 'ctr_1h': 0.0}),
            }
            logger.info("RealtimeFeatureStore running in mock mode")

    # =================== 写入 ===================

    def record_behavior(self, user_id: int, item_id: int, action: str,
                        timestamp: float = None, extra: Dict = None):
        """
        实时记录用户行为 → 更新特征

        Nearline update path:
          前端行为 → Kafka → Flink job → Redis 特征更新
        """
        ts = timestamp or time.time()
        event = {'item_id': item_id, 'action': action, 'ts': ts, **(extra or {})}

        if self.use_mock:
            # 更新行为序列 (保留最近 100 条)
            self.mock_store['user_behaviors'][user_id].append(event)
            self.mock_store['user_behaviors'][user_id] = \
                self.mock_store['user_behaviors'][user_id][-100:]

            # 更新统计
            stats = self.mock_store['user_stats'][user_id]
            if action == 'click':
                stats['click_1h'] += 1
            elif action == 'view':
                stats['view_1h'] += 1
            if extra and 'dwell_time' in extra:
                stats['dwell_sum'] += extra['dwell_time']

            # 更新 item 统计
            item_stats = self.mock_store['item_stats'][item_id]
            item_stats['exposure_1h'] += 1
            if action in ('click', 'like', 'book'):
                item_stats['click_1h'] += 1
            item_stats['ctr_1h'] = item_stats['click_1h'] / max(item_stats['exposure_1h'], 1)
        else:
            # Redis 实现
            pipe = self.redis_client.pipeline()
            pipe.zadd(f"user:{user_id}:seq", {json.dumps(event): ts})
            pipe.zremrangebyrank(f"user:{user_id}:seq", 0, -101)  # 保留最近 100
            pipe.hincrby(f"user:{user_id}:stats", f"{action}_1h", 1)
            pipe.hincrby(f"item:{item_id}:stats", "exposure_1h", 1)
            if action in ('click', 'like', 'book'):
                pipe.hincrby(f"item:{item_id}:stats", "click_1h", 1)
            pipe.execute()

        # 清除 L1 缓存
        self.l1_cache.put(f"user:{user_id}", None)

    # =================== 读取 ===================

    def get_user_realtime_features(self, user_id: int) -> Dict:
        """
        获取用户实时特征

        Returns:
            {
                'recent_items': [int, ...],          # 最近交互 item 序列
                'recent_actions': [str, ...],        # 最近行为类型
                'click_count_1h': int,               # 近 1h 点击数
                'view_count_1h': int,                # 近 1h 浏览数
                'avg_dwell_time': float,             # 平均停留时长
                'session_depth': int,                # 当前 session 深度
                'diversity_score': float,            # 最近行为多样性
            }
        """
        # L1 缓存
        cached = self.l1_cache.get(f"user_rt:{user_id}")
        if cached:
            return cached

        if self.use_mock:
            behaviors = self.mock_store['user_behaviors'].get(user_id, [])
            stats = self.mock_store['user_stats'][user_id]

            recent_items = [b['item_id'] for b in behaviors[-20:]]
            recent_actions = [b['action'] for b in behaviors[-20:]]

            features = {
                'recent_items': recent_items,
                'recent_actions': recent_actions,
                'click_count_1h': stats['click_1h'],
                'view_count_1h': stats['view_1h'],
                'avg_dwell_time': stats['dwell_sum'] / max(stats['click_1h'], 1),
                'session_depth': len(behaviors),
                'diversity_score': len(set(recent_items)) / max(len(recent_items), 1),
            }
        else:
            # Redis 读取
            pipe = self.redis_client.pipeline()
            pipe.zrange(f"user:{user_id}:seq", -20, -1)
            pipe.hgetall(f"user:{user_id}:stats")
            results = pipe.execute()

            behaviors = [json.loads(b) for b in results[0]] if results[0] else []
            stats = results[1] if results[1] else {}

            recent_items = [b['item_id'] for b in behaviors]
            features = {
                'recent_items': recent_items,
                'recent_actions': [b['action'] for b in behaviors],
                'click_count_1h': int(stats.get('click_1h', 0)),
                'view_count_1h': int(stats.get('view_1h', 0)),
                'avg_dwell_time': 0.0,
                'session_depth': len(behaviors),
                'diversity_score': len(set(recent_items)) / max(len(recent_items), 1),
            }

        self.l1_cache.put(f"user_rt:{user_id}", features)
        return features

    def get_item_realtime_features(self, item_id: int) -> Dict:
        """
        获取物品实时特征

        Returns:
            {
                'realtime_ctr': float,     # 实时 CTR (滑动窗口)
                'exposure_1h': int,         # 近 1h 曝光数
                'click_1h': int,            # 近 1h 点击数
                'trending_score': float,    # 热度变化趋势
            }
        """
        if self.use_mock:
            stats = self.mock_store['item_stats'][item_id]
            return {
                'realtime_ctr': stats['ctr_1h'],
                'exposure_1h': stats['exposure_1h'],
                'click_1h': stats['click_1h'],
                'trending_score': min(stats['click_1h'] / 10.0, 1.0),
            }
        else:
            stats = self.redis_client.hgetall(f"item:{item_id}:stats")
            exposure = int(stats.get('exposure_1h', 0))
            click = int(stats.get('click_1h', 0))
            return {
                'realtime_ctr': click / max(exposure, 1),
                'exposure_1h': exposure,
                'click_1h': click,
                'trending_score': min(click / 10.0, 1.0),
            }

    def assemble_serving_features(self, user_id: int, item_id: int,
                                   position: int = 0) -> Dict:
        """
        组装完整 serving 特征 (用于精排模型推理)

        合并: 用户实时 + 物品实时 + 上下文
        """
        user_feats = self.get_user_realtime_features(user_id)
        item_feats = self.get_item_realtime_features(item_id)

        # 上下文特征
        now = time.localtime()
        context = {
            'hour': now.tm_hour,
            'weekday': now.tm_wday,
            'is_weekend': int(now.tm_wday >= 5),
            'position': position,
        }

        # 交叉特征
        cross = {
            'user_item_click_history': int(item_id in user_feats.get('recent_items', [])),
        }

        return {
            'user': user_feats,
            'item': item_feats,
            'context': context,
            'cross': cross,
        }

    # =================== 特征衰减 ===================

    def decay_features(self, decay_factor=0.9):
        """
        定时任务: 衰减统计特征 (模拟滑动窗口)
        每小时执行一次
        """
        if self.use_mock:
            for uid, stats in self.mock_store['user_stats'].items():
                stats['click_1h'] = int(stats['click_1h'] * decay_factor)
                stats['view_1h'] = int(stats['view_1h'] * decay_factor)
            for iid, stats in self.mock_store['item_stats'].items():
                stats['exposure_1h'] = int(stats['exposure_1h'] * decay_factor)
                stats['click_1h'] = int(stats['click_1h'] * decay_factor)
                stats['ctr_1h'] = stats['click_1h'] / max(stats['exposure_1h'], 1)
        logger.info("Feature decay applied")
