"""Unit tests for LongTermMemory."""

import tempfile
import os
import pytest
from backend.src.memory.long_term import LongTermMemory


@pytest.fixture
def memory():
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    m = LongTermMemory(db_path=db_path)
    yield m
    os.unlink(db_path)


class TestLongTermMemory:
    def test_init_creates_db(self, memory):
        assert memory.db_path.exists()

    def test_store_and_retrieve(self, memory):
        memory.store("user_name", "Alice", importance=3)
        value = memory.retrieve("user_name")
        assert value == "Alice"

    def test_retrieve_nonexistent(self, memory):
        value = memory.retrieve("nonexistent_key")
        assert value is None

    def test_store_updates_existing(self, memory):
        memory.store("key1", "value1")
        memory.store("key1", "value2")
        assert memory.retrieve("key1") == "value2"

    def test_search(self, memory):
        memory.store("fav_lang", "Python is great", importance=5)
        memory.store("fav_color", "Blue is nice", importance=2)
        memory.store("fav_food", "Pizza with cheese", importance=3)

        results = memory.search("Python")
        assert len(results) == 1
        assert results[0]["key"] == "fav_lang"
        assert results[0]["importance"] == 5

        results = memory.search("is")
        # "Python is great" and "Blue is nice" contain "is", "Pizza with cheese" does not
        assert len(results) == 2

    def test_search_no_match(self, memory):
        memory.store("key", "value")
        results = memory.search("nonexistent_keyword")
        assert results == []

    def test_delete(self, memory):
        memory.store("key1", "value1")
        memory.store("key2", "value2")
        result = memory.delete("key1")
        assert result is True
        assert memory.retrieve("key1") is None
        assert memory.retrieve("key2") == "value2"

    def test_delete_nonexistent(self, memory):
        result = memory.delete("nonexistent")
        assert result is False

    def test_get_all(self, memory):
        memory.store("k1", "v1", importance=1)
        memory.store("k2", "v2", importance=5)
        memory.store("k3", "v3", importance=3)
        all_mem = memory.get_all()
        assert len(all_mem) == 3
        # 按 importance 降序排列
        assert all_mem[0]["importance"] >= all_mem[1]["importance"]

    def test_get_high_importance(self, memory):
        memory.store("low", "low priority", importance=1)
        memory.store("mid", "mid priority", importance=5)
        memory.store("high", "high priority", importance=9)
        results = memory.get_high_importance(min_importance=5)
        assert len(results) == 2
        assert all(r["importance"] >= 5 for r in results)

    def test_count(self, memory):
        assert memory.count() == 0
        memory.store("k1", "v1")
        memory.store("k2", "v2")
        assert memory.count() == 2
        memory.delete("k1")
        assert memory.count() == 1
