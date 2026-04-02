# 多智能体系统评审会纪要

**评审人：** Andy（产品经理）  
**评审日期：** 2026-04-02  
**评审范围：** 前端 MultiAgentPage / 后端协同引擎 / API 路由

---

## 1. 评审议程

| # | 议题 | 时长 |
|---|------|------|
| 1 | 代码质量评估（前后端） | 15 min |
| 2 | 功能体验评估（配置项清单） | 10 min |
| 3 | 过程可见性现状 + 改进建议 | 10 min |
| 4 | 结果可见性现状 + 改进建议 | 10 min |
| 5 | 交互逻辑优化建议 | 10 min |
| 6 | Action Items 确认 | 5 min |

---

## 2. 代码质量评估

### 评分标准：1-5 分（5=优秀，1=差）

### 2.1 前端评分

| 维度 | 得分 | 说明 |
|------|------|------|
| 代码结构 | 4/5 | 组件拆分合理，hooks 分离清晰，单文件较重（MultiAgentPage.tsx ~500行） |
| 可维护性 | 3/5 | 所有回调集中在大组件，缺少模块拆分；样式内联较多 |
| 类型安全 | 3/5 | 有 types.ts 但部分用 `any`（api.ts、部分 callback） |
| 状态管理 | 3/5 | useReducer 实现状态管理，但 tasks polling 存在闭包陈旧风险 |
| 代码复用 | 4/5 | hooks 封装良好，组件复用得当 |

**问题清单：**

1. **MultiAgentPage.tsx 过于臃肿**（~500行）  
   - 大量 useCallback、useState 集中在一个文件
   - 建议：按功能拆分为子组件（MissionCreator, StepEditor, TeamCreator）

2. **useWorkflow polling 闭包问题**
   ```ts
   // 当前：runningTasks.length 作为依赖，每次长度变化才重建 interval
   useEffect(() => {
     const runningTasks = state.tasks.filter(t => t.status === 'running');
     // 闭包捕获的是老的 state.tasks
     const interval = setInterval(() => {
       runningTasks.forEach(...) // ⚠️ 始终用第一次捕获的 runningTasks
     }, 2000);
   }, [state.tasks.filter(t => t.status === 'running').length]);
   ```
   建议：polling 的 effect 依赖改为 `JSON.stringify(state.tasks.map(t => ({ id: t.task_id, status: t.status })))`

3. **api.ts 大量 `any` 类型**
   ```ts
   async createTeam(data: any) { ... }
   // 建议：使用 TaskConfig, TeamConfig 类型
   ```

4. **组件内样式分散**
   - 多个组件重复定义 `inputStyle`、`cardStyle`
   - 建议：统一抽离到 `constants.tsx` 或 ThemeProvider

5. **StepDrawer 的 JSON 编辑器缺少校验**
   ```ts
   onChange={e => {
     try { setEditingStep({ ...editingStep, config: JSON.parse(e.target.value) }); }
     catch {} // ⚠️ 空 catch，错误静默
   }}
   ```
   建议：展示解析错误提示

---

### 2.2 后端评分

| 维度 | 得分 | 说明 |
|------|------|------|
| 代码结构 | 4/5 | 模型/引擎/API 分层清晰 |
| 可维护性 | 4/5 | 模块职责明确，CollaborationEngine 和 WorkflowEngine 分离 |
| 错误处理 | 3/5 | 部分异常被吞掉（如 `collect_result` 的 `Exception`） |
| 重试机制 | 4/5 | `execute_with_retry` 指数退避实现良好 |
| 持久化 | 3/5 | callback 机制有，但 teams.py 的 `_execute_workflow_async` 直接调用 `update_task_status` 而非通过 callback |

**问题清单：**

1. **CollaborationEngine 和 WorkflowEngine 职责重叠**  
   - `collaboration.py` 有 `Workflow` / `WorkflowStep` 模型
   - `workflow_engine.py` 也有 `WorkflowStep` dataclass
   - 两套模型并存，建议统一

2. **workflow_engine.py 的 `_execute_agent_step` 签名问题**
   ```python
   async def _execute_agent_step(self, step: WorkflowStep, state: dict = None) -> dict:
       result = await self._agent_executor(agent_id, input_data)
   ```
   `self._agent_executor` 是外部注入的 callable，但类型标注缺失，传入的 `input_data` 缺少 schema 约束

3. **teams.py `execute_workflow` 异步任务没有超时保护**
   ```python
   asyncio.create_task(_execute_workflow_async(task_id, task))
   # ⚠️ fire-and-forget，若服务重启任务丢失
   ```
   建议：接入任务队列（Celery/RQ）或记录 pending 状态重启恢复

4. **teams.py `persistence_callback` 与直接调用的混合**
   - `_execute_workflow_async` 中既调用了 `workflow_engine.set_persistence_callback` 又直接调用 `task_store.update_task_status`
   - 职责不清，建议统一通过 callback 或直接调用，不混用

5. **collect_result 的错误处理太宽泛**
   ```python
   except Exception as e:
       result.error = str(e)
   ```
   建议：区分文件不存在（业务）/ 权限错误（系统）/ JSON解析错误

---

## 3. 功能体验评估

### 3.1 用户可配置参数清单

#### Agent 能力配置（Agent 能力 Tab）
| 配置项 | 类型 | 选项/范围 |
|--------|------|-----------|
| LLM Provider | Select | OpenAI / Anthropic / Google / Azure / Ollama / MiniMax |
| LLM Model | Select | 根据 Provider 动态切换 |
| Skills | MultiSelect | github, weather, web-search, web-fetch, document-parsers, apple-reminders, feishu-* 系列, ima-note, healthcheck, remotion |
| Tools | MultiSelect | read, write, edit, exec, process, web_search, web_fetch, image, message, move, delete |
| System Prompt | Input(tags) | 自定义提示词 |

#### 工作流编排配置
| 配置项 | 类型 | 选项/范围 |
|--------|------|-----------|
| 工作流类型 | Select | 顺序执行 / 并行执行 / 条件执行 |
| 步骤类型 | Select | Agent / 工具 / 条件 / 输入 / 输出 |
| Agent 指定 | Select | 启用中的 Agent 列表 |
| 工具名称 | Input | 字符串 |
| 配置参数 | JSON Editor | 任意 JSON 对象 |
| 条件规则 | Form | field + operator + value + thenAgentId + elseAgentId |

#### 团队配置
| 配置项 | 类型 |
|--------|------|
| 团队名称 | Input |
| 团队描述 | TextArea |
| 成员列表 | 动态添加（名称 / Agent ID / 启用开关） |

#### 协商协议配置
| 配置项 | 类型 |
|--------|------|
| 协议模式 | Radio: 文件协议 / WebSocket / 混合模式 |
| 文件基础目录 | Input（默认 /workspace/tasks） |
| WS 端点 | Input（默认 ws://localhost:8080/ws） |

#### 任务创建配置
| 配置项 | 类型 |
|--------|------|
| 任务目标 | TextArea |
| 优先级 | Select: 低/中/高/紧急 |
| 分配给 | MultiSelect（Agent 角色） |

---

## 4. 过程可见性

### 4.1 当前状态

| 功能 | 现状 | 评分 |
|------|------|------|
| 任务执行进度 | ✅ Progress 组件实时显示（polling 2s） | 3/5 |
| 各步骤状态 | ✅ 任务监控 Tab 显示 running 任务列表 | 3/5 |
| Agent 状态变化 | ✅ AgentCard 显示 idle/busy/offline，StatsCards 显示在线数 | 3/5 |
| 团队消息 | ✅ TeamChat 显示模拟消息（固定模板） | 2/5（模拟数据，非真实） |
| 步骤级错误反馈 | ⚠️ 任务失败后 Tooltip 显示 error，但错误详情不展开 | 2/5 |
| 实时日志流 | ❌ 无实时日志，用户看不到每个步骤在做什么 | 1/5 |
| 步骤执行时长 | ❌ 无时长统计 | 1/5 |

### 4.2 改进建议

1. **【P0】增加步骤级实时日志**  
   - 在任务监控 Tab 为每个 running 任务增加展开面板，显示步骤级日志流
   - 技术方案：后端 WebSocket 推送 / 前端 SSE 订阅

2. **【P0】Polling 稳定性优化**  
   - 修复 useWorkflow 的闭包陈旧问题（见 2.1 问题2）
   - 考虑 WebSocket 替代轮询

3. **【P1】步骤执行时长显示**  
   - `WorkflowResult.total_duration` 和 `StepResult.duration` 已存在，前端未展示

4. **【P1】Agent 状态变更事件流**  
   - TeamChat 目前是硬编码模拟消息，需接入真实 agent_status_change 事件

5. **【P2】失败时展示完整错误堆栈**  
   - 当前 Tooltip 仅显示 `error` 字符串，建议展开 JSON 结构或 Error 对象属性

---

## 5. 结果可见性

### 5.1 当前状态

| 功能 | 现状 | 评分 |
|------|------|------|
| 任务完成状态 | ✅ Tag 显示 completed/failed | 4/5 |
| 任务历史列表 | ✅ 任务监控 Tab 有历史记录 | 4/5 |
| 步骤级结果 | ⚠️ 存储在 DB `task.result` JSON 中，前端未展开展示 | 2/5 |
| Agent 完成任务数 | ✅ AgentCard 显示 missions_completed | 3/5 |
| 导出结果 | ❌ 无导出功能（无 CSV/JSON/报告） | 1/5 |
| 失败原因诊断 | ❌ 仅显示 error 字符串，无根因分析 | 1/5 |
| 结果对比 | ❌ 无历史对比能力 | 1/5 |

### 5.2 改进建议

1. **【P0】展开步骤级结果展示**  
   - 在 WorkflowTaskTable 或详情 Drawer 展开每个 step 的 output/error
   - `StepResult.output` 已包含结构化数据，前端可渲染

2. **【P1】导出功能**  
   - 支持导出任务结果为 JSON / CSV
   - 后端 API: `GET /api/teams/tasks/{task_id}/export`

3. **【P1】失败诊断面板**  
   - 当任务失败时，提供可视化错误链路（哪个 step 失败的、根因是什么）

4. **【P2】结果持久化增强**  
   - `collaboration.py` 的 `TaskResult` 有 `output: Any`，但结果落盘结构未定义 schema
   - 建议：统一 `task_result.json` 输出格式（如： `{ "success", "output", "error", "duration_ms", "steps": [...] }`）

---

## 6. 交互逻辑优化建议

### 6.1 操作流程问题

| 问题 | 严重度 | 描述 |
|------|--------|------|
| 创建工作流路径过长 | P1 | 需先切到"任务编排"tab → 点"新建工作流" → 弹窗配置 → 再点"保存工作流"，3步才能创建并执行 |
| 步骤编辑 Drawer 无法快速批量操作 | P1 | 当前只能逐个编辑，无法拖拽批量调整、无法复制步骤 |
| 条件规则编辑入口不清晰 | P2 | "条件规则"藏在"任务编排-步骤编排"tab 的条件执行子模式下，初次使用难以发现 |
| Agent 能力配置无实时预览 | P2 | 保存后用户不知道 LLM/Skills/ Tools 变更实际影响 |
| 团队列表"查看"按钮无实际功能 | P2 | List.Item actions 有"查看"按钮但无 onClick handler |
| 筛选团队下拉框无实际功能 | P2 | 工作流编排 Tab 的"筛选团队"Select 有 UI 但 onChange 为空 |

### 6.2 改进建议

1. **【P1】工作流创建流程优化**  
   - 方案A：工作流列表页直接提供"快速创建"一步创建并执行
   - 方案B：将 Modal 改为全页引导 Flow（Create → Add Steps → Configure → Execute）

2. **【P1】拖拽排序步骤**  
   - 当前只有上下箭头，引入 `@dnd-kit` 或 `react-beautiful-dnd` 实现拖拽排序
   - 标注"拖拽排序"在编排提示中

3. **【P2】条件规则入口前置**  
   - 在工作流编排主视图顶部直接显示条件模式开关和规则管理区域

4. **【P2】Agent 配置变更预览**  
   - 保存前提供"测试运行"按钮，输入简单指令验证 Agent 响应

5. **【P2】修复死链接按钮**  
   - 团队列表"查看"按钮绑定详情 Drawer
   - 团队筛选下拉框实现实际筛选逻辑

6. **【P3】键盘快捷键**  
   - `Ctrl+Enter` 发送消息、 `Ctrl+N` 新建任务

---

## 7. Action Items（TODO 清单）

### 代码质量
- [ ] **[P1] 拆分 MultiAgentPage.tsx** — 按功能拆为 MissionCreator/StepEditor/TeamCreator 子组件
- [ ] **[P1] 修复 useWorkflow polling 闭包陈旧** — 改依赖为状态快照字符串
- [ ] **[P2] 统一前后端 WorkflowStep 模型** — 消除 collaboration.py 和 workflow_engine.py 双模型问题
- [ ] **[P2] 消除 api.ts 中的 `any` 类型** — 全部替换为具体类型
- [ ] **[P2] 修复 StepDrawer JSON Editor 空 catch** — 添加解析错误提示
- [ ] **[P2] teams.py 持久化回调与直接调用统一** — 移除混用，选择单一路径
- [ ] **[P3] 样式统一抽取** — 将重复的 inputStyle/cardStyle 归入 ThemeProvider

### 功能体验
- [ ] **[P1] 步骤级实时日志面板** — 任务监控展开显示步骤执行日志
- [ ] **[P1] 展开步骤级结果展示** — 任务详情展示每个 step 的 output/error
- [ ] **[P1] 工作流创建流程优化** — 减少操作步骤，支持快速创建+执行
- [ ] **[P2] 步骤拖拽排序** — 引入 DnD 库替代上下箭头
- [ ] **[P2] 修复死链接按钮** — 团队列表查看、团队筛选下拉框
- [ ] **[P2] Agent 配置测试运行** — 保存前验证配置有效性
- [ ] **[P3] 任务结果导出** — JSON/CSV 导出 API + 按钮
- [ ] **[P3] 键盘快捷键** — Ctrl+Enter 发送、Ctrl+N 新建

### 后端基础设施
- [ ] **[P1] execute_workflow 异步任务无重启恢复** — 接入任务队列或记录 pending 状态
- [ ] **[P2] collect_result 错误分类处理** — 区分文件不存在/权限/JSON解析错误
- [ ] **[P2] 统一 task_result.json 输出格式** — 定义 schema（success, output, error, duration_ms）

---

**会议结束。Action Items 由开发团队认领，下次评审跟进完成状态。**
