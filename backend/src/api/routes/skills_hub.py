from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import shutil
from pathlib import Path

router = APIRouter(prefix="/api/skills-hub", tags=["skills-hub"])

# 预设的 Skills 仓库列表 (ClawHub 官方 Skill 仓库)
SKILLS_REPOS = [
    {
        "name": "calculator",
        "description": "数学计算器 - 支持基础运算和科学计算",
        "url": "https://raw.githubusercontent.com/clawhub/calculator-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["math", "calculator"]
    },
    {
        "name": "weather",
        "description": "天气查询 - 获取全球天气预报",
        "url": "https://raw.githubusercontent.com/clawhub/weather-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["weather", "forecast"]
    },
    {
        "name": "web-search",
        "description": "网页搜索 - 使用 DuckDuckGo 搜索互联网",
        "url": "https://raw.githubusercontent.com/clawhub/web-search-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["search", "web"]
    },
    {
        "name": "unit-converter",
        "description": "单位转换 - 长度、重量、温度等单位转换",
        "url": "https://raw.githubusercontent.com/clawhub/unit-converter-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["converter", "utility"]
    },
    {
        "name": "qrcode",
        "description": "二维码生成 - 生成和解析二维码",
        "url": "https://raw.githubusercontent.com/clawhub/qrcode-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["qrcode", "utility"]
    },
    {
        "name": "color-picker",
        "description": "颜色选择器 - 颜色格式转换和选取",
        "url": "https://raw.githubusercontent.com/clawhub/color-picker-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["color", "design"]
    },
    {
        "name": "image-ocr",
        "description": "图片 OCR - 从图片中提取文字",
        "url": "https://raw.githubusercontent.com/clawhub/image-ocr-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["ocr", "image"]
    },
    {
        "name": "code-highlighter",
        "description": "代码高亮 - 代码语法高亮显示",
        "url": "https://raw.githubusercontent.com/clawhub/code-highlighter-skill/main/skill.json",
        "author": "clawhub",
        "version": "1.0.0",
        "tags": ["code", "developer"]
    },
]

# 本地已安装 Skills 存储
INSTALLED_SKILLS_FILE = Path("./data/installed_skills.json")

def get_installed_skills() -> List[dict]:
    """获取已安装的 Skills"""
    if INSTALLED_SKILLS_FILE.exists():
        try:
            import json
            return json.loads(INSTALLED_SKILLS_FILE.read_text(encoding="utf-8"))
        except:
            pass
    return []

def save_installed_skills(skills: List[dict]):
    """保存已安装的 Skills"""
    INSTALLED_SKILLS_FILE.parent.mkdir(parents=True, exist_ok=True)
    import json
    INSTALLED_SKILLS_FILE.write_text(json.dumps(skills, ensure_ascii=False, indent=2), encoding="utf-8")

@router.get("/list")
async def list_available_skills():
    """列出可用的 Skills (从预设仓库获取)"""
    # 检查哪些已安装
    installed = get_installed_skills()
    installed_names = {s["name"] for s in installed}
    
    result = []
    for repo in SKILLS_REPOS:
        skill_info = {
            "name": repo["name"],
            "description": repo["description"],
            "author": repo["author"],
            "version": repo["version"],
            "tags": repo["tags"],
            "installed": repo["name"] in installed_names,
        }
        result.append(skill_info)
    
    return {"skills": result}

@router.get("/installed")
async def list_installed_skills():
    """列出已安装的 Skills"""
    return {"skills": get_installed_skills()}

@router.post("/install/{skill_name}")
async def install_skill(skill_name: str):
    """安装 Skill"""
    # 查找 skill 配置
    skill_config = None
    for repo in SKILLS_REPOS:
        if repo["name"] == skill_name:
            skill_config = repo
            break
    
    if not skill_config:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' 不存在")
    
    # 检查是否已安装
    installed = get_installed_skills()
    if any(s["name"] == skill_name for s in installed):
        raise HTTPException(status_code=400, detail=f"Skill '{skill_name}' 已安装")
    
    # 尝试从 URL 获取 skill.json
    skill_json = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(skill_config["url"], timeout=10)
            if resp.status_code == 200:
                import json
                skill_json = resp.json()
    except:
        pass  # 网络获取失败，使用默认配置
    
    # 添加到已安装列表
    installed_skill = {
        "name": skill_config["name"],
        "description": skill_config["description"],
        "author": skill_config["author"],
        "version": skill_config["version"],
        "tags": skill_config["tags"],
        "installed_at": str(Path().absolute()),
        "config": skill_json if skill_json else skill_config,
    }
    installed.append(installed_skill)
    save_installed_skills(installed)
    
    return {
        "status": "installed", 
        "skill": skill_name,
        "message": f"Skill '{skill_name}' 安装成功"
    }

@router.post("/uninstall/{skill_name}")
async def uninstall_skill(skill_name: str):
    """卸载 Skill"""
    installed = get_installed_skills()
    original_len = len(installed)
    installed = [s for s in installed if s["name"] != skill_name]
    
    if len(installed) == original_len:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' 未安装")
    
    save_installed_skills(installed)
    return {
        "status": "uninstalled", 
        "skill": skill_name,
        "message": f"Skill '{skill_name}' 已卸载"
    }

@router.get("/categories")
async def get_skill_categories():
    """获取所有 Skill 分类"""
    categories = {}
    for repo in SKILLS_REPOS:
        for tag in repo.get("tags", []):
            if tag not in categories:
                categories[tag] = []
            categories[tag].append(repo["name"])
    return {"categories": categories}
