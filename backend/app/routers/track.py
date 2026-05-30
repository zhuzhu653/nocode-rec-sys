"""行为追踪 API"""
from fastapi import APIRouter
from app.models.track import TrackBatchRequest

router = APIRouter()


@router.post("/events")
async def track_events(req: TrackBatchRequest):
    """批量上报用户行为事件"""
    # MVP: 仅记录日志，后续写入 ClickHouse/数据库
    event_count = len(req.events)

    # TODO: 异步写入行为日志表
    # await database.log_behavior_events([
    #     {**event.model_dump(), "user_id": req.user_id, "session_id": req.session_id}
    #     for event in req.events
    # ])

    return {"status": "ok", "received": event_count}
