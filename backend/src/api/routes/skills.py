from fastapi import APIRouter, HTTPException

from ...skills.protocol import SkillRegistry

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("/")
async def list_skills():
    """列出所有可用 Skills"""
    return {"skills": SkillRegistry.list_skills()}


@router.get("/{skill_name}")
async def get_skill(skill_name: str):
    """获取 Skill 详情"""
    skill_class = SkillRegistry.get(skill_name)
    if not skill_class:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"name": skill_name, "manifest": skill_class.manifest}


@router.post("/{skill_name}/enable")
async def enable_skill(skill_name: str):
    """启用 Skill"""
    skill_class = SkillRegistry.get(skill_name)
    if not skill_class:
        raise HTTPException(status_code=404, detail="Skill not found")
    # Skills are enabled by default in the registry
    return {"name": skill_name, "enabled": True}


@router.post("/{skill_name}/disable")
async def disable_skill(skill_name: str):
    """禁用 Skill - 通过从注册表取消注册实现"""
    success = SkillRegistry.unregister(skill_name)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"name": skill_name, "enabled": False}
