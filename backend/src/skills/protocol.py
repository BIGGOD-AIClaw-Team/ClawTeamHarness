"""Skill interface protocol and registry."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TypedDict, Any

logger = logging.getLogger(__name__)


class SkillManifest(TypedDict, total=False):
    """Skill manifest - metadata for a Skill."""
    name: str
    version: str
    description: str
    dependencies: list[str]
    author: str
    tags: list[str]


class BaseSkill(ABC):
    """
    Abstract base class for all Skills.
    
    All Skills must:
    1. Define a `manifest` class attribute (SkillManifest)
    2. Implement `execute(params, context)` async method
    
    Example:
        class MySkill(BaseSkill):
            manifest: SkillManifest = {
                "name": "my_skill",
                "version": "1.0.0",
                "description": "Does something useful",
                "dependencies": [],
                "author": "Team",
            }
            
            async def execute(self, params: dict, context: dict) -> dict:
                return {"result": "done"}
    """

    manifest: SkillManifest = {
        "name": "base_skill",
        "version": "1.0.0",
        "description": "Base skill class",
        "dependencies": [],
        "author": "Unknown",
    }

    @abstractmethod
    async def execute(self, params: dict, context: dict) -> dict:
        """
        Execute the skill with given parameters.
        
        Args:
            params: Skill-specific parameters from the caller
            context: Shared agent context (memory, session info, etc.)
            
        Returns:
            Dict result of the skill execution
        """
        raise NotImplementedError

    def validate_params(self, params: dict) -> bool:
        """
        Validate input parameters before execution.
        
        Override this method to add parameter validation.
        
        Args:
            params: Parameters to validate
            
        Returns:
            True if valid, False otherwise
        """
        return True

    async def cleanup(self) -> None:
        """
        Cleanup resources after execution.
        
        Override to implement resource cleanup (DB connections, files, etc.)
        """
        pass

    def get_manifest(self) -> SkillManifest:
        """Return the skill's manifest."""
        return self.manifest


class SkillRegistry:
    """
    Global Skill registry.
    
    Singleton registry that tracks all registered Skills by name.
    Supports registration, lookup, and listing.
    """

    _skills: dict[str, type[BaseSkill]] = {}
    _instances: dict[str, BaseSkill] = {}

    @classmethod
    def register(cls, skill_class: type[BaseSkill]) -> None:
        """
        Register a Skill class.
        
        Args:
            skill_class: BaseSkill subclass to register
        """
        name = skill_class.manifest["name"]
        if name in cls._skills:
            logger.warning(f"Skill '{name}' already registered, overwriting")
        cls._skills[name] = skill_class
        logger.info(f"Registered skill: {name} v{skill_class.manifest['version']}")

    @classmethod
    def unregister(cls, name: str) -> bool:
        """
        Unregister a Skill by name.
        
        Args:
            name: Skill name to unregister
            
        Returns:
            True if removed, False if not found
        """
        if name in cls._skills:
            del cls._skills[name]
            cls._instances.pop(name, None)
            logger.info(f"Unregistered skill: {name}")
            return True
        return False

    @classmethod
    def get(cls, name: str) -> type[BaseSkill] | None:
        """
        Get a Skill class by name.
        
        Args:
            name: Skill name
            
        Returns:
            Skill class or None if not found
        """
        return cls._skills.get(name)

    @classmethod
    def get_instance(cls, name: str) -> BaseSkill | None:
        """
        Get a Skill instance (lazy instantiation).
        
        Args:
            name: Skill name
            
        Returns:
            Skill instance or None
        """
        if name not in cls._instances:
            skill_cls = cls._skills.get(name)
            if skill_cls:
                cls._instances[name] = skill_cls()
        return cls._instances.get(name)

    @classmethod
    def list_skills(cls) -> list[SkillManifest]:
        """
        List all registered Skill manifests.
        
        Returns:
            List of SkillManifest dicts
        """
        return [s.manifest for s in cls._skills.values()]

    @classmethod
    def list_skill_names(cls) -> list[str]:
        """Return list of all registered skill names."""
        return list(cls._skills.keys())

    @classmethod
    def clear(cls) -> None:
        """Clear all registered skills. Useful for testing."""
        cls._skills.clear()
        cls._instances.clear()


def register_skill(skill_class: type[BaseSkill]) -> type[BaseSkill]:
    """
    Decorator to register a Skill class.
    
    Usage:
        @register_skill
        class MySkill(BaseSkill):
            manifest = {...}
            ...
    """
    SkillRegistry.register(skill_class)
    return skill_class
