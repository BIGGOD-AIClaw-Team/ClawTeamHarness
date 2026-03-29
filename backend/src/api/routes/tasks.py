import uuid
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskQueue:
    """任务队列管理器"""

    def __init__(self):
        self._tasks: dict[str, dict] = {}

    def create_task(self, agent_id: str, input_data: dict) -> str:
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = {
            "task_id": task_id,
            "agent_id": agent_id,
            "status": "pending",
            "input": input_data,
            "result": None,
            "created_at": datetime.now().isoformat(),
        }
        # 异步执行
        asyncio.create_task(self._execute_task(task_id))
        return task_id

    async def _execute_task(self, task_id: str):
        self._tasks[task_id]["status"] = "running"
        # TODO: 集成 Agent 执行
        self._tasks[task_id]["status"] = "completed"

    def get_task(self, task_id: str) -> Optional[dict]:
        return self._tasks.get(task_id)

    def cancel_task(self, task_id: str) -> bool:
        if task_id in self._tasks and self._tasks[task_id]["status"] == "pending":
            self._tasks[task_id]["status"] = "cancelled"
            return True
        return False


task_queue = TaskQueue()


class TaskCreateRequest(BaseModel):
    agent_id: str
    input_data: dict = {}


@router.post("/")
async def create_task(request: TaskCreateRequest):
    """创建并执行一个新任务"""
    task_id = task_queue.create_task(request.agent_id, request.input_data)
    return {"task_id": task_id, "status": "pending"}


@router.get("/{task_id}")
async def get_task(task_id: str):
    """获取任务状态和结果"""
    task = task_queue.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """取消待执行的任务"""
    success = task_queue.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=400, detail="Task cannot be cancelled")
    return {"status": "cancelled", "task_id": task_id}
