"""Advanced node types for complex graph flow control."""
from __future__ import annotations

import logging
from typing import Any

from .nodes import BaseNode

logger = logging.getLogger(__name__)


class LoopNode(BaseNode):
    """Loop node - executes a subgraph multiple times with iteration control."""

    name = "loop"

    def __init__(self, max_iterations: int = 10, exit_condition: str = ""):
        """
        Initialize a loop node.

        Args:
            max_iterations: Maximum number of loop iterations before forced exit.
            exit_condition: Optional Python expression evaluated against state.
                            If truthy, loop exits early.
        """
        self.max_iterations = max_iterations
        self.exit_condition = exit_condition

    async def execute(self, state: dict) -> dict:
        """Execute loop iteration logic."""
        iteration = state.get("_loop_iteration", 0)

        if iteration >= self.max_iterations:
            return {
                "_loop_exit": True,
                "_loop_result": "max_iterations",
                "_loop_iterations_completed": iteration,
            }

        # Evaluate exit condition if provided
        if self.exit_condition:
            try:
                if eval(self.exit_condition, {"state": state}):
                    return {
                        "_loop_exit": True,
                        "_loop_result": "condition_met",
                        "_loop_iterations_completed": iteration,
                    }
            except Exception as e:
                logger.warning(f"Loop exit condition evaluation error: {e}")

        # Continue looping
        return {
            "_loop_exit": False,
            "_loop_iteration": iteration + 1,
            "_loop_iterations_completed": iteration,
        }


class SubGraphNode(BaseNode):
    """Subgraph node - invokes a child agent/subgraph."""

    name = "subgraph"

    def __init__(self, subgraph_name: str, input_mapping: dict | None = None, output_mapping: dict | None = None):
        """
        Initialize a subgraph node.

        Args:
            subgraph_name: Name of the subgraph/child agent to invoke.
            input_mapping: Optional dict mapping parent state keys to subgraph input keys.
            output_mapping: Optional dict mapping subgraph output keys to parent state keys.
        """
        self.subgraph_name = subgraph_name
        self.input_mapping = input_mapping or {}
        self.output_mapping = output_mapping or {}

    async def execute(self, state: dict) -> dict:
        """Execute the subgraph call."""
        # Build subgraph input by applying input mapping
        subgraph_input = {}
        for parent_key, child_key in self.input_mapping.items():
            subgraph_input[child_key] = state.get(parent_key)

        # TODO: Integrate with actual subgraph execution engine
        # For now, emit a placeholder result that can be wired to real execution
        logger.info(f"SubGraphNode executing subgraph: {self.subgraph_name}")

        subgraph_result = {
            "subgraph_name": self.subgraph_name,
            "subgraph_input": subgraph_input,
            "subgraph_status": "placeholder",
        }

        # Apply output mapping back to parent state
        result = {"subgraph_result": subgraph_result}
        for subgraph_key, parent_key in self.output_mapping.items():
            result[parent_key] = subgraph_result.get(subgraph_key)

        return result


class MergeNode(BaseNode):
    """Merge node - combines multiple inputs into a single output."""

    name = "merge"

    def __init__(self, merge_strategy: str = "concat"):
        """
        Initialize a merge node.

        Args:
            merge_strategy: How to merge multiple inputs.
                - "concat": Concatenate all inputs as strings.
                - "first": Return the first non-empty input.
                - "merge": Deep merge all input dicts.
                - "zip": Merge lists element-wise (requires equal-length lists).
        """
        self.merge_strategy = merge_strategy

    async def execute(self, state: dict) -> dict:
        """Execute the merge operation."""
        inputs = state.get("inputs", [])

        if self.merge_strategy == "concat":
            merged = "\n".join(str(inp) for inp in inputs if inp)
        elif self.merge_strategy == "first":
            merged = next((inp for inp in inputs if inp), None)
        elif self.merge_strategy == "merge":
            merged = {}
            for inp in inputs:
                if isinstance(inp, dict):
                    merged.update(inp)
        elif self.merge_strategy == "zip":
            zipped = []
            for items in zip(*[inp for inp in inputs if isinstance(inp, list)]):
                zipped.append(list(items))
            merged = zipped
        else:
            merged = inputs

        return {"merged": merged, "_merge_strategy": self.merge_strategy}


class SplitNode(BaseNode):
    """Split node - routes execution to different branches based on a split key."""

    name = "split"

    def __init__(self, split_key: str, num_branches: int = 2, strategy: str = "hash"):
        """
        Initialize a split node.

        Args:
            split_key: State key whose value determines the branch.
            num_branches: Number of output branches (2 = branch_0, branch_1).
            strategy: How to choose branch.
                - "hash": Hash the value and modulo by num_branches.
                - "round_robin": Cycle through branches.
                - "first": Always route to first branch.
        """
        self.split_key = split_key
        self.num_branches = num_branches
        self.strategy = strategy

    async def execute(self, state: dict) -> dict:
        """Execute the split routing."""
        value = state.get(self.split_key, "")
        value_str = str(value)

        if self.strategy == "hash":
            branch = abs(hash(value_str)) % self.num_branches
        elif self.strategy == "round_robin":
            counter = state.get("_split_counter", 0)
            branch = counter % self.num_branches
            return {
                "_split_branch": f"branch_{branch}",
                "value": value,
                "_split_counter": counter + 1,
            }
        elif self.strategy == "first":
            branch = 0
        else:
            branch = abs(hash(value_str)) % self.num_branches

        return {
            "_split_branch": f"branch_{branch}",
            "value": value,
            "_split_key": self.split_key,
        }
