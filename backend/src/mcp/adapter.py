"""MCP Tool adapter - maps MCP tools to Agent callable tools."""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.src.mcp.client import MCPClientManager


class MCPToolAdapter:
    """将 MCP Tool 适配为 Agent 可调用的工具格式。

    负责：
    1. 将 MCP Tool 转换为 Agent 工具定义格式
    2. 执行 MCP 工具调用并转换返回结果
    """

    def __init__(self, mcp_client_manager: "MCPClientManager"):
        self.mcp_manager = mcp_client_manager

    def to_agent_tool(self, tool: Any) -> dict[str, Any]:
        """将 MCP Tool 转换为 Agent 工具格式。

        Args:
            tool: MCP Tool 对象，应包含 name, description, inputSchema 属性

        Returns:
            Agent 工具定义字典
        """
        return {
            "name": tool.name,
            "description": getattr(tool, "description", ""),
            "input_schema": getattr(tool, "inputSchema", {}),
            "server_id": getattr(tool, "server_id", ""),
        }

    def to_agent_tool_from_dict(self, tool_info: dict[str, Any]) -> dict[str, Any]:
        """从字典直接转换（无需 MCP Tool 对象）。"""
        return {
            "name": tool_info.get("name", ""),
            "description": tool_info.get("description", ""),
            "input_schema": tool_info.get("inputSchema", tool_info.get("input_schema", {})),
            "server_id": tool_info.get("server_id", ""),
        }

    async def execute(self, tool_def: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
        """执行 MCP 工具。

        Args:
            tool_def: Agent 工具定义，应包含 server_id 和 name
            params: 工具参数字典

        Returns:
            工具执行结果

        Raises:
            ValueError: 如果 server_id 未指定或服务器未连接
        """
        server_id = tool_def.get("server_id")
        tool_name = tool_def.get("name")
        if not server_id:
            raise ValueError("tool_def must contain server_id")
        if not tool_name:
            raise ValueError("tool_def must contain name")
        return await self.mcp_manager.call_tool(server_id, tool_name, params)

    def get_tool_signature(self, tool_def: dict[str, Any]) -> str:
        """生成工具签名，用于工具注册和去重。"""
        server_id = tool_def.get("server_id", "")
        name = tool_def.get("name", "")
        return f"{server_id}:{name}" if server_id else name
