from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
import asyncio
from pathlib import Path

router = APIRouter(prefix="/api/settings", tags=["settings"])

# settings.py at src/api/routes/settings.py -> parents[5] = ClawTeamHarness/
SETTINGS_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "settings.json"
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

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
