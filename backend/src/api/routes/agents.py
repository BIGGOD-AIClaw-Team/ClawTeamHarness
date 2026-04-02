"""
Agent API routes — Task 1.5: API 适配.

Changes vs old version:
- Router prefix: /api/agents → /api/v1/agents
- Uses new AgentConfig Pydantic model from config_models
- New endpoints: validate, test, preview
- YAML export / import support
- Canonical field: agent_mode.type (not mode_config.type)
- Backward-compatible: old graph_def / mode_config still accepted on write
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List, Dict, Any
import json
import uuid
from pathlib import Path
from datetime import datetime
import logging
import yaml

from db.database import get_db
from agents.config_models import (
    AgentConfig,
    LLMConfig,
    AgentModeConfig,
    PromptConfig,
    MemoryConfig,
    DecisionConfig,
    ToolsConfig,
    MultiAgentConfig,
    AdvancedConfig,
    AgentMode,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])

# Data directory
AGENTS_DIR = Path(__file__).resolve().parents[4] / "data" / "agents"
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
    ],
}


# ---------------------------------------------------------------------------
# Legacy-compatible request models (accepted on create/update)
# ---------------------------------------------------------------------------

class AgentCreateRequest(BaseModel):
    """Create agent — supports both new AgentConfig fields and old flat fields."""
    # New-style fields (AgentConfig)
    agent_id: Optional[str] = None
    name: str = ""
    description: str = ""
    tags: list[str] = []
    icon: str = "🤖"
    category: str = "general"
    llm: Optional[LLMConfig] = None
    agent_mode: Optional[AgentModeConfig] = None
    prompt: Optional[PromptConfig] = None
    memory: Optional[MemoryConfig] = None
    decision: Optional[DecisionConfig] = None
    tools: Optional[ToolsConfig] = None
    multi_agent: Optional[MultiAgentConfig] = None
    advanced: Optional[AdvancedConfig] = None

    # Legacy flat fields (backward-compat; mapped to new structure on save)
    graph_def: Optional[dict] = None
    llm_config: Optional[dict] = None      # → llm
    mode_config: Optional[dict] = None     # → agent_mode
    prompt_config: Optional[dict] = None   # → prompt
    memory_config: Optional[dict] = None   # → memory
    decision_config: Optional[dict] = None # → decision
    tools_config: Optional[dict] = None    # → tools
    skills: Optional[list[str]] = None
    sub_agents: Optional[list[dict]] = None
    mcp_tools: Optional[list[str]] = None
    status: str = "draft"


class AgentUpdateRequest(BaseModel):
    """Update agent — same dual-field strategy."""
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    llm: Optional[LLMConfig] = None
    agent_mode: Optional[AgentModeConfig] = None
    prompt: Optional[PromptConfig] = None
    memory: Optional[MemoryConfig] = None
    decision: Optional[DecisionConfig] = None
    tools: Optional[ToolsConfig] = None
    multi_agent: Optional[MultiAgentConfig] = None
    advanced: Optional[AdvancedConfig] = None
    status: Optional[str] = None

    # Legacy
    graph_def: Optional[dict] = None
    llm_config: Optional[dict] = None
    mode_config: Optional[dict] = None
    prompt_config: Optional[dict] = None
    memory_config: Optional[dict] = None
    decision_config: Optional[dict] = None
    tools_config: Optional[dict] = None
    skills: Optional[list[str]] = None
    sub_agents: Optional[list[dict]] = None
    mcp_tools: Optional[list[str]] = None


class AgentExecuteRequest(BaseModel):
    message: str = ""
    session_id: Optional[str] = None
    input_data: dict = {}
    model: Optional[str] = None


class TestExecuteRequest(BaseModel):
    message: str = "Hello, are you working?"
    session_id: Optional[str] = None
    model: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_agent_config(req: AgentCreateRequest) -> AgentConfig:
    """Convert a create/update request into a full AgentConfig dict for storage."""
    cfg: Dict[str, Any] = {}

    # Identity
    cfg["agent_id"] = req.agent_id or str(uuid.uuid4())[:8]
    cfg["name"] = req.name
    cfg["description"] = req.description
    cfg["tags"] = req.tags
    cfg["icon"] = req.icon
    cfg["category"] = req.category

    # Core config — prefer new typed fields, fall back to legacy dicts
    cfg["llm"] = _model_to_dict(req.llm) if req.llm else (req.llm_config or {})
    cfg["agent_mode"] = _model_to_dict(req.agent_mode) if req.agent_mode else (req.mode_config or {})
    cfg["prompt"] = _model_to_dict(req.prompt) if req.prompt else (req.prompt_config or {})
    cfg["memory"] = _model_to_dict(req.memory) if req.memory else (req.memory_config or {})
    cfg["decision"] = _model_to_dict(req.decision) if req.decision else (req.decision_config or {})
    cfg["tools"] = _model_to_dict(req.tools) if req.tools else (req.tools_config or {})
    cfg["multi_agent"] = _model_to_dict(req.multi_agent) if req.multi_agent else {}
    cfg["advanced"] = _model_to_dict(req.advanced) if req.advanced else {}

    # Status
    cfg["status"] = req.status
    cfg["created_at"] = datetime.now().isoformat()
    cfg["updated_at"] = cfg["created_at"]
    cfg["version"] = 1

    # Legacy graph_def (kept for backward compat)
    cfg["graph_def"] = req.graph_def if req.graph_def else DEFAULT_AGENT_GRAPH

    # Legacy flat lists
    cfg["skills"] = req.skills or []
    cfg["sub_agents"] = req.sub_agents or []
    cfg["mcp_tools"] = req.mcp_tools or []

    return cfg


def _apply_update(existing: Dict[str, Any], req: AgentUpdateRequest) -> Dict[str, Any]:
    """Merge update request into existing agent data dict."""
    data = existing.copy()

    # New fields
    for field in ("name", "description", "tags", "icon", "category", "status"):
        val = getattr(req, field, None)
        if val is not None:
            data[field] = val

    for section in ("llm", "agent_mode", "prompt", "memory", "decision", "tools", "multi_agent", "advanced"):
        val = getattr(req, section, None)
        if val is not None:
            data[section] = _model_to_dict(val)
        # Also check legacy flat variant
        legacy_map = {
            "llm": "llm_config",
            "agent_mode": "mode_config",
            "prompt": "prompt_config",
            "memory": "memory_config",
            "decision": "decision_config",
            "tools": "tools_config",
        }
        legacy_key = legacy_map.get(section)
        if legacy_key:
            legacy_val = getattr(req, legacy_key, None)
            if legacy_val is not None and data.get(section) is None:
                data[section] = legacy_val

    # Legacy graph_def
    if req.graph_def is not None:
        data["graph_def"] = req.graph_def if req.graph_def.get("nodes") else DEFAULT_AGENT_GRAPH

    # Legacy flat lists
    for legacy_field in ("skills", "sub_agents", "mcp_tools"):
        val = getattr(req, legacy_field, None)
        if val is not None:
            data[legacy_field] = val

    data["updated_at"] = datetime.now().isoformat()
    return data


def _model_to_dict(model: BaseModel) -> dict:
    """Convert a Pydantic model to a plain dict, excluding None values."""
    return model.model_dump(exclude_none=True)


def _load_agent(agent_id: str) -> dict:
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    with open(path) as f:
        return json.load(f)


def _save_agent(agent_id: str, data: dict):
    path = AGENTS_DIR / f"{agent_id}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _validate_agent_config(data: dict) -> List[str]:
    """Validate agent config and return list of error messages (empty = valid)."""
    errors = []

    if not data.get("name"):
        errors.append("name is required")
    if not data.get("agent_id"):
        errors.append("agent_id is required")

    # Validate agent_mode.type against known enum values
    mode_data = data.get("agent_mode", {})
    mode_type = mode_data.get("type") if isinstance(mode_data, dict) else None
    if mode_type and mode_type not in [e.value for e in AgentMode]:
        errors.append(f"agent_mode.type '{mode_type}' is not a known AgentMode")

    # Validate llm provider
    llm_data = data.get("llm", {})
    provider = llm_data.get("provider") if isinstance(llm_data, dict) else None
    if provider and provider not in ["openai", "anthropic", "glm", "minimax", "qwen", "doubao", "wenxin", "hunyuan", "local"]:
        errors.append(f"llm.provider '{provider}' is not a known provider")

    # Validate nested structure basics
    for section in ("llm", "agent_mode", "prompt", "memory", "decision", "tools"):
        section_data = data.get(section)
        if section_data and not isinstance(section_data, dict):
            errors.append(f"{section} must be a dict, got {type(section_data).__name__}")

    return errors


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/")
async def list_agents(status: str = Query(None)):
    """List agents, optionally filtered by status."""
    agents = []
    for f in sorted(AGENTS_DIR.glob("*.json")):
        with open(f) as fp:
            agent = json.load(fp)
            if status is None or agent.get("status") == status:
                agents.append(agent)
    return {"agents": agents}


@router.post("/")
async def create_agent(request: AgentCreateRequest):
    """
    Create a new agent.
    Accepts both new AgentConfig-structured fields and legacy flat fields.
    """
    agent_id = request.agent_id or str(uuid.uuid4())[:8]
    path = AGENTS_DIR / f"{agent_id}.json"
    if path.exists():
        raise HTTPException(status_code=400, detail=f"Agent '{agent_id}' already exists")

    data = _build_agent_config(request)
    data["agent_id"] = agent_id

    # Validate before saving
    errors = _validate_agent_config(data)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Validation failed", "errors": errors})

    logger.info(f"Creating agent {agent_id}: llm={data.get('llm')}, agent_mode={data.get('agent_mode')}")
    _save_agent(agent_id, data)
    return {"agent_id": agent_id, "status": "created", "agent_status": data["status"]}


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """Get agent by ID."""
    return _load_agent(agent_id)


@router.put("/{agent_id}")
async def update_agent(agent_id: str, request: AgentUpdateRequest):
    """Update an existing agent."""
    existing = _load_agent(agent_id)
    data = _apply_update(existing, request)

    errors = _validate_agent_config(data)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Validation failed", "errors": errors})

    logger.info(f"Updating agent {agent_id}")
    _save_agent(agent_id, data)
    return {"agent_id": agent_id, "status": "updated"}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    path = AGENTS_DIR / f"{agent_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Agent not found")
    path.unlink()
    return {"status": "deleted"}


@router.post("/{agent_id}/publish")
async def publish_agent(agent_id: str):
    """Publish an agent."""
    data = _load_agent(agent_id)
    data["status"] = "published"
    data["published_at"] = datetime.now().isoformat()
    _save_agent(agent_id, data)
    return {"status": "published", "agent_id": agent_id}


@router.post("/{agent_id}/unpublish")
async def unpublish_agent(agent_id: str):
    """Unpublish an agent."""
    data = _load_agent(agent_id)
    data["status"] = "draft"
    data["updated_at"] = datetime.now().isoformat()
    _save_agent(agent_id, data)
    return {"status": "unpublished", "agent_id": agent_id}


# ---------------------------------------------------------------------------
# Task 1.5 new endpoints
# ---------------------------------------------------------------------------

@router.post("/{agent_id}/validate")
async def validate_agent_config(agent_id: str):
    """
    Validate an agent's configuration.
    Returns {valid: bool, errors: list[str]}.
    """
    data = _load_agent(agent_id)
    errors = _validate_agent_config(data)
    return {"valid": len(errors) == 0, "errors": errors}


class TestResult(BaseModel):
    status: str  # "success" | "error"
    response: Optional[str] = None
    error: Optional[str] = None
    latency_ms: Optional[float] = None
    model: Optional[str] = None


@router.post("/{agent_id}/test", response_model=TestResult)
async def test_agent(agent_id: str, request: TestExecuteRequest):
    """
    Test-run an agent with a simple message.
    Does NOT persist the conversation.
    """
    data = _load_agent(agent_id)

    llm_config = data.get("llm", {})
    prompt_config = data.get("prompt_config", data.get("prompt", {}))
    memory_config = data.get("memory_config", data.get("memory", {}))

    # Allow model override
    if request.model:
        llm_config = dict(llm_config)
        llm_config["model"] = request.model

    from agents.simple_agent import Agent as SimpleAgent
    import time

    user_message = request.message
    if not user_message:
        return TestResult(status="error", error="message is required")

    try:
        agent = SimpleAgent(
            name=agent_id,
            llm_config=llm_config,
            prompt_config=prompt_config,
            memory_config=memory_config,
        )

        start = time.time()
        response = await agent.chat(user_message)
        latency_ms = (time.time() - start) * 1000

        return TestResult(
            status="success",
            response=response,
            latency_ms=round(latency_ms, 1),
            model=llm_config.get("model"),
        )
    except Exception as e:
        logger.exception(f"Test run failed for agent {agent_id}")
        return TestResult(status="error", error=str(e))


@router.get("/{agent_id}/preview")
async def preview_agent_yaml(agent_id: str):
    """
    Preview agent configuration as YAML.
    Returns the full agent config in YAML format for export/inspection.
    """
    data = _load_agent(agent_id)

    # Convert to YAML — use yaml.safe_dump for clean output
    yaml_str = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, indent=2)

    return {
        "agent_id": agent_id,
        "yaml": yaml_str,
        "format": "yaml",
    }


# ---------------------------------------------------------------------------
# YAML Import / Export
# ---------------------------------------------------------------------------

class ImportRequest(BaseModel):
    yaml_content: str


@router.post("/import")
async def import_agent(request: ImportRequest):
    """
    Import an agent from YAML content.
    Returns the created agent_id.
    """
    try:
        data = yaml.safe_load(request.yaml_content)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="YAML must represent an agent object")

    errors = _validate_agent_config(data)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Validation failed", "errors": errors})

    # Generate new agent_id (always — imported agents get fresh IDs)
    agent_id = str(uuid.uuid4())[:8]
    while (AGENTS_DIR / f"{agent_id}.json").exists():
        agent_id = str(uuid.uuid4())[:8]

    data["agent_id"] = agent_id
    data["created_at"] = datetime.now().isoformat()
    data["updated_at"] = data["created_at"]

    _save_agent(agent_id, data)
    logger.info(f"Imported agent {agent_id} from YAML")
    return {"agent_id": agent_id, "status": "imported"}


@router.get("/export/{agent_id}")
async def export_agent_yaml(agent_id: str):
    """Export an agent as downloadable YAML."""
    data = _load_agent(agent_id)
    yaml_str = yaml.safe_dump(data, allow_unicode=True, sort_keys=False, indent=2)
    filename = f"agent_{agent_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.yaml"
    return {
        "agent_id": agent_id,
        "yaml": yaml_str,
        "filename": filename,
    }


# ---------------------------------------------------------------------------
# Conversations (kept from old version)
# ---------------------------------------------------------------------------

@router.get("/{agent_id}/conversations")
async def get_conversations(agent_id: str):
    """Get all conversations for an agent."""
    _load_agent(agent_id)  # 404 if not found
    db = get_db()
    conversations = db.get_conversations(agent_id)
    return {"conversations": conversations}


@router.get("/{agent_id}/messages/{conversation_id}")
async def get_messages(agent_id: str, conversation_id: int):
    """Get all messages in a conversation."""
    _load_agent(agent_id)
    db = get_db()
    messages = db.get_messages(conversation_id)
    return {"messages": messages}


@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecuteRequest):
    """
    Trigger agent execution.
    Supports model override via request.model.
    """
    from agents.simple_agent import Agent as SimpleAgent

    data = _load_agent(agent_id)

    llm_config = dict(data.get("llm", {}))
    prompt_config = data.get("prompt_config", data.get("prompt", {}))
    memory_config = data.get("memory_config", data.get("memory", {}))

    if request.model:
        llm_config["model"] = request.model
        logger.info(f"execute_agent: using model override {request.model}")

    user_message = request.message or request.input_data.get("message", "")
    if not user_message:
        return {"status": "error", "error": "message cannot be empty"}

    try:
        agent = SimpleAgent(
            name=agent_id,
            llm_config=llm_config,
            prompt_config=prompt_config,
            memory_config=memory_config,
        )
        response = await agent.chat(user_message)
        return {"status": "completed", "result": {"response": response, "agent_id": agent_id}}
    except Exception as e:
        logger.exception(f"Agent execution failed: {e}")
        return {"status": "error", "error": str(e)}


@router.post("/{agent_id}/stream")
async def stream_agent(agent_id: str, request: AgentExecuteRequest):
    """Stream agent response as SSE."""
    from agents.simple_agent import Agent as SimpleAgent

    data = _load_agent(agent_id)

    llm_config = dict(data.get("llm", {}))
    prompt_config = data.get("prompt_config", data.get("prompt", {}))
    memory_config = data.get("memory_config", data.get("memory", {}))

    if request.model:
        llm_config["model"] = request.model

    user_message = request.message or request.input_data.get("message", "")
    if not user_message:
        error_data = json.dumps({"error": "message cannot be empty"}, ensure_ascii=False)
        async def error_gen():
            yield f"data: {error_data}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    session_id = request.session_id or f"session_{agent_id}_{int(datetime.now().timestamp())}"

    async def generate():
        db = get_db()
        is_new_session = False

        conversation = db.get_conversation_by_session(agent_id, session_id)
        if not conversation:
            db.save_message(agent_id, session_id, "user", user_message)
            conversation = db.get_conversation_by_session(agent_id, session_id)
            is_new_session = True

        conv_id = conversation["id"]
        history_msgs = db.get_messages(conv_id)
        if is_new_session and history_msgs and history_msgs[-1]["content"] == user_message:
            history_msgs = history_msgs[:-1]

        try:
            agent = SimpleAgent(
                name=agent_id,
                llm_config=llm_config,
                prompt_config=prompt_config,
                memory_config=memory_config,
            )
            for msg in history_msgs:
                agent.messages.append({"role": msg["role"], "content": msg["content"]})

            full_response = ""
            async for chunk in agent.stream_chat(user_message):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

            db.save_message(agent_id, session_id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.exception(f"Agent stream failed: {e}")
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
