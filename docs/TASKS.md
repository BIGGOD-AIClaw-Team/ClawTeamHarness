# AI Agent Harness V1.0 MVP 任务列表

> 版本: v1.0  
> 创建人: Andy（产品经理）  
> 创建时间: 2026-03-29  
> 预计周期: 4-6 周  
> 仓库: https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness

---

## 一、模块概览

| 模块 | 任务数 | 预计工时 | 优先级 |
|------|--------|----------|--------|
| 1. 核心 Agent 编排 | 6 | 5 days | P0 |
| 2. Skills 系统 | 5 | 3 days | P0 |
| 3. MCP 集成 | 4 | 3 days | P0 |
| 4. 基础 Memory | 4 | 2 days | P0 |
| 5. 基础 API | 5 | 3 days | P0 |
| 6. 基础 Web UI | 6 | 5 days | P0 |
| 7. 基础设施 | 3 | 2 days | P1 |
| 8. 测试 | 4 | 3 days | P0 |
| **合计** | **37** | **~26 days** | |

---

## 二、详细任务列表

### 模块 1：核心 Agent 编排

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 1.1 | LangGraph 集成 | 将 LangGraph 集成到 backend/src/agents/，实现基于状态机的 Agent 编排核心 | Agent Engine 能加载图定义、执行节点序列、支持 checkpoint/replay | P0 | 1.5 days |
| 1.2 | 节点类型定义 | 定义 Agent 节点类型体系：LLM Node、Tool Node、Condition Node、Start/End Node | 至少支持 4 种节点类型，每种有明确的输入输出 Schema | P0 | 1 day |
| 1.3 | 图序列化/反序列化 | Agent 图结构（nodes + edges）到 JSON 的序列化，支持从 JSON 恢复 | 能从数据库加载已保存的 Agent 图并执行 | P0 | 0.5 day |
| 1.4 | 上下文管理器 | 实现对话上下文维护，支持滑动窗口截断长对话 | 上下文超过阈值自动压缩，不丢关键信息 | P0 | 1 day |
| 1.5 | 意图识别器 | 基于规则/LLM 的用户意图识别，分发到对应节点 | 意图识别准确率 >80%（测试集） | P1 | 1 day |
| 1.6 | 响应生成器 | 将 Agent 执行结果封装为自然语言响应 | 支持流式输出（streaming）和普通响应两种模式 | P1 | 0.5 day |

---

### 模块 2：Skills 系统

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 2.1 | Skill 定义规范 | 制定 Skill 接口标准（PluginProtocol），包含 name/version/dependencies/register/unregister | 规范文档在 `docs/skills_spec.md`，被所有 Skill 实现遵循 | P0 | 0.5 day |
| 2.2 | Skills Loader | 实现 `SkillsLoader` 类，支持目录扫描、动态加载、懒加载、热更新 | `skills/` 目录下新增 Skill 后无需重启即可加载 | P0 | 1 day |
| 2.3 | Skills Registry | 实现全局 Skills 注册表，支持按名称查找、依赖解析 | 多个 Skill 依赖链能正确解析加载顺序 | P0 | 0.5 day |
| 2.4 | 内置 Skills 实现 | 实现 3-5 个内置 Skill：Search、WebRequest、Calculator、CodeRunner | 每个 Skill 可独立调用并返回正确结果 | P0 | 1.5 days |
| 2.5 | Skill 调用接口 | Skill 被 Agent 调用的标准接口，含超时控制、错误处理、结果返回 | 调用超时可在配置中设定，超时返回明确错误 | P0 | 0.5 day |

---

### 模块 3：MCP 集成

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 3.1 | MCP Client SDK 集成 | 将 `@modelcontextprotocol/sdk` 集成到 backend，支持 MCP Server 连接管理 | 能连接到标准 MCP Server 并列出可用工具 | P0 | 1 day |
| 3.2 | MCP Server 配置管理 | 实现 MCP Server 的增删改查配置（endpoint、auth），支持多个并发 Server | Web UI 上能添加/编辑/删除 MCP Server 连接 | P0 | 0.5 day |
| 3.3 | MCP 工具调用 | 将 MCP Tools 映射为 Agent 可调用的工具节点 | Agent 执行时能成功调用 MCP 工具并获取结果 | P0 | 1 day |
| 3.4 | 内置 MCP Servers | 提供 1-2 个内置 MCP Server 示例（Filesystem、HTTP Request） | Docker 启动后内置 Server 可直接使用，无需额外配置 | P1 | 0.5 day |

---

### 模块 4：基础 Memory

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 4.1 | 短期记忆 | 基于滑动窗口的对话上下文记忆，在 `memory/short_term.py` 实现 | 对话超过 N 条自动遗忘最早的，不丢最近 N 条 | P0 | 0.5 day |
| 4.2 | 长期记忆 | SQLite 持久化记忆存储，支持重要信息长期保留 | 重要信息标记后重启服务仍可查询 | P0 | 0.5 day |
| 4.3 | 向量记忆（ChromaDB） | ChromaDB 集成，实现语义搜索能力 | 能存储向量并通过自然语言查询召回相关内容 | P0 | 1 day |
| 4.4 | 记忆 API 暴露 | 将记忆读写能力通过 API 暴露，支持 Web UI 查看 | Web UI 上能看到 Agent "记住"了什么 | P1 | 0.5 day |

---

### 模块 5：基础 API

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 5.1 | Agent CRUD | 实现 Bot/Agent 的创建、读取、更新、删除接口 | RESTful API，覆盖所有实体操作，状态码正确 | P0 | 1 day |
| 5.2 | 会话管理 | 实现会话创建、消息发送、消息列表接口 | WebSocket 支持实时消息推送 | P0 | 1 day |
| 5.3 | 触发执行 | Agent 执行触发接口，支持同步和异步两种模式 | 异步模式下返回 task_id，通过 task_id 查询结果 | P0 | 0.5 day |
| 5.4 | 结果获取 | 通过 task_id 获取 Agent 执行结果 | 支持流式和非流式两种结果格式 | P0 | 0.5 day |
| 5.5 | API 文档 | 使用 OpenAPI/Swagger 文档化所有 API | 启动服务后可访问 `/docs` 查看交互式 API 文档 | P1 | 0.5 day |

---

### 模块 6：基础 Web UI

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 6.1 | 项目脚手架 | 基于 React + TypeScript + Ant Design Pro 初始化前端项目 | 项目能启动，有基础页面结构 | P0 | 0.5 day |
| 6.2 | 可视化画布 | 基于 React Flow 实现拖拽式节点编排画布 | 能拖拽节点、连线、拖动位置、保存图结构 | P0 | 2 days |
| 6.3 | Agent 创建页面 | Agent 基础信息配置页面（名称、描述、Prompt、模型选择） | 能创建 Agent 并保存基本信息 | P0 | 0.5 day |
| 6.4 | Agent 编辑页面 | Agent 图结构编辑，整合可视化画布 | 能加载已保存的图并在画布上编辑 | P0 | 1 day |
| 6.5 | Agent 运行页面 | Agent 对话执行页面，支持消息输入、响应展示 | 能触发 Agent 执行并展示实时响应 | P0 | 1 day |
| 6.6 | 调试面板 | 实时展示执行日志、节点状态、变量追踪 | 调试运行时能看到每个节点的输入输出 | P1 | 0.5 day |

---

### 模块 7：基础设施

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 7.1 | 项目脚手架 | 配置 pyproject.toml、poetry/uv 环境、代码格式化（ruff/black） | `poetry install` 能成功安装所有依赖 | P1 | 0.5 day |
| 7.2 | Docker 一键部署 | 提供 All-in-One Dockerfile，包含所有组件 | `docker build` 成功，`docker run` 后服务可用 | P1 | 1 day |
| 7.3 | 配置管理 | 环境变量配置加载，支持 .env 文件和命令行参数 | 敏感配置（API Keys）不硬编码，通过环境变量注入 | P1 | 0.5 day |

---

### 模块 8：测试

| # | 任务 | 描述 | 验收标准 | 优先级 | 工时 |
|---|------|------|----------|--------|------|
| 8.1 | 单元测试框架 | 搭建 pytest + pytest-asyncio 测试环境，配置 CI | 所有模块有对应的 `test_*.py`，能 `pytest` 正常运行 | P0 | 0.5 day |
| 8.2 | 核心模块测试 | 为 Agent Engine、Skills Loader、MCP Client、Memory Manager 编写单元测试 | 核心模块测试覆盖率 >70% | P0 | 1.5 days |
| 8.3 | API 测试 | 用 pytest 或 httptest 实现 API 层功能测试 | CRUD + 执行接口有自动化测试 | P0 | 0.5 day |
| 8.4 | 前端测试 | 前端组件测试（Vitest + React Testing Library） | 关键组件（Canvas、Node组件）有基本渲染测试 | P1 | 0.5 day |

---

## 三、里程碑规划

```
Week 1-2: 基础设施 + 核心引擎
├── 环境搭建 (7.1)
├── Docker 部署 (7.2)
├── LangGraph 集成 (1.1)
├── 节点类型定义 (1.2)
├── 图序列化 (1.3)
└── Skills 规范 (2.1)

Week 3: Skills + MCP + Memory
├── Skills Loader (2.2)
├── Skills Registry (2.3)
├── 内置 Skills (2.4)
├── Skill 调用接口 (2.5)
├── MCP Client SDK (3.1)
├── MCP Server 管理 (3.2)
├── MCP 工具调用 (3.3)
├── 短期记忆 (4.1)
└── 长期记忆 (4.2)

Week 4: API + 向量记忆
├── Agent CRUD (5.1)
├── 会话管理 (5.2)
├── 触发执行 (5.3)
├── 结果获取 (5.4)
└── 向量记忆 (4.3)

Week 5: Web UI
├── 前端脚手架 (6.1)
├── 可视化画布 (6.2)
├── Agent 创建页面 (6.3)
├── Agent 编辑页面 (6.4)
└── Agent 运行页面 (6.5)

Week 6: 测试 + 集成
├── 单元测试框架 (8.1)
├── 核心模块测试 (8.2)
├── API 测试 (8.3)
├── 调试面板 (6.6)
└── 集成联调
```

---

## 四、技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | React + TypeScript + Ant Design Pro + React Flow |
| 后端 | Node.js + Fastify + TypeScript |
| Agent 编排 | LangGraph |
| 主数据库 | SQLite（默认）/ PostgreSQL（可选） |
| 向量数据库 | ChromaDB（嵌入式） |
| MCP | @modelcontextprotocol/sdk |
| 沙盒 | Docker |
| 测试 | pytest + pytest-asyncio + Vitest |

---

## 五、关键接口定义

### Agent CRUD

```
POST   /api/v1/agents          - 创建 Agent
GET    /api/v1/agents          - 列表 Agent
GET    /api/v1/agents/:id      - 获取 Agent 详情
PUT    /api/v1/agents/:id      - 更新 Agent
DELETE /api/v1/agents/:id      - 删除 Agent
```

### 会话与执行

```
POST   /api/v1/sessions                    - 创建会话
GET    /api/v1/sessions/:id/messages       - 获取消息历史
POST   /api/v1/agents/:id/execute          - 触发 Agent 执行（异步）
GET    /api/v1/tasks/:task_id              - 查询执行结果
WS     /api/v1/sessions/:id/stream         - WebSocket 流式消息
```

### Skills & MCP

```
GET    /api/v1/skills              - 列出所有已注册 Skills
POST   /api/v1/skills/:name/call   - 调用指定 Skill
GET    /api/v1/mcp/servers         - 列出已配置 MCP Servers
POST   /api/v1/mcp/servers         - 添加 MCP Server
DELETE /api/v1/mcp/servers/:id     - 删除 MCP Server
GET    /api/v1/mcp/servers/:id/tools - 列出 Server 可用工具
```

---

## 六、验收检查清单

- [ ] `docker run` 后 5 分钟内所有服务就绪
- [ ] 前端画布支持拖拽节点、连线、保存
- [ ] 能通过 Web UI 创建并运行一个简单 Agent
- [ ] MCP Server 能成功连接并调用工具
- [ ] 记忆系统能正确存取（短/长期）
- [ ] 所有 API 接口有自动化测试
- [ ] 核心模块单元测试覆盖率 >70%
- [ ] 无 API Keys 硬编码（通过环境变量注入）
