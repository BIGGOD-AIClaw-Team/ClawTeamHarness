# Agent 配置系统 V2 - 产品设计文档

> 版本: v2.0  
> 作者: Andy（产品经理）  
> 日期: 2026-03-29  
> 状态: **重新设计**（废弃"画流程图"模式，改为配置式）

---

## 一、设计理念

### 1.1 核心问题

当前设计的错误：
- 把 Agent 编辑做成"画流程图"（ReactFlow 可视化编辑器）
- 用户其实不关心节点连线和拖拽
- 配置式才是正确方向：让用户专注于**配置**而非**编排**

### 1.2 正确设计原则

Agent 编辑应该是**配置驱动**的，关注以下 7 个维度：

```
1. 用哪个大模型（LLM）
2. 用哪种 Agent 模式（ReAct / Plan-Execute / Chat）
3. 构建什么提示词（Prompt）
4. 记忆如何管理（Short / Long / Vector / Hybrid）
5. 决策过程如何控制（自审 / 置信度 / 重规划）
6. MCP/Skills 工具启停
7. 多智能体群 + 角色设定（高级）
```

### 1.3 参考产品

- **Dify Agent**：配置式 Prompt + 工具选择 + 模型选择
- **Coze Agent**：插件 + 提示词 + 模型，配置简洁
- **LangChain Agents**：React / Plan-Execute 等模式
- **LangGraph**：状态机编排（内部用，不暴露给用户）

---

## 二、数据模型

### 2.1 Agent 配置结构（完整 YAML）

```yaml
agent_id: "tactical_analyst"
name: "战术分析Agent"
description: "专业的战术情报分析助手"

# ============ LLM 配置 ============
llm:
  provider: "openai"          # openai / anthropic / local / custom
  model: "gpt-4o"            # 模型名称
  api_base: ""               # 自定义 API 地址（可选）
  api_key_env: "OPENAI_API_KEY"  # 环境变量名
  temperature: 0.7           # 0.0-2.0，默认 0.7
  max_tokens: 4096            # 最大生成 Token
  top_p: 1.0                 # Top-P 采样
  presence_penalty: 0.0      # 存在惩罚
  frequency_penalty: 0.0     # 频率惩罚

# ============ Agent 模式 ============
agent_mode:
  type: "react"              # react / plan_and_execute / chat_conversation / baby_agi / auto_gpt
  max_iterations: 10          # 最大迭代次数
  max_iterations_per_step: 5  # 每步最大工具调用次数
  early_stopping: true        # 达到条件后提前停止
  stop_when:                 # 停止条件（可选）
    - type: "answer_found"    # answer_found / max_steps / error
    - type: "confidence_above"
      threshold: 0.95

# ============ 提示词配置 ============
prompt:
  system: |
    你是一个专业的战术情报分析助手。
    你的职责包括：
    1. 收集和分析战场情报
    2. 评估敌我双方战力对比
    3. 提供战术建议和行动方案
    
    始终保持客观、严谨的分析态度。
  
  user_template: "{input}"    # 用户输入模板
  context_template: ""        # 上下文模板（可选）
  
  few_shot_examples:           # Few-shot 示例（可选）
    - input: "敌方装甲部队向东移动"
      output: "分析：敌方可能在策划侧翼包围。建议加强东线防御。"
    - input: "我方弹药储备不足30%"
      output: "警告：弹药告急！建议立即申请补给或调整作战节奏。"

# ============ 记忆配置 ============
memory:
  enabled: true
  type: "hybrid"              # short / long / vector / hybrid
  
  # 短期记忆
  short_term:
    enabled: true
    max_messages: 50          # 最大消息数
    window_type: "sliding"    # sliding / cumulative
    preserve_roles: ["system", "developer"]  # 这些角色消息永不过期
  
  # 长期记忆
  long_term:
    enabled: true
    storage: "chroma"         # chroma / sqlite / pgvector
    vector_dim: 1536          # 向量维度（OpenAI=1536, Claude=1536）
    top_k: 5                  # 召回 Top-K 条记忆
    similarity_threshold: 0.7 # 相似度阈值
    auto_store: true          # 自动存储重要对话
    namespace: "tactical_agent"  # 命名空间隔离
  
  # 实体记忆（实体-属性-值）
  entity:
    enabled: false
    extract_entities: true    # 自动抽取实体
    entity_types: ["person", "location", "organization", "weapon"]  # 实体类型
  
  # 会话记忆（跨会话持久化）
  session:
    enabled: true
    session_ttl: 86400         # 会话 TTL（秒），0=永不过期

# ============ 决策控制 ============
decision:
  auto_critique: true         # 执行后自动自审
  critique_prompt: |
    检查上述回答是否：
    1. 准确无误
    2. 有足够的细节支撑
    3. 避免了幻觉
    如有问题，请指出并修正。
  
  confidence_threshold: 0.8   # 置信度阈值
  low_confidence_action: "fallback"  # fallback / ask_user / abstain
  allow_replan: true          # 允许基于新信息重新规划
  replan_trigger: "significant_new_info"  # 触发重规划的条件
  
  # 路由策略（多工具时）
  tool_routing:
    strategy: "llm_selected"  # llm_selected / first_match / parallel
    parallel_max: 3           # 并行最大工具数

# ============ 工具配置 ============
tools:
  enabled: true
  mcp_servers:
    - name: "filesystem"
      enabled: true
      config:
        allowed_paths: ["/data/intel", "/data/reports"]
    - name: "web_search"
      enabled: true
      config:
        max_results: 5
        search_engine: "duckduckgo"
    - name: "custom_mcp_server"
      enabled: false
      config: {}
  
  skills:
    - name: "calculator"
      enabled: true
    - name: "code_runner"
      enabled: true
      config:
        language: "python"
        timeout: 30
    - name: "image_generator"
      enabled: false

# ============ 多智能体配置（高级） ============
multi_agent:
  enabled: false
  mode: "supervisor"          # supervisor / collaborative / hierarchical / competitive
  
  supervisor:
    name: "战术主管"
    prompt: "你是一个战术协调主管，负责分配任务给下属并整合结果。"
  
  agents:
    - id: "researcher"
      name: "情报收集员"
      role: "收集战场情报"
      agent_config:          # 引用另一个 Agent 配置（子 Agent 复用）
        llm:
          provider: "openai"
          model: "gpt-4o-mini"
        prompt:
          system: "你专门负责收集和整理战场情报。"
      tools:
        mcp_servers: ["web_search"]
        skills: ["calculator"]
    
    - id: "analyst"
      name: "战术分析师"
      role: "分析情报并提出建议"
      agent_config:
        llm:
          provider: "openai"
          model: "gpt-4o"
        prompt:
          system: "你是一个专业的战术分析师，负责分析情报并给出建议。"
      tools:
        skills: ["calculator"]
    
    - id: "reporter"
      name: "报告撰写员"
      role: "整合并生成最终报告"
      agent_config:
        llm:
          provider: "openai"
          model: "gpt-4o-mini"
        prompt:
          system: "你专门负责撰写格式规范的战术分析报告。"
  
  collaboration:
    shared_memory: true       # 共享记忆
    result_aggregation: "supervisor_summarize"  # supervisor_summarize / voting / chain

# ============ 高级选项 ============
advanced:
  # 流式输出
  streaming: true
  
  # 超时控制
  timeout:
    total: 300                # 总超时（秒）
    per_node: 60              # 单节点超时
  
  # 重试配置
  retry:
    max_attempts: 3
    backoff: "exponential"
    initial_delay: 1.0
  
  # 安全控制
  safety:
    content_filter: true
    max_tool_calls_per_turn: 20
    allow_destructive_tools: false
  
  # 追踪和调试
  tracing:
    enabled: true
    provider: "langfuse"      # langfuse / langsmith / console
    public_key_env: "LANGFUSE_PUBLIC_KEY"
    secret_key_env: "LANGFUSE_SECRET_KEY"
    tags: ["production", "tactical"]
```

### 2.2 简化配置（覆盖 80% 场景）

```yaml
agent_id: "simple_chatbot"
name: "简单客服"
llm:
  provider: "openai"
  model: "gpt-4o-mini"
agent_mode:
  type: "chat_conversation"
prompt:
  system: "你是一个友好的客服助手。"
memory:
  enabled: true
  type: "short"
  short_term:
    max_messages: 20
```

---

## 三、界面设计（配置式编辑）

### 3.1 整体布局

采用 **Tab 式配置面板**，不暴露任何流程图概念：

```
┌─────────────────────────────────────────────────────────────┐
│  Agent 编辑器                                           [保存] [发布] │
├─────────────────────────────────────────────────────────────┤
│  [基本信息] [模型] [模式] [提示词] [记忆] [决策] [工具] [高级]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                                                      │  │
│   │            当前 Tab 的配置表单                        │  │
│   │                                                      │  │
│   │                                                      │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  📋 预览（YAML / JSON）                              │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   [调试面板] - 最近一次保存的配置预览                         │
├─────────────────────────────────────────────────────────────┤
│  状态: 草稿   |   版本: v3   |   最后保存: 10分钟前           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Tab 1：基本信息

```
┌──────────────────────────────────────────────┐
│ 基本信息                                      │
├──────────────────────────────────────────────┤
│  名称 *      [战术分析Agent____________]      │
│                                              │
│  Agent ID   [tactical_analyst___] (自动生成)  │
│              唯一标识，用于 API 调用           │
│                                              │
│  描述        [___________________________]    │
│              [___________________________]    │
│                                              │
│  图标        [🛡️] （预设图标选择）            │
│                                              │
│  标签        [战术] [分析] [+添加]            │
│                                              │
│  分类        [▼ 军事分析          ]           │
└──────────────────────────────────────────────┘
```

### 3.3 Tab 2：模型配置

```
┌──────────────────────────────────────────────┐
│ 模型配置                                      │
├──────────────────────────────────────────────┤
│  提供商    [▼ OpenAI            ]            │
│            ○ OpenAI  ○ Anthropic  ○ 本地模型   │
│            ○ Azure   ○ Google    ○ 自定义     │
│                                              │
│  模型      [▼ gpt-4o              ]            │
│            gpt-4o / gpt-4o-mini / gpt-4       │
│            claude-3-5-sonnet / claude-3-opus  │
│                                              │
│  ──── 高级选项（可折叠）────                  │
│                                              │
│  Temperature  [0.7__________] 0.0-2.0        │
│  Max Tokens   [4096__________]                │
│  Top P        [1.0__________]                 │
│  API Base     [https://api.openai.com/v1___]  │
│                                              │
│  [测试连接] - 验证 API Key 是否有效           │
└──────────────────────────────────────────────┘
```

### 3.4 Tab 3：Agent 模式

```
┌──────────────────────────────────────────────┐
│ Agent 模式                                    │
├──────────────────────────────────────────────┤
│  模式类型    (●) ReAct                        │
│              ○ Plan-and-Execute               │
│              ○ Chat Conversation             │
│              ○ Baby AGI                       │
│              ○ AutoGPT                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  ℹ️ ReAct (推荐)                        │  │
│  │  思考 → 行动 → 观察 → 思考 → ...       │  │
│  │  适合需要工具调用的复杂任务            │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  最大迭代次数  [10________]                   │
│  提前停止      [✓] 达到答案后自动停止         │
│                                              │
│  停止条件                                     │
│  [✓] 找到明确答案                             │
│  [✓] 达到最大迭代                            │
│  [ ] 遇到错误                                │
└──────────────────────────────────────────────┘
```

**模式说明：**

| 模式 | 描述 | 适用场景 |
|------|------|---------|
| **ReAct** | 思考→行动→观察循环 | 需要工具调用的复杂推理 |
| **Plan-and-Execute** | 先计划，再执行 | 多步骤复杂任务 |
| **Chat Conversation** | 纯对话模式 | 简单问答、客服 |
| **Baby AGI** | 自主任务分解 | 开放性目标驱动 |
| **AutoGPT** | 自主决策循环 | 端到端自主任务 |

### 3.5 Tab 4：提示词

```
┌──────────────────────────────────────────────┐
│ 提示词配置                                    │
├──────────────────────────────────────────────┤
│  System Prompt *                              │
│  ┌────────────────────────────────────────┐  │
│  │ 你是一个专业的战术情报分析助手。          │  │
│  │                                          │  │
│  │ 你的职责：                               │  │
│  │ 1. 收集和分析战场情报                    │  │
│  │ 2. 评估敌我双方战力对比                  │  │
│  │ 3. 提供战术建议和行动方案                │  │
│  │                                          │  │
│  │ 始终保持客观、严谨的分析态度。            │  │
│  └────────────────────────────────────────┘  │
│  [格式化] [插入变量 ▾] [模板市场]             │
│                                              │
│  用户输入模板                                  │
│  [{(}input{)}________________________]        │
│  变量：{input} = 用户输入                      │
│                                              │
│  ──── Few-Shot 示例 ────                      │
│  ┌────────────────────────────────────────┐  │
│  │ 示例 1                         [删除]  │  │
│  │ 输入: 敌方装甲部队向东移动               │  │
│  │ 输出: 分析：敌方可能在策划侧翼包围...    │  │
│  ├────────────────────────────────────────┤  │
│  │ [+ 添加示例]                            │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 3.6 Tab 5：记忆管理

```
┌──────────────────────────────────────────────┐
│ 记忆配置                                      │
├──────────────────────────────────────────────┤
│  启用记忆  [✓]                               │
│                                              │
│  记忆类型    [▼ 混合记忆 (推荐)    ]           │
│              ○ 短期记忆（仅会话）              │
│              ○ 长期记忆（向量存储）            │
│              ● 混合记忆（短期+长期）           │
│              ○ 实体记忆                      │
│                                              │
│  ──── 短期记忆 ────                          │
│  最大消息数  [50________]                      │
│  窗口类型    [▼ 滑动窗口        ]            │
│  保留角色    [system] [developer] [+添加]    │
│  ℹ️ 选中角色的消息永不过期                    │
│                                              │
│  ──── 长期记忆 ────                          │
│  启用        [✓]                             │
│  存储方式    [▼ ChromaDB (嵌入)  ]            │
│  向量维度    [1536] (自动匹配模型)            │
│  召回条数    [5________] Top-K                │
│  相似度阈值  [0.7________]                    │
│  命名空间    [tactical_agent____]             │
│                                              │
│  [测试记忆召回] - 输入文本测试召回效果          │
└──────────────────────────────────────────────┘
```

### 3.7 Tab 6：决策控制

```
┌──────────────────────────────────────────────┐
│ 决策控制                                      │
├──────────────────────────────────────────────┤
│  自审机制    [✓] 启用自动自审                  │
│  ┌────────────────────────────────────────┐  │
│  │ System Prompt:                         │  │
│  │ 检查上述回答是否：                      │  │
│  │ 1. 准确无误                             │  │
│  │ 2. 有足够的细节支撑                     │  │
│  │ 3. 避免了幻觉                           │  │
│  │ 如有问题，请指出并修正。                │  │
│  └────────────────────────────────────────┘  │
│  [恢复默认] [自定义]                          │
│                                              │
│  置信度阈值  [0.8________]                    │
│  ℹ️ 低于此阈值时会触发 fallback 或询问用户      │
│                                              │
│  低置信度动作  [▼ 降级处理      ]             │
│                ○ 返回"不知道"                │
│                ○ 询问用户确认                │
│                ● 降级处理（使用更保守策略）   │
│                                              │
│  允许重规划    [✓]                           │
│  重规划触发    [▼ 重要新信息出现]             │
└──────────────────────────────────────────────┘
```

### 3.8 Tab 7：工具配置

```
┌──────────────────────────────────────────────┐
│ 工具配置                                      │
├──────────────────────────────────────────────┤
│  启用工具  [✓]                               │
│                                              │
│  ──── MCP Servers ────                       │
│  [+ 添加 MCP Server]                         │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ☑ filesystem                   [配置]  │  │
│  │   状态: 已连接 | 工具数: 3              │  │
│  │   allowed_paths: /data/intel, /data/.. │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ☑ web_search                   [配置]  │  │
│  │   状态: 已连接 | 工具数: 1              │  │
│  │   max_results: 5                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ☐ custom_mcp_server                   │  │
│  │   未配置                              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ──── Skills ────                           │
│  ☑ calculator                      [详情]    │
│  ☑ code_runner                    [详情]    │
│  ☐ image_generator                 [详情]  │
└──────────────────────────────────────────────┘
```

### 3.9 Tab 8：多智能体（高级）

```
┌──────────────────────────────────────────────────────────────┐
│ 多智能体配置                                      [高级]      │
├──────────────────────────────────────────────────────────────┤
│  启用多智能体  [ ]                                               │
│                                                              │
│  协作模式    [▼ Supervisor (推荐)  ]                           │
│              ○ Supervisor - 一个监督者分配任务                 │
│              ○ Collaborative - 协作模式                       │
│              ○ Hierarchical - 层级管理                         │
│              ○ Competitive - 竞争模式                         │
│                                                              │
│  ──── Supervisor ────                                         │
│  主管名称    [战术主管________________]                         │
│  主管提示词  ┌──────────────────────────────────────────┐      │
│              │ 你是一个战术协调主管，负责分配任务给...    │      │
│              └──────────────────────────────────────────┘      │
│                                                              │
│  ──── 子 Agent ────                                           │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ researcher        情报收集员            [编辑] [删除] │   │
│  │   模型: gpt-4o-mini  |  工具: web_search, calculator   │   │
│  └────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ analyst           战术分析师           [编辑] [删除] │   │
│  │   模型: gpt-4o       |  工具: calculator              │   │
│  └────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ reporter          报告撰写员           [编辑] [删除] │   │
│  │   模型: gpt-4o-mini |  工具: (无)                      │   │
│  └────────────────────────────────────────────────────────┘   │
│  [+ 添加子 Agent]                                              │
│                                                              │
│  ──── 协作设置 ────                                           │
│  ☑ 共享记忆池                                                 │
│  结果聚合方式  [▼ Supervisor 总结整合]                         │
│                ○ 投票表决  ○ 链式传递                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 四、用户流程

### 4.1 创建 Agent 流程

```
[创建 Agent] → 填写基本信息 → 选择模型 → 配置提示词 → 配置记忆 → 配置工具 → 调试 → 发布
```

**Step 1: 基本信息（必填）**
- 名称、描述、标签
- 1 分钟完成

**Step 2: 模型配置（必填）**
- 选择提供商和模型
- 测试连接

**Step 3: 提示词配置（必填）**
- System Prompt
- 可选 Few-shot 示例

**Step 4: 记忆配置（可选，推荐开启）**
- 选择记忆类型
- 调整参数

**Step 5: 工具配置（可选）**
- 启用 MCP Servers
- 选择 Skills

**Step 6: 调试**
- 输入测试问题
- 查看执行过程和结果
- 调整配置

**Step 7: 发布**
- 预览完整配置
- 确认后发布
- 开始使用

### 4.2 调试面板

```
┌─────────────────────────────────────────────────────────────┐
│ 调试面板                                                      │
├─────────────────────────────────────────────────────────────┤
│  输入问题:                                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 敌方装甲部队向东移动，预测其下一步行动                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  [▶ 执行]  [⏹ 停止]                                          │
│                                                             │
│  ──── 执行追踪 ────                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 21:17:01  💬 用户输入                                   │  │
│  │ 21:17:01  🧠 思考: 用户询问敌方装甲部队动向...           │  │
│  │ 21:17:02  🔧 调用工具: web_search                       │  │
│  │           输入: "敌方装甲部队战术机动模式"               │  │
│  │ 21:17:03  📋 工具结果: [搜索结果...]                    │  │
│  │ 21:17:04  🧠 思考: 基于搜索结果分析...                   │  │
│  │ 21:17:05  ✅ 最终回答                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ──── 记忆状态 ────                                          │
│  短期: 12/50 条  |  长期召回: 3 条  |  相似度: 0.85+         │
│                                                             │
│  ──── Token 统计 ────                                        │
│  输入: 1,234  |  输出: 567  |  总计: 1,801                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、Agent 模式详解

### 5.1 ReAct 模式（推荐）

```
思考 → 行动 → 观察 → 思考 → 行动 → 观察 → ... → 结束
```

**实现原理：**
```python
while iteration < max_iterations:
    # 1. Think - LLM 生成思考
    thought = llm.think(messages, context)
    
    # 2. Action - 选择并执行工具
    if has_action(thought):
        action, params = parse_action(thought)
        result = await tools.execute(action, params)
        messages.append(tool_result)
    else:
        # 没有工具调用，直接生成回复
        break
    
    # 3. Observe - 观察结果，进入下一轮
    iteration += 1
```

### 5.2 Plan-and-Execute 模式

```
计划阶段 → 执行阶段 → 报告阶段
```

**实现原理：**
```python
# Phase 1: Planning
plan = llm.plan(
    "目标: {input}",
    "请将目标分解为多个步骤"
)
steps = parse_plan(plan)

# Phase 2: Execution
results = []
for step in steps:
    result = await execute_step(step, context)
    results.append(result)
    # 可选：每步后让 LLM 评估是否需要重规划

# Phase 3: Reporting
final_response = llm.synthesize(
    original_goal,
    steps,
    results
)
```

### 5.3 Chat Conversation 模式

最简单的对话模式，无工具调用：

```python
messages.append({"role": "user", "content": user_input})
response = await llm.chat(messages)
messages.append({"role": "assistant", "content": response})
return response
```

### 5.4 Baby AGI 模式

```python
objective = user_input
task_list = [Task(description=objective)]

while task_list:
    task = task_list.pop(0)
    
    # 1. 执行任务
    result = await execute_task(task, context)
    
    # 2. 存储结果到记忆
    memory.add(result)
    
    # 3. 提取新任务
    new_tasks = llm.extract_tasks(result, objective)
    task_list.extend(new_tasks)
    
    # 4. 优先级排序
    task_list = prioritize(task_list)
```

### 5.5 AutoGPT 模式

```python
# 自主循环：目标 → 计划 → 执行 → 评估 → 调整
while not done:
    # 1. 接收反馈
    feedback = get_feedback(context)
    
    # 2. 重新评估目标
    if should_replan(feedback):
        plan = llm.replan(objective, feedback)
    
    # 3. 选择下一个动作
    action = llm.select_action(plan, context)
    
    # 4. 执行并获取反馈
    result = await execute(action)
    context.update(result)
```

---

## 六、记忆系统详解

### 6.1 记忆层级架构

```
┌─────────────────────────────────────────────┐
│              用户输入                        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         实体记忆 (Entity Memory)            │
│   抽取: 人名、地点、组织、事件、武器装备      │
│   结构: {entity: {type, attributes, values}}│
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         短期记忆 (Short-Term)                │
│   滑动窗口: 最近 N 条对话                     │
│   角色保护: system/developer 永不过期        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         长期记忆 (Long-Term)                 │
│   向量数据库: ChromaDB / PGVector            │
│   语义召回: Top-K + 相似度阈值               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         上下文构建                           │
│   将相关记忆注入 Prompt                       │
│   格式: {relevant_memories}\n\n{input}      │
└─────────────────────────────────────────────┘
```

### 6.2 记忆召回流程

```python
async def retrieve_relevant_memories(query: str, top_k: int = 5) -> list[dict]:
    # 1. 实体抽取
    entities = extract_entities(query)
    
    # 2. 短期记忆匹配（关键词）
    short_term_hits = keyword_match(query, short_term_memory)
    
    # 3. 长期记忆召回（向量相似度）
    long_term_hits = await vector_search(query, top_k * 2)
    long_term_hits = [h for h in long_term_hits 
                      if h.similarity >= similarity_threshold]
    
    # 4. 实体记忆匹配
    entity_hits = entity_match(entities, entity_memory)
    
    # 5. 合并去重，按相关性排序
    all_hits = merge_and_dedupe(short_term_hits, long_term_hits, entity_hits)
    return all_hits[:top_k]
```

---

## 七、技术实现建议

### 7.1 后端改动

**新增模块：**
```
backend/src/agents/
├── config_models.py      # Pydantic 模型定义
├── agent_factory.py      # 根据配置创建 Agent 实例
├── modes/
│   ├── react.py          # ReAct 模式
│   ├── plan_execute.py   # Plan-Execute 模式
│   ├── chat.py           # Chat 模式
│   ├── baby_agi.py       # Baby AGI 模式
│   └── auto_gpt.py       # AutoGPT 模式
├── memory/
│   ├── manager.py        # 统一记忆管理器
│   ├── short_term.py     # 短期记忆
│   ├── long_term.py      # 长期记忆
│   ├── entity.py          # 实体记忆
│   └── retriever.py      # 召回器
└── decision/
    ├── critic.py         # 自审机制
    ├── confidence.py      # 置信度评估
    └── replanner.py       # 重规划器
```

**Agent 配置 API：**
```
GET    /api/v1/agents                    # 列表
POST   /api/v1/agents                    # 创建
GET    /api/v1/agents/:id                # 获取
PUT    /api/v1/agents/:id                # 更新（完整配置）
PATCH  /api/v1/agents/:id                # 部分更新
DELETE /api/v1/agents/:id                # 删除
POST   /api/v1/agents/:id/publish        # 发布
POST   /api/v1/agents/:id/unpublish      # 取消发布
POST   /api/v1/agents/:id/validate       # 验证配置
POST   /api/v1/agents/:id/test           # 测试执行
GET    /api/v1/agents/:id/preview        # 预览 YAML
```

### 7.2 前端改动

**新页面：**
```
frontend/src/pages/
├── AgentPage.tsx          # Agent 列表（保留）
├── AgentEditPage.tsx      # 新：Agent 编辑页面（配置式）
├── AgentDebugPage.tsx     # 新：调试页面
└── AgentConfigComponents/ # 新：配置组件库
    ├── BasicInfoTab.tsx
    ├── LLMConfigTab.tsx
    ├── ModeConfigTab.tsx
    ├── PromptTab.tsx
    ├── MemoryTab.tsx
    ├── DecisionTab.tsx
    ├── ToolsTab.tsx
    └── MultiAgentTab.tsx
```

**关键组件：**
- `YamlEditor` - YAML 配置编辑器（ Monaco Editor）
- `FormTab` - 表单式 Tab 切换
- `PromptEditor` - 带变量高亮的 Prompt 编辑器
- `MemoryVisualizer` - 记忆状态可视化
- `ExecutionTracer` - 执行追踪面板

### 7.3 数据迁移

**旧格式 → 新格式迁移脚本：**

```python
# 将旧的 graph_def 转换为新的配置结构
def migrate_agent(agent_data: dict) -> dict:
    return {
        "agent_id": agent_data["agent_id"],
        "name": agent_data["name"],
        "description": agent_data.get("description", ""),
        "llm": {
            "provider": "openai",
            "model": "gpt-4",
            "temperature": 0.7,
        },
        "agent_mode": {
            "type": "react",
            "max_iterations": 10,
        },
        "prompt": {
            "system": extract_system_prompt_from_graph(agent_data),
            "user_template": "{input}",
        },
        "memory": {
            "enabled": True,
            "type": "short",
            "short_term": {"max_messages": 50},
        },
        "tools": {
            "enabled": True,
            "mcp_servers": [],
            "skills": [],
        },
        "multi_agent": {"enabled": False},
    }
```

---

## 八、验收标准

### 8.1 功能验收

- [ ] 能创建、编辑、删除 Agent
- [ ] 能选择 LLM 提供商和模型
- [ ] 能选择 Agent 模式（ReAct / Plan-Execute / Chat / Baby AGI / AutoGPT）
- [ ] 能配置 System Prompt 和 Few-shot 示例
- [ ] 能配置短期记忆（滑动窗口）
- [ ] 能配置长期记忆（向量存储）
- [ ] 能启用/禁用 MCP Servers 和 Skills
- [ ] 能配置多智能体协作（Supervisor 模式）
- [ ] 能调试执行并查看追踪日志
- [ ] 能发布和取消发布 Agent

### 8.2 体验验收

- [ ] 无需画流程图，所有配置通过表单完成
- [ ] 配置项有清晰的说明和默认值
- [ ] 能预览完整配置（YAML/JSON）
- [ ] 调试面板能看到完整的执行过程
- [ ] Token 使用量有统计

### 8.3 性能验收

- [ ] Agent 列表页面加载 < 1s
- [ ] 配置保存 < 500ms
- [ ] 调试执行响应时间 < 3s（不含 LLM 调用）

---

## 九、里程碑

```
Phase 1: 核心配置表单 (Week 1)
├── 新数据模型定义
├── 基本信息 Tab
├── LLM 配置 Tab
├── Agent 模式 Tab
├── 提示词 Tab
└── 后端 API 适配

Phase 2: 记忆和工具 (Week 2)
├── 记忆配置 Tab
├── 工具配置 Tab
├── MCP 集成
└── Skills 集成

Phase 3: 高级功能 (Week 3)
├── 决策控制 Tab
├── 多智能体 Tab
├── 调试面板
└── 配置预览（YAML）

Phase 4: 完善和迁移 (Week 4)
├── 配置验证
├── 测试执行
├── 旧数据迁移
├── 文档完善
└── 集成测试
```
