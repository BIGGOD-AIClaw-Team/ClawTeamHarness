"""Short-term memory module - sliding window implementation."""

from __future__ import annotations

from collections import deque
from typing import Any, Optional


class ShortTermMemory:
    """短期记忆 - 基于 deque 的滑动窗口实现。

    用于维护最近 N 条对话消息，超过限制时自动遗忘最老的。
    线程安全（deque 本身是线程安全的）。

    Example:
        >>> memory = ShortTermMemory(max_messages=10)
        >>> memory.add("user", "Hello")
        >>> memory.add("assistant", "Hi there!")
        >>> len(memory)
        2
        >>> memory.get_recent(1)
        [{'role': 'assistant', 'content': 'Hi there!'}]
    """

    def __init__(self, max_messages: int = 100):
        """初始化短期记忆。

        Args:
            max_messages: 最大保存消息数，默认 100
        """
        if max_messages <= 0:
            raise ValueError("max_messages must be positive")
        self.max_messages = max_messages
        self.messages: deque[dict[str, Any]] = deque(maxlen=max_messages)

    def add(self, role: str, content: str, metadata: Optional[dict[str, Any]] = None) -> None:
        """添加一条消息到记忆。

        Args:
            role: 消息角色（如 "user", "assistant", "system"）
            content: 消息内容
            metadata: 可选的元数据（如时间戳、来源等）
        """
        self.messages.append({
            "role": role,
            "content": content,
            "metadata": metadata or {},
        })

    def get_all(self) -> list[dict[str, Any]]:
        """获取所有记忆消息。"""
        return list(self.messages)

    def get_recent(self, n: int) -> list[dict[str, Any]]:
        """获取最近 N 条消息。

        Args:
            n: 要获取的消息数量

        Returns:
            最近 N 条消息的列表（不足时返回全部）
        """
        return list(self.messages)[-n:]

    def clear(self) -> None:
        """清空所有记忆。"""
        self.messages.clear()

    def __len__(self) -> int:
        """返回当前记忆的消息数量。"""
        return len(self.messages)

    def is_full(self) -> bool:
        """检查记忆是否已满（达到最大容量）。"""
        return len(self.messages) >= self.max_messages

    def get_stats(self) -> dict[str, Any]:
        """获取记忆统计信息。"""
        return {
            "count": len(self.messages),
            "max_messages": self.max_messages,
            "is_full": self.is_full(),
            "roles": list(set(m["role"] for m in self.messages)),
        }
