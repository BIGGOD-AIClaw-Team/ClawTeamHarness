"""Node type definitions for the Agent graph."""
from __future__ import annotations

import ast
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseNode(ABC):
    """Abstract base class for all graph nodes."""

    name: str = "base"
    input_schema: dict = {}
    output_schema: dict = {}

    @abstractmethod
    async def execute(self, state: dict) -> dict:
        """
        Execute the node with the given state.
        
        Args:
            state: Current AgentState dict
            
        Returns:
            Dict to merge into the state
        """
        raise NotImplementedError

    def validate_input(self, state: dict) -> bool:
        """Validate input state against input_schema. Override for custom validation."""
        return True


class StartNode(BaseNode):
    """Start node - entry point of the graph."""
    name = "start"
    input_schema = {}
    output_schema = {"status": "string"}

    async def execute(self, state: dict) -> dict:
        return {"status": "started", "current_node": self.name}


class EndNode(BaseNode):
    """End node - terminal point of the graph."""
    name = "end"
    input_schema = {}
    output_schema = {"status": "string"}

    async def execute(self, state: dict) -> dict:
        return {"status": "finished", "current_node": self.name}


class LLMNode(BaseNode):
    """
    LLM invocation node.
    
    Calls an LLM with the given prompt template and state context.
    """
    name = "llm"
    input_schema = {"messages": list}
    output_schema = {"response": str, "messages": list}

    def __init__(self, model: str, prompt_template: str):
        self.model = model
        self.prompt_template = prompt_template

    async def execute(self, state: dict) -> dict:
        """Execute LLM call."""
        messages = state.get("messages", [])
        context = state.get("context", {})
        
        # Build the full prompt with context
        prompt = self._build_prompt(self.prompt_template, context, messages)
        
        # TODO: Integrate with actual LLM provider (OpenAI/Anthropic/etc.)
        # For now, return a placeholder response
        response = await self._call_llm(prompt, messages)
        
        new_messages = messages + [{"role": "assistant", "content": response}]
        
        return {
            "messages": new_messages,
            "context": {**context, "last_response": response},
            "result": {"response": response, "model": self.model},
        }

    def _build_prompt(self, template: str, context: dict, messages: list) -> str:
        """Build full prompt from template and context."""
        if not template:
            # Default: concat all user messages
            user_msgs = [m["content"] for m in messages if m.get("role") == "user"]
            return "\n".join(user_msgs)
        
        # Simple template variable substitution
        result = template
        for key, value in context.items():
            result = result.replace(f"{{{key}}}", str(value))
        
        # Also include recent messages
        if "{messages}" in result:
            msg_str = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in messages)
            result = result.replace("{messages}", msg_str)
        
        return result

    async def _call_llm(self, prompt: str, messages: list) -> str:
        """Call the LLM. Override this method for custom LLM backends."""
        # Placeholder - real implementation would call OpenAI/Anthropic/etc.
        # This will be replaced by actual LLM integration in a future phase
        logger.warning(f"LLM call not implemented - using placeholder. Model: {self.model}")
        
        # Simple echo for testing purposes
        return f"[Placeholder response from {self.model}] {prompt[:100]}..."


class ToolNode(BaseNode):
    """
    Tool invocation node.
    
    Calls a registered tool/skill with the given parameters.
    """
    name = "tool"
    input_schema = {"context": dict}
    output_schema = {"tool_result": Any, "context": dict}

    def __init__(self, tool_name: str, tool_params: dict | None = None):
        self.tool_name = tool_name
        self.tool_params = tool_params or {}

    async def execute(self, state: dict) -> dict:
        """Execute the tool call."""
        context = state.get("context", {})
        params = self._resolve_params(self.tool_params, context)
        
        try:
            result = await self._call_tool(self.tool_name, params)
            return {
                "context": {**context, "tool_result": result},
                "result": result,
            }
        except Exception as e:
            logger.exception(f"Tool {self.tool_name} failed")
            return {
                "context": {**context, "tool_error": str(e)},
                "error": str(e),
            }

    def _resolve_params(self, params: dict, context: dict) -> dict:
        """Resolve parameter values, substituting context variables."""
        resolved = {}
        for key, value in params.items():
            if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
                # Variable reference: {var_name} -> context["var_name"]
                var_name = value[1:-1]
                resolved[key] = context.get(var_name, value)
            else:
                resolved[key] = value
        return resolved

    async def _call_tool(self, tool_name: str, params: dict) -> Any:
        """Call a registered tool via SkillRegistry."""
        from ..skills.protocol import SkillRegistry
        
        skill_cls = SkillRegistry.get(tool_name)
        if skill_cls is None:
            raise ValueError(f"Tool/Skill '{tool_name}' not found in registry")
        
        skill_instance = skill_cls()
        return await skill_instance.execute(params, {})


class ConditionNode(BaseNode):
    """
    Conditional branch node.
    
    Evaluates a condition expression against the current state
    and returns the branch name to route to.
    """
    name = "condition"
    input_schema = {"context": dict, "messages": list}
    output_schema = {"branch": str}

    def __init__(self, condition: str):
        """
        Args:
            condition: Condition expression string.
                Examples:
                    - "context.get('action') == 'search'"
                    - "len(messages) > 5"
                    - "context['confidence'] > 0.8"
        """
        self.condition = condition

    async def execute(self, state: dict) -> dict:
        """Evaluate condition and return branch."""
        context = state.get("context", {})
        messages = state.get("messages", [])
        
        try:
            branch = evaluate_condition(self.condition, state)
            return {
                "context": {**context, "condition_result": branch},
                "result": {"branch": branch},
            }
        except Exception as e:
            logger.exception(f"Condition evaluation failed: {self.condition}")
            return {
                "context": {**context, "condition_error": str(e)},
                "result": {"branch": "default"},
            }


def evaluate_condition(condition: str, state: dict) -> str:
    """
    Evaluate a condition string against the state.
    
    Supports simple Python expressions with 'context' and 'messages' vars.
    Returns the branch name string.
    
    Args:
        condition: Expression string, e.g. "context['type'] == 'search'"
        state: Current agent state
        
    Returns:
        Branch name string
    """
    context = state.get("context", {})
    messages = state.get("messages", [])
    
    try:
        # Use ast.literal_eval for safe evaluation of simple expressions
        # For more complex conditions, we compile and evaluate in an isolated namespace
        result = eval(condition, {"context": context, "messages": messages}, {})
        
        if isinstance(result, bool):
            return "true" if result else "false"
        return str(result)
    except SyntaxError:
        # Fallback: treat as a simple key lookup
        return context.get(condition, "default")
    except Exception:
        logger.warning(f"Condition evaluation error: {condition}")
        return "default"
