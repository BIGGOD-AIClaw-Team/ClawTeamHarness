from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from ...memory.short_term import ShortTermMemory
from ...memory.long_term import LongTermMemory
from ...memory.vector import VectorMemory

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryAddRequest(BaseModel):
    content: str
    memory_type: str  # "short_term", "long_term", "vector"
    metadata: dict = {}


class MemoryItem(BaseModel):
    id: str
    content: str
    memory_type: str
    metadata: dict = {}


# 全局实例
_stm = ShortTermMemory(max_messages=100)
_ltm = None  # 懒加载
_vector = None  # 懒加载


def get_ltm():
    global _ltm
    if _ltm is None:
        _ltm = LongTermMemory()
    return _ltm


def get_vector():
    global _vector
    if _vector is None:
        _vector = VectorMemory()
    return _vector


@router.post("/")
async def add_memory(request: MemoryAddRequest):
    """添加记忆到对应类型"""
    if request.memory_type == "long_term":
        mem = get_ltm()
        mem.store(
            key=request.metadata.get("key", f"mem_{id(request.content)}"),
            value=request.content,
            importance=request.metadata.get("importance", 0),
        )
        return {"status": "added", "memory_type": request.memory_type}
    elif request.memory_type == "short_term":
        _stm.add(
            role=request.metadata.get("role", "user"),
            content=request.content,
            metadata=request.metadata,
        )
        return {"status": "added", "memory_type": request.memory_type}
    elif request.memory_type == "vector":
        mem = get_vector()
        doc_id = mem.add(request.content, metadata=request.metadata)
        return {"status": "added", "memory_type": request.memory_type, "doc_id": doc_id}
    else:
        raise HTTPException(status_code=400, detail="Invalid memory_type")


@router.get("/")
async def get_memory(memory_type: str = "short_term", limit: int = 100):
    """获取记忆"""
    if memory_type == "short_term":
        memories = _stm.get_all()
        return {"memories": memories, "memory_type": memory_type, "count": len(memories)}
    elif memory_type == "long_term":
        memories = get_ltm().get_all()
        return {"memories": memories, "memory_type": memory_type, "count": len(memories)}
    elif memory_type == "vector":
        mem = get_vector()
        count = mem.count()
        return {"count": count, "memory_type": memory_type}
    else:
        raise HTTPException(status_code=400, detail="Invalid memory_type")


@router.delete("/")
async def clear_memory(memory_type: str):
    """清除记忆"""
    if memory_type == "short_term":
        _stm.clear()
        return {"status": "cleared", "memory_type": memory_type}
    elif memory_type == "long_term":
        # LongTermMemory 不支持 clear_all，逐条删除
        ltm = get_ltm()
        for mem in ltm.get_all():
            ltm.delete(mem["key"])
        return {"status": "cleared", "memory_type": memory_type}
    elif memory_type == "vector":
        get_vector().clear()
        return {"status": "cleared", "memory_type": memory_type}
    else:
        raise HTTPException(status_code=400, detail="Invalid memory_type")


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    """删除指定记忆"""
    # Short-term memory uses incremental IDs, try to find and remove
    # This is a best-effort delete - for precise control, use specific type endpoints
    raise HTTPException(status_code=501, detail="Use specific memory type endpoint for deletion")
