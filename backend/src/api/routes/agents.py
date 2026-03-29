from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import json
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/api/agents", tags=["agents"])

AGENTS_DIR = Path("./data/agents")
AGENTS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_AGENT_GRAPH = {
    "nodes": [
        {"id": "start-1", "position": {"x": 250, "y": 0}, "data": {"label": "开始"}, "type": "input"},
        {"id": "llm-1", "position": {"x": 250, "y": 100}, "data": {"label": "LLM 对话"}, "type": "default"},
        {"id": "end-1", "position": {"x": 250, "y": 200}, "data": {"label": "结束"}, "type": "output"},
    ],
    "edges": [
        {"id": "e1", "source": "start-1", "target": "llm-1"},
        {"id": "e2", "source": "llm-1", "target": "end-1"},
    ]
}

class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    graph_def: dict = {}

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_def: Optional[dict] = None
    status: Optional[str] = None

@router.get("/")
async def list_agents(status: str = Query(None)):
    """列出 Agent，支持按状态筛选"""
    agents = []
    for f in AGENTS_DIR.glob("*.json"):
        with open(f) as fp:
            agent = json.load(fp)
            if status is None or agent.get("status") == status:
                agents.append(agent)
    return {"agents": agents}

@router.post("/")
async def create_agent(request: AgentCreateRequest):
    """创建 Agent（初始状态为草稿）"""
    agent_id = request.name.lower().replace(" ", "_")
    path = AGENTS_DIR / f"{agent_id}.json"
    if path.exists():
        raise HTTPException(status_code=400, detail="Agent already exists")
    
    agent_data = {
        "agent_id": agent_id,
        "name": request.name,
        "description": request.description,
        "graph_def": request.graph_def if request.graph_def.get("nodes") else DEFAULT_AGENT_GRAPH,
        "status": "draft",
    }
    
    with open(path, "w") as f:
        json.dump(agent_data, f, indent=2)
    
    return {"agent_id": agent_id, "status": "created", "agent_status": "draft"}

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
    if request.status is not None:
        agent_data["status"] = request.status
    
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


@router.post("/{agent_id}/publish")
async def publish_agent(agent_id: str):
    """发布 Agent"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    with open(path) as f:
        data = json.load(f)
    
    data["status"] = "published"
    data["published_at"] = datetime.now().isoformat()
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    
    return {"status": "published", "agent_id": agent_id}


class AgentExecuteRequest(BaseModel):
    message: str = ""
    session_id: Optional[str] = None
    input_data: dict = {}


@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecuteRequest):
    """触发 Agent 执行"""
    from ...agents.engine import AgentEngine
    from ...agents.serializer import GraphSerializer

    # 加载 Agent
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")

    with open(path) as f:
        data = json.load(f)

    # 取出配置
    llm_config = data.get("llm_config", {})
    mode_config = data.get("mode_config", {})
    prompt_config = data.get("prompt_config", {})
    graph_def = data.get("graph_def", {})

    # 用配置初始化 Engine
    engine = AgentEngine(
        graph_def=graph_def,
        llm_config=llm_config,
        agent_mode_config=mode_config,
    )

    # 构造初始消息
    system_prompt = prompt_config.get("system", "你是一个智能助手。")
    user_message = request.message or request.input_data.get("message", "")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if user_message:
        messages.append({"role": "user", "content": user_message})

    # 执行
    thread_id = request.session_id or "default"
    try:
        result = await engine.execute(
            initial_state={"messages": messages, "context": {}, "result": {}},
            thread_id=thread_id,
        )
    except Exception as e:
        return {"status": "error", "error": str(e)}

    return {"status": "completed", "result": result}
