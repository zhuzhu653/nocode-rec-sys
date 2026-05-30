"""Embedding 服务 - 文本向量化"""
import numpy as np
from functools import lru_cache
from app.config import get_settings

settings = get_settings()

# 延迟加载模型（避免 import 时就下载）
_model = None


def _load_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print(f"📦 Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model)
        print("✅ Embedding model loaded")
    return _model


class EmbeddingService:
    """文本 Embedding 服务"""

    def __init__(self):
        self.model = _load_model()
        self.dim = settings.embedding_dim

    def encode_query(self, text: str) -> np.ndarray:
        """编码用户搜索查询 → 768维向量"""
        return self.model.encode(text, normalize_embeddings=True)

    def encode_batch(self, texts: list[str]) -> np.ndarray:
        """批量编码文本"""
        return self.model.encode(texts, normalize_embeddings=True, batch_size=32)

    def item_to_text(self, item: dict) -> str:
        """将结构化 Item 转为文本描述 (用于生成 embedding)"""
        parts = [
            item.get("name", ""),
            item.get("description", ""),
            item.get("category", ""),
            item.get("type", ""),
            " ".join(item.get("vibe", []) or []),
            item.get("address", ""),
        ]
        return " ".join(filter(None, parts))

    def similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """计算余弦相似度"""
        return float(np.dot(vec_a, vec_b))


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
