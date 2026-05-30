from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import search, recommend, chat, track

settings = get_settings()

app = FastAPI(
    title="循踪觅意 AI Backend",
    version="1.0.0",
    description="搜索 · 推荐 · 广告 · 对话式推荐 API",
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(recommend.router, prefix="/api/recommend", tags=["Recommend"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(track.router, prefix="/api/track", tags=["Tracking"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "循踪觅意 AI Backend", "version": "1.0.0"}


@app.on_event("startup")
async def startup():
    """初始化 ML 模型和连接"""
    from app.services.embedding import get_embedding_service

    # 预加载 embedding 模型 (首次调用时加载)
    get_embedding_service()
    print("✅ AI Backend started")


@app.on_event("shutdown")
async def shutdown():
    print("🛑 AI Backend shutting down")
