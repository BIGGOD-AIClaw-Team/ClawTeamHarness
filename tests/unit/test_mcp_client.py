"""Unit tests for MCP Client Manager."""

import pytest
from backend.src.mcp.client import MCPClientManager, _MockMCPClient


class TestMCPClientManager:
    def test_init(self):
        manager = MCPClientManager()
        assert manager.clients == {}
        assert manager.get_connected_servers() == []

    def test_is_connected_false(self):
        manager = MCPClientManager()
        assert manager.is_connected("test-server") is False

    @pytest.mark.asyncio
    async def test_connect_and_disconnect(self):
        manager = MCPClientManager()
        result = await manager.connect(
            server_id="test-server",
            endpoint="http://localhost:8080/mcp",
            api_key="test-key",
        )
        assert result is True
        assert manager.is_connected("test-server")
        assert "test-server" in manager.get_connected_servers()

        await manager.disconnect("test-server")
        assert manager.is_connected("test-server") is False
        assert manager.get_connected_servers() == []

    @pytest.mark.asyncio
    async def test_connect_uses_env_key(self, monkeypatch):
        manager = MCPClientManager()
        monkeypatch.setenv("MCP_API_KEY", "env-api-key")
        result = await manager.connect(
            server_id="test-server",
            endpoint="http://localhost:8080/mcp",
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_list_tools_not_connected(self):
        manager = MCPClientManager()
        tools = await manager.list_tools("nonexistent-server")
        assert tools == []

    @pytest.mark.asyncio
    async def test_call_tool_not_connected(self):
        manager = MCPClientManager()
        with pytest.raises(ValueError, match="not connected"):
            await manager.call_tool("nonexistent-server", "some_tool", {})


class TestMockMCPClient:
    @pytest.mark.asyncio
    async def test_mock_connect_and_close(self):
        client = _MockMCPClient(endpoint="http://test", api_key="key")
        assert client._connected is False
        await client.connect()
        assert client._connected is True
        await client.close()
        assert client._connected is False

    @pytest.mark.asyncio
    async def test_mock_list_tools(self):
        client = _MockMCPClient(endpoint="http://test", api_key="key")
        await client.connect()
        tools = await client.list_tools()
        assert tools == []

    @pytest.mark.asyncio
    async def test_mock_call_tool(self):
        client = _MockMCPClient(endpoint="http://test", api_key="key")
        await client.connect()
        result = await client.call_tool("search", {"query": "test"})
        assert result["success"] is True
        assert result["tool"] == "search"
        assert result["params"] == {"query": "test"}
