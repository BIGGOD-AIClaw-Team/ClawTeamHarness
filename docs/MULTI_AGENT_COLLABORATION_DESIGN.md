# 多智能体协同配置系统 - 设计文档

> 版本: V1.0  
> 作者: 小🦊（Manager）  
> 日期: 2026-04-02  
> 状态: **待评审**

---

## 一、问题分析

### 1.1 当前BIGGOD团队的问题

根据贺老板反馈，当前系统存在以下核心问题：

| 问题 | 描述 | 影响 |
|------|------|------|
| **策略无法单独配置** | 各Agent（Andy/Cathy/Bob）的策略、提示词、工具无法独立配置 | 无法针对角色优化 |
| **协同不生效** | Agent之间没有真正协同，对话是割裂的 | 团队效率低 |
| **协商方式不明确** | 走文件还是协议？文件格式是什么？ | 协作方式混乱 |
| **无统一协调机制** | 没有Manager统一分配任务和整合结果 | 任务分配不清 |

### 1.2 当前架构缺陷

```
当前 BIGGOD 团队协作方式:
┌─────────────────────────────────────────────────────────┐
│  User → Manager(我) → 分配任务给各Agent                │
│              ↓                                          │
│    各Agent独立工作，不共享上下文                        │
│              ↓                                          │
│    结果直接返回给Manager或用户                          │
│                                                         │
│  问题: Andy/Cathy/Bob之间没有直接通信                   │
│        没有任务委派机制                                 │
│        没有结果整合流程                                 │
└─────────────────────────────────────────────────────────┘
```

### 1.3 参考系统分析

#### Claude Code 多Agent协同机制

Claude Code采用**Session-based**协同：
- 每个子任务在独立session中执行
- 通过文件系统共享状态（project context）
- 使用约定的前缀标记通信（`[TASK]`, `[RESULT]`, `[ERROR]`）
- 父Agent负责任务分发和结果聚合

#### LangGraph Multi-Agent

```python
# Supervisor模式
supervisor → 分发任务给各Agent → 收集结果 → 整合输出

# 关键组件:
- Supervisor: 负责任务分配和协调
- Agent Pool: 可复用的Agent实例
- Shared State: 通过StateGraph共享中间结果
- Handoff Protocol: Agent之间的消息传递协议
```

#### Dify/Coze Agent协同

- **Dify**: 通过工作流编排Agent协作
- **Coze**: 通过插件机制扩展Agent能力
- **共性**: 都有明确的**协商协议**和**状态管理**

---

## 二、设计方案

### 2.1 核心理念

```
多Agent协同 = 配置驱动 + 协议通信 + 状态共享

1. 配置驱动: 每个Agent有独立的策略配置
2. 协议通信: Agent之间通过标准协议传递消息
3. 状态共享: 通过共享记忆/文件同步上下文
```

### 2.2 协商方式配置

支持三种协商方式，由用户在配置中指定：

| 模式 | 描述 | 适用场景 | 配置示例 |
|------|------|----------|----------|
| **File-based** | 通过共享文件传递任务和结果 | 需要持久化、审计追踪 | `negotiation: file` |
| **Protocol-based** | 通过WebSocket/HTTP API传递消息 | 实时性要求高 | `negotiation: protocol` |
| **Hybrid** | 混合模式，文件+协议结合 | 复杂协作场景 | `negotiation: hybrid` |

### 2.3 协同架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Multi-Agent System                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐                                                   │
│  │   Manager   │ ← 任务分配、进度把控、结果汇总                    │
│  │   (小🦊)    │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                           │
│  ┌──────┴──────────────────────────────┐                           │
│  │         Negotiation Protocol        │                           │
│  │  ┌─────────┐  ┌─────────┐  ┌──────┐│                           │
│  │  │  Andy   │  │  Cathy  │  │ Bob  ││                           │
│  │  │ (PM)    │  │ (Review)│  │ (Dev)││                           │
│  │  └────┬────┘  └────┬────┘  └───┬──┘│                           │
│  └───────┼────────────┼───────────┼───┘                           │
│          │            │           │                                │
│  ┌──────┴────────────┴───────────┴──────┐                        │
│  │         Shared State / Files           │                        │
│  │  - tasks/{task_id}/                   │                        │
│  │    - brief.md (任务简报)               │                        │
│  │    - result.md (执行结果)              │                        │
│  │    - review.md (评审意见)              │                        │
│  │    - artifacts/ (产物目录)             │                        │
│  └───────────────────────────────────────┘                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 协议设计

#### 2.4.1 任务分配协议 (Task Assignment Protocol)

```yaml
# tasks/{task_id}/brief.md
task_id: "P0_FEATURES_20260402"
title: "实现RAG/Agent可交互配置功能"
priority: P0
deadline: "2026-04-07"

assignee:
  role: "andy-product-vision"
  name: "Andy"
  config:
    negotiation: file
    output_format: markdown

requirements:
  - id: "REQ-001"
    description: "支持可视化配置RAG参数"
    acceptance_criteria:
      - "可以配置向量数据库类型"
      - "可以配置Embedding模型"
  - id: "REQ-002"
    description: "支持保存和加载配置"
    acceptance_criteria:
      - "导出为JSON/YAML"
      - "可以从文件导入"

workflow:
  step_1:
    agent: "andy-product-vision"
    action: "design"
    output: "design_doc.md"
    next_step: "cathy-tech-review"
  
  step_2:
    agent: "cathy-tech-review"
    action: "review"
    input: "design_doc.md"
    output: "review_result.md"
    next_step: "bob-p0-implementation"
  
  step_3:
    agent: "bob-p0-implementation"
    action: "implement"
    input: "design_doc.md, review_result.md"
    output: "code_changes/"

created_by: "manager"
created_at: "2026-04-02T10:00:00Z"
```

#### 2.4.2 结果汇报协议 (Result Report Protocol)

```yaml
# tasks/{task_id}/results/{agent_id}_result.md
task_id: "P0_FEATURES_20260402"
agent_id: "andy-product-vision"
agent_name: "Andy"

status: "completed"  # pending | in_progress | completed | blocked

execution_summary:
  duration: "2h 30m"
  start_time: "2026-04-02T10:00:00Z"
  end_time: "2026-04-02T12:30:00Z"

outputs:
  - file: "design_doc.md"
    type: "markdown"
    description: "产品设计文档"
    lines: 856

artifacts:
  - name: "架构图"
    path: "design_doc.md#section-architecture"
    type: "image_reference"
  - name: "API设计"
    path: "design_doc.md#section-api"
    type: "yaml_snippet"

blocking_issues:
  - issue_id: "BLOCK-001"
    description: "需要确认RAG使用的向量数据库类型"
    severity: "medium"
    blocked_by: "user_decision"

next_steps:
  - "等待Cathy技术评审"
  - "根据评审意见修改设计"

signature:
  agent: "andy-product-vision"
  timestamp: "2026-04-02T12:30:00Z"
```

#### 2.4.3 评审意见协议 (Review Protocol)

```yaml
# tasks/{task_id}/reviews/{agent_id}_review.md
task_id: "P0_FEATURES_20260402"
reviewer_id: "cathy-tech-review"
reviewer_name: "Cathy"

review_context:
  artifact_under_review: "design_doc.md"
  reviewed_at: "2026-04-02T14:00:00Z"

verdict: "approved_with_suggestions"  # approved | approved_with_suggestions | rejected | needs_revision

technical_feasibility: "pass"
code_quality: "pass"
security: "pass"

comments:
  - section: "架构设计"
    line: "L45-56"
    type: "suggestion"
    content: "建议将RAG配置独立为单独的Config类，便于复用"
  
  - section: "API设计"
    line: "L120"
    type: "question"
    content: "GET /rag/config 接口返回的字段是否完整？"

suggestions:
  - priority: "high"
    description: "添加配置版本管理机制"
    rationale: "便于回滚和问题排查"
  
  - priority: "medium"
    description: "考虑增加配置导入/导出的Schema验证"
    rationale: "防止配置错误影响运行时"

required_changes:
  - description: "必须增加错误处理机制"
    rationale: "当前设计未考虑网络异常情况"

approval_token: "cathy_approve_20260402_abc123"
```

---

## 三、配置模型

### 3.1 Agent独立配置

```yaml
# agent_config_{agent_id}.yaml
agent_id: "andy-product-vision"
name: "Andy (产品设计)"
role: "product_designer"

# LLM配置（可独立设置）
llm:
  provider: "minimax"
  model: "MiniMax-M2.5"
  temperature: 0.7
  max_tokens: 8192

# 提示词配置
prompt:
  system: |
    你是一个资深产品经理，专注于AI产品设计。
    你的职责：
    1. 分析用户需求，转化为产品特性
    2. 编写清晰的产品设计文档
    3. 与技术和评审团队协作
    
    协作方式：
    - 使用 Markdown 格式输出
    - 在 /workspace/tasks/{task_id}/ 目录下管理文件
    - 完成后生成 {agent_id}_result.md 汇报
  
  output_format: "markdown"
  file_template: |
    # {title}
    
    ## 概述
    {content}
    
    ## 细节
    {details}

# 工具配置
tools:
  enabled: true
  allowed_skills:
    - "document-parsers"
    - "feishu-doc"
  mcp_servers: []
  file_workspace: "/workspace/tasks/{task_id}"

# 协同配置
collaboration:
  mode: "file_based"  # file_based | protocol_based | hybrid
  
  file_protocol:
    input_dir: "/workspace/tasks/{task_id}/inputs"
    output_dir: "/workspace/tasks/{task_id}/results/{agent_id}"
    checkpoint_dir: "/workspace/tasks/{task_id}/checkpoints"
    format: "markdown"
  
  protocol_config:
    enabled: false
    ws_endpoint: ""
    api_endpoint: ""
  
  communication:
    report_to: "manager"
    notify_on_complete: true
    notify_on_block: true

# 决策控制
decision:
  auto_critique: true
  confidence_threshold: 0.85
  ask_confirmation_threshold: 0.6

# 记忆配置
memory:
  short_term:
    max_messages: 100
  long_term:
    enabled: true
    namespace: "andy_product_designer"
```

### 3.2 团队协同配置

```yaml
# team_config_bigdog.yaml
team_id: "bigdog"
name: "BIGGOD团队"

# 协调者配置
coordinator:
  agent_id: "manager"
  name: "小🦊 (Manager)"
  role: "任务分配、进度把控、结果汇总"

# 团队成员
members:
  - agent_id: "andy-product-vision"
    name: "Andy"
    role: "产品经理"
    responsibility: "产品设计、需求分析、优先级排序"
    default_config: "agent_config_andy.yaml"
    
  - agent_id: "cathy-tech-review"
    name: "Cathy"
    role: "代码审查专家"
    responsibility: "技术可行性评审、代码质量把控"
    default_config: "agent_config_cathy.yaml"
    
  - agent_id: "bob-p0-implementation"
    name: "Bob"
    role: "高级程序员"
    responsibility: "前后端开发、代码实现"
    default_config: "agent_config_bob.yaml"
    git_identity:
      name: "Bob Dev"
      email: "zhkmxx9302025@gmail.com"

# 协同协议配置
protocol:
  negotiation_mode: "file_based"  # file_based | protocol_based | hybrid
  base_dir: "/workspace/tasks"
  
  file_protocol:
    enabled: true
    structure:
      - "{task_id}/"
        - "brief.md"
        - "design_doc.md"
        - "review.md"
        - "result.md"
        - "artifacts/"
  
  api_protocol:
    enabled: false
    endpoint: "http://localhost:8080/api"
    auth: "bearer_token"

# 工作流配置
workflow:
  type: "sequential"  # sequential | parallel | hierarchical
  
  stages:
    - name: "产品设计"
      agent: "andy-product-vision"
      input: "task_brief"
      output: "design_doc"
      next: "技术评审"
    
    - name: "技术评审"
      agent: "cathy-tech-review"
      input: "design_doc"
      output: "review_result"
      next: "开发实现"
      condition: "design_approved"
    
    - name: "开发实现"
      agent: "bob-p0-implementation"
      input: "design_doc + review_result"
      output: "code + test"
      next: null

# 质量门禁
quality_gates:
  - name: "设计评审通过"
    condition: "review_result.verdict in [approved, approved_with_suggestions]"
    blocking: true
  
  - name: "代码审查通过"
    condition: "code_review.score >= 0.8"
    blocking: true

# 通知配置
notifications:
  on_task_assigned: true
  on_task_completed: true
  on_blocked: true
  channels:
    - type: "feishu"
      webhook: "${FEISHU_WEBHOOK}"
```

---

## 四、协商流程

### 4.1 文件协商流程 (File-based)

```
1. Manager 创建任务目录
   └── tasks/P0_TASK_001/
       └── brief.md

2. Manager 分配任务给 Andy
   └── brief.md (已更新 assignee)

3. Andy 读取 brief.md，执行设计
   └── tasks/P0_TASK_001/
       ├── brief.md
       └── results/andy_result.md

4. Andy 通知 Cathy 进行评审
   └── tasks/P0_TASK_001/
       ├── design_doc.md
       └── review/cathy_review.md

5. Cathy 评审完成后通知 Bob
   └── tasks/P0_TASK_001/
       ├── design_doc.md
       ├── review/cathy_review.md
       └── bob_result.md

6. Bob 完成开发，汇报给 Manager
   └── tasks/P0_TASK_001/
       └── final_result.md

7. Manager 整合结果，通知用户
```

### 4.2 协议协商流程 (Protocol-based)

```
1. Manager → Andy: WebSocket消息
   {
     "type": "TASK_ASSIGN",
     "task_id": "P0_TASK_001",
     "assignee": "andy-product-vision",
     "requirements": [...],
     "callback_channel": "ws://manager/tasks/P0_TASK_001"
   }

2. Andy → Manager: 状态更新
   {
     "type": "STATUS_UPDATE",
     "task_id": "P0_TASK_001",
     "agent_id": "andy-product-vision",
     "status": "in_progress",
     "progress": 50,
     "ETA": "2026-04-02T15:00:00Z"
   }

3. Andy → Cathy: 评审请求
   {
     "type": "REVIEW_REQUEST",
     "task_id": "P0_TASK_001",
     "artifact": "design_doc.md",
     "callback_channel": "ws://andy/tasks/P0_TASK_001/reviews"
   }

4. Cathy → Andy: 评审结果
   {
     "type": "REVIEW_RESULT",
     "task_id": "P0_TASK_001",
     "verdict": "approved_with_suggestions",
     "comments": [...]
   }

5. 流程继续...
```

---

## 五、关键实现

### 5.1 协同引擎核心

```python
# collaboration_engine.py

from typing import Protocol, Literal
from enum import Enum
import asyncio

class NegotiationMode(Enum):
    FILE_BASED = "file_based"
    PROTOCOL_BASED = "protocol_based"
    HYBRID = "hybrid"

class CollaborationEngine:
    """
    多Agent协同引擎
    支持三种协商模式：文件、协议、混合
    """
    
    def __init__(self, config: dict):
        self.mode = NegotiationMode(config.get("negotiation_mode", "file_based"))
        self.task_dir = config.get("task_dir", "/workspace/tasks")
        
        if self.mode in [NegotiationMode.FILE_BASED, NegotiationMode.HYBRID]:
            self.file_protocol = FileProtocol(self.task_dir)
        
        if self.mode in [NegotiationMode.PROTOCOL_BASED, NegotiationMode.HYBRID]:
            self.api_protocol = ProtocolBased(self.config)
    
    async def assign_task(self, task: Task, assignee: Agent) -> TaskResult:
        """分配任务给Agent"""
        # 1. 创建任务目录结构
        task_dir = await self._setup_task_directory(task)
        
        # 2. 写入任务简报
        brief = await self._write_brief(task, assignee)
        
        # 3. 通知Agent（根据协商模式）
        if self.mode in [NegotiationMode.PROTOCOL_BASED, NegotiationMode.HYBRID]:
            await self.api_protocol.send_task(assignee, task)
        
        # 4. 返回任务信息
        return TaskResult(task_id=task.id, task_dir=task_dir, status="assigned")
    
    async def collect_result(self, agent: Agent, task: Task) -> Result:
        """收集Agent执行结果"""
        if self.mode in [NegotiationMode.FILE_BASED, NegotiationMode.HYBRID]:
            result_file = f"{task.dir}/results/{agent.id}_result.md"
            return await self.file_protocol.read_result(result_file)
        
        # Protocol-based 模式通过WebSocket收集
        return await self.api_protocol.wait_for_result(agent, task)
    
    async def orchestrate_workflow(self, workflow: Workflow) -> WorkflowResult:
        """编排多阶段工作流"""
        results = {}
        for stage in workflow.stages:
            # 1. 分配任务
            await self.assign_task(stage.task, stage.agent)
            
            # 2. 等待结果
            result = await self.collect_result(stage.agent, stage.task)
            
            # 3. 检查质量门禁
            if workflow.quality_gates:
                gate_passed = await self._check_quality_gates(result)
                if not gate_passed:
                    return WorkflowResult(status="blocked", gate_failed=...)
            
            # 4. 存储结果
            results[stage.name] = result
            
            # 5. 触发下一步（条件判断）
            if stage.next and result.condition_met:
                await self._trigger_next_stage(stage.next, results)
        
        return WorkflowResult(status="completed", results=results)
```

### 5.2 文件协议实现

```python
# file_protocol.py

import os
import aiofiles
from pathlib import Path
from typing import Optional
import yaml

class FileProtocol:
    """基于文件的协商协议"""
    
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
    
    async def setup_task_directory(self, task_id: str, structure: dict) -> Path:
        """创建任务目录结构"""
        task_dir = self.base_dir / task_id
        await self._create_directory_tree(task_dir, structure)
        return task_dir
    
    async def write_brief(self, task_dir: Path, brief: TaskBrief) -> None:
        """写入任务简报"""
        brief_file = task_dir / "brief.md"
        content = self._format_brief(brief)
        async with aiofiles.open(brief_file, 'w') as f:
            await f.write(content)
    
    async def read_result(self, result_file: Path) -> Result:
        """读取执行结果"""
        async with aiofiles.open(result_file, 'r') as f:
            content = await f.read()
        return self._parse_result(content)
    
    async def write_checkpoint(self, task_dir: Path, agent_id: str, 
                              checkpoint: Checkpoint) -> None:
        """写入检查点"""
        cp_dir = task_dir / "checkpoints" / agent_id
        cp_dir.mkdir(parents=True, exist_ok=True)
        cp_file = cp_dir / f"{checkpoint.timestamp}.yaml"
        async with aiofiles.open(cp_file, 'w') as f:
            await f.write(yaml.dump(checkpoint.to_dict()))
```

---

## 六、界面设计

### 6.1 团队配置页面

```
┌────────────────────────────────────────────────────────────────────┐
│  👥 团队配置 - BIGGOD                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ 协调者 ─────────────────────────────────────────────────────┐ │
│  │  🤖 Manager (小🦊)                                           │ │
│  │     职责: 任务分配、进度把控、结果汇总                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─ 团队成员 ───────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ 📋 Andy (产品经理)                    [配置] [启用]     │ │ │
│  │  │    职责: 产品设计、需求分析、优先级排序                  │ │ │
│  │  │    模型: MiniMax-M2.5  |  提示词: [查看]                │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ 🔍 Cathy (代码审查专家)                 [配置] [启用]     │ │ │
│  │  │    职责: 技术可行性评审、代码质量把控                    │ │ │
│  │  │    模型: MiniMax-M2.5  |  提示词: [查看]                │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ 💻 Bob (高级程序员)                     [配置] [启用]     │ │ │
│  │  │    职责: 前后端开发、代码实现                            │ │ │
│  │  │    模型: MiniMax-M2.5  |  Git: Bob Dev                  │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─ 协同协议配置 ───────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  协商模式:  ○ 文件协商  ○ 协议协商  ● 混合协商              │ │
│  │                                                                │ │
│  │  ┌─ 文件协商配置 ────────────────────────────────────────┐   │ │
│  │  │  任务目录: [/workspace/tasks            ] [浏览]       │   │ │
│  │  │  输出格式: [Markdown ▼]                                │   │ │
│  │  │  ☑ 自动创建目录结构   ☑ 版本控制                      │   │ │
│  │  └───────────────────────────────────────────────────────┘   │ │
│  │                                                                │ │
│  │  ┌─ 协议协商配置 ────────────────────────────────────────┐   │ │
│  │  │  API端点:  [http://localhost:8080/api  ]               │   │ │
│  │  │  认证方式: [Bearer Token ▼]                           │   │ │
│  │  └───────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─ 工作流配置 ───────────────────────────────────────────────┐   │
│  │                                                                │ │
│  │  工作流类型: [顺序执行 ▼]                                     │ │
│  │                                                                │ │
│  │  阶段 1: 产品设计 ──→ Andy ──→ 阶段 2                       │ │
│  │         ↓                                                    │ │
│  │  阶段 2: 技术评审 ──→ Cathy ──→ 阶段 3                      │ │
│  │         ↓ (通过)                                             │ │
│  │  阶段 3: 开发实现 ──→ Bob ──→ 完成                          │ │
│  │                                                                │ │
│  │  质量门禁: ☑ 设计评审通过   ☑ 代码审查通过                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│                                      [保存配置]  [测试协同]        │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 Agent独立配置Tab

```
┌────────────────────────────────────────────────────────────────────┐
│  🤖 Andy - 独立配置                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [基本信息] [模型] [提示词] [工具] [协同] [记忆] [决策]            │
│                                                                    │
│  ┌─ 协同配置 ───────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  协商方式: [文件协商 ▼]                                        │ │
│  │                                                                │ │
│  │  ┌─ 文件协议 ────────────────────────────────────────────┐   │ │
│  │  │  输入目录: [/workspace/tasks/{task_id}/inputs  ]      │   │ │
│  │  │  输出目录: [/workspace/tasks/{task_id}/results/andy ]  │   │ │
│  │  │  检查点目录: [/workspace/tasks/{task_id}/checkpoints ] │   │ │
│  │  │  输出格式: [Markdown ▼]                                │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                │ │
│  │  ┌─ 汇报设置 ─────────────────────────────────────────────┐   │ │
│  │  │  汇报对象: [Manager ▼]                                 │   │ │
│  │  │  ☑ 完成后自动汇报    ☑ 阻塞时自动通知                   │   │ │
│  │  │  ☑ 定期进度更新 (间隔: [30] 分钟)                      │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                │ │
│  │  ┌─ 输出模板 ─────────────────────────────────────────────┐   │ │
│  │  │  ┌──────────────────────────────────────────────────┐  │   │ │
│  │  │  │ # {title}                                        │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │ ## 执行摘要                                       │  │   │ │
│  │  │  │ - 耗时: {duration}                               │  │   │ │
│  │  │  │ - 状态: {status}                                 │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │ ## 产出物                                        │  │   │ │
│  │  │  │ {outputs}                                        │  │   │ │
│  │  │  │                                                  │  │   │ │
│  │  │  │ ## 下一步                                        │  │   │ │
│  │  │  │ {next_steps}                                     │  │   │ │
│  │  │  └──────────────────────────────────────────────────┘  │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                    │
│                                         [保存]  [重置为默认]       │
└────────────────────────────────────────────────────────────────────┘
```

---

## 七、实施计划

### Phase 1: 基础协同框架 (P0)
| 任务 | 负责人 | 验收标准 |
|------|--------|----------|
| 协同引擎核心 | Bob | 支持FILE_BASED模式 |
| 文件协议实现 | Bob | 目录创建/读写/检查点 |
| 团队配置UI | Bob | 配置页面基本功能 |

### Phase 2: 增强协同 (P1)
| 任务 | 负责人 | 验收标准 |
|------|--------|----------|
| 协议协商模式 | Bob | WebSocket消息传递 |
| 工作流编排 | Bob | 顺序/并行工作流 |
| 质量门禁 | Bob | 自动检查点验证 |

### Phase 3: 高级特性 (P2)
| 任务 | 负责人 | 验收标准 |
|------|--------|----------|
| 混合协商模式 | Bob | 文件+协议结合 |
| 实时协作界面 | Bob | 任务板/看板视图 |
| 审计日志 | Bob | 完整操作记录 |

---

## 八、待解决问题

1. **协商模式选择**: 什么时候用文件？什么时候用协议？
2. **状态一致性**: 多Agent并发修改同一文件如何处理？
3. **错误恢复**: Agent崩溃后如何恢复任务？
4. **性能优化**: 如何减少频繁的文件IO？

---

_待BIGGOD团队评审后开始开发_
