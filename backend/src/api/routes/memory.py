from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

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

# 模拟 Memory 存储（后续需与 Phase 3 的 Memory 模块集成）
_memory_store = {
    "short_term": [],
    "long_term": [],
    "vector": [],
}

@router.post("/")
async def add_memory(request: MemoryAddRequest):
    """添加记忆"""
    if request.memory_type not in _memory_store:
        raise HTTPException(status_code=400, detail="Invalid memory_type")
    
    import uuid
    memory_id = str(uuid.uuid4())[:8]
    memory_item = {
        "id": memory_id,
        "content": request.content,
        "memory_type": request.memory_type,
        "metadata": request.metadata,
    }
    _memory_store[request.memory_type].append(memory_item)
    
    return {"status": "added", "memory_id": memory_id, "memory_type": request.memory_type}

@router.get("/")
async def get_memory(memory_type: str = "short_term", limit: int = 100):
    """获取记忆"""
    if memory_type not in _memory_store:
        raise HTTPException(status_code=400, detail="Invalid memory_type")
    
    memories = _memory_store[memory_type][:limit]
    return {"memories": memories, "memory_type": memory_type, "count": len(memories)}

@router.delete("/")
async def clear_memory(memory_type: str):
    """清除记忆"""
    if memory_type not in _memory_store:
        raise HTTPException(status_code=400, detail="Invalid memory_type")
    _memory_store[memory_type] = []
    return {"status": "cleared", "memory_type": memory_type}

@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    """删除指定记忆"""
    for mem_type, memories in _memory_store.items():
        for i, mem in enumerate(memories):
            if mem["id"] == memory_id:
                memories.pop(i)
                return {"status": "deleted", "memory_id": memory_id}
    raise HTTPException(status_code=404, detail="Memory not found")
