from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
from pathlib import Path
from datetime import datetime
import logging
from ...db.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["agents"])

# 使用 backend 目录作为基准，确保跨目录启动时路径一致
# agents.py at src/api/routes/agents.py -> parents[4] = ClawTeamHarness/
# data/agents 位于 ClawTeamHarness/data/agents
# agents.py at src/api/routes/agents.py -> parents[5] = ClawTeamHarness/
# data/agents 位于 ClawTeamHarness/data/agents
AGENTS_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "agents"
AGENTS_DIR.mkdir(parents=True, exist_ok=True)
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

class SubAgent(BaseModel):
    id: str
    role: str
    name: str
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
    skills: Optional[List[str]] = []
    sub_agents: Optional[List[dict]] = []
    mcp_tools: Optional[List[str]] = []
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
    skills: Optional[List[str]] = None
    sub_agents: Optional[List[dict]] = None
    mcp_tools: Optional[List[str]] = None
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
    """
    创建 Agent（初始状态为草稿）
    P0-3 安全修复: 使用 UUID 生成唯一 ID，避免 name.lower().replace(" ", "_") 
    导致的 ID 冲突问题（如 "MyAgent" 和 "myagent" 都会生成 "myagent"）
    """
    # P0-3 修复: 使用 UUID 确保全局唯一性
    agent_id = str(uuid.uuid4())[:8]  # 使用短 UUID 便于阅读
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
        "skills": request.skills or [],
        "sub_agents": request.sub_agents or [],
        "mcp_tools": request.mcp_tools or [],
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
    if request.skills is not None:
        agent_data["skills"] = request.skills
    if request.sub_agents is not None:
        agent_data["sub_agents"] = request.sub_agents
    if request.mcp_tools is not None:
        agent_data["mcp_tools"] = request.mcp_tools
    
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

@router.post("/{agent_id}/unpublish")
async def unpublish_agent(agent_id: str):
    """取消发布 Agent"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    with open(path) as f:
        data = json.load(f)
    
    data["status"] = "draft"
    data["unpublished_at"] = datetime.now().isoformat()
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    
    return {"status": "unpublished", "agent_id": agent_id}

@router.get("/{agent_id}/conversations")
async def get_conversations(agent_id: str):
    """获取 Agent 的所有会话"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db = get_db()
    conversations = db.get_conversations(agent_id)
    return {"conversations": conversations}

@router.get("/{agent_id}/messages/{conversation_id}")
async def get_messages(agent_id: str, conversation_id: int):
    """获取会话的所有消息"""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db = get_db()
    messages = db.get_messages(conversation_id)
    return {"messages": messages}

class AgentExecuteRequest(BaseModel):
    message: str = ""
    session_id: Optional[str] = None
    input_data: dict = {}
    model: Optional[str] = None  # P0-4 修复: 支持前端指定模型

@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecuteRequest):
    """
    触发 Agent 执行 - 使用简洁的 Agent 模式
    P0-4 修复: 支持前端传递 model 参数覆盖默认配置
    """
    from ...agents.simple_agent import Agent as SimpleAgent

    # 加载 Agent
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")

    with open(path) as f:
        data = json.load(f)

    # 取出配置
    llm_config = data.get("llm_config", {})
    prompt_config = data.get("prompt_config", {})
    memory_config = data.get("memory_config", {})
    
    # P0-4 修复: 如果请求中指定了 model，覆盖 llm_config 中的 model
    if request.model:
        llm_config["model"] = request.model
        logger.info(f"P0-4 修复: 使用前端指定模型 {request.model}")

    logger.info(f"=== execute_agent {agent_id} ===")
    logger.info(f"llm_config: {llm_config}")
    logger.info(f"prompt_config: {prompt_config}")

    # 用户消息
    user_message = request.message or request.input_data.get("message", "")
    if not user_message:
        return {"status": "error", "error": "消息不能为空"}

    try:
        # 创建简单的 Agent
        agent = SimpleAgent(
            name=agent_id,
            llm_config=llm_config,
            prompt_config=prompt_config,
            memory_config=memory_config,
        )
        
        # 直接对话
        response = await agent.chat(user_message)
        
        return {
            "status": "completed",
            "result": {
                "response": response,
                "agent_id": agent_id,
            }
        }
    except Exception as e:
        logger.exception(f"Agent execution failed: {e}")
        return {"status": "error", "error": str(e)}

@router.post("/{agent_id}/stream")
async def stream_agent(agent_id: str, request: AgentExecuteRequest):
    """
    流式对话 - 返回 Server-Sent Events，支持历史消息
    P0-4 修复: 支持前端传递 model 参数覆盖默认配置
    """
    from ...agents.simple_agent import Agent as SimpleAgent

    # 加载 Agent
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")

    with open(path) as f:
        data = json.load(f)

    # 取出配置
    llm_config = data.get("llm_config", {})
    prompt_config = data.get("prompt_config", {})
    memory_config = data.get("memory_config", {})
    
    # P0-4 修复: 如果请求中指定了 model，覆盖 llm_config 中的 model
    if request.model:
        llm_config["model"] = request.model
        logger.info(f"P0-4 修复: stream_agent 使用前端指定模型 {request.model}")

    logger.info(f"=== stream_agent {agent_id} ===")

    # 用户消息
    user_message = request.message or request.input_data.get("message", "")
    if not user_message:
        error_data = json.dumps({"error": "消息不能为空"}, ensure_ascii=False)
        async def error_gen():
            yield f"data: {error_data}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    # 获取 session_id
    session_id = request.session_id or f"session_{agent_id}_{int(datetime.now().timestamp())}"

    async def generate():
        db = get_db()
        is_new_session = False
        
        # 查找会话
        conversation = db.get_conversation_by_session(agent_id, session_id)
        if not conversation:
            # 新会话：先保存用户消息（会自动创建会话）
            db.save_message(agent_id, session_id, "user", user_message)
            conversation = db.get_conversation_by_session(agent_id, session_id)
            is_new_session = True
        
        conv_id = conversation["id"]
        
        # 从数据库加载历史消息
        history_msgs = db.get_messages(conv_id)
        
        # 如果是新会话，历史中最后一条是刚存的用户消息，需要排除（Agent 会自己处理）
        if is_new_session and history_msgs and history_msgs[-1]["content"] == user_message:
            history_msgs = history_msgs[:-1]
        
        try:
            # 创建简单的 Agent
            agent = SimpleAgent(
                name=agent_id,
                llm_config=llm_config,
                prompt_config=prompt_config,
                memory_config=memory_config,
            )
            
            # 加载历史到 Agent
            for msg in history_msgs:
                agent.messages.append({"role": msg["role"], "content": msg["content"]})
            
            # 流式调用 LLM
            full_response = ""
            async for chunk in agent.stream_chat(user_message):
                full_response += chunk
                data_chunk = json.dumps({"chunk": chunk}, ensure_ascii=False)
                yield f"data: {data_chunk}\n\n"
            
            # 保存助手回复到数据库
            db.save_message(agent_id, session_id, "assistant", full_response)
            
            yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            logger.exception(f"Agent stream failed: {e}")
            error_data = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
