from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    """推荐请求"""
    user_id: str | None = Field(None, description="用户 ID (匿名用户为空)")
    scene: str = Field("home_feed", description="推荐场景: home_feed/similar/after_search/you_may_like")
    item_id: str | None = Field(None, description="当前 Item ID (用于相似推荐)")
    city_id: int | None = Field(None, description="城市 ID")
    top_k: int = Field(10, ge=1, le=50)


class RecommendItem(BaseModel):
    """推荐结果项"""
    id: str
    name: str
    type: str  # location / workshop / product / post
    description: str | None = None
    image_url: str | None = None
    score: float
    reason: str | None = None  # 推荐理由


class RecommendResponse(BaseModel):
    """推荐响应"""
    items: list[RecommendItem]
    scene: str
    strategy: str  # cf / vector / hot / hybrid
