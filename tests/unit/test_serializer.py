"""Unit tests for GraphSerializer."""
import json
import tempfile
import os
import pytest
from backend.src.agents.serializer import GraphSerializer
from backend.src.agents.engine import AgentEngine


@pytest.fixture
def sample_engine():
    graph_def = {
        "start": "start",
        "end": "end",
        "nodes": [
            {"id": "start", "type": "start", "config": {}},
            {"id": "llm", "type": "llm", "config": {"model": "gpt-4", "prompt": "Hi"}},
            {"id": "end", "type": "end", "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "llm"},
            {"source": "llm", "target": "end"},
        ],
    }
    return AgentEngine(graph_def)


class TestGraphSerializer:
    def test_serialize(self, sample_engine):
        data = GraphSerializer.serialize(sample_engine)
        assert "graph_def" in data
        assert "nodes" in data
        assert "edges" in data
        assert data["version"] == "1.0"
        assert len(data["nodes"]) == 3
        assert len(data["edges"]) == 2

    def test_deserialize(self, sample_engine):
        data = GraphSerializer.serialize(sample_engine)
        restored = GraphSerializer.deserialize(data)
        assert restored.graph_def == sample_engine.graph_def
        assert len(restored.get_nodes()) == 3

    def test_roundtrip(self, sample_engine):
        data = GraphSerializer.serialize(sample_engine)
        restored = GraphSerializer.deserialize(data)
        assert restored.graph_def == sample_engine.graph_def

    def test_to_json_and_back(self, sample_engine):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = f.name
        
        try:
            serializer = GraphSerializer()
            serializer.to_json(sample_engine, path)
            
            restored = GraphSerializer.from_json(path)
            assert restored.graph_def == sample_engine.graph_def
            
            # Verify file contents
            with open(path) as f:
                contents = json.load(f)
            assert "nodes" in contents
            assert len(contents["nodes"]) == 3
        finally:
            os.unlink(path)


class TestValidateGraphData:
    def test_valid_data(self, sample_engine):
        data = GraphSerializer.serialize(sample_engine)
        errors = GraphSerializer.validate_graph_data(data)
        assert errors == []

    def test_missing_nodes(self):
        data = {"graph_def": {}}
        errors = GraphSerializer.validate_graph_data(data)
        assert any("No nodes" in e for e in errors)

    def test_invalid_edge_reference(self):
        data = {
            "nodes": [{"id": "a", "type": "start", "config": {}}],
            "edges": [{"source": "a", "target": "nonexistent"}],
        }
        errors = GraphSerializer.validate_graph_data(data)
        assert any("nonexistent" in e for e in errors)
