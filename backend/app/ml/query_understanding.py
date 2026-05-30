"""
Query 理解与搜索相关性模块

实现:
  1. Query Rewrite — 查询改写 (同义词扩展 / 纠错 / 意图补全)
  2. Intent Classification — 意图分类 (导航/信息/交易)
  3. Semantic Matching — 语义相关性 (BERT-based cross-encoder)
  4. Query-Document Relevance — 多级相关性标签预测

参考论文:
  - [Facebook] Que2Search: Fast and Accurate Query and Document Understanding
  - [Alibaba] MGDSPR: Embedding-based Product Retrieval in Taobao Search
  - [Meituan] SPM: Structured Pretraining and Matching for Relevance Modeling
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import re
from typing import List, Dict, Tuple, Optional


class QueryRewriter:
    """
    查询改写引擎

    策略:
      1. 同义词扩展: 陶艺 → 陶瓷制作 | 拉坯 | 陶器
      2. 拼写纠错: 花义 → 花艺
      3. 意图补全: 上海 → 上海手工工坊
      4. 实体识别: "周末去杭州做陶艺" → city=杭州, category=陶艺, time=周末
    """

    # 同义词表 (实际应用中从 NLP 服务获取)
    SYNONYMS = {
        '陶艺': ['陶瓷', '拉坯', '陶器', '制陶', '陶艺工坊'],
        '花艺': ['插花', '花道', '鲜花', '花艺课'],
        '绘画': ['画画', '油画', '水彩', '素描', '美术'],
        '烘焙': ['蛋糕', '面包', '烘培', '甜点制作'],
        '手工皮具': ['皮艺', '皮具制作', '手工包', '皮雕'],
        '香薰': ['香薰蜡烛', '精油', '蜡烛DIY', '调香'],
        '木工': ['木艺', '木工坊', '木雕', '木作'],
        '书法': ['写字', '毛笔字', '硬笔书法', '国画书法'],
    }

    CITY_ALIASES = {
        '魔都': '上海', '帝都': '北京', '天堂': '杭州',
        '蓉城': '成都', '羊城': '广州', '鹏城': '深圳',
    }

    INTENT_KEYWORDS = {
        'book': ['预约', '报名', '预定', '下单', '购买'],
        'info': ['怎么样', '好不好', '推荐', '哪家', '评价'],
        'navigate': ['地址', '在哪', '怎么走', '导航'],
    }

    def rewrite(self, query: str) -> Dict:
        """
        查询理解 + 改写

        Returns:
            {
                'original': str,
                'rewritten': str,
                'expansions': [str, ...],
                'entities': {'city': ..., 'category': ..., 'time': ...},
                'intent': str,
                'corrected': str,
            }
        """
        result = {
            'original': query,
            'rewritten': query,
            'expansions': [],
            'entities': {},
            'intent': 'info',
            'corrected': query,
        }

        # 1. 实体抽取
        result['entities'] = self._extract_entities(query)

        # 2. 拼写纠错
        result['corrected'] = self._correct_spelling(query)

        # 3. 同义词扩展
        result['expansions'] = self._expand_synonyms(query)

        # 4. 意图分类
        result['intent'] = self._classify_intent(query)

        # 5. 改写 (组合)
        result['rewritten'] = self._compose_rewrite(result)

        return result

    def _extract_entities(self, query: str) -> Dict:
        entities = {}
        # 城市
        for alias, city in self.CITY_ALIASES.items():
            if alias in query:
                entities['city'] = city
                break
        for city in ['上海', '北京', '杭州', '成都', '广州', '深圳']:
            if city in query:
                entities['city'] = city
                break
        # 类别
        for cat in self.SYNONYMS.keys():
            if cat in query:
                entities['category'] = cat
                break
            for syn in self.SYNONYMS[cat]:
                if syn in query:
                    entities['category'] = cat
                    break
        # 时间
        time_patterns = ['周末', '今天', '明天', '下周', '周六', '周日']
        for tp in time_patterns:
            if tp in query:
                entities['time'] = tp
                break
        return entities

    def _correct_spelling(self, query: str) -> str:
        # 简单纠错规则 (实际应用用 Pinyin 模糊匹配)
        corrections = {'花义': '花艺', '陶义': '陶艺', '烘培': '烘焙', '香熏': '香薰'}
        for wrong, right in corrections.items():
            query = query.replace(wrong, right)
        return query

    def _expand_synonyms(self, query: str) -> List[str]:
        expansions = []
        for keyword, syns in self.SYNONYMS.items():
            if keyword in query:
                expansions.extend(syns[:3])
        return expansions

    def _classify_intent(self, query: str) -> str:
        for intent, keywords in self.INTENT_KEYWORDS.items():
            if any(kw in query for kw in keywords):
                return intent
        return 'info'

    def _compose_rewrite(self, result: Dict) -> str:
        parts = [result['corrected']]
        entities = result['entities']
        if 'category' in entities and entities['category'] not in result['corrected']:
            parts.append(entities['category'])
        return ' '.join(parts)


class IntentClassifier(nn.Module):
    """
    用户搜索意图分类 (多标签)

    意图类别:
      - 导航型 (navigational): 找特定工坊
      - 信息型 (informational): 了解/比较
      - 交易型 (transactional): 预约/购买
      - 探索型 (exploratory): 逛逛/发现新东西

    架构: TextCNN (轻量, 低延迟)
    """

    INTENTS = ['navigational', 'informational', 'transactional', 'exploratory']

    def __init__(self, vocab_size=5000, embed_dim=64, n_filters=128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        # 多尺度卷积
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, n_filters, kernel_size=k, padding=k//2)
            for k in [2, 3, 4, 5]
        ])
        self.fc = nn.Sequential(
            nn.Linear(n_filters * 4, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, len(self.INTENTS)),
        )

    def forward(self, token_ids):
        """
        Args:
            token_ids: [B, L] tokenized query
        Returns:
            intent_logits: [B, 4]
        """
        x = self.embedding(token_ids)  # [B, L, E]
        x = x.transpose(1, 2)  # [B, E, L]
        conv_outs = [F.relu(conv(x)).max(dim=-1)[0] for conv in self.convs]  # [B, n_filters] × 4
        x = torch.cat(conv_outs, dim=-1)  # [B, n_filters*4]
        return self.fc(x)


class CrossEncoderRelevance(nn.Module):
    """
    Cross-Encoder 相关性模型 — 精确 query-document 相关性打分

    对比 Two-Tower (bi-encoder):
      - Two-Tower: query/doc 分别编码, 内积计算相似度 (快, 但交互弱)
      - Cross-Encoder: query+doc 拼接后联合编码 (慢, 但精确)

    用途: 精排阶段对召回候选做精确相关性判断

    输入: [CLS] query [SEP] document [SEP]
    输出: relevance score (0~1)
    """

    def __init__(self, vocab_size=10000, embed_dim=128, n_heads=4, n_layers=2, max_len=128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.position_embedding = nn.Embedding(max_len, embed_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=n_heads, dim_feedforward=256,
            dropout=0.1, batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        self.relevance_head = nn.Sequential(
            nn.Linear(embed_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 4),  # 4-level: 不相关/略相关/相关/非常相关
        )

    def forward(self, input_ids, attention_mask=None):
        """
        Args:
            input_ids: [B, L] 拼接后的 token ids
            attention_mask: [B, L]
        Returns:
            relevance_logits: [B, 4] 四级相关性
        """
        B, L = input_ids.shape
        positions = torch.arange(L, device=input_ids.device).unsqueeze(0).expand(B, -1)

        x = self.embedding(input_ids) + self.position_embedding(positions)

        if attention_mask is not None:
            # TransformerEncoder 的 mask 是 True=ignored
            src_key_padding_mask = ~attention_mask.bool()
        else:
            src_key_padding_mask = None

        x = self.encoder(x, src_key_padding_mask=src_key_padding_mask)

        # 取 [CLS] token (第一个位置)
        cls_output = x[:, 0, :]
        return self.relevance_head(cls_output)


class SearchRanker:
    """
    搜索排序综合框架

    Pipeline:
      1. Query Rewrite → 理解用户意图
      2. Recall (Two-Tower + FAISS) → 粗召回 500 候选
      3. Cross-Encoder Relevance → 精确相关性打分
      4. 综合排序 = α*relevance + β*ctr_pred + γ*diversity

    与推荐的区别:
      - 搜索: relevance 为主 (用户有明确意图)
      - 推荐: engagement 为主 (系统主动推)
    """

    def __init__(self):
        self.query_rewriter = QueryRewriter()
        self.intent_weights = {
            'navigational': {'relevance': 0.8, 'ctr': 0.15, 'diversity': 0.05},
            'informational': {'relevance': 0.5, 'ctr': 0.3, 'diversity': 0.2},
            'transactional': {'relevance': 0.6, 'ctr': 0.3, 'diversity': 0.1},
            'exploratory': {'relevance': 0.3, 'ctr': 0.3, 'diversity': 0.4},
        }

    def rank(self, query: str, candidates: List[Dict], user_features=None) -> List[Dict]:
        """
        搜索排序

        Args:
            query: 用户搜索词
            candidates: 召回候选 [{'item_id', 'relevance_score', 'ctr_score', ...}]
            user_features: 用户特征 (个性化)
        Returns:
            排序后的候选列表
        """
        # 1. Query 理解
        query_info = self.query_rewriter.rewrite(query)
        intent = query_info['intent']
        weights = self.intent_weights.get(intent, self.intent_weights['informational'])

        # 2. 综合打分
        for cand in candidates:
            score = (
                weights['relevance'] * cand.get('relevance_score', 0) +
                weights['ctr'] * cand.get('ctr_score', 0) +
                weights['diversity'] * cand.get('diversity_score', 0)
            )
            # 实体匹配加分
            if 'city' in query_info['entities']:
                if cand.get('city') == query_info['entities']['city']:
                    score += 0.2
            if 'category' in query_info['entities']:
                if cand.get('category') == query_info['entities']['category']:
                    score += 0.3

            cand['final_score'] = score

        # 3. 排序
        candidates.sort(key=lambda x: x['final_score'], reverse=True)
        return candidates
