# ClawTeamHarness

> AI Agent 开发平台 | 版本 V1.2

![Sci-Fi Neon Theme](https://img.shields.io/badge/Theme-SciFi%20Neon-00f0ff?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📖 项目简介

ClawTeamHarness 是一个现代化的 **AI Agent 开发平台**，旨在帮助开发者快速创建、配置、发布和管理 AI Agent。

平台支持多种主流 LLM Provider，提供可视化的 Agent 配置界面、Skills Hub、MCP Hub、Skills 编排工作流以及完整的对话系统。V1.2 版本新增了增强的 Agent 配置功能（Skills/记忆/子Agent/MCP）、Skills 编排工作流页面。

### 核心能力

- 🧩 **多 Provider 支持** — OpenAI / Anthropic / GLM / Minimax / Qwen / Doubao / Wenxin / Hunyuan / Ollama / vLLM
- ⚙️ **可视化配置** — V3 配置页面，模型自动获取 + 手动输入双模式，支持 Skills / 记忆 / 子Agent / MCP 配置
- 🛠️ **Skills Hub** — 本地 Skills 扫描，支持 55+ Skills，含安装/启用/配置管理
- 🔌 **MCP Hub** — 支持 14 个 MCP Servers，可视化安装和配置
- ⚡ **Skills 编排引擎** — 可视化工作流编排，支持多 Skills/MCP 并行协作
- 👥 **多 Agent 协作** — 团队 Agent 管理、任务分配、实时协作与事件日志
- 💬 **对话系统** — Agent 对话、收藏、筛选
- 🔒 **安全加固** — API Key 加密存储、XSS 防护、Agent ID 全局唯一
- ⚡ **Skills 编排** — 可视化工作流编排，支持多 Skills 串联执行
- 🤖 **多 Agent 框架** — 子 Agent 团队协作，角色分工
- 🧠 **记忆系统** — 短期记忆 + 长期向量记忆配置

---

## 🎨 功能特性

### 1. Agent 配置系统（增强版 V3）

- **V3 配置页面**（AgentConfigPageV3）提供直观的可视化配置体验
- 支持 **10 个 LLM Provider**，自动识别并填写默认 Base URL
- 模型选择支持：
  - 🤖 **自动获取** — 从厂商 API 实时拉取可用模型列表
  - ✏️ **手动输入** — 自定义模型名称，灵活适配私有部署
- 配置项包括：模型选择、Temperature、Max Tokens、System Prompt 等

#### 增强配置 Tab

- **📋 基础配置** — LLM、模式、提示词
- **🔧 Skills** — 分组显示（分析类/战术类/规划类），多选配置
- **🧠 记忆管理** — 短期记忆 + 长期记忆独立配置，Slider 控制参数
- **👥 子Agent** — 多角色协作团队配置（研究员/规划师/执行者/评审员/协调员）
- **🔌 MCP** — 多 MCP Tools 选择配置

```
Provider 选择面板：
┌─────────────────────────────────────────────────┐
│  🔽 请选择 LLM Provider                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ○ OpenAI       ○ Anthropic     ○ GLM           │
│  ○ Minimax      ○ Qwen          ○ Doubao        │
│  ○ Wenxin       ○ Hunyuan       ○ Ollama        │
│  ○ vLLM                                             │
└─────────────────────────────────────────────────┘
```

### 2. Skills Hub & MCP Hub

- 整合在 **Settings** 页面中，统一管理
- **Skills Hub**：
  - 自动扫描本地 Skills 目录
  - 当前支持 **55+ Skills**
  - 支持打开 Skills 目录，快速定位和编辑
- **MCP Hub**：
  - 支持 **13 个 MCP Servers** 的配置和管理
  - 可视化 Server 启停状态

```
┌──────────────────────────────────────────────────────┐
│  ⚙️ Settings                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│  📦 Skills Hub          [55+ Skills]    [打开目录]   │
│  ┌────────────────────────────────────────────────┐  │
│  │  🟢 apple-reminders    🟢 clawhub             │  │
│  │  🟢 feishu-doc         🟢 feishu-drive         │  │
│  │  🟢 github             🟢 healthcheck          │  │
│  │  ...                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  🔌 MCP Hub             [13 Servers]                │
│  ┌────────────────────────────────────────────────┐  │
│  │  🟢 Filesystem    🟢 GitHub    🟢 Database     │  │
│  │  🟢 Web Fetch     🟢 Slack     🟢 Discord      │  │
│  │  ...                                            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 3. 对话系统 (ChatPage)

- 支持与**已发布 Agent** 进行对话
- **Agent 列表**：
  - 🔍 搜索功能 — 快速定位 Agent
  - 筛选器：全部 / 我的 / 收藏
  - 收藏功能 — localStorage 持久化，随时访问常用 Agent
- **模型选择** — 下拉列表仅显示已配置的模型，避免无效调用
- **发布后自动跳转** — Agent 发布成功立即进入对话界面

```
┌──────────────────────────────────────────────────────┐
│  💬 对话                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│  [🔍 搜索 Agent...]  [全部 ▼] [+ 收藏]              │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🧠 Code Assistant    [我的]  ⭐               │  │
│  │ 🧠 Data Analyst      [全部]  ⭐               │  │
│  │ 🧠 Writer Agent      [全部]                   │  │
│  │ 🧠 Translator         [我的]                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Assistant  │  模型: GPT-4o  ▼                │  │
│  │  ──────────────────────────────────────────── │  │
│  │  Hello! How can I help you today?            │  │
│  │                          14:32               │  │
│  │  ──────────────────────────────────────────── │  │
│  │  [Type your message...              ] [Send] │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 4. Skills 编排工作流

- **可视化工作流编辑** — 模板库 + 自定义工作流
- **预设模板** — 研究助手、代码助手、分析助手等
- **节点类型** — Skill / MCP / Agent / 条件分支
- **执行引擎** — 节点串联执行，实时状态显示

```
┌──────────────────────────────────────────────────────┐
│  ⚡ Skills 编排                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│  [📋 模板库]  [📁 我的工作流]  [🎨 工作流画布]      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  🔬 研究助手                                    │  │
│  │  开始 → 网页搜索 → 数据分析 → 文档生成 → 结束  │  │
│  │  [使用模板]  [预览]                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  💻 代码助手                                    │  │
│  │  开始 → 代码助手 → 代码审查 → 结束              │  │
│  │  [使用模板]  [预览]                            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 5. 多 Agent 协作框架

- **子 Agent 团队** — Agent 可配置多个子 Agent 角色
- **角色预设** — 研究员/规划师/执行者/评审员/协调员
- **灵活编排** — 按需启用/禁用子 Agent

### 6. 记忆系统

- **短期记忆** — 对话上下文保留，Slider 控制消息数量
- **长期记忆** — 向量数据库持久化记忆
- **多种存储** — Chroma / Pinecone / Weaviate / 内存

### 7. UI/UX 特性

- **科幻霓虹风格主题** — 赛博朋克配色，视觉冲击力强
- **导航折叠** — 侧边栏支持折叠/展开，状态自动保存到 localStorage
- **深色模式** — 适配长时间开发场景
- **响应式布局** — 支持不同屏幕尺寸

```
┌──────────────────────────────────────────────────────┐
│  ☰  │  🤖 Agent Config │ 💬 Chat │ ⚙️ Settings       │
│  📁 │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🤖 │                                             │
│  💬 │   ┌────────────────────────────────────┐    │
│  ⚙️ │   │     🔮 ClawTeamHarness V1.1        │    │
│     │   │                                    │    │
│  ▼  │   │   Sci-Fi Neon Theme               │    │
│     │   │   Cyberpunk Color Scheme          │    │
│     │   └────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9
- Python ≥ 3.10（后端）

### 1. 克隆项目

```bash
git clone <repository-url>
cd ClawTeamHarness
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
# 后端运行在 http://localhost:3001
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### 4. 使用 Docker（可选）

```bash
docker-compose up -d
```

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| React Router | v6 | 路由管理 |
| Zustand | - | 状态管理 |
| DOMPurify | - | XSS 防护 |
| Axios | - | HTTP 客户端 |
| CSS | 原生 | 样式（科幻霓虹风格） |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 22 | 运行时 |
| Express | - | Web 框架 |
| SQLite | - | 数据持久化 |
| bcrypt | - | 密码加密 |
| JWT | - | 身份认证 |
| cors | - | 跨域支持 |

### LLM Provider 集成

- **OpenAI** — GPT-4o, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic** — Claude 3.5 Sonnet, Claude 3 Opus
- **GLM** — GLM-4, GLM-3
- **Minimax** — MiniMax-Text-01, MiniMax-M2
- **Qwen** — Qwen2.5, Qwen2
- **Doubao** — Doubao-pro, Doubao-lite
- **Wenxin** — ERNIE-4.0, ERNIE-3.0
- **Hunyuan** — Hunyuan-pro, Hunyuan-lite
- **Ollama** — 本地模型支持
- **vLLM** — 开源大模型部署方案

---

## 📂 项目结构

```
ClawTeamHarness/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/         # API 路由 (Python/FastAPI)
│   │   │       ├── agents.py   # Agent CRUD
│   │   │       ├── skills_hub.py # Skills Hub
│   │   │       ├── mcp_hub.py  # MCP Hub
│   │   │       └── models.py   # 模型获取
│   │   ├── db/                 # 数据库
│   │   └── index.py            # 入口文件
│   └── package.json
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AgentConfigPageV3.tsx   # Agent V3 配置页 (增强版，含 Skills/记忆/子Agent/MCP)
│   │   │   ├── ChatPage.tsx            # 对话页面
│   │   │   ├── SettingsPage.tsx        # 设置页面
│   │   │   ├── SkillsHubPage.tsx       # Skills Hub (浏览/安装/配置)
│   │   │   ├── MCPHubPage.tsx          # MCP Hub (安装/配置/获取配置)
│   │   │   ├── SkillsOrchestratorPage.tsx  # Skills 可视化编排引擎
│   │   │   ├── MultiAgentPage.tsx      # 多 Agent 协作中心
│   │   │   └── MemoryPage.tsx          # 记忆管理
│   │   ├── components/
│   │   │   ├── SciFiCard.tsx           # 科幻风格卡片
│   │   │   └── ...
│   │   ├── stores/
│   │   └── ...
│   └── package.json
│
├── data/                       # 数据目录
├── docs/                       # 文档
├── docker-compose.yml
├── README.md
└── .env.example
```

---

## 📋 开发指南

### 添加新的 LLM Provider

1. 在 `backend/src/services/llm.js` 中添加 Provider 配置：

```javascript
const providers = {
  // 现有 Provider...
  newprovider: {
    name: 'NewProvider',
    baseUrl: 'https://api.newprovider.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    defaultModel: 'new-model',
    authType: 'bearer', // or 'api-key'
  }
};
```

2. 在前端 `ProviderSelector.jsx` 中添加对应的 UI 选项

### 添加新的 Skill

1. 在 `frontend/src/skills/` 目录下创建 Skill 文件夹
2. 实现 Skill 的核心逻辑和 SKILL.md
3. Skills Hub 会自动扫描并显示

### 添加新的 MCP Server

1. 在 `backend/src/services/mcp/` 目录下添加 Server 配置
2. 在 Settings 页面的 MCP Hub 中注册

### API 接口文档

#### Agent 管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/agents` | 获取 Agent 列表 |
| POST | `/api/agents` | 创建新 Agent |
| GET | `/api/agents/:id` | 获取 Agent 详情 |
| PUT | `/api/agents/:id` | 更新 Agent |
| DELETE | `/api/agents/:id` | 删除 Agent |
| POST | `/api/agents/:id/publish` | 发布 Agent |

#### 对话

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/chat` | 发送对话消息 |
| GET | `/api/chat/history/:agentId` | 获取对话历史 |

#### 模型

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/models/:provider` | 获取 Provider 可用模型 |

---

## 🔒 安全特性

| 安全措施 | 实现方式 |
|----------|----------|
| API Key 加密 | 使用 crypto-js AES 加密存储 |
| XSS 防护 | DOMPurify 过滤所有用户输入 |
| Agent ID 全局唯一 | UUID v4 + 时间戳混合生成 |
| CORS 控制 | 后端配置白名单域名 |
| 输入校验 | Joi/Yup schema 验证 |

---

## 📄 License

MIT License © 2024 ClawTeam

---

<div align="center">

**🤖 ClawTeamHarness — 让 AI Agent 开发更简单**

Version 1.1 | Made with ⚡ by ClawTeam

</div>
