"""Unit tests for Node types."""
import pytest
from backend.src.agents.nodes import (
    LLMNode,
    ToolNode,
    ConditionNode,
    StartNode,
    EndNode,
    evaluate_condition,
    BaseNode,
)


class TestStartNode:
    @pytest.mark.asyncio
    async def test_start_node_execute(self):
        node = StartNode()
        result = await node.execute({})
        assert result["status"] == "started"
        assert result["current_node"] == "start"


class TestEndNode:
    @pytest.mark.asyncio
    async def test_end_node_execute(self):
        node = EndNode()
        result = await node.execute({})
        assert result["status"] == "finished"
        assert result["current_node"] == "end"


class TestLLMNode:
    def test_llm_node_init(self):
        node = LLMNode(model="gpt-4", prompt_template="Hello {name}")
        assert node.model == "gpt-4"
        assert node.name == "llm"

    def test_build_prompt_with_context(self):
        node = LLMNode(model="gpt-4", prompt_template="Hello {name}, you have {count} messages")
        prompt = node._build_prompt(node.prompt_template, {"name": "Alice", "count": 5}, [])
        assert prompt == "Hello Alice, you have 5 messages"

    def test_build_prompt_no_template(self):
        node = LLMNode(model="gpt-4", prompt_template="")
        messages = [{"role": "user", "content": "Hi there"}]
        prompt = node._build_prompt("", {}, messages)
        assert prompt == "Hi there"

    @pytest.mark.asyncio
    async def test_llm_execute_returns_messages(self):
        node = LLMNode(model="gpt-4", prompt_template="")
        state = {"messages": [{"role": "user", "content": "Hi"}], "context": {}}
        result = await node.execute(state)
        assert "messages" in result
        assert len(result["messages"]) == 2  # original + assistant response
        assert result["messages"][-1]["role"] == "assistant"


class TestToolNode:
    def test_tool_node_init(self):
        node = ToolNode(tool_name="search", tool_params={"query": "{query}"})
        assert node.tool_name == "search"
        assert node.tool_params["query"] == "{query}"

    def test_resolve_params_with_var_ref(self):
        node = ToolNode(tool_name="test", tool_params={"query": "{my_query}"})
        resolved = node._resolve_params(node.tool_params, {"my_query": "hello world"})
        assert resolved["query"] == "hello world"

    def test_resolve_params_without_var_ref(self):
        node = ToolNode(tool_name="test", tool_params={"count": 5})
        resolved = node._resolve_params(node.tool_params, {})
        assert resolved["count"] == 5


class TestConditionNode:
    def test_condition_node_init(self):
        node = ConditionNode(condition="context['action'] == 'search'")
        assert node.condition == "context['action'] == 'search'"

    @pytest.mark.asyncio
    async def test_condition_true(self):
        node = ConditionNode(condition="context['action'] == 'search'")
        state = {"context": {"action": "search"}, "messages": []}
        result = await node.execute(state)
        assert result["result"]["branch"] == "true"

    @pytest.mark.asyncio
    async def test_condition_false(self):
        node = ConditionNode(condition="context['action'] == 'search'")
        state = {"context": {"action": "skip"}, "messages": []}
        result = await node.execute(state)
        assert result["result"]["branch"] == "false"


class TestEvaluateCondition:
    def test_context_equality_true(self):
        state = {"context": {"action": "search"}, "messages": []}
        result = evaluate_condition("context['action'] == 'search'", state)
        assert result == "true"

    def test_context_equality_false(self):
        state = {"context": {"action": "skip"}, "messages": []}
        result = evaluate_condition("context['action'] == 'search'", state)
        assert result == "false"

    def test_context_getitem(self):
        state = {"context": {"count": 5}, "messages": []}
        result = evaluate_condition("context['count'] > 3", state)
        assert result == "true"

    def test_invalid_condition_returns_default(self):
        state = {"context": {}, "messages": []}
        result = evaluate_condition("this is invalid syntax !!!", state)
        assert result == "default"
