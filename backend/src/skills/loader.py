import os
import importlib
import inspect
from pathlib import Path
from typing import Optional

from .protocol import BaseSkill


class SkillsLoader:
    """Skills 动态加载器，支持热更新"""

    def __init__(self, skills_dir: str = "./skills"):
        self.skills_dir = Path(skills_dir)
        self._loaded_skills: dict[str, type] = {}

    def discover_skills(self) -> list[str]:
        """扫描目录发现所有 Skill"""
        if not self.skills_dir.exists():
            return []

        skills = []
        for py_file in self.skills_dir.glob("*.py"):
            if py_file.name.startswith("_"):
                continue
            skills.append(py_file.stem)
        return skills

    def load_skill(self, skill_name: str) -> Optional[type]:
        """动态加载 Skill"""
        if skill_name in self._loaded_skills:
            return self._loaded_skills[skill_name]

        try:
            module = importlib.import_module(f"skills.{skill_name}")

            # 找到 BaseSkill 的子类
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if issubclass(obj, BaseSkill) and obj != BaseSkill:
                    self._loaded_skills[skill_name] = obj
                    return obj
        except Exception as e:
            print(f"Failed to load skill {skill_name}: {e}")
        return None

    def reload_skill(self, skill_name: str):
        """热更新 Skill"""
        if skill_name in self._loaded_skills:
            del self._loaded_skills[skill_name]
        return self.load_skill(skill_name)

    def load_all(self):
        """加载所有发现的 Skills"""
        for skill_name in self.discover_skills():
            self.load_skill(skill_name)
