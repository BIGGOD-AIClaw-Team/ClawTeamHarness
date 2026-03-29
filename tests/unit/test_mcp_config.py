"""Unit tests for MCP Server Config and ConfigStore."""

import json
import tempfile
import os
import pytest
from backend.src.mcp.config import MCPServerConfig, MCPServerConfigStore


@pytest.fixture
def temp_config_file():
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def config_store(temp_config_file):
    return MCPServerConfigStore(config_path=temp_config_file)


class TestMCPServerConfig:
    def test_init(self):
        config = MCPServerConfig(
            server_id="server-1",
            name="Test Server",
            endpoint="http://localhost:8080",
            auth_token="secret-token",
        )
        assert config.server_id == "server-1"
        assert config.name == "Test Server"
        assert config.endpoint == "http://localhost:8080"
        assert config.auth_token == "secret-token"

    def test_repr(self):
        config = MCPServerConfig(server_id="s1", name="My Server", endpoint="http://example.com")
        r = repr(config)
        assert "s1" in r
        assert "My Server" in r


class TestMCPServerConfigStore:
    def test_list_servers_empty(self, config_store):
        assert config_store.list_servers() == []

    def test_add_server(self, config_store):
        server = MCPServerConfig(
            server_id="server-1",
            name="Test Server",
            endpoint="http://localhost:8080",
            auth_token="token123",
        )
        config_store.add_server(server)
        servers = config_store.list_servers()
        assert len(servers) == 1
        assert servers[0].server_id == "server-1"
        assert servers[0].name == "Test Server"
        assert servers[0].endpoint == "http://localhost:8080"
        # auth_token 不应被持久化
        assert servers[0].auth_token is None

    def test_add_duplicate_server_raises(self, config_store):
        server = MCPServerConfig("s1", "Server 1", "http://example.com")
        config_store.add_server(server)
        with pytest.raises(ValueError, match="already exists"):
            config_store.add_server(MCPServerConfig("s1", "Server 1 Again", "http://example2.com"))

    def test_remove_server(self, config_store):
        config_store.add_server(MCPServerConfig("s1", "S1", "http://s1"))
        config_store.add_server(MCPServerConfig("s2", "S2", "http://s2"))
        result = config_store.remove_server("s1")
        assert result is True
        servers = config_store.list_servers()
        assert len(servers) == 1
        assert servers[0].server_id == "s2"

    def test_remove_nonexistent_returns_false(self, config_store):
        result = config_store.remove_server("nonexistent")
        assert result is False

    def test_get_server(self, config_store):
        config_store.add_server(MCPServerConfig("s1", "Server 1", "http://s1"))
        config_store.add_server(MCPServerConfig("s2", "Server 2", "http://s2"))
        server = config_store.get_server("s1")
        assert server is not None
        assert server.name == "Server 1"

    def test_get_nonexistent_server(self, config_store):
        assert config_store.get_server("nonexistent") is None

    def test_update_server(self, config_store):
        config_store.add_server(MCPServerConfig("s1", "Old Name", "http://old"))
        config_store.update_server("s1", name="New Name", endpoint="http://new")
        server = config_store.get_server("s1")
        assert server.name == "New Name"
        assert server.endpoint == "http://new"

    def test_update_nonexistent_raises(self, config_store):
        with pytest.raises(ValueError, match="not found"):
            config_store.update_server("nonexistent", name="Name")

    def test_json_persistence(self, temp_config_file):
        store = MCPServerConfigStore(config_path=temp_config_file)
        store.add_server(MCPServerConfig("s1", "Server 1", "http://s1"))
        store.add_server(MCPServerConfig("s2", "Server 2", "http://s2"))

        # 从文件验证
        with open(temp_config_file) as f:
            data = json.load(f)
        assert len(data) == 2
        assert all("auth_token" not in item for item in data)
