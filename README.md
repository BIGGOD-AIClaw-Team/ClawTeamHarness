# 🦊 ClawTeamHarness

> 一站式 AI Agent 开发与运行平台 | 高可扩展 | 高可用 | 开箱即用

## ✨ 核心功能

- **🤖 Agent 可视化编排** - 基于 LangGraph 的状态机编排引擎
- **🛠️ Skills 系统** - 动态加载、热更新的技能插件
- **🔌 MCP 集成** - 原生支持 Model Context Protocol
- **🧠 记忆系统** - 短期 + 长期 + 向量三重记忆
- **🌐 REST API** - 完整的 CRUD 操作接口
- **💻 Web UI** - 直观的可视化操作界面

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- Docker (可选)

### 1. 克隆项目

```bash
git clone https://github.com/BIGGOD-AIClaw-Team/ClawTeamHarness.git
cd ClawTeamHarness
```

### 2. 后端启动

```bash
cd backend
pip install -e ".[dev]"
export LLM_API_KEY="your-api-key"  # 必须设置！
export MCP_API_KEY="your-mcp-key"  # 可选
uvicorn src.api.main:app --reload --port 8000
```

### 3. 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 4. Docker 部署

```bash
docker-compose up -d
```

## 📁 项目结构

```
ClawTeamHarness/
├── backend/               # Python 后端
│   └── src/
│       ├── agents/        # Agent 编排引擎
│       ├── skills/        # Skills 系统
│       ├── memory/        # 记忆系统
│       ├── mcp/           # MCP 集成
│       └── api/           # REST API
├── frontend/              # React 前端
│   └── src/
│       ├── pages/         # 页面组件
│       └── components/    # 通用组件
├── tests/                # 测试
└── docs/                 # 文档
```

## 🔒 安全说明

- **API Keys 必须通过环境变量注入**，禁止硬编码！
- 详见 [SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)

## 📈 Roadmap

- [x] V1.0 MVP - 核心功能
- [ ] V2.0 - 插件市场、高级记忆
- [ ] V3.0 - 多租户、企业特性

## 📄 License

MIT
