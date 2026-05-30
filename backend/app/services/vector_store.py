"""向量检索服务 - 基于内存 (MVP 阶段)

MVP 阶段使用内存向量索引 (numpy brute-force)。
后续可平滑迁移到 pgvector / Milvus。
"""
import numpy as np
from typing import Optional
from app.services.embedding import get_embedding_service


class VectorStore:
    """内存向量存储 (MVP)

    生产环境应替换为 pgvector 或 Milvus。
    """

    def __init__(self):
        self.embeddings: np.ndarray | None = None  # (N, dim)
        self.items: list[dict] = []
        self.id_to_idx: dict[str, int] = {}

    @property
    def is_loaded(self) -> bool:
        return self.embeddings is not None and len(self.items) > 0

    def load(self, items: list[dict], embeddings: np.ndarray):
        """加载 Item 和对应的 embedding"""
        self.items = items
        self.embeddings = embeddings
        self.id_to_idx = {item["id"]: i for i, item in enumerate(items)}
        print(f"✅ VectorStore loaded: {len(items)} items, dim={embeddings.shape[1]}")

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        city_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        """向量相似度检索"""
        if not self.is_loaded:
            return []

        # 计算余弦相似度 (embeddings 已归一化)
        similarities = self.embeddings @ query_embedding

        # 获取 top_k * 3 (留余量给过滤)
        top_indices = np.argsort(similarities)[::-1][: top_k * 3]

        results = []
        for idx in top_indices:
            item = self.items[idx]
            score = float(similarities[idx])

            # 过滤条件
            if city_id and item.get("city_id") != city_id:
                continue
            if category and item.get("type") != category:
                continue
            if score < 0.3:  # 相似度阈值
                continue

            results.append({**item, "similarity": score})

            if len(results) >= top_k:
                break

        return results

    def get_similar_items(self, item_id: str, top_k: int = 5) -> list[dict]:
        """获取相似 Item"""
        if item_id not in self.id_to_idx:
            return []

        idx = self.id_to_idx[item_id]
        item_embedding = self.embeddings[idx]
        results = self.search(item_embedding, top_k=top_k + 1)

        # 排除自身
        return [r for r in results if r["id"] != item_id][:top_k]


# 全局单例
_vector_store = VectorStore()


def get_vector_store() -> VectorStore:
    return _vector_store


async def initialize_vector_store():
    """从数据库加载数据并初始化向量索引"""
    from app.services.database import get_all_items_for_embedding

    embedding_service = get_embedding_service()
    store = get_vector_store()

    if store.is_loaded:
        return  # 已加载

    print("🔄 Initializing vector store...")
    items = await get_all_items_for_embedding()

    if not items:
        print("⚠️ No items found in database")
        return

    # 生成 embedding
    texts = [embedding_service.item_to_text(item) for item in items]
    embeddings = embedding_service.encode_batch(texts)

    store.load(items, embeddings)
    print(f"✅ Vector store initialized with {len(items)} items")
