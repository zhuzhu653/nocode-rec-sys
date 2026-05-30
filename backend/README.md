# AI Backend

## 快速开始

```bash
# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 LLM API Key

# 4. 生成 Embedding 缓存 (首次)
python -m scripts.seed_embeddings

# 5. 启动服务
uvicorn app.main:app --reload --port 8000
```

## API 文档

启动后访问: http://localhost:8000/docs (Swagger UI)

## 架构

```
app/
├── main.py          # FastAPI 入口
├── config.py        # 配置
├── routers/         # API 路由
│   ├── search.py    # POST /api/search/semantic
│   ├── recommend.py # POST /api/recommend/feed
│   ├── chat.py      # POST /api/chat/message
│   └── track.py     # POST /api/track/events
├── services/        # 业务逻辑
│   ├── embedding.py    # 文本向量化
│   ├── vector_store.py # 向量检索
│   ├── recommender.py  # 推荐引擎
│   ├── rag_chat.py     # RAG 对话
│   └── database.py     # 数据库操作
├── models/          # Pydantic 数据模型
└── scripts/         # 离线脚本
```
