"""推荐 API 路由"""
from fastapi import APIRouter
from app.models.recommend import RecommendRequest, RecommendResponse, RecommendItem
from app.services.recommender import get_recommender
from app.services.vector_store import initialize_vector_store, get_vector_store

router = APIRouter()


@router.post("/feed", response_model=RecommendResponse)
async def get_recommendations(req: RecommendRequest):
    """获取个性化推荐"""
    store = get_vector_store()
    if not store.is_loaded:
        await initialize_vector_store()

    recommender = get_recommender()
    items, strategy = await recommender.recommend(
        user_id=req.user_id,
        scene=req.scene,
        item_id=req.item_id,
        city_id=req.city_id,
        top_k=req.top_k,
    )

    return RecommendResponse(
        items=[
            RecommendItem(
                id=item["id"],
                name=item["name"],
                type=item["type"],
                description=item.get("description"),
                image_url=item.get("image_url"),
                score=item.get("score", 0),
                reason=item.get("reason"),
            )
            for item in items
        ],
        scene=req.scene,
        strategy=strategy,
    )


@router.get("/similar/{item_id}")
async def get_similar(item_id: str, top_k: int = 5):
    """获取相似内容推荐"""
    store = get_vector_store()
    if not store.is_loaded:
        await initialize_vector_store()

    recommender = get_recommender()
    items, strategy = await recommender.recommend(
        user_id=None,
        scene="similar",
        item_id=item_id,
        top_k=top_k,
    )

    return {"items": items, "strategy": strategy}
