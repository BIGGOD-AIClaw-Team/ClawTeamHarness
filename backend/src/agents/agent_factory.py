"""Agent Factory - creates AgentEngine instances from configuration."""
from typing import Optional

from .config_models import AgentConfig, AgentMode
from .engine import AgentEngine
from .modes import (
    ReActAgent,
    PlanExecuteAgent,
    ChatAgent,
    BabyAGIAgent,
    AutoGPTAgent,
)


class AgentFactory:
    """Agent 工厂类，根据配置创建 Agent"""

    # AgentMode 字符串到类的映射
    _MODE_CLASSES = {
        AgentMode.REACT: ReActAgent,
        AgentMode.PLAN_AND_EXECUTE: PlanExecuteAgent,
        AgentMode.CHAT_CONVERSATION: ChatAgent,
        AgentMode.BABY_AGI: BabyAGIAgent,
        AgentMode.AUTO_GPT: AutoGPTAgent,
    }

    # 字符串到 AgentMode 枚举的映射
    _MODE_STR_MAP = {
        "react": AgentMode.REACT,
        "plan_and_execute": AgentMode.PLAN_AND_EXECUTE,
        "chat_conversation": AgentMode.CHAT_CONVERSATION,
        "baby_agi": AgentMode.BABY_AGI,
        "auto_gpt": AgentMode.AUTO_GPT,
    }

    @staticmethod
    def create_agent(config: AgentConfig, use_engine: bool = False) -> any:
        """
        根据配置创建 Agent 实例.

        Args:
            config: AgentConfig 配置对象
            use_engine: 如果为 True，优先使用 AgentEngine；
                        如果为 False，使用新的 mode 类

        Returns:
            Agent 实例 (mode 类或 AgentEngine)
        """
        mode_type = config.mode.type

        # 获取对应的 Agent 类
        agent_cls = AgentFactory._MODE_CLASSES.get(mode_type)

        if agent_cls is None:
            # fallback: 使用 AgentEngine
            return AgentFactory._create_engine(config)

        # 创建 mode 实例
        return agent_cls(config)

    @staticmethod
    def create_agent_by_str(mode_str: str, config: AgentConfig) -> any:
        """
        根据字符串模式名称创建 Agent.

        Args:
            mode_str: 模式字符串，如 "react", "plan_and_execute" 等
            config: AgentConfig 配置对象

        Returns:
            Agent 实例
        """
        mode_type = AgentFactory._MODE_STR_MAP.get(mode_str.lower())

        if mode_type is None:
            raise ValueError(f"Unknown agent mode: {mode_str}. "
                             f"Available modes: {list(AgentFactory._MODE_STR_MAP.keys())}")

        agent_cls = AgentFactory._MODE_CLASSES.get(mode_type)
        if agent_cls is None:
            raise ValueError(f"No implementation for agent mode: {mode_type}")

        return agent_cls(config)

    @staticmethod
    def _create_engine(config: AgentConfig) -> AgentEngine:
        """创建 AgentEngine 实例 (向后兼容)."""
        return AgentEngine(
            name=config.name,
            llm_config=config.llm.model_dump(),
            agent_mode_config=config.mode.model_dump(),
            prompt_config=config.prompt.model_dump(),
        )

    @staticmethod
    def create_from_dict(data: dict, use_engine: bool = False) -> any:
        """
        从字典创建 Agent.

        Args:
            data: 字典形式的配置
            use_engine: 是否优先使用 AgentEngine

        Returns:
            Agent 实例
        """
        config = AgentConfig(**data)
        return AgentFactory.create_agent(config, use_engine=use_engine)

    @staticmethod
    def list_supported_modes() -> list[str]:
        """返回所有支持的模式名称."""
        return list(AgentFactory._MODE_STR_MAP.keys())

    @staticmethod
    def get_mode_description(mode_str: str) -> str:
        """返回指定模式的描述."""
        mode_map = {
            "react": "ReAct模式: 思考→行动→观察循环，适合需要工具调用的复杂推理",
            "plan_and_execute": "Plan-Execute模式: 先将目标分解为步骤计划，再依次执行，适合多步骤复杂任务",
            "chat_conversation": "Chat模式: 纯对话，无工具调用，适合简单问答和客服场景",
            "baby_agi": "BabyAGI模式: 目标驱动+自主任务分解，适合开放性目标任务",
            "auto_gpt": "AutoGPT模式: 高度自主的决策循环，适合端到端自主任务执行",
        }
        return mode_map.get(mode_str, "未知模式")
