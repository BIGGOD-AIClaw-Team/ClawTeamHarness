# ClawTeamHarness V2 开发计划

> 版本: V2.0  
> 开始日期: 2026-04-01  
> 目标: 完成配置式Agent编辑系统

---

## 一、当前状态

### 已完成 ✅
| 模块 | 文件 | 状态 |
|------|------|------|
| Pydantic模型 | `backend/src/agents/config_models.py` | ✅ 完成 |
| Agent Factory | `backend/src/agents/agent_factory.py` | ✅ 完成 |
| 表单框架 | `frontend/src/pages/AgentConfigPageV3.tsx` | ✅ 完成 |

### 进行中 🔄
| 模块 | 文件 | 状态 |
|------|------|------|
| AgentEngine | `backend/src/agents/engine.py` | 🔄 基础可用 |

---

## 二、V2 开发任务（按优先级）

### Phase 1: 后端核心（P0）

#### Task 1.3: 5种Agent模式实现 🔴 P0
**负责人**: Bob  
**文件**:
- `backend/src/agents/modes/react.py`
- `backend/src/agents/modes/plan_execute.py`
- `backend/src/agents/modes/chat.py`
- `backend/src/agents/modes/baby_agi.py`
- `backend/src/agents/modes/auto_gpt.py`

**要求**:
- ReAct: 思考→行动→观察循环
- Plan-Execute: 先计划后执行
- Chat: 纯对话模式
- BabyAGI: 自主任务分解
- AutoGPT: 自主决策循环

**验收标准**:
- [ ] 5种模式都能创建实例
- [ ] ReAct模式能正确执行工具调用
- [ ] 支持流式输出

---

#### Task 1.4: 记忆管理器 🔴 P0
**负责人**: Bob  
**文件**: `backend/src/agents/memory/manager.py`

**要求**:
- 短期记忆（滑动窗口）
- 长期记忆（ChromaDB）
- 混合模式合并

**验收标准**:
- [ ] 短期记忆滑动窗口正常
- [ ] 长期记忆向量召回正常
- [ ] 混合模式正确合并

---

#### Task 1.5: API适配 🔴 P0
**负责人**: Bob  
**文件**: `backend/src/api/routes/agents.py`

**要求**:
- 使用新AgentConfig Pydantic模型
- 新增 `/validate` 验证接口
- 新增 `/test` 测试执行接口
- 支持YAML导出/导入

**验收标准**:
- [ ] 创建/更新Agent使用新配置结构
- [ ] 能导出/导入YAML格式
- [ ] API错误信息清晰

---

### Phase 2: 前端配置Tab（P0）

#### Task 2.2: 基本信息Tab
**负责人**: Bob  
**组件**: `BasicInfoTab.tsx`

**字段**:
- name（必填）
- agent_id（自动生成）
- description
- icon（预设选择）
- tags
- category

---

#### Task 2.3: 模型配置Tab
**负责人**: Bob  
**组件**: `LLMConfigTab.tsx`

**字段**:
- provider（10种选项）
- model（动态加载）
- temperature/max_tokens/top_p
- api_base（自定义时显示）
- 测试连接按钮

---

#### Task 2.4: Agent模式Tab
**负责人**: Bob  
**组件**: `ModeConfigTab.tsx`

**字段**:
- type（5种模式Radio）
- max_iterations
- early_stopping
- stop_when条件

---

#### Task 2.5: 提示词Tab
**负责人**: Bob  
**组件**: `PromptTab.tsx`

**字段**:
- system（TextArea）
- user_template
- few_shot_examples（动态增删）

---

### Phase 3: 高级Tab + 调试（P1）

#### Task 2.6: 记忆配置Tab
**负责人**: Bob  
**组件**: `MemoryTab.tsx`

---

#### Task 2.7: 工具配置Tab
**负责人**: Bob  
**组件**: `ToolsTab.tsx`

---

#### Task 2.8: 决策控制Tab
**负责人**: Bob  
**组件**: `DecisionTab.tsx`

---

#### Task 3.1: 调试面板
**负责人**: Bob  
**组件**: `DebugPanel.tsx`

---

## 三、里程碑

```
Week 1 (04/01-04/07): 后端核心
├── Task 1.3: 5种Agent模式
├── Task 1.4: 记忆管理器
└── Task 1.5: API适配

Week 2 (04/08-04/14): 前端核心Tab
├── Task 2.2: 基本信息Tab
├── Task 2.3: 模型配置Tab
├── Task 2.4: Agent模式Tab
└── Task 2.5: 提示词Tab

Week 3 (04/15-04/21): 高级功能
├── Task 2.6: 记忆Tab
├── Task 2.7: 工具Tab
├── Task 2.8: 决策Tab
└── Task 3.1: 调试面板
```

---

## 四、技术要求

### 后端
- Python 3.11+
- FastAPI + Pydantic v2
- LangChain / LangGraph
- ChromaDB

### 前端
- React 18 + TypeScript
- Ant Design 5
- Monaco Editor（YAML）
- React Hook Form

---

## 五、任务分配

| 角色 | 负责人 | 任务 |
|------|--------|------|
| 🐺 Manager | 小🦊 | 进度把控、任务分配 |
| 📋 产品经理 | Andy | 需求确认、设计评审 |
| 🔍 代码审查 | Cathy | 技术可行性评审 |
| 💻 开发 | Bob | 后端+前端实现 |

---

_最后更新: 2026-04-01_
