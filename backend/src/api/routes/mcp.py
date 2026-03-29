from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ...mcp.config import MCPServerConfigStore, MCPServerConfig

router = APIRouter(prefix="/api/mcp/servers", tags=["mcp"])

store = MCPServerConfigStore()


class MCPServerCreateRequest(BaseModel):
    server_id: str
    name: str
    endpoint: str
    auth_token: Optional[str] = None


@router.get("/")
async def list_mcp_servers():
    """列出所有 MCP Server"""
    return {"servers": store.list_servers()}


@router.post("/")
async def add_mcp_server(request: MCPServerCreateRequest):
    """添加一个新的 MCP Server"""
    server = MCPServerConfig(
        server_id=request.server_id,
        name=request.name,
        endpoint=request.endpoint,
        auth_token=request.auth_token,
    )
    store.add_server(server)
    return {"status": "added", "server_id": server.server_id}


@router.get("/{server_id}")
async def get_mcp_server(server_id: str):
    """获取指定 MCP Server 配置"""
    server = store.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found")
    return server


@router.delete("/{server_id}")
async def delete_mcp_server(server_id: str):
    """删除指定的 MCP Server"""
    success = store.remove_server(server_id)
    if not success:
        raise HTTPException(status_code=404, detail="MCP Server not found")
    return {"status": "deleted"}
