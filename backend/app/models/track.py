from pydantic import BaseModel, Field
from typing import Literal


class TrackEvent(BaseModel):
    """用户行为事件"""
    event: Literal["view", "click", "like", "bookmark", "search", "dwell", "purchase"]
    item_id: str | None = None
    item_type: str | None = None  # location / workshop / product / post
    position: int | None = None
    query: str | None = None
    duration_ms: int | None = None
    timestamp: int | None = None


class TrackBatchRequest(BaseModel):
    """批量行为上报"""
    user_id: str | None = None
    session_id: str | None = None
    events: list[TrackEvent] = Field(..., min_length=1, max_length=100)
