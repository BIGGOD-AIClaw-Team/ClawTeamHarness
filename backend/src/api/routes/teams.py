"""Team collaboration and workflow execution API routes."""
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/teams", tags=["teams"])


# ==================== Data Models ====================

class TeamAgent(BaseModel):
    """团队中的 Agent 配置"""
    id: str
    name: str
    role: str
    agent_id: str  # 对应的 Agent 图形定义 ID
    enabled: bool = True


class TeamConfig(BaseModel):
    """团队配置"""
    name: str
    description: Optional[str] = ""
    agents: list[TeamAgent] = []
    shared_context: dict = {}


class WorkflowStepConfig(BaseModel):
    """工作流步骤配置"""
    id: str
    name: str
    step_type: str = "agent"
    agent_id: Optional[str] = None
    config: dict = {}


class TaskConfig(BaseModel):
    """任务配置"""
    name: str
    description: Optional[str] = ""
    workflow_type: str = "sequential"  # sequential, parallel, conditional
    steps: list[WorkflowStepConfig] = []
    condition: Optional[dict] = None
    team_id: Optional[str] = None


# ==================== In-Memory Stores ====================

class TeamStore:
    """团队存储管理器"""

    def __init__(self):
        self._teams: dict[str, dict] = {}

    def create_team(self, config: TeamConfig) -> dict:
        team_id = str(uuid.uuid4())
        team = {
            "team_id": team_id,
            "name": config.name,
            "description": config.description,
            "agents": [a.model_dump() for a in config.agents],
            "shared_context": config.shared_context,
            "created_at": datetime.now().isoformat(),
        }
        self._teams[team_id] = team
        logger.info(f"Team created: {team_id} ({config.name})")
        return team

    def get_team(self, team_id: str) -> Optional[dict]:
        return self._teams.get(team_id)

    def list_teams(self) -> list[dict]:
        return list(self._teams.values())

    def update_team(self, team_id: str, config: TeamConfig) -> Optional[dict]:
        if team_id not in self._teams:
            return None
        team = self._teams[team_id]
        team.update({
            "name": config.name,
            "description": config.description,
            "agents": [a.model_dump() for a in config.agents],
            "shared_context": config.shared_context,
            "updated_at": datetime.now().isoformat(),
        })
        return team


class TaskStore:
    """任务存储管理器"""

    def __init__(self):
        self._tasks: dict[str, dict] = {}
        self._workflow_results: dict[str, dict] = {}

    def create_task(self, config: TaskConfig) -> dict:
        task_id = str(uuid.uuid4())
        task = {
            "task_id": task_id,
            "name": config.name,
            "description": config.description,
            "workflow_type": config.workflow_type,
            "steps": [s.model_dump() for s in config.steps],
            "condition": config.condition,
            "team_id": config.team_id,
            "status": "pending",
            "result": None,
            "error": None,
            "progress": 0,
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
        }
        self._tasks[task_id] = task
        logger.info(f"Task created: {task_id} ({config.name})")
        return task

    def get_task(self, task_id: str) -> Optional[dict]:
        return self._tasks.get(task_id)

    def list_tasks(self, team_id: Optional[str] = None, status: Optional[str] = None) -> list[dict]:
        tasks = list(self._tasks.values())
        if team_id:
            tasks = [t for t in tasks if t.get("team_id") == team_id]
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        return tasks

    def update_task_status(self, task_id: str, status: str, result: dict = None, error: str = None) -> None:
        if task_id in self._tasks:
            task = self._tasks[task_id]
            task["status"] = status
            if status == "running" and not task.get("started_at"):
                task["started_at"] = datetime.now().isoformat()
            if status in ("completed", "failed"):
                task["completed_at"] = datetime.now().isoformat()
            if result is not None:
                task["result"] = result
            if error:
                task["error"] = error

    def update_progress(self, task_id: str, progress: int) -> None:
        if task_id in self._tasks:
            self._tasks[task_id]["progress"] = progress


# Global stores
team_store = TeamStore()
task_store = TaskStore()


# ==================== API Routes ====================

@router.post("/teams")
async def create_team(config: TeamConfig):
    """创建团队"""
    team = team_store.create_team(config)
    return {"code": 0, "data": team}


@router.get("/teams")
async def list_teams():
    """获取团队列表"""
    teams = team_store.list_teams()
    return {"code": 0, "data": teams}


@router.get("/teams/{team_id}")
async def get_team(team_id: str):
    """获取团队详情"""
    team = team_store.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"code": 0, "data": team}


@router.put("/teams/{team_id}")
async def update_team(team_id: str, config: TeamConfig):
    """更新团队配置"""
    team = team_store.update_team(team_id, config)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"code": 0, "data": team}


@router.post("/tasks")
async def create_task(task: TaskConfig):
    """创建任务"""
    t = task_store.create_task(task)
    return {"code": 0, "data": {"task_id": t["task_id"], "status": t["status"]}}


@router.get("/tasks")
async def list_tasks(team_id: str = None, status: str = None):
    """获取任务列表"""
    tasks = task_store.list_tasks(team_id=team_id, status=status)
    return {"code": 0, "data": tasks}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """获取任务详情"""
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"code": 0, "data": task}


@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """获取任务状态"""
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "code": 0,
        "data": {
            "task_id": task_id,
            "status": task["status"],
            "progress": task["progress"],
            "error": task.get("error"),
            "started_at": task.get("started_at"),
            "completed_at": task.get("completed_at"),
        }
    }


@router.post("/tasks/{task_id}/execute")
async def execute_workflow(task_id: str):
    """执行工作流"""
    task = task_store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task["status"] in ("running", "completed"):
        raise HTTPException(status_code=400, detail=f"Task is already {task['status']}")

    # 启动异步执行
    asyncio.create_task(_execute_workflow_async(task_id, task))

    return {"code": 0, "data": {"task_id": task_id, "status": "running", "message": "Workflow execution started"}}


async def _execute_workflow_async(task_id: str, task: dict):
    """异步执行工作流"""
    from ..workflow_engine import workflow_engine, WorkflowStep

    task_store.update_task_status(task_id, "running")

    try:
        # 构建工作流定义
        steps = [
            WorkflowStep(
                id=s["id"],
                name=s["name"],
                step_type=s.get("step_type", "agent"),
                config={"agent_id": s.get("agent_id"), **s.get("config", {})}
            )
            for s in task["steps"]
        ]

        workflow_def = {
            "type": task["workflow_type"],
            "steps": [{"id": s.id, "name": s.name, "type": s.step_type, "config": s.config} for s in steps],
            "condition": task.get("condition"),
        }

        # 执行工作流
        result = await workflow_engine.execute_workflow(workflow_def)

        # 更新进度
        total_steps = len(steps)
        for i, step_result in enumerate(result.results):
            progress = int((i + 1) / total_steps * 100)
            task_store.update_progress(task_id, progress)

        # 保存结果
        task_store.update_task_status(
            task_id,
            "completed" if result.status == "completed" else "failed",
            result={"status": result.status, "results": [
                {"step_id": r.step_id, "success": r.success, "output": r.output, "error": r.error}
                for r in result.results
            ]},
            error=result.error
        )

        logger.info(f"Task {task_id} completed with status: {result.status}")

    except Exception as e:
        logger.exception(f"Task {task_id} execution failed")
        task_store.update_task_status(task_id, "failed", error=str(e))
