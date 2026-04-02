# 多Agent协同配置功能 - 产品设计文档

> 版本: **V2.0 - 采纳Cathy评审建议**  
> 产品经理: Andy  
> 日期: 2026-04-02  
> 评审: Cathy (技术评审)  
> 状态: **已修订**

---

## 变更日志

| 版本 | 日期 | 变更内容 | 评审人 |
|------|------|----------|--------|
| V1.0 | 2026-04-02 | 初始版本 | - |
| **V2.0** | 2026-04-02 | **采纳Cathy评审建议**：<br>1. Phase 1只保留File-based模式<br>2. Condition改用结构化条件（移除eval）<br>3. 增加文件锁机制<br>4. 补充TaskStateMachine状态管理<br>5. 明确Checkpoint格式 | Cathy |

---

## 一、功能概述

### 1.1 背景与问题

当前 BIGDOG 团队协作系统存在以下核心问题：

| 问题 | 现状 | 影响 |
|------|------|------|
| **策略无法单独配置** | 各 Agent 的策略、提示词、工具共用同一套配置 | 无法针对角色优化表现 |
| **协同不生效** | Agent 之间没有真正协同，对话相互割裂 | 团队效率低下 |
| **协商方式不明确** | 走文件还是协议？文件格式是什么？ | 协作方式混乱 |
| **无统一协调机制** | 没有 Manager 统一分配任务和整合结果 | 任务分配不清 |

### 1.2 解决目标

通过**多Agent协同配置**功能，实现：

1. **独立配置** - 每个 Agent 拥有独立的策略、提示词、工具配置
2. **清晰协商** - ✅ V2: Phase 1只支持文件协商，协议/混合模式延期Phase 2+
3. **明确分工** - Manager 负责任务分配，成员负责执行
4. **工作流编排** - 支持顺序、并行、分层等多种工作流模式
5. **结果汇报** - 标准化任务分配和结果汇报机制

### 1.3 目标用户

- **团队管理员**: 配置团队成员、协商模式、工作流
- **Agent (执行者)**: 按配置执行任务，汇报结果
- **最终用户**: 发起任务请求，接收整合后的结果

---

## 二、核心功能详解

### 2.1 协商模式选择

> ⚠️ **V2 更新**：根据Cathy评审建议，**Phase 1只保留File-based模式**，Protocol-based和Hybrid模式调整至Phase 2+。

#### 2.1.1 协商模式规划

| 模式 | Phase | 描述 | 状态 |
|------|-------|------|------|
| **文件协商** | **Phase 1** | 通过共享文件传递任务和结果 | ✅ 开发中 |
| **协议协商** | Phase 2+ | 通过 WebSocket/HTTP API 实时传递消息 | ⏳ 待开发 |
| **混合协商** | Phase 2+ | 文件+协议结合，文件持久化+协议通知 | ⏳ 待开发 |

#### 2.1.2 Phase 1 协商模式配置界面

```
协商模式配置:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ● 文件协商 (File-based) [Phase 1]                      │
│    └─ 通过共享文件系统传递任务和结果                     │
│    └─ 稳定可靠，适合持久化和审计追踪                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ○ 协议协商 (Protocol-based) [Phase 2+]                 │
│    └─ 通过 WebSocket/HTTP API 实时通信                  │
│    └─ ⚠️ 需要WebSocket服务基础设施                      │
│                                                         │
│  ○ 混合协商 (Hybrid) [Phase 2+]                         │
│    └─ 文件持久化 + 协议实时通知                         │
│    └─ ⚠️ 配置复杂，依赖协议服务                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2.1.3 文件协商配置项

| 配置项 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| `base_dir` | string | 任务根目录 | `/workspace/tasks` |
| `input_format` | enum | 输入文件格式 | `markdown/yaml/json` |
| `output_format` | enum | 输出文件格式 | `markdown/yaml/json` |
| `checkpoint_enabled` | boolean | 是否启用检查点 | `true` |
| `file_lock_enabled` | boolean | 是否启用文件锁 | `true` |

#### 2.1.4 ⚠️ Phase 2+ 待开发功能（Phase 1暂不实现）

**协议协商配置项（Phase 2+）：**
- `ws_endpoint`: WebSocket 端点
- `api_endpoint`: HTTP API 端点
- `auth_type`: 认证方式 (bearer_token/api_key)
- `heartbeat_interval`: 心跳间隔 (秒)
- **⚠️ 风险**：需要独立的WebSocket服务，存在单点故障风险

**混合协商配置项（Phase 2+）：**
- 包含文件协商所有配置项
- 包含协议协商所有配置项
- `notify_on_file_change`: 文件变化时是否通过协议通知

---

### 2.2 团队配置 (Manager + 成员)

#### 2.2.1 团队角色定义

```
┌─────────────────────────────────────────────────────────────┐
│                        团队组织结构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ┌───────────┐                        │
│                        │  Manager  │                        │
│                        │  (协调者)  │                        │
│                        └─────┬─────┘                        │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              │               │               │              │
│        ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐        │
│        │   Andy    │   │   Cathy   │   │    Bob    │        │
│        │  (PM)     │   │  (Review) │   │   (Dev)   │        │
│        └───────────┘   └───────────┘   └───────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.2 Manager 职责

| 职责 | 描述 |
|------|------|
| **任务分配** | 将用户请求拆解为子任务，分配给合适的 Agent |
| **进度把控** | 跟踪任务状态，处理阻塞和超时 |
| **结果汇总** | 收集各 Agent 执行结果，整合输出给用户 |
| **质量把控** | 检查质量门禁，决定是否继续工作流 |

#### 2.2.3 成员 Agent 职责

每个成员 Agent 需要配置:

| 配置项 | 描述 | 示例 |
|--------|------|------|
| `agent_id` | 唯一标识符 | `andy-product-vision` |
| `name` | 显示名称 | `Andy` |
| `role` | 角色类型 | `product_designer` |
| `responsibility` | 职责描述 | `产品设计、需求分析` |
| `enabled` | 是否启用 | `true/false` |
| `config_file` | 关联的配置文件 | `agent_config_andy.yaml` |

#### 2.2.4 团队配置界面

```
┌──────────────────────────────────────────────────────────────────────┐
│  👥 团队配置                                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 协调者 (Manager) ─────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │   🤖 小🦊 (Manager)                                              │ │
│  │   职责: 任务分配、进度把控、结果汇总                               │ │
│  │   模型: [MiniMax-M2.5 ▼]                                        │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 团队成员 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────┐    │ │
│  │  │ 📋 Andy (产品经理)                      [编辑] [启用] │    │ │
│  │  │                                                    ○    │    │ │
│  │  │    职责: 产品设计、需求分析、优先级排序                  │    │ │
│  │  │    模型: MiniMax-M2.5  |  提示词: [查看]  [编辑]        │    │ │
│  │  │    配置文件: agent_config_andy.yaml                    │    │ │
│  │  └────────────────────────────────────────────────────────┘    │ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────┐    │ │
│  │  │ 🔍 Cathy (代码审查专家)                  [编辑] [启用] │    │ │
│  │  │                                                    ○    │    │ │
│  │  │    职责: 技术可行性评审、代码质量把控                    │    │ │
│  │  │    模型: MiniMax-M2.5  |  提示词: [查看]  [编辑]        │    │ │
│  │  │    配置文件: agent_config_cathy.yaml                    │    │ │
│  │  └────────────────────────────────────────────────────────┘    │ │
│  │                                                                  │ │
│  │  ┌────────────────────────────────────────────────────────┐    │ │
│  │  │ 💻 Bob (高级程序员)                      [编辑] [启用] │    │ │
│  │  │                                                    ○    │    │ │
│  │  │    职责: 前后端开发、代码实现                            │    │ │
│  │  │    模型: MiniMax-M2.5  |  提示词: [查看]  [编辑]        │    │ │
│  │  │    Git: Bob Dev <zhkmxx9302025@gmail.com>              │    │ │
│  │  └────────────────────────────────────────────────────────┘    │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ 添加成员]                                             [保存配置]  │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 工作流编排

#### 2.3.1 工作流类型

| 类型 | 描述 | 流程图 | Phase |
|------|------|--------|-------|
| **顺序执行** | 任务按阶段顺序执行，前一阶段完成后才开始下一阶段 | A → B → C → D | Phase 1 |
| **并行执行** | 多个任务同时执行，适用于相互独立的任务 | A / B / C (同时) | Phase 1 |
| **分层执行** | Supervisor 模式，Supervisor 协调多个子 Agent | Supervisor → A, B, C | Phase 2 |

#### 2.3.2 顺序执行工作流

```
用户请求
    │
    ▼
┌─────────────────┐
│  阶段1: 产品设计 │
│    (Andy)        │
└────────┬────────┘
         │ 设计文档完成
         ▼
┌─────────────────┐
│  阶段2: 技术评审 │
│   (Cathy)        │
└────────┬────────┘
         │ 评审通过
         ▼
┌─────────────────┐
│  阶段3: 开发实现 │
│    (Bob)         │
└────────┬────────┘
         │
         ▼
      用户结果
```

#### 2.3.3 并行执行工作流

```
用户请求
    │
    ├──────────────────┬──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌────────┐      ┌────────┐      ┌────────┐
│ 任务A  │      │ 任务B  │      │ 任务C  │
│ (Andy) │      │(Cathy) │      │ (Bob)  │
└───┬────┘      └───┬────┘      └───┬────┘
    │              │              │
    └──────────────┼──────────────┘
                   ▼
            ┌─────────────┐
            │ 结果汇总    │
            │ (Manager)   │
            └─────────────┘
                   │
                   ▼
               用户结果
```

#### 2.3.4 工作流配置界面

```
┌──────────────────────────────────────────────────────────────────────┐
│  工作流编排                                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  工作流类型: [顺序执行 ▼]    [并行执行]   [分层执行 - Phase 2+]        │
│                                                                       │
│  ┌─ 阶段配置 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  阶段 1: 产品设计 ──────────────────────────────────────────   │ │
│  │  ├─ 执行者: [Andy ▼]                                            │ │
│  │  ├─ 输入: [任务简报 brief.md]                                   │ │
│  │  ├─ 输出: [设计文档 design_doc.md]                              │ │
│  │  ├─ 条件: [无 ▼]                                               │ │
│  │  └─ 下一阶段: [技术评审 ──→]                                    │ │
│  │                                                                  │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │                                                                  │ │
│  │  阶段 2: 技术评审 ──────────────────────────────────────────   │ │
│  │  ├─ 执行者: [Cathy ▼]                                           │ │
│  │  ├─ 输入: [design_doc.md]                                       │ │
│  │  ├─ 输出: [review_result.md]                                    │ │
│  │  ├─ 条件: [评审通过 ▼]                                          │ │
│  │  └─ 下一阶段: [开发实现 ──→]                                    │ │
│  │                                                                  │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │                                                                  │ │
│  │  阶段 3: 开发实现 ──────────────────────────────────────────   │ │
│  │  ├─ 执行者: [Bob ▼]                                             │ │
│  │  ├─ 输入: [design_doc.md, review_result.md]                    │ │
│  │  ├─ 输出: [code_changes/]                                       │ │
│  │  ├─ 条件: [无 ▼]                                                │ │
│  │  └─ 下一阶段: [结束]                                            │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 质量门禁 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  ☑ 阶段1完成后必须评审通过才能进入阶段2                         │ │
│  │  ☑ 阶段2评审意见为 approved 或 approved_with_suggestions        │ │
│  │  ☑ 阶段3完成后自动执行代码质量检查                              │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ 添加阶段]  [- 删除阶段]                    [保存工作流]          │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 2.4 任务分配与结果汇报

#### 2.4.1 任务分配流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      任务分配流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 用户发起请求                                                  │
│     │                                                           │
│     ▼                                                           │
│  2. Manager 解析请求，创建任务                                   │
│     │                                                           │
│     ▼                                                           │
│  3. Manager 生成任务简报 (brief.md)                              │
│     │                                                           │
│     ▼                                                           │
│  4. Manager 分配任务给目标 Agent                                 │
│     │                                                           │
│     ▼                                                           │
│  5. Agent 接收任务，开始执行                                     │
│     │                                                           │
│     ▼                                                           │
│  6. Agent 定期更新进度 (checkpoint)                             │
│     │                                                           │
│     ▼                                                           │
│  7. Agent 执行完成，生成结果文件                                  │
│     │                                                           │
│     ▼                                                           │
│  8. Agent 通知 Manager 执行完成                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.4.2 任务简报 (Task Brief) 格式

```yaml
# tasks/{task_id}/brief.md
task_id: "P0_FEATURES_20260402"
title: "实现RAG/Agent可交互配置功能"
priority: P0
deadline: "2026-04-07"

assignee:
  agent_id: "andy-product-vision"
  name: "Andy"
  config_file: "agent_config_andy.yaml"

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
  type: "sequential"
  stages:
    - name: "产品设计"
      agent: "andy-product-vision"
      input: "brief.md"
      output: "design_doc.md"
      next: "技术评审"
    
    - name: "技术评审"
      agent: "cathy-tech-review"
      input: "design_doc.md"
      output: "review_result.md"
      next: null

created_by: "manager"
created_at: "2026-04-02T10:00:00Z"
```

#### 2.4.3 结果汇报格式

```yaml
# tasks/{task_id}/results/{agent_id}_result.md
task_id: "P0_FEATURES_20260402"
agent_id: "andy-product-vision"
agent_name: "Andy"

status: "completed"

execution_summary:
  duration: "2h 30m"
  start_time: "2026-04-02T10:00:00Z"
  end_time: "2026-04-02T12:30:00Z"

outputs:
  - file: "design_doc.md"
    type: "markdown"
    description: "产品设计文档"
    lines: 856
    path: "tasks/P0_FEATURES_20260402/design_doc.md"

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

#### 2.4.4 任务分配界面

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 任务分配                                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  任务简报:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  任务标题: [实现RAG/Agent可交互配置功能                    ]   │ │
│  │                                                                 │ │
│  │  优先级:   [P0 ▼]    截止日期: [2026-04-07 ▼]                 │ │
│  │                                                                 │ │
│  │  执行者:   [Andy ▼]                                            │ │
│  │                                                                 │ │
│  │  详细描述:                                                      │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │                                                          │ │ │
│  │  │  1. 支持可视化配置RAG参数                                  │ │ │
│  │  │  2. 支持保存和加载配置                                      │ │ │
│  │  │  3. 支持导出为JSON/YAML                                    │ │ │
│  │  │                                                          │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                                                                 │ │
│  │  工作流:   [顺序执行 ▼]                                         │ │
│  │                                                                 │ │
│  │  阶段1: Andy (产品设计)                                         │ │
│  │    输入: brief.md → 输出: design_doc.md                         │ │
│  │                                                                 │ │
│  │  阶段2: Cathy (技术评审)                                         │ │
│  │    输入: design_doc.md → 输出: review_result.md                 │ │
│  │                                                                 │ │
│  │  阶段3: Bob (开发实现)                                          │ │
│  │    输入: design_doc.md, review_result.md → 输出: code/         │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│                                        [取消]  [创建并分配任务]        │
└──────────────────────────────────────────────────────────────────────┘
```

#### 2.4.5 结果汇报界面

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 任务执行结果 - P0_FEATURES_20260402                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  执行者: Andy (产品经理)                           状态: ✅ 已完成    │
│  耗时: 2h 30m                                    完成时间: 12:30     │
│                                                                       │
│  ┌─ 执行摘要 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  开始时间: 2026-04-02 10:00:00                                   │ │
│  │  结束时间: 2026-04-02 12:30:00                                   │ │
│  │  执行时长: 2小时30分钟                                           │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 产出物 ───────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  📄 design_doc.md (856行)                                       │ │
│  │     产品设计文档，包含架构设计、API设计、界面设计                 │ │
│  │     [查看] [下载] [编辑]                                         │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 阻塞问题 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  ⚠️ BLOCK-001: 需要确认RAG使用的向量数据库类型                   │ │
│  │     严重性: 中                                                   │ │
│  │     阻塞: 用户决策                                               │ │
│  │     [标记已解决] [转发给用户]                                    │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 下一步 ───────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  1. 等待Cathy技术评审                                            │ │
│  │  2. 根据评审意见修改设计                                         │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [查看完整日志]              [接受结果]  [要求修改]  [转发给下一步]    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、数据结构

### 3.1 Agent 独立配置 YAML 结构

```yaml
# agent_config_{agent_id}.yaml

# ============================================================
# 基本信息
# ============================================================
agent_id: "andy-product-vision"
name: "Andy (产品设计)"
role: "product_designer"
description: "资深产品经理，专注于AI产品设计"
enabled: true

# ============================================================
# LLM 配置
# ============================================================
llm:
  provider: "minimax"           # minimax / openai / anthropic / local
  model: "MiniMax-M2.5"
  temperature: 0.7
  max_tokens: 8192
  top_p: 0.95
  timeout: 120                  # 超时时间（秒）

# ============================================================
# 提示词配置
# ============================================================
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
  
  user_template: |
    ## 任务
    {task_description}
    
    ## 要求
    {requirements}
    
    ## 约束
    {constraints}
  
  output_format: "markdown"
  
  file_template: |
    # {title}
    
    ## 概述
    {content}
    
    ## 细节
    {details}

# ============================================================
# 工具配置
# ============================================================
tools:
  enabled: true
  
  allowed_skills:
    - "document-parsers"
    - "feishu-doc"
    - "ima-note"
  
  mcp_servers: []
  
  file_workspace: "/workspace/tasks/{task_id}"
  
  allowed_operations:
    - "read"
    - "write"
    - "edit"
    - "exec"
    - "web_search"
    - "web_fetch"

# ============================================================
# 协同配置
# ============================================================
collaboration:
  # V2: Phase 1 只支持 file_based
  mode: "file_based"            # file_based (Phase 1 only)
  
  # 文件协议配置
  file_protocol:
    enabled: true
    input_dir: "/workspace/tasks/{task_id}/inputs"
    output_dir: "/workspace/tasks/{task_id}/results/{agent_id}"
    checkpoint_dir: "/workspace/tasks/{task_id}/checkpoints/{agent_id}"
    format: "markdown"          # markdown / yaml / json
    # V2: 文件锁配置
    file_lock:
      enabled: true
      lock_timeout: 30          # 锁超时时间（秒）
      retry_interval: 2         # 重试间隔（秒）
      max_retries: 5            # 最大重试次数
  
  # V2: 协议配置 - Phase 2+ 实现，Phase 1 禁用
  protocol_config:
    enabled: false
    ws_endpoint: ""
    api_endpoint: ""
    auth_type: "bearer_token"
    heartbeat_interval: 30
  
  # 通信配置
  communication:
    report_to: "manager"
    notify_on_complete: true
    notify_on_block: true
    progress_update_interval: 30    # 分钟
    notify_channels:
      - "feishu"

# ============================================================
# 决策配置
# ============================================================
decision:
  auto_critique: true           # 自动自我批评
  confidence_threshold: 0.85   # 置信度阈值
  ask_confirmation_threshold: 0.6   # 需要确认的阈值
  
  # 需要确认的决策类型
  confirm_on:
    - "删除文件"
    - "执行外部命令"
    - "修改配置文件"
    - "发送外部消息"

# ============================================================
# 记忆配置
# ============================================================
memory:
  short_term:
    enabled: true
    max_messages: 100
    max_tokens: 50000
  
  long_term:
    enabled: true
    namespace: "andy_product_designer"
    retrieval_top_k: 10

# ============================================================
# 输出配置
# ============================================================
output:
  format: "markdown"
  
  # 结果文件模板
  result_template:
    header: |
      # 任务执行结果
      task_id: {task_id}
      agent: {agent_id}
      status: {status}
      
      ## 执行摘要
      - 耗时: {duration}
      - 开始: {start_time}
      - 结束: {end_time}
    
    outputs_section: |
      ## 产出物
      {outputs_list}
    
    issues_section: |
      ## 阻塞问题
      {issues_list}
    
    next_steps_section: |
      ## 下一步
      {next_steps_list}
  
  # 产物目录
  artifacts_dir: "/workspace/tasks/{task_id}/artifacts"

# ============================================================
# 质量配置
# ============================================================
quality:
  self_review: true             # 执行前自我审查
  checklist:
    - "是否覆盖了所有需求？"
    - "是否有遗漏的边界情况？"
    - "输出格式是否符合要求？"
    - "是否需要评审？"
```

### 3.2 团队配置 YAML 结构

```yaml
# team_config_{team_id}.yaml

# ============================================================
# 团队基本信息
# ============================================================
team_id: "bigdog"
name: "BIGDOG团队"
description: "AI产品开发团队，包含产品、设计、开发、评审角色"

# ============================================================
# 协调者配置
# ============================================================
coordinator:
  agent_id: "manager"
  name: "小🦊 (Manager)"
  role: "task_coordinator"
  description: "任务分配、进度把控、结果汇总"

# ============================================================
# 团队成员
# ============================================================
members:
  - agent_id: "andy-product-vision"
    name: "Andy"
    role: "product_manager"
    responsibility: "产品设计、需求分析、优先级排序"
    enabled: true
    default_config: "agent_config_andy.yaml"
    capabilities:
      - "product_design"
      - "requirement_analysis"
      - "documentation"
  
  - agent_id: "cathy-tech-review"
    name: "Cathy"
    role: "code_reviewer"
    responsibility: "技术可行性评审、代码质量把控"
    enabled: true
    default_config: "agent_config_cathy.yaml"
    capabilities:
      - "code_review"
      - "technical_feasibility"
      - "security_audit"
    git_identity:
      name: "Cathy Review"
      email: "cathy@review.com"
  
  - agent_id: "bob-p0-implementation"
    name: "Bob"
    role: "software_engineer"
    responsibility: "前后端开发、代码实现"
    enabled: true
    default_config: "agent_config_bob.yaml"
    capabilities:
      - "frontend_development"
      - "backend_development"
      - "testing"
      - "deployment"
    git_identity:
      name: "Bob Dev"
      email: "zhkmxx9302025@gmail.com"

# ============================================================
# 协同协议配置
# ============================================================
protocol:
  negotiation_mode: "file_based"    # V2: Phase 1 only file_based
  
  base_dir: "/workspace/tasks"
  
  file_protocol:
    enabled: true
    structure:
      "{task_id}/":
        - "brief.md"
        - "inputs/"
        - "design_doc.md"
        - "review/"
        - "results/"
        - "checkpoints/"
        - "artifacts/"
    # V2: 文件锁配置
    file_lock:
      enabled: true
      lock_dir: "/workspace/tasks/{task_id}/.locks"
      lock_timeout: 30
      retry_interval: 2
  
  # V2: Phase 2+ 实现
  api_protocol:
    enabled: false
    endpoint: "http://localhost:8080/api"
    auth: "bearer_token"
    timeout: 60

# ============================================================
# 工作流配置
# ============================================================
workflow:
  type: "sequential"             # sequential / parallel / hierarchical
  
  stages:
    - name: "产品设计"
      agent: "andy-product-vision"
      input: "task_brief"
      output: "design_doc.md"
      next_stage: "技术评审"
      # V2: 使用结构化条件，不再使用 eval()
      condition: null
    
    - name: "技术评审"
      agent: "cathy-tech-review"
      input: "design_doc.md"
      output: "review_result.md"
      next_stage: "开发实现"
      # V2: 结构化条件表达式
      condition:
        type: "field_match"
        field: "review_result.verdict"
        operator: "in"
        value: ["approved", "approved_with_suggestions"]
    
    - name: "开发实现"
      agent: "bob-p0-implementation"
      input: "design_doc.md, review_result.md"
      output: "code/"
      next_stage: null
      condition: null

# ============================================================
# 质量门禁
# ============================================================
quality_gates:
  - name: "设计评审通过"
    stage: "技术评审"
    # V2: 结构化条件，不再使用 eval()
    condition:
      type: "field_match"
      field: "review_result.verdict"
      operator: "in"
      value: ["approved", "approved_with_suggestions"]
    blocking: true
    retry_enabled: false
  
  - name: "代码审查通过"
    stage: "开发实现"
    condition:
      type: "comparison"
      field: "code_review.score"
      operator: ">="
      value: 0.8
    blocking: true
    retry_enabled: true
    max_retries: 3
```

### 3.3 任务配置 YAML 结构

```yaml
# tasks/{task_id}/task_config.yaml

task_id: "P0_FEATURES_20260402"
team_id: "bigdog"

metadata:
  title: "实现RAG/Agent可交互配置功能"
  description: "支持用户通过界面配置RAG参数和Agent行为"
  priority: "P0"
  deadline: "2026-04-07T23:59:59Z"
  tags:
    - "feature"
    - "rag"
    - "agent-config"
  created_by: "user"
  created_at: "2026-04-02T10:00:00Z"

# 执行配置
execution:
  workflow_type: "sequential"
  continue_on_block: false
  
  stages:
    - stage_id: "stage_1"
      name: "产品设计"
      agent_id: "andy-product-vision"
      status: "pending"
      input_files: ["brief.md"]
      output_files: ["design_doc.md"]
      timeout: 3600              # 秒
      retry: 0
    
    - stage_id: "stage_2"
      name: "技术评审"
      agent_id: "cathy-tech-review"
      status: "pending"
      input_files: ["design_doc.md"]
      output_files: ["review_result.md"]
      timeout: 1800
      retry: 1
      # V2: 结构化条件
      condition:
        type: "field_match"
        field: "stage_1.status"
        operator: "=="
        value: "completed"
    
    - stage_id: "stage_3"
      name: "开发实现"
      agent_id: "bob-p0-implementation"
      status: "pending"
      input_files: ["design_doc.md", "review_result.md"]
      output_files: ["code/"]
      timeout: 7200
      retry: 2
      # V2: 结构化条件
      condition:
        type: "field_match"
        field: "stage_2.verdict"
        operator: "in"
        value: ["approved", "approved_with_suggestions"]

# 状态跟踪
status:
  current_stage: "stage_1"
  overall_status: "in_progress"   # pending / in_progress / completed / blocked / failed
  started_at: null
  completed_at: null
  blocked_at: null
  blocked_reason: null

# 结果汇总
results:
  stage_1:
    agent_id: "andy-product-vision"
    status: "completed"
    output_files: ["design_doc.md"]
    completed_at: "2026-04-02T12:30:00Z"
  
  stage_2:
    agent_id: "cathy-tech-review"
    status: "pending"
    output_files: []
    completed_at: null
  
  stage_3:
    agent_id: "bob-p0-implementation"
    status: "pending"
    output_files: []
    completed_at: null

# 审计日志
audit_log:
  - event: "task_created"
    timestamp: "2026-04-02T10:00:00Z"
    actor: "user"
  
  - event: "stage_started"
    timestamp: "2026-04-02T10:05:00Z"
    actor: "manager"
    stage: "stage_1"
```

---

## 四、TaskStateMachine 状态管理 (V2 新增)

> ⚠️ **V2 新增**：根据Cathy评审建议，补充任务状态机设计。

### 4.1 状态定义

| 状态 | 描述 | 可转换到 |
|------|------|----------|
| `pending` | 任务已创建，等待执行 | `running`, `cancelled` |
| `running` | 任务正在执行中 | `completed`, `blocked`, `failed`, `cancelled` |
| `blocked` | 任务被阻塞，等待外部解决 | `running`, `cancelled` |
| `completed` | 任务成功完成 | - |
| `failed` | 任务执行失败 | `pending` (重试) |
| `cancelled` | 任务被取消 | - |

### 4.2 状态转换图

```
                    ┌──────────────┐
                    │   pending    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │ running  │ │ cancelled│ │ (其他)    │
        └────┬─────┘ └──────────┘ └───────────┘
             │
    ┌─────────┼─────────┬──────────┐
    │         │         │          │
    ▼         ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌───────────┐
│completed│ │ blocked│ │ failed │ │ cancelled │
└────────┘ └────┬───┘ └────────┘ └───────────┘
                │
                ▼
           (解决后) ──→ running
```

### 4.3 阶段状态定义

| 阶段状态 | 描述 |
|----------|------|
| `pending` | 阶段等待执行 |
| `waiting_condition` | 等待前置条件满足 |
| `running` | 阶段执行中 |
| `completed` | 阶段完成 |
| `skipped` | 阶段被跳过（条件不满足） |
| `failed` | 阶段失败 |

### 4.4 TaskStateMachine 类设计

```python
# TaskStateMachine 状态机实现

from enum import Enum
from typing import Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class StageStatus(Enum):
    PENDING = "pending"
    WAITING_CONDITION = "waiting_condition"
    RUNNING = "running"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

@dataclass
class Transition:
    from_status: TaskStatus
    to_status: TaskStatus
    guard: Optional[Callable] = None
    action: Optional[Callable] = None

class TaskStateMachine:
    """
    任务状态机 - 管理任务生命周期
    V2: 移除 eval()，使用结构化条件判断
    """
    
    # 定义合法的状态转换
    TRANSITIONS: dict[TaskStatus, list[TaskStatus]] = {
        TaskStatus.PENDING: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
        TaskStatus.RUNNING: [TaskStatus.COMPLETED, TaskStatus.BLOCKED, 
                             TaskStatus.FAILED, TaskStatus.CANCELLED],
        TaskStatus.BLOCKED: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
        TaskStatus.FAILED: [TaskStatus.PENDING],  # 可重试
        TaskStatus.COMPLETED: [],  # 终态
        TaskStatus.CANCELLED: [],   # 终态
    }
    
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = TaskStatus.PENDING
        self.current_stage: Optional[str] = None
        self.stage_statuses: dict[str, StageStatus] = {}
        self.history: list[dict] = []
        self.blocked_reason: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
    
    def can_transition(self, to: TaskStatus) -> bool:
        """检查是否可以转换到目标状态"""
        return to in self.TRANSITIONS.get(self.status, [])
    
    def transition(self, to: TaskStatus, reason: Optional[str] = None) -> bool:
        """
        执行状态转换
        V2: 不再使用 eval()，通过结构化条件判断
        """
        if not self.can_transition(to):
            raise InvalidTransitionError(
                f"Cannot transition from {self.status} to {to}"
            )
        
        old_status = self.status
        self.status = to
        
        # 记录历史
        self.history.append({
            "from": old_status.value,
            "to": to.value,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        })
        
        # 更新 timestamps
        if to == TaskStatus.RUNNING and self.started_at is None:
            self.started_at = datetime.now()
        if to in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            self.completed_at = datetime.now()
        
        # 执行转换动作
        self._execute_transition_action(old_status, to)
        
        return True
    
    def _execute_transition_action(self, from_s: TaskStatus, to: TaskStatus):
        """执行状态转换时的动作"""
        if to == TaskStatus.BLOCKED:
            # 记录阻塞原因
            pass
        elif to == TaskStatus.COMPLETED:
            # 触发完成事件
            self._on_completed()
    
    def _on_completed(self):
        """任务完成时的处理"""
        pass
    
    # V2: 结构化条件评估（不使用 eval）
    def evaluate_condition(self, condition: dict) -> bool:
        """
        评估结构化条件
        V2: 移除 eval()，使用安全的条件评估
        """
        cond_type = condition.get("type")
        
        if cond_type == "field_match":
            return self._eval_field_match(condition)
        elif cond_type == "comparison":
            return self._eval_comparison(condition)
        elif cond_type == "and":
            return all(self.evaluate_condition(c) for c in condition["conditions"])
        elif cond_type == "or":
            return any(self.evaluate_condition(c) for c in condition["conditions"])
        elif cond_type == "not":
            return not self.evaluate_condition(condition["condition"])
        
        return False
    
    def _eval_field_match(self, condition: dict) -> bool:
        """评估字段匹配条件"""
        field_path = condition["field"]
        operator = condition["operator"]
        expected = condition["value"]
        
        # 获取字段值
        actual = self._get_field_value(field_path)
        
        if operator == "==":
            return actual == expected
        elif operator == "!=":
            return actual != expected
        elif operator == "in":
            return actual in expected
        elif operator == "not_in":
            return actual not in expected
        
        raise ValueError(f"Unknown operator: {operator}")
    
    def _eval_comparison(self, condition: dict) -> bool:
        """评估比较条件"""
        field_path = condition["field"]
        operator = condition["operator"]
        expected = condition["value"]
        
        actual = self._get_field_value(field_path)
        
        if operator == ">":
            return actual > expected
        elif operator == ">=":
            return actual >= expected
        elif operator == "<":
            return actual < expected
        elif operator == "<=":
            return actual <= expected
        
        raise ValueError(f"Unknown operator: {operator}")
    
    def _get_field_value(self, field_path: str):
        """获取嵌套字段值"""
        parts = field_path.split(".")
        
        if parts[0] == "stage_1":
            stage_id = parts[0]
            field_name = parts[1] if len(parts) > 1 else "status"
            # 返回对应阶段的状态或结果
            return self.stage_statuses.get(stage_id, StageStatus.PENDING).value
        elif parts[0] == "review_result":
            # 从阶段结果中获取
            pass
        
        return None

class InvalidTransitionError(Exception):
    """无效的状态转换异常"""
    pass
```

---

## 五、Checkpoint 格式定义 (V2 明确)

> ⚠️ **V2 新增**：明确 Checkpoint 格式，用于任务进度保存和恢复。

### 5.1 Checkpoint 文件结构

```
tasks/{task_id}/
├── checkpoints/
│   └── {agent_id}/
│       ├── _checkpoint_001.yaml      # 检查点 #1
│       ├── _checkpoint_002.yaml      # 检查点 #2
│       └── _checkpoint_latest.yaml   # 最新检查点（软链接）
```

### 5.2 Checkpoint 格式

```yaml
# tasks/{task_id}/checkpoints/{agent_id}/_checkpoint_{seq}.yaml

checkpoint_id: "cp_20260402_001"
task_id: "P0_FEATURES_20260402"
agent_id: "andy-product-vision"

# 序列号
sequence: 1

# 检查点时间
created_at: "2026-04-02T10:15:00Z"

# 当前执行状态
execution:
  stage: "stage_1"
  phase: "architecture_design"
  progress: 45                    # 百分比
  last_action: "编写架构设计章节"
  
# 上下文快照
context:
  # 已完成的工作
  completed:
    - section: "概述"
      lines: "1-50"
    - section: "需求分析"
      lines: "51-120"
  
  # 进行中的工作
  in_progress:
    section: "架构设计"
    content_start_line: 121
    last_modified: "2026-04-02T10:14:30Z"
  
  # 待完成的工作
  pending:
    - section: "API设计"
    - section: "数据模型"
    - section: "界面设计"

# 检查点元数据
metadata:
  # 文件锁信息
  file_locks:
    - file: "design_doc.md"
      locked_by: "andy-product-vision"
      locked_at: "2026-04-02T10:00:00Z"
      lock_id: "lock_design_doc_001"
  
  # 检查点大小
  size_bytes: 4096
  
  # 上一个检查点
  previous: null
  
  # 下一个检查点
  next: "cp_20260402_002"

# 恢复指令
recovery:
  # 从哪个文件恢复
  restore_from: "design_doc.md"
  # 恢复到哪一行
  restore_to_line: 121
  # 是否需要重新生成
  regenerate: false
```

### 5.3 Checkpoint 管理接口

```python
class CheckpointManager:
    """检查点管理器"""
    
    def __init__(self, checkpoint_dir: str):
        self.checkpoint_dir = checkpoint_dir
        self.latest_link = "_checkpoint_latest.yaml"
    
    def create_checkpoint(
        self,
        task_id: str,
        agent_id: str,
        execution_state: dict,
        context: dict
    ) -> str:
        """
        创建新的检查点
        返回检查点ID
        """
        seq = self._get_next_sequence(task_id, agent_id)
        checkpoint_id = f"cp_{datetime.now().strftime('%Y%m%d')}_{seq:03d}"
        
        # V2: 使用文件锁保护检查点文件写入
        lock_file = f"{self.checkpoint_dir}/.{checkpoint_id}.lock"
        with FileLock(lock_file, timeout=30):
            checkpoint_data = {
                "checkpoint_id": checkpoint_id,
                "task_id": task_id,
                "agent_id": agent_id,
                "sequence": seq,
                "created_at": datetime.now().isoformat(),
                "execution": execution_state,
                "context": context,
            }
            
            checkpoint_path = f"{self.checkpoint_dir}/{checkpoint_id}.yaml"
            self._write_yaml(checkpoint_path, checkpoint_data)
            
            # 更新 latest 软链接
            self._update_latest_link(checkpoint_path)
        
        return checkpoint_id
    
    def get_latest_checkpoint(self, task_id: str, agent_id: str) -> Optional[dict]:
        """获取最新的检查点"""
        latest_path = f"{self.checkpoint_dir}/{self.latest_link}"
        if os.path.exists(latest_path):
            return self._read_yaml(latest_path)
        return None
    
    def restore_from_checkpoint(self, checkpoint_id: str) -> dict:
        """从检查点恢复"""
        checkpoint_path = f"{self.checkpoint_dir}/{checkpoint_id}.yaml"
        return self._read_yaml(checkpoint_path)
```

---

## 六、文件锁机制 (V2 新增)

> ⚠️ **V2 新增**：根据Cathy评审建议，增加文件锁机制解决多Agent并发写入问题。

### 6.1 文件锁设计

```
┌─────────────────────────────────────────────────────────────────┐
│                      文件锁机制                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  锁类型          │ 说明                                          │
│  ────────────────┼─────────────────────────────────────────────  │
│  写锁 (Write)     │ 独占锁，获得锁后可以写入文件                   │
│  读锁 (Read)      │ 共享锁，多个Agent可以同时读取同一文件         │
│                                                                  │
│  锁粒度          │ 说明                                          │
│  ────────────────┼─────────────────────────────────────────────  │
│  文件锁          │ 锁住整个文件                                  │
│  行级锁          │ 锁住文件的特定行（Phase 2+）                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 锁文件格式

```yaml
# .locks/{task_id}/{file_name}.lock

lock_id: "lock_design_doc_001"
file: "design_doc.md"
task_id: "P0_FEATURES_20260402"

# 锁信息
lock_type: "write"           # write / read
locked_by: "andy-product-vision"
locked_at: "2026-04-02T10:00:00Z"

# 锁超时
expires_at: "2026-04-02T10:30:00Z"  # locked_at + timeout
timeout_seconds: 1800               # 30分钟

# 锁状态
status: "active"             # active / released / expired

# 等待队列 (用于调试)
wait_queue: []
```

### 6.3 FileLock 类实现

```python
import fcntl
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

@dataclass
class LockInfo:
    lock_id: str
    file: str
    lock_type: str  # "read" / "write"
    locked_by: str
    locked_at: datetime
    expires_at: datetime
    timeout_seconds: int

class FileLock:
    """
    文件锁实现
    V2: 解决多Agent并发写入同一文件的问题
    
    使用方法:
        with FileLock("design_doc.md", timeout=30) as lock:
            # 写入文件
            write_file("design_doc.md", content)
    """
    
    LOCK_DIR = ".locks"
    
    def __init__(
        self,
        file_path: str,
        lock_type: str = "write",
        timeout: int = 30,
        retry_interval: int = 2,
        max_retries: int = 5,
        agent_id: Optional[str] = None
    ):
        self.file_path = file_path
        self.lock_type = lock_type
        self.timeout = timeout
        self.retry_interval = retry_interval
        self.max_retries = max_retries
        self.agent_id = agent_id or get_current_agent_id()
        
        # 计算锁文件路径
        self.lock_file = self._get_lock_file_path()
    
    def _get_lock_file_path(self) -> str:
        """计算锁文件路径"""
        file_dir = Path(self.file_path).parent
        file_name = Path(self.file_path).name
        
        # 确保锁目录存在
        lock_dir = file_dir / self.LOCK_DIR
        lock_dir.mkdir(parents=True, exist_ok=True)
        
        return str(lock_dir / f"{file_name}.lock")
    
    def acquire(self) -> bool:
        """
        尝试获取锁
        V2: 使用 fcntl 实现原子性锁获取
        """
        start_time = time.time()
        retries = 0
        
        while retries < self.max_retries:
            # 检查锁是否过期
            if self._is_lock_expired():
                self._release_expired_lock()
            
            # 尝试获取锁（原子操作）
            lock_fd = open(self.lock_file, 'w')
            try:
                if self.lock_type == "write":
                    fcntl.flock(lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                else:
                    fcntl.flock(lock_fd.fileno(), fcntl.LOCK_SH | fcntl.LOCK_NB)
                
                # 获取成功，写入锁信息
                lock_info = LockInfo(
                    lock_id=str(uuid.uuid4()),
                    file=self.file_path,
                    lock_type=self.lock_type,
                    locked_by=self.agent_id,
                    locked_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(seconds=self.timeout),
                    timeout_seconds=self.timeout
                )
                self._write_lock_info(lock_fd, lock_info)
                self._lock_fd = lock_fd
                return True
                
            except BlockingIOError:
                lock_fd.close()
                retries += 1
                if retries < self.max_retries:
                    time.sleep(self.retry_interval)
        
        return False
    
    def release(self):
        """释放锁"""
        if hasattr(self, '_lock_fd') and self._lock_fd:
            fcntl.flock(self._lock_fd.fileno(), fcntl.LOCK_UN)
            self._lock_fd.close()
            
            # 删除锁文件
            if os.path.exists(self.lock_file):
                os.remove(self.lock_file)
    
    def _is_lock_expired(self) -> bool:
        """检查锁是否过期"""
        if not os.path.exists(self.lock_file):
            return False
        
        with open(self.lock_file, 'r') as f:
            lock_info = yaml.safe_load(f)
            expires_at = datetime.fromisoformat(lock_info['expires_at'])
            return datetime.now() > expires_at
    
    def _release_expired_lock(self):
        """释放过期的锁"""
        try:
            os.remove(self.lock_file)
        except FileNotFoundError:
            pass
    
    def _write_lock_info(self, lock_fd, lock_info: LockInfo):
        """写入锁信息到锁文件"""
        lock_fd.seek(0)
        lock_fd.truncate()
        lock_fd.write(yaml.dump(asdict(lock_info)))
        lock_fd.flush()
    
    @contextmanager
    def __call__(self):
        """上下文管理器"""
        if not self.acquire():
            raise LockAcquisitionError(
                f"Failed to acquire lock for {self.file_path} "
                f"after {self.max_retries} retries"
            )
        try:
            yield self
        finally:
            self.release()

class LockAcquisitionError(Exception):
    """锁获取失败异常"""
    pass
```

### 6.4 文件锁使用示例

```python
# 在 Agent 写入文件时使用文件锁

class AgentExecutor:
    def write_output_file(
        self,
        task_id: str,
        agent_id: str,
        file_name: str,
        content: str
    ):
        """
        V2: 写入输出文件时使用文件锁
        """
        output_dir = f"/workspace/tasks/{task_id}/results/{agent_id}"
        output_file = f"{output_dir}/{file_name}"
        
        # 确保目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # V2: 使用文件锁保护写入操作
        with FileLock(
            output_file,
            lock_type="write",
            timeout=30,
            agent_id=agent_id
        ) as lock:
            # 写入文件
            with open(output_file, 'w') as f:
                f.write(content)
            
            # 更新检查点
            self.checkpoint_manager.create_checkpoint(...)
    
    def read_input_files(
        self,
        task_id: str,
        agent_id: str,
        file_names: list[str]
    ) -> dict[str, str]:
        """
        V2: 读取输入文件时使用读锁（共享锁）
        """
        results = {}
        
        for file_name in file_names:
            input_file = f"/workspace/tasks/{task_id}/inputs/{file_name}"
            
            # V2: 使用读锁（可多个同时读）
            with FileLock(
                input_file,
                lock_type="read",
                timeout=10,
                agent_id=agent_id
            ):
                with open(input_file, 'r') as f:
                    results[file_name] = f.read()
        
        return results
```

### 6.5 死锁预防

| 策略 | 说明 |
|------|------|
| **锁超时** | 所有锁都有超时时间，过期自动释放 |
| **顺序加锁** | 多文件操作时，按字母顺序加锁 |
| **超时重试** | 获取锁失败时，自动重试 |
| **死锁检测** | 检测循环等待，强制终止并告警 |

```python
def write_multiple_files(task_id: str, agent_id: str, files: dict[str, str]):
    """
    写入多个文件时，按固定顺序加锁防止死锁
    """
    # 按文件路径排序，确保所有Agent按相同顺序加锁
    sorted_files = sorted(files.items())
    
    locks = []
    try:
        # 按顺序获取所有锁
        for file_name, content in sorted_files:
            lock = FileLock(
                f"/workspace/tasks/{task_id}/{file_name}",
                lock_type="write",
                timeout=30,
                agent_id=agent_id
            )
            if not lock.acquire():
                raise LockAcquisitionError(f"Failed to acquire lock for {file_name}")
            locks.append(lock)
        
        # 所有锁获取成功，执行写入
        for file_name, content in sorted_files:
            file_path = f"/workspace/tasks/{task_id}/{file_name}"
            with open(file_path, 'w') as f:
                f.write(content)
    finally:
        # 逆序释放所有锁
        for lock in reversed(locks):
            lock.release()
```

---

## 七、结构化条件表达式 (V2 替代 eval)

> ⚠️ **V2 新增**：根据Cathy评审建议，移除 `eval()`，使用安全的结构化条件表达式。

### 7.1 条件类型定义

| 条件类型 | 说明 | 示例 |
|----------|------|------|
| `field_match` | 字段值匹配 | `field: "status", operator: "==", value: "completed"` |
| `comparison` | 数值比较 | `field: "score", operator: ">=", value: 0.8` |
| `and` | 逻辑与 | `conditions: [...]` |
| `or` | 逻辑或 | `conditions: [...]` |
| `not` | 逻辑非 | `condition: {...}` |
| `exists` | 字段存在 | `field: "review_result.approved_by"` |

### 7.2 条件表达式语法

```yaml
# 支持的条件操作符

# field_match 操作符
operators:
  - "=="     # 等于
  - "!="     # 不等于
  - "in"     # 在列表中
  - "not_in" # 不在列表中

# comparison 操作符
comparison_operators:
  - ">"      # 大于
  - ">="     # 大于等于
  - "<"      # 小于
  - "<="     # 小于等于
```

### 7.3 条件表达式示例

```yaml
# 示例1: 评审通过条件
condition:
  type: "field_match"
  field: "review_result.verdict"
  operator: "in"
  value: ["approved", "approved_with_suggestions"]

# 示例2: 分数达标条件
condition:
  type: "comparison"
  field: "code_review.score"
  operator: ">="
  value: 0.8

# 示例3: 复合条件 (AND)
condition:
  type: "and"
  conditions:
    - type: "field_match"
      field: "stage_1.status"
      operator: "=="
      value: "completed"
    - type: "field_match"
      field: "review_result.verdict"
      operator: "in"
      value: ["approved", "approved_with_suggestions"]

# 示例4: 复合条件 (OR)
condition:
  type: "or"
  conditions:
    - type: "field_match"
      field: "user_approval"
      operator: "=="
      value: true
    - type: "comparison"
      field: "confidence_score"
      operator: ">="
      value: 0.95

# 示例5: 否定条件
condition:
  type: "not"
  condition:
    type: "field_match"
    field: "is_blocked"
    operator: "=="
    value: true
```

### 7.4 条件评估器实现

```python
class ConditionEvaluator:
    """
    条件评估器
    V2: 移除 eval()，使用安全的结构化评估
    """
    
    def __init__(self, context: dict):
        self.context = context
    
    def evaluate(self, condition: dict) -> bool:
        """
        评估条件表达式
        V2: 完全不使用 eval()，安全可靠
        """
        if not condition:
            return True  # 无条件默认为通过
        
        cond_type = condition.get("type")
        
        evaluators = {
            "field_match": self._eval_field_match,
            "comparison": self._eval_comparison,
            "exists": self._eval_exists,
            "and": self._eval_and,
            "or": self._eval_or,
            "not": self._eval_not,
        }
        
        evaluator = evaluators.get(cond_type)
        if not evaluator:
            raise ValueError(f"Unknown condition type: {cond_type}")
        
        return evaluator(condition)
    
    def _eval_field_match(self, cond: dict) -> bool:
        """评估字段匹配条件"""
        field = self._resolve_field(cond["field"])
        operator = cond["operator"]
        expected = cond["value"]
        
        if operator == "==":
            return field == expected
        elif operator == "!=":
            return field != expected
        elif operator == "in":
            return field in expected
        elif operator == "not_in":
            return field not in expected
        
        raise ValueError(f"Unknown operator for field_match: {operator}")
    
    def _eval_comparison(self, cond: dict) -> bool:
        """评估比较条件"""
        field = self._resolve_field(cond["field"])
        operator = cond["operator"]
        expected = cond["value"]
        
        try:
            if operator == ">":
                return field > expected
            elif operator == ">=":
                return field >= expected
            elif operator == "<":
                return field < expected
            elif operator == "<=":
                return field <= expected
        except TypeError:
            return False
        
        raise ValueError(f"Unknown operator for comparison: {operator}")
    
    def _eval_exists(self, cond: dict) -> bool:
        """评估字段存在条件"""
        field_value = self._resolve_field(cond["field"], raise_error=False)
        return field_value is not None
    
    def _eval_and(self, cond: dict) -> bool:
        """评估逻辑与"""
        return all(self.evaluate(c) for c in cond["conditions"])
    
    def _eval_or(self, cond: dict) -> bool:
        """评估逻辑或"""
        return any(self.evaluate(c) for c in cond["conditions"])
    
    def _eval_not(self, cond: dict) -> bool:
        """评估逻辑非"""
        return not self.evaluate(cond["condition"])
    
    def _resolve_field(self, field_path: str, raise_error: bool = True):
        """
        解析字段路径，支持嵌套访问
        V2: 安全地解析字段，不使用 eval()
        """
        parts = field_path.split(".")
        current = self.context
        
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, object):
                current = getattr(current, part, None)
            else:
                current = None
            
            if current is None:
                if raise_error:
                    raise ValueError(f"Field not found: {field_path}")
                return None
        
        return current


# 使用示例
context = {
    "review_result": {
        "verdict": "approved",
        "approved_by": "cathy",
        "score": 0.92
    },
    "stage_1": {
        "status": "completed"
    }
}

evaluator = ConditionEvaluator(context)

# 评估条件
condition = {
    "type": "and",
    "conditions": [
        {"type": "field_match", "field": "stage_1.status", "operator": "==", "value": "completed"},
        {"type": "field_match", "field": "review_result.verdict", "operator": "in", "value": ["approved", "approved_with_suggestions"]},
        {"type": "comparison", "field": "review_result.score", "operator": ">=", "value": 0.8}
    ]
}

result = evaluator.evaluate(condition)  # True - 所有条件都满足
```

---

## 八、API 设计

### 8.1 核心接口概览

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/teams` | 获取团队列表 |
| GET | `/api/v1/teams/{team_id}` | 获取团队详情 |
| PUT | `/api/v1/teams/{team_id}` | 更新团队配置 |
| GET | `/api/v1/teams/{team_id}/agents` | 获取团队成员列表 |
| POST | `/api/v1/agents` | 创建 Agent 配置 |
| GET | `/api/v1/agents/{agent_id}` | 获取 Agent 配置 |
| PUT | `/api/v1/agents/{agent_id}` | 更新 Agent 配置 |
| DELETE | `/api/v1/agents/{agent_id}` | 删除 Agent 配置 |
| POST | `/api/v1/tasks` | 创建任务 |
| GET | `/api/v1/tasks/{task_id}` | 获取任务详情 |
| PUT | `/api/v1/tasks/{task_id}` | 更新任务状态 |
| POST | `/api/v1/tasks/{task_id}/execute` | 执行任务 |
| GET | `/api/v1/tasks/{task_id}/results` | 获取任务结果 |
| POST | `/api/v1/tasks/{task_id}/abort` | 中止任务 |
| GET | `/api/v1/tasks/{task_id}/checkpoints` | 获取检查点列表 |
| POST | `/api/v1/tasks/{task_id}/checkpoints` | 创建检查点 |
| POST | `/api/v1/tasks/{task_id}/restore` | 从检查点恢复 |

### 8.2 详细接口定义

#### 8.2.1 团队管理

```
GET /api/v1/teams
```

**Response:**
```json
{
  "teams": [
    {
      "team_id": "bigdog",
      "name": "BIGDOG团队",
      "member_count": 3,
      "enabled": true
    }
  ]
}
```

```
GET /api/v1/teams/{team_id}
```

**Response:**
```json
{
  "team_id": "bigdog",
  "name": "BIGDOG团队",
  "coordinator": {
    "agent_id": "manager",
    "name": "小🦊 (Manager)"
  },
  "members": [
    {
      "agent_id": "andy-product-vision",
      "name": "Andy",
      "role": "product_manager",
      "enabled": true
    }
  ],
  "protocol": {
    "negotiation_mode": "file_based"
  },
  "workflow": {
    "type": "sequential",
    "stage_count": 3
  }
}
```

#### 8.2.2 Agent 管理

```
POST /api/v1/agents
```

**Request:**
```json
{
  "agent_id": "andy-product-vision",
  "name": "Andy (产品设计)",
  "role": "product_designer",
  "llm": {
    "provider": "minimax",
    "model": "MiniMax-M2.5"
  },
  "collaboration": {
    "mode": "file_based"
  }
}
```

**Response:**
```json
{
  "agent_id": "andy-product-vision",
  "name": "Andy (产品设计)",
  "config_file": "agent_config_andy-product-vision.yaml",
  "created_at": "2026-04-02T10:00:00Z"
}
```

```
PUT /api/v1/agents/{agent_id}
```

**Request:** (部分更新)
```json
{
  "llm": {
    "temperature": 0.8
  },
  "prompt": {
    "system": "更新后的系统提示词..."
  }
}
```

#### 8.2.3 任务管理

```
POST /api/v1/tasks
```

**Request:**
```json
{
  "team_id": "bigdog",
  "title": "实现RAG/Agent可交互配置功能",
  "priority": "P0",
  "deadline": "2026-04-07T23:59:59Z",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "支持可视化配置RAG参数"
    }
  ],
  "workflow_type": "sequential",
  "stages": [
    {
      "name": "产品设计",
      "agent_id": "andy-product-vision"
    }
  ]
}
```

**Response:**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "team_id": "bigdog",
  "status": "pending",
  "task_dir": "/workspace/tasks/P0_FEATURES_20260402",
  "created_at": "2026-04-02T10:00:00Z"
}
```

```
POST /api/v1/tasks/{task_id}/execute
```

**Request:**
```json
{
  "start_stage": 1,
  "context": {
    "user_id": "user123",
    "channel": "feishu"
  }
}
```

**Response:**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "execution_id": "exec_20260402_001",
  "status": "running",
  "current_stage": 1,
  "started_at": "2026-04-02T10:05:00Z"
}
```

```
GET /api/v1/tasks/{task_id}/results
```

**Response:**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "overall_status": "in_progress",
  "stages": [
    {
      "stage_id": 1,
      "name": "产品设计",
      "agent_id": "andy-product-vision",
      "status": "completed",
      "outputs": [
        {
          "file": "design_doc.md",
          "path": "/workspace/tasks/P0_FEATURES_20260402/design_doc.md",
          "lines": 856
        }
      ],
      "completed_at": "2026-04-02T12:30:00Z"
    },
    {
      "stage_id": 2,
      "name": "技术评审",
      "agent_id": "cathy-tech-review",
      "status": "pending"
    }
  ]
}
```

#### 8.2.4 Checkpoint 接口 (V2 新增)

```
GET /api/v1/tasks/{task_id}/checkpoints
```

**Response:**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "checkpoints": [
    {
      "checkpoint_id": "cp_20260402_001",
      "agent_id": "andy-product-vision",
      "sequence": 1,
      "created_at": "2026-04-02T10:15:00Z",
      "progress": 45,
      "phase": "architecture_design"
    },
    {
      "checkpoint_id": "cp_20260402_002",
      "agent_id": "andy-product-vision",
      "sequence": 2,
      "created_at": "2026-04-02T10:30:00Z",
      "progress": 70,
      "phase": "api_design"
    }
  ],
  "latest": "cp_20260402_002"
}
```

```
POST /api/v1/tasks/{task_id}/restore
```

**Request:**
```json
{
  "checkpoint_id": "cp_20260402_001"
}
```

**Response:**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "restored_from": "cp_20260402_001",
  "restored_at": "2026-04-02T10:35:00Z",
  "recovery_instructions": {
    "restore_from_file": "design_doc.md",
    "restore_to_line": 121
  }
}
```

---

## 九、界面设计

### 9.1 页面结构

```
┌──────────────────────────────────────────────────────────────────────┐
│  多Agent协同配置                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [团队配置]  [Agent配置]  [工作流]  [任务管理]  [监控面板]             │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 团队配置页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  👥 团队配置                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  团队信息:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  团队ID:   [bigdog                    ]                        │ │
│  │  团队名称: [BIGDOG团队                 ]                        │ │
│  │  描述:    [AI产品开发团队...          ]                        │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  协调者配置:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  🤖 小🦊 (Manager)                                              │ │
│  │  职责: 任务分配、进度把控、结果汇总                               │ │
│  │  模型: [MiniMax-M2.5 ▼]                                        │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  成员管理:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │ Andy (产品经理)                              [编辑] [×]│   │ │
│  │  │ 职责: 产品设计、需求分析                                  │   │ │
│  │  │ 配置: agent_config_andy.yaml                             │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │ Cathy (代码审查专家)                          [编辑] [×]│   │ │
│  │  │ 职责: 技术可行性评审、代码质量把控                        │   │ │
│  │  │ 配置: agent_config_cathy.yaml                            │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  │  ┌────────────────────────────────────────────────────────┐   │ │
│  │  │ Bob (高级程序员)                              [编辑] [×]│   │ │
│  │  │ 职责: 前后端开发、代码实现                                │   │ │
│  │  │ 配置: agent_config_bob.yaml                              │   │ │
│  │  └────────────────────────────────────────────────────────┘   │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ 添加成员]                                          [保存团队配置]  │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.3 Agent 独立配置页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  🤖 Agent 独立配置 - Andy                                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [基本信息] [模型配置] [提示词] [工具配置] [协同配置] [记忆配置]        │
│                                                                       │
│  ┌─ 协同配置 ─────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  协商方式: [文件协商 ▼]  (Phase 1)                               │ │
│  │           ● 文件协商 (当前可用)                                  │ │
│  │           ○ 协议协商 (Phase 2+)                                  │ │
│  │           ○ 混合协商 (Phase 2+)                                  │ │
│  │                                                                  │ │
│  │  ┌─ 文件协议 ───────────────────────────────────────────────┐ │ │
│  │  │                                                            │ │ │
│  │  │  输入目录:  [/workspace/tasks/{task_id}/inputs      ]   │ │ │
│  │  │  输出目录:  [/workspace/tasks/{task_id}/results/andy ]   │ │ │
│  │  │  检查点目录: [/workspace/tasks/{task_id}/checkpoints]    │ │ │
│  │  │  输出格式:  [Markdown ▼]                                 │ │ │
│  │  │                                                            │ │ │
│  │  │  ☑ 启用文件锁                                              │ │ │
│  │  │    超时: [30] 秒  重试间隔: [2] 秒  最大重试: [5] 次       │ │ │
│  │  │                                                            │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  │  ┌─ 汇报设置 ───────────────────────────────────────────────┐ │ │
│  │  │                                                            │ │ │
│  │  │  汇报对象:  [Manager ▼]                                  │ │ │
│  │  │  ☑ 完成后自动汇报                                         │ │ │
│  │  │  ☑ 阻塞时自动通知                                         │ │ │
│  │  │  ☑ 定期进度更新                                           │ │ │
│  │  │     间隔: [30] 分钟                                       │ │ │
│  │  │                                                            │ │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│                                        [保存]  [重置为默认]  [导出YAML] │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.4 工作流配置页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚙️ 工作流编排                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  工作流类型:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ● 顺序执行   ○ 并行执行   ○ 分层执行 (Phase 2+)              │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  阶段配置:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │   ┌─ 阶段 1 ──────────────────────────────────────────────┐  │ │
│  │   │                                                          │  │ │
│  │   │   名称: [产品设计                               ]       │  │ │
│  │   │   执行者: [Andy ▼]                                      │  │ │
│  │   │   输入:  [brief.md                              ]       │  │ │
│  │   │   输出:  [design_doc.md                         ]       │  │ │
│  │   │   超时:  [3600] 秒                                      │  │ │
│  │   │   重试:  [0] 次                                         │  │ │
│  │   │   条件:  [无 ▼]                                          │  │ │
│  │   │                                    [↑ 上移] [↓ 下移] [×] │  │ │
│  │   │                                                          │  │ │
│  │   └──────────────────────────────────────────────────────────┘  │ │
│  │                            │                                    │ │
│  │                            ▼ (评审通过)                         │ │
│  │   ┌─ 阶段 2 ──────────────────────────────────────────────┐  │ │
│  │   │                                                          │  │ │
│  │   │   名称: [技术评审                               ]       │  │ │
│  │   │   执行者: [Cathy ▼]                                     │  │ │
│  │   │   输入:  [design_doc.md                         ]       │  │ │
│  │   │   输出:  [review_result.md                       ]       │  │ │
│  │   │   条件:  [字段匹配 ▼]                                    │  │ │
│  │   │            字段: review_result.verdict                  │  │ │
│  │   │            操作: 在以下值中                              │  │ │
│  │   │            值:   [approved, approved_with_suggestions]  │  │ │
│  │   │                                    [↑ 上移] [↓ 下移] [×] │  │ │
│  │   │                                                          │  │ │
│  │   └──────────────────────────────────────────────────────────┘  │ │
│  │                            │                                    │ │
│  │                            ▼                                    │ │
│  │   ┌─ 阶段 3 ──────────────────────────────────────────────┐  │ │
│  │   │                                                          │  │ │
│  │   │   名称: [开发实现                               ]       │  │ │
│  │   │   执行者: [Bob ▼]                                        │  │ │
│  │   │   输入:  [design_doc.md, review_result.md        ]       │  │ │
│  │   │   输出:  [code/                                 ]       │  │ │
│  │   │   条件:  [无 ▼]                                          │  │ │
│  │   │                                    [↑ 上移] [↓ 下移] [×] │  │ │
│  │   │                                                          │  │ │
│  │   └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  质量门禁:                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  ☑ 阶段2评审意见为 approved 或 approved_with_suggestions        │ │
│  │  ☑ 阶段3完成后代码质量评分 >= 0.8                               │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ 添加阶段]                                          [保存工作流]     │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.5 任务管理页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 任务管理                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  筛选:  [全部状态 ▼]  [全部优先级 ▼]  [全部团队 ▼]  [搜索... 🔍]     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │  P0  实现RAG/Agent可交互配置功能                    进行中      │ │
│  │       创建: 2026-04-02  |  截止: 2026-04-07                      │ │
│  │       当前: 阶段2-技术评审 (Cathy)                               │ │
│  │       进度: ████████░░░░░░░░ 60%                                │ │
│  │       [查看详情] [暂停] [中止] [检查点管理]                      │ │
│  │                                                                  │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │                                                                  │ │
│  │  P1  用户反馈模块优化                               已完成      │ │
│  │       创建: 2026-04-01  |  完成: 2026-04-02                      │ │
│  │       [查看结果] [重新执行]                                       │ │
│  │                                                                  │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │                                                                  │ │
│  │  P2  导出功能支持JSON格式                           阻塞中       │ │
│  │       创建: 2026-04-01  |  截止: 2026-04-10                      │ │
│  │       阻塞原因: 需要确认JSON Schema                              │ │
│  │       [查看详情] [解决阻塞] [中止]                               │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [+ 创建新任务]                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.6 监控面板页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 协同监控面板                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  实时状态:                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐           │
│  │   运行中: 2    │ │   待处理: 5    │ │   已完成: 12   │           │
│  └────────────────┘ └────────────────┘ └────────────────┘           │
│                                                                       │
│  ┌─ 当前任务: P0_FEATURES_20260402 ───────────────────────────────┐ │
│  │                                                                  │ │
│  │   状态机: running | 阶段1: completed | 阶段2: running           │ │
│  │                                                                  │ │
│  │   阶段 1: ✅ 产品设计 (Andy)                      2h 30m        │ │
│  │           └── 输出: design_doc.md                               │ │
│  │           └── 检查点: cp_20260402_001 (进度45%)                 │ │
│  │                                                                  │ │
│  │   阶段 2: 🔄 技术评审 (Cathy)                     30m           │ │
│  │           └── 进度: 审查中 (60%)                                  │ │
│  │           └── 输出: review_result.md                            │ │
│  │                                                                  │ │
│  │   阶段 3: ⏳ 开发实现 (Bob)                      未开始          │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ Agent 状态 ───────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │   Andy:    🟢 空闲                                              │ │
│  │   Cathy:   🟡 执行中 - 评审设计文档                             │ │
│  │   Bob:     ⚪ 待机                                              │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 文件锁状态 ──────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │   design_doc.md     🔒 Andy (写锁) - 剩余28分钟                │ │
│  │   review_result.md   🔓 可用                                     │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [刷新]  [全屏]  [导出日志]                                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 十、验收标准

### 10.1 协商模式选择

| 验收项 | 标准 | Phase |
|--------|------|-------|
| ✅ 支持文件协商模式 | Phase 1 正常工作 | Phase 1 |
| ⏳ 支持协议协商模式切换 | WebSocket服务独立部署后可切换 | Phase 2+ |
| ⏳ 支持混合协商模式 | 协议+文件结合 | Phase 2+ |
| 协商模式配置持久化 | 配置保存后重启生效 | Phase 1 |

### 10.2 团队配置

| 验收项 | 标准 |
|--------|------|
| 可添加/编辑/删除团队成员 | 界面操作流畅，数据正确更新 |
| Manager 配置正确 | 任务分配通过 Manager 执行 |
| 成员配置独立保存 | 各成员配置文件隔离 |
| Git 身份配置正确 | 代码提交使用配置的 Git 用户 |

### 10.3 工作流编排

| 验收项 | 标准 |
|--------|------|
| 支持顺序工作流 | 阶段按顺序执行，前一阶段完成触发下一阶段 |
| 支持并行工作流 | 独立阶段可同时执行 |
| ✅ 支持结构化质量门禁 | 条件使用 field_match/comparison，不使用 eval() | Phase 1 |
| 支持阶段跳过 | 可配置条件跳过某些阶段 |

### 10.4 任务分配与结果汇报

| 验收项 | 标准 |
|--------|------|
| 任务简报正确生成 | brief.md 包含所有必要信息 |
| 任务正确分配给 Agent | Agent 收到正确的任务信息 |
| 结果汇报格式正确 | result.md 符合预定义格式 |
| 阻塞问题正确上报 | Manager 收到阻塞通知 |

### 10.5 文件锁 (V2 验收)

| 验收项 | 标准 |
|--------|------|
| 多Agent同时写同一文件 | 第二个Agent等待锁释放，不覆盖 |
| 锁超时自动释放 | 30分钟无操作锁自动释放 |
| 死锁预防 | 多文件操作按字母顺序加锁 |
| 锁状态可见 | 监控面板显示当前锁状态 |

### 10.6 TaskStateMachine (V2 验收)

| 验收项 | 标准 |
|--------|------|
| 状态转换正确 | 按定义的状态转换图执行 |
| 非法转换拒绝 | 尝试非法转换时抛出异常 |
| 历史记录完整 | 记录所有状态转换历史 |
| 结构化条件评估 | 不使用 eval()，安全可靠 |

### 10.7 Checkpoint (V2 验收)

| 验收项 | 标准 |
|--------|------|
| 检查点创建 | Agent执行过程中可创建检查点 |
| 检查点恢复 | 可从任意检查点恢复执行 |
| 最新检查点 | 自动维护 latest 软链接 |
| 锁保护 | 检查点写入使用文件锁保护 |

---

## 十一、优先级与里程碑

### Phase 1: 基础协同 (MVP) - 预计 1 周

| 功能 | 优先级 | 验收标准 | 状态 |
|------|--------|----------|------|
| Agent 独立配置存储 | P0 | YAML 配置文件正确读写 | ✅ |
| 团队配置管理 | P0 | 团队成员 CRUD | ✅ |
| ✅ 文件协商基础实现 | P0 | 目录创建/文件读写 | ✅ |
| ✅ 文件锁机制 | P0 | 多Agent并发写入保护 | 🆕 |
| ✅ 结构化条件评估 | P0 | 移除 eval()，使用安全评估 | 🆕 |
| ✅ TaskStateMachine | P0 | 任务状态机实现 | 🆕 |
| ✅ Checkpoint机制 | P0 | 检查点创建和恢复 | 🆕 |
| 任务分配基础流程 | P0 | brief.md 生成和分配 | ✅ |
| 顺序工作流 | P0 | 阶段按序执行 | ✅ |
| 并行工作流 | P1 | 独立任务同时执行 | ✅ |
| 结果汇总 | P0 | Manager 整合结果 | ✅ |
| 监控面板 | P1 | 实时进度展示 | ✅ |

### Phase 2: 增强功能 - 预计 1 周

| 功能 | 优先级 | 验收标准 | 状态 |
|------|--------|----------|------|
| 协议协商 | P1 | WebSocket 消息传递 | ⏳ |
| 混合协商 | P2 | 文件+协议结合 | ⏳ |
| 分层工作流 | P2 | Supervisor 模式 | ⏳ |
| 审计日志 | P2 | 完整操作记录 | ⏳ |
| 协议协商WebSocket服务 | P0 | 独立的WebSocket服务 | ⏳ |

---

## 十二、风险与依赖

### 12.1 技术风险 (V2 更新)

| 风险 | 影响 | 缓解措施 | 状态 |
|------|------|----------|------|
| ~~WebSocket服务缺失~~ | ~~高~~ | ~~Phase 1移除，使用文件协议~~ | ✅ 已解决 |
| 文件并发冲突 | 高 | ✅ V2引入文件锁机制 | 🆕 已解决 |
| ~~eval()安全风险~~ | ~~高~~ | ~~V2移除eval，使用结构化条件~~ | ✅ 已解决 |
| 状态机实现复杂度 | 中 | TaskStateMachine 类封装 | 🆕 |
| 检查点过多占用空间 | 低 | 定期清理旧检查点 | 🆕 |

### 12.2 依赖项

| 依赖 | 说明 | 状态 |
|------|------|------|
| AgentEngine | 核心引擎 | 已完成 |
| Pydantic Config Model | 配置模型 | 已完成 |
| MultiAgentPage | 已有页面 | 需增强 |
| backend API | API 实现 | 部分完成 |
| FileLock 实现 | 文件锁机制 | 🆕 Phase 1 |
| CheckpointManager | 检查点管理 | 🆕 Phase 1 |

---

## 十三、附录

### 附录A: 结构化条件表达式参考

```yaml
# 条件表达式速查表

# 简单字段匹配
{ type: "field_match", field: "status", operator: "==", value: "completed" }

# IN 操作
{ type: "field_match", field: "verdict", operator: "in", value: ["approved", "approved_with_suggestions"] }

# 数值比较
{ type: "comparison", field: "score", operator: ">=", value: 0.8 }

# 复合 AND
{
  type: "and",
  conditions: [
    { type: "field_match", field: "stage", operator: "==", value: 1 },
    { type: "field_match", field: "status", operator: "==", value: "completed" }
  ]
}

# 复合 OR
{
  type: "or",
  conditions: [
    { type: "field_match", field: "approved", operator: "==", value: true },
    { type: "comparison", field: "confidence", operator: ">=", value: 0.95 }
  ]
}

# NOT
{ type: "not", condition: { type: "field_match", field: "blocked", operator: "==", value: true } }
```

### 附录B: Checkpoint 元数据

```yaml
# 检查点文件命名规范
checkpoints/{agent_id}/_checkpoint_{YYYYMMDD}_{SEQ:03d}.yaml

# 示例
checkpoints/andy-product-vision/_checkpoint_20260402_001.yaml
checkpoints/andy-product-vision/_checkpoint_20260402_002.yaml
checkpoints/cathy-tech-review/_checkpoint_20260402_001.yaml

# latest 软链接
checkpoints/andy-product-vision/_checkpoint_latest.yaml -> _checkpoint_20260402_002.yaml
```

### 附录C: 文件锁超时配置参考

```yaml
# 推荐的文件锁配置

file_lock:
  # 锁超时时间（秒）
  timeout_seconds: 1800  # 30分钟
  
  # 重试间隔（秒）
  retry_interval: 2
  
  # 最大重试次数
  max_retries: 5
  
  # 锁文件目录
  lock_dir: ".locks"
  
  # 自动清理过期锁
  auto_cleanup: true
  
  # 清理检查间隔（秒）
  cleanup_interval: 300  # 5分钟
```

---

## Phase 2: 工作流编排 + 前端集成

> **版本**: V1.0  
> **产品经理**: Andy  
> **日期**: 2026-04-02  
> **状态**: **开发中**  
> **前置依赖**: Phase 1 完成（TaskStateMachine、FileLock、Checkpoint 已实现）

---

### 概述

Phase 2 在 Phase 1 基础上，增加**工作流编排引擎**和**前端 MultiAgentPage 集成**。核心目标是：

1. **可视化工作流编排** - 支持顺序/并行/条件分支的图形化配置
2. **实时任务监控** - 前端实时展示任务执行状态和 Agent 活动
3. **REST API 端点** - 提供完整的团队、任务管理接口
4. **增强的前端页面** - 团队配置、流程编排、任务看板三 Tab 设计

---

### 一、工作流编排引擎

Phase 2 工作流编排引擎基于 Phase 1 的 TaskStateMachine 构建，新增**依赖图（Dependency Graph）** 支持，允许定义复杂的任务依赖关系。

#### 1.1 核心概念

| 概念 | 描述 | Phase 1 支持 |
|------|------|-------------|
| **节点 (Node)** | 工作流中的一个执行单元（Agent Stage） | ✅ |
| **边 (Edge)** | 节点间的执行顺序或条件关系 | ✅ |
| **依赖图 (DAG)** | 有向无环图，定义节点执行顺序 | 🆕 Phase 2 |
| **执行器 (Executor)** | 实际执行节点的引擎 | ✅ 扩展 |

#### 1.2 工作流类型（Phase 2 完整支持）

##### 1.2.1 顺序执行 (Sequential)

```
┌─────────────────────────────────────────────────────────┐
│                    Sequential Workflow                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   [Node A] ──→ [Node B] ──→ [Node C] ──→ [Node D]      │
│                                                          │
│   • A 完成后执行 B                                        │
│   • B 完成后执行 C                                        │
│   • C 完成后执行 D                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**配置示例：**

```yaml
workflow:
  type: "sequential"
  nodes:
    - id: "stage_1"
      name: "产品设计"
      agent: "andy-product-vision"
      input: ["brief.md"]
      output: ["design_doc.md"]
    
    - id: "stage_2"
      name: "技术评审"
      agent: "cathy-tech-review"
      input: ["design_doc.md"]
      output: ["review_result.md"]
      # 前置条件：stage_1 完成
      depends_on: ["stage_1"]
    
    - id: "stage_3"
      name: "开发实现"
      agent: "bob-p0-implementation"
      input: ["design_doc.md", "review_result.md"]
      output: ["code/"]
      # 前置条件：stage_2 评审通过
      depends_on: ["stage_2"]
      condition:
        type: "field_match"
        field: "stage_2.verdict"
        operator: "in"
        value: ["approved", "approved_with_suggestions"]
```

##### 1.2.2 并行执行 (Parallel)

```
┌─────────────────────────────────────────────────────────┐
│                    Parallel Workflow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                      [Start]                            │
│                         │                               │
│           ┌─────────────┼─────────────┐                  │
│           │             │             │                  │
│           ▼             ▼             ▼                  │
│      [Node A]      [Node B]      [Node C]               │
│           │             │             │                  │
│           └─────────────┼─────────────┘                  │
│                         │                               │
│                    [End / Join]                         │
│                                                          │
│   • A、B、C 同时执行                                      │
│   • 全部完成后触发 End 节点                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**配置示例：**

```yaml
workflow:
  type: "parallel"
  nodes:
    - id: "node_a"
      name: "文档撰写"
      agent: "andy-product-vision"
      depends_on: []  # 无依赖，并行起点
    
    - id: "node_b"
      name: "代码实现"
      agent: "bob-p0-implementation"
      depends_on: []
    
    - id: "node_c"
      name: "测试编写"
      agent: "cathy-tech-review"
      depends_on: []
  
  join:
    type: "all"  # 全部完成 / any（任一完成）
    next: "node_d"

  nodes:
    - id: "node_d"
      name: "结果汇总"
      agent: "manager"
      depends_on: ["node_a", "node_b", "node_c"]
```

##### 1.2.3 条件分支 (Conditional)

```
┌─────────────────────────────────────────────────────────┐
│                 Conditional Workflow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                  [Decision Node]                        │
│                       │                                 │
│           ┌──────────┼──────────┐                       │
│           │          │          │                       │
│      [path_a]   [path_b]   [path_c]                    │
│       if:        if:        if:                        │
│      score>0.9  score>=0.8  else                        │
│           │          │          │                       │
│           └──────────┼──────────┘                       │
│                       │                                 │
│                  [Join Node]                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**配置示例：**

```yaml
workflow:
  type: "conditional"
  nodes:
    - id: "evaluate"
      name: "质量评估"
      agent: "cathy-tech-review"
      output: ["quality_report.yaml"]
    
    - id: "high_quality"
      name: "高质量路径"
      agent: "bob-p0-implementation"
      depends_on: ["evaluate"]
      condition:
        type: "comparison"
        field: "evaluate.score"
        operator: ">"
        value: 0.9
    
    - id: "medium_quality"
      name: "中等质量路径"
      agent: "bob-p0-implementation"
      depends_on: ["evaluate"]
      condition:
        type: "and"
        conditions:
          - type: "comparison"
            field: "evaluate.score"
            operator: ">="
            value: 0.8
          - type: "comparison"
            field: "evaluate.score"
            operator: "<="
            value: 0.9
    
    - id: "low_quality"
      name: "低质量路径（需改进）"
      agent: "andy-product-vision"
      depends_on: ["evaluate"]
      condition:
        type: "comparison"
        field: "evaluate.score"
        operator: "<"
        value: 0.8

  join:
    type: "any"  # 任一路径完成即可继续
    next: "finalize"
```

#### 1.3 依赖图定义 (DAG)

Phase 2 引入 Dependency Graph API，支持复杂的工作流拓扑。

```python
from typing import Optional
from enum import Enum

class NodeType(Enum):
    TASK = "task"           # 普通任务节点
    DECISION = "decision"   # 条件判断节点
    JOIN = "join"           # 汇合节点
    START = "start"         # 开始节点
    END = "end"             # 结束节点

class EdgeType(Enum):
    SEQUENCE = "sequence"   # 顺序边
    CONDITION_TRUE = "condition_true"   # 条件为真时
    CONDITION_FALSE = "condition_false" # 条件为假时
    ERROR = "error"         # 错误边

@dataclass
class WorkflowNode:
    id: str
    name: str
    type: NodeType
    agent_id: Optional[str]
    config: dict
    condition: Optional[dict] = None
    timeout: int = 3600
    retry: int = 0

@dataclass
class WorkflowEdge:
    source: str  # 源节点 ID
    target: str  # 目标节点 ID
    type: EdgeType = EdgeType.SEQUENCE
    condition: Optional[dict] = None

class DependencyGraph:
    """
    工作流依赖图 - 有向无环图 (DAG)
    Phase 2 新增
    """
    
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self.nodes: dict[str, WorkflowNode] = {}
        self.edges: list[WorkflowEdge] = []
        self._adjacency_list: dict[str, list[str]] = {}
        self._reverse_adjacency: dict[str, list[str]] = {}
    
    def add_node(self, node: WorkflowNode) -> None:
        """添加节点"""
        self.nodes[node.id] = node
        if node.id not in self._adjacency_list:
            self._adjacency_list[node.id] = []
        if node.id not in self._reverse_adjacency:
            self._reverse_adjacency[node.id] = []
    
    def add_edge(self, edge: WorkflowEdge) -> None:
        """添加边"""
        # 验证节点存在
        if edge.source not in self.nodes:
            raise ValueError(f"Source node {edge.source} not found")
        if edge.target not in self.nodes:
            raise ValueError(f"Target node {edge.target} not found")
        
        # 防止环
        if self._would_create_cycle(edge):
            raise ValueError(f"Adding edge {edge.source} -> {edge.target} would create a cycle")
        
        self.edges.append(edge)
        self._adjacency_list[edge.source].append(edge.target)
        self._reverse_adjacency[edge.target].append(edge.source)
    
    def _would_create_cycle(self, new_edge: WorkflowEdge) -> bool:
        """检查添加边是否会产生环"""
        # DFS 从 target 出发，看能否回到 source
        visited = set()
        stack = [new_edge.target]
        
        while stack:
            current = stack.pop()
            if current == new_edge.source:
                return True
            if current in visited:
                continue
            visited.add(current)
            stack.extend(self._adjacency_list.get(current, []))
        
        return False
    
    def get_execution_order(self) -> list[list[str]]:
        """
        获取拓扑排序的执行顺序
        返回分层列表，同一层节点可并行执行
        """
        in_degree = {node_id: len(self._reverse_adjacency.get(node_id, [])) 
                     for node_id in self.nodes}
        
        layers = []
        remaining = set(self.nodes.keys())
        
        while remaining:
            # 找到所有入度为 0 的节点（可执行）
            ready = [nid for nid in remaining if in_degree[nid] == 0]
            
            if not ready:
                raise ValueError("Workflow contains a cycle")
            
            layers.append(ready)
            
            # 移除这一层的节点
            for node_id in ready:
                remaining.remove(node_id)
                for successor in self._adjacency_list.get(node_id, []):
                    in_degree[successor] -= 1
        
        return layers
    
    def get_ready_nodes(self, completed: set[str]) -> list[str]:
        """
        获取当前可执行的节点（所有前置依赖都已完成）
        """
        ready = []
        for node_id, node in self.nodes.items():
            if node_id in completed:
                continue
            
            # 检查所有前置节点是否已完成
            prerequisites = self._reverse_adjacency.get(node_id, [])
            if all(prereq in completed for prereq in prerequisites):
                ready.append(node_id)
        
        return ready
    
    def visualize(self) -> str:
        """生成 Mermaid 格式的流程图"""
        lines = ["flowchart TD"]
        
        for node_id, node in self.nodes.items():
            label = f"{node.name}"
            lines.append(f'    {node_id}["{label}"]')
        
        for edge in self.edges:
            if edge.type == EdgeType.SEQUENCE:
                lines.append(f"    {edge.source} --> {edge.target}")
            elif edge.type == EdgeType.CONDITION_TRUE:
                lines.append(f"    {edge.source} --true--> {edge.target}")
            elif edge.type == EdgeType.CONDITION_FALSE:
                lines.append(f"    {edge.source} --false--> {edge.target}")
        
        return "\n".join(lines)
```

#### 1.4 WorkflowExecutor 类

```python
class WorkflowExecutor:
    """
    工作流执行器
    Phase 2 扩展 Phase 1 的 TaskStateMachine
    """
    
    def __init__(
        self,
        workflow_id: str,
        graph: DependencyGraph,
        context: dict,
        event_callback: Optional[Callable] = None
    ):
        self.workflow_id = workflow_id
        self.graph = graph
        self.context = context
        self.event_callback = event_callback
        self.state_machine = TaskStateMachine(workflow_id)
        self.completed_nodes: set[str] = set()
        self.failed_nodes: set[str] = set()
        self.running_nodes: dict[str, asyncio.Task] = {}
    
    async def execute(self) -> dict:
        """
        执行工作流
        """
        self.state_machine.transition(TaskStatus.RUNNING)
        await self._emit_event("workflow_started", {"workflow_id": self.workflow_id})
        
        try:
            while True:
                # 检查是否完成
                if self._is_workflow_complete():
                    self.state_machine.transition(TaskStatus.COMPLETED)
                    await self._emit_event("workflow_completed", {
                        "workflow_id": self.workflow_id,
                        "completed_nodes": list(self.completed_nodes)
                    })
                    break
                
                # 获取可执行的节点
                ready_nodes = self.graph.get_ready_nodes(self.completed_nodes)
                
                if not ready_nodes and not self.running_nodes:
                    # 死锁：无可执行节点且没有运行中的任务
                    self.state_machine.transition(TaskStatus.FAILED, "Deadlock detected")
                    break
                
                # 启动可并行的节点
                for node_id in ready_nodes:
                    await self._execute_node(node_id)
                
                # 等待任意一个节点完成
                if self.running_nodes:
                    done, _ = await asyncio.wait(
                        self.running_nodes.values(),
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    
                    for task in done:
                        node_id, result = task.result()
                        del self.running_nodes[node_id]
                        
                        if result["status"] == "completed":
                            self.completed_nodes.add(node_id)
                            self.context[node_id] = result
                        else:
                            self.failed_nodes.add(node_id)
                            # 根据配置决定是否停止
                            node = self.graph.nodes[node_id]
                            if node.config.get("critical", True):
                                self.state_machine.transition(TaskStatus.FAILED, f"Node {node_id} failed")
                                break
                
                # 非阻塞任务的节点
                await asyncio.sleep(0.1)
        
        except Exception as e:
            self.state_machine.transition(TaskStatus.FAILED, str(e))
            await self._emit_event("workflow_failed", {"error": str(e)})
        
        return {
            "workflow_id": self.workflow_id,
            "status": self.state_machine.status.value,
            "completed": list(self.completed_nodes),
            "failed": list(self.failed_nodes),
            "context": self.context
        }
    
    async def _execute_node(self, node_id: str) -> None:
        """执行单个节点"""
        node = self.graph.nodes[node_id]
        
        # 检查条件
        if node.condition:
            evaluator = ConditionEvaluator(self.context)
            if not evaluator.evaluate(node.condition):
                # 条件不满足，跳过节点
                await self._emit_event("node_skipped", {
                    "node_id": node_id,
                    "reason": "condition_not_met"
                })
                self.completed_nodes.add(node_id)
                return
        
        await self._emit_event("node_started", {"node_id": node_id, "agent_id": node.agent_id})
        
        # 创建异步任务
        task = asyncio.create_task(self._run_agent(node))
        self.running_nodes[node_id] = task
    
    async def _run_agent(self, node: WorkflowNode) -> tuple[str, dict]:
        """运行 Agent 执行节点任务"""
        agent_id = node.agent_id
        
        # 准备输入
        inputs = self._prepare_inputs(node)
        
        # 执行 Agent
        result = await AgentExecutor.execute(
            agent_id=agent_id,
            task_description=node.name,
            inputs=inputs,
            config=node.config,
            checkpoint_enabled=True
        )
        
        return node.id, result
    
    def _is_workflow_complete(self) -> bool:
        """检查工作流是否完成"""
        # 所有终端节点都已完成
        end_nodes = [nid for nid, n in self.graph.nodes.items() 
                     if n.type == NodeType.END]
        
        if not end_nodes:
            # 没有明确的 END 节点，所有节点完成即可
            return len(self.completed_nodes) + len(self.failed_nodes) == len(self.graph.nodes)
        
        return all(nid in self.completed_nodes for nid in end_nodes)
    
    async def _emit_event(self, event_type: str, data: dict) -> None:
        """发送事件"""
        if self.event_callback:
            await self.event_callback(event_type, data)
```

---

### 二、前端 MultiAgentPage 增强

Phase 2 前端在原有基础上，增加**团队配置、工作流编排、任务监控**三个 Tab。

#### 2.1 页面结构

```
┌──────────────────────────────────────────────────────────────────────┐
│  🤖 MultiAgent 协同平台                                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┬───────────────────┬───────────────┬─────────────┐ │
│  │ 👥 团队配置  │ ⚙️ 工作流编排      │ 📋 任务看板   │ 📊 任务监控 │ │
│  └─────────────┴───────────────────┴───────────────┴─────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │                   [Tab Content Area]                          │    │
│  │                                                              │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

#### 2.2 Tab 1: 团队配置 (TeamConfigTab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  👥 团队配置                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 团队基础信息 ────────────────────────────────────────────────┐  │
│  │                                                                  │ │
│  │  团队 ID: [bigdog                   ]   团队名称: [BIGDOG团队 ] │  │
│  │                                                                  │  │
│  │  描述: [AI产品开发团队，包含产品、设计、开发、评审角色         ] │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 协调者 (Manager) ─────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  🤖 小🦊                                                       │  │
│  │     Agent ID: [manager                                    ]   │  │
│  │     角色: [task_coordinator ▼]                                 │  │
│  │     模型: [MiniMax-M2.5 ▼]                                     │  │
│  │     描述: [任务分配、进度把控、结果汇总                      ]  │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 团队成员 ─────────────────────────────────────────────────────┐  │
│  │  [+ 添加成员]                                          [保存配置] │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐│  │
│  │  │ Andy (产品经理)                              [编辑] [删除]││  │
│  │  │ ─────────────────────────────────────────────────────────── ││  │
│  │  │ Agent ID: andy-product-vision                              ││  │
│  │  │ 角色: product_manager                                       ││  │
│  │  │ 职责: 产品设计、需求分析、优先级排序                         ││  │
│  │  │ 配置文件: agent_config_andy.yaml                            ││  │
│  │  │ Git: Andy PM <andy@company.com>                            ││  │
│  │  │ 状态: 🟢 启用    模型: MiniMax-M2.5                        ││  │
│  │  └────────────────────────────────────────────────────────────┘│  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐│  │
│  │  │ Cathy (代码审查专家)                          [编辑] [删除]││  │
│  │  │ ─────────────────────────────────────────────────────────── ││  │
│  │  │ Agent ID: cathy-tech-review                                ││  │
│  │  │ 角色: code_reviewer                                        ││  │
│  │  │ 职责: 技术可行性评审、代码质量把控                           ││  │
│  │  │ 配置文件: agent_config_cathy.yaml                          ││  │
│  │  │ Git: Cathy Review <cathy@review.com>                      ││  │
│  │  │ 状态: 🟢 启用    模型: MiniMax-M2.5                        ││  │
│  │  └────────────────────────────────────────────────────────────┘│  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐│  │
│  │  │ Bob (高级程序员)                              [编辑] [删除]││  │
│  │  │ ─────────────────────────────────────────────────────────── ││  │
│  │  │ Agent ID: bob-p0-implementation                            ││  │
│  │  │ 角色: software_engineer                                    ││  │
│  │  │ 职责: 前后端开发、代码实现                                   ││  │
│  │  │ 配置文件: agent_config_bob.yaml                            ││  │
│  │  │ Git: Bob Dev <zhkmxx9302025@gmail.com>                     ││  │
│  │  │ 状态: 🟢 启用    模型: MiniMax-M2.5                        ││  │
│  │  └────────────────────────────────────────────────────────────┘│  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 协作协议 ─────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  协商模式: [文件协商 ▼]                                          │  │
│  │     ● 文件协商 (Phase 1 ✅)                                     │  │
│  │     ○ 协议协商 (Phase 2+ ⏳)                                     │  │
│  │     ○ 混合协商 (Phase 2+ ⏳)                                     │  │
│  │                                                                  │  │
│  │  文件协议配置:                                                  │  │
│  │     根目录: [/workspace/tasks                               ]  │  │
│  │     格式:   [Markdown ▼]                                       │  │
│  │     ☑ 启用文件锁                                                │  │
│  │     ☑ 启用检查点                                                │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│                                       [重置]           [保存团队配置]   │
└──────────────────────────────────────────────────────────────────────┘
```

**交互说明：**

| 操作 | 行为 |
|------|------|
| 点击成员卡片 | 展开详情，显示配置预览 |
| 点击 [编辑] | 打开成员配置 Modal |
| 点击 [+ 添加成员] | 打开新成员创建 Modal |
| 点击 [保存配置] | 调用 `PUT /api/v1/teams/{team_id}`，成功后 Toast 提示 |
| 切换协商模式 | 显示对应配置面板（文件/协议/混合） |

#### 2.3 Tab 2: 工作流编排 (WorkflowTab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚙️ 工作流编排                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  工作流选择: [P0_FEATURES_20260402 ▼]  [+ 新建工作流]                  │
│                                                                       │
│  ┌─ 工作流信息 ────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  名称: [实现RAG/Agent可交互配置功能                        ]   │  │
│  │  类型: ● 顺序执行  ○ 并行执行  ○ 条件分支                      │  │
│  │  描述: [支持可视化配置RAG参数和Agent行为                    ]   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 流程图 ────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │                        ┌─────────────┐                         │  │
│  │                        │   [Start]   │                         │  │
│  │                        └──────┬──────┘                         │  │
│  │                               │                                 │  │
│  │                               ▼                                 │  │
│  │  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐    │  │
│  │  │ 📝 阶段1     │      │ 🔍 阶段2     │      │ 💻 阶段3     │    │  │
│  │  │ 产品设计    │ ──→  │ 技术评审    │ ──→  │ 开发实现    │    │  │
│  │  │ Andy        │      │ Cathy       │      │ Bob         │    │  │
│  │  └─────────────┘      └──────┬──────┘      └──────┬─────┘    │  │
│  │                               │                    │          │  │
│  │                    条件: verdict in                │          │  │
│  │                         [approved,                │          │  │
│  │                          approved_with_suggestions]          │  │
│  │                               │                    │          │  │
│  │                               ▼                    ▼          │  │
│  │                        ┌─────────────┐      ┌─────────────┐ │  │
│  │                        │  [Review OK]│      │   [End]     │ │  │
│  │                        └─────────────┘      └─────────────┘ │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 节点配置 ──────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  已选择: 阶段2 - 技术评审                                        │  │
│  │                                                                  │  │
│  │  节点名称: [技术评审                                        ]   │  │
│  │  执行 Agent: [Cathy (cathy-tech-review) ▼]                     │  │
│  │  节点类型: [任务节点 ▼]                                          │  │
│  │                                                                  │  │
│  │  输入文件:                                                       │  │
│  │    ┌────────────────────────────────────────────────────────┐   │  │
│  │    │ design_doc.md                                     [×] │   │  │
│  │    └────────────────────────────────────────────────────────┘   │  │
│  │    [+ 添加输入文件]                                              │  │
│  │                                                                  │  │
│  │  输出文件:                                                       │  │
│  │    ┌────────────────────────────────────────────────────────┐   │  │
│  │    │ review_result.md                                  [×] │   │  │
│  │    └────────────────────────────────────────────────────────┘   │  │
│  │    [+ 添加输出文件]                                              │  │
│  │                                                                  │  │
│  │  前置条件:                                                       │  │
│  │    ┌────────────────────────────────────────────────────────┐   │  │
│  │    │ type: field_match                                     │   │  │
│  │    │ field: stage_1.status                                 │   │  │
│  │    │ operator: ==                                          │   │  │
│  │    │ value: "completed"                                    │   │  │
│  │    └────────────────────────────────────────────────────────┘   │  │
│  │    [+ 添加条件]                                                  │  │
│  │                                                                  │  │
│  │  执行配置:                                                        │  │
│  │    超时: [1800] 秒    重试次数: [1] 次                          │  │
│  │    ☑ 关键节点（失败则终止工作流）                                │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [+ 添加阶段]  [- 删除选中阶段]          [保存工作流]  [执行工作流]   │
└──────────────────────────────────────────────────────────────────────┘
```

**交互说明：**

| 操作 | 行为 |
|------|------|
| 点击节点 | 选中节点，右侧显示节点配置面板 |
| 拖拽节点 | 调整节点在流程图中的位置（视觉层面） |
| 连接线点击 | 选中连接线，显示条件配置 |
| [+ 添加阶段] | 打开新节点创建 Modal |
| [执行工作流] | 调用 `POST /api/v1/tasks/{task_id}/execute` |
| 工作流类型切换 | 流程图自动更新（单线/并行/分支） |

#### 2.4 Tab 3: 任务看板 (TaskBoardTab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 任务看板                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  筛选: [全部状态 ▼]  [全部优先级 ▼]  [全部团队 ▼]  [搜索... 🔍]     │
│                                                                       │
│  ┌─────────────────┬─────────────────┬─────────────────┬───────────┐ │
│  │  📝 待处理 (3)   │  🔄 进行中 (2)   │  ⚠️ 阻塞 (1)    │  ✅ 完成 (12)│ │
│  ├─────────────────┼─────────────────┼─────────────────┼───────────┤ │
│  │                 │                 │                 │           │ │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────┐│ │
│  │ │ P1: 新功能X  │ │ │P0: RAG配置  │ │ │P2: JSON导出 │ │ │P1: XXX  ││ │
│  │ │              │ │ │   60%       │ │ │  等待决策    │ │ │ 已完成  ││ │
│  │ │ 创建: 04-02  │ │ │ 阶段2评审中  │ │ │             │ │ │ 04-01   ││ │
│  │ │ 负责人: Andy │ │ │ 负责人:Cathy│ │ │ 负责人: Bob  │ │ │ 负责人: ││ │
│  │ │              │ │ │              │ │ │              │ │ │ Andy    ││ │
│  │ │ [查看详情]   │ │ │ [查看详情]   │ │ │ [查看详情]   │ │ │[查看结果││ │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │ └─────────┘│ │
│  │                 │                 │                 │           │ │
│  │ ┌─────────────┐ │ ┌─────────────┐ │                 │           │ │
│  │ │ P2: 文档优化 │ │ │ P1: UI优化  │ │                 │           │ │
│  │ │              │ │ │   30%       │ │                 │           │ │
│  │ │ 创建: 04-01  │ │ │ 阶段1设计中  │ │                 │           │ │
│  │ │ 负责人: Cathy│ │ │ 负责人: Andy │ │                 │           │ │
│  │ │              │ │ │              │ │                 │           │ │
│  │ │ [查看详情]   │ │ │ [查看详情]   │ │                 │           │ │
│  │ └─────────────┘ │ └─────────────┘ │                 │           │ │
│  │                 │                 │                 │           │ │
│  │ ┌─────────────┐ │                 │                 │           │ │
│  │ │ P0: API重构  │ │                 │                 │           │ │
│  │ │              │ │                 │                 │           │ │
│  │ │ 创建: 04-02  │ │                 │                 │           │ │
│  │ │ 负责人: Bob  │ │                 │                 │           │ │
│  │ │              │ │                 │                 │           │ │
│  │ │ [查看详情]   │ │                 │                 │           │ │
│  │ └─────────────┘ │                 │                 │           │ │
│  │                 │                 │                 │           │ │
│  └─────────────────┴─────────────────┴─────────────────┴───────────┘ │
│                                                                       │
│  [+ 创建新任务]                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**任务卡片信息：**

```
┌─────────────────────────────┐
│ P0: 实现RAG/Agent可交互配置  │  ← 优先级 + 标题
│ ─────────────────────────── │
│ 进度: ████████░░░░░░░░ 60%  │  ← 进度条
│                              │
│ 当前阶段: 阶段2-技术评审      │  ← 正在进行
│ 负责人: Cathy               │
│                              │
│ 创建: 04-02 10:00           │  ← 时间
│ 截止: 04-07 23:59           │
│                              │
│ [查看详情] [暂停] [中止]     │  ← 操作按钮
└─────────────────────────────┘
```

**交互说明：**

| 操作 | 行为 |
|------|------|
| 点击任务卡片 | 打开任务详情 Modal |
| 拖拽卡片 | 可在列之间移动（改变状态） |
| [+ 创建新任务] | 打开新任务创建 Modal |
| 列头计数 | 显示该状态下任务数量 |
| 状态筛选 | 实时过滤看板显示 |

#### 2.5 Tab 4: 任务监控 (TaskMonitorTab)

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 任务监控 - 实时状态                                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  任务选择: [P0_FEATURES_20260402 ▼]           [🔄 自动刷新: 5s] [⏸ 暂停]│
│                                                                       │
│  ┌─ 概览 ──────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │   状态: 🔄 进行中     进度: 60%     耗时: 2h 35m                 │ │
│  │                                                                  │ │
│  │   开始时间: 2026-04-02 10:00    预计结束: 2026-04-02 15:00       │ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 阶段执行状态 ────────────────────────────────────────────────┐  │
│  │                                                                  │ │
│  │  ✅ 阶段1: 产品设计 ─────────────────────────────────────────  │ │
│  │     ├─ 状态: ✅ 已完成                                          │  │
│  │     ├─ 执行者: Andy                                            │  │
│  │     ├─ 耗时: 2h 30m                                            │  │
│  │     ├─ 完成时间: 12:30                                         │  │
│  │     ├─ 输出文件: design_doc.md (856行)                        │  │
│  │     └─ 检查点: cp_20260402_001 (45%) → cp_20260402_002 (70%)   │  │
│  │                                                                  │  │
│  │  🔄 阶段2: 技术评审 ─────────────────────────────────────────  │ │
│  │     ├─ 状态: 🔄 执行中 (60%)                                    │  │
│  │     ├─ 执行者: Cathy                                           │  │
│  │     ├─ 耗时: 35m                                               │  │
│  │     ├─ 当前: 审查 design_doc.md 架构设计章节                   │  │
│  │     ├─ 检查点: cp_20260402_001 (已保存)                        │  │
│  │     └─ 文件锁: review_result.md 🔒 (Cathy, 剩余25分钟)        │  │
│  │                                                                  │  │
│  │  ⏳ 阶段3: 开发实现 ─────────────────────────────────────────   │ │
│  │     ├─ 状态: ⏳ 等待前置完成                                    │  │
│  │     ├─ 执行者: Bob                                             │  │
│  │     └─ 前置条件: 阶段2 评审通过                                │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ Agent 实时状态 ────────────────────────────────────────────────┐  │
│  │                                                                  │ │
│  │   Andy    │ 🟢 空闲 │ 上个任务完成: 12:30 │ 累计任务: 5       │  │
│  │   Cathy   │ 🟡 执行 │ 当前: 评审中 (60%) │ 任务ID: stage_2   │  │
│  │   Bob     │ ⚪ 待机 │ 等待任务开始 ────── │ 队列: 1           │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 文件锁监控 ────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │   design_doc.md     🔒 Andy (写锁)    剩余: 25分钟              │  │
│  │   review_result.md  🔒 Cathy (写锁)   剩余: 28分钟             │  │
│  │   brief.md          🔓 可用                                            │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ 执行日志 (实时) ───────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │   10:00:05 [INFO] 任务开始 - P0_FEATURES_20260402              │  │
│  │   10:00:06 [INFO] 阶段1开始执行 - Andy                          │  │
│  │   10:15:00 [INFO] 检查点保存 - cp_20260402_001 (进度45%)        │  │
│  │   10:30:00 [INFO] 检查点保存 - cp_20260402_002 (进度70%)        │  │
│  │   12:30:00 [INFO] 阶段1完成 - 输出: design_doc.md               │  │
│  │   12:30:05 [INFO] 阶段2开始执行 - Cathy                         │  │
│  │   12:35:00 [INFO] Cathy 获取文件锁 - review_result.md          │  │
│  │   ...                                                           │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [查看完整日志]  [导出日志]  [创建检查点]  [中止任务]                    │
└──────────────────────────────────────────────────────────────────────┘
```

**实时更新机制：**

| 方式 | 说明 |
|------|------|
| WebSocket 推送 | 服务端主动推送状态变更 |
| SSE (Server-Sent Events) | 单向实时通道，适合监控 |
| 轮询 (Polling) | 备选方案，每 5s 刷新 |
| 前端 WebSocket 订阅 | `ws://api/events?task_id=xxx` |

---

### 三、API 端点 (Phase 2 新增)

Phase 2 新增以下 API 端点，支持前端完整功能。

#### 3.1 团队管理 API

##### POST /api/v1/teams - 创建团队

**Request:**
```json
{
  "team_id": "bigdog",
  "name": "BIGDOG团队",
  "description": "AI产品开发团队",
  "coordinator": {
    "agent_id": "manager",
    "name": "小🦊 (Manager)",
    "role": "task_coordinator"
  },
  "members": [
    {
      "agent_id": "andy-product-vision",
      "name": "Andy",
      "role": "product_manager",
      "responsibility": "产品设计、需求分析"
    }
  ],
  "protocol": {
    "negotiation_mode": "file_based"
  }
}
```

**Response (201 Created):**
```json
{
  "team_id": "bigdog",
  "status": "created",
  "config_file": "team_config_bigdog.yaml",
  "created_at": "2026-04-02T20:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: 无效的团队配置
- `409 Conflict`: 团队 ID 已存在

#### 3.2 任务管理 API

##### POST /api/v1/tasks - 创建任务

**Request:**
```json
{
  "team_id": "bigdog",
  "title": "实现RAG/Agent可交互配置功能",
  "description": "支持用户通过界面配置RAG参数和Agent行为",
  "priority": "P0",
  "deadline": "2026-04-07T23:59:59Z",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "支持可视化配置RAG参数"
    }
  ],
  "workflow": {
    "type": "sequential",
    "nodes": [
      {
        "id": "stage_1",
        "name": "产品设计",
        "agent_id": "andy-product-vision",
        "input": ["brief.md"],
        "output": ["design_doc.md"],
        "timeout": 3600
      },
      {
        "id": "stage_2",
        "name": "技术评审",
        "agent_id": "cathy-tech-review",
        "input": ["design_doc.md"],
        "output": ["review_result.md"],
        "depends_on": ["stage_1"],
        "condition": {
          "type": "field_match",
          "field": "stage_1.status",
          "operator": "==",
          "value": "completed"
        }
      }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "team_id": "bigdog",
  "status": "pending",
  "task_dir": "/workspace/tasks/P0_FEATURES_20260402",
  "workflow_id": "wf_20260402_001",
  "created_at": "2026-04-02T20:00:00Z"
}
```

##### GET /api/v1/tasks/{task_id}/status - 获取任务状态

**Response (200 OK):**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "status": "running",
  "progress": 60,
  "current_stage": "stage_2",
  "stages": [
    {
      "id": "stage_1",
      "name": "产品设计",
      "agent_id": "andy-product-vision",
      "status": "completed",
      "started_at": "2026-04-02T10:00:00Z",
      "completed_at": "2026-04-02T12:30:00Z",
      "duration_seconds": 9000,
      "outputs": [
        {
          "file": "design_doc.md",
          "path": "/workspace/tasks/P0_FEATURES_20260402/design_doc.md",
          "lines": 856
        }
      ]
    },
    {
      "id": "stage_2",
      "name": "技术评审",
      "agent_id": "cathy-tech-review",
      "status": "running",
      "progress": 60,
      "started_at": "2026-04-02T12:30:05Z",
      "current_action": "审查 design_doc.md 架构设计章节",
      "checkpoint": {
        "id": "cp_20260402_001",
        "progress": 60
      },
      "file_locks": [
        {
          "file": "review_result.md",
          "locked_by": "cathy-tech-review",
          "remaining_seconds": 1500
        }
      ]
    },
    {
      "id": "stage_3",
      "name": "开发实现",
      "agent_id": "bob-p0-implementation",
      "status": "pending",
      "depends_on": ["stage_2"]
    }
  ],
  "started_at": "2026-04-02T10:00:00Z",
  "elapsed_seconds": 9300,
  "estimated_remaining_seconds": 6200
}
```

##### POST /api/v1/tasks/{task_id}/execute - 执行工作流

**Request:**
```json
{
  "start_stage": "stage_1",
  "context": {
    "user_id": "user123",
    "channel": "feishu",
    "notify_on_start": true,
    "notify_on_complete": true,
    "notify_on_error": true
  }
}
```

**Response (202 Accepted):**
```json
{
  "task_id": "P0_FEATURES_20260402",
  "execution_id": "exec_20260402_001",
  "workflow_id": "wf_20260402_001",
  "status": "running",
  "current_stage": "stage_1",
  "started_at": "2026-04-02T20:00:05Z",
  "websocket_url": "ws://api/v1/tasks/P0_FEATURES_20260402/events"
}
```

**Errors:**
- `400 Bad Request`: 任务状态不允许执行（如已完成）
- `404 Not Found`: 任务不存在
- `409 Conflict`: 任务已在执行中

#### 3.3 WebSocket 事件流

##### WS /api/v1/tasks/{task_id}/events

**连接示例:**
```
ws://localhost:8080/api/v1/tasks/P0_FEATURES_20260402/events
```

**事件类型:**

| Event Type | Description | Payload |
|------------|-------------|---------|
| `workflow_started` | 工作流开始执行 | `{task_id, workflow_id}` |
| `node_started` | 节点开始执行 | `{node_id, agent_id}` |
| `node_progress` | 节点进度更新 | `{node_id, progress, current_action}` |
| `node_completed` | 节点执行完成 | `{node_id, outputs, duration}` |
| `node_failed` | 节点执行失败 | `{node_id, error, can_retry}` |
| `node_skipped` | 节点被跳过 | `{node_id, reason}` |
| `checkpoint_created` | 检查点创建 | `{node_id, checkpoint_id, progress}` |
| `file_lock_acquired` | 文件锁获取 | `{file, agent_id, expires_at}` |
| `file_lock_released` | 文件锁释放 | `{file, agent_id}` |
| `workflow_completed` | 工作流完成 | `{task_id, results}` |
| `workflow_failed` | 工作流失败 | `{task_id, error, failed_node}` |

**事件示例:**
```json
{
  "event": "node_progress",
  "timestamp": "2026-04-02T12:15:00Z",
  "data": {
    "node_id": "stage_2",
    "progress": 60,
    "current_action": "审查 design_doc.md 架构设计章节",
    "checkpoint_id": "cp_20260402_001"
  }
}
```

---

### 四、界面原型（文字描述）

#### 4.1 团队配置页面布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  MultiAgent 协同平台                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  [导航栏] Logo | 团队配置 | 工作流编排 | 任务看板 | 任务监控 | 用户 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  页面标题: 👥 团队配置                                    [帮助] [⚙]│
│                                                                       │
│  ┌─ 操作栏 ────────────────────────────────────────────────────────┐ │
│  │  [← 返回]  团队: [bigdog ▼]                    [+ 新建团队] [导入]│ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  左侧 40%              │           右侧 60%                      ││
│  │  ┌──────────────────┐ │  ┌────────────────────────────────────┐││
│  │  │ 👥 团队信息       │ │  │ 🤖 协调者配置                       │││
│  │  │ ────────────────  │ │  │ ────────────────────────────────────│││
│  │  │ bigdog           │ │  │ Agent: [manager ▼]                │││
│  │  │ BIGDOG团队        │ │  │ 模型: [MiniMax-M2.5 ▼]             │││
│  │  │ 成员: 3           │ │  │ 描述: [                    ]      │││
│  │  └──────────────────┘ │  └────────────────────────────────────┘││
│  │                        │                                          ││
│  │  ┌──────────────────┐ │  ┌────────────────────────────────────┐││
│  │  │ 👥 成员列表       │ │  │ 📋 成员配置 (选中 Andy)             │││
│  │  │ ────────────────  │ │  │ ────────────────────────────────────│││
│  │  │ [●] Andy (PM)    │ │  │ Agent ID: [andy-product-vision    ] │││
│  │  │ [○] Cathy (Review)│ │  │ 名称: [Andy                      ] │││
│  │  │ [○] Bob (Dev)    │ │  │ 角色: [product_manager ▼]          │││
│  │  │                  │ │  │ 职责: [产品设计、需求分析       ] │││
│  │  │ [+ 添加成员]      │ │  │ 模型: [MiniMax-M2.5 ▼]            │││
│  │  └──────────────────┘ │  │ Git: [Andy PM <andy@...>       ] │││
│  │                        │  │ 状态: [●启用 ○禁用]               │││
│  │  ┌──────────────────┐ │  │                                    │││
│  │  │ 📁 协作协议       │ │  │ [+ 保存配置] [取消]                │││
│  │  │ ────────────────  │ │  └────────────────────────────────────┘││
│  │  │ 协商模式: 文件协商│ │                                          ││
│  │  │ 根目录: /tasks   │ │                                          ││
│  │  │ ☑ 文件锁 ☑检查点 │ │                                          ││
│  │  └──────────────────┘ │                                          ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**布局特点:**
- 左侧 40%: 树形结构展示团队信息和成员列表
- 右侧 60%: 选中成员的配置表单
- 成员列表支持单选，选中后右侧显示配置
- 底部显示协作协议配置

#### 4.2 工作流编排页面布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  MultiAgent 协同平台                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  [导航栏] Logo | 团队配置 | 工作流编排 | 任务看板 | 任务监控 | 用户 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  页面标题: ⚙️ 工作流编排                                    [帮助] [⚙]│
│                                                                       │
│  ┌─ 工具栏 ────────────────────────────────────────────────────────┐ │
│  │  工作流: [P0_FEATURES_20260402 ▼]    [新建] [导入] [导出] [执行]│ │
│  │  类型: (●)顺序 (○)并行 (○)条件分支                              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 画布区域 (可缩放/拖拽) ────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │                      ┌─────────┐                                  │ │
│  │                      │ START ●│                                  │ │
│  │                      └────┬────┘                                  │ │
│  │                           │                                       │ │
│  │                    ┌──────▼──────┐                                │ │
│  │                    │  ┌─────┐   │                                │ │
│  │                    │  │ 阶段1│   │ [选中高亮]                     │ │
│  │                    │  │ 产品 │   │                                │ │
│  │                    │  │ 设计 │   │                                │ │
│  │                    │  │ Andy │   │                                │ │
│  │                    │  └─────┘   │                                │ │
│  │                    └──────┬─────┘                                │ │
│  │                           │                                       │ │
│  │                      条件: ✓                                     │ │
│  │                           │                                       │ │
│  │                    ┌──────▼──────┐                                │ │
│  │                    │  ┌─────┐   │                                │ │
│  │                    │  │ 阶段2│   │                                │ │
│  │                    │  │ 技术 │   │                                │ │
│  │                    │  │ 评审 │   │                                │ │
│  │                    │  │Cathy │   │                                │ │
│  │                    │  └─────┘   │                                │ │
│  │                    └──────┬─────┘                                │ │
│  │                           │                                       │ │
│  │              verdict in [approved, ...]                          │ │
│  │                    ┌──────┴──────┐                                │ │
│  │                    │             │                                │ │
│  │               ┌────▼────┐  ┌────▼────┐                           │ │
│  │               │  ┌────┐ │  │  阶段3  │                           │ │
│  │               │  │END │ │  │ 开发    │                           │ │
│  │               │  └────┘ │  │ 实现    │                           │ │
│  │               └─────────┘  │ Bob    │                           │ │
│  │                              └────────┘                           │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 属性面板 (右侧滑出) ─────────────────────────────────────────────┐ │
│  │  节点: 阶段2 - 技术评审                                          │ │
│  │  ─────────────────────────────────────────                        │ │
│  │  Agent: [Cathy ▼]                                                │ │
│  │  输入: [design_doc.md ▼] [+]                                     │ │
│  │  输出: [review_result.md ▼] [+]                                  │ │
│  │  超时: [1800] 秒                                                 │ │
│  │  重试: [1] 次                                                    │ │
│  │  条件: [添加条件 ▼]                                              │ │
│  │       field_match: stage_1.status == "completed"                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**布局特点:**
- 顶部: 工作流选择器和类型切换
- 中央: 可视化画布，支持缩放、拖拽
- 右侧: 选中节点时滑出属性配置面板
- 底部: 状态栏（节点数、执行次数）
- 支持拖拽创建连接线

#### 4.3 任务看板布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  MultiAgent 协同平台                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  [导航栏] Logo | 团队配置 | 工作流编排 | 任务看板 | 任务监控 | 用户 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  页面标题: 📋 任务看板                                    [帮助] [⚙]│
│                                                                       │
│  ┌─ 筛选栏 ────────────────────────────────────────────────────────┐ │
│  │  状态: [全部 ▼]  优先级: [全部 ▼]  团队: [bigdog ▼]  [🔍 搜索] │ │
│  │  排序: [创建时间 ▼]                                             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 看板区域 (可横向滚动) ──────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐│
│  │  │ 📝 待处理 (3) │ │ 🔄 进行中 (2)│ │ ⚠️ 阻塞 (1)  │ │✅ 完成(12)││
│  │  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────┤│
│  │  │              │ │              │ │              │ │          ││
│  │  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │┌────────┐││
│  │  │ │P1 新功能X │ │ ││P0 RAG配置│ │ ││P2 JSON导出│ │ ││P1 XXX │││
│  │  │ │          │ │ ││  ████░░  │ │ ││  等待决策 │ │ ││        │││
│  │  │ │ Andy     │ │ ││  60%     │ │ ││          │ │ ││        │││
│  │  │ │ 04-02    │ │ ││Cathy     │ │ ││  Bob     │ │ ││        │││
│  │  │ │          │ │ ││  04-02   │ │ ││  04-01   │ │ ││        │││
│  │  │ └──────────┘ │ │└──────────┘ │ │└──────────┘ │ │└────────┘││
│  │  │              │ │              │ │              │ │          ││
│  │  │ ┌──────────┐ │ │ ┌──────────┐ │ │              │ │          ││
│  │  │ │P2 文档优化│ │ ││P1 UI优化 │ │ │              │ │          ││
│  │  │ │          │ │ ││  ██░░░░  │ │ │              │ │          ││
│  │  │ │ Cathy    │ │ ││  30%     │ │ │              │ │          ││
│  │  │ │ 04-01    │ │ ││ Andy     │ │ │              │ │          ││
│  │  │ └──────────┘ │ │└──────────┘ │ │              │ │          ││
│  │  │              │ │              │ │              │ │          ││
│  │  │ ┌──────────┐ │ │              │ │              │ │          ││
│  │  │ │P0 API重构│ │ │              │ │              │ │          ││
│  │  │ │          │ │ │              │ │              │ │          ││
│  │  │ │ Bob      │ │ │              │ │              │ │          ││
│  │  │ │ 04-02    │ │ │              │ │              │ │          ││
│  │  │ └──────────┘ │ │              │ │              │ │          ││
│  │  │              │ │              │ │              │ │          ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘│
│  │                                                                   │ │
│  │  [+ 创建新任务]                                                   │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**布局特点:**
- 四列看板：待处理、进行中、阻塞、已完成
- 列头显示状态名称和计数
- 任务卡片显示优先级、进度、负责人、时间
- 支持拖拽移动卡片到不同状态列
- 底部固定 [+ 创建新任务] 按钮

---

### 五、Phase 2 验收标准

| 验收项 | 标准 | 优先级 |
|--------|------|--------|
| 工作流编排引擎 - 顺序执行 | 阶段按序正确执行 | P0 |
| 工作流编排引擎 - 并行执行 | 独立阶段同时执行 | P0 |
| 工作流编排引擎 - 条件分支 | 满足条件走对应分支 | P0 |
| 依赖图 DAG | 支持拓扑排序，无环检测 | P0 |
| 前端 - 团队配置 Tab | 团队成员 CRUD | P0 |
| 前端 - 工作流编排 Tab | 可视化流程图编辑 | P0 |
| 前端 - 任务看板 Tab | 四列看板展示 | P0 |
| 前端 - 任务监控 Tab | 实时状态展示 | P1 |
| API - POST /teams | 创建团队 | P0 |
| API - POST /tasks | 创建任务 | P0 |
| API - GET /tasks/{id}/status | 获取状态 | P0 |
| API - POST /tasks/{id}/execute | 执行工作流 | P0 |
| WebSocket 实时推送 | 任务状态实时推送 | P1 |
| 条件表达式评估 | DAG 节点条件正确评估 | P0 |

---

### 六、Phase 2 里程碑

| 周次 | 内容 |
|------|------|
| **Week 1** | 依赖图引擎、顺序/并行执行器、API 端点 |
| **Week 2** | 条件分支、团队配置 Tab、工作流编排 Tab |
| **Week 3** | 任务看板 Tab、任务监控 Tab、WebSocket 集成 |
| **Week 4** | 端到端测试、Bug 修复、文档完善 |

---

_文档版本: **Phase 2 - V1.0**_  
_最后更新: 2026-04-02_  
_产品经理: Andy_  
_评审: (待评审)_
