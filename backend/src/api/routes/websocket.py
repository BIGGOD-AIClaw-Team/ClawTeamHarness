"""WebSocket API routes for real-time streaming."""
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict

router = APIRouter(tags=["websocket"])


class WSEventType:
    """WebSocket 事件类型定义"""
    NODE_START = "node_start"          # 节点开始执行
    NODE_COMPLETE = "node_complete"    # 节点执行完成
    TOKEN_STREAM = "token_stream"       # LLM 流式 token
    EXECUTION_COMPLETE = "execution_complete"  # 执行完成
    ERROR = "error"                     # 执行错误


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


async def send_event(session_id: str, event_type: str, data: dict) -> None:
    """
    向指定 session 发送 WebSocket 事件
    
    Args:
        session_id: 会话 ID
        event_type: 事件类型 (WSEventType.*)
        data: 事件数据
    """
    if session_id in manager.active_connections:
        await manager.active_connections[session_id].send_json({
            "type": event_type,
            "data": data,
            "timestamp": time.time(),
        })


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket 端点，用于实时流式通信"""
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # 处理接收到的消息，反射回客户端
            await manager.send_message(session_id, {
                "type": "echo",
                "data": data,
                "session_id": session_id,
            })
    except WebSocketDisconnect:
        manager.disconnect(session_id)
