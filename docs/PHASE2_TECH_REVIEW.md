# Phase 2 Technical Review - ClawTeamHarness

**Reviewer:** Cathy (代码审查专家)  
**Date:** 2026-04-02  
**Files Reviewed:**
- `backend/src/agents/workflow_engine.py`
- `backend/src/api/routes/teams.py`

---

## 1. 工作流引擎实现质量评估

### 评分: ⭐⭐⭐ (3/5)

### 优点
- ✅ 清晰的数据模型定义 (`WorkflowStep`, `Condition`, `StepResult`, `WorkflowResult`)
- ✅ 支持顺序/并行/条件三种执行模式
- ✅ 正确的 async/await 模式
- ✅ 基础的 `ConditionEvaluator` 实现

### 潜在问题

#### 🔴 严重问题

1. **`asyncio.get_event_loop().time()` 用法错误** (L96, L119, L135)
   ```python
   total_start = asyncio.get_event_loop().time()  # 错误!
   ```
   `asyncio.get_event_loop().time()` 返回的是"事件循环虚拟时间"，不是实际墙上时钟。应该用 `time.time()` 计算耗时。

2. **重试逻辑未实现**
   `WorkflowStep.retry` 字段存在但从未使用，失败后直接抛出异常。

3. **超时机制未实现**
   `timeout` 字段存在但未在 `execute_step` 中使用 `asyncio.wait_for`。

4. **`_execute_tool_step` 是空壳**
   ```python
   async def _execute_tool_step(self, step: WorkflowStep, state: dict = None) -> dict:
       # 只记录日志，没有实际执行
       return {"status": "tool_executed", "tool": tool_name, "params": tool_params}
   ```

#### 🟡 中等问题

5. **Agent Executor 接口不明确**
   `_agent_executor` 被设计为可调用对象，但缺少接口定义或类型注解。

6. **条件表达式能力有限**
   `ConditionEvaluator` 仅支持简单的字典键值比较，不支持嵌套路径（如 `context.user.name`）。

7. **无取消机制**
   缺少 `asyncio.CancelledError` 处理，长时间运行的工作流无法被取消。

8. **并发安全**
   `TeamStore` 和 `TaskStore` 使用普通 dict，在高并发下可能存在竞态条件（虽然 FastAPI 通常单线程运行，但在 ASGI 多 worker 场景下会有问题）。

---

## 2. API 设计合理性评估

### 评分: ⭐⭐⭐ (3/5)

### 优点
- ✅ RESTful 风格 URL 设计清晰
- ✅ 统一的响应格式 `{"code": 0, "data": ...}`
- ✅ Pydantic 模型用于输入验证
- ✅ 任务状态追踪 (pending → running → completed/failed)
- ✅ 异步执行避免阻塞

### 潜在问题

#### 🔴 严重问题

1. **内存存储无持久化**
   `TeamStore` 和 `TaskStore` 仅使用内存 dict，进程重启后数据丢失。

2. **`asyncio.create_task` 后不等待结果**
   ```python
   @router.post("/tasks/{task_id}/execute")
   async def execute_workflow(task_id: str):
       asyncio.create_task(_execute_workflow_async(task_id, task))
       return {"code": 0, "data": {"task_id": task_id, "status": "running"}}
   ```
   - 任务失败时无法向调用方返回错误
   - 调用方无法知道任务真正完成的时间
   - 没有 WebSocket/轮询机制通知结果

3. **Agent 引用无校验**
   创建任务时未验证 `agent_id` 是否属于指定的 `team_id`，可能导致引用空指针。

#### 🟡 中等问题

4. **无并发任务数限制**
   任何客户端都可以同时触发大量任务执行，没有 `max_concurrent_tasks` 限制。

5. **`condition` 字段无类型定义**
   ```python
   condition: Optional[dict] = None  # 应该是具体模型
   ```

6. **缺少任务取消 API**
   只有执行 API，没有取消 API。

7. **无认证授权**
   所有 API 端点公开访问，无权限控制。

---

## 3. 集成问题

1. **循环导入风险**
   `teams.py` 中 `_execute_workflow_async` 直接导入：
   ```python
   from ..workflow_engine import workflow_engine, WorkflowStep
   ```
   这在大型应用中可能导致循环导入问题。

2. **错误处理不一致**
   - workflow_engine 中捕获异常并包装为 `StepResult`
   - 但 `_execute_workflow_async` 又捕获了异常并更新 task store

---

## 4. 改进建议优先级

### P0 (必须修复)
- [ ] 修复 `asyncio.get_event_loop().time()` → `time.time()`
- [ ] 实现超时机制 (`asyncio.wait_for`)
- [ ] 添加持久化存储或明确标注"仅内存使用"
- [ ] 修复任务执行后的结果通知机制

### P1 (强烈建议)
- [ ] 实现重试逻辑
- [ ] 实现工具步骤实际执行
- [ ] 添加 agent_id 引用校验
- [ ] 支持更丰富的条件表达式

### P2 (建议)
- [ ] 添加并发任务数限制
- [ ] 补充 WebSocket 支持实现任务进度推送
- [ ] 添加任务取消机制
- [ ] 改进错误处理分层

---

## 5. 总结

Phase 2 产出了核心的多 Agent 协作框架雏形，API 设计清晰，工作流引擎结构合理。**当前实现适合原型验证，但不适合生产环境使用**。

主要风险点：
1. 内存存储导致数据丢失
2. 异步任务结果无法可靠返回
3. 超时和重试机制缺失
4. 无权限控制

建议在 Phase 3 之前优先解决 P0 问题。
