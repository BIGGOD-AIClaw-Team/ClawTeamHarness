import pytest
import sys
import os
from pathlib import Path

# Add backend/src to path
backend_src = Path(__file__).parent.parent / "backend" / "src"
sys.path.insert(0, str(backend_src))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


class TestRootEndpoints:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()

    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestAgentAPI:
    def test_list_agents(self):
        response = client.get("/api/agents/")
        assert response.status_code == 200
        assert "agents" in response.json()

    def test_create_agent(self):
        payload = {
            "name": "test_agent",
            "description": "Test agent for unit testing",
            "graph_def": {"nodes": [], "edges": []},
        }
        response = client.post("/api/agents/", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "created"

    def test_get_agent(self):
        # First create an agent
        payload = {"name": "get_test_agent", "description": "test", "graph_def": {}}
        client.post("/api/agents/", json=payload)
        
        response = client.get("/api/agents/get_test_agent")
        assert response.status_code == 200
        data = response.json()
        assert data["agent_id"] == "get_test_agent"

    def test_get_nonexistent_agent(self):
        response = client.get("/api/agents/nonexistent")
        assert response.status_code == 404

    def test_delete_agent(self):
        # First create an agent
        payload = {"name": "delete_test_agent", "description": "test", "graph_def": {}}
        client.post("/api/agents/", json=payload)
        
        response = client.delete("/api/agents/delete_test_agent")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"

    def test_create_duplicate_agent(self):
        payload = {"name": "duplicate_agent", "description": "test", "graph_def": {}}
        client.post("/api/agents/", json=payload)
        response = client.post("/api/agents/", json=payload)
        assert response.status_code == 400


class TestSkillsAPI:
    def test_list_skills(self):
        response = client.get("/api/skills/")
        assert response.status_code == 200
        assert "skills" in response.json()

    def test_get_skill(self):
        response = client.get("/api/skills/calculator")
        assert response.status_code == 200
        assert response.json()["name"] == "calculator"

    def test_get_nonexistent_skill(self):
        response = client.get("/api/skills/nonexistent_skill")
        assert response.status_code == 404

    def test_enable_skill(self):
        response = client.post("/api/skills/calculator/enable")
        assert response.status_code == 200
        assert response.json()["enabled"] is True

    def test_disable_skill(self):
        response = client.post("/api/skills/calculator/disable")
        assert response.status_code == 200
        assert response.json()["enabled"] is False


class TestMemoryAPI:
    def test_add_memory(self):
        payload = {
            "content": "Test memory content",
            "memory_type": "short_term",
            "metadata": {"source": "test"},
        }
        response = client.post("/api/memory/", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "added"

    def test_get_memory(self):
        response = client.get("/api/memory/?memory_type=short_term")
        assert response.status_code == 200
        assert "memories" in response.json()

    def test_get_memory_invalid_type(self):
        response = client.get("/api/memory/?memory_type=invalid")
        assert response.status_code == 400

    def test_clear_memory(self):
        response = client.delete("/api/memory/?memory_type=short_term")
        assert response.status_code == 200
        assert response.json()["status"] == "cleared"

    def test_clear_invalid_memory_type(self):
        response = client.delete("/api/memory/?memory_type=invalid")
        assert response.status_code == 400
