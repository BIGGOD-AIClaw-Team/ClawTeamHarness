"""Agent configuration models using Pydantic."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


class AgentMode(str, Enum):
    REACT = "react"
    PLAN_AND_EXECUTE = "plan_and_execute"
    CHAT_CONVERSATION = "chat_conversation"
    BABY_AGI = "baby_agi"
    AUTO_GPT = "auto_gpt"


class MemoryType(str, Enum):
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    VECTOR = "vector"
    HYBRID = "hybrid"


class LLMConfig(BaseModel):
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: Optional[float] = 1.0
    api_key: Optional[str] = None  # 从环境变量读取


class AgentModeConfig(BaseModel):
    type: AgentMode = AgentMode.REACT
    max_iterations: int = 10
    early_stopping: bool = True


class PromptConfig(BaseModel):
    system: str = ""
    user_template: str = "{input}"
    few_shot_examples: list[str] = Field(default_factory=list)


class ShortTermMemoryConfig(BaseModel):
    enabled: bool = True
    max_messages: int = 50
    window_type: Literal["sliding", "buffered"] = "sliding"


class LongTermMemoryConfig(BaseModel):
    enabled: bool = True
    vector_store: str = "chroma"
    top_k: int = 5
    similarity_threshold: float = 0.7


class MemoryConfig(BaseModel):
    enabled: bool = True
    type: MemoryType = MemoryType.HYBRID
    short_term: ShortTermMemoryConfig = Field(default_factory=ShortTermMemoryConfig)
    long_term: LongTermMemoryConfig = Field(default_factory=LongTermMemoryConfig)


class DecisionConfig(BaseModel):
    auto_critique: bool = True
    confidence_threshold: float = 0.8
    allow_replan: bool = True


class ToolConfig(BaseModel):
    enabled: bool = True
    mcp_servers: list[dict] = Field(default_factory=list)
    skills: list[dict] = Field(default_factory=list)


class SubAgent(BaseModel):
    name: str
    role: str
    llm_config: Optional[LLMConfig] = None


class MultiAgentConfig(BaseModel):
    enabled: bool = False
    mode: Literal["supervisor", "collaborative"] = "supervisor"
    agents: list[SubAgent] = Field(default_factory=list)


class AgentConfig(BaseModel):
    """完整的 Agent 配置"""
    name: str
    description: Optional[str] = ""

    # LLM
    llm: LLMConfig = Field(default_factory=LLMConfig)

    # Agent 模式
    mode: AgentModeConfig = Field(default_factory=AgentModeConfig)

    # 提示词
    prompt: PromptConfig = Field(default_factory=PromptConfig)

    # 记忆
    memory: MemoryConfig = Field(default_factory=MemoryConfig)

    # 决策
    decision: DecisionConfig = Field(default_factory=DecisionConfig)

    # 工具
    tools: ToolConfig = Field(default_factory=ToolConfig)

    # 多智能体
    multi_agent: MultiAgentConfig = Field(default_factory=MultiAgentConfig)

    # 元数据
    status: Literal["draft", "published"] = "draft"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
