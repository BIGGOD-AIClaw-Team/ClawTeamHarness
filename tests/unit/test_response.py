"""Unit tests for ResponseGenerator."""
import pytest
from backend.src.agents.response import ResponseGenerator


class TestResponseGenerator:
    def test_init_streaming_true(self):
        gen = ResponseGenerator(streaming=True)
        assert gen.streaming is True

    def test_init_streaming_false(self):
        gen = ResponseGenerator(streaming=False)
        assert gen.streaming is False

    def test_format_response_greeting(self):
        gen = ResponseGenerator()
        result = gen.format_response({"input": "hi"}, "greeting")
        assert "你好" in result

    def test_format_response_query(self):
        gen = ResponseGenerator()
        result = gen.format_response({"data": "晴"}, "query")
        assert "晴" in result

    def test_format_response_action(self):
        gen = ResponseGenerator()
        result = gen.format_response({"result": "完成"}, "action")
        assert "完成" in result

    def test_format_response_unknown(self):
        gen = ResponseGenerator()
        result = gen.format_response({"input": "hello"}, "unknown")
        assert "hello" in result

    @pytest.mark.asyncio
    async def test_generate_streaming(self):
        gen = ResponseGenerator(streaming=True)
        chunks = []
        async for chunk in gen.generate("hello"):
            chunks.append(chunk)
        assert "".join(chunks) == "hello"

    @pytest.mark.asyncio
    async def test_generate_non_streaming(self):
        gen = ResponseGenerator(streaming=False)
        chunks = []
        async for chunk in gen.generate("hello"):
            chunks.append(chunk)
        assert len(chunks) == 1
        assert chunks[0] == "hello"
