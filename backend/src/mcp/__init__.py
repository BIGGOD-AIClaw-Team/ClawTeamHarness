"""MCP module - MCP Client SDK integration.

Public exports:
- MCPClientManager: 管理多个 MCP Server 连接
- MCPServerConfig: 单个 MCP Server 配置
- MCPServerConfigStore: MCP Server 配置存储
- MCPToolAdapter: MCP Tool 到 Agent Tool 的适配器
"""

from backend.src.mcp.client import MCPClientManager
from backend.src.mcp.config import MCPServerConfig, MCPServerConfigStore
from backend.src.mcp.adapter import MCPToolAdapter

__all__ = [
    "MCPClientManager",
    "MCPServerConfig",
    "MCPServerConfigStore",
    "MCPToolAdapter",
]
