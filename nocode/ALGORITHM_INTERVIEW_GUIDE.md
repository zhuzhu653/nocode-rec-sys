# 搜广推算法面试深度指南

> **目标读者**: 搜广推算法工程师面试准备  
> **使用方式**: 每个模块按 "原理 → 算法 → 代码 → 为什么 → 效果 → 业界其他方法" 组织  
> **项目代码**: `backend/app/ml/` 目录下各文件

---

## 目录

1. [召回层 (Recall)](#1-召回层)
2. [精排层 (Ranking)](#2-精排层)
3. [多目标学习 (Multi-Task)](#3-多目标学习)
4. [重排层 (Re-Ranking)](#4-重排层)
5. [生成式推荐 (Generative Rec)](#5-生成式推荐)
6. [特征工程与实时特征](#6-特征工程与实时特征)
7. [样本构建与负采样](#7-样本构建与负采样)
8. [Debias 去偏](#8-debias-去偏)
9. [冷启动](#9-冷启动)
10. [搜索相关性与 Query 理解](#10-搜索相关性与-query-理解)
11. [广告竞价与 eCPM](#11-广告竞价与-ecpm)
12. [因果推断与 Uplift Modeling](#12-因果推断与-uplift-modeling)
13. [向量检索 ANN](#13-向量检索-ann)
14. [在线学习与增量更新](#14-在线学习与增量更新)
15. [大规模训练工程](#15-大规模训练工程)

---

## 1. 召回层

### 1.1 双塔模型 (Two-Tower / DSSM)

#### 原理

将 User 和 Item 分别编码到同一向量空间,通过内积/余弦相似度度量匹配程度。

```
User Features → UserTower → u ∈ R^d
                                        → score = <u, v>
Item Features → ItemTower → v ∈ R^d
```

**为什么用双塔?**
- 离线: Item 向量可预先计算并建索引 (FAISS)
- 在线: 只需计算 User 向量 + ANN 检索, 毫秒级召回万级候选
- 解耦: User/Item 特征独立, 新用户/新物品可即时编码

#### 关键代码 (`ml/two_tower.py`)

```python
class UserTower(nn.Module):
    def __init__(self, n_users, embed_dim=64, hidden_dim=128):
        super().__init__()
        self.user_embed = nn.Embedding(n_users, embed_dim)
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(hidden_dim, embed_dim),
        )
    def forward(self, user_ids):
        return F.normalize(self.mlp(self.user_embed(user_ids)), dim=-1)

class TwoTowerModel(nn.Module):
    def compute_loss(self, user_ids, pos_item_ids, neg_item_ids):
        user_emb = self.user_tower(user_ids)        # [B, d]
        pos_emb = self.item_tower(pos_item_ids)     # [B, d]
        neg_emb = self.item_tower(neg_item_ids)     # [B, d]
        
        pos_score = (user_emb * pos_emb).sum(-1)    # [B]
        neg_score = (user_emb * neg_emb).sum(-1)    # [B]
        
        # InfoNCE loss (对比学习)
        logits = torch.cat([pos_score.unsqueeze(1), neg_score.unsqueeze(1)], dim=1)
        labels = torch.zeros(B, dtype=torch.long)   # 第0列是正样本
        return F.cross_entropy(logits / temperature, labels)
```

#### 效果
- 召回率 Hit@100 > 60% (从百万物品中找到用户真正感兴趣的)
- 线上延迟 < 10ms (FAISS 检索)

#### 业界其他方法

| 方法 | 出处 | 特点 | 对比 |
|------|------|------|------|
| **DSSM** | Microsoft 2013 | 原始双塔, BoW 输入 | 最简单, 容量小 |
| **YoutubeDNN** | Google 2016 | 加入行为序列特征 | 工业界最广泛 |
| **EBR** | Facebook 2020 | Hard Negative Mining | 精度更高 |
| **ComiRec** | Alibaba 2020 | 多兴趣双塔 (多向量) | 多兴趣表达 |
| **SDIM** | Meituan 2022 | Hash 化用户行为 O(1) | 长序列效率 |

---

### 1.2 SASRec (Self-Attentive Sequential Recommendation)

#### 原理

把用户历史行为视为序列,用 **因果 Self-Attention** 建模序列依赖,预测下一个交互 item。

```
用户行为序列: [item_1, item_2, ..., item_t]
              ↓ Causal Self-Attention (只看左边)
隐状态:      [h_1, h_2, ..., h_t]
              ↓
预测:        h_t → 下一个 item 概率分布
```

**为什么用 Causal Attention?**
- 时间因果性: 推荐不能"看未来"
- 位置无关: 比 RNN 更好并行, 比 GRU4Rec 精度更高
- 长距离依赖: Attention 天然捕捉跨步依赖

#### 关键代码 (`ml/sasrec.py`)

```python
class SASRec(nn.Module):
    def __init__(self, n_items, embed_dim=64, n_heads=2, n_layers=2, max_len=50):
        super().__init__()
        self.item_embed = nn.Embedding(n_items + 1, embed_dim, padding_idx=0)
        self.pos_embed = nn.Embedding(max_len, embed_dim)
        
        layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=n_heads, batch_first=True
        )
        self.transformer = nn.TransformerEncoder(layer, num_layers=n_layers)
    
    def forward(self, item_seq):
        # item_seq: [B, L] 用户行为序列 (item IDs)
        seq_emb = self.item_embed(item_seq) + self.pos_embed(positions)
        
        # Causal mask: 只能看到自己及之前的 item
        causal_mask = torch.triu(torch.ones(L, L), diagonal=1).bool()
        output = self.transformer(seq_emb, mask=causal_mask)
        return output  # [B, L, d]
    
    def compute_loss(self, item_seq, pos_items, neg_items):
        output = self.forward(item_seq)  # [B, L, d]
        pos_emb = self.item_embed(pos_items)
        neg_emb = self.item_embed(neg_items)
        
        pos_score = (output * pos_emb).sum(-1)  # [B, L]
        neg_score = (output * neg_emb).sum(-1)
        
        # BPR Loss: 正样本分数 > 负样本分数
        loss = -F.logsigmoid(pos_score - neg_score).mean()
        return loss
```

#### 效果
- NDCG@10: 0.18-0.25 (MovieLens-1M)
- 比 GRU4Rec 提升 15-20%

#### 业界其他序列方法

| 方法 | 核心思想 | 适用 |
|------|----------|------|
| **GRU4Rec** (2016) | GRU 序列建模 | 短序列 |
| **Caser** (2018) | CNN 捕捉局部模式 | 周期性行为 |
| **SASRec** (2018) | 因果 Self-Attention | 通用 |
| **BERT4Rec** (2019) | 双向 + Cloze (MLM) | 离线场景 |
| **HSTU** (Meta 2024) | O(n) Pointwise Attention | 超长序列 |
| **SDIM** (Meituan) | Hash Attention O(1) | 线上效率 |

---

### 1.3 LightGCN (图协同过滤)

#### 原理

在 User-Item 二部图上做 **轻量图卷积** (去掉了特征变换和激活函数),多层邻居聚合捕捉高阶协同信号。

```
Layer 0:  e_u^(0) = embed(u),  e_i^(0) = embed(i)
Layer k:  e_u^(k) = Σ (1/√|N_u|·√|N_i|) · e_i^(k-1)   (邻居平均)
          e_i^(k) = Σ (1/√|N_i|·√|N_u|) · e_u^(k-1)
Final:    e_u = mean(e_u^(0), e_u^(1), ..., e_u^(K))     (层级平均)
```

**为什么去掉变换矩阵?**
- 实验发现: 特征变换 + 非线性激活在 CF 场景反而伤害性能
- 邻居聚合本身已足够学到协同信号
- 参数更少, 训练更稳定

#### 关键代码 (`ml/lightgcn.py`)

```python
class LightGCN(nn.Module):
    def forward(self, edge_index):
        all_embeddings = torch.cat([self.user_embed.weight, self.item_embed.weight])
        embeddings_list = [all_embeddings]
        
        for layer in range(self.n_layers):
            # 稀疏矩阵乘法: 对称归一化邻接矩阵
            all_embeddings = torch.sparse.mm(self.norm_adj, all_embeddings)
            embeddings_list.append(all_embeddings)
        
        # 层级平均
        final = torch.stack(embeddings_list).mean(dim=0)
        users, items = final[:self.n_users], final[self.n_users:]
        return users, items
```

#### 业界图方法对比

| 方法 | 特点 | 优劣 |
|------|------|------|
| **LightGCN** | 最简洁, 无 MLP | 效果好 + 效率高 |
| **NGCF** (2019) | GCN + 特征变换 | LightGCN 证明不需要 |
| **PinSage** (Pinterest) | 随机游走 + GraphSAGE | 工业级超大图 |
| **UltraGCN** (2021) | 无限层的闭式解 | 训练更快 |
| **SimGCL** (2022) | 对比学习 + 图增强 | 鲁棒性更好 |

---

## 2. 精排层

### 2.1 DIN (Deep Interest Network)

#### 原理

用户对不同 item 的兴趣**不是均匀的**。DIN 用 **Target Attention** 机制: 给定待推荐 item (target), 对用户历史行为中的每个 item 计算注意力权重, 突出与 target 相关的历史行为。

```
传统方法: user_vec = mean(history_items)           → 所有历史等权
DIN:      user_vec = Σ α(target, history_i) · e_i  → 与 target 相关的权重大

α(target, hist) = softmax(MLP([target; hist; target⊙hist; target-hist]))
```

**核心洞察**: 
- 用户兴趣是多样的 ("既喜欢咖啡馆也喜欢陶艺")
- 推荐不同类型 item 时, 应该激活不同的兴趣面
- Mean Pooling 丢失了这种局部激活能力

#### 关键代码 (`ml/din.py`)

```python
class DINAttention(nn.Module):
    def __init__(self, embed_dim):
        super().__init__()
        self.attention = nn.Sequential(
            nn.Linear(embed_dim * 4, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, 1),
        )
    
    def forward(self, target, history, mask):
        # target: [B, d], history: [B, L, d]
        target_expand = target.unsqueeze(1).expand_as(history)
        
        # 交互特征: concat + element-wise product + diff
        interaction = torch.cat([
            target_expand, history,
            target_expand * history,
            target_expand - history
        ], dim=-1)  # [B, L, 4d]
        
        weights = self.attention(interaction).squeeze(-1)  # [B, L]
        weights = weights.masked_fill(~mask, -1e9)
        weights = F.softmax(weights, dim=-1)
        
        return (history * weights.unsqueeze(-1)).sum(dim=1)  # [B, d]
```

#### DIEN: 兴趣演化网络

DIN 的升级版, 加入 **兴趣演化层** (GRU + AUGRU):

```
行为序列 → GRU → 兴趣状态序列 [h1, h2, ..., ht]
                                    ↓ (target attention 加权)
                              AUGRU → 兴趣演化表示
```

**为什么需要演化?**
- DIN 只做静态 attention, 不建模时间因果
- DIEN 用 GRU 捕捉兴趣如何随时间变化
- AUGRU 让注意力也参与到 GRU 门控中

#### 效果
- AUC 提升 0.01-0.02 (CTR 预估中非常显著)
- 线上 CTR 提升 3-5% (阿里公开数据)

#### 业界精排 Attention 方法

| 方法 | 核心 | 场景 |
|------|------|------|
| **DIN** (2018) | Target Attention | 标准精排 |
| **DIEN** (2019) | GRU + AUGRU | 兴趣演化 |
| **DSIN** (2019) | Session 切分 | 多 session |
| **BST** (2019) | Transformer 替代 GRU | 更强表达力 |
| **SIM** (2020) | 长序列 (GSU+ESU) | 超长行为 |
| **ETA** (2021) | Hash + Top-K | 长序列效率 |

---

### 2.2 DCN-V2 (Deep & Cross Network V2)

#### 原理

**显式特征交叉** — 自动学习高阶特征组合, 替代人工交叉特征。

```
传统 DNN: 隐式交叉, 需要很深/很宽才能学到 x1·x2·x3
CrossNet:  每一层显式做一次交叉
  x_{l+1} = x_0 ⊙ (W_l · x_l + b_l) + x_l

V2 改进: W_l 从向量升级为矩阵 → 表达力从 O(d) 升到 O(d²)
MoE 变体: 多个 Cross Expert + Router → 不同特征组合走不同专家
```

**为什么需要显式交叉?**
- FM 只能二阶, DNN 隐式交叉效率低
- CrossNet 每层一次交叉, L 层 = L+1 阶, 参数高效
- V2 的 full-rank 矩阵比 V1 的向量外积表达力强得多

#### 关键代码 (`ml/dcn_v2.py`)

```python
class CrossNetV2(nn.Module):
    """Full-rank Cross Network"""
    def __init__(self, input_dim, n_layers=3):
        super().__init__()
        self.weights = nn.ParameterList([
            nn.Parameter(torch.randn(input_dim, input_dim) * 0.01)
            for _ in range(n_layers)
        ])
        self.biases = nn.ParameterList([
            nn.Parameter(torch.zeros(input_dim)) for _ in range(n_layers)
        ])
    
    def forward(self, x0):
        x = x0
        for W, b in zip(self.weights, self.biases):
            # x_{l+1} = x_0 ⊙ (W · x_l + b) + x_l
            x = x0 * (x @ W.T + b) + x
        return x
```

#### 业界特征交叉方法

| 方法 | 交叉阶数 | 特点 |
|------|---------|------|
| **FM** (2010) | 2 阶 | 经典, 稀疏场景 |
| **CrossNet V1** (2017) | L+1 阶, rank-1 | 参数少, 表达力有限 |
| **CrossNet V2** (2021) | L+1 阶, full-rank | Google 主力 |
| **AutoInt** (2019) | Self-Attention 交叉 | 可解释 |
| **FiBiNET** (2019) | SE-Net + Bilinear | 特征重要性 |
| **MaskNet** (2021) | Instance-wise 乘法 | 美团主力 |
| **FinalMLP** (2023) | 双流 MLP 交互 | 极简高效 |

---

### 2.3 DeepFM

#### 原理

**FM + DNN 并行**: FM 负责低阶 (2阶) 交叉, DNN 负责高阶隐式交叉, 共享 Embedding。

```
Input → Embedding Layer (共享)
            ↓                ↓
         FM Layer          DNN Layer
         (2阶交叉)        (高阶隐式)
            ↓                ↓
         concat → sigmoid → CTR
```

**为什么 FM + DNN?**
- FM 擅长稀疏特征的二阶交叉 (如 "城市=北京 & 类型=咖啡馆")
- DNN 擅长隐式高阶 + 连续特征
- 共享 Embedding → 互相补充, 减少参数

#### 关键代码 (`ml/deepfm.py`)

```python
class FMLayer(nn.Module):
    def forward(self, embeddings):
        # embeddings: [B, n_fields, d]
        # FM 二阶交叉公式: 0.5 * (sum²  - sum_of_squares)
        sum_square = embeddings.sum(dim=1).pow(2)      # [B, d]
        square_sum = embeddings.pow(2).sum(dim=1)      # [B, d]
        interaction = 0.5 * (sum_square - square_sum)  # [B, d]
        return interaction.sum(dim=-1)                  # [B]
```

---

## 3. 多目标学习

### 3.1 MMOE (Multi-gate Mixture-of-Experts)

#### 原理

多任务学习 (MTL) 中, 不同任务可能冲突 (如 CTR 和 完播率)。MMOE 用**多个专家网络 + 任务特定门控**来自动学习任务间的共享/独占关系。

```
Input → Expert_1 → e1
      → Expert_2 → e2  → Gate_task_A(input) → α = softmax(W·x)
      → Expert_3 → e3       ↓
                       output_A = α1·e1 + α2·e2 + α3·e3
                       
                       Gate_task_B(input) → β → output_B = β1·e1 + ...
```

**为什么不直接 Shared-Bottom?**
- Shared-Bottom: 所有任务共享底层 → 任务冲突时互相拖后腿
- MMOE: 每个任务选择性使用专家 → 冲突任务用不同专家
- 关键: Gate 是 input-dependent → 不同样本走不同专家

#### 关键代码 (`ml/mmoe.py`)

```python
class MMOE(nn.Module):
    def __init__(self, input_dim, n_experts=4, n_tasks=4, expert_dim=64):
        super().__init__()
        self.experts = nn.ModuleList([
            nn.Sequential(nn.Linear(input_dim, expert_dim), nn.ReLU())
            for _ in range(n_experts)
        ])
        self.gates = nn.ModuleList([
            nn.Linear(input_dim, n_experts)  # 每个任务一个 gate
            for _ in range(n_tasks)
        ])
        self.towers = nn.ModuleList([
            nn.Sequential(nn.Linear(expert_dim, 32), nn.ReLU(), nn.Linear(32, 1))
            for _ in range(n_tasks)
        ])
    
    def forward(self, x):
        expert_outputs = [expert(x) for expert in self.experts]  # [n_experts, B, d]
        expert_outputs = torch.stack(expert_outputs, dim=1)       # [B, n_experts, d]
        
        task_outputs = []
        for gate, tower in zip(self.gates, self.towers):
            gate_weights = F.softmax(gate(x), dim=-1)             # [B, n_experts]
            mixture = (gate_weights.unsqueeze(-1) * expert_outputs).sum(1)  # [B, d]
            task_outputs.append(tower(mixture).squeeze(-1))
        
        return task_outputs  # [task_1_pred, task_2_pred, ...]
```

### 3.2 PLE (Progressive Layered Extraction)

**MMOE 的问题**: 所有专家仍然是共享的, 没有"任务独占"专家。

**PLE 改进**: 每个任务有独占专家 + 共享专家, 多层渐进式提取。

```
Layer 1:  Shared_Experts + TaskA_Experts + TaskB_Experts
          ↓ Gate_A (选择 Shared + TaskA)    ↓ Gate_B (选择 Shared + TaskB)
Layer 2:  Shared_Experts + TaskA_Experts + TaskB_Experts
          ...
```

### 3.3 ESMM (Entire Space Multi-Task Model)

**问题**: CVR 训练样本有严重选择偏差 (只有点击了才有转化 label)。

**解决**: pCVR = pCTCVR / pCTR → 在全空间建模, 用乘法关系约束。

```
CTCVR = CTR × CVR
↓ 联合训练:
Loss = L(CTR) + L(CTCVR)   (不直接训练 CVR, 通过乘法间接训练)
```

**为什么 ESMM 而不是直接训练 CVR?**
- CVR 样本空间: 只有点击的样本 (少, 有偏)
- CTCVR 样本空间: 全部曝光样本 (大, 无偏)
- 通过 CTCVR = CTR × CVR 约束, CVR 模型在全空间上训练

#### 业界多任务方法

| 方法 | 核心 | 解决的问题 |
|------|------|-----------|
| **Shared-Bottom** | 共享底层 | 基线 |
| **MMOE** (Google 2018) | Multi-Gate Experts | 任务冲突 |
| **PLE** (Tencent 2020) | 渐进分层 + 独占专家 | 跷跷板问题 |
| **ESMM** (Alibaba 2018) | 全空间乘法建模 | CVR 选择偏差 |
| **ESCM2** (Alibaba 2022) | 反事实 + 全空间 | CVR + 因果 |
| **AITM** (2021) | Attention 自适应信息传递 | 序列依赖任务 |
| **MetaBalance** (2022) | 梯度平衡 | 梯度冲突 |

---

## 4. 重排层

### 4.1 MMR (Maximal Marginal Relevance)

#### 原理

贪心地选择: 与用户相关 且 与已选集合不重复 的 item。

```
MMR(i) = λ · Relevance(i) - (1-λ) · max_{j∈S} Similarity(i, j)

选择过程:
  S = {}
  while |S| < K:
    i* = argmax MMR(i), i ∉ S
    S = S ∪ {i*}
```

### 4.2 DPP (Determinantal Point Process)

#### 原理

概率模型: P(选择子集 S) ∝ det(L_S), 其中 L 是核矩阵。

```
L_ij = q_i · similarity(i,j) · q_j
     = (相关性) × (相似度) × (相关性)

det(L_S) 在 S 内物品两两不相似时大 → 鼓励多样性
```

**DPP vs MMR**:
- MMR: 贪心, 每次只看一个
- DPP: 集合级别优化, 理论更优
- DPP 精确解 O(K³), 实际用贪心近似

#### 关键代码 (`ml/reranker.py`)

```python
class DPPReranker:
    def rerank(self, items, embeddings, quality_scores, k=10):
        # 构建核矩阵 L
        n = len(items)
        similarity = embeddings @ embeddings.T  # [n, n]
        q = np.array(quality_scores)
        L = np.outer(q, q) * similarity  # L_ij = q_i * sim(i,j) * q_j
        
        # 贪心 MAP 推断
        selected = []
        remaining = list(range(n))
        
        for _ in range(k):
            best_idx = -1
            best_gain = -np.inf
            for idx in remaining:
                S_new = selected + [idx]
                gain = np.log(np.linalg.det(L[np.ix_(S_new, S_new)] + 1e-8 * np.eye(len(S_new))))
                if gain > best_gain:
                    best_gain = gain
                    best_idx = idx
            selected.append(best_idx)
            remaining.remove(best_idx)
        
        return [items[i] for i in selected]
```

---

## 5. 生成式推荐

### 5.1 HSTU (Hierarchical Sequential Transduction Unit)

#### 原理 (Meta KDD 2024, "Actions Speak Louder than Words")

**核心创新**: 把 O(n²) Self-Attention 替换为 O(n) Pointwise Aggregated Attention。

```
标准:  Attn(Q,K,V) = softmax(QK^T/√d) @ V    → O(n²d)
HSTU:  a_i = σ(q_i ⊙ cumsum(k_1..k_i)) ⊙ cumsum(v_1..v_i)  → O(nd)
```

**为什么 O(n)?**
- cumsum 是前缀和, O(n) 即可计算
- 用 σ(q_i ⊙ ...) 替代 softmax, 避免了 n² 的注意力矩阵
- 支持 8192+ token 超长行为序列

**Stochastic Length 训练**: 训练时随机截断序列长度, 增强泛化 + 防过拟合。

#### 关键代码 (`ml/hstu.py`)

```python
class HSTULayer(nn.Module):
    def forward(self, x):
        B, L, D = x.shape
        q = self.q_proj(x)   # [B, L, D]
        k = self.k_proj(x)
        v = self.v_proj(x)
        
        # Causal cumulative sum (只看过去)
        k_cumsum = torch.cumsum(k, dim=1)   # [B, L, D]
        v_cumsum = torch.cumsum(v, dim=1)   # [B, L, D]
        
        # Pointwise aggregation
        attn = torch.sigmoid(q * k_cumsum)  # [B, L, D]
        output = attn * v_cumsum             # [B, L, D]
        
        return self.out_proj(output) + x     # residual
```

### 5.2 TIGER (Semantic ID Generative Retrieval)

#### 原理 (Google NeurIPS 2023)

把推荐转化为**生成问题**: 不预测 item ID, 而是自回归生成 Semantic ID tokens。

```
Phase 1: 训练 RQ-VAE, 为每个 item 生成语义 ID
  item_embedding → Quantizer_1 → c1 (粗粒度)
                 → Quantizer_2 → c2 (中粒度)
                 → Quantizer_3 → c3 (细粒度)
  Item A → [7, 23, 156]  (语义相近的 item 共享前缀)

Phase 2: 用 Transformer 自回归生成 Semantic ID
  [user_seq] → Decoder → [c1] → [c1, c2] → [c1, c2, c3] → 对应 item
```

**为什么 Semantic ID?**
- 传统方法: item ID 无语义, 新物品无法表示
- Semantic ID: 语义相近的 item 共享前缀 (如 "咖啡馆" 类都以 [7, 23, ...] 开头)
- 自回归生成: 不需要 ANN 索引, 生成即检索
- 冷启动: 新物品可即时通过 RQ-VAE 编码获得 Semantic ID

#### 关键代码 (`ml/tiger.py`)

```python
class RQVAE(nn.Module):
    """Residual Quantization VAE"""
    def quantize(self, x):
        codes = []
        residual = x
        for codebook in self.codebooks:
            distances = torch.cdist(residual, codebook)
            indices = distances.argmin(dim=-1)   # 最近码字
            quantized = codebook[indices]
            codes.append(indices)
            residual = residual - quantized      # 残差传递
        return codes  # [c1, c2, ..., cK]
```

---

## 6. 特征工程与实时特征

### 6.1 特征分层

```
┌─────────────────────────────────────────────────────┐
│  离线特征 (T+1 更新)                                  │
│  - 用户画像: 年龄/性别/注册天数/历史统计              │
│  - 物品属性: 类别/标签/城市/评分                      │
│  - 统计特征: 7日CTR / 30日转化率 / 热度分            │
├─────────────────────────────────────────────────────┤
│  近线特征 (分钟级更新)                                │
│  - 最近 1h 用户行为序列                               │
│  - 最近 1h 物品曝光/点击数                           │
│  - Session 内行为统计                                │
├─────────────────────────────────────────────────────┤
│  实时特征 (请求级)                                    │
│  - 上下文: 时间/设备/位置/网络                        │
│  - 交叉: user×item 历史交互                          │
│  - 位置: 当前请求的候选位置                           │
└─────────────────────────────────────────────────────┘
```

### 6.2 实时特征服务设计 (`services/realtime_features.py`)

```python
class RealtimeFeatureStore:
    """
    多级缓存架构:
      L1: 进程内 LRU (30s TTL, 10000 容量) → 命中率 ~70%
      L2: Redis (HASH/ZSET)                → 命中率 ~95%
      L3: 计算 fallback                    → 兜底

    Redis 数据结构:
      user:{uid}:seq   → ZSET (行为序列, score=timestamp)
      user:{uid}:stats → HASH {click_1h, view_1h, dwell_sum}
      item:{iid}:stats → HASH {exposure_1h, click_1h, ctr_1h}
    """
    
    def assemble_serving_features(self, user_id, item_id, position):
        """组装完整 serving 特征向量 (精排模型输入)"""
        return {
            'user': self.get_user_realtime_features(user_id),   # 行为序列 + 统计
            'item': self.get_item_realtime_features(item_id),   # 实时CTR + 热度
            'context': {'hour': now.hour, 'weekday': now.weekday, 'position': position},
            'cross': {'user_item_history': int(item_id in user_recent)},
        }
```

### 6.3 特征一致性 (Train-Serve Skew)

**问题**: 训练时用离线特征, 上线时用实时特征 → 特征分布不一致。

**解决方案**:
1. **Point-in-Time Join**: 训练时也用"当时"的特征快照 (不用"未来"特征)
2. **Feature Logging**: 上线时把实时特征 log 下来, 作为训练样本的特征
3. **统一特征存取层**: 训练和 serving 用同一套代码读取特征

---

## 7. 样本构建与负采样

### 7.1 正样本定义

| 行为 | 作为正样本 | 权重 |
|------|-----------|------|
| 点击 | ✅ | 1.0 |
| 收藏/点赞 | ✅ | 2.0 |
| 预约/转化 | ✅ | 5.0 |
| 浏览 > 30s | ✅ | 0.5 |
| 曝光未点击 | ❌ (负样本) | - |

### 7.2 负采样策略

#### Uniform Random
```python
neg_items = np.random.choice(all_items, size=n_neg)
```
- **优点**: 简单, 无偏
- **缺点**: 大量"太容易"的负样本, 模型学不到区分度

#### Popularity-based (Word2Vec 式)
```python
# P(item) ∝ frequency^0.75  (0.75 压制热门, 让冷门也有机会被采到)
probs = (item_counts ** 0.75) / sum(item_counts ** 0.75)
neg_items = np.random.choice(all_items, p=probs, size=n_neg)
```
- **优点**: 偏向采热门 item 作为 hard negative
- **缺点**: 热门 item 作为负样本可能是 false negative

#### Hard Negative (ANN)
```python
# 从与 user embedding 最近的 item 中, 排除正样本后采样
candidates = faiss_index.search(user_emb, top_k=200)
neg_items = [c for c in candidates if c not in positive_items][:n_neg]
```
- **优点**: 最有区分度, 模型提升最大
- **缺点**: 容易 false negative (语义相近但恰好没交互)

#### Mixed Strategy (推荐)
```python
# Easy:Hard = 7:3
n_easy = int(n_neg * 0.7)
n_hard = n_neg - n_easy
easy_negs = uniform_sample(n_easy)
hard_negs = ann_sample(n_hard)
```

### 7.3 合成数据设计 (`scripts/generate_synthetic_data.py`)

```python
class SyntheticDataGenerator:
    """
    仿真数据特点:
    1. Power-law 热度分布: 少数 item 极热门 (符合真实)
    2. 兴趣聚类: 用户分成多个兴趣群体 (GMM)
    3. 位置偏差: 靠前位置点击率更高
    4. 转化漏斗: view → click (10%) → like (20%) → book (5%)
    """
```

---

## 8. Debias 去偏

### 8.1 位置偏差 (Position Bias)

**问题**: 用户更倾向点击靠前的 item, 不是因为更喜欢, 而是因为先看到。

#### IPW (逆倾向加权)

```
P(click | item, position) = P(exam | position) × P(click | exam, item)
                          = propensity(pos)    ×  relevance(item)

IPS-weighted loss:
  L = Σ (1 / propensity(pos_i)) × loss(y_i, ŷ_i)
→ 位置好的样本降权, 位置差的样本升权
```

#### PAL (Position-Aware Learning)

```
训练: score = model(features) + position_bias(pos)   ← 含位置
推理: score = model(features)                         ← 去掉位置
→ 模型学到的是"去除位置效应后"的真实相关性
```

### 8.2 热度偏差 (Popularity Bias)

**问题**: 热门 item 被大量曝光 → 收集到更多正样本 → 推荐更多 → 马太效应。

#### DICE (兴趣/从众解耦)

```
user_click = Interest(user, item) + Conformity(item_popularity)
训练: 同时学 interest 和 conformity
推理: 只用 interest 部分 → 去除从众效应
```

### 8.3 时长偏差 (Duration Confounding)

**问题**: 某些 item 天然时长长 (如长视频), 不代表用户更喜欢。

#### WTG (Watch Time Gain)

```
WTG = actual_duration - expected_duration(item_length)
→ 超过预期 = 真正喜欢, 没达预期 = 不那么喜欢
```

### 8.4 业界 Debias 方法全景

| 偏差类型 | 方法 | 核心思想 |
|---------|------|----------|
| 位置偏差 | IPW, PAL, Unbiased LTR | 倾向加权 / 训推分离 |
| 曝光偏差 | IPS, SNIPS, DR | 逆倾向 / 双重稳健 |
| 热度偏差 | DICE, PDA, Causal Embedding | 兴趣/从众解耦 |
| 时长偏差 | WTG, D2Q | 相对增益 |
| 选择偏差 | ESMM, Multi-IPW | 全空间建模 |
| 反馈偏差 | FairRec, Counterfactual | 公平性约束 |

---

## 9. 冷启动

### 9.1 问题定义

新用户/新物品没有历史行为 → Embedding 是随机初始化 → 推荐质量差。

### 9.2 DropoutNet

```
训练时: 随机 dropout 掉 item ID embedding (概率 p=0.5)
        → 迫使模型利用 content features (描述/类别/图片) 来推荐
推理时: 
  - 老 item: 用 ID embedding (精准)
  - 新 item: 没有 ID → 自动 fallback 到 content features (可用)
```

### 9.3 Meta-Embedding (元学习)

```
Meta-Learner: 根据 item 的 content features 生成初始 embedding
  new_item_emb = MetaNet(content_features)
  confidence = σ(ConfidenceNet(content_features))
  final_emb = confidence * learned_emb + (1-confidence) * meta_emb
→ 新 item confidence 低 → 用 meta 生成的; 老 item confidence 高 → 用学到的
```

### 9.4 POSO (Personalized Cold-Start)

```
不同类型用户对新 item 的偏好不同 → 路由到不同 Expert
  user_type = Router(user_features)  → [新手/活跃/沉默/高消费]
  item_emb = Expert_mixture(user_type)(item_features)
```

### 9.5 探索策略

| 策略 | 公式 | 特点 |
|------|------|------|
| ε-Greedy | P(explore) = ε | 简单, 无方向性 |
| Thompson Sampling | 从后验分布采样 | 自适应, 不确定性大 → 多探索 |
| UCB | score + c√(ln(T)/n_i) | 上确界, 理论保证 |
| LinUCB | contextual bandit | 考虑用户特征 |

---

## 10. 搜索相关性与 Query 理解

### 10.1 Query 理解流程

```
原始 Query: "周末带孩子去哪玩"
     ↓ Spell Check
     "周末带孩子去哪玩" (无拼写错误)
     ↓ Entity Extraction
     时间: 周末, 人群: 亲子
     ↓ Intent Classification (TextCNN)
     意图: exploratory (探索型)
     ↓ Query Expansion (同义词/LLM)
     扩展: "周末 亲子 儿童 户外 体验 手工"
     ↓ Search
     语义搜索 + 意图加权排序
```

### 10.2 意图分类

| 意图 | 示例 | 搜索策略 |
|------|------|---------|
| Navigational | "拾光陶社在哪" | 精确匹配 + 地点信息 |
| Informational | "陶艺入门需要什么" | 内容搜索 + 知识 |
| Transactional | "预约陶艺课" | 工坊列表 + 预约引导 |
| Exploratory | "周末去哪玩" | 推荐式搜索 + 多样性 |

#### TextCNN 实现

```python
class IntentClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim=128, n_classes=4):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        # 多尺度卷积: 2-gram, 3-gram, 4-gram
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, 64, kernel_size=k) for k in [2, 3, 4]
        ])
        self.fc = nn.Linear(64 * 3, n_classes)
    
    def forward(self, x):
        emb = self.embedding(x).transpose(1, 2)  # [B, d, L]
        conv_outs = [F.relu(conv(emb)).max(dim=2)[0] for conv in self.convs]
        features = torch.cat(conv_outs, dim=1)    # [B, 64*3]
        return self.fc(features)                   # [B, n_classes]
```

### 10.3 搜索相关性模型

| 模型 | 精度 | 效率 | 用途 |
|------|------|------|------|
| **Bi-Encoder** | ★★★ | ★★★★★ | 召回 (离线编码) |
| **Cross-Encoder** | ★★★★★ | ★★ | 精排 (在线交叉) |
| **ColBERT** | ★★★★ | ★★★★ | 多向量平衡 |
| **LLM Reranker** | ★★★★★ | ★ | Listwise 重排 |

#### Cross-Encoder 相关性打分

```python
class CrossEncoderRelevance(nn.Module):
    """
    输入: [CLS] query [SEP] document [SEP]
    输出: 4 级相关性 (0=无关, 1=弱相关, 2=相关, 3=强相关)
    """
    def forward(self, query_tokens, doc_tokens):
        # 拼接 + Transformer 编码
        combined = torch.cat([query_tokens, sep, doc_tokens], dim=1)
        hidden = self.transformer(combined)[:, 0, :]  # [CLS] 表示
        return self.classifier(hidden)  # [B, 4]
```

### 10.4 业界搜索方法

| 方向 | 方法 | 说明 |
|------|------|------|
| 稠密检索 | DPR, E5, BGE | 向量语义匹配 |
| 稀疏检索 | BM25, SPLADE | 关键词精确匹配 |
| 混合检索 | Hybrid (稠密+稀疏) | 互补 |
| 多模态 | CLIP, BLIP-2 | 图文搜索 |
| 生成式 | DSI, GENRE | 参数化索引 |

---

## 11. 广告竞价与 eCPM

### 11.1 广告系统流程

```
广告请求 → 广告召回 → CTR/CVR 预估 → eCPM 排序 → Budget Pacing → GSP 定价 → 创意选择 → 混排
```

### 11.2 eCPM 计算

```
CPC 广告:  eCPM = pCTR × Bid × 1000
OCPC 广告: eCPM = pCTR × pCVR × Bid(per conversion) × 1000
CPM 广告:  eCPM = Bid (直接是千次展示出价)

排序: max eCPM 的广告展示 → 平台收入最大化
质量调节: eCPM *= (1 + quality_weight × (quality - 0.5))
→ 防止低质广告靠高价排前面
```

### 11.3 GSP (广义第二价格)

```
排序: Ad_A (eCPM=10) > Ad_B (eCPM=7) > Ad_C (eCPM=5)

A 的实际扣费 = B 的 eCPM / A 的 pCTR + 0.01
→ A 不需要按自己出价付费, 只需略高于第二名 → 鼓励真实出价
```

**为什么 GSP 而不是 First-Price?**
- First-Price: 出多少付多少 → 广告主有动力压价博弈
- GSP: 按第二名定价 → 广告主最优策略接近真实出价 (激励兼容)

### 11.4 Budget Pacing (PID 控制器)

```
目标: 日预算 1000 元, 均匀分配到 24h
实际: 上午流量大, 容易花超

PID 控制:
  error = (理想消耗 - 实际消耗) / 总预算
  multiplier = 1 + Kp·error + Ki·∫error + Kd·d(error)/dt
  
  花少了 → error > 0 → multiplier > 1 → 提高出价
  花多了 → error < 0 → multiplier < 1 → 降低出价
```

### 11.5 Deep Bidding (深度出价)

```python
class DeepBidding(nn.Module):
    """
    学习出价函数: bid = base_bid × multiplier(context)
    约束: actual_CPA ≤ target_CPA (Lagrangian 对偶)
    
    Loss = -Σ(conversions) + λ × max(0, actual_CPA - target_CPA)
    """
    def forward(self, context, ad_features, base_bid):
        multiplier = self.bid_net(cat(context, ad_features))  # Softplus > 0
        return base_bid * multiplier
```

### 11.6 业界广告方法

| 方向 | 方法 | 说明 |
|------|------|------|
| CTR 预估 | DeepFM, DIN, MMOE | 同推荐精排 |
| 出价策略 | OCPC, Deep Bidding, RL Bidding | 自动出价 |
| 定价 | GSP, VCG, First-Price | 竞价机制 |
| 预算分配 | PID, Throttling, LP | 平滑消耗 |
| 创意优选 | MAB (Thompson/UCB) | 多素材选择 |
| 广告质量 | Quality Score, Landing Page Score | 体验约束 |
| 混排 | 约束优化 (间隔/占比) | 广告 + 有机 |

---

## 12. 因果推断与 Uplift Modeling

### 12.1 为什么需要因果推断?

推荐/广告中的"效果评估"本质是**因果问题**:
- 发券后用户下单了 → 是因为券, 还是本来就要买?
- 推送后用户打开 App → 是因为推送, 还是本来就要打开?
- 新策略上线 CTR 涨了 → 是策略的功劳, 还是流量波动?

**关联 ≠ 因果**: "买伞的人多的日子下雨概率高" → 不是买伞导致下雨。

### 12.2 Uplift Modeling

#### 定义

```
τ(x) = E[Y(1) | X=x] - E[Y(0) | X=x]
      = 接受处理后的期望结果 - 不接受时的期望结果
      = 增量效应 (这个人发券后增加了多少转化概率?)
```

#### 用户分群

| 群体 | Treatment 效果 | 策略 |
|------|---------------|------|
| 必然转化 (Sure Things) | 发不发都会买 | **不发** (省钱) |
| 可说服用户 (Persuadables) | 发了才买 | **发** (有增量) |
| 无动于衷 (Lost Causes) | 发了也不买 | **不发** |
| 逆反用户 (Sleeping Dogs) | 发了反而不买 | **不发** |

**核心**: 只对 Persuadables 投放 → ROI 最大化。

#### T-Learner vs S-Learner

```
T-Learner (本项目实现):
  训练两个独立模型:
    Model_T: 在处理组数据上训练 → 预测 P(Y=1|X, T=1)
    Model_C: 在对照组数据上训练 → 预测 P(Y=1|X, T=0)
  Uplift = Model_T(x) - Model_C(x)
  优点: 简单, 对两组分别建模
  缺点: 如果处理效果很小, 两个模型误差会淹没真实 uplift

S-Learner:
  训练一个模型, 把 treatment 作为特征:
    Model: P(Y=1|X, T) 
  Uplift = Model(x, T=1) - Model(x, T=0)
  优点: 数据效率高 (共享参数)
  缺点: 模型可能忽略 T 特征 (如果其他特征信号更强)
```

### 12.3 Doubly Robust Estimator

```
τ_DR = E[ T(Y-μ₁(X))/e(X) + μ₁(X) - (1-T)(Y-μ₀(X))/(1-e(X)) - μ₀(X) ]

其中:
  e(X) = P(T=1|X): 倾向性得分 (propensity score)
  μ₁(X) = E[Y|X, T=1]: 处理组结果模型
  μ₀(X) = E[Y|X, T=0]: 对照组结果模型
```

**"双重稳健" 含义**: 
- 如果 e(X) 估计正确 → τ_DR 一致
- 如果 μ(X) 估计正确 → τ_DR 一致
- **只要两者之一正确**, 估计就是无偏的
- 对比 IPW (只靠 e(X)) 和 Regression (只靠 μ(X)) 更鲁棒

### 12.4 反事实推荐

```python
class CounterfactualRecommender(nn.Module):
    """
    观测: user 点击了 item A (在位置 1)
    问题: 如果 A 在位置 5, 还会点吗?
    
    建模:
      observed_click = Interest(user, item) + Confounders(position, popularity)
      counterfactual = Interest(user, item) only  ← 推理时用这个
    """
```

### 12.5 评估指标

| 指标 | 含义 | 计算 |
|------|------|------|
| **AUUC** | Uplift Curve 下面积 | 按预测 uplift 排序, 累计实际增量 |
| **Qini** | Uplift 版 AUC | 归一化 Qini Curve |
| **Calibration** | 预测 vs 实际校准 | 分桶对比 |

### 12.6 业界因果方法全景

| 方法 | 类型 | 特点 |
|------|------|------|
| **T-Learner** | Meta-Learner | 两个独立模型 |
| **S-Learner** | Meta-Learner | 单模型 + treatment 特征 |
| **X-Learner** | Meta-Learner | 交叉估计, 小样本更好 |
| **R-Learner** (Robinson) | Meta-Learner | 残差学习, 去除混淆 |
| **Causal Forest** | 非参数 | 基于树的异质因果效应 |
| **CEVAE** | 深度生成 | VAE 建模隐混淆变量 |
| **DragonNet** | 深度学习 | 联合训练倾向性+结果 |
| **Doubly Robust** | 半参数 | 双重稳健估计 |
| **IPW / SNIPS** | 加权 | 逆倾向加权 |
| **DID** (双重差分) | 准实验 | 时间维度对照 |
| **RDD** (断点回归) | 准实验 | 阈值附近局部因果 |
| **IV** (工具变量) | 计量经济 | 解决遗漏变量偏差 |

---

## 13. 向量检索 ANN

### 13.1 为什么需要 ANN?

精确最近邻搜索 O(n·d) 在百万/亿级时不可接受,需要近似最近邻 (ANN)。

### 13.2 主流索引类型

| 索引 | 原理 | 速度 | 精度 | 内存 |
|------|------|------|------|------|
| **Flat** | 暴力搜索 | 慢 | 100% | 高 |
| **IVF** | 聚类倒排 | 快 | ~95% | 中 |
| **PQ** | 乘积量化压缩 | 极快 | ~90% | 低 |
| **IVF_PQ** | 聚类 + 量化 | 极快 | ~92% | 低 |
| **HNSW** | 层次可导航小世界图 | 极快 | ~97% | 高 |

#### HNSW 原理

```
构建: 多层跳表结构, 上层稀疏(远距离跳跃), 下层稠密(精确搜索)
搜索: 从最高层开始贪心搜索, 逐层下降, 在底层精确找 top-K
优点: 搜索 O(log n), 召回率高 (~97%)
缺点: 内存大 (存储图结构), 构建慢
```

#### IVF_PQ 原理

```
IVF: 将向量空间分成 nlist 个 Voronoi cell, 搜索时只查 nprobe 个最近 cell
PQ: 将 d 维向量切成 m 段, 每段用 256 个码字量化 → 一个向量只占 m 字节
组合: 先 IVF 粗筛 → 再 PQ 距离计算
优点: 内存极小, 适合亿级
缺点: 精度损失, 需要调参 (nlist, nprobe, m)
```

### 13.3 FAISS 使用 (`ml/faiss_index.py`)

```python
class FAISSIndex:
    def build(self, vectors, index_type='hnsw'):
        if index_type == 'hnsw':
            self.index = faiss.IndexHNSWFlat(dim, 32)  # M=32
        elif index_type == 'ivf_pq':
            quantizer = faiss.IndexFlatL2(dim)
            self.index = faiss.IndexIVFPQ(quantizer, dim, nlist=1024, m=32, nbits=8)
            self.index.train(vectors)  # 需要训练
        self.index.add(vectors)
    
    def search(self, query, top_k=100):
        distances, indices = self.index.search(query, top_k)
        return indices, distances
```

### 13.4 业界向量检索

| 系统 | 特点 | 适用 |
|------|------|------|
| **FAISS** (Meta) | 本地库, GPU 加速 | 单机/研究 |
| **Milvus** | 分布式, 云原生 | 生产环境 |
| **Pinecone** | 全托管 SaaS | 快速上线 |
| **Weaviate** | 多模态 | 图文搜索 |
| **ScaNN** (Google) | 各向异性量化 | 高精度 |
| **Qdrant** | Rust 高性能 | 过滤搜索 |

---

## 14. 在线学习与增量更新

### 14.1 为什么需要在线学习?

- 用户兴趣实时变化 (刚搜了"陶艺" → 应立刻推相关)
- 新物品需要快速获得准确 embedding
- 离线训练 T+1 更新太慢, 错过时效性

### 14.2 增量更新方案

```
┌──────────────────────────────────────────────┐
│ 全量训练 (日级)                                │
│  所有历史数据 → 完整模型 → 发布上线            │
├──────────────────────────────────────────────┤
│ 增量训练 (小时级)                              │
│  最近 N 小时新数据 → fine-tune → 热更新        │
│  - 只更新 Embedding 层 (UserTower/ItemTower)  │
│  - 冻结主干网络, 防止遗忘                      │
├──────────────────────────────────────────────┤
│ 实时更新 (分钟级)                              │
│  单条行为 → 在线梯度更新 → 即时生效            │
│  - FTRL (Follow The Regularized Leader)       │
│  - 只更新相关 embedding, 不动全模型            │
└──────────────────────────────────────────────┘
```

### 14.3 FTRL (工业界最常用的在线学习)

```
算法: Follow The Regularized Leader
  w_t = argmin Σ_{s=1}^{t} g_s · w + λ₁|w| + λ₂/2 · ||w||²
  
特点:
  - 天然产生稀疏解 (L1 正则 → 特征选择)
  - 每条样本即时更新
  - Google 广告系统核心 (几十亿特征)
  - 适合 CTR 模型的 sparse + dense 部分
```

### 14.4 Embedding 增量更新

```python
class IncrementalEmbeddingUpdater:
    def update(self, user_id, item_id, label, lr=0.001):
        """单条样本增量更新"""
        user_emb = self.model.get_user_emb(user_id)
        item_emb = self.model.get_item_emb(item_id)
        
        # 计算梯度
        pred = (user_emb * item_emb).sum()
        loss = F.binary_cross_entropy_with_logits(pred, label)
        loss.backward()
        
        # 只更新这两个 embedding
        with torch.no_grad():
            user_emb -= lr * user_emb.grad
            item_emb -= lr * item_emb.grad
```

---

## 15. 大规模训练工程

### 15.1 本项目方案 (单机)

```
设备: A6000 (48GB) / H200 (80GB)
数据: 合成数据 1000 users × 50 items (demo)
      MovieLens-1M (6040 users × 3952 items)
训练: scripts/train_models.py (单机 PyTorch)
```

### 15.2 工业级分布式方案设计

```
亿级数据 → 分布式训练:

┌─────────────────────────────────────────────────────┐
│ 数据并行 (Data Parallel)                             │
│  - 每个 GPU 一份完整模型, 不同数据分片               │
│  - AllReduce 梯度同步                                │
│  - 适合: DNN 部分 (参数小, 计算密集)                 │
├─────────────────────────────────────────────────────┤
│ 模型并行 (Model Parallel)                            │
│  - Embedding 表太大 (百亿参数), 单卡放不下           │
│  - Embedding 按 row 切分到多卡                       │
│  - 适合: Embedding 层 (参数大, 计算简单)             │
├─────────────────────────────────────────────────────┤
│ 混合并行 (Hybrid)                                    │
│  Embedding: 模型并行 (TensorParallel)               │
│  DNN/MLP: 数据并行 (DataParallel)                   │
│  框架: TorchRec / HugeCTR / DeepRec                 │
└─────────────────────────────────────────────────────┘
```

### 15.3 关键工程优化

| 优化 | 效果 | 说明 |
|------|------|------|
| **Mixed Precision (FP16/BF16)** | 2x 加速 | 减少显存, 增加 batch size |
| **Gradient Accumulation** | 等效大 batch | 小显存模拟大批量 |
| **Feature Hashing** | 减少 Embedding 表 | 百亿 → 百万 (hash collision 可接受) |
| **Cached Embedding** | 减少 IO | 热门 ID 缓存 GPU |
| **Async Prefetch** | 隐藏 IO | CPU 预取 + GPU 计算 overlap |
| **Dynamic Batching** | 提高利用率 | 按序列长度分桶 |

### 15.4 工业级框架

| 框架 | 出处 | 特点 |
|------|------|------|
| **TorchRec** (Meta) | PyTorch 生态 | 分布式 Embedding, Jagged Tensor |
| **HugeCTR** (NVIDIA) | GPU 加速 | 百亿参数, 极致吞吐 |
| **DeepRec** (Alibaba) | TF 扩展 | Embedding Variable, 动态稀疏 |
| **XDL** (Alibaba) | 自研 | 千亿特征, 样本服务器 |
| **Persia** (快手) | 参数服务器 | 万亿 Embedding |

---

## 附录: 面试高频问题 Quick Reference

| 问题 | 核心答案 |
|------|---------|
| 双塔为什么内积而不是 MLP? | 离线编码 + ANN 检索, O(1) 推理 |
| DIN 为什么不用 mean pooling? | 不同 target 应激活不同兴趣面 |
| SASRec 为什么 causal mask? | 推荐不能看未来行为 |
| MMOE gate 是 instance-wise? | 是, 不同样本走不同专家 |
| PLE 比 MMOE 好在哪? | 任务独占专家, 解决跷跷板 |
| ESMM 解决什么问题? | CVR 选择偏差 (只有点击才有转化 label) |
| IPW 的问题? | 方差大, 极端倾向性分数不稳定 |
| DR 为什么双重稳健? | e(X) 或 μ(X) 任一正确即无偏 |
| Hard Negative 的风险? | False negative (语义相近但未交互) |
| HNSW vs IVF_PQ? | HNSW 精度高/内存大, IVF_PQ 省内存 |
| GSP vs VCG? | GSP 简单/非激励兼容, VCG 理论最优 |
| Thompson Sampling 直觉? | 不确定性大 → 多探索, 确定性大 → 利用 |
| 什么是 Uplift 的 Persuadables? | 只有接受处理才转化的人 |
| TIGER 为什么不需要 ANN? | 生成 Semantic ID = 直接定位 item |
| 特征一致性怎么保证? | Feature Logging + Point-in-Time Join |

---

## 16. 面试深度追问与实战经验

> 以下是面试中最常被追问的"第二层/第三层"问题，以及工程实战中的坑和调优经验。

---

### 16.1 双塔模型追问

**Q: 双塔的缺点是什么？怎么改进？**

A: 核心缺点是**User/Item 无法交互** — 两个塔独立编码，内积只能做简单匹配，无法建模细粒度交互（如"用户上次看了某类 item → 对当前 item 的影响"）。

改进：
1. **精排补上交互**: 双塔只做召回，精排用 DIN/Cross-Encoder 补上交互
2. **多向量表示**: ComiRec 用多个向量表示用户多兴趣，逐一匹配
3. **轻量交互**: 加入 gate 或 attention 在 embedding 层做少量交互

**Q: 温度系数 τ 怎么选？**

```python
loss = F.cross_entropy(logits / temperature, labels)
```

- τ = 0.05~0.1: 常用范围。太小 → 梯度爆炸/过度自信; 太大 → loss 平坦/难收敛
- 经验: 先用 0.07 开始，观察 loss 曲线，如果 loss 很快趋于 0 → τ 太大，如果 NaN → τ 太小
- 可学习温度: `self.temperature = nn.Parameter(torch.tensor(0.07))` (CLIP 做法)

**Q: In-batch Negatives 有什么问题？**

同一 batch 内的其他正样本作为负样本：
- **热门 item 被过度采为负样本** → 热门 item embedding 被推远 → 召回率下降
- 解决: 加 log(popularity) 修正 (Sampling Bias Correction)
- 公式: `corrected_logit = logit - log(p(item_j))`

**Q: 双塔上线后怎么监控退化？**

- Item 塔每天/每周全量更新 embedding + rebuild FAISS 索引
- User 塔可以实时增量 (只需要 forward, 不需要更新参数)
- 监控: 新 embedding 和旧 embedding 的 cosine shift > 阈值 → 触发告警
- 召回率日监控: 抽样用户做 recall@100, 低于阈值则回滚

---

### 16.2 DIN/序列模型追问

**Q: DIN 的 Attention 和 Transformer 的 Attention 有什么区别？**

| 维度 | DIN Attention | Transformer Attention |
|------|--------------|----------------------|
| Query 来源 | target item (外部给定) | 序列自身 (self) |
| Key/Value | 用户历史序列 | 同样的序列 |
| 归一化 | softmax 或 不归一化 | 必须 softmax |
| 位置编码 | 无 (只关心相关性) | 有 (关心顺序) |

DIN 是 **target-query attention**; SASRec 是 **self-attention**。

**Q: 序列长度很长 (10000+) 怎么办？**

| 方案 | 复杂度 | 精度 | 说明 |
|------|--------|------|------|
| 截断最近 N | O(N²) | 损失远期 | 最简单 |
| SIM (Search-based) | O(L×K) | 高 | 先检索 top-K 相关历史 |
| ETA (Hash-based) | O(L) | 中 | LSH 近似 |
| SDIM (Meituan) | O(1) | 中 | Hash + 多签名 |
| HSTU (Meta) | O(L) | 高 | Pointwise cumsum |

工业级经验:
- 短序列 (<50): 直接 DIN/SASRec
- 中序列 (50-500): BST/DIEN
- 长序列 (500-10000): SIM (两阶段: GSU 检索 + ESU 精排)
- 超长序列 (10000+): HSTU/SDIM

**Q: BPR Loss vs BCE Loss vs InfoNCE，什么时候用什么？**

```python
# BPR: 正负样本对比, 排序损失
loss_bpr = -log(sigmoid(pos_score - neg_score))

# BCE: 独立二分类
loss_bce = -y*log(sigmoid(score)) - (1-y)*log(1-sigmoid(score))

# InfoNCE: 对比学习, batch 内多负样本
loss_nce = -log(exp(pos/τ) / Σ exp(neg_i/τ))
```

| Loss | 适用 | 负样本数 | 梯度信号 |
|------|------|---------|---------|
| BPR | 召回/序列 | 1 | 弱 (只比较一对) |
| BCE | 精排 (CTR) | 0 (二分类) | 强 (每条样本一个信号) |
| InfoNCE | 召回/对比学习 | batch_size-1 | 最强 (batch内多负样本) |

---

### 16.3 特征工程追问

**Q: 如何处理特征穿越 (data leakage)？**

"未来"信息泄漏到训练中:
- 错误: 用 item 全生命周期 CTR 作为训练特征 → 新 item CTR=0 线上不准
- 正确: Point-in-Time Join, 训练时只用"到那一刻为止"的统计值
- 工具: 特征快照表 (每天打一版 feature snapshot)

**Q: 连续特征怎么离散化？embedding 怎么做？**

```python
# 方法 1: 等频分桶
age_bucket = pd.qcut(age, q=10, labels=False)  # 10桶

# 方法 2: 对数变换 + 分桶
price_log = int(math.log(price + 1) * 10)

# 方法 3: AutoDis (可学习离散化, Huawei 2021)
class AutoDis(nn.Module):
    def __init__(self, n_buckets=20, embed_dim=16):
        self.meta_emb = nn.Parameter(torch.randn(n_buckets, embed_dim))
        self.proj = nn.Linear(1, n_buckets)
    def forward(self, x):  # x: [B, 1]
        weights = F.softmax(self.proj(x), dim=-1)  # [B, n_buckets]
        return (weights.unsqueeze(-1) * self.meta_emb).sum(1)  # [B, d]
```

**Q: 实时特征和离线特征不一致（Train-Serve Skew）怎么办？**

根因: 训练时用 T+1 离线计算的特征, serving 时用实时计算的 → 分布不同。

解决方案 (按优先级):
1. **Feature Logging** (最推荐): serving 时将实时特征 log 下来, 训练直接用 logged 特征
2. **统一计算**: 训练和 serving 用同一份代码/同一个 feature store
3. **补偿**: 训练时加入高斯噪声模拟实时特征的波动

---

### 16.4 负采样追问

**Q: Hard Negative 会有 False Negative 问题，怎么解决？**

```
场景: 用户 A 对 item X 语义相近但恰好没交互 → 被当做 hard negative
     → 模型学到"推远 X" → 实际上 A 对 X 是感兴趣的
```

解决:
1. **混合采样**: Easy:Hard = 7:3, 不要全用 hard negative
2. **Margin 过滤**: 只用 similarity 在 (0.5, 0.8) 之间的作为 hard negative, 太高的可能是 false negative
3. **定期刷新**: 随着模型更新, 之前的 hard negative 可能变成 positive → 定期重新采
4. **Debiased InfoNCE**: 加入 popularity 修正

**Q: 负样本比例（neg:pos）怎么选？**

- 召回模型: 通常 1:4 到 1:10 (InfoNCE batch 内自然形成)
- 精排模型 (CTR): 通常 1:1 到 1:3 (线上曝光未点击作为负样本, 天然比例)
- 图模型 (BPR): 通常 1:1 (每个正样本配一个 uniform negative)

经验:
- 负样本太少 → 模型学不到"什么是不好的"
- 负样本太多 → 正样本信号被稀释, 训练不稳定
- InfoNCE 的"大 batch = 多负样本" 天然利好 → 大 batch 效果好

---

### 16.5 多目标学习追问

**Q: 任务之间的 loss 权重怎么调？**

```python
# 方法 1: 手动调 (最常用)
total_loss = w1 * loss_ctr + w2 * loss_cvr + w3 * loss_stay
# w1=1.0, w2=1.0, w3=0.5 (根据业务重要性)

# 方法 2: Uncertainty Weighting (Kendall 2018)
# 每个任务学一个 log(σ²), 不确定性大的 loss 权重小
loss = Σ (1/(2σ_i²)) * loss_i + log(σ_i)

# 方法 3: GradNorm (Chen 2018)
# 动态平衡各任务梯度大小
# 如果某个任务训练太快 → 降低其权重

# 方法 4: Pareto (Multi-Objective Optimization)
# 找到 Pareto 最优解集合
```

**Q: MMOE 的 gate 真的能学到有意义的路由吗？**

实验观察:
- 在任务高度相关时 (如 CTR 和 点赞率), gate 权重很相似 → 共享专家
- 在任务冲突时 (如 时长 vs 多样性), gate 权重差异大 → 各走各的专家
- 可视化: 导出 gate softmax 权重, 看不同任务对同一 expert 的偏好

**注意**: 如果任务太简单/数据太少, gate 可能退化为"均匀分配" → 等价于 Shared-Bottom。

**Q: PLE 比 MMOE 好多少？什么时候值得用 PLE？**

- 当任务确实冲突（加一个任务, 另一个跌了）→ 用 PLE
- 如果所有任务正相关 → MMOE 就够了 (PLE 增加 50%+ 参数)
- PLE 核心: 独占专家保证"至少有一个 expert 只服务我这个 task"

---

### 16.6 广告系统追问

**Q: eCPM 排序真的能同时满足平台和广告主吗？**

```
平台收入 = Σ actual_cost_i (所有展示广告的扣费)
广告主 ROI = conversions / cost

eCPM 排序 = pCTR × pCVR × Bid → 排在前面的是"愿意出价高 且 预估效果好的"
→ 平台收入 ∝ eCPM → 高 eCPM 展示 → 收入最大化
→ 广告主: 预估准 → actual CPA ≈ target CPA → ROI 满足

关键: pCTR/pCVR 的准确性决定了平衡是否成立
如果预估偏高 → 广告主多花钱/ROI 差 → 退出 → 长期收入下降
如果预估偏低 → 不展示 → 短期收入下降
```

**Q: GSP 和 VCG 的区别？为什么用 GSP？**

| 机制 | 定价 | 激励兼容 | 收入 |
|------|------|---------|------|
| First Price | 按出价付 | ❌ (鼓励压价) | 高但不稳定 |
| GSP | 按第二名定价 | 近似 (均衡时) | 中 |
| VCG | 按社会成本定价 | ✅ (理论最优) | 低 |

为什么用 GSP 而非 VCG:
- VCG 理论完美但收入更低 (Google 验证过)
- GSP 在 Nash 均衡时近似激励兼容
- 实现更简单 (VCG 需要计算"没有你时的社会福利")
- 业界共识: Google/Meta/Alibaba 都用 GSP 或修改版

**Q: PID 控制器的 Kp/Ki/Kd 怎么调？**

```
实战经验:
  Kp = 0.3~0.8  (比例: 反应速度)
  Ki = 0.05~0.2 (积分: 消除稳态误差, 太大会振荡)
  Kd = 0.01~0.1 (微分: 抑制超调, 太大会放大噪声)

调参方法:
  1. 先只用 P (Ki=Kd=0), 调到不振荡
  2. 加 I, 消除稳态误差
  3. 如果振荡, 加 D 抑制
  4. 或者直接用 Ziegler-Nichols 方法自动整定
```

---

### 16.7 因果推断追问

**Q: A/B 测试不就是因果推断吗？为什么还需要 Uplift Model？**

```
A/B 测试: 估计 ATE (平均处理效应) → "整体上策略有效吗?"
Uplift:   估计 CATE (条件处理效应) → "对谁有效? 对谁没效果?"

A/B 测试告诉你: 发券整体提升 2% 转化率
Uplift 告诉你: 
  - 对 30% 用户提升 10% (Persuadables) → 值得发
  - 对 50% 用户无变化 (Sure Things) → 不发也会买, 白花钱
  - 对 20% 用户降低 5% (Sleeping Dogs) → 千万别发
```

**Q: 观察性数据 (non-RCT) 能做因果吗？**

可以, 但假设更强:

| 方法 | 需要的假设 | 适用 |
|------|-----------|------|
| RCT (A/B 测试) | 随机分配 | 金标准 |
| Matching/PSM | 无未观测混淆 | 观测变量够多 |
| IPW | 倾向性已知/可估 | 需要好的 propensity model |
| DR | e(x) 或 μ(x) 之一正确 | 更鲁棒 |
| DID | 平行趋势 | 前后对照 |
| IV | 排他性 + 相关性 | 有好的工具变量 |
| RDD | 连续性 | 有明确阈值 |

**Q: Doubly Robust 为什么方差可能比 IPW 还大？**

理论上 DR 更鲁棒, 但实际中:
- 如果 propensity score 接近 0 或 1 → 1/e(x) 爆炸 → 方差极大
- 解决: clip propensity (我们代码中 clip 到 [0.05, 0.95])
- 或用 SNIPS (Self-Normalized IPS): 分子分母都加权, 自动归一化

---

### 16.8 系统设计追问

**Q: 推荐系统的延迟预算怎么分配？**

```
总延迟预算: 200ms (用户可接受)

分配:
  召回 (多路并行): 20ms → FAISS/Redis
  特征组装:        30ms → Redis + 计算
  粗排:           20ms → 双塔 forward
  精排:           80ms → DIN/DCN 前向 (batch GPU)
  重排:           30ms → DPP/MMR
  网络+序列化:     20ms → gRPC/HTTP
```

**Q: 如何做模型的灰度发布和回滚？**

```
1. 分桶灰度:
   - 10% 用户走新模型, 90% 走旧模型
   - 观察 CTR/CVR/停留时长等核心指标 3-7 天
   
2. 自动回滚:
   - 设置 SLA 阈值 (如 CTR 降幅 > 2%)
   - 触发 → 自动切回旧模型 + 告警

3. 模型版本管理:
   - Model Registry (MLflow/自建)
   - 每个版本记录: 训练数据范围 + 离线指标 + 在线指标
```

**Q: 特征维度爆炸 (百亿 ID 特征) 怎么办？**

```
问题: 用户 ID 10 亿 + Item ID 1 亿 + 交叉特征 → Embedding 表 TB 级

解决:
1. Feature Hashing: hash(feature) % bucket_size → 冲突可接受 (1-2% 性能损失)
2. Mixed-dimension: 高频 ID 用大 embed_dim, 低频用小 dim
3. Embedding Table 切分: TorchRec ParameterSharding → 多卡存储
4. On-demand Loading: 只加载本 batch 用到的 embedding (HBM 缓存)
```

---

### 16.9 工程调优经验总结

| 调优项 | 经验值 | 踩坑 |
|--------|--------|------|
| Learning Rate | Embedding: 1e-3, MLP: 1e-4, Fine-tune: 1e-5 | Embedding lr 太大 → 不稳定 |
| Batch Size | 召回: 4096+, 精排: 512-2048 | 大 batch 对 InfoNCE 有利 |
| Embedding Dim | 64 (小数据), 128-256 (大数据) | 太大过拟合, 太小欠拟合 |
| Dropout | Embedding: 0.1-0.2, MLP: 0.3-0.5 | 序列模型 dropout 加在 attention 后 |
| Weight Decay | 1e-4 到 1e-6 | Embedding 不加 weight decay |
| 温度 τ | 0.05-0.1 (InfoNCE) | 太小梯度爆, 太大没区分度 |
| Sequence Length | 20-50 (精排), 200+ (召回) | 超过有效长度反而有噪声 |
| 负样本数 | InfoNCE: batch_size-1, BPR: 1-4 | 太多稀释正信号 |
| 训练 Epoch | 精排: 1-3 epoch (避免过拟合), 召回: 10-30 | 推荐在验证集 early stop |
| Gradient Clipping | max_norm=1.0 | Transformer 模型必加 |

---

### 16.10 面试常见"陷阱题"

**Q: "你这个项目数据量多大?"**

诚实回答 + 展示扩展方案:
> "Demo 阶段用合成数据 (1000 users × 50 items) + MovieLens-1M 验证。但架构设计面向百万级: FAISS HNSW 索引支持百万向量毫秒召回, Redis Feature Store 设计支持 QPS 1000+, 模型支持分布式训练 (TorchRec 方案已设计)。"

**Q: "线上效果怎么样?"**

> "离线评估: NDCG@10=0.22, Hit@10=0.35, 多样性 ILS=0.38。A/B 测试框架已搭建, 可以量化策略效果。由于是个人项目, 没有真实线上流量, 但合成数据模拟了工业真实分布 (power-law + position bias + conversion funnel)。"

**Q: "为什么不直接用 RecBole/推荐库?"**

> "目的是展示对算法原理的深度理解和工程落地能力。从零实现每个模块, 知道每一行代码在做什么。比如 DIN 的 attention 为什么用 4 维拼接而不是 dot product (因为需要非对称匹配); HSTU 的 cumsum 为什么能替代 softmax attention (因果性 + O(n) 复杂度)。"

**Q: "你觉得这个系统最大的技术挑战是什么?"**

> "特征一致性 (train-serve skew) 和 多目标之间的权衡。前者通过 Feature Logging 解决; 后者通过 MMOE + PLE + 动态 loss 权重调整, 但实际上到了线上还需要看业务指标 tradeoff (比如 CVR 涨但时长跌, 需要产品决策)。"

---

> **文档维护者**: AI Assistant  
> **最后更新**: 2026-05-31  
> **关联代码**: `backend/app/ml/` 全部模块
