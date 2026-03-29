from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path

from ...skills.protocol import SkillRegistry

router = APIRouter(prefix="/api/skills", tags=["skills"])

# Skills.md 文件路径 - 可以在工作区根目录或项目目录
SKILLS_MD_PATHS = [
    Path("./data/skills.md"),
    Path("./skills.md"),
    Path("../skills.md"),
]

def get_skills_md_path() -> Path:
    """获取 skills.md 文件路径"""
    for p in SKILLS_MD_PATHS:
        if p.exists():
            return p
    # 如果都不存在，返回第一个（会在保存时创建）
    return SKILLS_MD_PATHS[0]

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


@router.get("/content")
async def get_skills_content():
    """获取 skills.md 文件内容"""
    path = get_skills_md_path()
    if path.exists():
        try:
            content = path.read_text(encoding="utf-8")
            return {"content": content, "path": str(path)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"读取失败: {str(e)}")
    else:
        # 返回默认内容
        default_content = """# Skills 配置

## 可用 Skills

本文件定义了系统可用的 Skills 列表。

## 格式

```yaml
- name: skill_name
  description: 描述
  enabled: true
```

## 示例

```yaml
skills:
  - name: calculator
    description: 数学计算
    enabled: true
  - name: search
    description: 搜索工具
    enabled: true
```
"""
        return {"content": default_content, "path": str(path), "is_default": True}


class SkillsContentRequest(BaseModel):
    content: str


@router.put("/content")
async def update_skills_content(request: SkillsContentRequest):
    """更新 skills.md 文件内容"""
    path = get_skills_md_path()
    try:
        # 确保目录存在
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(request.content, encoding="utf-8")
        return {"status": "success", "message": "skills.md 已保存", "path": str(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")
