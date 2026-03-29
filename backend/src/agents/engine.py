"""Agent Engine - LangGraph-based Agent orchestration."""
from __future__ import annotations

import asyncio
import logging
import operator
from dataclasses import dataclass, field
from typing import Any, TypedDict, Annotated, Optional

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)


@dataclass
class CancellationToken:
    """
    Token to signal cancellation of an ongoing execution.

    Thread-safe for use across tasks/threads.
    """
    _cancelled: bool = field(default=False)

    def cancel(self):
        """Request cancellation of the execution."""
        self._cancelled = True

    def is_cancelled(self) -> bool:
        """Return True if cancellation has been requested."""
        return self._cancelled

    def check(self):
        """Raise CancelledError if cancellation was requested."""
        if self._cancelled:
            raise asyncio.CancelledError("Execution cancelled")


class AgentState(TypedDict, total=False):
    """Agent execution state passed through the graph."""
    messages: Annotated[list, operator.add]   # conversation messages (appended)
    current_node: str                           # currently executing node name
    context: dict                               # shared context between nodes
    result: dict                                # final execution result
    error: Optional[str]                        # error message if any


class AgentEngine:
    """
    LangGraph-based Agent orchestration engine.
    
    Loads a graph definition (nodes + edges) and executes
    the graph from a start node to an end node.
    """

    def __init__(self, graph_def: dict):
        """
        Initialize the Agent engine.
        
        Args:
            graph_def: Graph definition dict with keys:
                - nodes: list of node dicts with id, type, config
                - edges: list of edge dicts with source, target, condition
                - start: str, name of the start node id
                - end: str, name of the end node id
        """
        self.graph_def = graph_def
        self._nodes: dict[str, dict] = {}
        self._edges: list[dict] = []
        self._node_instances: dict[str, Any] = {}
        self.graph: StateGraph | None = self._build_graph()

    def _build_graph(self) -> StateGraph | None:
        """Build the LangGraph StateGraph from graph_def."""
        nodes_def = self.graph_def.get("nodes", [])
        edges_def = self.graph_def.get("edges", [])
        
        # Return None if no nodes - graph can't be built
        if not nodes_def:
            return None
        
        workflow = StateGraph(AgentState)
        self._edges = list(edges_def)
        
        # Register nodes
        for node_def in nodes_def:
            node_id = node_def["id"]
            node_type = node_def.get("type", "llm")
            config = node_def.get("config", {})
            self._nodes[node_id] = {"type": node_type, "config": config}
            
            # Create node function and add to graph
            workflow.add_node(node_id, self._make_node_fn(node_id))
        
        # Register edges
        for edge in edges_def:
            source = edge["source"]
            target = edge["target"]
            condition = edge.get("condition")
            
            if condition:
                # Conditional edge
                workflow.add_conditional_edges(
                    source,
                    self._make_condition_fn(condition),
                    {edge["branch_name"]: target for edge in edges_def if edge["source"] == source}
                )
            else:
                # Only add edge if both endpoints exist
                if source in self._nodes and target in self._nodes:
                    workflow.add_edge(source, target)
        
        # Set entry and finish
        start = self.graph_def.get("start")
        end = self.graph_def.get("end")
        
        if start in self._nodes:
            workflow.set_entry_point(start)
        elif self._nodes:
            # Fallback: use first node as entry point if start not specified or not found
            first_node_id = list(self._nodes.keys())[0]
            workflow.set_entry_point(first_node_id)
        
        if end in self._nodes:
            workflow.add_edge(end, END)
        
        # Compile with memory checkpoint
        checkpointer = MemorySaver()
        return workflow.compile(checkpointer=checkpointer)

    def _make_node_fn(self, node_id: str):
        """Create a node function for the given node id."""
        async def node_fn(state: AgentState) -> dict:
            node_def = self._nodes.get(node_id)
            if not node_def:
                logger.warning(f"Node {node_id} not found in graph")
                return {}
            
            node_type = node_def["type"]
            config = node_def["config"]
            
            try:
                result = await self._execute_node(node_id, node_type, config, state)
                return {
                    "current_node": node_id,
                    "context": {**state.get("context", {}), f"{node_id}_result": result},
                    "result": result,
                }
            except Exception as e:
                logger.exception(f"Error executing node {node_id}")
                return {
                    "current_node": node_id,
                    "error": str(e),
                }
        
        return node_fn

    async def _execute_node(self, node_id: str, node_type: str, config: dict, state: AgentState) -> Any:
        """Execute a single node based on its type."""
        from .nodes import LLMNode, ToolNode, ConditionNode
        
        if node_type == "llm":
            node = LLMNode(
                model=config.get("model", "gpt-4"),
                prompt_template=config.get("prompt", ""),
                temperature=config.get("temperature", 0.7),
                max_tokens=config.get("max_tokens", 2048),
                top_p=config.get("top_p", 1.0),
            )
            return await node.execute(state)
        elif node_type == "tool":
            node = ToolNode(tool_name=config.get("tool_name", ""), tool_params=config.get("tool_params", {}))
            return await node.execute(state)
        elif node_type == "condition":
            node = ConditionNode(condition=config.get("condition", ""))
            return await node.execute(state)
        elif node_type == "start":
            return {"status": "started"}
        elif node_type == "end":
            return {"status": "finished"}
        else:
            logger.warning(f"Unknown node type: {node_type}, skipping")
            return {"status": "skipped", "type": node_type}

    def _make_condition_fn(self, condition: str):
        """Create a condition routing function."""
        def route(state: AgentState) -> str:
            # Simple condition evaluation - can be extended with LLM or expression eval
            try:
                from .nodes import evaluate_condition
                branch = evaluate_condition(condition, state)
                return branch
            except Exception:
                return "default"
        return route

    async def execute(
        self,
        initial_state: AgentState,
        thread_id: str = "default",
        cancellation_token: Optional[CancellationToken] = None,
    ) -> AgentState:
        """
        Execute the graph from the initial state.

        Args:
            initial_state: Starting state for the graph.
            thread_id: Checkpoint thread id for memory/suspend/resume.
            cancellation_token: Optional token to support mid-execution cancellation.

        Returns:
            Final state after graph execution, or {"status": "cancelled", "state": state}
            if interrupted.
        """
        if self.graph is None:
            raise RuntimeError("Cannot execute empty graph (no nodes defined)")

        if cancellation_token is None:
            cancellation_token = CancellationToken()

        config = {"configurable": {"thread_id": thread_id}}

        final_state = None
        try:
            async for state in self.graph.astream(initial_state, config):
                cancellation_token.check()
                final_state = state
                logger.debug(f"Node: {state.get('current_node', 'unknown')}")
                cancellation_token.check()
        except asyncio.CancelledError:
            logger.info("Graph execution cancelled")
            return {"status": "cancelled", "state": final_state or initial_state}

        return final_state or initial_state

    async def execute_node(self, node_id: str, state: AgentState) -> dict:
        """Execute a single node by id, bypassing the full graph."""
        if node_id not in self._nodes:
            raise ValueError(f"Node {node_id} not found")
        
        node_def = self._nodes[node_id]
        return await self._execute_node(node_id, node_def["type"], node_def["config"], state)

    def get_nodes(self) -> list[dict]:
        """Return all nodes as a list of dicts."""
        return [
            {"id": nid, "type": ndef["type"], "config": ndef["config"]}
            for nid, ndef in self._nodes.items()
        ]

    def get_edges(self) -> list[dict]:
        """Return all edges as a list of dicts."""
        return list(self._edges)

    def validate_graph(self) -> list[str]:
        """Validate the graph and return list of error messages (empty if valid)."""
        errors = []
        
        if not self._nodes:
            errors.append("Graph has no nodes")
            return errors
        
        start = self.graph_def.get("start")
        end = self.graph_def.get("end")
        
        if start and start not in self._nodes:
            errors.append(f"Start node '{start}' not found in nodes")
        if end and end not in self._nodes:
            errors.append(f"End node '{end}' not found in nodes")
        
        # Check all edge sources/targets exist
        for edge in self._edges:
            if edge["source"] not in self._nodes:
                errors.append(f"Edge source node '{edge['source']}' not found")
            if edge["target"] not in self._nodes:
                errors.append(f"Edge target node '{edge['target']}' not found")
        
        return errors
