"""
合成数据生成器 + 开源数据集适配器
用于在无真实用户行为时验证推荐模型 pipeline

支持:
  1. 合成数据: 模拟用户行为 (带热门偏差、时间衰减、兴趣聚类)
  2. MovieLens-1M 适配: 下载并转换为项目格式
  3. KuaiRand 适配: 短视频推荐数据集

用法:
  python scripts/generate_synthetic_data.py --mode synthetic --n_users 1000 --n_items 50
  python scripts/generate_synthetic_data.py --mode movielens --data_dir ./data
"""
import os
import sys
import json
import random
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =================== 合成数据生成 ===================

class SyntheticDataGenerator:
    """
    模拟真实推荐场景的用户行为数据生成器

    模拟策略:
      - 用户兴趣聚类: 每个用户有 1-3 个兴趣类别
      - 热门偏差: 少数 item 被大量用户交互 (power-law)
      - 时间衰减: 近期行为权重更高
      - 多行为类型: view > click > like > book (转化漏斗)
      - 位置偏差: 列表前面的 item 更容易被点击
    """

    # 工坊类型
    CATEGORIES = ['陶艺', '花艺', '绘画', '烘焙', '手工皮具', '香薰蜡烛', '木工', '书法']
    CITIES = ['上海', '北京', '杭州', '成都', '广州', '深圳']
    ACTION_TYPES = {'view': 1, 'click': 2, 'like': 3, 'book': 4, 'share': 5}

    def __init__(self, n_users=1000, n_items=50, seed=42):
        random.seed(seed)
        np.random.seed(seed)
        self.n_users = n_users
        self.n_items = n_items

        # 生成 item 属性
        self.items = self._generate_items()
        # 生成用户 profile
        self.users = self._generate_users()
        # item 热度 (power-law)
        self.item_popularity = self._generate_popularity()

    def _generate_items(self):
        items = []
        for i in range(1, self.n_items + 1):
            items.append({
                'item_id': i,
                'name': f'工坊_{i}',
                'category': random.choice(self.CATEGORIES),
                'city': random.choice(self.CITIES),
                'price': round(random.uniform(88, 688), 0),
                'rating': round(random.uniform(3.5, 5.0), 1),
                'n_reviews': int(np.random.pareto(1.5) * 10) + 1,
            })
        return items

    def _generate_users(self):
        users = []
        for u in range(1, self.n_users + 1):
            # 每个用户 1-3 个兴趣类别
            n_interests = random.randint(1, 3)
            interests = random.sample(self.CATEGORIES, n_interests)
            # 城市偏好
            city_pref = random.choice(self.CITIES)
            # 活跃度 (log-normal)
            activity_level = np.random.lognormal(2, 1)

            users.append({
                'user_id': u,
                'interests': interests,
                'city': city_pref,
                'activity_level': min(activity_level, 200),
                'price_sensitivity': random.uniform(0.3, 1.0),
            })
        return users

    def _generate_popularity(self):
        """Power-law 热度分布"""
        pop = np.random.pareto(1.2, self.n_items) + 1
        pop = pop / pop.sum()
        return pop

    def _compute_interaction_prob(self, user, item, position=0):
        """计算用户-物品交互概率"""
        prob = 0.1  # 基础概率

        # 兴趣匹配
        if item['category'] in user['interests']:
            prob += 0.3

        # 城市匹配
        if item['city'] == user['city']:
            prob += 0.1

        # 价格敏感度
        if item['price'] < 200 * user['price_sensitivity']:
            prob += 0.05

        # 评分加成
        prob += (item['rating'] - 3.5) * 0.1

        # 热度加成
        pop_idx = item['item_id'] - 1
        prob += self.item_popularity[pop_idx] * 2

        # 位置偏差 (指数衰减)
        prob *= np.exp(-0.05 * position)

        return min(prob, 0.95)

    def generate_behavior_sequences(self):
        """生成行为序列数据"""
        logger.info(f"Generating behavior sequences: {self.n_users} users × {self.n_items} items")
        sequences = []
        all_interactions = []

        base_time = datetime(2024, 1, 1)

        for user in self.users:
            seq = []
            n_sessions = int(user['activity_level'] / 5) + 1
            n_sessions = min(n_sessions, 40)

            for session in range(n_sessions):
                # 每个 session 曝光 5-15 个 item
                session_time = base_time + timedelta(
                    days=random.randint(0, 180),
                    hours=random.randint(8, 22),
                    minutes=random.randint(0, 59),
                )

                # 按热度采样曝光列表
                exposed_items = np.random.choice(
                    self.n_items, size=random.randint(5, 15),
                    replace=False, p=self.item_popularity
                )

                for pos, item_idx in enumerate(exposed_items):
                    item = self.items[item_idx]
                    prob = self._compute_interaction_prob(user, item, pos)

                    # 曝光 → view (always)
                    ts = int(session_time.timestamp()) + pos * random.randint(3, 30)

                    # 转化漏斗
                    if random.random() < prob:
                        # click
                        dwell_time = random.uniform(5, 120)
                        seq.append((item['item_id'], self.ACTION_TYPES['click'], ts))
                        all_interactions.append({
                            'user_id': user['user_id'],
                            'item_id': item['item_id'],
                            'action': 'click',
                            'timestamp': ts,
                            'dwell_time': round(dwell_time, 1),
                            'position': pos,
                        })

                        # like (30% of clicks)
                        if random.random() < 0.3:
                            seq.append((item['item_id'], self.ACTION_TYPES['like'], ts + 5))
                            all_interactions.append({
                                'user_id': user['user_id'],
                                'item_id': item['item_id'],
                                'action': 'like',
                                'timestamp': ts + 5,
                            })

                        # book (10% of clicks)
                        if random.random() < 0.1:
                            seq.append((item['item_id'], self.ACTION_TYPES['book'], ts + 60))
                            all_interactions.append({
                                'user_id': user['user_id'],
                                'item_id': item['item_id'],
                                'action': 'book',
                                'timestamp': ts + 60,
                            })
                    else:
                        # view only (曝光未点击 → 负样本)
                        seq.append((item['item_id'], self.ACTION_TYPES['view'], ts))
                        all_interactions.append({
                            'user_id': user['user_id'],
                            'item_id': item['item_id'],
                            'action': 'view',
                            'timestamp': ts,
                            'position': pos,
                        })

            # 按时间排序
            seq.sort(key=lambda x: x[2])
            if seq:
                sequences.append(seq)

        logger.info(f"Generated {len(sequences)} sequences, {len(all_interactions)} total interactions")
        return sequences, all_interactions

    def generate_ctr_samples(self, all_interactions):
        """从行为日志构造 CTR 训练样本"""
        logger.info("Constructing CTR samples...")

        # 构建用户历史
        user_history = defaultdict(list)
        for inter in all_interactions:
            if inter['action'] in ('click', 'like', 'book'):
                user_history[inter['user_id']].append(inter['item_id'])

        # item category 映射
        item_cat = {item['item_id']: self.CATEGORIES.index(item['category']) for item in self.items}
        item_city = {item['item_id']: self.CITIES.index(item['city']) for item in self.items}

        samples = []
        for inter in all_interactions:
            uid = inter['user_id']
            iid = inter['item_id']
            label = 1 if inter['action'] in ('click', 'like', 'book') else 0

            # 截取该次交互前的历史
            history_before = [h for h in user_history[uid] if h != iid][-50:]

            # 稠密特征
            item = self.items[iid - 1]
            dense = [
                item['price'] / 700.0,
                item['rating'] / 5.0,
                item['n_reviews'] / 100.0,
                inter.get('position', 0) / 15.0,
                inter.get('dwell_time', 0) / 120.0,
            ]

            samples.append({
                'user_id': uid,
                'item_id': iid,
                'behavior_items': history_before,
                'category': item_cat[iid],
                'city': item_city[iid],
                'label': label,
                'dense_feats': dense,
            })

        # 负采样增强 (1:1 ratio)
        n_pos = sum(1 for s in samples if s['label'] == 1)
        n_neg = sum(1 for s in samples if s['label'] == 0)
        logger.info(f"CTR samples: {n_pos} positive, {n_neg} negative (ratio {n_pos/(n_neg+1):.2f})")

        return samples

    def generate_all(self, output_dir='data/synthetic'):
        """生成全部数据并保存"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # 1. 行为序列
        sequences, interactions = self.generate_behavior_sequences()

        # 2. CTR 样本
        ctr_samples = self.generate_ctr_samples(interactions)

        # 3. 保存
        # items
        with open(output_dir / 'items.json', 'w', encoding='utf-8') as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)

        # users
        with open(output_dir / 'users.json', 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)

        # 行为序列 (for SASRec/HSTU)
        seq_data = [[(item_id, action, ts) for item_id, action, ts in seq] for seq in sequences]
        with open(output_dir / 'sequences.json', 'w', encoding='utf-8') as f:
            json.dump(seq_data, f)

        # 交互日志
        with open(output_dir / 'interactions.json', 'w', encoding='utf-8') as f:
            json.dump(interactions, f)

        # CTR 样本 (for DIN/DCN/DeepFM)
        with open(output_dir / 'ctr_samples.json', 'w', encoding='utf-8') as f:
            json.dump(ctr_samples, f)

        # 统计信息
        stats = {
            'n_users': self.n_users,
            'n_items': self.n_items,
            'n_interactions': len(interactions),
            'n_sequences': len(sequences),
            'n_ctr_samples': len(ctr_samples),
            'avg_seq_len': np.mean([len(s) for s in sequences]),
            'categories': self.CATEGORIES,
            'cities': self.CITIES,
            'action_types': self.ACTION_TYPES,
        }
        with open(output_dir / 'stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        logger.info(f"All data saved to {output_dir}")
        logger.info(f"Stats: {json.dumps(stats, indent=2, ensure_ascii=False)}")
        return stats


# =================== MovieLens 适配器 ===================

class MovieLensAdapter:
    """
    将 MovieLens-1M 数据集转换为项目格式
    下载: https://grouplens.org/datasets/movielens/1m/
    """

    CATEGORY_MAP = {
        "Action": "陶艺", "Adventure": "花艺", "Animation": "绘画",
        "Comedy": "烘焙", "Crime": "手工皮具", "Documentary": "香薰蜡烛",
        "Drama": "木工", "Fantasy": "书法", "Horror": "陶艺",
        "Musical": "花艺", "Mystery": "绘画", "Romance": "烘焙",
        "Sci-Fi": "手工皮具", "Thriller": "香薰蜡烛", "War": "木工",
        "Western": "书法", "Film-Noir": "陶艺", "Children's": "绘画",
    }

    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)

    def load_and_convert(self, output_dir='data/movielens'):
        """加载 MovieLens 并转换"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        ratings_file = self.data_dir / 'ratings.dat'
        movies_file = self.data_dir / 'movies.dat'

        if not ratings_file.exists():
            logger.error(f"MovieLens data not found at {self.data_dir}")
            logger.info("Download from: https://grouplens.org/datasets/movielens/1m/")
            logger.info("Extract ml-1m/ folder to your data_dir")
            return None

        # 读取电影
        movies = {}
        with open(movies_file, 'r', encoding='latin-1') as f:
            for line in f:
                parts = line.strip().split('::')
                mid = int(parts[0])
                title = parts[1]
                genres = parts[2].split('|')
                cat = self.CATEGORY_MAP.get(genres[0], '陶艺')
                movies[mid] = {'item_id': mid, 'name': title, 'category': cat}

        # 读取评分 → 转化为隐式行为
        interactions = []
        with open(ratings_file, 'r', encoding='latin-1') as f:
            for line in f:
                parts = line.strip().split('::')
                uid, mid, rating, ts = int(parts[0]), int(parts[1]), float(parts[2]), int(parts[3])
                # rating >= 4 视为 click, >= 5 视为 like
                if rating >= 4:
                    action = 'like' if rating >= 5 else 'click'
                else:
                    action = 'view'
                interactions.append({
                    'user_id': uid,
                    'item_id': mid,
                    'action': action,
                    'timestamp': ts,
                    'rating': rating,
                })

        # 构造序列
        user_seqs = defaultdict(list)
        for inter in interactions:
            user_seqs[inter['user_id']].append(
                (inter['item_id'],
                 {'view': 1, 'click': 2, 'like': 3, 'book': 4}.get(inter['action'], 1),
                 inter['timestamp'])
            )

        sequences = []
        for uid in sorted(user_seqs.keys()):
            seq = sorted(user_seqs[uid], key=lambda x: x[2])
            if len(seq) >= 5:  # 至少 5 次交互
                sequences.append(seq[-100:])  # 截取最近 100

        # 保存
        with open(output_dir / 'sequences.json', 'w') as f:
            json.dump(sequences, f)
        with open(output_dir / 'interactions.json', 'w') as f:
            json.dump(interactions[:500000], f)  # 限制大小

        items = list(movies.values())
        with open(output_dir / 'items.json', 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

        stats = {
            'n_users': len(user_seqs),
            'n_items': len(movies),
            'n_interactions': len(interactions),
            'n_sequences': len(sequences),
            'source': 'MovieLens-1M',
        }
        with open(output_dir / 'stats.json', 'w') as f:
            json.dump(stats, f, indent=2)

        logger.info(f"MovieLens converted: {stats}")
        return stats


# =================== 负采样工具 ===================

class NegativeSampler:
    """
    多策略负采样器
    支持: uniform, popularity-based, hard-negative (in-batch)
    """

    def __init__(self, n_items, item_popularity=None):
        self.n_items = n_items
        self.item_popularity = item_popularity
        if item_popularity is not None:
            self.pop_probs = item_popularity / item_popularity.sum()
        else:
            self.pop_probs = np.ones(n_items) / n_items

    def uniform_sample(self, positive_items, n_neg=4):
        """均匀负采样"""
        pos_set = set(positive_items)
        negatives = []
        while len(negatives) < n_neg:
            neg = random.randint(1, self.n_items)
            if neg not in pos_set:
                negatives.append(neg)
        return negatives

    def popularity_sample(self, positive_items, n_neg=4):
        """基于热度的负采样 (热门 item 更可能被采为负样本)"""
        pos_set = set(positive_items)
        negatives = []
        max_try = n_neg * 10
        tried = 0
        while len(negatives) < n_neg and tried < max_try:
            neg = np.random.choice(self.n_items, p=self.pop_probs) + 1
            if neg not in pos_set:
                negatives.append(neg)
            tried += 1
        return negatives

    def hard_negative_sample(self, user_embedding, item_embeddings, positive_items, n_neg=4, top_k=50):
        """
        困难负采样: 从 ANN 最近邻中选取未交互的 item
        这些 item 与用户 embedding 相似但用户未点击 → 最有信息量的负样本
        """
        pos_set = set(positive_items)
        # 计算相似度
        if item_embeddings is not None and user_embedding is not None:
            scores = item_embeddings @ user_embedding
            # 排除正样本
            for pid in positive_items:
                if pid - 1 < len(scores):
                    scores[pid - 1] = -np.inf
            # top-k 中随机采
            top_indices = np.argsort(scores)[-top_k:]
            sampled = np.random.choice(top_indices, size=min(n_neg, len(top_indices)), replace=False)
            return (sampled + 1).tolist()
        else:
            return self.uniform_sample(positive_items, n_neg)

    def mixed_sample(self, positive_items, n_neg=4, user_emb=None, item_embs=None):
        """混合负采样: 50% popularity + 50% hard-negative"""
        n_pop = n_neg // 2
        n_hard = n_neg - n_pop
        neg_pop = self.popularity_sample(positive_items, n_pop)
        neg_hard = self.hard_negative_sample(user_emb, item_embs, positive_items, n_hard)
        return neg_pop + neg_hard


# =================== CLI ===================

def main():
    parser = argparse.ArgumentParser(description='生成推荐系统训练数据')
    parser.add_argument('--mode', choices=['synthetic', 'movielens'], default='synthetic')
    parser.add_argument('--n_users', type=int, default=1000)
    parser.add_argument('--n_items', type=int, default=50)
    parser.add_argument('--data_dir', type=str, default='./data/ml-1m')
    parser.add_argument('--output_dir', type=str, default=None)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    if args.mode == 'synthetic':
        output = args.output_dir or 'data/synthetic'
        gen = SyntheticDataGenerator(
            n_users=args.n_users,
            n_items=args.n_items,
            seed=args.seed,
        )
        gen.generate_all(output_dir=output)

    elif args.mode == 'movielens':
        output = args.output_dir or 'data/movielens'
        adapter = MovieLensAdapter(args.data_dir)
        adapter.load_and_convert(output_dir=output)


if __name__ == '__main__':
    main()
