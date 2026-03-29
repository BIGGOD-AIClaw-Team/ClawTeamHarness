from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

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

class LLMConfig(BaseModel):
    provider: str = "openai"
    model: str = "gpt-4"
    api_key: Optional[str] = ""
    temperature: float = 0.7
    max_tokens: int = 2048

class AgentModeConfig(BaseModel):
    type: str = "react"
    max_iterations: int = 10
    early_stopping: bool = True

class PromptConfig(BaseModel):
    system: str = ""
    user_template: str = "{input}"

class MemoryConfig(BaseModel):
    enabled: bool = True
    type: str = "hybrid"

class DecisionConfig(BaseModel):
    auto_critique: bool = True
    confidence_threshold: float = 0.8

class ToolsConfig(BaseModel):
    enabled: bool = True

class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    graph_def: dict = {}
    llm_config: Optional[dict] = {}
    mode_config: Optional[dict] = {}
    prompt_config: Optional[dict] = {}
    memory_config: Optional[dict] = {}
    decision_config: Optional[dict] = {}
    tools_config: Optional[dict] = {}
    status: str = "draft"

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_def: Optional[dict] = None
    llm_config: Optional[dict] = None
    mode_config: Optional[dict] = None
    prompt_config: Optional[dict] = None
    memory_config: Optional[dict] = None
    decision_config: Optional[dict] = None
    tools_config: Optional[dict] = None
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
    
    # Use DEFAULT_GRAPH if no nodes provided
    graph_def = request.graph_def
    if not graph_def or not graph_def.get("nodes"):
        graph_def = DEFAULT_AGENT_GRAPH
    
    # Build complete agent data
    agent_data = {
        "agent_id": agent_id,
        "name": request.name,
        "description": request.description or "",
        "graph_def": graph_def,
        "llm_config": request.llm_config or {"provider": "openai", "model": "gpt-4", "temperature": 0.7},
        "mode_config": request.mode_config or {"type": "react", "max_iterations": 10},
        "prompt_config": request.prompt_config or {"system": "你是一个有帮助的AI助手。"},
        "memory_config": request.memory_config or {"enabled": True, "type": "hybrid"},
        "decision_config": request.decision_config or {"auto_critique": True},
        "tools_config": request.tools_config or {"enabled": True},
        "status": "draft",
        "created_at": datetime.now().isoformat(),
    }
    
    logger.info(f"Creating agent {agent_id}: llm_config={agent_data['llm_config']}")
    
    with open(path, "w") as f:
        json.dump(agent_data, f, indent=2, ensure_ascii=False)
    
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
    
    # Update only provided fields
    if request.name is not None:
        agent_data["name"] = request.name
    if request.description is not None:
        agent_data["description"] = request.description
    if request.graph_def is not None:
        agent_data["graph_def"] = request.graph_def if request.graph_def.get("nodes") else DEFAULT_AGENT_GRAPH
    if request.status is not None:
        agent_data["status"] = request.status
    if request.llm_config is not None:
        agent_data["llm_config"] = request.llm_config
    if request.mode_config is not None:
        agent_data["mode_config"] = request.mode_config
    if request.prompt_config is not None:
        agent_data["prompt_config"] = request.prompt_config
    if request.memory_config is not None:
        agent_data["memory_config"] = request.memory_config
    if request.decision_config is not None:
        agent_data["decision_config"] = request.decision_config
    if request.tools_config is not None:
        agent_data["tools_config"] = request.tools_config
    
    agent_data["updated_at"] = datetime.now().isoformat()
    
    logger.info(f"Updating agent {agent_id}: llm_config={agent_data.get('llm_config')}")
    
    with open(path, "w") as f:
        json.dump(agent_data, f, indent=2, ensure_ascii=False)
    
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

    logger.info(f"=== execute_agent {agent_id} ===")
    logger.info(f"llm_config: {llm_config}")
    logger.info(f"mode_config: {mode_config}")
    logger.info(f"prompt_config: {prompt_config}")
    logger.info(f"graph_def nodes: {[n.get('id') for n in graph_def.get('nodes', [])]}")

    # 用配置初始化 Engine
    engine = AgentEngine(
        graph_def=graph_def,
        llm_config=llm_config,
        agent_mode_config=mode_config,
        prompt_config=prompt_config,
    )

    # 构造初始消息
    system_prompt = prompt_config.get("system", "你是一个有帮助的AI助手。")
    user_message = request.message or request.input_data.get("message", "")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if user_message:
        messages.append({"role": "user", "content": user_message})

    logger.info(f"Initial messages: {messages}")

    # 执行
    thread_id = request.session_id or "default"
    try:
        result = await engine.execute(
            initial_state={"messages": messages, "context": {}, "result": {}},
            thread_id=thread_id,
        )
        logger.info(f"Execution result: {result}")
    except Exception as e:
        logger.exception(f"Execution failed: {e}")
        return {"status": "error", "error": str(e)}

    return {"status": "completed", "result": result}
