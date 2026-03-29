"""Unit tests for MCP Tool Adapter."""

import pytest
from backend.src.mcp.adapter import MCPToolAdapter
from backend.src.mcp.client import MCPClientManager


class MockTool:
    """Mock MCP Tool object for testing."""


class TestMCPToolAdapter:
    def test_init(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)
        assert adapter.mcp_manager is manager

    def test_to_agent_tool(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool = MockTool()
        tool.name = "search"
        tool.description = "Search the web"
        tool.inputSchema = {"type": "object", "properties": {"query": {"type": "string"}}}
        tool.server_id = "web-server"

        result = adapter.to_agent_tool(tool)
        assert result["name"] == "search"
        assert result["description"] == "Search the web"
        assert result["input_schema"] == tool.inputSchema
        assert result["server_id"] == "web-server"

    def test_to_agent_tool_from_dict(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool_info = {
            "name": "calculator",
            "description": "Perform calculations",
            "inputSchema": {"type": "object"},
            "server_id": "calc-server",
        }
        result = adapter.to_agent_tool_from_dict(tool_info)
        assert result["name"] == "calculator"
        assert result["input_schema"] == {"type": "object"}

    def test_get_tool_signature(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool_def = {"server_id": "server-1", "name": "search"}
        sig = adapter.get_tool_signature(tool_def)
        assert sig == "server-1:search"

    def test_get_tool_signature_no_server(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool_def = {"name": "search"}
        sig = adapter.get_tool_signature(tool_def)
        assert sig == "search"

    @pytest.mark.asyncio
    async def test_execute_raises_missing_server_id(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool_def = {"name": "search"}  # no server_id
        with pytest.raises(ValueError, match="server_id"):
            await adapter.execute(tool_def, {})

    @pytest.mark.asyncio
    async def test_execute_raises_missing_name(self):
        manager = MCPClientManager()
        adapter = MCPToolAdapter(manager)

        tool_def = {"server_id": "s1"}  # no name
        with pytest.raises(ValueError, match="name"):
            await adapter.execute(tool_def, {})
