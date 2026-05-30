"""脚本: 生成所有 Item 的 Embedding 并缓存到本地文件

用法: python -m scripts.seed_embeddings
"""
import json
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.embedding import get_embedding_service
from app.services.database import get_all_items_for_embedding
import asyncio


async def main():
    print("🚀 开始生成 Item Embeddings...")

    # 1. 获取所有 Item
    items = await get_all_items_for_embedding()
    print(f"📊 获取到 {len(items)} 个 Item")

    if not items:
        print("⚠️ 数据库中没有数据，请先在 Supabase 中添加数据")
        return

    # 2. 生成 Embedding
    embedding_service = get_embedding_service()
    texts = [embedding_service.item_to_text(item) for item in items]

    print(f"🔄 正在生成 {len(texts)} 个 Embedding...")
    embeddings = embedding_service.encode_batch(texts)
    print(f"✅ Embedding 生成完成，shape: {embeddings.shape}")

    # 3. 保存到本地缓存
    cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache")
    os.makedirs(cache_dir, exist_ok=True)

    np.save(os.path.join(cache_dir, "embeddings.npy"), embeddings)

    # 保存 Item 元数据 (不含 embedding)
    with open(os.path.join(cache_dir, "items.json"), "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2, default=str)

    print(f"💾 缓存已保存到 {cache_dir}/")
    print(f"   - embeddings.npy: {embeddings.shape}")
    print(f"   - items.json: {len(items)} items")


if __name__ == "__main__":
    asyncio.run(main())
