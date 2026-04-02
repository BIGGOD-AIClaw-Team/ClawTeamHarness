"""Chat Agent Mode - 纯对话模式，无工具调用."""
from __future__ import annotations

import logging
from typing import Optional

from ..config_models import AgentConfig
from ..nodes import LLMNode

logger = logging.getLogger(__name__)


class ChatAgent:
    """
    Chat Conversation Agent.

    最简单的对话模式:
    - 用户输入 → LLM 回答
    - 无工具调用
    - 无多轮推理循环

    特点:
    - 简单、快速
    - 适合简单问答、客服场景
    - 支持多轮对话历史
    """

    name = "chat_conversation"
    description = "Chat模式: 纯对话，无工具调用，适合简单问答和客服场景"

    def __init__(self, config: AgentConfig):
        self.config = config
        self.prompt_config = config.prompt
        self.llm_config = config.llm

        # 维护对话历史
        self._history: list[dict] = []

    async def run(self, user_input: str, context: Optional[dict] = None, history: Optional[list[dict]] = None) -> dict:
        """
        执行对话.

        Args:
            user_input: 用户输入
            context: 额外上下文（可选）
            history: 历史消息列表 (可选，默认使用内部维护的历史)

        Returns:
            包含 response, messages, history 等字段的字典
        """
        context = context or {}
        messages = history if history is not None else list(self._history)

        # 将用户输入加入消息
        messages.append({"role": "user", "content": user_input})

        # 构建系统提示
        system_prompt = self._build_system_prompt()

        # 调用 LLM
        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=system_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
            top_p=self.llm_config.top_p,
        )

        llm_messages = llm_node._build_messages(system_prompt, context, messages)
        response = await llm_node._call_llm(llm_messages)

        # 更新历史
        messages.append({"role": "assistant", "content": response})
        self._history = list(messages)

        return {
            "response": response,
            "messages": messages,
            "history": self._history,
        }

    async def run_stream(self, user_input: str, context: Optional[dict] = None) -> dict:
        """
        流式对话.

        Args:
            user_input: 用户输入
            context: 额外上下文

        Returns:
            包含 response, messages, history 等字段的字典
        """
        context = context or {}
        messages = list(self._history)

        messages.append({"role": "user", "content": user_input})

        system_prompt = self._build_system_prompt()

        llm_node = LLMNode(
            model=self.llm_config.model,
            prompt_template=system_prompt,
            temperature=self.llm_config.temperature,
            max_tokens=self.llm_config.max_tokens,
            top_p=self.llm_config.top_p,
            stream=True,
        )

        llm_messages = llm_node._build_messages(system_prompt, context, messages)
        response = await llm_node._call_llm_stream(llm_messages)

        messages.append({"role": "assistant", "content": response})
        self._history = list(messages)

        return {
            "response": response,
            "messages": messages,
            "history": self._history,
        }

    def _build_system_prompt(self) -> str:
        """构建系统提示."""
        if self.prompt_config.system:
            return self.prompt_config.system
        return "你是一个有帮助的AI助手。请直接回答用户的问题。"

    def clear_history(self):
        """清空对话历史."""
        self._history = []

    def get_history(self) -> list[dict]:
        """获取当前对话历史."""
        return list(self._history)

    def set_history(self, history: list[dict]):
        """设置对话历史（用于恢复会话）."""
        self._history = list(history)
