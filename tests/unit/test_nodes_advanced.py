"""Unit tests for advanced node types."""
import pytest
from backend.src.agents.nodes_advanced import (
    LoopNode,
    SubGraphNode,
    MergeNode,
    SplitNode,
)


class TestLoopNode:
    @pytest.mark.asyncio
    async def test_loop_max_iterations(self):
        """Loop should exit after max_iterations."""
        node = LoopNode(max_iterations=3)
        state = {"_loop_iteration": 3}
        result = await node.execute(state)
        assert result["_loop_exit"] is True
        assert result["_loop_result"] == "max_iterations"

    @pytest.mark.asyncio
    async def test_loop_continues(self):
        """Loop should continue when iteration < max_iterations."""
        node = LoopNode(max_iterations=10)
        state = {"_loop_iteration": 5}
        result = await node.execute(state)
        assert result["_loop_exit"] is False
        assert result["_loop_iteration"] == 6

    @pytest.mark.asyncio
    async def test_loop_first_iteration(self):
        """First iteration should start at 1."""
        node = LoopNode(max_iterations=10)
        result = await node.execute({})
        assert result["_loop_exit"] is False
        assert result["_loop_iteration"] == 1


class TestSubGraphNode:
    @pytest.mark.asyncio
    async def test_subgraph_execute(self):
        """SubGraph node should return subgraph result."""
        node = SubGraphNode(subgraph_name="test_subgraph")
        result = await node.execute({})
        assert result["subgraph_result"]["subgraph_name"] == "test_subgraph"

    @pytest.mark.asyncio
    async def test_subgraph_with_input_mapping(self):
        """SubGraph node should apply input mapping."""
        node = SubGraphNode(
            subgraph_name="child",
            input_mapping={"parent_key": "child_key"},
        )
        result = await node.execute({"parent_key": "test_value"})
        assert result["subgraph_result"]["subgraph_input"]["child_key"] == "test_value"


class TestMergeNode:
    @pytest.mark.asyncio
    async def test_merge_concat(self):
        """Merge node should concatenate inputs."""
        node = MergeNode(merge_strategy="concat")
        state = {"inputs": ["a", "b", "c"]}
        result = await node.execute(state)
        assert result["merged"] == "a\nb\nc"

    @pytest.mark.asyncio
    async def test_merge_first(self):
        """Merge node should return first input."""
        node = MergeNode(merge_strategy="first")
        state = {"inputs": ["first_val", "second_val"]}
        result = await node.execute(state)
        assert result["merged"] == "first_val"

    @pytest.mark.asyncio
    async def test_merge_merge_strategy(self):
        """Merge node should deep merge dict inputs."""
        node = MergeNode(merge_strategy="merge")
        state = {"inputs": [{"a": 1}, {"b": 2}]}
        result = await node.execute(state)
        assert result["merged"] == {"a": 1, "b": 2}


class TestSplitNode:
    @pytest.mark.asyncio
    async def test_split_returns_branch(self):
        """Split node should return a branch name."""
        node = SplitNode(split_key="value")
        state = {"value": "test_value"}
        result = await node.execute(state)
        assert "_split_branch" in result
        assert result["value"] == "test_value"

    @pytest.mark.asyncio
    async def test_split_consistent_for_same_value(self):
        """Same value should route to same branch."""
        node = SplitNode(split_key="value", num_branches=2)
        state = {"value": "consistent_test"}
        result1 = await node.execute(state)
        result2 = await node.execute(state)
        assert result1["_split_branch"] == result2["_split_branch"]

    @pytest.mark.asyncio
    async def test_split_round_robin(self):
        """Round-robin should cycle through branches when state is passed through."""
        node = SplitNode(split_key="value", num_branches=2, strategy="round_robin")
        state1 = {"value": "x"}
        result1 = await node.execute(state1)
        assert result1["_split_branch"] == "branch_0"
        assert result1["_split_counter"] == 1

        # Pass the counter from the first result to simulate graph state propagation
        result2 = await node.execute({"value": "x", "_split_counter": result1["_split_counter"]})
        assert result2["_split_branch"] == "branch_1"
        assert result2["_split_counter"] == 2
