"""Response generator with streaming support."""
import asyncio
from typing import AsyncGenerator


class ResponseGenerator:
    """Generates formatted responses with optional streaming output."""

    def __init__(self, streaming: bool = True):
        """
        Args:
            streaming: Whether to stream response characters one-by-one.
        """
        self.streaming = streaming

    async def generate(self, content: str) -> AsyncGenerator[str, None]:
        """
        Generate response with streaming support.

        Args:
            content: The full response content.

        Yields:
            Character-by-character chunks when streaming is enabled.
        """
        if self.streaming:
            for char in content:
                yield char
                await asyncio.sleep(0.01)
        else:
            yield content

    def format_response(self, result: dict, intent: str) -> str:
        """
        Format a structured result into a user-facing response string.

        Args:
            result: The result dict from agent execution.
            intent: The classified user intent.

        Returns:
            A formatted human-readable response string.
        """
        if intent == "greeting":
            return "你好！我是 AI Agent，有什么可以帮助你的吗？"
        elif intent == "query":
            return f"查询结果：{result.get('data', '无数据')}"
        elif intent == "action":
            return f"执行完成，结果：{result.get('result', '成功')}"
        else:
            return f"收到你的消息：{result.get('input', '')}"
