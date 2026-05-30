"""对话式推荐 API"""
from fastapi import APIRouter
from app.models.chat import ChatRequest, ChatResponse
from app.services.rag_chat import get_chat_service
from app.services.vector_store import initialize_vector_store, get_vector_store

router = APIRouter()


@router.post("/message", response_model=ChatResponse)
async def chat_recommend(req: ChatRequest):
    """对话式 AI 推荐"""
    store = get_vector_store()
    if not store.is_loaded:
        await initialize_vector_store()

    chat_service = get_chat_service()
    reply, items = await chat_service.chat(
        user_message=req.message,
        history=[msg.model_dump() for msg in req.history],
        user_id=req.user_id,
        city_id=req.city_id,
    )

    return ChatResponse(
        reply=reply,
        recommended_items=[
            {"id": item["id"], "name": item["name"], "type": item.get("type")}
            for item in items
        ],
        sources=[item.get("name", "") for item in items if item.get("name")],
    )
