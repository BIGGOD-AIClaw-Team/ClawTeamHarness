import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend" / "src"))


@pytest.mark.asyncio
async def test_agent_creation_and_execution():
    """测试 Agent 创建和执行"""
    from agents.engine import AgentEngine
    from skills.protocol import BaseSkill, SkillRegistry

    # 创建简单 Agent
    engine = AgentEngine(graph_def={"nodes": [], "edges": []})
    assert engine is not None

    # 测试空图执行
    try:
        await engine.execute({"messages": [], "current_node": "", "context": {}, "result": {}})
    except RuntimeError as e:
        assert "no nodes" in str(e).lower()


@pytest.mark.asyncio
async def test_skills_registry():
    """测试 Skills 注册"""
    from skills.protocol import SkillRegistry, BaseSkill

    class TestSkill(BaseSkill):
        manifest: dict = {
            "name": "test_skill",
            "version": "1.0.0",
            "description": "Test skill",
            "dependencies": [],
            "author": "test",
        }

        async def execute(self, params: dict, context: dict) -> dict:
            return {"result": "test"}

    SkillRegistry.register(TestSkill)
    assert SkillRegistry.get("test_skill") == TestSkill
    assert SkillRegistry.list_skills()


@pytest.mark.asyncio
async def test_mcp_client_manager():
    """测试 MCP 客户端"""
    from mcp.client import MCPClientManager

    manager = MCPClientManager()
    assert manager.get_connected_servers() == []
    # Mock client should work without actual MCP server
    servers = manager.get_connected_servers()
    assert isinstance(servers, list)


def test_memory_systems():
    """测试记忆系统"""
    from memory.short_term import ShortTermMemory
    from memory.long_term import LongTermMemory
    import tempfile

    # 短期记忆
    stm = ShortTermMemory(max_messages=10)
    stm.add("user", "Hello")
    assert len(stm) == 1
    assert stm.get_recent(1)[0]["content"] == "Hello"

    # 长期记忆（使用临时文件）
    with tempfile.TemporaryDirectory() as tmpdir:
        ltm = LongTermMemory(db_path=f"{tmpdir}/test.db")
        ltm.store("test_key", "test_value")
        assert ltm.retrieve("test_key") == "test_value"
