from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import json
from pathlib import Path

router = APIRouter(prefix="/api/mcp-hub", tags=["mcp-hub"])

# 预设的 MCP Servers 列表
MCP_SERVERS = [
    {
        "name": "filesystem",
        "description": "文件系统操作 - 读写本地文件",
        "package": "@modelcontextprotocol/server-filesystem",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["filesystem", "file", "storage"]
    },
    {
        "name": "http",
        "description": "HTTP 请求 - 发送 HTTP 请求",
        "package": "@modelcontextprotocol/server-http",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["http", "request", "web"]
    },
    {
        "name": "brave-search",
        "description": "Brave 搜索 - 使用 Brave 搜索引擎",
        "package": "@modelcontextprotocol/server-brave-search",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["search", "brave", "web"]
    },
    {
        "name": "github",
        "description": "GitHub - GitHub API 操作",
        "package": "@modelcontextprotocol/server-github",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["github", "git", "developer"]
    },
    {
        "name": "sqlite",
        "description": "SQLite 数据库 - 本地 SQLite 操作",
        "package": "@modelcontextprotocol/server-sqlite",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["sqlite", "database", "db"]
    },
    {
        "name": "memory",
        "description": "内存存储 - 基于向量数据库的内存",
        "package": "@modelcontextprotocol/server-memory",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["memory", "vector", "storage"]
    },
    {
        "name": "slack",
        "description": "Slack - Slack 消息发送",
        "package": "@modelcontextprotocol/server-slack",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["slack", "messaging", "chat"]
    },
    {
        "name": "aws-kb-retrieval",
        "description": "AWS 知识库检索 - Amazon Bedrock 知识库",
        "package": "@modelcontextprotocol/server-aws-kb-retrieval",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["aws", "bedrock", "knowledge-base"]
    },
    {
        "name": "google-maps",
        "description": "Google 地图 - 地点和路线查询",
        "package": "@modelcontextprotocol/server-google-maps",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["google", "maps", "geolocation"]
    },
    {
        "name": "puppeteer",
        "description": "Puppeteer - 浏览器自动化",
        "package": "@modelcontextprotocol/server-puppeteer",
        "author": "modelcontextprotocol",
        "version": "latest",
        "tags": ["browser", "automation", "puppeteer"]
    },
]

# 本地已安装 MCP Servers 存储
INSTALLED_SERVERS_FILE = Path("./data/installed_mcp_servers.json")

def get_installed_servers() -> List[dict]:
    """获取已安装的 MCP Servers"""
    if INSTALLED_SERVERS_FILE.exists():
        try:
            return json.loads(INSTALLED_SERVERS_FILE.read_text(encoding="utf-8"))
        except:
            pass
    return []

def save_installed_servers(servers: List[dict]):
    """保存已安装的 MCP Servers"""
    INSTALLED_SERVERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    INSTALLED_SERVERS_FILE.write_text(json.dumps(servers, ensure_ascii=False, indent=2), encoding="utf-8")

@router.get("/list")
async def list_mcp_servers():
    """列出可用的 MCP Servers"""
    # 检查哪些已安装
    installed = get_installed_servers()
    installed_names = {s["name"] for s in installed}
    
    result = []
    for server in MCP_SERVERS:
        server_info = {
            "name": server["name"],
            "description": server["description"],
            "package": server["package"],
            "author": server["author"],
            "version": server["version"],
            "tags": server["tags"],
            "installed": server["name"] in installed_names,
        }
        result.append(server_info)
    
    return {"servers": result}

@router.get("/installed")
async def list_installed_servers():
    """列出已安装的 MCP Servers"""
    return {"servers": get_installed_servers()}

@router.post("/install/{server_name}")
async def install_mcp_server(server_name: str):
    """安装 MCP Server (通过 npm)"""
    # 查找 server 配置
    server_config = None
    for server in MCP_SERVERS:
        if server["name"] == server_name:
            server_config = server
            break
    
    if not server_config:
        raise HTTPException(status_code=404, detail=f"MCP Server '{server_name}' 不存在")
    
    # 检查是否已安装
    installed = get_installed_servers()
    if any(s["name"] == server_name for s in installed):
        raise HTTPException(status_code=400, detail=f"MCP Server '{server_name}' 已安装")
    
    # 检查 npm 是否可用
    try:
        result = subprocess.run(
            ["npm", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="npm 未安装或不可用")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise HTTPException(status_code=500, detail="npm 未安装或不可用")
    
    # 安装 npm 包
    package_name = server_config["package"]
    try:
        install_result = subprocess.run(
            ["npm", "install", "-g", package_name],
            capture_output=True,
            text=True,
            timeout=120
        )
        if install_result.returncode != 0:
            # 安装失败，返回警告但不阻止
            error_msg = install_result.stderr or "安装失败"
            return {
                "status": "warning",
                "server": server_name,
                "message": f"npm 安装包 {package_name} 失败: {error_msg}",
                "manual_install": f"npm install -g {package_name}"
            }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="npm 安装超时")
    
    # 添加到已安装列表
    installed_server = {
        "name": server_config["name"],
        "description": server_config["description"],
        "package": server_config["package"],
        "author": server_config["author"],
        "version": server_config["version"],
        "tags": server_config["tags"],
        "installed_at": str(Path().absolute()),
    }
    installed.append(installed_server)
    save_installed_servers(installed)
    
    return {
        "status": "installed", 
        "server": server_name,
        "message": f"MCP Server '{server_name}' 安装成功"
    }

@router.post("/uninstall/{server_name}")
async def uninstall_mcp_server(server_name: str):
    """卸载 MCP Server"""
    installed = get_installed_servers()
    server_info = None
    for s in installed:
        if s["name"] == server_name:
            server_info = s
            break
    
    if not server_info:
        raise HTTPException(status_code=404, detail=f"MCP Server '{server_name}' 未安装")
    
    # 尝试卸载 npm 包
    package_name = server_info["package"]
    try:
        uninstall_result = subprocess.run(
            ["npm", "uninstall", "-g", package_name],
            capture_output=True,
            text=True,
            timeout=60
        )
    except subprocess.TimeoutExpired:
        pass  # 超时也继续删除记录
    
    # 从已安装列表移除
    installed = [s for s in installed if s["name"] != server_name]
    save_installed_servers(installed)
    
    return {
        "status": "uninstalled", 
        "server": server_name,
        "message": f"MCP Server '{server_name}' 已卸载"
    }

@router.get("/categories")
async def get_server_categories():
    """获取所有 MCP Server 分类"""
    categories = {}
    for server in MCP_SERVERS:
        for tag in server.get("tags", []):
            if tag not in categories:
                categories[tag] = []
            categories[tag].append(server["name"])
    return {"categories": categories}

@router.get("/installed/config")
async def get_mcp_config():
    """获取 MCP 配置文件内容 (用于复制到 OpenClaw 配置)"""
    installed = get_installed_servers()
    
    config_lines = []
    for server in installed:
        config_lines.append(f"# {server['name']} - {server['description']}")
        config_lines.append(f"# npm install -g {server['package']}")
        config_lines.append(f"{server['name']}:")
        config_lines.append(f"  command: npx")
        config_lines.append(f"  args: [-y, {server['package']}]")
        config_lines.append("")
    
    return {
        "config": "\n".join(config_lines),
        "servers": installed
    }
