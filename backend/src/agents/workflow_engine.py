"""Workflow orchestration engine for multi-agent team collaboration."""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional, Callable

logger = logging.getLogger(__name__)

# ==================== Retry Utilities ====================

async def execute_with_retry(
    coro,
    max_retries: int = 3,
    base_delay: float = 1.0,
    timeout: Optional[float] = None,
):
    """
    Execute a coroutine with exponential backoff retry and optional timeout.
    
    Args:
        coro: The coroutine to execute
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (doubles each retry)
        timeout: Optional timeout in seconds
    
    Returns:
        The result of the coroutine
    
    Raises:
        The last exception if all retries fail
    """
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            if timeout:
                return await asyncio.wait_for(coro, timeout=timeout)
            return await coro
        except asyncio.TimeoutError:
            last_error = asyncio.TimeoutError(f"Step timed out after {timeout}s")
            logger.warning(f"Attempt {attempt + 1} timed out, retries left: {max_retries - attempt}")
        except Exception as e:
            last_error = e
            logger.warning(f"Attempt {attempt + 1} failed: {e}, retries left: {max_retries - attempt}")
        
        if attempt < max_retries:
            delay = base_delay * (2 ** attempt)  # Exponential backoff
            logger.info(f"Retrying in {delay}s...")
            await asyncio.sleep(delay)
    
    raise last_error


# ==================== Data Models ====================

@dataclass
class WorkflowStep:
    """A single step in a workflow."""
    id: str
    name: str
    step_type: str = "agent"  # "agent", "tool", "condition", "input", "output"
    config: dict = field(default_factory=dict)
    retry: int = 0
    timeout: Optional[float] = None


@dataclass
class Condition:
    """Condition for conditional execution."""
    expression: str
    operator: str = "eq"  # eq, ne, gt, lt, contains, exists
    value: Any = None


@dataclass
class StepResult:
    """Result of a single step execution."""
    step_id: str
    success: bool
    output: Any = None
    error: Optional[str] = None
    duration: float = 0.0


@dataclass
class WorkflowResult:
    """Result of a workflow execution."""
    status: str  # "completed", "failed", "skipped", "running"
    results: list = field(default_factory=list)
    total_duration: float = 0.0
    error: Optional[str] = None


# ==================== Condition Evaluator ====================

class ConditionEvaluator:
    """Evaluates conditions against workflow state."""

    @staticmethod
    def evaluate(condition: Condition, state: dict) -> bool:
        """Evaluate a condition against current state."""
        expr = condition.expression
        value = condition.value
        op = condition.operator

        # Get value from state using expression as key
        state_value = state.get(expr)

        try:
            if op == "eq":
                return state_value == value
            elif op == "ne":
                return state_value != value
            elif op == "gt":
                return float(state_value or 0) > float(value or 0)
            elif op == "lt":
                return float(state_value or 0) < float(value or 0)
            elif op == "contains":
                return value in (state_value or [])
            elif op == "exists":
                return state_value is not None
            elif op == "bool":
                return bool(state_value) == bool(value)
            else:
                logger.warning(f"Unknown operator: {op}")
                return False
        except Exception as e:
            logger.error(f"Condition evaluation error: {e}")
            return False


condition_evaluator = ConditionEvaluator()


# ==================== Workflow Engine ====================

class WorkflowEngine:
    """工作流编排引擎 - 支持顺序/并行/条件执行"""

    def __init__(self):
        self._step_registry: dict[str, WorkflowStep] = {}
        self._agent_executor = None  # Agent 执行器注入
        self._persistence_callback: Optional[Callable] = None  # 持久化回调

    def set_persistence_callback(self, callback: Callable) -> None:
        """设置持久化回调函数，用于保存工作流执行结果到数据库"""
        self._persistence_callback = callback

    async def _persist_result(self, workflow_def: dict, result: WorkflowResult, initial_state: dict = None) -> None:
        """保存工作流结果到持久化存储"""
        if self._persistence_callback:
            try:
                await self._persistence_callback(workflow_def, result, initial_state)
            except Exception as e:
                logger.error(f"Failed to persist workflow result: {e}")

    def register_step(self, step: WorkflowStep) -> None:
        """注册一个工作流步骤"""
        self._step_registry[step.id] = step
        logger.info(f"Step registered: {step.id} ({step.step_type})")

    def register_agent_executor(self, executor) -> None:
        """注册 Agent 执行器"""
        self._agent_executor = executor

    async def execute_step(self, step: WorkflowStep, state: dict = None) -> StepResult:
        """执行单个步骤（支持超时和重试）"""
        start = time.time()

        try:
            logger.info(f"Executing step: {step.id} ({step.step_type})")

            if step.step_type == "agent":
                # 通过 Agent Engine 执行
                coro = self._execute_agent_step(step, state)
                if step.timeout or step.retry > 0:
                    result = await execute_with_retry(
                        coro,
                        max_retries=step.retry,
                        timeout=step.timeout
                    )
                else:
                    result = await coro
            elif step.step_type == "tool":
                # 直接执行工具
                result = await self._execute_tool_step(step, state)
            elif step.step_type == "condition":
                # 条件节点返回布尔值
                result = {"status": "evaluated", "condition_result": True}
            elif step.step_type == "input":
                result = {"status": "input_received"}
            elif step.step_type == "output":
                result = {"status": "output_sent"}
            else:
                result = {"status": "unknown_step_type", "type": step.step_type}

            duration = time.time() - start
            return StepResult(
                step_id=step.id,
                success=True,
                output=result,
                duration=duration
            )

        except asyncio.TimeoutError as e:
            duration = time.time() - start
            logger.error(f"Step {step.id} timed out after {step.timeout}s")
            return StepResult(
                step_id=step.id,
                success=False,
                error=f"Timeout after {step.timeout}s: {e}",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start
            logger.exception(f"Step {step.id} failed: {e}")
            return StepResult(
                step_id=step.id,
                success=False,
                error=str(e),
                duration=duration
            )

    async def _execute_agent_step(self, step: WorkflowStep, state: dict = None) -> dict:
        """通过 Agent Engine 执行 Agent 步骤"""
        if self._agent_executor is None:
            return {"status": "no_executor", "message": "Agent executor not configured"}

        agent_id = step.config.get("agent_id")
        input_data = step.config.get("input", {})

        if state:
            input_data.setdefault("context", {}).update(state.get("context", {}))

        try:
            result = await self._agent_executor(agent_id, input_data)
            return {"status": "executed", "agent_id": agent_id, "result": result}
        except Exception as e:
            return {"status": "agent_error", "agent_id": agent_id, "error": str(e)}

    async def _execute_tool_step(self, step: WorkflowStep, state: dict = None) -> dict:
        """执行工具步骤"""
        tool_name = step.config.get("tool_name", "unknown")
        tool_params = step.config.get("params", {})

        logger.info(f"Executing tool: {tool_name} with params: {tool_params}")
        return {"status": "tool_executed", "tool": tool_name, "params": tool_params}

    async def execute_sequential(self, steps: list[WorkflowStep], state: dict = None) -> WorkflowResult:
        """顺序执行"""
        results = []
        total_start = time.time()

        for step in steps:
            result = await self.execute_step(step, state)
            results.append(result)
            if not result.success:
                return WorkflowResult(
                    status="failed",
                    results=results,
                    total_duration=time.time() - total_start,
                    error=f"Step {step.id} failed: {result.error}"
                )

        return WorkflowResult(
            status="completed",
            results=results,
            total_duration=time.time() - total_start
        )

    async def execute_parallel(self, steps: list[WorkflowStep], state: dict = None) -> WorkflowResult:
        """并行执行"""
        total_start = time.time()
        tasks = [self.execute_step(s, state) for s in steps]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to StepResult
        processed_results = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                processed_results.append(StepResult(
                    step_id=steps[i].id,
                    success=False,
                    error=str(r)
                ))
            else:
                processed_results.append(r)

        return WorkflowResult(
            status="completed",
            results=processed_results,
            total_duration=time.time() - total_start
        )

    async def execute_conditional(
        self,
        step: WorkflowStep,
        condition: Condition,
        state: dict = None
    ) -> WorkflowResult:
        """条件执行"""
        total_start = time.time()

        if condition_evaluator.evaluate(condition, state or {}):
            result = await self.execute_step(step, state)
            return WorkflowResult(
                status="completed",
                results=[result],
                total_duration=time.time() - total_start
            )
        else:
            return WorkflowResult(
                status="skipped",
                results=[],
                total_duration=time.time() - total_start
            )

    async def execute_workflow(
        self,
        workflow_def: dict,
        initial_state: dict = None
    ) -> WorkflowResult:
        """
        执行完整工作流定义

        workflow_def格式:
        {
            "type": "sequential" | "parallel" | "conditional",
            "steps": [...],
            "condition": {...},  # 仅conditional类型
        }
        """
        wf_type = workflow_def.get("type", "sequential")
        steps_def = workflow_def.get("steps", [])

        # Convert step dicts to WorkflowStep objects
        steps = []
        for s in steps_def:
            step = WorkflowStep(
                id=s["id"],
                name=s.get("name", s["id"]),
                step_type=s.get("type", "agent"),
                config=s.get("config", {}),
                retry=s.get("retry", 0),
                timeout=s.get("timeout")
            )
            steps.append(step)
            self.register_step(step)

        state = initial_state or {}

        if wf_type == "parallel":
            result = await self.execute_parallel(steps, state)
        elif wf_type == "conditional":
            condition = Condition(**workflow_def.get("condition", {}))
            if steps:
                result = await self.execute_conditional(steps[0], condition, state)
            else:
                result = WorkflowResult(status="skipped", results=[])
        else:
            result = await self.execute_sequential(steps, state)

        # 持久化结果
        await self._persist_result(workflow_def, result, initial_state)

        return result


# Global workflow engine instance
workflow_engine = WorkflowEngine()
