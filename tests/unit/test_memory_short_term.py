"""Unit tests for ShortTermMemory."""

import pytest
from backend.src.memory.short_term import ShortTermMemory


class TestShortTermMemory:
    def test_init_default(self):
        memory = ShortTermMemory()
        assert memory.max_messages == 100
        assert len(memory) == 0

    def test_init_custom_max(self):
        memory = ShortTermMemory(max_messages=10)
        assert memory.max_messages == 10

    def test_init_invalid_max(self):
        with pytest.raises(ValueError, match="positive"):
            ShortTermMemory(max_messages=0)
        with pytest.raises(ValueError, match="positive"):
            ShortTermMemory(max_messages=-1)

    def test_add_single_message(self):
        memory = ShortTermMemory(max_messages=10)
        memory.add("user", "Hello")
        assert len(memory) == 1

    def test_add_with_metadata(self):
        memory = ShortTermMemory()
        memory.add("user", "Hello", metadata={"source": "web"})
        result = memory.get_all()
        assert result[0]["metadata"] == {"source": "web"}

    def test_get_all(self):
        memory = ShortTermMemory(max_messages=5)
        memory.add("user", "Hello")
        memory.add("assistant", "Hi there")
        all_msgs = memory.get_all()
        assert len(all_msgs) == 2
        assert all_msgs[0]["role"] == "user"
        assert all_msgs[1]["role"] == "assistant"

    def test_get_recent(self):
        memory = ShortTermMemory(max_messages=10)
        for i in range(5):
            memory.add("user", f"Message {i}")
        recent = memory.get_recent(2)
        assert len(recent) == 2
        assert recent[0]["content"] == "Message 3"
        assert recent[1]["content"] == "Message 4"

    def test_get_recent_exceeds_count(self):
        memory = ShortTermMemory(max_messages=10)
        memory.add("user", "Only one")
        recent = memory.get_recent(100)
        assert len(recent) == 1

    def test_sliding_window_eviction(self):
        memory = ShortTermMemory(max_messages=3)
        for i in range(5):
            memory.add("user", f"Message {i}")
        assert len(memory) == 3
        all_msgs = memory.get_all()
        assert all_msgs[0]["content"] == "Message 2"
        assert all_msgs[2]["content"] == "Message 4"

    def test_clear(self):
        memory = ShortTermMemory()
        memory.add("user", "Hello")
        memory.add("assistant", "Hi")
        memory.clear()
        assert len(memory) == 0
        assert memory.get_all() == []

    def test_is_full(self):
        memory = ShortTermMemory(max_messages=2)
        assert memory.is_full() is False
        memory.add("user", "Hello")
        memory.add("assistant", "Hi")
        assert memory.is_full() is True
        memory.add("user", "Again")  # 触发驱逐
        assert memory.is_full() is True  # 仍为 max_messages

    def test_get_stats(self):
        memory = ShortTermMemory(max_messages=10)
        memory.add("user", "Hello")
        memory.add("assistant", "Hi")
        memory.add("system", "Context")
        stats = memory.get_stats()
        assert stats["count"] == 3
        assert stats["max_messages"] == 10
        assert stats["is_full"] is False
        assert set(stats["roles"]) == {"user", "assistant", "system"}
