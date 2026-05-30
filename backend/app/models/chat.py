from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="消息角色: user/assistant")
    content: str


class ChatRequest(BaseModel):
    """对话式推荐请求"""
    message: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, description="对话历史")
    user_id: str | None = None
    city_id: int | None = None


class ChatResponse(BaseModel):
    """对话式推荐响应"""
    reply: str
    recommended_items: list[dict] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list, description="引用来源")
