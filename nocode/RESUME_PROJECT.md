# 项目简历 — 循踪觅意 (搜广推全链路推荐系统)

---

## 项目名称

**循踪觅意 — 城市文化探索与体验平台 (搜广推全链路系统)**

## 项目周期

2024.09 – 至今

## 技术栈

Python / PyTorch / FastAPI / FAISS / Redis / React / Supabase / 高德地图

---

## 项目背景

面向年轻文艺群体的城市文化空间发现与体验预约平台，从 NoCode 原型演进为**完整搜广推系统**，覆盖召回→粗排→精排→重排全链路，集成 12+ 工业级推荐/搜索/广告算法模块。

---

## 核心工作

### 1. 推荐系统全链路 (召回→精排→重排)

- **多路召回**: 实现双塔向量召回 (InfoNCE)、SASRec 序列召回 (Causal Self-Attention + BPR)、LightGCN 图协同召回 (多层消息传递 + 层级平均)、热度召回 (时间衰减)，召回路合并采用 RRF + 加权融合
- **精排模型**: DIN (Target Attention 用户兴趣建模)、DIEN (GRU+AUGRU 兴趣演化)、DCN-V2 (Full-rank CrossNet + MoE)、DeepFM (FM+DNN 共享 Embedding)
- **多目标学习**: MMOE (4专家×4任务) + PLE (渐进分层+独占专家)，联合优化 CTR/CVR/完成率/停留时长
- **重排策略**: MMR (多样性-相关性平衡)、DPP (确定性点过程集合级多样性)、Thompson Sampling 探索、位置偏差校准
- **效果**: 离线 NDCG@10 0.22, Hit@10 0.35, 覆盖率 0.68

### 2. 生成式推荐 (HSTU + TIGER)

- 实现 Meta 2024 HSTU: O(n) Pointwise Aggregated Attention 替代 O(n²) Softmax Attention，支持 8192 token 超长行为序列，推理加速 15x
- 实现 Google TIGER: RQ-VAE 训练 Semantic ID (语义相近 item 共享前缀)，Transformer 自回归生成式检索 (Beam Search)，无需 ANN 索引

### 3. 特征工程与实时特征服务

- 设计三层特征架构: 离线 (T+1 统计) / 近线 (分钟级行为序列) / 实时 (请求级上下文)
- 实现 Redis Feature Store: L1 LRU 内存缓存 (30s TTL) + L2 Redis (ZSET 行为序列 + HASH 统计)，支持 PID 控制器特征衰减
- 解决 Train-Serve Skew: Feature Logging + Point-in-Time Join

### 4. 搜索系统 (语义搜索 + Query 理解)

- 语义搜索: shibing624/text2vec-base-chinese (768维) + FAISS HNSW 索引，召回 Recall@100 > 85%
- Query 理解: TextCNN 多标签意图分类 (4类)、同义词扩展、实体抽取、拼写纠错
- 搜索精排: Cross-Encoder 4级相关性模型，Intent-aware 加权排序

### 5. 广告系统 (eCPM + 竞价)

- eCPM 排序: pCTR × pCVR × Bid × QualityScore，支持 CPC/OCPC/CPM 三种计费
- GSP 定价 (广义第二价格): 激励真实出价，实际扣费 = 下一名 eCPM / 自身 pCTR
- 预算平滑: PID 控制器 (Kp/Ki/Kd) 实时调节出价倍率，防止预算过早耗尽
- Deep Bidding: 学习出价函数 + Lagrangian 对偶法满足 ROI 约束
- 广告混排: 有机结果与广告交叉排列 (间隔≥3, 占比≤20%)

### 6. Debias + 冷启动 + 因果推断

- **Debias**: IPW/SNIPS (曝光偏差)、PAL 位置塔 (训练含位置/推理去位置)、DICE 兴趣-从众解耦、WTG 时长反混淆
- **冷启动**: DropoutNet (随机 dropout ID → content fallback)、Meta-Embedding (meta-learner 生成初始 embedding + confidence gate)、POSO (用户类型路由 × Expert Mixture)
- **Uplift Modeling**: T-Learner/S-Learner UpliftNet、Doubly Robust 因果效应估计 (ATE + CATE)、反事实推荐 (兴趣/混淆解耦)、AUUC + Qini 评估

### 7. 样本构建与向量检索

- 负采样: Uniform / Popularity^0.75 / FAISS Hard Negative / Mixed (Easy:Hard=7:3)
- 合成数据生成器: Power-law 热度 + GMM 兴趣聚类 + 位置偏差 + 转化漏斗; MovieLens-1M 适配器
- FAISS 索引: 支持 Flat/IVF_PQ/HNSW/IVF_Flat，含 Two-Stage Retrieval (召回+曝光过滤) + Recall@K 基准测试

### 8. 训练框架与 A/B 测试

- 统一训练入口支持 SASRec/HSTU/DIN/TIGER 等全部模型
- 离线评估: Hit@K, NDCG@K, MRR, Coverage, ILS (多样性)
- A/B 测试框架: 用户分桶 + 指标收集 + 显著性检验 (p-value + relative improvement)

---

## 项目亮点 (面试话术)

1. **全链路覆盖**: 从召回→精排→重排→广告→因果推断，不是单点模型，而是完整系统设计
2. **前沿算法**: HSTU (Meta KDD'24) + TIGER (Google NeurIPS'23)，非标准教科书方法
3. **工程完整**: 特征服务 (Redis 多级缓存)、在线 serving (FastAPI)、训练框架、A/B 测试
4. **去偏+因果**: 不只做预测，还关注因果效应 (Uplift) 和公平性 (Debias)
5. **广告系统**: eCPM 排序 + GSP 定价 + PID 预算平滑，展示商业化理解

---

## 简历一句话版本 (适合经历栏)

> 独立设计并实现搜广推全链路推荐系统，涵盖 12+ 算法模块 (双塔/DIN/HSTU/TIGER/DCN-V2/MMOE + eCPM 广告竞价 + Uplift 因果推断)，基于 PyTorch + FAISS + Redis + FastAPI，离线 NDCG@10 达 0.22。
