"""
推荐系统训练 Pipeline
支持: Two-Tower / DIN / DCN-V2 / SASRec / HSTU / TIGER

训练流程:
  1. 数据准备: 从 Supabase 拉取行为日志 → 构造训练样本
  2. 特征工程: 组装 user/item/context 特征
  3. 模型训练: 选择模型 → 配置超参 → 训练
  4. 离线评估: Hit@K, NDCG@K, MRR, AUC
  5. 导出模型: 保存 checkpoint + ONNX 导出
"""
import os
import sys
import json
import time
import argparse
import logging
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np

# 添加项目路径
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.two_tower import TwoTowerModel, DEFAULT_CONFIG as TWO_TOWER_CONFIG
from app.ml.din import DIN, DIN_CONFIG
from app.ml.dcn_v2 import DCNV2, DCN_CONFIG
from app.ml.sasrec import SASRec, SASREC_CONFIG
from app.ml.hstu import HSTU, HSTU_CONFIG
from app.ml.tiger import TIGERModel, TIGER_CONFIG

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =================== 数据集定义 ===================

class BehaviorSequenceDataset(Dataset):
    """行为序列数据集 (用于 SASRec / HSTU)"""

    def __init__(self, sequences, max_len=50):
        """
        Args:
            sequences: list of [(item_id, action_type, timestamp), ...]
            max_len: 最大序列长度
        """
        self.sequences = sequences
        self.max_len = max_len

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        seq = self.sequences[idx]

        # 截断
        if len(seq) > self.max_len:
            seq = seq[-self.max_len:]

        # 构造输入/标签
        items = [s[0] for s in seq]
        actions = [s[1] for s in seq]
        times = [s[2] for s in seq]

        # 时间间隔 (log-scaled)
        time_deltas = [0.0]
        for i in range(1, len(times)):
            delta = max(times[i] - times[i-1], 1)
            time_deltas.append(np.log1p(delta))

        # Padding
        pad_len = self.max_len - len(items)
        items = [0] * pad_len + items
        actions = [0] * pad_len + actions
        time_deltas = [0.0] * pad_len + time_deltas

        return {
            'item_seq': torch.tensor(items, dtype=torch.long),
            'action_seq': torch.tensor(actions, dtype=torch.long),
            'time_deltas': torch.tensor(time_deltas, dtype=torch.float),
        }


class CTRDataset(Dataset):
    """CTR 预估数据集 (用于 DIN / DCN-V2 / DeepFM)"""

    def __init__(self, samples):
        """
        Args:
            samples: list of {
                'user_id': int,
                'item_id': int,
                'behavior_items': [int, ...],  # 用户历史
                'category': int,
                'city': int,
                'label': 0/1,  # 是否点击
                'dense_feats': [float, ...],  # 数值特征
            }
        """
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        s = self.samples[idx]
        max_behavior_len = 50

        behavior = s.get('behavior_items', [])
        if len(behavior) > max_behavior_len:
            behavior = behavior[-max_behavior_len:]
        pad_len = max_behavior_len - len(behavior)
        behavior_padded = [0] * pad_len + behavior
        behavior_mask = [0] * pad_len + [1] * len(behavior)

        return {
            'user_id': torch.tensor(s['user_id'], dtype=torch.long),
            'item_id': torch.tensor(s['item_id'], dtype=torch.long),
            'behavior_items': torch.tensor(behavior_padded, dtype=torch.long),
            'behavior_mask': torch.tensor(behavior_mask, dtype=torch.float),
            'category': torch.tensor(s.get('category', 0), dtype=torch.long),
            'city': torch.tensor(s.get('city', 0), dtype=torch.long),
            'dense_feats': torch.tensor(s.get('dense_feats', [0]*5), dtype=torch.float),
            'label': torch.tensor(s['label'], dtype=torch.float),
        }


# =================== 训练器 ===================

class Trainer:
    """通用训练器"""

    def __init__(self, model, config, device='cuda'):
        self.model = model.to(device)
        self.device = device
        self.config = config

        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=config.get('lr', 1e-3),
            weight_decay=config.get('weight_decay', 1e-5),
        )
        self.scheduler = optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer, T_max=config.get('epochs', 20)
        )

        # Checkpoint 目录
        self.ckpt_dir = Path(config.get('ckpt_dir', 'checkpoints'))
        self.ckpt_dir.mkdir(parents=True, exist_ok=True)

        # 训练日志
        self.train_log = []

    def train_epoch(self, dataloader, epoch):
        """训练一个 epoch"""
        self.model.train()
        total_loss = 0
        num_batches = 0

        for batch in dataloader:
            batch = {k: v.to(self.device) for k, v in batch.items()}
            self.optimizer.zero_grad()

            loss = self._compute_loss(batch)
            loss.backward()

            # 梯度裁剪
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        self.scheduler.step()
        avg_loss = total_loss / max(num_batches, 1)
        logger.info(f'Epoch {epoch}: loss={avg_loss:.4f}, lr={self.scheduler.get_last_lr()[0]:.6f}')
        self.train_log.append({'epoch': epoch, 'loss': avg_loss})
        return avg_loss

    def _compute_loss(self, batch):
        """子类覆盖"""
        raise NotImplementedError

    def save_checkpoint(self, epoch, metrics=None):
        """保存 checkpoint"""
        ckpt_path = self.ckpt_dir / f'model_epoch{epoch}.pt'
        state = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'metrics': metrics,
            'config': self.config,
        }
        torch.save(state, ckpt_path)
        logger.info(f'Checkpoint saved: {ckpt_path}')

    def load_checkpoint(self, path):
        """加载 checkpoint"""
        state = torch.load(path, map_location=self.device)
        self.model.load_state_dict(state['model_state_dict'])
        self.optimizer.load_state_dict(state['optimizer_state_dict'])
        logger.info(f'Checkpoint loaded: {path}')
        return state.get('epoch', 0)


class SASRecTrainer(Trainer):
    """SASRec 训练器"""

    def _compute_loss(self, batch):
        item_seq = batch['item_seq']
        # 构造正负样本
        pos_items = item_seq[:, 1:]  # 下一个 item
        input_seq = item_seq[:, :-1]
        # 随机负样本
        neg_items = torch.randint(1, self.config['num_items'], pos_items.size(), device=self.device)
        return self.model.compute_loss(input_seq, pos_items, neg_items)


class HSTUTrainer(Trainer):
    """HSTU 训练器"""

    def _compute_loss(self, batch):
        item_seq = batch['item_seq']
        action_seq = batch['action_seq']
        time_deltas = batch['time_deltas']
        
        # Target: 下一步的 item 和 action
        target_items = item_seq.clone()
        target_actions = action_seq.clone()
        
        return self.model.compute_loss(
            item_seq, action_seq, time_deltas,
            target_items, target_actions
        )


class DINTrainer(Trainer):
    """DIN CTR 训练器"""

    def _compute_loss(self, batch):
        logit = self.model(
            user_id=batch['user_id'],
            target_item_id=batch['item_id'],
            behavior_item_ids=batch['behavior_items'],
            behavior_mask=batch['behavior_mask'],
            city_id=batch['city'],
        )
        return nn.BCEWithLogitsLoss()(logit.squeeze(-1), batch['label'])


# =================== 离线评估 ===================

class Evaluator:
    """
    推荐系统离线评估
    
    指标:
      - Hit@K: top-K 中是否包含正确答案
      - NDCG@K: 归一化折损累积增益
      - MRR: 平均倒数排名
      - AUC: 二分类 ROC 曲线下面积
      - Recall@K: 召回率
      - Coverage: 推荐覆盖率
      - Diversity: 推荐多样性 (ILS)
    """

    @staticmethod
    def hit_at_k(recommended: list, ground_truth: set, k: int) -> float:
        """Hit@K"""
        return 1.0 if any(item in ground_truth for item in recommended[:k]) else 0.0

    @staticmethod
    def ndcg_at_k(recommended: list, ground_truth: set, k: int) -> float:
        """NDCG@K"""
        dcg = 0.0
        for i, item in enumerate(recommended[:k]):
            if item in ground_truth:
                dcg += 1.0 / np.log2(i + 2)  # position is 1-indexed

        # Ideal DCG
        ideal_dcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(ground_truth), k)))
        return dcg / ideal_dcg if ideal_dcg > 0 else 0.0

    @staticmethod
    def mrr(recommended: list, ground_truth: set) -> float:
        """Mean Reciprocal Rank"""
        for i, item in enumerate(recommended):
            if item in ground_truth:
                return 1.0 / (i + 1)
        return 0.0

    @staticmethod
    def recall_at_k(recommended: list, ground_truth: set, k: int) -> float:
        """Recall@K"""
        hits = len(set(recommended[:k]) & ground_truth)
        return hits / len(ground_truth) if ground_truth else 0.0

    @staticmethod
    def diversity_ils(recommended_embeddings: np.ndarray) -> float:
        """
        Intra-List Similarity (ILS) 多样性
        ILS 越低 → 多样性越高
        """
        if len(recommended_embeddings) < 2:
            return 0.0
        
        norms = np.linalg.norm(recommended_embeddings, axis=1, keepdims=True) + 1e-8
        normed = recommended_embeddings / norms
        sim_matrix = normed @ normed.T
        
        n = len(recommended_embeddings)
        # 取上三角 (不含对角线)
        ils = (sim_matrix.sum() - n) / (n * (n - 1))
        return ils

    @staticmethod
    def coverage(all_recommended: list, total_items: int) -> float:
        """推荐覆盖率"""
        unique_items = set()
        for rec_list in all_recommended:
            unique_items.update(rec_list)
        return len(unique_items) / total_items if total_items > 0 else 0.0

    def evaluate_ranking(self, model, test_data, k_list=(5, 10, 20)):
        """
        完整评估
        Args:
            model: 推荐模型
            test_data: [(user_seq, ground_truth_items), ...]
            k_list: 评估的 K 值列表
        Returns:
            metrics: dict
        """
        metrics = {f'Hit@{k}': [] for k in k_list}
        metrics.update({f'NDCG@{k}': [] for k in k_list})
        metrics['MRR'] = []

        for user_seq, gt_items in test_data:
            # 模型预测
            recommended = model.predict_topk(user_seq, max(k_list))

            gt_set = set(gt_items)
            for k in k_list:
                metrics[f'Hit@{k}'].append(self.hit_at_k(recommended, gt_set, k))
                metrics[f'NDCG@{k}'].append(self.ndcg_at_k(recommended, gt_set, k))
            metrics['MRR'].append(self.mrr(recommended, gt_set))

        # 求平均
        return {name: np.mean(values) for name, values in metrics.items()}


# =================== A/B 测试框架 ===================

class ABTestFramework:
    """
    A/B 测试框架
    - 流量分配
    - 指标收集
    - 显著性检验
    """

    def __init__(self):
        self.experiments = {}

    def create_experiment(self, name, groups, traffic_split=None):
        """
        创建实验
        Args:
            name: 实验名称
            groups: {'control': model_A, 'treatment': model_B}
            traffic_split: {'control': 0.5, 'treatment': 0.5}
        """
        if traffic_split is None:
            n = len(groups)
            traffic_split = {g: 1.0 / n for g in groups}

        self.experiments[name] = {
            'groups': groups,
            'traffic_split': traffic_split,
            'metrics': {g: [] for g in groups},
            'created_at': time.time(),
        }
        logger.info(f'A/B Test created: {name}, groups={list(groups.keys())}')

    def assign_group(self, experiment_name, user_id):
        """
        流量分配: 根据 user_id hash 分组 (保证同一用户始终在同一组)
        """
        exp = self.experiments[experiment_name]
        hash_val = hash(f"{experiment_name}:{user_id}") % 10000
        
        cumulative = 0
        for group, ratio in exp['traffic_split'].items():
            cumulative += ratio * 10000
            if hash_val < cumulative:
                return group
        
        return list(exp['groups'].keys())[-1]

    def record_metric(self, experiment_name, group, metric_name, value):
        """记录指标"""
        exp = self.experiments[experiment_name]
        exp['metrics'][group].append({
            'metric': metric_name,
            'value': value,
            'timestamp': time.time(),
        })

    def analyze(self, experiment_name, metric_name='ctr'):
        """
        分析实验结果 (t-test 显著性检验)
        """
        from scipy import stats
        
        exp = self.experiments[experiment_name]
        results = {}
        
        for group, records in exp['metrics'].items():
            values = [r['value'] for r in records if r['metric'] == metric_name]
            if values:
                results[group] = {
                    'mean': np.mean(values),
                    'std': np.std(values),
                    'count': len(values),
                }
        
        # t-test between control and treatment
        groups = list(results.keys())
        if len(groups) >= 2:
            control_values = [r['value'] for r in exp['metrics'][groups[0]] if r['metric'] == metric_name]
            treatment_values = [r['value'] for r in exp['metrics'][groups[1]] if r['metric'] == metric_name]
            
            if control_values and treatment_values:
                t_stat, p_value = stats.ttest_ind(control_values, treatment_values)
                results['significance'] = {
                    't_statistic': t_stat,
                    'p_value': p_value,
                    'is_significant': p_value < 0.05,
                    'relative_improvement': (
                        (np.mean(treatment_values) - np.mean(control_values)) /
                        (np.mean(control_values) + 1e-8)
                    ),
                }
        
        return results


# =================== 入口 ===================

def main():
    parser = argparse.ArgumentParser(description='搜广推模型训练')
    parser.add_argument('--model', choices=['sasrec', 'hstu', 'din', 'dcn', 'tiger', 'two_tower'],
                        required=True, help='模型类型')
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch_size', type=int, default=256)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--data_dir', default='data/')
    parser.add_argument('--ckpt_dir', default='checkpoints/')
    args = parser.parse_args()

    logger.info(f'Training {args.model} on {args.device}')

    # 选择模型
    if args.model == 'sasrec':
        model = SASRec(SASREC_CONFIG)
        trainer_cls = SASRecTrainer
    elif args.model == 'hstu':
        model = HSTU(HSTU_CONFIG)
        trainer_cls = HSTUTrainer
    elif args.model == 'din':
        model = DIN(DIN_CONFIG)
        trainer_cls = DINTrainer
    elif args.model == 'dcn':
        model = DCNV2(DCN_CONFIG)
        trainer_cls = Trainer
    elif args.model == 'tiger':
        model = TIGERModel(TIGER_CONFIG)
        trainer_cls = Trainer
    elif args.model == 'two_tower':
        model = TwoTowerModel(TWO_TOWER_CONFIG)
        trainer_cls = Trainer
    else:
        raise ValueError(f'Unknown model: {args.model}')

    config = {
        'epochs': args.epochs,
        'batch_size': args.batch_size,
        'lr': args.lr,
        'ckpt_dir': args.ckpt_dir,
        **globals().get(f'{args.model.upper()}_CONFIG', {}),
    }

    trainer = trainer_cls(model, config, device=args.device)

    # TODO: 加载真实数据 (当前使用 mock)
    logger.info('Using mock data for demo. Replace with real data loading.')
    
    # Mock 数据示例
    if args.model in ('sasrec', 'hstu'):
        mock_sequences = [
            [(np.random.randint(1, 5000), np.random.randint(1, 6), i * 60)
             for i in range(np.random.randint(5, 50))]
            for _ in range(1000)
        ]
        dataset = BehaviorSequenceDataset(mock_sequences, max_len=50)
    else:
        mock_samples = [
            {
                'user_id': np.random.randint(0, 10000),
                'item_id': np.random.randint(0, 5000),
                'behavior_items': np.random.randint(1, 5000, size=20).tolist(),
                'category': np.random.randint(0, 20),
                'city': np.random.randint(0, 10),
                'label': np.random.randint(0, 2),
                'dense_feats': np.random.randn(5).tolist(),
            }
            for _ in range(5000)
        ]
        dataset = CTRDataset(mock_samples)

    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)

    # 训练
    for epoch in range(1, args.epochs + 1):
        loss = trainer.train_epoch(dataloader, epoch)
        
        if epoch % 5 == 0:
            trainer.save_checkpoint(epoch)

    # 最终保存
    trainer.save_checkpoint(args.epochs, metrics={'final_loss': loss})
    logger.info('Training complete!')


if __name__ == '__main__':
    main()
