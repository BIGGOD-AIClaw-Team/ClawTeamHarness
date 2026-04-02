"""
多Agent协同引擎
支持文件协商的协同引擎，负责任务分配、结果收集和工作流编排
"""
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field


class Task(BaseModel):
    """任务模型"""
    id: str
    name: str
    description: str
    params: dict[str, Any] = Field(default_factory=dict)
    deadline: Optional[datetime] = None


class TaskResult(BaseModel):
    """任务执行结果"""
    task_id: str
    agent_id: str
    success: bool
    output: Any = None
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class Agent(BaseModel):
    """Agent模型"""
    id: str
    name: str
    role: str
    workspace: str
    capabilities: list[str] = Field(default_factory=list)


class WorkflowStep(BaseModel):
    """工作流步骤"""
    id: str
    agent_id: str
    task: Task
    depends_on: list[str] = Field(default_factory=list)


class Workflow(BaseModel):
    """工作流模型"""
    id: str
    name: str
    description: str
    steps: list[WorkflowStep]


class WorkflowResult(BaseModel):
    """工作流执行结果"""
    workflow_id: str
    success: bool
    step_results: dict[str, TaskResult] = Field(default_factory=dict)
    started_at: datetime
    completed_at: Optional[datetime] = None


class CollaborationEngine:
    """多Agent协同引擎"""

    def __init__(self, base_workspace: str = "/tmp/agent_workspace"):
        self.base_workspace = Path(base_workspace)
        self._ensure_workspace()

    def _ensure_workspace(self) -> None:
        """确保工作空间目录存在"""
        self.base_workspace.mkdir(parents=True, exist_ok=True)

    def _get_task_dir(self, task: Task, agent: Agent) -> Path:
        """获取任务目录路径"""
        task_dir = self.base_workspace / agent.workspace / task.id
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir

    async def assign_task(self, task: Task, assignee: Agent) -> TaskResult:
        """
        分配任务给Agent
        
        Args:
            task: 任务对象
            assignee: 接收任务的Agent
            
        Returns:
            TaskResult: 任务分配结果
        """
        result = TaskResult(
            task_id=task.id,
            agent_id=assignee.id,
            success=True,
            started_at=datetime.now()
        )
        
        try:
            # 1. 创建任务目录
            task_dir = self._get_task_dir(task, assignee)
            
            # 2. 写入任务简报
            briefing = {
                "task_id": task.id,
                "task_name": task.name,
                "task_description": task.description,
                "params": task.params,
                "assignee": {
                    "id": assignee.id,
                    "name": assignee.name,
                    "role": assignee.role,
                },
                "created_at": datetime.now().isoformat(),
                "deadline": task.deadline.isoformat() if task.deadline else None,
            }
            
            briefing_path = task_dir / "task_briefing.json"
            with open(briefing_path, "w", encoding="utf-8") as f:
                json.dump(briefing, f, ensure_ascii=False, indent=2)
            
            # 3. 创建结果文件占位
            result_path = task_dir / "task_result.json"
            with open(result_path, "w", encoding="utf-8") as f:
                json.dump({"status": "pending"}, f)
            
            result.output = {
                "task_dir": str(task_dir),
                "briefing_path": str(briefing_path),
                "result_path": str(result_path),
            }
            
        except Exception as e:
            result.success = False
            result.error = str(e)
        
        return result

    async def collect_result(self, agent: Agent, task: Task) -> TaskResult:
        """
        从Agent收集任务结果
        
        Args:
            agent: 执行任务的Agent
            task: 任务对象
            
        Returns:
            TaskResult: 收集到的结果
        """
        result = TaskResult(
            task_id=task.id,
            agent_id=agent.id,
            success=False,
            started_at=datetime.now()
        )
        
        try:
            # 读取结果文件
            result_path = self.base_workspace / agent.workspace / task.id / "task_result.json"
            
            if not result_path.exists():
                result.error = f"结果文件不存在: {result_path}"
                return result
            
            with open(result_path, "r", encoding="utf-8") as f:
                result_data = json.load(f)
            
            if result_data.get("status") == "completed":
                result.success = True
                result.output = result_data.get("output")
                if result_data.get("completed_at"):
                    result.completed_at = datetime.fromisoformat(result_data["completed_at"])
            else:
                result.error = f"任务未完成，状态: {result_data.get('status', 'unknown')}"
                
        except Exception as e:
            result.error = str(e)
        
        result.completed_at = datetime.now()
        return result

    async def orchestrate_workflow(self, workflow: Workflow) -> WorkflowResult:
        """
        编排和执行工作流
        
        Args:
            workflow: 工作流对象
            
        Returns:
            WorkflowResult: 工作流执行结果
        """
        result = WorkflowResult(
            workflow_id=workflow.id,
            success=True,
            started_at=datetime.now()
        )
        
        # 按依赖顺序执行步骤
        completed_steps: set[str] = set()
        pending_steps = {step.id: step for step in workflow.steps}
        
        while pending_steps:
            # 找出所有依赖已完成的步骤
            ready_steps = [
                step for step_id, step in pending_steps.items()
                if all(dep_id in completed_steps for dep_id in step.depends_on)
            ]
            
            if not ready_steps:
                result.success = False
                result.step_results["_error"] = TaskResult(
                    task_id="_workflow_error",
                    agent_id="",
                    success=False,
                    error="循环依赖或无法满足的依赖关系",
                    started_at=datetime.now(),
                    completed_at=datetime.now()
                )
                break
            
            # 并行执行所有就绪的步骤
            tasks = []
            for step in ready_steps:
                del pending_steps[step.id]
                tasks.append(self._execute_step(step, result))
            
            step_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for step_id, step_result in zip([s.id for s in ready_steps], step_results):
                if isinstance(step_result, Exception):
                    result.step_results[step_id] = TaskResult(
                        task_id=step_id,
                        agent_id="",
                        success=False,
                        error=str(step_result),
                        started_at=datetime.now(),
                        completed_at=datetime.now()
                    )
                    result.success = False
                else:
                    result.step_results[step_id] = step_result
                    if step_result.success:
                        completed_steps.add(step_id)
                    else:
                        result.success = False
        
        result.completed_at = datetime.now()
        return result

    async def _execute_step(self, step: WorkflowStep, workflow_result: WorkflowResult) -> TaskResult:
        """执行单个工作流步骤"""
        # 找到对应的Agent（这里需要Agent注册表，实际实现中会更复杂）
        agent = Agent(
            id=step.agent_id,
            name=f"Agent-{step.agent_id}",
            role="worker",
            workspace=f"agent-{step.agent_id}"
        )
        
        # 分配并等待结果
        assign_result = await self.assign_task(step.task, agent)
        
        if not assign_result.success:
            return assign_result
        
        # 在实际实现中，这里会触发Agent执行
        # 目前只是返回分配成功的结果
        return TaskResult(
            task_id=step.task.id,
            agent_id=agent.id,
            success=True,
            output={"status": "assigned", "message": "任务已分配，等待执行"},
            started_at=assign_result.started_at,
            completed_at=datetime.now()
        )
