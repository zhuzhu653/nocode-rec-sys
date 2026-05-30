"""
推荐引擎服务 - 工业级搜广推全链路
Pipeline: 多路召回 → 粗排 → 精排 → 重排

召回层 (Recall):
  1. 向量召回 (Embedding-based): Two-Tower / DSSM
  2. 行为序列召回 (Sequential): SASRec
  3. 协同过滤召回 (CF): ItemCF / UserCF / Swing
  4. 图召回 (Graph): LightGCN
  5. 热度召回 (Hot): 时间衰减热度
  
粗排层 (Pre-Ranking):
  - 轻量双塔打分, 从数千候选筛到数百

精排层 (Ranking):
  - DIN / DCN-V2 / DeepFM / MMOE 多目标打分
  
重排层 (Re-Ranking):
  - MMR 多样性 + DPP + 位置偏差校准 + 探索策略
"""
import random
import time
import numpy as np
from typing import Optional, List, Dict
from app.services.vector_store import get_vector_store
from app.services.embedding import get_embedding_service
from app.services.feature_store import feature_store
from app.ml.reranker import MMR, DPP, ExplorationStrategy


class RecallResult:
    """召回结果"""
    def __init__(self, item_id: str, score: float, source: str):
        self.item_id = item_id
        self.score = score
        self.source = source


class RecommenderEngine:
    """
    推荐引擎 - 多路召回 + 精排 + 重排 全链路
    
    当前实现:
    - ✅ 向量召回 (text2vec embedding)
    - ✅ 热度召回 (rating + recency)
    - ✅ MMR 多样性重排
    - ✅ 探索策略 (Thompson Sampling)
    - 🔲 DIN 精排 (需要行为数据训练)
    - 🔲 SASRec 序列召回 (需要行为序列)
    - 🔲 LightGCN 图召回 (需要交互图)
    """

    def __init__(self):
        self.vector_store = get_vector_store()
        self.embedding_service = get_embedding_service()
        
        # 重排组件
        self.mmr = MMR(lambda_param=0.6)
        self.dpp = DPP(alpha=0.5)
        self.exploration = ExplorationStrategy(strategy='thompson', epsilon=0.1)
        
        # 配置
        self.recall_quota = {
            'vector': 50,       # 向量召回数
            'hot': 30,          # 热度召回数
            'cf': 30,           # 协同过滤召回数
            'sequential': 20,   # 序列召回数
        }

    async def recommend(
        self,
        user_id: Optional[str],
        scene: str,
        item_id: Optional[str] = None,
        city_id: Optional[int] = None,
        top_k: int = 10,
    ) -> tuple[list[dict], str]:
        """
        推荐入口
        Returns: (推荐结果列表, 策略名称)
        """
        if scene == "similar" and item_id:
            return await self._similar_items(item_id, top_k), "vector_similar"
        elif scene == "home_feed":
            return await self._full_pipeline(user_id, city_id, top_k), "multi_recall_fusion"
        elif scene == "you_may_like":
            return await self._full_pipeline(user_id, city_id, top_k), "personalized"
        else:
            return await self._hot_recall(city_id, top_k), "hot"

    # =================== 完整推荐 Pipeline ===================

    async def _full_pipeline(
        self, user_id: Optional[str], city_id: Optional[int], top_k: int
    ) -> list[dict]:
        """完整推荐链路: 多路召回 → 融合去重 → 粗排 → 精排 → 重排"""
        
        # Step 1: 多路召回
        recall_results = await self._multi_recall(user_id, city_id)
        
        if not recall_results:
            return []

        # Step 2: 融合去重
        merged = self._merge_and_dedupe(recall_results)
        
        # Step 3: 粗排 (目前用召回分数近似, 后续接入轻量模型)
        pre_ranked = self._pre_rank(merged, user_id)
        
        # Step 4: 精排 (目前用加权分数, 后续接入 DIN/DCN-V2)
        ranked = self._rank(pre_ranked, user_id)
        
        # Step 5: 重排 (MMR 多样性 + 探索)
        reranked = self._rerank(ranked, top_k)
        
        return reranked

    # =================== 多路召回 ===================

    async def _multi_recall(
        self, user_id: Optional[str], city_id: Optional[int]
    ) -> List[RecallResult]:
        """多路召回并行执行"""
        results = []
        
        # 路 1: 向量召回 (基于用户兴趣向量)
        vector_results = await self._vector_recall(user_id, city_id)
        results.extend(vector_results)
        
        # 路 2: 热度召回
        hot_results = await self._hot_recall_internal(city_id)
        results.extend(hot_results)
        
        # 路 3: 协同过滤召回 (基于用户行为)
        if user_id:
            cf_results = await self._cf_recall(user_id, city_id)
            results.extend(cf_results)
        
        # 路 4: 序列召回 (SASRec, 需要训练后)
        # if user_id:
        #     seq_results = await self._sequential_recall(user_id)
        #     results.extend(seq_results)
        
        return results

    async def _vector_recall(
        self, user_id: Optional[str], city_id: Optional[int]
    ) -> List[RecallResult]:
        """向量召回: 基于用户兴趣 embedding 做 ANN 检索"""
        if not self.vector_store.is_loaded:
            return []

        # 获取用户兴趣向量 (用历史行为的 item embedding 加权平均)
        user_interest_emb = None
        if user_id:
            behavior_seq = feature_store.get_user_behavior_sequence(user_id, max_len=20)
            if behavior_seq:
                embs = [
                    self.vector_store.get_item_embedding(item_id)
                    for item_id in behavior_seq
                    if self.vector_store.get_item_embedding(item_id) is not None
                ]
                if embs:
                    # 时间衰减加权: 最近的行为权重更高
                    weights = np.exp(-0.1 * np.arange(len(embs)))
                    weights /= weights.sum()
                    user_interest_emb = np.average(embs, axis=0, weights=weights)

        if user_interest_emb is None:
            # 冷启动: 用城市热门的平均向量
            return []

        # ANN 检索
        results = self.vector_store.search_by_vector(
            user_interest_emb,
            top_k=self.recall_quota['vector'],
            city_id=city_id
        )

        return [
            RecallResult(item_id=r['id'], score=r['similarity'], source='vector')
            for r in results
        ]

    async def _hot_recall_internal(self, city_id: Optional[int]) -> List[RecallResult]:
        """热度召回: 时间衰减的热门 item"""
        if not self.vector_store.is_loaded:
            return []

        items = self.vector_store.items
        if city_id:
            items = [i for i in items if i.get("city_id") == city_id]

        # 热度分 = rating * time_decay
        scored = []
        now = time.time()
        for item in items:
            rating = item.get("rating", 0) or 0
            # 简化: 没有时间戳就用 rating 作为热度
            hot_score = rating
            scored.append((item, hot_score))

        scored.sort(key=lambda x: x[1], reverse=True)
        top_items = scored[:self.recall_quota['hot']]

        return [
            RecallResult(item_id=str(item['id']), score=score, source='hot')
            for item, score in top_items
        ]

    async def _cf_recall(
        self, user_id: str, city_id: Optional[int]
    ) -> List[RecallResult]:
        """
        协同过滤召回 (ItemCF / Swing)
        当前: 基于用户历史相似 item 的 i2i 召回
        生产环境: 离线计算 i2i 相似度表 + 在线查表
        """
        behavior_seq = feature_store.get_user_behavior_sequence(user_id, max_len=10)
        if not behavior_seq:
            return []

        # 对用户最近交互的 item, 找相似 item
        cf_candidates = []
        for seed_item_id in behavior_seq[:5]:
            similar = self.vector_store.get_similar_items(seed_item_id, top_k=10)
            for item in similar:
                cf_candidates.append(
                    RecallResult(
                        item_id=str(item['id']),
                        score=item['similarity'] * 0.8,  # 降权避免太相似
                        source='cf'
                    )
                )

        return cf_candidates[:self.recall_quota['cf']]

    # =================== 融合去重 ===================

    def _merge_and_dedupe(self, recall_results: List[RecallResult]) -> List[Dict]:
        """
        多路召回结果融合去重
        策略: 同一 item 出现在多路 → 加分 (说明多个信号都认为它好)
        """
        item_scores = {}  # item_id → {total_score, sources, count}

        for r in recall_results:
            if r.item_id not in item_scores:
                item_scores[r.item_id] = {
                    'total_score': 0,
                    'sources': set(),
                    'max_score': 0,
                }
            entry = item_scores[r.item_id]
            entry['total_score'] += r.score
            entry['sources'].add(r.source)
            entry['max_score'] = max(entry['max_score'], r.score)

        # 融合分数: max_score + 0.1 * (出现路数 - 1)
        merged = []
        for item_id, info in item_scores.items():
            fusion_score = info['max_score'] + 0.1 * (len(info['sources']) - 1)
            merged.append({
                'item_id': item_id,
                'score': fusion_score,
                'sources': list(info['sources']),
            })

        merged.sort(key=lambda x: x['score'], reverse=True)
        return merged

    # =================== 粗排 ===================

    def _pre_rank(self, candidates: List[Dict], user_id: Optional[str]) -> List[Dict]:
        """
        粗排: 从数百候选快速筛选到 ~100
        当前: 用融合分数排序
        生产环境: 轻量双塔模型 (Two-Tower 内积打分)
        """
        # 取 top 100
        return candidates[:100]

    # =================== 精排 ===================

    def _rank(self, candidates: List[Dict], user_id: Optional[str]) -> List[Dict]:
        """
        精排: 对粗排结果用重模型精确打分
        当前: 用融合分数 + 简单特征加权
        生产环境: DIN/DCN-V2/MMOE 多目标精排
        
        多目标融合公式 (MMOE 输出):
          final_score = w1*pCTR + w2*pCVR + w3*pLike + w4*log(1+dwell_time)
        """
        for candidate in candidates:
            item_id = candidate['item_id']
            item_feat = feature_store.get_item_features(item_id)
            
            # 简单特征加权 (模拟精排)
            base_score = candidate['score']
            
            # 多目标分数 (当前用启发式, 后续接入真模型)
            quality_boost = 0
            stats = item_feat.get('stats', {})
            if stats.get('ctr', 0) > 0.1:
                quality_boost += 0.1
            if stats.get('like_rate', 0) > 0.05:
                quality_boost += 0.05
            
            candidate['rank_score'] = base_score + quality_boost

        candidates.sort(key=lambda x: x.get('rank_score', x['score']), reverse=True)
        return candidates

    # =================== 重排 ===================

    def _rerank(self, ranked_candidates: List[Dict], top_k: int) -> List[dict]:
        """
        重排: MMR 多样性 + 探索策略
        """
        if not ranked_candidates:
            return []

        n = min(len(ranked_candidates), top_k * 3)  # 重排窗口
        candidates = ranked_candidates[:n]

        # 获取 item embedding 用于多样性计算
        item_ids = [c['item_id'] for c in candidates]
        embeddings = []
        for item_id in item_ids:
            emb = self.vector_store.get_item_embedding(item_id)
            if emb is not None:
                embeddings.append(emb)
            else:
                embeddings.append(np.random.randn(768))  # fallback

        embeddings = np.array(embeddings)
        scores = np.array([c.get('rank_score', c['score']) for c in candidates])

        # 归一化分数到 [0, 1]
        if scores.max() > scores.min():
            scores_norm = (scores - scores.min()) / (scores.max() - scores.min())
        else:
            scores_norm = np.ones_like(scores)

        # MMR 重排
        selected_indices = self.mmr.rerank(scores_norm, embeddings, top_k=top_k)

        # 探索策略: 对选出的 item 混入少量探索
        explore_ratio = 0.1
        num_explore = max(1, int(top_k * explore_ratio))
        
        # 用 Thompson Sampling 决定是否替换最后几个
        if len(selected_indices) > num_explore:
            remaining = [i for i in range(n) if i not in selected_indices]
            if remaining:
                explore_scores = self.exploration.thompson_sample(
                    [item_ids[i] for i in remaining[:num_explore * 2]]
                )
                explore_top = np.argsort(explore_scores)[-num_explore:]
                for j, idx in enumerate(explore_top):
                    if idx < len(remaining):
                        # 替换列表末尾的 item
                        replace_pos = -(j + 1)
                        if abs(replace_pos) <= len(selected_indices):
                            selected_indices[replace_pos] = remaining[idx]

        # 组装最终结果
        results = []
        for idx in selected_indices[:top_k]:
            if idx >= len(candidates):
                continue
            candidate = candidates[idx]
            item_id = candidate['item_id']
            
            # 查找物品详情
            item_detail = self._get_item_detail(item_id)
            if item_detail:
                results.append(item_detail)

        return results

    # =================== 辅助方法 ===================

    async def _similar_items(self, item_id: str, top_k: int) -> list[dict]:
        """基于向量相似度的相似推荐"""
        results = self.vector_store.get_similar_items(item_id, top_k)
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "type": r.get("item_type", r.get("type", "location")),
                "description": r.get("description"),
                "image_url": r.get("image_url") or r.get("thumbnail_url"),
                "score": r["similarity"],
                "reason": "与当前内容相似",
            }
            for r in results
        ]

    async def _hot_recall(self, city_id: Optional[int], top_k: int) -> list[dict]:
        """热门推荐 (简化路径, 不经过完整 pipeline)"""
        if not self.vector_store.is_loaded:
            return []

        items = self.vector_store.items
        if city_id:
            items = [i for i in items if i.get("city_id") == city_id]

        items = sorted(items, key=lambda x: x.get("rating", 0) or 0, reverse=True)[:top_k]
        return [self._format_item(item, "热门推荐") for item in items]

    def _get_item_detail(self, item_id: str) -> Optional[dict]:
        """获取物品详情"""
        if not self.vector_store.is_loaded:
            return None
        for item in self.vector_store.items:
            if str(item.get('id')) == str(item_id):
                return self._format_item(item, self._generate_reason(item))
        return None

    def _format_item(self, item: dict, reason: str) -> dict:
        """格式化输出"""
        return {
            "id": item["id"],
            "name": item["name"],
            "type": item.get("item_type", item.get("type", "location")),
            "description": item.get("description"),
            "image_url": item.get("image_url") or item.get("thumbnail_url"),
            "score": item.get("rating", 0) or 0,
            "reason": reason,
        }

    def _generate_reason(self, item: dict) -> str:
        """生成推荐理由"""
        vibe = item.get("vibe", [])
        item_type = item.get("type", "")

        type_map = {
            "museum": "博物馆爱好者的选择",
            "gallery": "艺术空间探索",
            "bookstore": "书香之地",
            "cafe": "安静的角落",
            "park": "城市绿洲",
            "workshop": "手工体验",
        }

        if item_type in type_map:
            return type_map[item_type]
        if vibe:
            return f"氛围: {', '.join(vibe[:2])}"
        return "精选推荐"


_engine: RecommenderEngine | None = None


def get_recommender() -> RecommenderEngine:
    global _engine
    if _engine is None:
        _engine = RecommenderEngine()
    return _engine
