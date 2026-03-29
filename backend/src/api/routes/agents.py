from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
from pathlib import Path

router = APIRouter(prefix="/api/agents", tags=["agents"])

AGENTS_DIR = Path("./data/agents")
AGENTS_DIR.mkdir(parents=True, exist_ok=True)

class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    graph_def: dict = {}

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_def: Optional[dict] = None

@router.get("/")
async def list_agents():
    """列出所有 Agent"""
    agents = []
    for f in AGENTS_DIR.glob("*.json"):
        with open(f) as fp:
            agents.append(json.load(fp))
    return {"agents": agents}

@router.post("/")
async def create_agent(request: AgentCreateRequest):
    """创建 Agent"""
    agent_id = request.name.lower().replace(" ", "_")
    path = AGENTS_DIR / f"{agent_id}.json"
    if path.exists():
        raise HTTPException(status_code=400, detail="Agent already exists")
    
    agent_data = {
        "agent_id": agent_id,
        "name": request.name,
        "description": request.description,
        "graph_def": request.graph_def,
    }
    
    with open(path, "w") as f:
        json.dump(agent_data, f, indent=2)
    
    return {"agent_id": agent_id, "status": "created"}

@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """获取 Agent"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    with open(path) as f:
        return json.load(f)

@router.put("/{agent_id}")
async def update_agent(agent_id: str, request: AgentUpdateRequest):
    """更新 Agent"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    with open(path) as f:
        agent_data = json.load(f)
    
    if request.name is not None:
        agent_data["name"] = request.name
    if request.description is not None:
        agent_data["description"] = request.description
    if request.graph_def is not None:
        agent_data["graph_def"] = request.graph_def
    
    with open(path, "w") as f:
        json.dump(agent_data, f, indent=2)
    
    return {"agent_id": agent_id, "status": "updated"}

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """删除 Agent"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    path.unlink()
    return {"status": "deleted"}


class AgentExecuteRequest(BaseModel):
    input_data: dict = {}


@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecuteRequest):
    """触发 Agent 执行"""
    # 集成 AgentEngine
    from ...agents.engine import AgentEngine
    from ...agents.serializer import GraphSerializer

    # 加载 Agent 图
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")

    with open(path) as f:
        data = json.load(f)

    engine = GraphSerializer.deserialize(data)
    result = await engine.execute(request.input_data)

    return {"status": "completed", "result": result}
