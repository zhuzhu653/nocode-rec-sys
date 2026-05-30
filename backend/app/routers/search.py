"""搜索 API 路由"""
from fastapi import APIRouter, Depends
from app.models.search import SearchRequest, SearchResponse, SearchResult
from app.services.embedding import get_embedding_service, EmbeddingService
from app.services.vector_store import get_vector_store, VectorStore, initialize_vector_store
from app.services.database import search_locations_keyword

router = APIRouter()


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(req: SearchRequest):
    """AI 语义搜索 - 基于向量相似度"""
    store = get_vector_store()

    # 如果向量索引未加载，先初始化
    if not store.is_loaded:
        await initialize_vector_store()

    # 如果仍未加载（数据库为空），降级为关键词搜索
    if not store.is_loaded:
        return await keyword_search_fallback(req)

    embedding_service = get_embedding_service()

    # 1. 编码查询
    query_vec = embedding_service.encode_query(req.query)

    # 2. 向量检索
    results = store.search(
        query_embedding=query_vec,
        top_k=req.top_k,
        city_id=req.city_id,
        category=req.category,
    )

    # 3. 格式化结果
    search_results = [
        SearchResult(
            id=r["id"],
            name=r["name"],
            description=r.get("description"),
            type=r.get("type") or r.get("item_type"),
            city_id=r.get("city_id"),
            similarity=r["similarity"],
            image_url=r.get("image_url") or r.get("thumbnail_url"),
            address=r.get("address"),
        )
        for r in results
    ]

    return SearchResponse(
        results=search_results,
        query=req.query,
        total=len(search_results),
        method="semantic",
    )


@router.post("/keyword", response_model=SearchResponse)
async def keyword_search(req: SearchRequest):
    """关键词搜索 (降级方案)"""
    return await keyword_search_fallback(req)


async def keyword_search_fallback(req: SearchRequest) -> SearchResponse:
    """关键词搜索 fallback"""
    results = await search_locations_keyword(req.query, req.city_id)

    search_results = [
        SearchResult(
            id=r["id"],
            name=r["name"],
            description=r.get("description"),
            type=r.get("type"),
            city_id=r.get("city_id"),
            similarity=1.0,  # 关键词匹配不返回相似度
            image_url=r.get("image_url"),
            address=r.get("address"),
        )
        for r in results[: req.top_k]
    ]

    return SearchResponse(
        results=search_results,
        query=req.query,
        total=len(search_results),
        method="keyword",
    )


@router.get("/health")
async def search_health():
    """搜索服务健康检查"""
    store = get_vector_store()
    return {
        "status": "ok",
        "vector_store_loaded": store.is_loaded,
        "item_count": len(store.items) if store.is_loaded else 0,
    }
