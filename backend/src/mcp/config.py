"""MCP Server configuration management for AI Agent Harness."""

from __future__ import annotations

import json
import os
import base64
from pathlib import Path
from typing import Optional


class MCPServerConfig:
    """MCP Server 配置。

    注意：auth_token 存储在内存中，不序列化到磁盘。
    如需持久化存储 auth_token，应使用加密方案（如 keyring）。
    """

    def __init__(
        self,
        server_id: str,
        name: str,
        endpoint: str,
        auth_token: Optional[str] = None,
    ):
        self.server_id = server_id
        self.name = name
        self.endpoint = endpoint
        self.auth_token = auth_token  # 内存持有，不写入文件

    def __repr__(self) -> str:
        return f"MCPServerConfig(server_id={self.server_id!r}, name={self.name!r}, endpoint={self.endpoint!r})"


class MCPServerConfigStore:
    """MCP Server 配置存储（JSON 文件）。

    仅保存 server_id、name、endpoint，不保存 auth_token。
    auth_token 通过环境变量或加密存储获取。
    """

    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_path = os.environ.get(
                "MCP_SERVERS_CONFIG_PATH",
                str(Path(__file__).parent.parent.parent.parent.parent / "data" / "mcp_servers.json"),
            )
        self.config_path = Path(config_path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

    def list_servers(self) -> list[MCPServerConfig]:
        """列出所有已配置的 MCP Server。"""
        if not self.config_path.exists():
            return []
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [MCPServerConfig(**s) for s in data]
        except (json.JSONDecodeError, TypeError):
            return []

    def add_server(self, server: MCPServerConfig) -> None:
        """添加一个新的 MCP Server 配置。"""
        servers = self.list_servers()
        # 避免重复 server_id
        if any(s.server_id == server.server_id for s in servers):
            raise ValueError(f"Server with id {server.server_id} already exists")
        servers.append(server)
        self._save(servers)

    def update_server(
        self,
        server_id: str,
        name: Optional[str] = None,
        endpoint: Optional[str] = None,
        auth_token: Optional[str] = None,
    ) -> None:
        """更新已有的 MCP Server 配置。"""
        servers = self.list_servers()
        for s in servers:
            if s.server_id == server_id:
                if name is not None:
                    s.name = name
                if endpoint is not None:
                    s.endpoint = endpoint
                if auth_token is not None:
                    s.auth_token = auth_token
                break
        else:
            raise ValueError(f"Server with id {server_id} not found")
        self._save(servers)

    def remove_server(self, server_id: str) -> bool:
        """删除指定的 MCP Server 配置。

        Returns:
            是否删除成功
        """
        servers = [s for s in self.list_servers() if s.server_id != server_id]
        if len(servers) == len(self.list_servers()):
            return False
        self._save(servers)
        return True

    def get_server(self, server_id: str) -> Optional[MCPServerConfig]:
        """根据 ID 获取单个 Server 配置。"""
        for s in self.list_servers():
            if s.server_id == server_id:
                return s
        return None

    def _save(self, servers: list[MCPServerConfig]) -> None:
        """将配置写入文件（不含 auth_token）。"""
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(
                [
                    {
                        "server_id": s.server_id,
                        "name": s.name,
                        "endpoint": s.endpoint,
                    }
                    for s in servers
                ],
                f,
                indent=2,
                ensure_ascii=False,
            )
