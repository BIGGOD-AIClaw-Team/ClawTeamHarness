# V1.0 MVP 复盘 - V1.1 改进计划

> 主持：Andy（产品经理）  
> 日期：2026-03-29  
> 仓库：https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness

---

## 一、不足清单

### 1. 基座能力不足

| 问题 | 严重程度 | 负责人 |
|------|----------|--------|
| **LLM集成是Placeholder** - `LLMNode._call_llm()` 只有 echo 返回，没有真实调用 OpenAI/Anthropic | 🔴 P0 | 研发 |
| **Skills Loader缺失** - TASKS.md 任务2.2要求的 `SkillsLoader`（目录扫描/动态加载/热更新）未实现 | 🔴 P0 | 研发 |
| **记忆API是Mock** - `routes/memory.py` 使用内存字典，未集成真实的 `ShortTermMemory/LongTermMemory/VectorMemory` | 🔴 P0 | 研发 |
| **意图识别器未实现** - TASKS.md 任务1.5（IntentClassifier）标记P1，实际未实现 | 🟡 P1 | 研发 |
| **响应生成器未实现** - TASKS.md 任务1.6（ResponseGenerator/流式输出）标记P1，实际未实现 | 🟡 P1 | 研发 |
| **上下文管理器不完整** - `ShortTermMemory` 只有滑动窗口，缺少自动压缩/摘要逻辑（上下文超阈值时） | 🟡 P1 | 研发 |
| **节点类型单一** - 只有4种基础节点类型，缺少 Loop/SubGraph/Merge/Split 等高级节点 | 🟡 P1 | 架构师 |
| **异常处理薄弱** - node execute 只有简单 try-catch，无重试/降级/熔断机制 | 🟡 P1 | 研发 |
| **Checkpoint管理缺失** - `MemorySaver` 已集成但无 API 支持 suspend/resume/checkpoint list | 🟡 P1 | 研发 |
| **图执行不可中断** - `execute()` 是纯 async generator，无法中途取消/暂停执行 | 🟡 P1 | 研发 |
| **Condition评估能力弱** - `evaluate_condition` 仅支持简单表达式，无 LLM 辅助判断 | 🟡 P1 | 研发 |

---

### 2. 可配置项不足

| 问题 | 建议方案 | 优先级 |
|------|---------|--------|
| `ShortTermMemory.max_messages` 硬编码为100 | 暴露到 `AppConfig`，支持环境变量 `MAX_MESSAGES` | P1 |
| LLM参数不可配置（temperature、max_tokens、top_p等） | 在 `LLMNode` config 中支持完整 LLM 参数配置 | P0 |
| ChromaDB `persist_dir` 拼接逻辑分散 | 统一到 `AppConfig`，支持 `CHROMA_PERSIST_DIR` 环境变量 | P1 |
| Skill 超时时间无配置 | 在 `AppConfig` 添加 `SKILL_DEFAULT_TIMEOUT_MS`，传入 Skill 调用层 | P1 |
| `allow_origins=["*"]` CORS 全开 | 改为可配置 `CORS_ALLOWED_ORIGINS` 环境变量 | P1 |
| 数据库路径分散（`memory_long_term.db`、agent data） | 统一为 `AppConfig.data_dir` 前缀 | P2 |
| LangGraph `thread_id` 无业务语义 | 支持在 `execute()` 时传入业务级 session_id，自动映射 thread_id | P2 |
| 节点执行超时无配置 | 每个节点 config 支持 `timeout_ms`，超时触发异常处理 | P2 |

---

### 3. 接口不足

| 问题 | 建议方案 | 优先级 |
|------|---------|--------|
| **WebSocket/流式接口缺失** - TASKS.md 任务5.2要求 `WS /api/v1/sessions/:id/stream`，实际未实现 | 实现 WebSocket 流式消息，支持实时 Agent 执行输出 | P0 |
| **任务查询接口缺失** - TASKS.md 任务5.3/5.4 要求 `GET /api/v1/tasks/:task_id`，实际未实现 | 实现异步任务队列，暴露 task_id 查询和结果获取 | P0 |
| **MCP Server CRUD接口缺失** - `routes/mcp.py` 不存在，无法通过 API 管理 MCP Server | 实现 MCP Server 的增删改查 API | P0 |
| **OpenAPI 文档缺失** - TASKS.md 任务5.5 标记 P1，实际未完成 | FastAPI 自带 `/docs`，需验证各路由 Pydantic 模型完整 | P1 |
| **Skills Registry API 是 Mock** - `routes/skills.py` 使用 `_skills_registry` 硬编码字典，未调用真实 SkillRegistry | 重构为调用 `skills/__init__.py` 中已注册的真实 Skill | P0 |
| **Agent 执行触发接口缺失** - `POST /api/v1/agents/:id/execute` 未实现 | 实现 Agent 执行触发，支持同步/异步两种模式 | P0 |
| **调试面板未实现** - TASKS.md 任务6.6要求实时日志/节点状态追踪，前端无此功能 | 实现 WebSocket 调试日志流，前端调试面板页面 | P1 |
| **可视化画布功能残缺** - TASKS.md 任务6.2要求拖拽节点/连线/保存，实际 `AgentPage` 只是个列表 | React Flow 集成，可视化图编辑 | P0 |
| **无 Python SDK/SDK封装** | 提供 `harness-sdk` Python 包，封装核心调用 | P2 |

---

### 4. 测试不足

| 问题 | 严重程度 | 备注 |
|------|----------|------|
| 核心模块测试覆盖率不足70% | 🟡 P1 | engine/nodes/serializer 有单元测试，但skills/mcp覆盖不全 |
| 前端无 Vitest 测试 | 🟡 P1 | TASKS.md 8.4 要求，但未实现 |
| 集成测试只有占位 | 🟡 P1 | `test_integration.py` 内容待填充 |

---

## 二、V1.1 改进计划

### 2.1 P0 紧急（阻断发布）

| 优先级 | 任务 | 预计工时 | 负责人 | 关联不足 |
|--------|------|----------|--------|----------|
| P0 | **LLM集成落地** - 接入 OpenAI SDK，完成 `LLMNode._call_llm()` 真实调用，支持 GPT-4 / Claude | 2 days | 研发 | LLM Placeholder |
| P0 | **Skills Loader 实现** - 目录扫描 + 动态 `importlib` 加载 + 热更新钩子 | 2 days | 研发 | Skills Loader缺失 |
| P0 | **记忆API真实性** - `routes/memory.py` 集成 `ShortTermMemory/LongTermMemory/VectorMemory` | 1.5 days | 研发 | 记忆Mock |
| P0 | **WebSocket 流式接口** - 实现 `WS /api/v1/sessions/:id/stream`，支持实时流输出 | 2 days | 研发 | WebSocket缺失 |
| P0 | **任务队列系统** - 异步执行 + task_id 生成 + 结果查询 `GET /api/v1/tasks/:task_id` | 1.5 days | 研发 | 任务查询缺失 |
| P0 | **Agent 执行触发API** - `POST /api/v1/agents/:id/execute` 同步/异步两种模式 | 1 day | 研发 | 执行触发缺失 |
| P0 | **MCP Server CRUD API** - `routes/mcp.py` 实现 MCP Server 增删改查 | 1 day | 研发 | MCP管理缺失 |
| P0 | **Skills Registry API** - 重构 `routes/skills.py` 调用真实 SkillRegistry | 0.5 day | 研发 | Skills Mock |

### 2.2 P1 重要（影响体验）

| 优先级 | 任务 | 预计工时 | 负责人 | 关联不足 |
|--------|------|----------|--------|----------|
| P1 | **可视化画布完善** - React Flow 集成，支持拖拽/连线/保存/加载 | 3 days | 前端 | 画布功能残缺 |
| P1 | **LLM 参数可配置化** - temperature/max_tokens/top_p/timeout 全部可配置 | 0.5 day | 研发 | LLM参数硬编码 |
| P1 | **意图识别器** - 实现 `IntentClassifier`，基于规则 + LLM fallback，识别率 >80% | 1.5 days | 研发 | 意图识别缺失 |
| P1 | **响应生成器 + 流式** - `ResponseGenerator` 实现，流式输出标记化 | 1 day | 研发 | 响应生成缺失 |
| P1 | **上下文自动压缩** - 上下文超阈值时自动 LLM 摘要，不丢关键信息 | 1 day | 研发 | 上下文压缩缺失 |
| P1 | **调试面板** - WebSocket 实时日志流 + 节点状态追踪 + 前端调试UI | 2 days | 前端+研发 | 调试面板缺失 |
| P1 | **异常处理增强** - 节点级重试/降级策略 + 熔断器模式 | 1.5 days | 架构师 | 异常处理薄弱 |
| P1 | **OpenAPI 文档完善** - 验证 `/docs` 完整，补充错误码和示例 | 0.5 day | 研发 | 文档缺失 |
| P1 | **单元测试覆盖率提升** - 目标覆盖率达 70%，重点补齐 skills/mcp 测试 | 2 days | 研发 | 测试覆盖不足 |

### 2.3 P2 优化（锦上添花）

| 优先级 | 任务 | 预计工时 | 负责人 | 关联不足 |
|--------|------|----------|--------|----------|
| P2 | **高级节点类型** - Loop/SubGraph/Merge/Split 节点支持 | 2 days | 架构师 | 节点类型单一 |
| P2 | **Checkpoint 管理 API** - 支持 suspend/resume/checkpoint list | 1 day | 研发 | Checkpoint缺失 |
| P2 | **图执行可中断** - 实现取消令牌，支持中途停止执行 | 1 day | 研发 | 执行不可中断 |
| P2 | **Python SDK** - `harness-sdk` 包封装核心 API | 2 days | 研发 | 无SDK |
| P2 | **前端 Vitest 测试** - 关键组件渲染测试 | 0.5 day | 前端 | 前端测试缺失 |
| P2 | **环境配置统一** - 所有路径/参数归一化到 `AppConfig` | 0.5 day | 研发 | 配置分散 |

---

## 三、V1.1 具体任务拆分

### 任务 1：LLM集成落地（2 days）
- 在 `backend/src/agents/nodes.py` 新增 `OpenAILLMClient` / `AnthropicLLMClient`
- `LLMNode._call_llm()` 调用真实 SDK
- 支持 `gpt-4` / `gpt-3.5-turbo` / `claude-3` 模型
- 环境变量 `LLM_API_KEY` 注入

### 任务 2：Skills Loader 实现（2 days）
- 新建 `backend/src/skills/loader.py`
- `SkillsLoader.scan(directory)` 扫描 skills/ 目录
- `SkillsLoader.load(skill_name)` 动态 import
- `SkillsLoader.hot_reload(skill_name)` 热更新钩子
- 集成到 `skills/__init__.py` auto-load 流程

### 任务 3：记忆API真实性（1.5 days）
- 重构 `routes/memory.py`
- `ShortTermMemory` → 会话级实例
- `LongTermMemory` → 全局单例
- `VectorMemory.search()` → 暴露为 API

### 任务 4：WebSocket 流式接口（2 days）
- FastAPI WebSocket 路由 `WS /api/v1/sessions/{session_id}/stream`
- 实现 `StreamingSessionManager`
- Agent 执行结果实时推送

### 任务 5：任务队列系统（1.5 days）
- 新建 `backend/src/tasks/`
- `TaskManager.create_task()` → 生成 task_id
- `TaskManager.get_result(task_id)` → 获取结果
- 后台 `asyncio` 执行 Agent

### 任务 6：MCP Server CRUD API（1 day）
- 新建 `backend/src/api/routes/mcp.py`
- `POST/GET/DELETE /api/mcp/servers`
- 调用 `MCPClientManager` 真实连接管理

### 任务 7：可视化画布（3 days）
- 安装 React Flow
- `Canvas.tsx` 组件 - 拖拽节点、连线、位置拖动
- 与 `POST /api/agents/` 图定义同步
- 节点 palette（LLM/Tool/Condition/Start/End）

---

## 四、总结

V1.0 MVP **完成了核心架构搭建**（LangGraph引擎、基础节点、Skill协议、Memory三层架构），但**多个关键路径仍是Mock或缺失**：

- ❌ LLM集成是Placeholder（阻断核心功能）
- ❌ Skills Loader未实现（插件生态无法运转）
- ❌ 记忆API是Mock（记忆系统不可用）
- ❌ WebSocket/流式未实现（实时体验缺失）
- ❌ MCP/Skills API是Mock（集成层断裂）

**V1.1 核心目标**：让系统真正端到端跑起来——用户创建一个Agent、通过UI编排、触发执行、拿到真实结果。

> 建议 V1.1 分两批交付：**第一批（P0阻断项）** → 4天完成核心链路可运行；**第二批（P1体验项）** → 3天完善工具链。
