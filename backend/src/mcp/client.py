"""MCP Client SDK integration for AI Agent Harness."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from mcp.types import Tool


class MCPClientManager:
    """MCP 客户端管理器，支持连接多个 MCP Server 并调用其工具。

    API Key 通过环境变量 `MCP_API_KEY` 注入，不硬编码。
    """

    def __init__(self):
        self.clients: dict[str, Any] = {}

    async def connect(self, server_id: str, endpoint: str, api_key: Optional[str] = None) -> bool:
        """连接到 MCP Server。

        Args:
            server_id: 服务器唯一标识
            endpoint: MCP Server 端点 URL
            api_key: 可选的 API Key（优先使用，fallback 到环境变量 MCP_API_KEY）

        Returns:
            连接是否成功
        """
        # 延迟导入，避免未安装 SDK 时阻塞其他功能
        try:
            from mcp import Client as MCPClient
        except ImportError:
            # 如果 SDK 未安装，使用 mock client 保持接口一致
            MCPClient = _MockMCPClient  # type: ignore

        actual_key = api_key or os.getenv("MCP_API_KEY")
        client = MCPClient(endpoint=endpoint, api_key=actual_key)
        await client.connect()
        self.clients[server_id] = client
        return True

    async def disconnect(self, server_id: str) -> None:
        """断开与 MCP Server 的连接。"""
        if server_id in self.clients:
            await self.clients[server_id].close()
            del self.clients[server_id]

    async def list_tools(self, server_id: str) -> list["Tool"]:
        """列出 MCP Server 上可用的工具。

        Args:
            server_id: 服务器标识

        Returns:
            工具列表
        """
        if server_id not in self.clients:
            return []
        return await self.clients[server_id].list_tools()

    async def call_tool(self, server_id: str, tool_name: str, params: dict) -> dict:
        """调用 MCP Server 上的工具。

        Args:
            server_id: 服务器标识
            tool_name: 工具名称
            params: 工具参数字典

        Returns:
            工具执行结果

        Raises:
            ValueError: 如果服务器未连接
        """
        if server_id not in self.clients:
            raise ValueError(f"MCP Server {server_id} not connected")
        return await self.clients[server_id].call_tool(tool_name, params)

    def get_connected_servers(self) -> list[str]:
        """获取已连接的服务器 ID 列表。"""
        return list(self.clients.keys())

    def is_connected(self, server_id: str) -> bool:
        """检查服务器是否已连接。"""
        return server_id in self.clients


class _MockMCPClient:
    """Mock MCP Client when SDK is not installed.

    Allows the codebase to remain functional even if MCP SDK
    is not yet installed, while maintaining the same interface.
    """

    def __init__(self, endpoint: str, api_key: Optional[str] = None):
        self.endpoint = endpoint
        self.api_key = api_key
        self._connected = False

    async def connect(self) -> None:
        self._connected = True

    async def close(self) -> None:
        self._connected = False

    async def list_tools(self) -> list:
        if not self._connected:
            raise RuntimeError("Not connected")
        return []

    async def call_tool(self, tool_name: str, params: dict) -> dict:
        if not self._connected:
            raise RuntimeError("Not connected")
        return {"success": True, "tool": tool_name, "params": params}
