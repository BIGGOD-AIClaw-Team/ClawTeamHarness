"""Agent configuration models using Pydantic V2.

Matches the task doc spec from BOB_TASKS_V2.md Task 1.1.
Key alignment (Cathy): agent_mode.type is the canonical field (not mode_config.type).
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GLM = "glm"
    MINIMAX = "minimax"
    QWEN = "qwen"
    DOUBÃO = "doubao"
    WENXIN = "wenxin"
    HUNYUAN = "hunyuan"
    LOCAL = "local"


class AgentMode(str, Enum):
    REACT = "react"
    PLAN_AND_EXECUTE = "plan_and_execute"
    CHAT_CONVERSATION = "chat_conversation"
    BABY_AGI = "baby_agi"
    AUTO_GPT = "auto_gpt"


class MemoryType(str, Enum):
    SHORT_TERM = "short"
    LONG_TERM = "long"
    VECTOR = "vector"
    HYBRID = "hybrid"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class LLMConfig(BaseModel):
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0


class AgentModeConfig(BaseModel):
    # Canonical field name: agent_mode.type (task spec)
    type: AgentMode = AgentMode.REACT
    max_iterations: int = Field(default=10, ge=1)
    max_iterations_per_step: int = Field(default=5, ge=1)
    early_stopping: bool = True
    stop_when: list[dict] = []


class FewShotExample(BaseModel):
    input: str = ""
    output: str = ""


class PromptConfig(BaseModel):
    system: str = ""
    user_template: str = "{input}"
    context_template: str = ""
    few_shot_examples: list[FewShotExample] = []


class ShortTermMemoryConfig(BaseModel):
    enabled: bool = True
    max_messages: int = Field(default=50, ge=1)
    window_type: Literal["sliding", "cumulative"] = "sliding"
    preserve_roles: list[str] = ["system", "developer"]


class LongTermMemoryConfig(BaseModel):
    enabled: bool = False
    storage: Literal["chroma", "sqlite", "pgvector"] = "chroma"
    vector_dim: int = 1536
    top_k: int = Field(default=5, ge=1)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    auto_store: bool = True
    namespace: str = "default"


class EntityMemoryConfig(BaseModel):
    enabled: bool = False
    extract_entities: bool = True
    entity_types: list[str] = ["person", "location", "organization"]


class SessionMemoryConfig(BaseModel):
    enabled: bool = True
    session_ttl: int = 86400


class MemoryConfig(BaseModel):
    enabled: bool = True
    type: MemoryType = MemoryType.HYBRID
    short_term: ShortTermMemoryConfig = Field(default_factory=ShortTermMemoryConfig)
    long_term: LongTermMemoryConfig = Field(default_factory=LongTermMemoryConfig)
    entity: EntityMemoryConfig = Field(default_factory=EntityMemoryConfig)
    session: SessionMemoryConfig = Field(default_factory=SessionMemoryConfig)


class DecisionConfig(BaseModel):
    auto_critique: bool = False
    critique_prompt: str = ""
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    low_confidence_action: Literal["fallback", "ask_user", "abstain"] = "fallback"
    allow_replan: bool = False
    replan_trigger: str = "significant_new_info"
    tool_routing: dict = {}


class MCPServerConfig(BaseModel):
    name: str = ""
    enabled: bool = True
    config: dict = {}


class SkillConfig(BaseModel):
    name: str = ""
    enabled: bool = True
    config: dict = {}


class ToolsConfig(BaseModel):
    enabled: bool = True
    mcp_servers: list[MCPServerConfig] = []
    skills: list[SkillConfig] = []


# Alias for backward compat with agents/__init__.py
ToolConfig = ToolsConfig


class SubAgentConfig(BaseModel):
    id: str = ""
    name: str = ""
    role: str = ""
    agent_config: dict = {}
    tools: dict = {}


# Alias for backward compat with agents/__init__.py
SubAgent = SubAgentConfig


class MultiAgentConfig(BaseModel):
    enabled: bool = False
    mode: Literal["supervisor", "collaborative", "hierarchical", "competitive"] = "supervisor"
    supervisor: dict = {}
    agents: list[SubAgentConfig] = []
    collaboration: dict = {}


class AdvancedConfig(BaseModel):
    streaming: bool = True
    timeout: dict = {"total": 300, "per_node": 60}
    retry: dict = {"max_attempts": 3, "backoff": "exponential"}
    safety: dict = {"content_filter": True}
    tracing: dict = {"enabled": False}


# ---------------------------------------------------------------------------
# Root model
# ---------------------------------------------------------------------------

class AgentConfig(BaseModel):
    """完整的 Agent 配置 — Task 1.1 / 1.5 spec.

    Canonical mode field is agent_mode.type (NOT mode_config.type).
    Backward-compatible with old graph_def stored in agent data dict.
    """
    # 身份字段
    agent_id: str = ""
    name: str = ""
    description: str = ""
    tags: list[str] = []
    icon: str = "🤖"
    category: str = "general"

    # 核心配置（task spec field names）
    llm: LLMConfig = Field(default_factory=LLMConfig)
    agent_mode: AgentModeConfig = Field(default_factory=AgentModeConfig)
    prompt: PromptConfig = Field(default_factory=PromptConfig)
    memory: MemoryConfig = Field(default_factory=MemoryConfig)
    decision: DecisionConfig = Field(default_factory=DecisionConfig)
    tools: ToolsConfig = Field(default_factory=ToolsConfig)
    multi_agent: MultiAgentConfig = Field(default_factory=MultiAgentConfig)
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)

    # 状态
    status: Literal["draft", "published"] = "draft"
    published_at: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""
    version: int = 1

    # Legacy alias — allows old code referencing .mode to still work
    # (NOT used for canonical field; agent_mode is the source of truth)
    @property
    def mode(self) -> AgentModeConfig:
        return self.agent_mode
