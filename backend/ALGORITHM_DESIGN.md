# 搜广推算法架构设计（面试级）

> 本项目集成了工业界主流的搜索/广告/推荐算法，覆盖 召回 → 粗排 → 精排 → 重排 全链路。

## 系统总览

```
┌─────────────────────────────────────────────────────────────┐
│                        前端请求                              │
├──────────┬──────────┬──────────┬────────────┬───────────────┤
│  AI搜索  │ 推荐Feed │ 相似推荐  │  对话推荐  │   行为上报     │
└────┬─────┴────┬─────┴────┬─────┴─────┬──────┴───────┬───────┘
     │          │          │           │              │
     ▼          ▼          ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (FastAPI)                     │
├─────────────────────────────────────────────────────────────┤
│                     Feature Service                           │
│  (用户特征/物品特征/上下文特征 实时组装)                       │
├──────────────────────┬──────────────────────────────────────┤
│      搜索链路         │            推荐链路                    │
│                      │                                        │
│  Query Understanding │  Multi-Recall (多路召回)               │
│  ├─ Intent Classify  │  ├─ Embedding Recall (双塔/DSSM)      │
│  ├─ Query Expansion  │  ├─ User-CF Recall                    │
│  └─ Entity Linking   │  ├─ Item-CF Recall                    │
│                      │  ├─ Sequential Recall (SASRec)        │
│  Dense Retrieval     │  ├─ Hot/Trending Recall               │
│  ├─ Bi-Encoder       │  └─ GNN Recall (LightGCN)            │
│  └─ ColBERT          │                                        │
│                      │  Pre-Ranking (粗排)                    │
│  Re-Ranking          │  └─ Two-Tower + 轻量交叉              │
│  ├─ Cross-Encoder    │                                        │
│  └─ LLM Reranker    │  Ranking (精排)                        │
│                      │  ├─ DIN (用户兴趣建模)                 │
│                      │  ├─ DCN-V2 (交叉网络)                 │
│                      │  ├─ DeepFM (特征交互)                  │
│                      │  └─ Multi-Task (MMOE/PLE)             │
│                      │                                        │
│                      │  Re-Ranking (重排)                     │
│                      │  ├─ MMR (多样性)                       │
│                      │  ├─ DPP (确定性点过程)                 │
│                      │  └─ Calibration (校准)                 │
├──────────────────────┴──────────────────────────────────────┤
│                   RAG + LLM 生成式推荐                        │
│  ├─ 对话式推荐 (DeepSeek + RAG)                              │
│  ├─ 推荐理由生成                                             │
│  └─ 生成式候选 (HSTU / OneRec 思路)                          │
├─────────────────────────────────────────────────────────────┤
│                   实时特征 & 行为追踪                          │
│  ├─ 用户行为序列 (click/view/dwell/like/search)              │
│  ├─ 实时点击率估计                                           │
│  └─ Exploration/Exploitation (ε-greedy / Thompson Sampling)  │
└─────────────────────────────────────────────────────────────┘
```

## 核心算法详解

### 1. 搜索链路

| 模块 | 算法 | 论文/出处 | 作用 |
|------|------|-----------|------|
| Query Understanding | BERT Intent Classifier | Google 2019 | 意图识别：地点/工作坊/路线/达人 |
| Query Expansion | LLM Query Rewrite | - | 扩展查询，提高召回率 |
| Dense Retrieval | Bi-Encoder (text2vec) | Sentence-BERT 2019 | 向量化语义匹配 |
| Dense Retrieval | ColBERT | Khattab 2020 | 多向量细粒度匹配 |
| Re-Ranking | Cross-Encoder | Nogueira 2019 | 精确相关性打分 |
| Re-Ranking | LLM Reranker | RankGPT 2023 | LLM listwise 重排 |

### 2. 推荐链路 - 召回层

| 召回路 | 算法 | 论文/出处 | 特点 |
|--------|------|-----------|------|
| 向量召回 | Two-Tower / DSSM | Microsoft 2013 | User/Item 双塔编码 |
| 序列召回 | SASRec | Kang 2018 | Self-Attention 序列推荐 |
| 图召回 | LightGCN | He 2020 | 轻量图卷积协同过滤 |
| 协同过滤 | Swing | Ali 2020 | 图结构相似度 |
| 热度召回 | Time-Decay Hot | - | 时间衰减热度分 |

### 3. 推荐链路 - 精排层

| 模型 | 论文/出处 | 核心思想 | 适用场景 |
|------|-----------|----------|----------|
| **DIN** | Alibaba 2018 | Attention 加权用户历史行为 | 用户兴趣建模 |
| **DIEN** | Alibaba 2019 | GRU + Attention 捕捉兴趣演化 | 序列兴趣演化 |
| **DCN-V2** | Google 2021 | 显式特征交叉网络 | 高阶特征交互 |
| **DeepFM** | Huawei 2017 | FM + DNN 并行 | 稀疏特征建模 |
| **MMOE** | Google 2018 | 多门混合专家 | 多目标优化(CTR+CVR) |
| **PLE** | Tencent 2020 | 渐进分层提取 | 解决任务冲突 |

### 4. 重排层

| 算法 | 作用 | 实现要点 |
|------|------|----------|
| **MMR** | 最大边际相关性 | 平衡相关性与多样性 |
| **DPP** | 确定性点过程 | 集合级别多样性优化 |
| **Calibration** | 分数校准 | Platt Scaling / Isotonic |
| **Position Bias** | 位置偏差消除 | IPW / PAL |

### 5. 生成式推荐（前沿 2024）

| 方法 | 出处 | 核心思想 | 本项目实现 |
|------|------|----------|-----------|
| **HSTU** | Meta KDD 2024 | O(n) Pointwise Aggregated Attention, 异构行为建模 | `ml/hstu.py` ✅ |
| **TIGER** | Google NeurIPS 2023 | RQ-VAE Semantic ID + 自回归生成式检索 | `ml/tiger.py` ✅ |
| **OneRec** | Meta 2024 | 统一生成式推荐 (HSTU backbone) | 基于 HSTU 扩展 |
| **P5** | Geng 2022 | 文本形式统一所有推荐任务 | RAG chat 中实现 |
| **RAG Rec** | 本项目 | 检索增强生成式推荐理由 | `services/rag_chat.py` ✅ |

#### HSTU 核心创新 (Actions Speak Louder than Words)
```
标准 Self-Attention: Attn = softmax(QK^T/√d) @ V    → O(n²d)
HSTU Pointwise:      a_i = σ(q_i ⊙ cumsum(k)) ⊙ cumsum(v) → O(nd)
```
- 推理速度提升 15.2x (vs standard Transformer)
- 支持 8192+ token 超长行为序列
- Stochastic Length 训练: 随机截断序列增强泛化

#### TIGER 核心创新 (Semantic ID Generative Retrieval)
```
Phase 1: Item → RQ-VAE → Semantic ID Tokens [c1, c2, c3]
Phase 2: User Seq → Transformer → Auto-regressive → [c1] → [c1, c2] → [c1, c2, c3]
```
- 不需要 ANN 索引, 生成即检索
- 语义 ID 保留物品语义邻近关系
- 新物品可即时编码 (解决冷启动)

### 6. 实时特征工程

| 模块 | 实现 | 说明 |
|------|------|------|
| **Redis Feature Store** | `services/realtime_features.py` ✅ | L1 LRU + L2 Redis 多级缓存 |
| 用户实时特征 | 行为序列 / session 统计 / 多样性分 | ZSET 存储, 滑动窗口衰减 |
| 物品实时特征 | 实时 CTR / 曝光数 / 热度趋势 | HASH 存储, PID 平滑 |
| 交叉特征 | user×item 历史交互 | 在线组装 serving feature |
| 特征衰减 | 指数衰减 + 滑动窗口 | 定时任务每小时执行 |

#### 特征 serving 流程
```
Request → L1 内存 LRU (30s TTL)
        ↓ miss
       L2 Redis (HASH/ZSET)
        ↓ miss
       计算 fallback (实时聚合)
```

### 7. 样本构建与负采样

| 策略 | 实现 | 说明 |
|------|------|------|
| **Uniform Sampling** | `scripts/generate_synthetic_data.py` ✅ | 均匀随机负采样 |
| **Popularity-based** | 同上 | P(neg) ∝ popularity^0.75 (Word2Vec 式) |
| **Hard Negative (ANN)** | 同上 | FAISS 检索最近但未交互 item |
| **Mixed Strategy** | 同上 | Easy:Hard = 7:3 混合 |
| **合成数据生成** | 同上 | Power-law 热度 + 兴趣聚类 + 位置偏差 + 转化漏斗 |
| **MovieLens 适配** | 同上 | ML-1M → 项目格式转换器 |

### 8. 搜索相关性与 Query 理解

| 模块 | 算法 | 实现 | 说明 |
|------|------|------|------|
| **Query Rewriter** | 同义词扩展 + 拼写纠错 + 实体抽取 | `ml/query_understanding.py` ✅ | 预处理层 |
| **Intent Classifier** | TextCNN 多标签分类 | 同上 | navigational/informational/transactional/exploratory |
| **Cross-Encoder Relevance** | Transformer 交叉编码 4 级相关性 | 同上 | 精排相关性模型 |
| **Search Ranker** | Intent-aware 加权打分 | 同上 | 意图驱动排序框架 |

#### Query 理解流程
```
原始 Query → 拼写纠错 → 实体抽取 → 意图分类 → Query 扩展
     ↓
搜索排序 = α·语义相关性 + β·意图匹配 + γ·实体匹配
```

### 9. 广告竞价与 eCPM

| 模块 | 算法 | 实现 | 说明 |
|------|------|------|------|
| **eCPM Ranker** | pCTR × pCVR × Bid × Quality | `ml/ad_bidding.py` ✅ | 支持 CPC/OCPC/CPM |
| **GSP 定价** | 广义第二价格 | 同上 | 防止虚高出价 |
| **Deep Bidding** | 出价倍率网络 + Lagrangian ROI 约束 | 同上 | 自动出价策略 |
| **Budget Pacing** | PID 控制器 + Throttling | 同上 | 预算平滑消耗 |
| **Creative Selection** | Thompson Sampling (Beta 分布) | 同上 | 多创意最优选择 |
| **广告混排** | 间隔约束 + 占比约束 | 同上 | 自然结果与广告交叉 |

#### 广告 serving 流程
```
候选广告 → 预算过滤 → eCPM 排序 → GSP 定价 → 创意选择 → 混排
              ↑                                    ↑
         BudgetPacing (PID)              Thompson Sampling
```

### 10. 因果推断与 Uplift Modeling

| 模块 | 算法 | 实现 | 说明 |
|------|------|------|------|
| **UpliftNet** | T-Learner / S-Learner | `ml/causal_uplift.py` ✅ | 增量效应预估 τ(x) |
| **Doubly Robust** | DR 估计器 + CATE 分组 | 同上 | 双重稳健因果效应 |
| **Counterfactual Rec** | 兴趣/混淆解耦 | 同上 | 反事实推荐去偏 |
| **CausalEvaluator** | AUUC + Qini Coefficient | 同上 | Uplift 模型评估 |

#### Uplift 公式
```
τ(x) = E[Y(1) - Y(0) | X=x]  (CATE: 个体处理效应)

Doubly Robust:
  τ_DR = E[ T(Y-μ₁)/e + μ₁ - (1-T)(Y-μ₀)/(1-e) - μ₀ ]
  → 只要 e(X) 或 μ(X) 之一正确, 估计就是一致的
```

### 11. Debias 与冷启动

| 模块 | 算法 | 实现 | 说明 |
|------|------|------|------|
| **IPW** | 逆倾向加权 + SNIPS | `ml/debias.py` ✅ | 曝光偏差纠正 |
| **Position-Aware** | Position Tower (PAL) | 同上 | 训练含位置, 推理去位置 |
| **Popularity Debias** | DICE 兴趣/从众解耦 | 同上 | 热度偏差消除 |
| **Duration Deconfound** | Watch Time Gain (WTG) | 同上 | 时长混淆消除 |
| **DropoutNet** | 随机 ID Dropout + 内容特征 | `ml/cold_start.py` ✅ | 冷启动鲁棒 |
| **Meta-Embedding** | Meta-learner 生成初始嵌入 | 同上 | 新物品快速初始化 |
| **POSO** | 用户类型路由 + Expert Mixture | 同上 | 个性化冷启动 |
| **Exploration** | Thompson Sampling / UCB | 同上 | 探索加分 |

### 12. 向量检索

| 模块 | 算法 | 实现 | 说明 |
|------|------|------|------|
| **FAISS Index** | Flat / IVF_PQ / HNSW / IVF_Flat | `ml/faiss_index.py` ✅ | ANN 检索 |
| **Two-Stage Retrieval** | FAISS 召回 + 曝光过滤 | 同上 | 工程化召回 |
| **Benchmark** | Recall@K 测量 | 同上 | 索引质量评估 |

---

## 文件结构

```
backend/
├── app/
│   ├── main.py                 # FastAPI 入口
│   ├── config.py               # 配置
│   ├── routers/
│   │   ├── search.py           # 搜索 API
│   │   ├── recommend.py        # 推荐 API
│   │   ├── chat.py             # 对话推荐 API
│   │   └── track.py            # 行为追踪 API
│   ├── services/
│   │   ├── embedding.py        # Embedding 服务 (text2vec)
│   │   ├── vector_store.py     # 向量检索 (FAISS)
│   │   ├── recommender.py      # 推荐引擎 (多路召回+融合+精排+重排)
│   │   ├── rag_chat.py         # RAG 对话
│   │   ├── database.py         # DB 访问
│   │   ├── feature_store.py    # 特征服务 (实时/离线特征组装)
│   │   └── realtime_features.py # 实时特征 Redis 服务 (L1 LRU + L2 Redis)
│   ├── models/                 # Pydantic 模型
│   └── ml/                     # 机器学习模型 (PyTorch)
│       ├── two_tower.py        # 双塔模型 (DSSM) - 召回/粗排
│       ├── din.py              # DIN + DIEN - 精排 (用户兴趣建模)
│       ├── dcn_v2.py           # DCN-V2 (Mix-of-Experts) - 精排 (特征交叉)
│       ├── deepfm.py           # DeepFM - 精排 (稀疏特征)
│       ├── sasrec.py           # SASRec - 序列推荐
│       ├── lightgcn.py         # LightGCN - 图推荐
│       ├── mmoe.py             # MMOE + PLE - 多任务学习
│       ├── hstu.py             # HSTU (Meta 2024) - 生成式推荐骨干
│       ├── tiger.py            # TIGER (Google 2024) - 语义ID生成式检索
│       ├── reranker.py         # 重排 (MMR/DPP/Thompson Sampling)
│       ├── faiss_index.py      # FAISS 向量检索 (Flat/IVF_PQ/HNSW)
│       ├── debias.py           # Debias (IPW/PAL/DICE/WTG)
│       ├── cold_start.py       # 冷启动 (DropoutNet/MetaEmb/POSO)
│       ├── query_understanding.py # Query 理解 (意图/相关性/重写)
│       ├── ad_bidding.py       # 广告竞价 (eCPM/GSP/Pacing)
│       └── causal_uplift.py    # 因果推断 (Uplift/DR/反事实)
├── scripts/
│   ├── seed_embeddings.py      # 生成向量
│   └── train_models.py         # 统一训练入口 + 离线评估 + A/B 测试框架
└── requirements.txt
```

---

## 训练 & 评估

### 训练命令
```bash
# SASRec 序列推荐
python scripts/train_models.py --model sasrec --epochs 20 --device cuda

# HSTU 生成式推荐 (Meta 2024)
python scripts/train_models.py --model hstu --epochs 30 --device cuda

# DIN 精排
python scripts/train_models.py --model din --epochs 15 --batch_size 512

# TIGER 生成式检索
python scripts/train_models.py --model tiger --epochs 30 --device cuda
```

### 离线评估指标
| 指标 | 含义 | 目标 |
|------|------|------|
| Hit@10 | Top-10 命中率 | > 0.3 |
| NDCG@10 | 归一化折损累积增益 | > 0.2 |
| MRR | 平均倒数排名 | > 0.15 |
| Coverage | 推荐覆盖率 | > 0.6 |
| ILS (Diversity) | 列表内相似度 | < 0.4 |

### A/B 测试
```python
from scripts.train_models import ABTestFramework

ab = ABTestFramework()
ab.create_experiment('hstu_vs_sasrec', {
    'control': sasrec_model,
    'treatment': hstu_model,
})
# 运行后分析
results = ab.analyze('hstu_vs_sasrec', metric_name='ctr')
# {'control': {'mean': 0.05}, 'treatment': {'mean': 0.062}, 
#  'significance': {'p_value': 0.03, 'relative_improvement': 0.24}}
```

---

## 面试要点 (搜广推算法工程师)

### 必答题
1. **召回策略对比**: 向量召回 vs CF vs 图召回 → 各自适用场景和优劣
2. **DIN 核心**: 为什么用 target attention 而不是 mean pooling？
3. **多目标优化**: MMOE 如何解决任务冲突？PLE 的改进点？
4. **样本构造**: 正负样本如何构造？Hard negative 的作用？
5. **特征工程**: 实时特征 vs 离线特征, 如何保证一致性？

### 加分题 (前沿方向)
6. **HSTU vs Transformer**: O(n) vs O(n²), Stochastic Length 的作用
7. **Semantic ID**: TIGER 如何通过 RQ-VAE 实现生成式检索？
8. **位置偏差**: IPW 如何做 debias？PAL 训推不一致设计？
9. **探索与利用**: Thompson Sampling vs ε-Greedy vs UCB
10. **多样性**: MMR vs DPP, 集合级别优化 vs 贪心近似

### 搜索/广告/因果 (高频面试题)
11. **Query 理解**: 意图分类 × 搜索排序如何联动？Cross-Encoder vs Bi-Encoder 精度/效率权衡
12. **负采样**: Uniform vs Popularity vs Hard Negative, 各自偏差和适用场景
13. **广告竞价**: eCPM 排序为什么能同时优化平台收入和广告主 ROI？GSP vs VCG
14. **预算平滑**: PID 控制器在 Budget Pacing 中如何防止预算过早耗尽？
15. **Uplift Modeling**: T-Learner vs S-Learner 优缺点？AUUC 如何评估？
16. **Doubly Robust**: 为什么比 IPW 和直接建模都更鲁棒？
17. **实时特征**: 在线 serving 如何保证特征一致性 (train-serve skew)?
18. **冷启动**: DropoutNet 训练时随机 dropout ID 如何提升泛化？POSO 路由设计？
