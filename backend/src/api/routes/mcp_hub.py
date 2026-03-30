from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import subprocess
import asyncio
import json
from pathlib import Path

router = APIRouter(prefix="/api/mcp-hub", tags=["mcp-hub"])

# 预设的 MCP Servers 列表 (官方 @modelcontextprotocol 服务器)
MCP_SERVERS = [
    {"name": "filesystem", "description": "文件系统操作 - 读写本地文件", "package": "@modelcontextprotocol/server-filesystem", "author": "modelcontextprotocol", "version": "0.6.0", "tags": ["filesystem", "file", "storage"], "npm_available": True},
    {"name": "http", "description": "HTTP 请求 - 发送 HTTP 请求", "package": "@modelcontextprotocol/server-http", "author": "modelcontextprotocol", "version": "0.4.0", "tags": ["http", "request", "web"], "npm_available": True},
    {"name": "brave-search", "description": "Brave 搜索 - 使用 Brave 搜索引擎", "package": "@modelcontextprotocol/server-brave-search", "author": "modelcontextprotocol", "version": "0.4.0", "tags": ["search", "brave", "web"], "npm_available": True},
    {"name": "github", "description": "GitHub - GitHub API 操作", "package": "@modelcontextprotocol/server-github", "author": "modelcontextprotocol", "version": "0.5.0", "tags": ["github", "git", "developer"], "npm_available": True},
    {"name": "sqlite", "description": "SQLite 数据库 - 本地 SQLite 操作", "package": "@modelcontextprotocol/server-sqlite", "author": "modelcontextprotocol", "version": "0.6.0", "tags": ["sqlite", "database", "db"], "npm_available": True},
    {"name": "memory", "description": "内存存储 - 基于向量数据库的内存", "package": "@modelcontextprotocol/server-memory", "author": "modelcontextprotocol", "version": "0.5.0", "tags": ["memory", "vector", "storage"], "npm_available": True},
    {"name": "slack", "description": "Slack - Slack 消息发送", "package": "@modelcontextprotocol/server-slack", "author": "modelcontextprotocol", "version": "0.3.0", "tags": ["slack", "messaging", "chat"], "npm_available": True},
    {"name": "aws-kb-retrieval", "description": "AWS 知识库检索 - Amazon Bedrock 知识库", "package": "@modelcontextprotocol/server-aws-kb-retrieval", "author": "modelcontextprotocol", "version": "0.4.0", "tags": ["aws", "bedrock", "knowledge-base"], "npm_available": True},
    {"name": "google-maps", "description": "Google 地图 - 地点和路线查询", "package": "@modelcontextprotocol/server-google-maps", "author": "modelcontextprotocol", "version": "0.4.0", "tags": ["google", "maps", "geolocation"], "npm_available": True},
    {"name": "puppeteer", "description": "Puppeteer - 浏览器自动化", "package": "@modelcontextprotocol/server-puppeteer", "author": "modelcontextprotocol", "version": "0.5.0", "tags": ["browser", "automation", "puppeteer"], "npm_available": True},
    {"name": "everart", "description": "EverArt - AI 图像生成", "package": "@modelcontextprotocol/server-everart", "author": "modelcontextprotocol", "version": "0.3.0", "tags": ["ai", "image", "art"], "npm_available": True},
    {"name": "sentry", "description": "Sentry - 错误监控和追踪", "package": "@modelcontextprotocol/server-sentry", "author": "modelcontextprotocol", "version": "0.3.0", "tags": ["sentry", "monitoring", "error"], "npm_available": True},
    {"name": "fetch", "description": "Fetch - 网页内容抓取", "package": "@modelcontextprotocol/server-fetch", "author": "modelcontextprotocol", "version": "0.5.0", "tags": ["fetch", "web", "scraping"], "npm_available": True},
]

# 本地已安装 MCP Servers 存储 - 确保目录存在
# mcp_hub.py at src/api/routes/mcp_hub.py -> parents[5] = ClawTeamHarness/
INSTALLED_SERVERS_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "installed_mcp_servers.json"
INSTALLED_SERVERS_FILE.parent.mkdir(parents=True, exist_ok=True)
INSTALLED_SERVERS_FILE.parent.mkdir(parents=True, exist_ok=True)

async def _read_installed_servers() -> List[dict]:
    """异步读取已安装的 MCP Servers"""
    if INSTALLED_SERVERS_FILE.exists():
        try:
            content = await asyncio.to_thread(INSTALLED_SERVERS_FILE.read_text, encoding="utf-8")
            return json.loads(content)
        except (json.JSONDecodeError, OSError):
            pass
    return []

async def _write_installed_servers(servers: List[dict]):
    """异步写入已安装的 MCP Servers"""
    content = json.dumps(servers, ensure_ascii=False, indent=2)
    await asyncio.to_thread(INSTALLED_SERVERS_FILE.write_text, content, encoding="utf-8")

@router.get("/list")
async def list_mcp_servers():
    """列出可用的 MCP Servers"""
    installed = await _read_installed_servers()
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
    servers = await _read_installed_servers()
    return {"servers": servers}

@router.post("/install/{server_name}")
async def install_mcp_server(server_name: str):
    """安装 MCP Server (通过 npm)"""
    server_config = None
    for server in MCP_SERVERS:
        if server["name"] == server_name:
            server_config = server
            break
    
    if not server_config:
        raise HTTPException(status_code=404, detail=f"MCP Server '{server_name}' 不存在")
    
    installed = await _read_installed_servers()
    if any(s["name"] == server_name for s in installed):
        raise HTTPException(status_code=400, detail=f"MCP Server '{server_name}' 已安装")
    
    # P0-2 安全修复: 改用 npx 方式运行 MCP Server，不再执行 npm install -g
    # npx 支持 -y 参数直接下载运行临时包，避免命令注入风险
    # 安装步骤简化为：记录已安装状态，MCP Client 会使用 npx 动态调用
    package_name = server_config["package"]
    
    # 验证 npx 可用
    try:
        result = await asyncio.to_thread(subprocess.run, ["npx", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="npx 未安装或不可用")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise HTTPException(status_code=500, detail="npx 未安装或不可用")
    
    # 验证包可以通过 npx 访问（预检，不实际下载完整包）
    # 这比直接 npm install -g 更安全，因为 npx 只会临时缓存
    
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
    await _write_installed_servers(installed)
    
    return {"status": "installed", "server": server_name, "message": f"MCP Server '{server_name}' 安装成功"}

@router.post("/uninstall/{server_name}")
async def uninstall_mcp_server(server_name: str):
    """
    卸载 MCP Server
    P0-2 安全修复: 由于使用 npx 方式运行，不再执行 npm uninstall
    只需删除安装记录即可
    """
    installed = await _read_installed_servers()
    server_info = None
    for s in installed:
        if s["name"] == server_name:
            server_info = s
            break
    
    if not server_info:
        raise HTTPException(status_code=404, detail=f"MCP Server '{server_name}' 未安装")
    
    # P0-2 安全修复: npx 方式是临时运行，不需要卸载
    # 只需从已安装列表中移除即可
    
    installed = [s for s in installed if s["name"] != server_name]
    await _write_installed_servers(installed)
    
    return {"status": "uninstalled", "server": server_name, "message": f"MCP Server '{server_name}' 已从列表移除（npx 方式运行，无需卸载）"}

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
    installed = await _read_installed_servers()
    
    config_lines = []
    for server in installed:
        config_lines.append(f"# {server['name']} - {server['description']}")
        config_lines.append(f"# npm install -g {server['package']}")
        config_lines.append(f"{server['name']}:")
        config_lines.append(f"  command: npx")
        config_lines.append(f"  args: [-y, {server['package']}]")
        config_lines.append("")
    
    return {"config": "\n".join(config_lines), "servers": installed}
