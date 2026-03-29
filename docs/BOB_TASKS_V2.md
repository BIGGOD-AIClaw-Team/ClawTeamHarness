# Bob 开发任务：Agent 配置系统 V2

> 负责人: Bob  
> 任务来源: Andy（产品经理）  
> 开始日期: 2026-03-29  
> 预计工期: 4 周  
> 优先级: P0

---

## 背景

当前 ClawTeamHarness 的 Agent 编辑使用 ReactFlow 画流程图方式，用户体验差且不符合实际需求。

**正确方向**：Agent 编辑应该是配置式的，用户关注 7 个维度：
1. 用哪个大模型
2. 用哪种 Agent 模式
3. 构建什么提示词
4. 记忆如何管理
5. 决策过程如何控制
6. MCP/Skills 工具启停
7. 多智能体群 + 角色设定

**参考文档**：`docs/AGENT_DESIGN_V2.md`

---

## Phase 1: 数据模型与后端 API（第 1 周）

### Task 1.1: 定义 Agent 配置 Pydantic 模型

**文件**: `backend/src/agents/config_models.py`（新建）

**内容**：
```python
from pydantic import BaseModel, Field
from typing import Optional, Literal

class LLMConfig(BaseModel):
    provider: Literal["openai", "anthropic", "local", "custom"] = "openai"
    model: str = "gpt-4o"
    api_base: str = ""
    api_key_env: str = "OPENAI_API_KEY"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0

class AgentModeConfig(BaseModel):
    type: Literal["react", "plan_and_execute", "chat_conversation", "baby_agi", "auto_gpt"] = "react"
    max_iterations: int = Field(default=10, ge=1)
    max_iterations_per_step: int = Field(default=5, ge=1)
    early_stopping: bool = True
    stop_when: list[dict] = []

class FewShotExample(BaseModel):
    input: str
    output: str

class PromptConfig(BaseModel):
    system: str = ""
    user_template: str = "{input}"
    context_template: str = ""
    few_shot_examples: list[FewShotExample] = []

class ShortTermMemoryConfig(BaseModel):
    enabled: bool = True
    max_messages: int = Field(default=50, ge=1)
    window_type: Literal["sliding", "cumulative"] = "sliding"
    preserve_roles: list[str] = ["system", "developer"]

class LongTermMemoryConfig(BaseModel):
    enabled: bool = False
    storage: Literal["chroma", "sqlite", "pgvector"] = "chroma"
    vector_dim: int = 1536
    top_k: int = Field(default=5, ge=1)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    auto_store: bool = True
    namespace: str = "default"

class EntityMemoryConfig(BaseModel):
    enabled: bool = False
    extract_entities: bool = True
    entity_types: list[str] = ["person", "location", "organization"]

class SessionMemoryConfig(BaseModel):
    enabled: bool = True
    session_ttl: int = 86400

class MemoryConfig(BaseModel):
    enabled: bool = True
    type: Literal["short", "long", "vector", "hybrid"] = "short"
    short_term: ShortTermMemoryConfig = ShortTermMemoryConfig()
    long_term: LongTermMemoryConfig = LongTermMemoryConfig()
    entity: EntityMemoryConfig = EntityMemoryConfig()
    session: SessionMemoryConfig = SessionMemoryConfig()

class DecisionConfig(BaseModel):
    auto_critique: bool = False
    critique_prompt: str = ""
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    low_confidence_action: Literal["fallback", "ask_user", "abstain"] = "fallback"
    allow_replan: bool = False
    replan_trigger: str = "significant_new_info"
    tool_routing: dict = {}

class MCPServerConfig(BaseModel):
    name: str
    enabled: bool = True
    config: dict = {}

class SkillConfig(BaseModel):
    name: str
    enabled: bool = True
    config: dict = {}

class ToolsConfig(BaseModel):
    enabled: bool = True
    mcp_servers: list[MCPServerConfig] = []
    skills: list[SkillConfig] = []

class SubAgentConfig(BaseModel):
    id: str
    name: str
    role: str
    agent_config: dict = {}
    tools: dict = {}

class MultiAgentConfig(BaseModel):
    enabled: bool = False
    mode: Literal["supervisor", "collaborative", "hierarchical", "competitive"] = "supervisor"
    supervisor: dict = {}
    agents: list[SubAgentConfig] = []
    collaboration: dict = {}

class AdvancedConfig(BaseModel):
    streaming: bool = True
    timeout: dict = {"total": 300, "per_node": 60}
    retry: dict = {"max_attempts": 3, "backoff": "exponential"}
    safety: dict = {"content_filter": True}
    tracing: dict = {"enabled": False}

class AgentConfig(BaseModel):
    """完整的 Agent 配置"""
    agent_id: str
    name: str
    description: str = ""
    tags: list[str] = []
    icon: str = "🤖"
    category: str = "general"
    
    # 核心配置
    llm: LLMConfig = LLMConfig()
    agent_mode: AgentModeConfig = AgentModeConfig()
    prompt: PromptConfig = PromptConfig()
    memory: MemoryConfig = MemoryConfig()
    decision: DecisionConfig = DecisionConfig()
    tools: ToolsConfig = ToolsConfig()
    multi_agent: MultiAgentConfig = MultiAgentConfig()
    advanced: AdvancedConfig = AdvancedConfig()
    
    # 状态字段
    status: Literal["draft", "published"] = "draft"
    published_at: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""
    version: int = 1
```

**验收标准**：
- [ ] Pydantic 模型定义完整
- [ ] 类型注解正确
- [ ] 有完整的 Field 验证

---

### Task 1.2: 创建 Agent Factory

**文件**: `backend/src/agents/agent_factory.py`（新建）

**功能**：
- 根据 `AgentConfig` 创建对应的 Agent 实例
- 支持 5 种 Agent 模式（ReAct / Plan-Execute / Chat / Baby AGI / AutoGPT）
- 注入记忆管理器
- 注入工具列表

**伪代码**：
```python
class AgentFactory:
    @staticmethod
    def create_agent(config: AgentConfig) -> BaseAgent:
        mode_type = config.agent_mode.type
        
        if mode_type == "react":
            return ReActAgent(config)
        elif mode_type == "plan_and_execute":
            return PlanExecuteAgent(config)
        elif mode_type == "chat_conversation":
            return ChatAgent(config)
        elif mode_type == "baby_agi":
            return BabyAGIAgent(config)
        elif mode_type == "auto_gpt":
            return AutoGPTAgent(config)
        else:
            raise ValueError(f"Unknown agent mode: {mode_type}")
```

**验收标准**：
- [ ] 能根据配置创建 5 种模式的 Agent
- [ ] 记忆管理器正确注入
- [ ] 工具列表正确注入

---

### Task 1.3: 实现 5 种 Agent 模式

**文件**：
- `backend/src/agents/modes/react.py`（新建）
- `backend/src/agents/modes/plan_execute.py`（新建）
- `backend/src/agents/modes/chat.py`（新建）
- `backend/src/agents/modes/baby_agi.py`（新建）
- `backend/src/agents/modes/auto_gpt.py`（新建）

**ReAct 模式核心逻辑**：
```python
async def run(self, input: str, context: dict) -> dict:
    messages = [{"role": "user", "content": input}]
    
    for i in range(self.config.agent_mode.max_iterations):
        # 1. Think - 生成思考
        thought = await self.llm.think(messages, context)
        
        # 2. 解析 action
        if thought.has_action():
            action, params = thought.parse_action()
            result = await self.tools.execute(action, params)
            messages.append({"role": "tool", "content": result})
        else:
            # 没有 action，生成最终回复
            return {"response": thought.response, "messages": messages}
    
    return {"response": "达到最大迭代次数", "messages": messages}
```

**验收标准**：
- [ ] 5 种模式都有基础实现
- [ ] 能正确执行工具调用
- [ ] 支持流式输出（可选）

---

### Task 1.4: 实现记忆管理器

**文件**：
- `backend/src/agents/memory/manager.py`（新建，改造现有模块）

**核心接口**：
```python
class MemoryManager:
    def __init__(self, config: MemoryConfig):
        self.short_term = ShortTermMemory(config.short_term)
        self.long_term = LongTermMemory(config.long_term) if config.long_term.enabled else None
        self.entity = EntityMemory(config.entity) if config.entity.enabled else None
    
    async def add_message(self, role: str, content: str): ...
    async def get_context(self, query: str, top_k: int = 5) -> str: ...
    async def store(self, content: str, metadata: dict = {}): ...
```

**验收标准**：
- [ ] 短期记忆：滑动窗口正常工作
- [ ] 长期记忆：ChromaDB 召回正常
- [ ] 混合模式：短期+长期正确合并

---

### Task 1.5: 适配 Agent API

**文件**: `backend/src/api/routes/agents.py`（改造）

**改动点**：
1. `AgentCreateRequest` / `AgentUpdateRequest` 改为使用 `AgentConfig` Pydantic 模型
2. 新增 `POST /api/v1/agents/:id/validate` - 验证配置
3. 新增 `POST /api/v1/agents/:id/test` - 测试执行
4. 新增 `GET /api/v1/agents/:id/preview` - 预览 YAML
5. 移除对 `graph_def` 的依赖

**验收标准**：
- [ ] 创建/更新 Agent 使用新配置结构
- [ ] 能导出/导入 YAML 格式配置
- [ ] API 返回正确的错误信息

---

## Phase 2: 前端配置表单（第 2 周）

### Task 2.1: 搭建配置表单框架

**文件**: `frontend/src/pages/AgentEditPage.tsx`（新建）

**布局**：
- 左侧：Tab 导航（基本信息/模型/模式/提示词/记忆/决策/工具/多智能体）
- 右侧：Tab 内容区域（表单）
- 底部：保存/发布按钮 + 状态栏

**使用 Ant Design Tabs + Form**

**验收标准**：
- [ ] Tab 切换流畅
- [ ] 表单布局美观
- [ ] 响应式适配

---

### Task 2.2: 实现基本信息 Tab

**组件**: `frontend/src/components/agent-config/BasicInfoTab.tsx`

**字段**：
- name（必填，Input）
- agent_id（自动生成，可编辑）
- description（TextArea）
- icon（预设图标选择）
- tags（Tag 输入）
- category（Select 下拉）

**验收标准**：
- [ ] 所有字段正确渲染
- [ ] agent_id 自动生成逻辑正确
- [ ] 验证规则正确

---

### Task 2.3: 实现模型配置 Tab

**组件**: `frontend/src/components/agent-config/LLMConfigTab.tsx`

**字段**：
- provider（Radio.Group：OpenAI / Anthropic / Local / Custom）
- model（Select，根据 provider 显示不同选项）
- temperature（Slider 0-2 或 Input）
- max_tokens（Input Number）
- top_p（Input Number）
- api_base（Input，Custom 时显示）
- 测试连接按钮

**验收标准**：
- [ ] Provider 切换时 Model 下拉联动
- [ ] 测试连接能验证 API Key
- [ ] 显示连接结果

---

### Task 2.4: 实现 Agent 模式 Tab

**组件**: `frontend/src/components/agent-config/ModeConfigTab.tsx`

**字段**：
- type（Radio.Group：ReAct / Plan-Execute / Chat / Baby AGI / AutoGPT）
- 每个模式有说明卡片
- max_iterations（Input Number）
- early_stopping（Switch）
- stop_when（Checkbox.Group）

**验收标准**：
- [ ] 5 种模式可选
- [ ] 选中模式有说明
- [ ] 展开/折叠高级选项

---

### Task 2.5: 实现提示词 Tab

**组件**: `frontend/src/components/agent-config/PromptTab.tsx`

**字段**：
- system（TextArea，支持多行，带语法高亮）
- user_template（Input）
- Few-shot 示例（动态增减）

**组件**：
- `PromptEditor` - 带占位符高亮
- `FewShotEditor` - 示例编辑器

**验收标准**：
- [ ] System Prompt 能正确保存
- [ ] Few-shot 示例能增删改
- [ ] 变量插入功能

---

### Task 2.6: 实现记忆配置 Tab

**组件**: `frontend/src/components/agent-config/MemoryTab.tsx`

**字段**：
- enabled（Switch）
- type（Radio：短期/长期/混合/实体）
- 短期：max_messages、window_type
- 长期：storage、top_k、similarity_threshold

**验收标准**：
- [ ] 记忆类型切换显示不同配置
- [ ] 测试召回按钮

---

### Task 2.7: 实现工具配置 Tab

**组件**: `frontend/src/components/agent-config/ToolsTab.tsx`

**字段**：
- enabled（Switch）
- MCP Servers 列表（Card 展示，开关控制）
- Skills 列表（Card 展示，开关控制）
- 添加 Server/Skill 按钮

**验收标准**：
- [ ] 能看到所有可用 MCP/Skills
- [ ] 能启用/禁用单个工具
- [ ] 配置按钮能打开详情 Modal

---

### Task 2.8: 实现决策控制 Tab

**组件**: `frontend/src/components/agent-config/DecisionTab.tsx`

**字段**：
- auto_critique（Switch）
- critique_prompt（TextArea）
- confidence_threshold（Slider 0-1）
- low_confidence_action（Select）
- allow_replan（Switch）

**验收标准**：
- [ ] 自审开关联动 Prompt 显示
- [ ] 置信度 Slider 实时显示数值

---

### Task 2.9: 实现多智能体 Tab（高级）

**组件**: `frontend/src/components/agent-config/MultiAgentTab.tsx`

**字段**：
- enabled（Switch，初始折叠）
- mode（Radio）
- Supervisor 配置
- 子 Agent 列表（Card）
- 添加子 Agent 按钮

**验收标准**：
- [ ] 启用后才显示完整配置
- [ ] 子 Agent 增删改正常

---

## Phase 3: 调试与预览（第 3 周）

### Task 3.1: 实现调试面板

**文件**: `frontend/src/components/agent-config/DebugPanel.tsx`（新建）

**功能**：
- 输入测试问题
- 执行按钮
- 执行追踪（步骤列表）
- Token 统计

**UI 布局**：
```
┌─────────────────────────────────────────┐
│ 输入问题:                                │
│ [________________________] [▶ 执行]       │
│                                         │
│ ──── 追踪 ────                          │
│ 21:17  Think: ...                       │
│ 21:17  Action: web_search               │
│ 21:18  Tool Result: ...                 │
│ 21:18  Final: ...                       │
│                                         │
│ Token: 1234 输入 / 567 输出              │
└─────────────────────────────────────────┘
```

**验收标准**：
- [ ] 能看到每一步执行
- [ ] 流式输出实时显示
- [ ] Token 统计准确

---

### Task 3.2: 实现 YAML 预览

**组件**: `frontend/src/components/YamlPreview.tsx`（新建）

**功能**：
- 显示当前配置的 YAML 格式
- 语法高亮（Monaco Editor）
- 一键复制
- 导入 YAML 功能

**验收标准**：
- [ ] YAML 格式正确
- [ ] 能复制到剪贴板
- [ ] 能导入 YAML 并解析

---

### Task 3.3: 配置验证

**后端**: `POST /api/v1/agents/:id/validate`

**前端**: 保存前调用验证接口

**验证内容**：
- 必填字段检查
- LLM 连接测试
- 配置逻辑检查（如多智能体必须有子 Agent）

**验收标准**：
- [ ] 保存前验证
- [ ] 错误提示清晰

---

## Phase 4: 完善与数据迁移（第 4 周）

### Task 4.1: 配置导入导出

**功能**：
- 导出为 YAML 文件
- 从 YAML 导入
- 复制配置到另一个 Agent

**验收标准**：
- [ ] 导出文件能正确下载
- [ ] 导入后配置完整

---

### Task 4.2: 旧数据迁移

**脚本**: `backend/scripts/migrate_agents.py`

**功能**：
- 读取旧的 JSON Agent 文件
- 转换为新的配置格式
- 保留原有 graph_def 作为参考（不删除）

**验收标准**：
- [ ] 现有 Agent 能正确迁移
- [ ] 迁移后功能正常

---

### Task 4.3: 文档更新

**更新文件**：
- `docs/AGENT_GRAPH_GUIDE.md` → 标记废弃
- `docs/AGENT_DESIGN_V2.md` → 补充 API 文档
- `README.md` → 更新使用说明

**验收标准**：
- [ ] 旧文档标记废弃
- [ ] 新文档完整

---

## 技术要求

### 后端
- Python 3.11+
- FastAPI
- Pydantic v2
- LangChain / LangGraph
- ChromaDB（可选，用于向量记忆）

### 前端
- React 18+
- TypeScript 5+
- Ant Design 5+
- Monaco Editor（YAML 编辑）
- React Hook Form（表单管理）

---

## 优先级排序

**P0（必须完成）**：
1. Task 1.1 - Pydantic 模型
2. Task 1.2 - Agent Factory
3. Task 1.3 - 5 种 Agent 模式
4. Task 1.5 - API 适配
5. Task 2.1 - 表单框架
6. Task 2.2 ~ 2.5 - 核心 Tab（基本信息/模型/模式/提示词）
7. Task 3.1 - 调试面板

**P1（应该完成）**：
1. Task 1.4 - 记忆管理器
2. Task 2.6 ~ 2.8 - 记忆/工具/决策 Tab
3. Task 3.2 - YAML 预览
4. Task 4.2 - 数据迁移

**P2（可以延后）**：
1. Task 2.9 - 多智能体 Tab
2. Task 3.3 - 配置验证
3. Task 4.1 - 导入导出
4. Task 4.3 - 文档更新

---

## 里程碑

```
Week 1: 后端核心
├── Task 1.1 Pydantic 模型
├── Task 1.2 Agent Factory
├── Task 1.3 5 种 Agent 模式
└── Task 1.5 API 适配

Week 2: 前端配置表单
├── Task 2.1 表单框架
├── Task 2.2 基本信息 Tab
├── Task 2.3 模型配置 Tab
├── Task 2.4 Agent 模式 Tab
└── Task 2.5 提示词 Tab

Week 3: 高级功能
├── Task 1.4 记忆管理器
├── Task 2.6 记忆 Tab
├── Task 2.7 工具 Tab
├── Task 2.8 决策 Tab
└── Task 3.1 调试面板

Week 4: 完善
├── Task 2.9 多智能体 Tab
├── Task 3.2 YAML 预览
├── Task 3.3 配置验证
├── Task 4.1 导入导出
├── Task 4.2 数据迁移
└── Task 4.3 文档更新
```

---

## 注意事项

1. **不要**删除旧的 `graph_def` 相关代码，确保向后兼容
2. **优先**使用现有的 `short_term.py`、`long_term.py`、`vector.py`，在现有基础上改造
3. **参考** `docs/AGENT_DESIGN_V2.md` 中的详细设计
4. **测试**每个 Tab 保存后能正确读取并回填
5. **沟通**遇到不确定的设计决策，先和 Andy 确认再动手

---

**联系**: 有问题直接在飞书找 Andy 确认
