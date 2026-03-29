"""Skills module - Plugin system for Agent tools."""
from .protocol import (
    BaseSkill,
    SkillManifest,
    SkillRegistry,
    register_skill,
)

# Auto-load built-in skills
from .builtin import SearchSkill, WebRequestSkill, CalculatorSkill

__all__ = [
    "BaseSkill",
    "SkillManifest",
    "SkillRegistry",
    "register_skill",
    "SearchSkill",
    "WebRequestSkill",
    "CalculatorSkill",
]
