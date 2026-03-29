from fastapi import APIRouter, HTTPException
from typing import List, Optional

router = APIRouter(prefix="/api/skills", tags=["skills"])

# 模拟 Skills Registry 数据（后续需与 Phase 2 的 SkillRegistry 集成）
_skills_registry = {
    "web_request": {"name": "web_request", "status": "available", "enabled": True},
    "calculator": {"name": "calculator", "status": "available", "enabled": True},
    "search": {"name": "search", "status": "available", "enabled": True},
}

@router.get("/")
async def list_skills():
    """列出所有可用 Skills"""
    # TODO: 集成 Phase 2 的 SkillRegistry
    return {"skills": list(_skills_registry.values())}

@router.get("/{skill_name}")
async def get_skill(skill_name: str):
    """获取 Skill 详情"""
    if skill_name not in _skills_registry:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _skills_registry[skill_name]

@router.post("/{skill_name}/enable")
async def enable_skill(skill_name: str):
    """启用 Skill"""
    if skill_name not in _skills_registry:
        raise HTTPException(status_code=404, detail="Skill not found")
    _skills_registry[skill_name]["enabled"] = True
    return {"name": skill_name, "enabled": True}

@router.post("/{skill_name}/disable")
async def disable_skill(skill_name: str):
    """禁用 Skill"""
    if skill_name not in _skills_registry:
        raise HTTPException(status_code=404, detail="Skill not found")
    _skills_registry[skill_name]["enabled"] = False
    return {"name": skill_name, "enabled": False}
