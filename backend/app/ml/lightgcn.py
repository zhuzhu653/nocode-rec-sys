"""
LightGCN - 图神经网络推荐
- 用途: 协同过滤召回
- 原理: 在 User-Item 二部图上做轻量图卷积, 学习高阶协同信号
- 论文: LightGCN: Simplifying and Powering GCN for Recommendation (He et al., SIGIR 2020)
- 工业应用: Pinterest PinSage 系列, 美团图推荐

核心创新:
  - 去掉 GCN 中的特征变换和非线性激活 (实验证明对 CF 有害)
  - 只保留邻域聚合 (neighborhood aggregation)
  - 最终表示 = 各层输出的加权和 (Layer Combination)

e_u^(k+1) = sum_{i∈N_u} (1/√|N_u|√|N_i|) * e_i^(k)
e_u = sum_{k=0}^K α_k * e_u^(k)
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_sparse import SparseTensor
import numpy as np


class LightGCN(nn.Module):
    """
    LightGCN 推荐模型
    
    训练:
      - BPR Loss: max(0, -log(σ(y_ui - y_uj)))
      - 正样本: 用户交互过的 item
      - 负样本: 用户未交互的 item (uniform sampling)
    
    推理:
      - 多层传播后, 用户/物品 embedding 内积 → top-K
    """

    def __init__(self, config):
        super().__init__()
        self.num_users = config['num_users']
        self.num_items = config['num_items']
        self.num_layers = config.get('num_layers', 3)
        emb_dim = config.get('emb_dim', 64)

        # 初始 Embedding (可学习)
        self.user_emb = nn.Embedding(self.num_users, emb_dim)
        self.item_emb = nn.Embedding(self.num_items, emb_dim)

        # Layer combination weights (可学习或固定为 1/(K+1))
        self.alpha = nn.Parameter(
            torch.ones(self.num_layers + 1) / (self.num_layers + 1)
        )

        # 初始化
        nn.init.xavier_normal_(self.user_emb.weight)
        nn.init.xavier_normal_(self.item_emb.weight)

        # 图结构 (训练时设置)
        self.norm_adj = None

    def set_graph(self, user_item_edges):
        """
        设置 User-Item 交互图
        Args:
            user_item_edges: list of (user_id, item_id) 交互对
        """
        num_nodes = self.num_users + self.num_items

        # 构建对称归一化邻接矩阵
        rows, cols, values = [], [], []
        user_degree = np.zeros(self.num_users)
        item_degree = np.zeros(self.num_items)

        for u, i in user_item_edges:
            user_degree[u] += 1
            item_degree[i] += 1

        for u, i in user_item_edges:
            norm = 1.0 / np.sqrt(user_degree[u] * item_degree[i])
            # user → item
            rows.append(u)
            cols.append(self.num_users + i)
            values.append(norm)
            # item → user
            rows.append(self.num_users + i)
            cols.append(u)
            values.append(norm)

        indices = torch.tensor([rows, cols], dtype=torch.long)
        values = torch.tensor(values, dtype=torch.float)
        self.norm_adj = torch.sparse_coo_tensor(indices, values, (num_nodes, num_nodes))

    def forward(self):
        """
        多层图卷积, 返回最终的 user/item embedding
        Returns:
            user_emb_final: [num_users, D]
            item_emb_final: [num_items, D]
        """
        # 初始 embedding
        all_emb = torch.cat([self.user_emb.weight, self.item_emb.weight], dim=0)
        emb_list = [all_emb]

        # L 层消息传播
        for _ in range(self.num_layers):
            all_emb = torch.sparse.mm(self.norm_adj.to(all_emb.device), all_emb)
            emb_list.append(all_emb)

        # Layer Combination: weighted sum
        alpha = F.softmax(self.alpha, dim=0)
        all_emb_final = sum(alpha[k] * emb_list[k] for k in range(self.num_layers + 1))

        user_emb_final = all_emb_final[:self.num_users]
        item_emb_final = all_emb_final[self.num_users:]
        return user_emb_final, item_emb_final

    def compute_bpr_loss(self, users, pos_items, neg_items):
        """
        BPR Loss
        Args:
            users: [B] user ids
            pos_items: [B] positive item ids
            neg_items: [B] negative item ids
        """
        user_emb_all, item_emb_all = self.forward()

        user_emb = user_emb_all[users]
        pos_emb = item_emb_all[pos_items]
        neg_emb = item_emb_all[neg_items]

        pos_score = (user_emb * pos_emb).sum(dim=-1)
        neg_score = (user_emb * neg_emb).sum(dim=-1)

        bpr_loss = -torch.log(torch.sigmoid(pos_score - neg_score) + 1e-8).mean()

        # L2 正则
        reg_loss = (
            self.user_emb(users).norm(2).pow(2) +
            self.item_emb(pos_items).norm(2).pow(2) +
            self.item_emb(neg_items).norm(2).pow(2)
        ) / users.size(0)

        return bpr_loss + 1e-4 * reg_loss

    @torch.no_grad()
    def get_user_embedding(self, user_ids):
        """推理: 获取用户 embedding"""
        user_emb_all, _ = self.forward()
        return user_emb_all[user_ids]

    @torch.no_grad()
    def get_item_embedding(self, item_ids):
        """推理: 获取物品 embedding"""
        _, item_emb_all = self.forward()
        return item_emb_all[item_ids]

    @torch.no_grad()
    def recommend(self, user_ids, top_k=20, exclude_items=None):
        """
        为用户生成 top-K 推荐
        Args:
            user_ids: [B]
            top_k: 推荐数量
            exclude_items: dict {user_id: set(item_ids)} 需要过滤的已交互 item
        """
        user_emb_all, item_emb_all = self.forward()
        user_emb = user_emb_all[user_ids]  # [B, D]

        # 计算所有 item 的分数
        scores = torch.matmul(user_emb, item_emb_all.T)  # [B, num_items]

        # 过滤已交互 item
        if exclude_items:
            for idx, uid in enumerate(user_ids.tolist()):
                if uid in exclude_items:
                    scores[idx, list(exclude_items[uid])] = -float('inf')

        # Top-K
        top_scores, top_indices = scores.topk(top_k, dim=-1)
        return top_indices, top_scores


LIGHTGCN_CONFIG = {
    'num_users': 10000,
    'num_items': 5000,
    'num_layers': 3,
    'emb_dim': 64,
}
