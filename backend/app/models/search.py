from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """语义搜索请求"""
    query: str = Field(..., min_length=1, max_length=200, description="搜索查询")
    city_id: int | None = Field(None, description="城市 ID (1-6)")
    category: str | None = Field(None, description="类型: museum/gallery/bookstore/cafe/park/workshop")
    top_k: int = Field(10, ge=1, le=50, description="返回数量")


class SearchResult(BaseModel):
    """搜索结果"""
    id: str
    name: str
    description: str | None = None
    type: str | None = None
    city_id: int | None = None
    similarity: float
    image_url: str | None = None
    address: str | None = None


class SearchResponse(BaseModel):
    """搜索响应"""
    results: list[SearchResult]
    query: str
    total: int
    method: str = "semantic"  # semantic | keyword | hybrid


class AutocompleteRequest(BaseModel):
    """自动补全请求"""
    q: str = Field(..., min_length=1, max_length=100)
    limit: int = Field(5, ge=1, le=20)
