# 循踪觅意 — 城市文化探索与搜广推全链路推荐系统

> 基于美团 NoCode 平台搭建的前端 + 自研 Python 搜广推后端

## 项目简介

面向年轻文艺群体的城市文化空间发现与体验预约平台。前端基于**美团 NoCode 低代码平台**快速搭建（React + Vite + Tailwind），后端自研搜广推全链路系统（FastAPI + PyTorch + FAISS）。

## 技术架构

```
┌─ 前端 (NoCode 平台搭建) ────────────────────────────┐
│  React 18 + Vite 5 + Tailwind CSS + 高德地图         │
│  30+ Radix UI 组件 + Framer Motion 动画             │
│  AI 搜索/推荐/广告展示/行为埋点组件                    │
└──────────────────────────────────────────────────────┘
                        ↕ API
┌─ 后端 (自研搜广推系统) ─────────────────────────────┐
│  FastAPI + PyTorch + FAISS + Redis                   │
│  12+ ML 模块: 双塔/DIN/DCN-V2/HSTU/TIGER/...       │
│  搜索/推荐/广告/因果推断 全链路                        │
└──────────────────────────────────────────────────────┘
                        ↕
┌─ 数据层 ────────────────────────────────────────────┐
│  Supabase (PostgreSQL) + Redis (实时特征)             │
└──────────────────────────────────────────────────────┘
```

## 核心算法模块

| 层级 | 模块 | 算法 |
|------|------|------|
| 召回 | 向量/序列/图 | Two-Tower, SASRec, LightGCN, FAISS HNSW |
| 精排 | CTR 预估 | DIN/DIEN, DCN-V2, DeepFM, HSTU (Meta'24) |
| 多目标 | MTL | MMOE, PLE (4任务) |
| 重排 | 多样性 | MMR, DPP, Thompson Sampling |
| 生成式 | 检索 | TIGER (RQ-VAE Semantic ID, Google'23) |
| 搜索 | 相关性 | Query 理解 + Cross-Encoder |
| 广告 | 竞价 | eCPM + GSP + Budget Pacing (PID) |
| 因果 | Uplift | T-Learner + Doubly Robust |
| 去偏 | Debias | IPW/PAL/DICE/WTG |
| 冷启动 | | DropoutNet, Meta-Embedding, POSO |

## 快速开始

```bash
# 前端
cd nocode
npm install
npm run dev  # → http://localhost:5666

# 后端
cd backend
pip install -r requirements.txt
python -m app.main  # → http://localhost:8000
```

## 文档

- [项目规格说明书](nocode/PROJECT_SPEC.md)
- [算法设计文档](backend/ALGORITHM_DESIGN.md)
- [面试深度指南](nocode/ALGORITHM_INTERVIEW_GUIDE.md) — 15 个模块 × 原理/代码/面试话术
- [项目简历](nocode/RESUME_PROJECT.md)

## License

MIT
