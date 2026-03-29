"""Built-in Skills - auto-discoverable via import."""
from .search import SearchSkill
from .web_request import WebRequestSkill
from .calculator import CalculatorSkill

__all__ = ["SearchSkill", "WebRequestSkill", "CalculatorSkill"]
