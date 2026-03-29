"""Task queue API routes."""
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskQueue:
    """任务队列管理器"""

    def __init__(self):
        self._tasks: dict[str, dict] = {}
        self._agents: dict[str, dict] = {}  # 存储已加载的 Agent 图

    def register_agent(self, agent_id: str, agent_data: dict) -> None:
        """注册一个 Agent 图定义"""
        self._agents[agent_id] = agent_data
        logger.info(f"Agent registered: {agent_id}")

    def _load_agent(self, agent_id: str) -> Optional[dict]:
        """加载 Agent 图定义"""
        return self._agents.get(agent_id)

    def create_task(self, agent_id: str, input_data: dict) -> str:
        task_id = str(uuid.uuid4())
        self._tasks[task_id] = {
            "task_id": task_id,
            "agent_id": agent_id,
            "status": "pending",
            "input": input_data,
            "result": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
        }
        # 异步执行
        asyncio.create_task(self._execute_task(task_id))
        return task_id

    async def _execute_task(self, task_id: str) -> None:
        """执行任务：加载 Agent 图并通过 AgentEngine 执行"""
        task = self._tasks.get(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        task["status"] = "running"

        try:
            agent_id = task["agent_id"]
            input_data = task["input"]

            # 加载 Agent 图
            agent_data = self._load_agent(agent_id)
            if agent_data is None:
                raise ValueError(f"Agent '{agent_id}' not found in registry")

            # 反序列化并执行 Agent
            from ...agents.engine import AgentEngine
            from ...agents.serializer import GraphSerializer

            engine = GraphSerializer.deserialize(agent_data)

            # 构建初始状态
            initial_state = {
                "messages": input_data.get("messages", []),
                "context": input_data.get("context", {}),
                "current_node": "",
            }

            # 执行 Agent
            result = await engine.execute(initial_state)

            task["status"] = "completed"
            task["result"] = result

        except Exception as e:
            logger.exception(f"Task {task_id} execution failed")
            task["status"] = "failed"
            task["error"] = str(e)

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
