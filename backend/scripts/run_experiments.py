"""
完整实验 Pipeline: 数据加载 → 训练 → 评估 → 报告

支持数据源:
  - synthetic: 合成数据 (500 users × 30 items)
  - movielens: MovieLens-1M (6040 users × 3952 items)

模型:
  - SASRec: 序列推荐 (自回归 attention)
  - DIN: CTR 预估 (target attention)
  - DCN-V2: CTR (cross network)
  - DeepFM: CTR (FM + DNN)
  - HSTU: 序列推荐 (Meta 2024)

用法:
  python scripts/run_experiments.py --data synthetic --models sasrec din dcn deepfm --epochs 10
  python scripts/run_experiments.py --data movielens --models sasrec din --epochs 20
"""
import os
import sys
import json
import time
import argparse
import logging
from pathlib import Path
from collections import defaultdict

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.sasrec import SASRec, SASREC_CONFIG
from app.ml.hstu import HSTU, HSTU_CONFIG
from app.ml.din import DIN, DIN_CONFIG
from app.ml.dcn_v2 import DCNV2, DCN_CONFIG
from app.ml.deepfm import DeepFM

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


# =================== MovieLens-1M 数据加载 ===================

def load_movielens(data_dir='data/ml-1m', min_interactions=5):
    """加载 MovieLens-1M 并转为序列+CTR格式"""
    logger.info("Loading MovieLens-1M...")
    
    ratings_file = Path(data_dir) / 'ratings.dat'
    movies_file = Path(data_dir) / 'movies.dat'
    users_file = Path(data_dir) / 'users.dat'
    
    # 读取评分
    interactions = []
    with open(ratings_file, 'r', encoding='latin-1') as f:
        for line in f:
            parts = line.strip().split('::')
            uid, mid, rating, ts = int(parts[0]), int(parts[1]), float(parts[2]), int(parts[3])
            interactions.append({
                'user_id': uid,
                'item_id': mid,
                'rating': rating,
                'timestamp': ts,
            })
    
    # 读取电影信息 (类别)
    movie_genres = {}
    genre_set = set()
    with open(movies_file, 'r', encoding='latin-1') as f:
        for line in f:
            parts = line.strip().split('::')
            mid = int(parts[0])
            genres = parts[2].split('|')
            movie_genres[mid] = genres
            genre_set.update(genres)
    
    genre_list = sorted(genre_set)
    genre2idx = {g: i for i, g in enumerate(genre_list)}
    
    logger.info(f"Loaded {len(interactions)} ratings, {len(movie_genres)} movies, {len(genre_list)} genres")
    
    # Re-index (连续 ID)
    user_ids = sorted(set(r['user_id'] for r in interactions))
    item_ids = sorted(set(r['item_id'] for r in interactions))
    uid_map = {uid: i+1 for i, uid in enumerate(user_ids)}
    iid_map = {iid: i+1 for i, iid in enumerate(item_ids)}
    
    n_users = len(uid_map)
    n_items = len(iid_map)
    
    # 重映射
    for r in interactions:
        r['user_id'] = uid_map[r['user_id']]
        r['item_id'] = iid_map[r['item_id']]
    
    # 按用户分组, 时间排序
    user_history = defaultdict(list)
    for r in interactions:
        user_history[r['user_id']].append(r)
    
    # 过滤交互少的用户
    user_history = {uid: sorted(hist, key=lambda x: x['timestamp'])
                    for uid, hist in user_history.items()
                    if len(hist) >= min_interactions}
    
    logger.info(f"After filtering: {len(user_history)} users, {n_items} items")
    
    # item 类别 (取第一个 genre)
    item_category = {}
    for orig_id, new_id in iid_map.items():
        genres = movie_genres.get(orig_id, ['Unknown'])
        item_category[new_id] = genre2idx.get(genres[0], 0)
    
    return {
        'user_history': user_history,
        'n_users': n_users,
        'n_items': n_items,
        'n_genres': len(genre_list),
        'item_category': item_category,
        'genre_list': genre_list,
    }


def load_synthetic(data_dir='data/synthetic'):
    """加载合成数据"""
    logger.info("Loading synthetic data...")
    
    with open(Path(data_dir) / 'sequences.json', 'r', encoding='utf-8') as f:
        sequences = json.load(f)
    with open(Path(data_dir) / 'ctr_samples.json', 'r', encoding='utf-8') as f:
        ctr_samples = json.load(f)
    with open(Path(data_dir) / 'stats.json', 'r', encoding='utf-8') as f:
        stats = json.load(f)
    
    logger.info(f"Loaded {stats['n_sequences']} sequences, {stats['n_ctr_samples']} CTR samples")
    return {
        'sequences': sequences,
        'ctr_samples': ctr_samples,
        'stats': stats,
    }


# =================== 数据集 ===================

class SeqDataset(Dataset):
    """序列数据集 (leave-one-out 评估)"""
    
    def __init__(self, sequences, n_items, max_len=50, mode='train'):
        self.n_items = n_items
        self.max_len = max_len
        self.mode = mode
        self.data = []
        
        for seq in sequences:
            if len(seq) < 3:
                continue
            if mode == 'train':
                # 输入: seq[:-2], 预测: seq[-2]
                self.data.append(seq[:-2])
            elif mode == 'val':
                self.data.append(seq[:-1])
            else:  # test
                self.data.append(seq)
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        seq = self.data[idx]
        # 取最后 max_len 个
        seq = seq[-self.max_len:]
        
        items = [s[0] if isinstance(s, (list, tuple)) else s for s in seq]
        
        # 输入是 seq[:-1], target 是 seq[-1]
        input_items = items[:-1]
        target = items[-1]
        
        # Padding
        pad_len = self.max_len - len(input_items)
        input_padded = [0] * pad_len + input_items
        
        return {
            'item_seq': torch.tensor(input_padded, dtype=torch.long),
            'target': torch.tensor(target, dtype=torch.long),
            'seq_len': torch.tensor(len(input_items), dtype=torch.long),
        }


class CTRDatasetV2(Dataset):
    """CTR 数据集 (兼容 DIN/DCN/DeepFM)"""
    
    def __init__(self, samples, n_items, max_behavior_len=50):
        self.samples = samples
        self.n_items = n_items
        self.max_behavior_len = max_behavior_len
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        s = self.samples[idx]
        
        behavior = s.get('behavior_items', [])[-self.max_behavior_len:]
        pad_len = self.max_behavior_len - len(behavior)
        behavior_padded = [0] * pad_len + behavior
        behavior_mask = [0.0] * pad_len + [1.0] * len(behavior)
        
        dense = s.get('dense_feats', [0.0]*5)
        
        return {
            'user_id': torch.tensor(s['user_id'], dtype=torch.long),
            'item_id': torch.tensor(s['item_id'], dtype=torch.long),
            'behavior_items': torch.tensor(behavior_padded, dtype=torch.long),
            'behavior_mask': torch.tensor(behavior_mask, dtype=torch.float),
            'category': torch.tensor(s.get('category', 0), dtype=torch.long),
            'city': torch.tensor(s.get('city', 0), dtype=torch.long),
            'dense_feats': torch.tensor(dense, dtype=torch.float),
            'label': torch.tensor(s.get('label', 0), dtype=torch.float),
        }


# =================== 数据准备 ===================

def prepare_movielens_sequences(ml_data, max_len=50):
    """MovieLens → 序列格式"""
    sequences = []
    for uid, hist in ml_data['user_history'].items():
        seq = [(r['item_id'], 1 if r['rating'] >= 4 else 0, r['timestamp']) for r in hist]
        if len(seq) >= 5:
            sequences.append(seq)
    return sequences


def prepare_movielens_ctr(ml_data, neg_ratio=1):
    """MovieLens → CTR 格式 (implicit feedback: rating>=4 正, <4 负)"""
    samples = []
    all_items = list(range(1, ml_data['n_items'] + 1))
    item_cat = ml_data['item_category']
    
    for uid, hist in ml_data['user_history'].items():
        # 正样本: rating >= 4
        pos_items = [r['item_id'] for r in hist if r['rating'] >= 4]
        pos_set = set(pos_items)
        
        # 用户历史 (时间序)
        history_items = [r['item_id'] for r in hist]
        
        for i, r in enumerate(hist):
            label = 1 if r['rating'] >= 4 else 0
            behavior_before = history_items[:i][-50:]  # 之前的交互
            
            samples.append({
                'user_id': uid,
                'item_id': r['item_id'],
                'behavior_items': behavior_before,
                'category': item_cat.get(r['item_id'], 0),
                'city': 0,
                'label': label,
                'dense_feats': [r['rating'] / 5.0, len(behavior_before) / 50.0, 0.0, 0.0, 0.0],
            })
    
    return samples


# =================== 训练 ===================

def train_seq_model(model, train_loader, val_loader, config, device):
    """训练序列模型 (SASRec/HSTU)"""
    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=config['lr'], weight_decay=1e-5)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config['epochs'])
    
    best_hit10 = 0
    results = []
    
    for epoch in range(1, config['epochs'] + 1):
        model.train()
        total_loss = 0
        n_batch = 0
        
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            optimizer.zero_grad()
            
            item_seq = batch['item_seq']  # [B, max_len]
            
            # SASRec style: 输入 seq[:-1], 正样本 seq[1:], 负样本随机
            input_seq = item_seq[:, :-1]
            pos_items = item_seq[:, 1:]
            neg_items = torch.randint(1, config['n_items'], pos_items.shape, device=device)
            
            loss = model.compute_loss(input_seq, pos_items, neg_items)
            
            if torch.isnan(loss):
                continue
                
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            
            total_loss += loss.item()
            n_batch += 1
        
        scheduler.step()
        avg_loss = total_loss / max(n_batch, 1)
        
        # 验证
        if epoch % 2 == 0 or epoch == config['epochs']:
            metrics = eval_seq_model(model, val_loader, config['n_items'], device)
            results.append({'epoch': epoch, 'loss': avg_loss, **metrics})
            logger.info(f"  Epoch {epoch}: loss={avg_loss:.4f}, Hit@10={metrics['Hit@10']:.4f}, NDCG@10={metrics['NDCG@10']:.4f}")
            
            if metrics['Hit@10'] > best_hit10:
                best_hit10 = metrics['Hit@10']
        else:
            results.append({'epoch': epoch, 'loss': avg_loss})
            logger.info(f"  Epoch {epoch}: loss={avg_loss:.4f}")
    
    return results


def _forward_ctr(model, batch, model_name):
    """统一 CTR 模型 forward 调用"""
    if model_name == 'din':
        return model(
            user_id=batch['user_id'],
            target_item_id=batch['item_id'],
            behavior_item_ids=batch['behavior_items'],
            behavior_mask=batch['behavior_mask'],
            city_id=batch['city'],
        )
    elif model_name == 'dcn':
        return model(
            user_id=batch['user_id'],
            item_id=batch['item_id'],
            category_id=batch['category'],
            city_id=batch['city'],
            dense_feats=batch['dense_feats'],
        )
    elif model_name == 'deepfm':
        sparse_inputs = {
            'user_id': batch['user_id'],
            'item_id': batch['item_id'],
            'category': batch['category'],
            'city': batch['city'],
        }
        return model(sparse_inputs, batch['dense_feats'])
    else:
        raise ValueError(f"Unknown model: {model_name}")


def train_ctr_model(model, train_loader, val_loader, config, device, model_name='din'):
    """训练 CTR 模型 (DIN/DCN/DeepFM)"""
    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=config['lr'], weight_decay=1e-5)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config['epochs'])
    criterion = nn.BCEWithLogitsLoss()
    
    results = []
    
    for epoch in range(1, config['epochs'] + 1):
        model.train()
        total_loss = 0
        n_batch = 0
        
        for batch in train_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            optimizer.zero_grad()
            
            logit = _forward_ctr(model, batch, model_name)
            loss = criterion(logit.squeeze(-1), batch['label'])
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            
            total_loss += loss.item()
            n_batch += 1
        
        scheduler.step()
        avg_loss = total_loss / max(n_batch, 1)
        
        # 验证
        if epoch % 2 == 0 or epoch == config['epochs']:
            metrics = eval_ctr_model(model, val_loader, device, model_name)
            results.append({'epoch': epoch, 'loss': avg_loss, **metrics})
            logger.info(f"  Epoch {epoch}: loss={avg_loss:.4f}, AUC={metrics['AUC']:.4f}, LogLoss={metrics['LogLoss']:.4f}")
        else:
            results.append({'epoch': epoch, 'loss': avg_loss})
            logger.info(f"  Epoch {epoch}: loss={avg_loss:.4f}")
    
    return results


# =================== 评估 ===================

def eval_seq_model(model, dataloader, n_items, device, k_list=(5, 10, 20)):
    """序列模型评估: Hit@K, NDCG@K, MRR"""
    model.eval()
    metrics = {f'Hit@{k}': [] for k in k_list}
    metrics.update({f'NDCG@{k}': [] for k in k_list})
    metrics['MRR'] = []
    
    # 获取 item embedding (支持 item_emb 或 item_embedding)
    item_emb_layer = getattr(model, 'item_emb', None) or getattr(model, 'item_embedding', None)
    
    with torch.no_grad():
        for batch in dataloader:
            batch = {k: v.to(device) for k, v in batch.items()}
            item_seq = batch['item_seq']
            target = batch['target']
            
            # 获取序列表示 (last position)
            seq_repr = model.forward(item_seq)  # [B, D]
            
            # 打分: 对所有 item 计算分数
            all_item_emb = item_emb_layer.weight[1:]  # [n_items, D] skip padding
            scores = torch.matmul(seq_repr, all_item_emb.T)  # [B, n_items]
            
            # 排序
            _, topk_indices = scores.topk(max(k_list), dim=1)
            topk_indices = topk_indices + 1  # 加回偏移 (因为 skip 了 0号 padding)
            
            for i in range(target.size(0)):
                gt = target[i].item()
                rec = topk_indices[i].cpu().tolist()
                
                for k in k_list:
                    hit = 1.0 if gt in rec[:k] else 0.0
                    metrics[f'Hit@{k}'].append(hit)
                    
                    # NDCG
                    if gt in rec[:k]:
                        rank = rec[:k].index(gt)
                        ndcg = 1.0 / np.log2(rank + 2)
                    else:
                        ndcg = 0.0
                    metrics[f'NDCG@{k}'].append(ndcg)
                
                # MRR
                if gt in rec[:max(k_list)]:
                    rank = rec.index(gt)
                    metrics['MRR'].append(1.0 / (rank + 1))
                else:
                    metrics['MRR'].append(0.0)
    
    return {k: np.mean(v) for k, v in metrics.items()}


def eval_ctr_model(model, dataloader, device, model_name='din'):
    """CTR 模型评估: AUC, LogLoss"""
    model.eval()
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for batch in dataloader:
            batch = {k: v.to(device) for k, v in batch.items()}
            logit = _forward_ctr(model, batch, model_name)
            pred = torch.sigmoid(logit.squeeze(-1))
            all_preds.extend(pred.cpu().numpy().tolist())
            all_labels.extend(batch['label'].cpu().numpy().tolist())
    
    # AUC
    from sklearn.metrics import roc_auc_score, log_loss
    try:
        auc = roc_auc_score(all_labels, all_preds)
    except ValueError:
        auc = 0.5
    
    # LogLoss
    preds_clipped = np.clip(all_preds, 1e-7, 1 - 1e-7)
    logloss = log_loss(all_labels, preds_clipped)
    
    return {'AUC': auc, 'LogLoss': logloss}


# =================== 主实验 ===================

def run_experiment(args):
    device = args.device
    logger.info(f"Device: {device}")
    logger.info(f"=" * 60)
    
    # 加载数据
    if args.data == 'movielens':
        ml_data = load_movielens('data/ml-1m')
        n_items = ml_data['n_items'] + 1
        n_users = ml_data['n_users'] + 1
        n_genres = ml_data['n_genres']
        
        # 限制用户数 (CPU 上太慢)
        max_users = None
        if hasattr(args, 'max_samples') and args.max_samples:
            max_users = args.max_samples // 100  # ~500 users for 50K samples
            user_ids = sorted(ml_data['user_history'].keys())[:max_users]
            ml_data['user_history'] = {uid: ml_data['user_history'][uid] for uid in user_ids}
            logger.info(f"Limited to {max_users} users")
        
        sequences = prepare_movielens_sequences(ml_data)
        ctr_samples = prepare_movielens_ctr(ml_data)
        
        logger.info(f"MovieLens: {len(sequences)} sequences, {len(ctr_samples)} CTR samples")
    else:
        syn_data = load_synthetic('data/synthetic')
        n_items = syn_data['stats']['n_items'] + 1
        n_users = syn_data['stats']['n_users'] + 1
        n_genres = len(syn_data['stats']['categories'])
        
        sequences = syn_data['sequences']
        ctr_samples = syn_data['ctr_samples']
    
    all_results = {}
    
    # =================== SASRec ===================
    if 'sasrec' in args.models:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training SASRec")
        logger.info(f"{'='*60}")
        
        config = {
            **SASREC_CONFIG,
            'num_items': n_items,
            'n_items': n_items,
            'epochs': args.epochs,
            'lr': args.lr,
        }
        
        # 准备数据
        train_seqs = sequences[:int(len(sequences)*0.8)]
        val_seqs = sequences[int(len(sequences)*0.8):]
        
        train_ds = SeqDataset(train_seqs, n_items, max_len=50, mode='train')
        val_ds = SeqDataset(val_seqs, n_items, max_len=50, mode='val')
        
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
        
        model = SASRec(config)
        results = train_seq_model(model, train_loader, val_loader, config, device)
        all_results['SASRec'] = results
    
    # =================== HSTU ===================
    if 'hstu' in args.models:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training HSTU")
        logger.info(f"{'='*60}")
        
        config = {
            **HSTU_CONFIG,
            'num_items': n_items,
            'n_items': n_items,
            'epochs': args.epochs,
            'lr': args.lr,
        }
        
        train_seqs = sequences[:int(len(sequences)*0.8)]
        val_seqs = sequences[int(len(sequences)*0.8):]
        
        train_ds = SeqDataset(train_seqs, n_items, max_len=50, mode='train')
        val_ds = SeqDataset(val_seqs, n_items, max_len=50, mode='val')
        
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
        
        model = HSTU(config)
        results = train_seq_model(model, train_loader, val_loader, config, device)
        all_results['HSTU'] = results
    
    # =================== DIN ===================
    if 'din' in args.models:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training DIN")
        logger.info(f"{'='*60}")
        
        config = {
            **DIN_CONFIG,
            'num_items': n_items,
            'num_users': n_users,
            'n_items': n_items,
            'num_cities': 10,
            'epochs': args.epochs,
            'lr': args.lr,
        }
        
        # 分割
        n_train = int(len(ctr_samples) * 0.8)
        train_samples = ctr_samples[:n_train]
        val_samples = ctr_samples[n_train:]
        
        train_ds = CTRDatasetV2(train_samples, n_items)
        val_ds = CTRDatasetV2(val_samples, n_items)
        
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
        
        model = DIN(config)
        results = train_ctr_model(model, train_loader, val_loader, config, device, 'din')
        all_results['DIN'] = results
    
    # =================== DCN-V2 ===================
    if 'dcn' in args.models:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training DCN-V2")
        logger.info(f"{'='*60}")
        
        config = {
            'num_users': n_users,
            'num_items': n_items,
            'num_categories': n_genres,
            'num_cities': 10,
            'emb_dim': 32,
            'num_dense_feats': 5,
            'cross_layers': 3,
            'num_experts': 4,
            'low_rank': 32,
            'epochs': args.epochs,
            'lr': args.lr,
        }
        
        n_train = int(len(ctr_samples) * 0.8)
        train_samples = ctr_samples[:n_train]
        val_samples = ctr_samples[n_train:]
        
        train_ds = CTRDatasetV2(train_samples, n_items)
        val_ds = CTRDatasetV2(val_samples, n_items)
        
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
        
        model = DCNV2(config)
        results = train_ctr_model(model, train_loader, val_loader, config, device, 'dcn')
        all_results['DCN-V2'] = results
    
    # =================== DeepFM ===================
    if 'deepfm' in args.models:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training DeepFM")
        logger.info(f"{'='*60}")
        
        config = {
            'sparse_fields': [
                ('user_id', n_users),
                ('item_id', n_items),
                ('category', n_genres),
                ('city', 10),
            ],
            'num_dense_feats': 5,
            'emb_dim': 16,
            'hidden_units': [256, 128, 64],
            'dropout': 0.2,
            'epochs': args.epochs,
            'lr': args.lr,
        }
        
        n_train = int(len(ctr_samples) * 0.8)
        train_samples = ctr_samples[:n_train]
        val_samples = ctr_samples[n_train:]
        
        train_ds = CTRDatasetV2(train_samples, n_items)
        val_ds = CTRDatasetV2(val_samples, n_items)
        
        train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
        
        model = DeepFM(config)
        results = train_ctr_model(model, train_loader, val_loader, config, device, 'deepfm')
        all_results['DeepFM'] = results
    
    # =================== 汇总报告 ===================
    logger.info(f"\n{'='*60}")
    logger.info(f"EXPERIMENT RESULTS SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Data: {args.data} | Epochs: {args.epochs} | Device: {device}")
    logger.info(f"-" * 60)
    
    report = {
        'config': {
            'data': args.data,
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'lr': args.lr,
            'device': str(device),
            'n_items': n_items,
            'n_users': n_users,
        },
        'results': {},
    }
    
    for model_name, results in all_results.items():
        final = results[-1]
        report['results'][model_name] = final
        
        if 'AUC' in final:
            logger.info(f"  {model_name:10s}: AUC={final['AUC']:.4f}, LogLoss={final['LogLoss']:.4f}")
        elif 'Hit@10' in final:
            logger.info(f"  {model_name:10s}: Hit@10={final['Hit@10']:.4f}, NDCG@10={final['NDCG@10']:.4f}, MRR={final.get('MRR', 0):.4f}")
        else:
            logger.info(f"  {model_name:10s}: loss={final['loss']:.4f}")
    
    # 保存报告
    report_dir = Path('results')
    report_dir.mkdir(exist_ok=True)
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    report_path = report_dir / f'experiment_{args.data}_{timestamp}.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    logger.info(f"\nReport saved to: {report_path}")
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run recommendation experiments')
    parser.add_argument('--data', choices=['synthetic', 'movielens'], default='synthetic')
    parser.add_argument('--models', nargs='+', default=['sasrec', 'din', 'dcn', 'deepfm'],
                        choices=['sasrec', 'hstu', 'din', 'dcn', 'deepfm'])
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch_size', type=int, default=256)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    parser.add_argument('--max_samples', type=int, default=None, help='Max CTR samples (for CPU speed)')
    args = parser.parse_args()
    
    run_experiment(args)
