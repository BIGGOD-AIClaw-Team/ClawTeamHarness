from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
import asyncio
from pathlib import Path

# P0-1 修复: 导入安全加密模块
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from security import encrypt_value, decrypt_value, mask_api_key

router = APIRouter(prefix="/api/settings", tags=["settings"])

# settings.py at src/api/routes/settings.py -> parents[5] = ClawTeamHarness/
SETTINGS_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "settings.json"
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

# API Keys 加密存储文件
API_KEYS_FILE = SETTINGS_FILE.parent / "api_keys.json"

# 预置模型配置
PRESET_MODELS = {
    "openai": {"name": "OpenAI", "models": ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"], "capabilities": {"thinking": True, "tool_use": True, "vision": True, "embedding": True}},
    "anthropic": {"name": "Anthropic Claude", "models": ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": False}},
    "glm": {"name": "GLM (智谱)", "models": ["glm-4", "glm-4-plus", "glm-4v", "glm-3-turbo"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": True}},
    "minimax": {"name": "Minimax", "models": ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2.1"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": True}},
    "qwen": {"name": "Qwen (通义千问)", "models": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-turbo", "qwen-max-longcontext"], "capabilities": {"thinking": True, "tool_use": True, "vision": True, "embedding": True}},
    "doubao": {"name": "Doubao (豆包)", "models": ["doubao-pro-32k", "doubao-lite-32k", "doubao-pro-128k"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": False}},
    "wenxin": {"name": "Wenxin (文心一言)", "models": ["ernie-4.0-8k", "ernie-3.5-8k", "ernie-4.0-128k", "ernie-speed-128k"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": True}},
    "hunyuan": {"name": "Hunyuan (混元)", "models": ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"], "capabilities": {"thinking": True, "tool_use": False, "vision": True, "embedding": False}},
}

class LLMModelInfo(BaseModel):
    name: str
    models: List[str]
    capabilities: Dict[str, bool]

class DefaultLLMConfig(BaseModel):
    text: str = "gpt-4"
    embedding: str = "text-embedding-3-small"
    vision: str = "gpt-4o"
    tool_use: str = "gpt-4"

class SystemSettings(BaseModel):
    default_llm: DefaultLLMConfig = DefaultLLMConfig()
    llm_providers: Dict[str, LLMModelInfo] = {}
    log_level: str = "INFO"

    def __init__(self, **data):
        # 构建 llm_providers 结构
        if "llm_providers" not in data:
            data["llm_providers"] = {}
            for k, v in PRESET_MODELS.items():
                data["llm_providers"][k] = {"name": v["name"], "models": v["models"], "capabilities": v["capabilities"]}
        super().__init__(**data)

class APIKeyUpdateRequest(BaseModel):
    provider: str
    api_key: str

class APIKeyResponse(BaseModel):
    provider: str
    api_key_masked: str
    has_key: bool

async def _load_settings() -> SystemSettings:
    """异步加载设置"""
    if not SETTINGS_FILE.exists():
        return SystemSettings()
    try:
        content = await asyncio.to_thread(SETTINGS_FILE.read_text, encoding="utf-8")
        data = json.loads(content)
        return SystemSettings(**data)
    except (json.JSONDecodeError, OSError):
        return SystemSettings()

async def _save_settings(settings: SystemSettings):
    """异步保存设置"""
    content = json.dumps(settings.model_dump(), indent=2, ensure_ascii=False)
    await asyncio.to_thread(SETTINGS_FILE.write_text, content, encoding="utf-8")

async def _load_api_keys() -> Dict[str, str]:
    """异步加载加密的 API Keys"""
    if not API_KEYS_FILE.exists():
        return {}
    try:
        content = await asyncio.to_thread(API_KEYS_FILE.read_text, encoding="utf-8")
        return json.loads(content)
    except (json.JSONDecodeError, OSError):
        return {}

async def _save_api_keys(keys: Dict[str, str]):
    """异步保存加密的 API Keys"""
    content = json.dumps(keys, ensure_ascii=False, indent=2)
    await asyncio.to_thread(API_KEYS_FILE.write_text, content, encoding="utf-8")

async def _get_decrypted_api_key(provider: str) -> Optional[str]:
    """获取解密后的 API Key（仅内部使用）"""
    keys = await _load_api_keys()
    encrypted = keys.get(provider, "")
    if not encrypted:
        return None
    return decrypt_value(encrypted)

@router.get("/")
async def get_settings():
    """获取系统设置"""
    settings = await _load_settings()
    return settings

@router.put("/")
async def update_settings(settings: SystemSettings):
    """更新系统设置"""
    await _save_settings(settings)
    return {"status": "success", "message": "设置已保存"}

@router.get("/providers")
async def get_providers():
    """获取所有预置模型提供商"""
    return {"providers": PRESET_MODELS}

# P0-1 修复: API Key 管理接口 - 加密存储，只返回掩码
@router.get("/api-keys")
async def get_api_keys():
    """
    获取所有 API Key 掩码（不返回真实 Key）
    """
    keys = await _load_api_keys()
    result = []
    for provider in PRESET_MODELS.keys():
        encrypted = keys.get(provider, "")
        has_key = bool(encrypted)
        masked = mask_api_key(decrypt_value(encrypted)) if has_key else ""
        result.append({
            "provider": provider,
            "api_key_masked": masked,
            "has_key": has_key,
        })
    return {"api_keys": result}

@router.put("/api-key")
async def update_api_key(request: APIKeyUpdateRequest):
    """
    更新 API Key（加密存储）
    """
    if request.provider not in PRESET_MODELS:
        raise HTTPException(status_code=400, detail=f"不支持的 Provider: {request.provider}")
    
    keys = await _load_api_keys()
    # 加密存储
    encrypted = encrypt_value(request.api_key)
    keys[request.provider] = encrypted
    await _save_api_keys(keys)
    
    return {
        "status": "success",
        "message": f"API Key 已加密存储",
        "provider": request.provider,
        "api_key_masked": mask_api_key(request.api_key),
    }

@router.delete("/api-key/{provider}")
async def delete_api_key(provider: str):
    """删除 API Key"""
    keys = await _load_api_keys()
    if provider in keys:
        del keys[provider]
        await _save_api_keys(keys)
    return {"status": "success", "message": f"API Key 已删除"}

@router.post("/api-key/{provider}/test")
async def test_api_key(provider: str):
    """
    测试 API Key 是否有效
    """
    api_key = await _get_decrypted_api_key(provider)
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key 未设置")
    
    # 返回成功，让前端调用实际的测试接口
    return {"status": "ready", "provider": provider}
