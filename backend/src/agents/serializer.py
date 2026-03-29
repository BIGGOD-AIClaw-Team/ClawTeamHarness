"""Graph serialization and deserialization for AgentEngine."""
from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .engine import AgentEngine

logger = logging.getLogger(__name__)


class GraphSerializer:
    """
    Serializes AgentEngine graph to JSON and deserializes back.
    
    Supports:
    - Full graph_def serialization
    - Node and edge export
    - File-based save/load
    """

    @staticmethod
    def serialize(engine: "AgentEngine") -> dict:
        """
        Serialize an AgentEngine instance to a dict.
        
        Args:
            engine: AgentEngine instance to serialize
            
        Returns:
            Serialized graph as a dict
        """
        return {
            "version": "1.0",
            "graph_def": engine.graph_def,
            "nodes": engine.get_nodes(),
            "edges": engine.get_edges(),
        }

    @staticmethod
    def deserialize(data: dict) -> "AgentEngine":
        """
        Deserialize a dict into an AgentEngine instance.
        
        Args:
            data: Serialized graph dict
            
        Returns:
            New AgentEngine instance
        """
        from .engine import AgentEngine
        
        graph_def = data.get("graph_def", data)
        return AgentEngine(graph_def=graph_def)

    def to_json(self, engine: "AgentEngine", path: str) -> None:
        """
        Serialize engine and write to a JSON file.
        
        Args:
            engine: AgentEngine to serialize
            path: Output file path
        """
        serialized = self.serialize(engine)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(serialized, f, indent=2, ensure_ascii=False)
        logger.info(f"Graph serialized to {path}")

    @classmethod
    def from_json(cls, path: str) -> "AgentEngine":
        """
        Load an AgentEngine from a JSON file.
        
        Args:
            path: Input file path
            
        Returns:
            Deserialized AgentEngine instance
        """
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        logger.info(f"Graph loaded from {path}")
        return cls.deserialize(data)

    @staticmethod
    def validate_graph_data(data: dict) -> list[str]:
        """
        Validate serialized graph data.
        
        Args:
            data: Graph data dict
            
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        graph_def = data.get("graph_def", data)
        nodes = data.get("nodes", graph_def.get("nodes", []))
        edges = data.get("edges", graph_def.get("edges", []))
        
        if not nodes:
            errors.append("No nodes found in graph")
            return errors
        
        node_ids = {n["id"] for n in nodes if "id" in n}
        
        # Validate edges reference valid nodes
        for i, edge in enumerate(edges):
            if "source" not in edge:
                errors.append(f"Edge {i}: missing 'source'")
            elif edge["source"] not in node_ids:
                errors.append(f"Edge {i}: source node '{edge['source']}' not found")
            
            if "target" not in edge:
                errors.append(f"Edge {i}: missing 'target'")
            elif edge["target"] not in node_ids:
                errors.append(f"Edge {i}: target node '{edge['target']}' not found")
        
        return errors
