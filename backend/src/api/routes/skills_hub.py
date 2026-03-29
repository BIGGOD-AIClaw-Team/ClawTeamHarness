from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import asyncio
import json
from pathlib import Path

router = APIRouter(prefix="/api/skills-hub", tags=["skills-hub"])

# 预设的 Skills 仓库列表 (ClawHub 官方 Skill 仓库)
SKILLS_REPOS = [
    {"name": "calculator", "description": "数学计算器 - 支持基础运算和科学计算", "url": "https://raw.githubusercontent.com/clawhub/calculator-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["math", "calculator"]},
    {"name": "weather", "description": "天气查询 - 获取全球天气预报", "url": "https://raw.githubusercontent.com/clawhub/weather-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["weather", "forecast"]},
    {"name": "web-search", "description": "网页搜索 - 使用 DuckDuckGo 搜索互联网", "url": "https://raw.githubusercontent.com/clawhub/web-search-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["search", "web"]},
    {"name": "unit-converter", "description": "单位转换 - 长度、重量、温度等单位转换", "url": "https://raw.githubusercontent.com/clawhub/unit-converter-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["converter", "utility"]},
    {"name": "qrcode", "description": "二维码生成 - 生成和解析二维码", "url": "https://raw.githubusercontent.com/clawhub/qrcode-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["qrcode", "utility"]},
    {"name": "color-picker", "description": "颜色选择器 - 颜色格式转换和选取", "url": "https://raw.githubusercontent.com/clawhub/color-picker-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["color", "design"]},
    {"name": "image-ocr", "description": "图片 OCR - 从图片中提取文字", "url": "https://raw.githubusercontent.com/clawhub/image-ocr-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["ocr", "image"]},
    {"name": "code-highlighter", "description": "代码高亮 - 代码语法高亮显示", "url": "https://raw.githubusercontent.com/clawhub/code-highlighter-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["code", "developer"]},
]

# 本地已安装 Skills 存储 - 确保目录存在
# skills_hub.py at src/api/routes/skills_hub.py -> parents[5] = ClawTeamHarness/
INSTALLED_SKILLS_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "installed_skills.json"
INSTALLED_SKILLS_FILE.parent.mkdir(parents=True, exist_ok=True)
INSTALLED_SKILLS_FILE.parent.mkdir(parents=True, exist_ok=True)

async def _read_installed_skills() -> List[dict]:
    """异步读取已安装 Skills"""
    if INSTALLED_SKILLS_FILE.exists():
        try:
            content = await asyncio.to_thread(INSTALLED_SKILLS_FILE.read_text, encoding="utf-8")
            return json.loads(content)
        except (json.JSONDecodeError, OSError):
            pass
    return []

async def _write_installed_skills(skills: List[dict]):
    """异步写入已安装 Skills"""
    content = json.dumps(skills, ensure_ascii=False, indent=2)
    await asyncio.to_thread(INSTALLED_SKILLS_FILE.write_text, content, encoding="utf-8")

@router.get("/list")
async def list_available_skills():
    """列出可用的 Skills (从预设仓库获取)"""
    installed = await _read_installed_skills()
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
    skills = await _read_installed_skills()
    return {"skills": skills}

@router.post("/install/{skill_name}")
async def install_skill(skill_name: str):
    """安装 Skill"""
    skill_config = None
    for repo in SKILLS_REPOS:
        if repo["name"] == skill_name:
            skill_config = repo
            break
    
    if not skill_config:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' 不存在")
    
    installed = await _read_installed_skills()
    if any(s["name"] == skill_name for s in installed):
        raise HTTPException(status_code=400, detail=f"Skill '{skill_name}' 已安装")
    
    # 尝试从 URL 获取 skill.json，带超时
    skill_json = None
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            resp = await client.get(skill_config["url"])
            if resp.status_code == 200:
                skill_json = resp.json()
    except Exception:
        pass  # 网络获取失败，使用默认配置
    
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
    await _write_installed_skills(installed)
    
    return {"status": "installed", "skill": skill_name, "message": f"Skill '{skill_name}' 安装成功"}

@router.post("/uninstall/{skill_name}")
async def uninstall_skill(skill_name: str):
    """卸载 Skill"""
    installed = await _read_installed_skills()
    original_len = len(installed)
    installed = [s for s in installed if s["name"] != skill_name]
    
    if len(installed) == original_len:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' 未安装")
    
    await _write_installed_skills(installed)
    return {"status": "uninstalled", "skill": skill_name, "message": f"Skill '{skill_name}' 已卸载"}

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
