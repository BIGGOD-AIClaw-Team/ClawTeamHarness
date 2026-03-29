"""Skills module - Plugin system for Agent tools."""
from .protocol import (
    BaseSkill,
    SkillManifest,
    SkillRegistry,
    register_skill,
)

# Auto-load built-in skills and register them
from .builtin.search import SearchSkill
from .builtin.calculator import CalculatorSkill
from .builtin.web_request import WebRequestSkill

# Register built-in skills automatically when module is loaded
SkillRegistry.register(SearchSkill)
SkillRegistry.register(CalculatorSkill)
SkillRegistry.register(WebRequestSkill)

__all__ = [
    "BaseSkill",
    "SkillManifest",
    "SkillRegistry",
    "register_skill",
    "SearchSkill",
    "WebRequestSkill",
    "CalculatorSkill",
]
