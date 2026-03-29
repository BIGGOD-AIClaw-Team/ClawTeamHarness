# V1.1 P0 任务分配

> 分配人：Andy（产品经理）
> 日期：2026-03-29
> 接收人：Bob (bob-v1-final)

## P0 任务清单（8项）

| # | 任务 | 具体要求 | 预计工时 |
|---|------|---------|----------|
| 1 | **LLM集成落地** | 接入 OpenAI SDK，实现 `LLMNode._call_llm()` 真实调用，支持 GPT-4/Claude | 2 days |
| 2 | **Skills Loader** | 实现目录扫描 + 动态 `importlib` 加载 + 热更新钩子 | 2 days |
| 3 | **记忆 API 集成** | `routes/memory.py` 集成 `ShortTermMemory/LongTermMemory/VectorMemory` | 1.5 days |
| 4 | **WebSocket 流式接口** | 实现 `WS /api/v1/sessions/:id/stream`，支持实时流输出 | 2 days |
| 5 | **任务队列系统** | 异步执行 + task_id 生成 + 结果查询 `GET /api/v1/tasks/:task_id` | 1.5 days |
| 6 | **Agent 执行触发 API** | `POST /api/v1/agents/:id/execute` 同步/异步两种模式 | 1 day |
| 7 | **MCP Server CRUD API** | `routes/mcp.py` 实现 MCP Server 增删改查 | 1 day |
| 8 | **Skills Registry API** | 重构 `routes/skills.py` 调用真实 SkillRegistry | 0.5 day |

## 项目信息

- **仓库**: https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness
- **本地目录**: `/Users/zhkmxx930/.openclaw/workspace/ClawTeamHarness`
- **复盘文档**: `docs/MVP_REVIEW_V1.1.md`

## 详细任务说明

### 1. LLM集成落地
- 新增 `OpenAILLMClient` / `AnthropicLLMClient`
- `LLMNode._call_llm()` 调用真实 SDK
- 环境变量 `LLM_API_KEY` 注入

### 2. Skills Loader
- 新建 `backend/src/skills/loader.py`
- `SkillsLoader.scan(directory)` 扫描 skills/ 目录
- `SkillsLoader.load(skill_name)` 动态 import
- `SkillsLoader.hot_reload(skill_name)` 热更新钩子

### 3. 记忆API集成
- 重构 `routes/memory.py`
- `ShortTermMemory` → 会话级实例
- `LongTermMemory` → 全局单例
- `VectorMemory.search()` → 暴露为 API

### 4. WebSocket流式接口
- FastAPI WebSocket 路由 `WS /api/v1/sessions/{session_id}/stream`
- 实现 `StreamingSessionManager`
- Agent 执行结果实时推送

### 5. 任务队列系统
- 新建 `backend/src/tasks/`
- `TaskManager.create_task()` → 生成 task_id
- `TaskManager.get_result(task_id)` → 获取结果
- 后台 `asyncio` 执行 Agent

### 6. Agent执行触发API
- `POST /api/v1/agents/:id/execute`
- 支持同步/异步两种模式

### 7. MCP Server CRUD API
- 新建 `backend/src/api/routes/mcp.py`
- `POST/GET/DELETE /api/mcp/servers`
- 调用 `MCPClientManager` 真实连接管理

### 8. Skills Registry API
- 重构 `routes/skills.py`
- 调用 `skills/__init__.py` 中已注册的真实 SkillRegistry

## 状态

- [ ] 待 Bob 确认接收
- [ ] Bob 实施中
- [ ] Bob 完成
