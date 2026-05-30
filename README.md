# 循踪觅意 — 文化体验工坊智能推荐系统

> 搜广推全链路实现：召回 → 粗排 → 精排 → 重排 → 广告融合

🔗 **在线体验**: [https://zhuzhu653.github.io/nocode-rec-sys/](https://zhuzhu653.github.io/nocode-rec-sys/)

## 项目概述

面向文化体验工坊（陶艺/花艺/绘画/烘焙等）的推荐系统，覆盖搜索-广告-推荐全链路。前端使用美团 NoCode 平台快速搭建交互界面，后端实现工业级推荐算法栈。

## 系统架构

```
┌──────────────── 前端 (React + NoCode) ────────────────┐
│  语义搜索 · AI 推荐 Feed · 相似推荐 · 行为追踪         │
└───────────────────────┬───────────────────────────────┘
                        │ REST API
┌───────────────────────▼───────────────────────────────┐
│                   FastAPI Backend                       │
├────────────────────────────────────────────────────────┤
│  Query Understanding │ Multi-Recall │ Rank │ Re-Rank  │
├────────────────────────────────────────────────────────┤
│  Feature Store │ Realtime Features │ FAISS Index       │
└───────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind + Radix UI + 美团 NoCode 平台 |
| 后端 | Python FastAPI + PyTorch + sentence-transformers |
| 向量检索 | FAISS (IVF-PQ / HNSW) |
| 数据 | Supabase (PostgreSQL) + Redis (特征缓存) |

## 推荐算法

### 召回层
- **双塔模型** (Two-Tower): 用户塔 + 物品塔, InfoNCE 对比学习
- **SASRec**: 因果自注意力序列推荐, BPR Loss
- **HSTU**: Meta 2024, O(n) Pointwise Attention
- **LightGCN**: 图卷积协同过滤
- **TIGER**: RQ-VAE 语义 ID + Beam Search 生成式召回

### 精排层
- **DIN**: Target Attention, Dice 激活
- **DCN-V2**: Full-rank Cross Network + MoE
- **DeepFM**: FM 二阶交叉 + DNN 高阶交叉
- **MMOE / PLE**: 多任务学习 (CTR/CVR/完成率/停留)

### 重排层
- **MMR**: 最大边际相关性 (多样性)
- **DPP**: 行列式点过程
- **Position Bias**: 位置偏差校正
- **Exploration**: Thompson Sampling 探索

### 搜索
- **Query Understanding**: 意图分类 (TextCNN) + 查询改写 + Cross-Encoder 相关性
- **Semantic Search**: text2vec-base-chinese (768-dim)

### 广告
- **eCPM Ranking** + GSP 竞价 + Deep Bidding (Lagrangian)
- **Budget Pacing** (PID 控制) + Creative Selection (Thompson Sampling)

### 去偏 & 冷启动
- **IPW/SNIPS** + PAL + DICE + WTG
- **DropoutNet** + Meta-Embedding + POSO

## 实验结果

### Synthetic Data (500 users × 30 items)

| Model | Metric | Value |
|-------|--------|-------|
| SASRec | Hit@10 / NDCG@10 | 0.470 / 0.199 |
| DIN | AUC | 0.672 |
| DCN-V2 | AUC | 0.991 |
| DeepFM | AUC | 0.981 |

### MovieLens-1M (6040 users × 3706 items)

| Model | Metric | Value |
|-------|--------|-------|
| SASRec | Hit@10 (10 epochs) | 0.010 |
| DIN | AUC | 0.678 |

## 快速开始

```bash
# 后端
cd backend
pip install -r requirements.txt
python scripts/generate_synthetic_data.py --mode synthetic
python scripts/run_experiments.py --data synthetic --models sasrec din dcn deepfm --epochs 10

# MovieLens-1M 实验
python scripts/run_experiments.py --data movielens --models sasrec din --epochs 30

# 启动服务
uvicorn app.main:app --reload --port 8000
```

## 项目结构

```
backend/
├── app/
│   ├── ml/                    # 模型实现
│   │   ├── two_tower.py       # 双塔召回
│   │   ├── sasrec.py          # SASRec 序列推荐
│   │   ├── hstu.py            # HSTU (Meta 2024)
│   │   ├── din.py             # DIN + DIEN
│   │   ├── dcn_v2.py          # DCN-V2 (Cross Network)
│   │   ├── deepfm.py          # DeepFM
│   │   ├── mmoe.py            # MMOE + PLE 多任务
│   │   ├── lightgcn.py        # LightGCN
│   │   ├── tiger.py           # TIGER 生成式召回
│   │   ├── reranker.py        # MMR + DPP 重排
│   │   ├── debias.py          # IPW/DICE/WTG 去偏
│   │   ├── cold_start.py      # 冷启动
│   │   ├── faiss_index.py     # FAISS 向量检索
│   │   ├── query_understanding.py  # 查询理解
│   │   ├── ad_bidding.py      # 广告竞价
│   │   └── causal_uplift.py   # 因果推断
│   └── services/
│       ├── recommender.py     # 推荐 Pipeline
│       ├── feature_store.py   # 特征工程
│       └── realtime_features.py  # 实时特征
├── scripts/
│   ├── run_experiments.py     # 实验 Pipeline
│   ├── train_models.py        # 训练框架
│   └── generate_synthetic_data.py  # 数据生成
└── results/                   # 实验结果

nocode/                        # 前端 (NoCode 平台)
├── src/
│   ├── components/            # UI 组件
│   │   ├── AISearchBar.jsx    # 语义搜索
│   │   ├── AIRecommendFeed.jsx # AI 推荐流
│   │   └── AISearchResults.jsx # 搜索结果 + 广告
│   └── services/
│       └── aiBackend.js       # 后端 API 服务
└── vite.config.js
```

## 前端说明

前端使用**美团 NoCode 低代码平台**搭建，结合自定义 React 组件实现 AI 推荐交互：
- 语义搜索栏 + 对话式 AI
- 个性化推荐信息流 (实时行为追踪)
- 搜索结果页 (查询意图可视化 + 广告混排)
- 相似推荐横向滚动卡片

> NoCode 平台私有插件仅在本地开发环境可用；GitHub Pages 部署版使用标准 Vite 构建。
