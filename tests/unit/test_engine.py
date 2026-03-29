"""Unit tests for AgentEngine."""
import pytest
from backend.src.agents.engine import AgentEngine, AgentState


@pytest.fixture
def simple_graph_def():
    """A minimal graph with start -> llm -> end."""
    return {
        "start": "start",
        "end": "end",
        "nodes": [
            {"id": "start", "type": "start", "config": {}},
            {"id": "llm", "type": "llm", "config": {"model": "gpt-4", "prompt": "Hello {name}"}},
            {"id": "end", "type": "end", "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "llm"},
            {"source": "llm", "target": "end"},
        ],
    }


@pytest.fixture
def conditional_graph_def():
    """Graph with a condition node."""
    return {
        "start": "start",
        "end": "end",
        "nodes": [
            {"id": "start", "type": "start", "config": {}},
            {"id": "condition", "type": "condition", "config": {"condition": "context['action'] == 'search'"}},
            {"id": "search", "type": "tool", "config": {"tool_name": "search"}},
            {"id": "default", "type": "llm", "config": {"model": "gpt-4", "prompt": "Default"}},
            {"id": "end", "type": "end", "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "condition"},
            {"source": "condition", "target": "search", "condition": "true"},
            {"source": "condition", "target": "default", "condition": "false"},
            {"source": "search", "target": "end"},
            {"source": "default", "target": "end"},
        ],
    }


class TestAgentEngine:
    def test_init_from_graph_def(self, simple_graph_def):
        engine = AgentEngine(simple_graph_def)
        assert engine.graph_def == simple_graph_def
        assert engine.graph is not None

    def test_get_nodes(self, simple_graph_def):
        engine = AgentEngine(simple_graph_def)
        nodes = engine.get_nodes()
        assert len(nodes) == 3
        node_ids = {n["id"] for n in nodes}
        assert node_ids == {"start", "llm", "end"}

    def test_get_edges(self, simple_graph_def):
        engine = AgentEngine(simple_graph_def)
        edges = engine.get_edges()
        assert len(edges) == 2
        sources = {e["source"] for e in edges}
        targets = {e["target"] for e in edges}
        assert "start" in sources
        assert "end" in targets

    def test_validate_graph_valid(self, simple_graph_def):
        engine = AgentEngine(simple_graph_def)
        errors = engine.validate_graph()
        assert errors == []

    def test_validate_graph_missing_start(self):
        # When start is specified but not found in nodes, error should be reported
        engine = AgentEngine({
            "start": "nonexistent",
            "end": "end",
            "nodes": [
                {"id": "a", "type": "llm", "config": {}},
                {"id": "end", "type": "end", "config": {}},
            ],
            "edges": [{"source": "a", "target": "end"}],
        })
        errors = engine.validate_graph()
        assert any("Start node" in e and "nonexistent" in e for e in errors)

    def test_validate_graph_missing_edge_target(self):
        engine = AgentEngine({
            "start": "start", "end": "end",
            "nodes": [
                {"id": "start", "type": "start", "config": {}},
                {"id": "end", "type": "end", "config": {}},
            ],
            "edges": [{"source": "start", "target": "nonexistent"}],
        })
        errors = engine.validate_graph()
        assert any("nonexistent" in e for e in errors)


@pytest.mark.asyncio
class TestAgentEngineExecution:
    async def test_execute_simple_graph(self, simple_graph_def):
        engine = AgentEngine(simple_graph_def)
        initial_state: AgentState = {
            "messages": [{"role": "user", "content": "Hello"}],
            "current_node": "",
            "context": {"name": "World"},
            "result": {},
            "error": None,
        }
        final_state = await engine.execute(initial_state, thread_id="test-1")
        assert final_state is not None

    async def test_execute_empty_graph(self):
        """Graph with no nodes should be createable and validate correctly."""
        engine = AgentEngine({"nodes": [], "edges": []})
        assert engine.graph is None
        errors = engine.validate_graph()
        assert "Graph has no nodes" in errors[0]
