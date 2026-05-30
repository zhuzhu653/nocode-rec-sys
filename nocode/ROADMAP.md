# 循踪觅意 — 搜广推 AI 改造实施计划

> **目标**: 将 NoCode 文化探索平台改造为具备 AI 搜索、生成式推荐、广告系统的全栈项目  
> **技术路线**: React 前端 + Python FastAPI 后端 + Supabase 主库 + 向量检索  
> **部署**: Vercel (前端) + 自有 GPU 服务器 (AI 推理)

---

## 一、整体改造架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     前端 (React + Vite)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐     │
│  │ AI 搜索栏 │  │ 推荐Feed │  │ 广告位   │  │ 对话式推荐助手  │     │
│  │ (语义+图) │  │ (个性化) │  │ (原生)   │  │ (ChatBot)     │     │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘     │
└────────┼────────────┼──────────────┼────────────────┼──────────────┘
         │            │              │                │
         ▼            ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  API Gateway (FastAPI)                                │
│  /api/search    /api/recommend    /api/ads     /api/chat             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  Core Services                               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │    │
│  │  │ 向量搜索  │  │ 推荐引擎  │  │ 竞价引擎  │  │  RAG Chat │  │    │
│  │  │ Semantic │  │ RecEngine│  │ AdAuction│  │  LLM+RAG  │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Feature & Profile Layer                          │    │
│  │  用户画像 / 行为序列 / Item Embedding / 实时特征             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────┬───────────────────────────┘
                                           │
┌──────────────────────────────────────────▼───────────────────────────┐
│                         数据层                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Supabase │  │  Redis   │  │  Milvus  │  │   ClickHouse     │    │
│  │ (主库)   │  │  (缓存)  │  │  (向量)  │  │   (行为日志)     │    │
│  │ 用户/内容 │  │ 热门/会话 │  │ Embedding│  │  埋点/曝光/点击  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 二、Phase 1: FastAPI 后端骨架 (Day 1-3)

### 2.1 目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理 (env vars)
│   ├── models/              # Pydantic schemas
│   │   ├── search.py
│   │   ├── recommend.py
│   │   └── user.py
│   ├── routers/             # API 路由
│   │   ├── search.py        # /api/search
│   │   ├── recommend.py     # /api/recommend
│   │   ├── ads.py           # /api/ads
│   │   └── chat.py          # /api/chat
│   ├── services/            # 业务逻辑
│   │   ├── embedding.py     # Embedding 生成
│   │   ├── vector_store.py  # 向量检索
│   │   ├── recommender.py   # 推荐算法
│   │   ├── ad_engine.py     # 广告引擎
│   │   └── rag.py           # RAG 对话
│   ├── ml/                  # ML 模型
│   │   ├── embeddings/
│   │   ├── ranker/
│   │   └── generator/
│   └── utils/
│       ├── supabase.py      # Supabase 连接
│       └── cache.py         # Redis 工具
├── scripts/
│   ├── seed_embeddings.py   # 离线生成 embedding
│   ├── train_ranker.py      # 训练排序模型
│   └── export_behaviors.py  # 导出行为数据
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 2.2 核心依赖

```txt
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.9.0
python-dotenv==1.0.1

# Database
supabase==2.10.0
redis==5.2.0
asyncpg==0.30.0

# ML / AI
sentence-transformers==3.3.0   # Text Embedding
torch==2.5.0
transformers==4.46.0
openai==1.55.0                  # LLM API (GPT/GLM)

# Vector Search
pymilvus==2.4.9                 # Milvus 向量数据库
# 或 pgvector (轻量方案)

# Feature Engineering
numpy==2.1.0
pandas==2.2.0
scikit-learn==1.5.0
```

### 2.3 FastAPI 入口代码

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, recommend, ads, chat

app = FastAPI(
    title="循踪觅意 AI Backend",
    version="1.0.0",
    description="搜索、推荐、广告 API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://your-vercel-domain.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(recommend.router, prefix="/api/recommend", tags=["Recommend"])
app.include_router(ads.router, prefix="/api/ads", tags=["Ads"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "循踪觅意 AI Backend"}
```

---

## 三、Phase 2: AI 语义搜索 (Day 4-10)

### 3.1 搜索架构

```
用户输入 "安静的适合读书的地方"
        │
        ▼
┌──────────────────┐
│  Query Encoder   │  text2vec-base-chinese
│  → 768-dim vec   │
└────────┬─────────┘
         │
    ┌────▼─────┐     ┌────────────┐
    │  ANN 检索 │────→│  Top-50    │  粗排结果
    │  (Milvus) │     └────┬───────┘
    └──────────┘          │
                     ┌────▼───────┐
                     │  Re-Ranker │  精排 (交叉编码器)
                     │  Top-10    │
                     └────┬───────┘
                          │
                     ┌────▼───────┐
                     │ 业务过滤    │  城市/类型/开放状态
                     └────┬───────┘
                          │
                     ┌────▼───────┐
                     │  返回结果   │  + 高亮 + 解释
                     └────────────┘
```

### 3.2 Embedding 生成服务

```python
# app/services/embedding.py
from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer('shibing624/text2vec-base-chinese')
    
    def encode_query(self, text: str) -> np.ndarray:
        """编码用户搜索查询"""
        return self.model.encode(text, normalize_embeddings=True)
    
    def encode_items(self, items: list[dict]) -> list[np.ndarray]:
        """批量编码 Item (地点/工坊/产品)"""
        texts = [self._item_to_text(item) for item in items]
        return self.model.encode(texts, normalize_embeddings=True, batch_size=32)
    
    def _item_to_text(self, item: dict) -> str:
        """将结构化 Item 转为文本描述 (用于 embedding)"""
        parts = [
            item.get('name', ''),
            item.get('description', ''),
            item.get('category', ''),
            ' '.join(item.get('vibe', []) or []),
            item.get('address', ''),
        ]
        return ' '.join(filter(None, parts))
```

### 3.3 向量检索 (轻量方案: pgvector)

```python
# app/services/vector_store.py
from supabase import create_client
import numpy as np

class VectorStore:
    """使用 Supabase + pgvector 的轻量向量检索"""
    
    def __init__(self, supabase_client):
        self.client = supabase_client
    
    async def search(self, query_embedding: list[float], top_k: int = 20, 
                     filters: dict = None) -> list[dict]:
        """
        语义检索 + 过滤
        需要在 Supabase 中:
        1. ALTER TABLE city_locations ADD COLUMN embedding vector(768);
        2. CREATE INDEX ON city_locations USING ivfflat (embedding vector_cosine_ops);
        """
        # RPC 调用 Supabase 存储过程
        params = {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": top_k,
        }
        if filters and filters.get('city_id'):
            params["filter_city_id"] = filters['city_id']
        
        result = self.client.rpc("match_locations", params).execute()
        return result.data
```

```sql
-- Supabase SQL: 创建向量搜索函数
CREATE OR REPLACE FUNCTION match_locations(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 20,
    filter_city_id int DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    type text,
    city_id int,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.id, cl.name, cl.description, cl.type, cl.city_id,
        1 - (cl.embedding <=> query_embedding) as similarity
    FROM city_locations cl
    WHERE (filter_city_id IS NULL OR cl.city_id = filter_city_id)
      AND 1 - (cl.embedding <=> query_embedding) > match_threshold
    ORDER BY cl.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

### 3.4 搜索 API

```python
# app/routers/search.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.services.embedding import EmbeddingService
from app.services.vector_store import VectorStore

router = APIRouter()
embedding_service = EmbeddingService()

class SearchRequest(BaseModel):
    query: str
    city_id: int | None = None
    category: str | None = None
    top_k: int = 10

class SearchResult(BaseModel):
    id: str
    name: str
    description: str
    type: str
    similarity: float
    highlight: str | None = None

@router.post("/semantic")
async def semantic_search(req: SearchRequest) -> list[SearchResult]:
    """AI 语义搜索"""
    # 1. 编码查询
    query_vec = embedding_service.encode_query(req.query)
    
    # 2. 向量检索
    results = await vector_store.search(
        query_embedding=query_vec.tolist(),
        top_k=req.top_k * 2,  # 多召回，后面精排
        filters={"city_id": req.city_id}
    )
    
    # 3. 类型过滤
    if req.category:
        results = [r for r in results if r['type'] == req.category]
    
    # 4. 截取 top_k
    return results[:req.top_k]

@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=1)):
    """搜索自动补全 (前缀匹配 + 热门)"""
    # 从 Redis 缓存热门搜索词
    pass
```

### 3.5 前端对接

```javascript
// src/services/aiSearch.js
const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:8000';

export const semanticSearch = async (query, options = {}) => {
  const response = await fetch(`${AI_BACKEND_URL}/api/search/semantic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      city_id: options.cityId,
      category: options.category,
      top_k: options.topK || 10,
    }),
  });
  return response.json();
};
```

---

## 四、Phase 3: 推荐系统 (Day 11-25)

### 4.1 用户行为埋点

```javascript
// src/services/tracker.js - 前端行为采集
class BehaviorTracker {
  constructor() {
    this.buffer = [];
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  track(event) {
    this.buffer.push({
      ...event,
      user_id: getCurrentUserId(),
      timestamp: Date.now(),
      session_id: getSessionId(),
    });
  }

  // 埋点事件类型
  trackView(itemId, itemType) {
    this.track({ event: 'view', item_id: itemId, item_type: itemType });
  }
  trackClick(itemId, itemType, position) {
    this.track({ event: 'click', item_id: itemId, item_type: itemType, position });
  }
  trackLike(itemId, itemType) {
    this.track({ event: 'like', item_id: itemId, item_type: itemType });
  }
  trackBookmark(itemId, itemType) {
    this.track({ event: 'bookmark', item_id: itemId, item_type: itemType });
  }
  trackSearch(query, resultCount) {
    this.track({ event: 'search', query, result_count: resultCount });
  }
  trackDwell(itemId, itemType, durationMs) {
    this.track({ event: 'dwell', item_id: itemId, item_type: itemType, duration_ms: durationMs });
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];
    await fetch(`${AI_BACKEND_URL}/api/track/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  }
}

export const tracker = new BehaviorTracker();
```

### 4.2 推荐引擎

```python
# app/services/recommender.py
import numpy as np
from typing import Optional

class RecommenderEngine:
    """多路召回 + 融合排序"""
    
    def __init__(self, vector_store, feature_store, ranker):
        self.vector_store = vector_store
        self.feature_store = feature_store
        self.ranker = ranker
    
    async def recommend(self, user_id: str, scene: str, top_k: int = 10) -> list[dict]:
        """
        scene: 'home_feed' | 'similar_items' | 'after_search' | 'you_may_like'
        """
        # 1. 多路召回
        candidates = await self._recall(user_id, scene, top_k * 10)
        
        # 2. 精排
        user_features = await self.feature_store.get_user_features(user_id)
        scored = await self.ranker.rank(candidates, user_features)
        
        # 3. 重排 (多样性 + 去重)
        final = self._rerank(scored, top_k)
        
        return final
    
    async def _recall(self, user_id: str, scene: str, n: int) -> list[dict]:
        """多路召回"""
        results = []
        
        # 路 1: 协同过滤 (看过这个的人还看了)
        cf_results = await self._cf_recall(user_id, n // 3)
        results.extend(cf_results)
        
        # 路 2: 向量召回 (基于用户 embedding)
        user_emb = await self.feature_store.get_user_embedding(user_id)
        if user_emb is not None:
            vec_results = await self.vector_store.search(user_emb, top_k=n // 3)
            results.extend(vec_results)
        
        # 路 3: 热门 + 地理位置
        hot_results = await self._hot_recall(n // 3)
        results.extend(hot_results)
        
        # 去重
        seen = set()
        unique = []
        for item in results:
            if item['id'] not in seen:
                seen.add(item['id'])
                unique.append(item)
        
        return unique
    
    def _rerank(self, scored: list[dict], top_k: int) -> list[dict]:
        """MMR 多样性重排"""
        selected = []
        candidates = scored.copy()
        
        while len(selected) < top_k and candidates:
            if not selected:
                selected.append(candidates.pop(0))
                continue
            
            # MMR: λ * relevance - (1-λ) * max_similarity_to_selected
            best_idx = 0
            best_score = -float('inf')
            lambda_param = 0.7
            
            for i, cand in enumerate(candidates):
                relevance = cand['score']
                max_sim = max(self._sim(cand, s) for s in selected)
                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = i
            
            selected.append(candidates.pop(best_idx))
        
        return selected
```

### 4.3 生成式推荐 (LLM-based)

```python
# app/services/generative_rec.py
from openai import OpenAI

class GenerativeRecommender:
    """基于 LLM 的对话式推荐"""
    
    def __init__(self, llm_client, vector_store):
        self.llm = llm_client
        self.vector_store = vector_store
    
    async def chat_recommend(self, user_message: str, user_context: dict) -> str:
        """对话式推荐"""
        
        # 1. 从用户消息中提取搜索意图
        intent = await self._extract_intent(user_message)
        
        # 2. 检索相关 Item
        relevant_items = await self.vector_store.search(
            self.embedding.encode(intent['query']),
            top_k=5,
            filters=intent.get('filters')
        )
        
        # 3. 构建 RAG prompt
        context = self._format_items_as_context(relevant_items)
        
        system_prompt = """你是"循踪觅意"文化探索平台的 AI 推荐助手。
        根据用户的需求和下面的候选内容，给出个性化的文化体验推荐。
        推荐时要有文艺感，像朋友聊天一样自然。
        每条推荐附上理由，解释为什么适合用户。"""
        
        response = await self.llm.chat.completions.create(
            model="glm-4-flash",  # 或 deepseek-chat
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""
用户画像: {user_context.get('profile_summary', '新用户')}
用户说: {user_message}

可推荐的内容:
{context}

请给出3-5条推荐，每条包含名称、一句话理由、适合场景。
"""}
            ],
            temperature=0.7,
            max_tokens=800,
        )
        
        return response.choices[0].message.content
```

---

## 五、Phase 4: 广告系统 (Day 26-35)

### 5.1 广告数据模型

```sql
-- 广告主
CREATE TABLE advertisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    daily_budget DECIMAL(10,2),
    status TEXT CHECK (status IN ('active', 'paused', 'exhausted')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 广告创意
CREATE TABLE ad_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES advertisers(id),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    landing_url TEXT NOT NULL,
    ad_type TEXT CHECK (ad_type IN ('search', 'feed', 'banner', 'native')),
    target_keywords TEXT[],      -- 搜索广告定向关键词
    target_categories TEXT[],    -- 兴趣定向
    target_cities INTEGER[],     -- 地域定向
    bid_price DECIMAL(10,4),     -- 出价 (CPC)
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 广告展示/点击日志
CREATE TABLE ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id UUID REFERENCES ad_creatives(id),
    user_id UUID,
    event_type TEXT CHECK (event_type IN ('impression', 'click', 'conversion')),
    position INTEGER,
    context JSONB,  -- 搜索词、页面、设备等
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 竞价引擎

```python
# app/services/ad_engine.py
class AdAuctionEngine:
    """简化版 RTB 竞价引擎"""
    
    def __init__(self, ctr_model):
        self.ctr_model = ctr_model
    
    async def get_ads(self, context: dict, ad_slots: int = 1) -> list[dict]:
        """
        context: {
            'user_id': str,
            'page': 'search' | 'feed' | 'detail',
            'query': str (搜索广告),
            'category': str,
            'city_id': int,
        }
        """
        # 1. 广告候选召回 (定向匹配)
        candidates = await self._recall_candidates(context)
        
        if not candidates:
            return []
        
        # 2. CTR 预估
        for ad in candidates:
            ad['predicted_ctr'] = await self.ctr_model.predict(ad, context)
        
        # 3. eCPM 排序 (bid × pCTR × 1000)
        for ad in candidates:
            ad['ecpm'] = ad['bid_price'] * ad['predicted_ctr'] * 1000
        
        candidates.sort(key=lambda x: -x['ecpm'])
        
        # 4. 取 Top-N + 扣费计算 (GSP 二价)
        winners = candidates[:ad_slots]
        for i, winner in enumerate(winners):
            if i + 1 < len(candidates):
                # 二价: 下一位的 eCPM / 自己的 pCTR
                winner['charge_price'] = candidates[i + 1]['ecpm'] / (winner['predicted_ctr'] * 1000)
            else:
                winner['charge_price'] = winner['bid_price'] * 0.01  # 底价
        
        return winners
```

---

## 六、Phase 5: 创意功能 (持续)

### 6.1 AI 文化探索助手 (ChatBot)

在首页/搜索页嵌入对话式 AI：

```
用户: "这周末想和女朋友去南京，有什么文艺的地方推荐吗？"
AI: "南京这座城市藏着不少诗意角落呢 ☺️ 我为你推荐：
     1. 📚 先锋书店五台山总店 — 被誉为'中国最美书店'，地下空间像时光隧道
     2. 🎨 老门东金缮工坊 — 情侣一起修复一件瓷器，残缺之美很浪漫
     3. 🌿 颐和路民国风情区 — 梧桐大道漫步，适合下午慢慢逛
     建议路线：上午先锋书店 → 午餐老门东 → 下午金缮体验 → 傍晚颐和路"
```

### 6.2 AI 文化地图生成

用 Stable Diffusion / DALL-E 为每个城市生成风格化文化地图海报：

```python
async def generate_city_map_poster(city_name: str, style: str = "watercolor"):
    """生成城市文化地图海报"""
    prompt = f"A beautiful {style} style cultural map of {city_name}, China, "
             f"showing famous cultural landmarks, bookstores, art galleries, "
             f"traditional workshops, with warm golden tones, artistic style"
    # 调用 DALL-E / Stable Diffusion API
    ...
```

### 6.3 文化探索成就系统 (Gamification)

```sql
-- 成就定义
CREATE TABLE achievements (
    id UUID PRIMARY KEY,
    name TEXT,           -- '城市漫游者', '手工达人', '社区之星'
    description TEXT,
    icon_url TEXT,
    condition JSONB,     -- {"type": "visit_count", "threshold": 10, "category": "museum"}
    points INTEGER
);

-- 用户成就
CREATE TABLE user_achievements (
    user_id UUID REFERENCES auth.users(id),
    achievement_id UUID REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);
```

### 6.4 技术栈展示亮点

| 创意点 | 技术实现 | 展示效果 |
|--------|---------|---------|
| 语义搜索 | text2vec + pgvector | "安静读书" → 精准返回书店/咖啡馆 |
| 对话推荐 | RAG + GLM-4 | 类 ChatGPT 文化助手 |
| 生成式推荐 | HSTU/OneRec 架构 | 首页千人千面 |
| AI 海报 | DALL-E / SD | 每城独特风格地图 |
| 实时竞价 | GSP 二价拍卖 | 搜索广告系统 |
| 行为序列 | DIN Attention | 用户兴趣建模 |
| 成就系统 | 规则引擎 | 探索积分+徽章 |

---

## 七、具体实施时间线

```
Week 1:  ✅ 项目文档 + 跑通前端 + 搭建 FastAPI 骨架
Week 2:  Embedding 生成 + pgvector 集成 + 语义搜索 API
Week 3:  前端 AI 搜索组件 + 行为埋点 + Redis 缓存
Week 4:  协同过滤 + 向量召回 + 基础推荐 API
Week 5:  精排模型 (DIN/HSTU) + 推荐 Feed 改造
Week 6:  RAG 对话推荐 + ChatBot UI
Week 7:  广告系统 (数据模型 + 竞价引擎)
Week 8:  创意功能 (成就系统 + AI 海报)
Week 9:  A/B 测试框架 + 效果度量
Week 10: 部署优化 + 文档完善 + Demo 视频
```

---

## 八、关键 GitHub 参考

| 项目 | 用途 | 链接 |
|------|------|------|
| MiniOneRec | 生成式推荐 (Meta OneRec 复现) | github.com/AkaliKong/MiniOneRec |
| GenRec | 通用生成式推荐框架 | github.com/Tiny-Snow/GenRec |
| torch-rechub | PyTorch 推荐模型库 (CTR/召回) | github.com/datawhalechina/torch-rechub |
| RecBole | 50+ 推荐算法统一框架 | github.com/RUCAIBox/RecBole |
| LLMRec | LLM + 图增强推荐 | github.com/HKUDS/LLMRec |
| recommenders | 微软推荐最佳实践 | github.com/recommenders-team/recommenders |
| RecSysPapers | 搜广推工业界论文集 | github.com/tangxyw/RecSysPapers |
| TIGER | 生成式检索推荐 (T5+RQ-VAE) | github.com/XiaoLongtaoo/TIGER |
| CARE (WWW'26) | LLM 级联排序推荐 | github.com/Linxyhaha/CARE |
| RQ-VAE-Recommender | 语义 ID 生成式检索 | github.com/EdoardoBotta/RQ-VAE-Recommender |

---

> 下一步：确认方向后，我将开始搭建 FastAPI 后端骨架 + 实现第一个 AI 搜索 MVP。
