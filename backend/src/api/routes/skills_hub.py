from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
import asyncio
import json
import re
from pathlib import Path

router = APIRouter(prefix="/api/skills-hub", tags=["skills-hub"])

# ============================================================
# 本地 Skills 扫描目录
# ============================================================
LOCAL_SKILLS_DIRS = [
    "/usr/local/lib/node_modules/openclaw/skills",  # OpenClaw 全局安装的 skills
    str(Path.home() / ".openclaw" / "skills"),      # ~/.openclaw/skills
    str(Path.home() / ".openclaw" / "workspace" / "skills"),  # workspace skills
    str(Path.home() / ".openclaw" / "extensions"),  # ~/.openclaw/extensions
]

def _parse_skill_md(skill_md_path: Path) -> dict:
    """解析 SKILL.md 文件，提取 name, description, metadata"""
    try:
        content = skill_md_path.read_text(encoding="utf-8")
        # 解析 YAML frontmatter
        frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if frontmatter_match:
            frontmatter = frontmatter_match.group(1)
            # 简单解析 YAML frontmatter
            name_match = re.search(r'^name:\s*(.+)$', frontmatter, re.MULTILINE)
            desc_match = re.search(r'^description:\s*["\']?(.+?)["\']?\s*$', frontmatter, re.MULTILINE)
            emoji_match = re.search(r'"emoji":\s*"([^"]+)"', frontmatter)
            requires_match = re.search(r'"requires":\s*\{[^}]*\}', frontmatter)
            
            name = name_match.group(1).strip() if name_match else skill_md_path.parent.name
            description = desc_match.group(1).strip() if desc_match else ""
            
            return {
                "name": name,
                "description": description,
                "emoji": emoji_match.group(1) if emoji_match else "📦",
                "requires": requires_match.group(0) if requires_match else "",
                "source": "local",
            }
    except Exception:
        pass
    return None

def _scan_local_skills() -> List[dict]:
    """扫描本地 Skills 目录，返回可用的 Skills 列表（含真实路径）"""
    local_skills = []
    seen_names = set()
    
    for skills_dir in LOCAL_SKILLS_DIRS:
        dir_path = Path(skills_dir)
        if not dir_path.exists():
            continue
        
        for skill_path in dir_path.iterdir():
            if not skill_path.is_dir():
                continue
            skill_name = skill_path.name
            if skill_name in seen_names:
                continue
            seen_names.add(skill_name)
            
            skill_md = skill_path / "SKILL.md"
            if skill_md.exists():
                skill_info = _parse_skill_md(skill_md)
                if skill_info:
                    skill_info["path"] = str(skill_path)  # 添加真实路径
                    local_skills.append(skill_info)
            else:
                # 没有 SKILL.md 的目录也作为 skill 加入
                local_skills.append({
                    "name": skill_name,
                    "description": f"本地 Skill: {skill_name}",
                    "emoji": "📦",
                    "source": "local",
                    "path": str(skill_path),  # 添加真实路径
                })
    
    return local_skills

# 预设的 Skills 仓库列表 (仅作为参考，已被本地 Skills 替代)
# 这些仍然保留用于 "从远程安装" 功能
SKILLS_REPOS = [
    {"name": "calculator", "description": "数学计算器 - 支持基础运算和科学计算", "url": "https://raw.githubusercontent.com/clawhub/calculator-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["math", "calculator"], "available": False, "reason": "远程仓库不可用，请使用本地 Skills"},
    {"name": "weather", "description": "天气查询 - 获取全球天气预报", "url": "https://raw.githubusercontent.com/clawhub/weather-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["weather", "forecast"], "available": False, "reason": "远程仓库不可用，请使用本地 Skills"},
    {"name": "web-search", "description": "网页搜索 - 使用 DuckDuckGo 搜索互联网", "url": "https://raw.githubusercontent.com/clawhub/web-search-skill/main/skill.json", "author": "clawhub", "version": "1.0.0", "tags": ["search", "web"], "available": False, "reason": "远程仓库不可用，请使用本地 Skills"},
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
    """列出可用的 Skills (优先从本地扫描)"""
    installed = await _read_installed_skills()
    installed_names = {s["name"] for s in installed}
    
    result = []
    
    # 首先添加本地扫描到的 Skills
    local_skills = _scan_local_skills()
    for skill in local_skills:
        skill_info = {
            "name": skill["name"],
            "description": skill.get("description", ""),
            "author": "openclaw",
            "version": "1.0.0",
            "tags": [skill.get("source", "local")],
            "installed": skill["name"] in installed_names,
            "emoji": skill.get("emoji", "📦"),
            "source": "local",
            "available": True,
        }
        result.append(skill_info)
    
    # 保留预设的远程 repos（标记为不可用，作为参考）
    for repo in SKILLS_REPOS:
        if repo["name"] not in installed_names and repo["name"] not in [s["name"] for s in result]:
            skill_info = {
                "name": repo["name"],
                "description": repo["description"],
                "author": repo["author"],
                "version": repo["version"],
                "tags": repo["tags"],
                "installed": False,
                "available": repo.get("available", False),
                "reason": repo.get("reason", "远程仓库不可用"),
            }
            result.append(skill_info)
    
    return {"skills": result}

@router.get("/installed")
async def list_installed_skills():
    """列出已安装的 Skills（包括本地已扫描的 Skills）"""
    # 首先获取用户显式安装的 Skills
    explicit_installed = await _read_installed_skills()
    explicit_names = {s["name"] for s in explicit_installed}
    
    # 扫描本地 Skills 并标记为已安装
    local_skills = _scan_local_skills()
    local_installed = []
    for skill in local_skills:
        # 如果本地存在但不在显式安装列表中，也视为已安装
        skill_info = {
            "name": skill["name"],
            "description": skill.get("description", ""),
            "author": "openclaw",
            "version": "1.0.0",
            "tags": [skill.get("source", "local")],
            "emoji": skill.get("emoji", "📦"),
            "source": "local",
            "installed_at": skill.get("source", "local"),
        }
        local_installed.append(skill_info)
    
    # 合并：显式安装的 + 本地扫描的
    all_installed = explicit_installed + [s for s in local_installed if s["name"] not in explicit_names]
    return {"skills": all_installed}

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

@router.post("/open-directory/{skill_name}")
async def open_skill_directory(skill_name: str):
    """打开 Skill 所在目录"""
    import subprocess
    import sys
    
    skill_path = None
    
    # 首先从扫描到的本地 skills 中直接获取路径（已包含 path 字段）
    local_skills = _scan_local_skills()
    for skill in local_skills:
        if skill["name"] == skill_name:
            skill_path = skill.get("path")
            if skill_path:
                break
    
    # 如果找不到，尝试从已安装的 skills 中查找路径
    if not skill_path:
        installed = await _read_installed_skills()
        for skill in installed:
            if skill["name"] == skill_name:
                # 尝试从 installed_at 字段获取路径
                skill_path = skill.get("installed_at")
                if skill_path and skill_path != str(Path().absolute()):
                    break
                skill_path = None
    
    # 如果仍然找不到，尝试多个可能的路径
    if not skill_path:
        possible_paths = [
            Path.home() / ".openclaw" / "workspace" / "skills" / skill_name,
            Path.home() / ".clawteamharness" / "skills" / skill_name,
            Path.home() / ".openclaw" / "extensions" / skill_name,
            Path.home() / ".openclaw" / "skills" / skill_name,
            Path("/usr/local/lib/node_modules/openclaw/skills") / skill_name,
        ]
        for p in possible_paths:
            if p.exists():
                skill_path = str(p)
                break
    
    if not skill_path:
        # Skill 目录不存在，返回错误
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' 目录不存在")
    
    # 使用系统命令打开目录
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", skill_path], check=True)
        elif sys.platform == "linux":
            subprocess.run(["xdg-open", skill_path], check=True)
        elif sys.platform == "win32":
            subprocess.run(["explorer", skill_path], check=True)
        else:
            raise HTTPException(status_code=500, detail=f"Unsupported platform: {sys.platform}")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to open directory: {e}")
    
    return {"success": True, "path": skill_path, "message": f"已打开 {skill_name} 目录"}
