from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
from pathlib import Path

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = Path("./data/settings.json")
SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

# 预置模型配置
PRESET_MODELS = {
    "openai": {
        "name": "OpenAI",
        "models": ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "capabilities": {
            "thinking": True,
            "tool_use": True,
            "vision": True,
            "embedding": True,
        }
    },
    "anthropic": {
        "name": "Anthropic Claude",
        "models": ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": False,
        }
    },
    "glm": {
        "name": "GLM (智谱)",
        "models": ["glm-4", "glm-4-plus", "glm-4v", "glm-3-turbo"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": True,
        }
    },
    "minimax": {
        "name": "Minimax",
        "models": ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2.1"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": True,
        }
    },
    "qwen": {
        "name": "Qwen (通义千问)",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-turbo", "qwen-max-longcontext"],
        "capabilities": {
            "thinking": True,
            "tool_use": True,
            "vision": True,
            "embedding": True,
        }
    },
    "doubao": {
        "name": "Doubao (豆包)",
        "models": ["doubao-pro-32k", "doubao-lite-32k", "doubao-pro-128k"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": False,
        }
    },
    "wenxin": {
        "name": "Wenxin (文心一言)",
        "models": ["ernie-4.0-8k", "ernie-3.5-8k", "ernie-4.0-128k", "ernie-speed-128k"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": True,
        }
    },
    "hunyuan": {
        "name": "Hunyuan (混元)",
        "models": ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"],
        "capabilities": {
            "thinking": True,
            "tool_use": False,
            "vision": True,
            "embedding": False,
        }
    },
}

class LLMModelInfo(BaseModel):
    name: str
    provider: str
    models: List[str]
    capabilities: Dict[str, bool]

class DefaultLLMConfig(BaseModel):
    text: str = "gpt-4"
    embedding: str = "text-embedding-3-small"
    vision: str = "gpt-4o"
    tool_use: str = "gpt-4"

class SystemSettings(BaseModel):
    default_llm: DefaultLLMConfig = DefaultLLMConfig()
    llm_providers: Dict[str, LLMModelInfo] = {
        k: LLMModelInfo(**v) for k, v in PRESET_MODELS.items()
    }
    log_level: str = "INFO"

def load_settings() -> SystemSettings:
    """加载设置"""
    if not SETTINGS_FILE.exists():
        return SystemSettings()
    try:
        with open(SETTINGS_FILE) as f:
            data = json.load(f)
        return SystemSettings(**data)
    except Exception:
        return SystemSettings()

def save_settings(settings: SystemSettings):
    """保存设置"""
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)

@router.get("/")
async def get_settings():
    """获取系统设置"""
    settings = load_settings()
    return settings

@router.put("/")
async def update_settings(settings: SystemSettings):
    """更新系统设置"""
    save_settings(settings)
    return {"status": "success", "message": "设置已保存"}

@router.get("/providers")
async def get_providers():
    """获取所有预置模型提供商"""
    return {"providers": PRESET_MODELS}
