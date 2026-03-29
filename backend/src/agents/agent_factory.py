"""Agent Factory - creates AgentEngine instances from configuration."""
from typing import Optional
from .config_models import AgentConfig, AgentMode
from .engine import AgentEngine


class AgentFactory:
    """Agent 工厂类，根据配置创建 Agent"""

    @staticmethod
    def create_agent(config: AgentConfig) -> AgentEngine:
        """根据配置创建 Agent 引擎"""
        engine = AgentEngine(
            name=config.name,
            llm_config=config.llm.model_dump(),
            agent_mode_config=config.mode.model_dump(),
        )
        return engine

    @staticmethod
    def create_from_dict(data: dict) -> AgentEngine:
        """从字典创建 Agent"""
        config = AgentConfig(**data)
        return AgentFactory.create_agent(config)
