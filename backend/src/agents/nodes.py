"""Node type definitions for the Agent graph."""
from __future__ import annotations

import ast
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class NodeExecutionError(Exception):
    """Raised when a node execution fails."""

    def __init__(self, node_name: str, message: str, retryable: bool = False):
        self.node_name = node_name
        self.retryable = retryable
        super().__init__(f"Node '{node_name}' failed: {message}")


class CircuitBreaker:
    """Circuit breaker to prevent cascading failures across nodes."""

    def __init__(self, failure_threshold: int = 3, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures: dict[str, int] = {}
        self.last_failure_time: dict[str, float] = {}

    def is_open(self, node_name: str) -> bool:
        """Return True if the circuit breaker is open for the given node."""
        if node_name not in self.failures:
            return False
        if self.failures[node_name] >= self.failure_threshold:
            return True
        return False

    def record_success(self, node_name: str):
        """Reset failure count on successful execution."""
        self.failures[node_name] = 0

    def record_failure(self, node_name: str):
        """Record a failure and timestamp for the node."""
        self.failures[node_name] = self.failures.get(node_name, 0) + 1
        self.last_failure_time[node_name] = asyncio.get_event_loop().time()


# Global circuit breaker instance
circuit_breaker = CircuitBreaker()


async def execute_with_retry(node: BaseNode, state: dict, max_retries: int = 3) -> dict:
    """
    Execute a node with automatic retry and circuit breaker protection.

    Args:
        node: The node instance to execute.
        state: Current agent state dict.
        max_retries: Maximum number of retry attempts.

    Returns:
        Merged state dict from node execution.

    Raises:
        NodeExecutionError: If all retries are exhausted or circuit breaker is open.
    """
    node_name = getattr(node, "name", str(node))

    for attempt in range(max_retries):
        try:
            if circuit_breaker.is_open(node_name):
                raise NodeExecutionError(
                    node_name, "Circuit breaker open", retryable=False
                )

            result = await node.execute(state)
            circuit_breaker.record_success(node_name)
            return result

        except Exception as e:
            if attempt == max_retries - 1:
                circuit_breaker.record_failure(node_name)
                raise NodeExecutionError(
                    node_name, str(e), retryable=True
                )
            await asyncio.sleep(0.5 * (attempt + 1))  # Exponential backoff


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
    Supports both non-streaming and streaming modes.
    """
    name = "llm"
    input_schema = {"messages": list}
    output_schema = {"response": str, "messages": list}

    def __init__(self, model: str = "gpt-4", prompt_template: str = "",
                 temperature: float = 0.7, max_tokens: int = 2048, top_p: float = 1.0,
                 stream: bool = False):
        self.model = model
        self.prompt_template = prompt_template
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.stream = stream

    async def execute(self, state: dict) -> dict:
        """Execute LLM call."""
        messages = state.get("messages", [])
        context = state.get("context", {})
        
        # Build messages with prompt template if provided
        llm_messages = self._build_messages(self.prompt_template, context, messages)
        
        # Call the LLM
        if self.stream:
            response = await self._call_llm_stream(llm_messages)
        else:
            response = await self._call_llm(llm_messages)
        
        new_messages = messages + [{"role": "assistant", "content": response}]
        
        return {
            "messages": new_messages,
            "context": {**context, "last_response": response},
            "result": {"response": response, "model": self.model},
        }

    def _build_messages(self, template: str, context: dict, messages: list) -> list:
        """Build messages list for LLM API from template and context."""
        llm_messages = []
        
        # Add context as system message if template has variables
        if template:
            result = template
            for key, value in context.items():
                result = result.replace(f"{{{key}}}", str(value))
            
            # Include recent messages in template if {messages} placeholder exists
            if "{messages}" in result:
                msg_str = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in messages)
                result = result.replace("{messages}", msg_str)
            
            # Prepend template as system message
            llm_messages.append({"role": "system", "content": result})
        
        # Add existing messages
        llm_messages.extend(messages)
        
        return llm_messages

    async def _call_llm(self, messages: list) -> str:
        """Call the LLM (non-streaming). Override this method for custom LLM backends."""
        import os
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=os.getenv("LLM_API_KEY"))

        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            top_p=self.top_p,
        )
        return response.choices[0].message.content

    async def _call_llm_stream(self, messages: list) -> str:
        """
        流式调用 LLM
        
        Args:
            messages: 消息列表
            
        Returns:
            完整的响应文本
        """
        import os
        from typing import AsyncGenerator
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=os.getenv("LLM_API_KEY"))

        full_response = ""
        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            top_p=self.top_p,
            stream=True,
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                full_response += chunk.choices[0].delta.content
        
        return full_response


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
