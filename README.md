# AI Agent Harness

> 一站式 AI Agent 开发与运行平台 — 高可扩展、高可用、开箱即用

**版本**: v1.0 MVP  
**仓库**: https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness  
**状态**: 🚧 开发中

---

## 📖 项目简介

AI Agent Harness 是一个开源的 AI Agent 编排与运行平台，旨在帮助开发者快速构建、调试和部署 AI Agent 应用。

相比竞品（Coze、Dify、LangFlow），我们专注于三个核心差异化价值：

| 痛点 | 我们的方案 |
|------|-----------|
| 部署复杂 | 🐳 **一键部署**，5 分钟开箱即用 |
| MCP 支持弱 | ⚡ **MCP 原生集成**，可视化编排 |
| 记忆系统割裂 | 🧠 **统一记忆层**，Memory + Knowledge 一体化 |

---

## 🎯 核心功能

### 1. 可视化 Agent 编排
- 拖拽式节点画布，基于 **React Flow**
- 支持多种节点类型：LLM Node、Tool Node、Condition Node、Start/End Node
- 边连线管理，条件分支配置
- 实时调试面板，节点输入输出追踪

### 2. Skills 系统
- 标准 Skill 接口规范（PluginProtocol）
- 动态加载、热更新，无需重启
- 内置 3-5 个常用 Skills：Search、WebRequest、Calculator、CodeRunner
- 开放插件扩展机制，支持私有 Skill 注册

### 3. MCP 原生集成
- 基于官方 `@modelcontextprotocol/sdk`
- 可视化 MCP Server 管理（添加/编辑/删除）
- MCP 工具映射为 Agent 节点，一键调用
- 内置 Filesystem、HTTP Request 等常用 MCP Servers

### 4. 统一记忆系统
- **短期记忆**：滑动窗口对话上下文
- **长期记忆**：SQLite 持久化存储
- **向量记忆**：ChromaDB 语义搜索
- Web UI 记忆查看器，Agent "记忆"一目了然

### 5. 开放 API
- RESTful API + WebSocket 实时通信
- Agent CRUD、会话管理、执行触发
- OpenAPI 文档 (`/docs`)

### 6. 安全沙盒
- Docker 容器隔离执行环境
- 资源限制（CPU/内存/网络/文件系统）
- 操作审计日志，全程可追溯

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端层 (Web UI)                       │
│  React + TypeScript + Ant Design Pro + React Flow      │
├─────────────────────────────────────────────────────────┤
│                    API 网关层                            │
│  Node.js + Fastify + TypeScript                         │
│  REST API + WebSocket                                    │
├─────────────────────────────────────────────────────────┤
│                   核心业务层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Agent Engine│  │   Memory    │  │   Sandbox   │     │
│  │ (LangGraph) │  │   Manager   │  │  Runtime    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Skills     │  │  MCP Client │  │   Skills    │     │
│  │  System     │  │  (官方SDK)   │  │  Loader     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                   数据层                                  │
│  SQLite (主数据)  +  ChromaDB (向量)  +  File Storage   │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 | React + TypeScript + Ant Design Pro + React Flow |
| 后端 | Node.js + Fastify + TypeScript |
| Agent 编排 | LangGraph |
| 主数据库 | SQLite（默认）/ PostgreSQL（可选） |
| 向量数据库 | ChromaDB（嵌入式） |
| MCP | @modelcontextprotocol/sdk |
| 沙盒 | Docker |
| 测试 | pytest + Vitest |

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- Python >= 3.10
- Docker（可选，用于沙盒执行）
- npm / yarn / pnpm

### 方式一：Docker 一键启动（推荐）

```bash
# 克隆仓库
git clone https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness.git
cd ClawTeamHarness

# 启动所有服务
docker-compose up -d

# 访问 Web UI
open http://localhost:8000
```

### 方式二：源码运行

**后端**

```bash
cd backend
pip install -e .
python -m agent_harness.app
```

**前端**

```bash
cd frontend
npm install
npm run dev
```

### 方式三：pip 安装

```bash
pip install agent-harness
agent-harness init --name my-agent
agent-harness run
```

---

## 📁 项目结构

```
ClawTeamHarness/
├── backend/                    # 后端源码
│   └── src/
│       ├── agents/             # Agent 引擎（LangGraph）
│       ├── api/                # REST API 层
│       ├── memory/             # 记忆管理系统
│       ├── mcp/                # MCP Client SDK 集成
│       ├── sandbox/            # 沙盒运行时
│       ├── skills/             # Skills 系统
│       └── config.py           # 配置管理
├── frontend/                   # 前端源码
│   ├── src/
│   │   ├── components/         # React 组件
│   │   │   ├── Canvas/         # 可视化画布（React Flow）
│   │   │   └── ...
│   │   ├── pages/              # 页面
│   │   └── services/           # API 调用
│   └── ...
├── docs/                       # 文档
│   ├── TASKS.md               # V1.0 MVP 任务列表
│   └── skills_spec.md         # Skill 规范（待编写）
├── tests/                      # 测试
│   ├── unit/                  # 单元测试
│   ├── integration/           # 集成测试
│   └── e2e/                   # 端到端测试
├── scripts/                   # 运维脚本
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🗺️ Roadmap

```
✅ V0.1  - 项目初始化，基础架构搭建

🔄 V1.0 MVP（当前，4-6周）
├── ✅ 核心 Agent 编排（可视化画布 + 节点拖拽）
├── ✅ Skills 系统（Skill 定义、加载、注册、调用）
├── ✅ MCP 集成（MCP Server 连接、工具调用）
├── ✅ 基础 Memory（短期记忆、长期记忆）
├── ✅ 基础 API（CRUD Agent、触发执行、获取结果）
├── ✅ 基础 Web UI（Agent 创建/编辑/运行页面）
└── ✅ 单元测试 + 功能测试

📋 V2.0 增强版（下一个里程碑）
├── 长期记忆 + 向量搜索（RAG）
├── 完整 MCP 支持（Server 管理）
├── 插件市场 MVP
├── 沙盒执行环境
├── 多租户支持
└── 权限管理

📋 V3.0 企业版
├── 高可用集群部署
├── 高级安全特性
├── 企业插件市场
├── 全量审计日志
├── API 网关
└── SSO/LDAP 集成
```

---

## 🔗 相关链接

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)
- [MCP 协议规范](https://modelcontextprotocol.io)
- [React Flow 文档](https://reactflow.dev/)
- [ChromaDB 文档](https://docs.trychroma.com/)

---

## 📄 License

MIT License

---

*本文档由 AI Agent Harness 产品团队维护 | 产品经理：Andy*
