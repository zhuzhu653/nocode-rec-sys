"""
MMOE (Multi-gate Mixture-of-Experts) + PLE (Progressive Layered Extraction)
- 用途: 多目标/多任务学习 (CTR + CVR + 停留时长 + 收藏率)
- 原理: 共享专家网络 + 任务特定的门控网络, 解决多任务间的冲突
- 论文: 
  - MMOE: Modeling Task Relationships in Multi-Task Learning with MMoE (Google, KDD 2018)
  - PLE: Progressive Layered Extraction (Tencent, RecSys 2020)
- 工业应用: Google Play 应用推荐, 腾讯视频推荐

MMOE 核心:
  Input → [Expert_1, Expert_2, ..., Expert_K] (共享)
  Task_i Gate: softmax(W_gate_i @ input) → 门控权重
  Task_i Output: sum(gate_weight_k * Expert_k_output)

PLE 改进:
  - 区分 shared experts 和 task-specific experts
  - 多层提取, 避免负迁移 (negative transfer)
  - 解决 MMOE 中的 "seesaw" 现象
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class Expert(nn.Module):
    """单个专家网络"""

    def __init__(self, input_dim, expert_dim, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, expert_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(expert_dim, expert_dim),
            nn.ReLU(),
        )

    def forward(self, x):
        return self.net(x)


class MMOE(nn.Module):
    """
    MMOE 多任务学习模型
    
    任务定义 (本项目):
      - Task 1: CTR (是否点击)
      - Task 2: CVR (是否转化: 预约/购买)
      - Task 3: 停留时长 (回归)
      - Task 4: 收藏率 (是否收藏)
    """

    def __init__(self, config):
        super().__init__()
        input_dim = config['input_dim']
        num_experts = config.get('num_experts', 8)
        expert_dim = config.get('expert_dim', 128)
        num_tasks = config.get('num_tasks', 4)

        # 共享专家
        self.experts = nn.ModuleList([
            Expert(input_dim, expert_dim)
            for _ in range(num_experts)
        ])

        # 每个任务的门控网络
        self.gates = nn.ModuleList([
            nn.Linear(input_dim, num_experts)
            for _ in range(num_tasks)
        ])

        # 每个任务的 Tower (输出层)
        self.towers = nn.ModuleList([
            nn.Sequential(
                nn.Linear(expert_dim, 64),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(64, 1),
            )
            for _ in range(num_tasks)
        ])

        self.num_tasks = num_tasks

    def forward(self, x):
        """
        Args:
            x: [B, input_dim] 输入特征
        Returns:
            outputs: list of [B, 1], 每个任务的预测
        """
        # 所有专家的输出
        expert_outputs = [expert(x) for expert in self.experts]
        expert_outputs = torch.stack(expert_outputs, dim=1)  # [B, E, D]

        # 每个任务通过门控选择专家
        outputs = []
        for i in range(self.num_tasks):
            gate_score = F.softmax(self.gates[i](x), dim=-1)  # [B, E]
            gate_out = torch.bmm(
                gate_score.unsqueeze(1),  # [B, 1, E]
                expert_outputs             # [B, E, D]
            ).squeeze(1)                   # [B, D]

            task_output = self.towers[i](gate_out)
            outputs.append(task_output)

        return outputs

    def compute_loss(self, outputs, labels, weights=None):
        """
        多任务加权损失
        Args:
            outputs: list of [B, 1] 预测
            labels: list of [B] 标签
            weights: list of float, 各任务权重
        """
        if weights is None:
            weights = [1.0] * self.num_tasks

        total_loss = 0
        for i, (output, label, w) in enumerate(zip(outputs, labels, weights)):
            if i == 2:  # Task 3: 停留时长 (回归)
                loss = F.mse_loss(output.squeeze(-1), label.float())
            else:  # 分类任务
                loss = F.binary_cross_entropy_with_logits(output.squeeze(-1), label.float())
            total_loss += w * loss

        return total_loss


class PLE(nn.Module):
    """
    PLE (Progressive Layered Extraction)
    相比 MMOE 的改进:
    1. 区分 shared experts 和 task-specific experts
    2. 多层 extraction (每层都有 gate)
    3. 更好地解决任务冲突
    """

    def __init__(self, config):
        super().__init__()
        input_dim = config['input_dim']
        num_shared_experts = config.get('num_shared_experts', 4)
        num_task_experts = config.get('num_task_experts', 2)
        expert_dim = config.get('expert_dim', 128)
        num_tasks = config.get('num_tasks', 4)
        num_layers = config.get('num_extraction_layers', 2)

        self.num_tasks = num_tasks
        self.num_layers = num_layers

        # 多层 Extraction
        self.shared_experts = nn.ModuleList()
        self.task_experts = nn.ModuleList()
        self.gates = nn.ModuleList()

        for layer in range(num_layers):
            layer_input = input_dim if layer == 0 else expert_dim

            # Shared experts
            self.shared_experts.append(nn.ModuleList([
                Expert(layer_input, expert_dim)
                for _ in range(num_shared_experts)
            ]))

            # Task-specific experts
            task_expert_layer = nn.ModuleList()
            for _ in range(num_tasks):
                task_expert_layer.append(nn.ModuleList([
                    Expert(layer_input, expert_dim)
                    for _ in range(num_task_experts)
                ]))
            self.task_experts.append(task_expert_layer)

            # Gates for each task (over shared + task-specific experts)
            num_total_experts = num_shared_experts + num_task_experts
            gate_layer = nn.ModuleList([
                nn.Linear(layer_input, num_total_experts)
                for _ in range(num_tasks)
            ])
            self.gates.append(gate_layer)

        # Task towers
        self.towers = nn.ModuleList([
            nn.Sequential(
                nn.Linear(expert_dim, 64),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(64, 1),
            )
            for _ in range(num_tasks)
        ])

    def forward(self, x):
        """
        Args:
            x: [B, input_dim]
        Returns:
            outputs: list of [B, 1]
        """
        # 每个任务的当前表示
        task_inputs = [x] * self.num_tasks

        for layer in range(self.num_layers):
            next_task_inputs = []

            for task_id in range(self.num_tasks):
                task_input = task_inputs[task_id]

                # Shared expert outputs
                shared_outs = [
                    expert(task_input) for expert in self.shared_experts[layer]
                ]
                # Task-specific expert outputs
                task_outs = [
                    expert(task_input)
                    for expert in self.task_experts[layer][task_id]
                ]

                # Concat all expert outputs
                all_expert_outs = torch.stack(shared_outs + task_outs, dim=1)  # [B, E, D]

                # Gate
                gate_score = F.softmax(
                    self.gates[layer][task_id](task_input), dim=-1
                )  # [B, E]
                gated_out = torch.bmm(
                    gate_score.unsqueeze(1), all_expert_outs
                ).squeeze(1)  # [B, D]

                next_task_inputs.append(gated_out)

            task_inputs = next_task_inputs

        # Tower
        outputs = [
            self.towers[i](task_inputs[i])
            for i in range(self.num_tasks)
        ]
        return outputs


# 配置
MMOE_CONFIG = {
    'input_dim': 128,  # 特征拼接后的维度
    'num_experts': 8,
    'expert_dim': 128,
    'num_tasks': 4,  # CTR, CVR, 停留时长, 收藏
}

PLE_CONFIG = {
    'input_dim': 128,
    'num_shared_experts': 4,
    'num_task_experts': 2,
    'expert_dim': 128,
    'num_tasks': 4,
    'num_extraction_layers': 2,
}
