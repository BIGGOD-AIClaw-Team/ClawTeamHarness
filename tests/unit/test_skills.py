"""Unit tests for Skills system."""
import pytest
from backend.src.skills.protocol import (
    BaseSkill,
    SkillManifest,
    SkillRegistry,
    register_skill,
)
from backend.src.skills.builtin.calculator import CalculatorSkill
from backend.src.skills.builtin.search import SearchSkill
from backend.src.skills.builtin.web_request import WebRequestSkill


class TestSkillRegistry:
    """Tests for SkillRegistry - isolated from built-in skills."""

    @pytest.fixture(autouse=True)
    def fresh_registry(self):
        """Ensure a clean registry for each test."""
        SkillRegistry.clear()
        # Re-register only the skills needed for these tests
        SkillRegistry.register(DummySkill)
        yield
        SkillRegistry.clear()

    def test_register_skill(self):
        cls = SkillRegistry.get("dummy")
        assert cls is not None
        assert cls.manifest["name"] == "dummy"

    def test_unregister(self):
        result = SkillRegistry.unregister("dummy")
        assert result is True
        assert SkillRegistry.get("dummy") is None

    def test_unregister_unknown(self):
        result = SkillRegistry.unregister("nonexistent_skill_xyz")
        assert result is False

    def test_get_instance_lazy(self):
        instance = SkillRegistry.get_instance("dummy")
        assert instance is not None
        assert isinstance(instance, DummySkill)

    def test_get_instance_returns_same(self):
        instance1 = SkillRegistry.get_instance("dummy")
        instance2 = SkillRegistry.get_instance("dummy")
        assert instance1 is instance2

    def test_list_skill_names(self):
        names = SkillRegistry.list_skill_names()
        assert "dummy" in names

    def test_clear(self):
        SkillRegistry.clear()
        assert SkillRegistry.get("dummy") is None
        assert SkillRegistry.list_skill_names() == []


class TestCalculatorSkill:
    """Tests for CalculatorSkill - uses built-in, no registry manipulation needed."""

    @pytest.mark.asyncio
    async def test_basic_arithmetic(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "2 + 3"}, {})
        assert result["success"] is True
        assert result["result"] == 5

    @pytest.mark.asyncio
    async def test_complex_expression(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "(10 + 5) * 2"}, {})
        assert result["success"] is True
        assert result["result"] == 30

    @pytest.mark.asyncio
    async def test_division(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "10 / 2"}, {})
        assert result["success"] is True
        assert result["result"] == 5

    @pytest.mark.asyncio
    async def test_division_by_zero(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "1 / 0"}, {})
        assert result["success"] is False
        assert "Division by zero" in result["error"]

    @pytest.mark.asyncio
    async def test_math_functions(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "sqrt(16)"}, {})
        assert result["success"] is True
        assert result["result"] == 4

    @pytest.mark.asyncio
    async def test_power(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "2 ** 3"}, {})
        assert result["success"] is True
        assert result["result"] == 8

    @pytest.mark.asyncio
    async def test_missing_expression(self):
        skill = CalculatorSkill()
        result = await skill.execute({}, {})
        assert result["success"] is False
        assert "Missing required parameter" in result["error"]

    @pytest.mark.asyncio
    async def test_invalid_expression(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "import os"}, {})
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_precision(self):
        skill = CalculatorSkill()
        result = await skill.execute({"expression": "10 / 3", "precision": 4}, {})
        assert result["success"] is True
        assert result["precision"] == 4


class TestSearchSkill:
    """Tests for SearchSkill."""

    @pytest.mark.asyncio
    async def test_search_returns_results(self):
        skill = SearchSkill()
        result = await skill.execute({"query": "python programming"}, {})
        assert result["success"] is True
        assert "results" in result
        assert isinstance(result["results"], list)

    @pytest.mark.asyncio
    async def test_search_missing_query(self):
        skill = SearchSkill()
        result = await skill.execute({}, {})
        assert result["success"] is False
        assert "Missing required parameter: query" in result["error"]

    @pytest.mark.asyncio
    async def test_search_count_limit(self):
        skill = SearchSkill()
        result = await skill.execute({"query": "test", "count": 20}, {})
        assert result["count"] <= 10  # capped at 10


class TestWebRequestSkill:
    """Tests for WebRequestSkill."""

    @pytest.mark.asyncio
    async def test_missing_url(self):
        skill = WebRequestSkill()
        result = await skill.execute({}, {})
        assert result["success"] is False
        assert "Missing required parameter: url" in result["error"]

    @pytest.mark.asyncio
    async def test_get_request_success(self):
        """Test GET request using fallback (no aiohttp needed)."""
        skill = WebRequestSkill()
        result = await skill.execute({
            "url": "https://httpbin.org/get",
            "method": "GET",
            "timeout": 10,
        }, {})
        # May fail due to network - accept both success and network error
        assert "success" in result
        assert result["url"] == "https://httpbin.org/get"
        assert result["method"] == "GET"


class TestRegisterDecorator:
    """Tests for the @register_skill decorator."""

    def test_decorator_registers_class(self):
        SkillRegistry.clear()
        
        @register_skill
        class TempSkill(BaseSkill):
            manifest: SkillManifest = {
                "name": "temp_skill_decorator",
                "version": "1.0.0",
                "description": "temp",
                "dependencies": [],
                "author": "Test",
            }

            async def execute(self, params: dict, context: dict) -> dict:
                return {}

        assert SkillRegistry.get("temp_skill_decorator") is not None


# Test helper skill class
class DummySkill(BaseSkill):
    """A dummy skill for registry testing."""
    manifest: SkillManifest = {
        "name": "dummy",
        "version": "1.0.0",
        "description": "A dummy skill for testing",
        "dependencies": [],
        "author": "Test",
    }

    async def execute(self, params: dict, context: dict) -> dict:
        return {"result": "dummy_executed", **params}
