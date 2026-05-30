"""
FAISS 向量检索模块 — 替代暴力搜索, 支持百万级 item 检索

实现:
  1. FlatIP — 精确内积搜索 (小规模 baseline)
  2. IVF-PQ — 倒排+乘积量化 (工业级, 百万到亿级)
  3. HNSW — 基于图的近似最近邻 (低延迟)

核心指标:
  - Recall@K: 近似搜索 vs 精确搜索的召回率
  - QPS: 每秒查询数
  - 内存占用

使用示例:
  index = FAISSIndex(dim=768, index_type='ivf_pq', n_items=100000)
  index.build(item_embeddings)
  results = index.search(query_embedding, top_k=100)
"""
import numpy as np
import logging
import time
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("faiss not installed. Using numpy fallback. Install: pip install faiss-cpu")


class FAISSIndex:
    """
    统一的 FAISS 向量检索接口

    支持 index_type:
      - 'flat': 精确搜索 (brute-force), 适合 < 10k items
      - 'ivf_pq': IVF + Product Quantization, 适合 100k~100M items
      - 'hnsw': Hierarchical NSW, 适合低延迟场景
      - 'ivf_flat': IVF 精确 (折中方案)
    """

    def __init__(self, dim: int, index_type: str = 'ivf_pq', n_items: int = 10000):
        self.dim = dim
        self.index_type = index_type
        self.n_items = n_items
        self.index = None
        self.is_trained = False
        self.item_ids = None  # 外部 ID 映射

    def build(self, embeddings: np.ndarray, item_ids: Optional[np.ndarray] = None):
        """
        构建索引

        Args:
            embeddings: [N, dim] float32 向量矩阵
            item_ids: [N] 外部 item ID (如果不是 0~N-1)
        """
        n, d = embeddings.shape
        assert d == self.dim, f"Dimension mismatch: {d} vs {self.dim}"
        embeddings = embeddings.astype(np.float32)

        # L2 归一化 (用于内积搜索)
        faiss.normalize_L2(embeddings) if FAISS_AVAILABLE else None

        self.item_ids = item_ids

        if not FAISS_AVAILABLE:
            # Numpy fallback
            self.embeddings = embeddings
            self.is_trained = True
            logger.info(f"Built numpy index: {n} vectors, dim={d}")
            return

        start = time.time()

        if self.index_type == 'flat':
            self.index = faiss.IndexFlatIP(d)
            self.index.add(embeddings)

        elif self.index_type == 'ivf_pq':
            # IVF: nlist 个聚类中心
            nlist = min(int(np.sqrt(n)), 256)
            # PQ: 将 d 维切成 m 段, 每段量化为 nbits 位
            m = min(d // 4, 32)  # subquantizers
            nbits = 8
            quantizer = faiss.IndexFlatIP(d)
            self.index = faiss.IndexIVFPQ(quantizer, d, nlist, m, nbits)
            self.index.train(embeddings)
            self.index.add(embeddings)
            self.index.nprobe = min(nlist // 4, 32)  # 搜索时探查的聚类数

        elif self.index_type == 'hnsw':
            M = 32  # 每个节点的邻居数
            self.index = faiss.IndexHNSWFlat(d, M)
            self.index.hnsw.efConstruction = 200
            self.index.hnsw.efSearch = 64
            self.index.add(embeddings)

        elif self.index_type == 'ivf_flat':
            nlist = min(int(np.sqrt(n)), 256)
            quantizer = faiss.IndexFlatIP(d)
            self.index = faiss.IndexIVFFlat(quantizer, d, nlist)
            self.index.train(embeddings)
            self.index.add(embeddings)
            self.index.nprobe = min(nlist // 4, 32)

        else:
            raise ValueError(f"Unknown index_type: {self.index_type}")

        self.is_trained = True
        elapsed = time.time() - start
        logger.info(f"Built FAISS {self.index_type} index: {n} vectors, dim={d}, time={elapsed:.2f}s")

    def search(self, query: np.ndarray, top_k: int = 100) -> Tuple[np.ndarray, np.ndarray]:
        """
        向量检索

        Args:
            query: [B, dim] or [dim] 查询向量
            top_k: 返回 top-K 结果

        Returns:
            (scores, indices): [B, top_k] 相似度分数和 item 索引
        """
        if query.ndim == 1:
            query = query.reshape(1, -1)
        query = query.astype(np.float32)

        if not FAISS_AVAILABLE:
            # Numpy fallback
            scores = query @ self.embeddings.T  # [B, N]
            top_indices = np.argsort(scores, axis=1)[:, -top_k:][:, ::-1]
            top_scores = np.take_along_axis(scores, top_indices, axis=1)
            if self.item_ids is not None:
                top_indices = self.item_ids[top_indices]
            return top_scores, top_indices

        faiss.normalize_L2(query)
        scores, indices = self.index.search(query, top_k)

        # 映射回外部 ID
        if self.item_ids is not None:
            valid_mask = indices >= 0
            mapped = np.zeros_like(indices)
            mapped[valid_mask] = self.item_ids[indices[valid_mask]]
            indices = mapped

        return scores, indices

    def add_items(self, new_embeddings: np.ndarray, new_ids: Optional[np.ndarray] = None):
        """增量添加新 item (支持实时索引更新)"""
        new_embeddings = new_embeddings.astype(np.float32)
        if FAISS_AVAILABLE:
            faiss.normalize_L2(new_embeddings)
            self.index.add(new_embeddings)
        else:
            self.embeddings = np.vstack([self.embeddings, new_embeddings])

        if new_ids is not None and self.item_ids is not None:
            self.item_ids = np.concatenate([self.item_ids, new_ids])

    def benchmark(self, queries: np.ndarray, ground_truth: np.ndarray, top_k=100):
        """
        评估检索质量

        Args:
            queries: [Q, dim]
            ground_truth: [Q, K] 精确最近邻结果
        Returns:
            dict with recall@K, latency
        """
        start = time.time()
        _, pred_indices = self.search(queries, top_k)
        latency = (time.time() - start) / len(queries) * 1000  # ms per query

        # Recall@K
        recalls = []
        for i in range(len(queries)):
            gt_set = set(ground_truth[i].tolist())
            pred_set = set(pred_indices[i].tolist())
            recall = len(gt_set & pred_set) / max(len(gt_set), 1)
            recalls.append(recall)

        return {
            'recall@k': np.mean(recalls),
            'latency_ms': latency,
            'qps': 1000 / max(latency, 0.001),
        }


class TwoStageRetriever:
    """
    两阶段检索 — 工业标准架构

    Stage 1: FAISS ANN → 粗召回 top-500
    Stage 2: 精排模型重排 → 输出 top-50

    额外:
      - 多路召回合并 (向量/i2i/热门/冷启动)
      - Bloom Filter 去重 (已曝光过滤)
    """

    def __init__(self, dim=768, n_items=10000):
        self.vector_index = FAISSIndex(dim, 'ivf_pq', n_items)
        self.exposed_items = {}  # user_id → set of exposed item_ids

    def build_index(self, embeddings, item_ids=None):
        self.vector_index.build(embeddings, item_ids)

    def retrieve(self, user_embedding: np.ndarray, user_id: int,
                 top_k: int = 500, filter_exposed: bool = True) -> List[Tuple[int, float]]:
        """
        召回阶段

        Returns:
            [(item_id, score), ...] top_k candidates
        """
        scores, indices = self.vector_index.search(user_embedding, top_k * 2)
        scores = scores[0]
        indices = indices[0]

        # 过滤已曝光
        results = []
        exposed = self.exposed_items.get(user_id, set()) if filter_exposed else set()
        for idx, score in zip(indices, scores):
            if idx not in exposed and idx > 0:
                results.append((int(idx), float(score)))
            if len(results) >= top_k:
                break

        return results

    def mark_exposed(self, user_id: int, item_ids: List[int]):
        """标记已曝光 item"""
        if user_id not in self.exposed_items:
            self.exposed_items[user_id] = set()
        self.exposed_items[user_id].update(item_ids)
