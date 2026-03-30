from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import json
import os

router = APIRouter(prefix="/api/models", tags=["models"])

# ============================================================
# Pydantic Models
# ============================================================

class ProviderCredential(BaseModel):
    """Provider 级别的统一凭证字段"""
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    api_type: Optional[str] = None
    api_version: Optional[str] = None
    auth_header: Optional[str] = None
    organization_id: Optional[str] = None
    default_model: Optional[str] = None  # 默认模型版本

class ModelProviderConfig(BaseModel):
    """模型 Provider 配置"""
    id: str
    name: str
    provider_type: str  # 'cloud' | 'local' | 'aggregation' | 'custom'
    icon: Optional[str] = None
    enabled: bool = True
    credentials: ProviderCredential = ProviderCredential()
    supported_kinds: List[str] = ["chat"]
    models: List[Dict[str, Any]] = []

class AddProviderRequest(BaseModel):
    """添加自定义 Provider 请求"""
    id: str
    name: str
    provider_type: str  # 'cloud' | 'local' | 'aggregation' | 'custom'
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    api_type: Optional[str] = None

class TestConnectionRequest(BaseModel):
    """测试连接请求"""
    provider_type: str
    base_url: str
    api_key: Optional[str] = None

class SaveProviderConfigRequest(BaseModel):
    """保存 Provider 配置请求"""
    provider_id: str
    enabled: bool = True
    credentials: ProviderCredential = ProviderCredential()

# ============================================================
# 内置 Provider 定义（预定义的云厂商）
# ============================================================

BUILTIN_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "openai": {
        "id": "openai",
        "name": "OpenAI",
        "provider_type": "cloud",
        "icon": "🤖",
        "api_endpoint": "https://api.openai.com/v1/models",
        "default_base_url": "https://api.openai.com/v1",
        "supported_kinds": ["chat", "completion", "embedding"],
    },
    "anthropic": {
        "id": "anthropic",
        "name": "Anthropic",
        "provider_type": "cloud",
        "icon": "🧠",
        "api_endpoint": "https://api.anthropic.com/v1/models",
        "default_base_url": "https://api.anthropic.com",
        "supported_kinds": ["chat"],
    },
    "glm": {
        "id": "glm",
        "name": "智谱 GLM",
        "provider_type": "cloud",
        "icon": "📊",
        "api_endpoint": "https://open.bigmodel.cn/api/paas/v4/models",
        "default_base_url": "https://open.bigmodel.cn/api/paas/v4",
        "supported_kinds": ["chat", "vision"],
    },
    "minimax": {
        "id": "minimax",
        "name": "MiniMax",
        "provider_type": "cloud",
        "icon": "🔵",
        "api_endpoint": "https://api.minimax.chat/v1/models",
        "default_base_url": "https://api.minimax.chat/v1",
        "supported_kinds": ["chat"],
    },
    "qwen": {
        "id": "qwen",
        "name": "阿里 Qwen",
        "provider_type": "cloud",
        "icon": "🟠",
        "api_endpoint": "https://dashscope.aliyuncs.com/api/v1/models",
        "default_base_url": "https://dashscope.aliyuncs.com",
        "supported_kinds": ["chat", "vision"],
    },
    "doubao": {
        "id": "doubao",
        "name": "字节豆包",
        "provider_type": "cloud",
        "icon": "🔴",
        "api_endpoint": "https://ark.cn-beijing.volces.com/api/v3/models",
        "default_base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "supported_kinds": ["chat"],
    },
    "wenxin": {
        "id": "wenxin",
        "name": "百度文心",
        "provider_type": "cloud",
        "icon": "🔶",
        "api_endpoint": "https://qianfan.baidubce.com/v2/models",
        "default_base_url": "https://aip.baidubce.com",
        "supported_kinds": ["chat"],
    },
    "hunyuan": {
        "id": "hunyuan",
        "name": "腾讯混元",
        "provider_type": "cloud",
        "icon": "🟣",
        "api_endpoint": "https://hunyuan.cloud.tencent.com/api/v1/models",
        "default_base_url": "https://hunyuan.cloud.tencent.com/api/v1",
        "supported_kinds": ["chat"],
    },
    "azure-openai": {
        "id": "azure-openai",
        "name": "Azure OpenAI",
        "provider_type": "aggregation",
        "icon": "☁️",
        "api_endpoint": None,
        "default_base_url": "",
        "supported_kinds": ["chat", "completion", "embedding"],
    },
}

# 本地服务 Provider 定义
LOCAL_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "ollama": {
        "id": "ollama",
        "name": "Ollama",
        "provider_type": "local",
        "icon": "🦙",
        "default_base_url": "http://localhost:11434",
        "models_endpoint": "/api/tags",
        "chat_endpoint": "/v1/chat/completions",
        "supported_kinds": ["chat"],
    },
    "vllm": {
        "id": "vllm",
        "name": "vLLM",
        "provider_type": "local",
        "icon": "⚡",
        "default_base_url": "http://localhost:8000",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "supported_kinds": ["chat"],
    },
    "lmstudio": {
        "id": "lmstudio",
        "name": "LM Studio",
        "provider_type": "local",
        "icon": "💻",
        "default_base_url": "http://localhost:1234",
        "models_endpoint": "/v1/models",
        "chat_endpoint": "/v1/chat/completions",
        "supported_kinds": ["chat"],
    },
}

# Fallback 模型列表（API 调用失败时返回）
FALLBACK_MODELS = {
    "openai": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini"],
    "anthropic": ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    "glm": ["glm-4", "glm-4-plus", "glm-3-turbo", "glm-4v", "glm-4v-plus"],
    "minimax": ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2.1", "abab6-chat", "abab5.5-chat", "abab6.5s-chat"],
    "qwen": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-turbo", "qwen-max-longcontext"],
    "doubao": ["doubao-pro-32k", "doubao-lite-32k", "doubao-pro-128k"],
    "wenxin": ["ernie-4.0-8k", "ernie-3.5-8k", "ernie-4.0-128k", "ernie-speed-128k"],
    "hunyuan": ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"],
}

# ============================================================
# 配置文件路径
# ============================================================

def get_config_path() -> str:
    """获取模型配置文件路径"""
    config_dir = os.path.expanduser("~/.clawteamharness")
    os.makedirs(config_dir, exist_ok=True)
    return os.path.join(config_dir, "model_providers.json")

def load_provider_configs() -> Dict[str, Any]:
    """加载已保存的 Provider 配置"""
    config_path = get_config_path()
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"providers": {}, "defaults": {}}

def save_provider_configs(configs: Dict[str, Any]) -> None:
    """保存 Provider 配置"""
    config_path = get_config_path()
    with open(config_path, "w") as f:
        json.dump(configs, f, indent=2)

# ============================================================
# API Endpoints
# ============================================================

@router.get("/providers")
async def get_providers():
    """获取所有可用的 Provider（包括内置和自定义）"""
    configs = load_provider_configs()
    
    # 合并内置 Provider
    all_providers = {}
    
    # 添加内置云厂商
    for provider_id, provider_def in BUILTIN_PROVIDERS.items():
        saved_config = configs.get("providers", {}).get(provider_id, {})
        all_providers[provider_id] = {
            **provider_def,
            "enabled": saved_config.get("enabled", True),
            "credentials": saved_config.get("credentials", {}),
            "models": saved_config.get("models", []),
        }
    
    # 添加本地服务
    for provider_id, provider_def in LOCAL_PROVIDERS.items():
        saved_config = configs.get("providers", {}).get(provider_id, {})
        all_providers[provider_id] = {
            **provider_def,
            "enabled": saved_config.get("enabled", True),
            "credentials": saved_config.get("credentials", {}),
            "models": saved_config.get("models", []),
        }
    
    # 添加用户自定义 Provider
    for provider_id, provider_data in configs.get("providers", {}).items():
        if provider_id not in all_providers:
            all_providers[provider_id] = provider_data
    
    # 按类型分组返回
    cloud_providers = [p for p in all_providers.values() if p.get("provider_type") == "cloud"]
    local_providers = [p for p in all_providers.values() if p.get("provider_type") == "local"]
    aggregation_providers = [p for p in all_providers.values() if p.get("provider_type") == "aggregation"]
    custom_providers = [p for p in all_providers.values() if p.get("provider_type") == "custom"]
    
    return {
        "cloud": cloud_providers,
        "local": local_providers,
        "aggregation": aggregation_providers,
        "custom": custom_providers,
        "defaults": configs.get("defaults", {}),
    }

@router.post("/providers")
async def add_provider(request: AddProviderRequest):
    """添加自定义 Provider"""
    configs = load_provider_configs()
    
    # 检查 ID 是否已存在
    if request.id in BUILTIN_PROVIDERS or request.id in LOCAL_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider ID '{request.id}' is reserved")
    
    provider_data = {
        "id": request.id,
        "name": request.name,
        "provider_type": request.provider_type,
        "icon": "🔧",
        "enabled": True,
        "credentials": {
            "base_url": request.base_url,
            "api_key": request.api_key,
            "api_type": request.api_type,
        },
        "models": [],
    }
    
    if "providers" not in configs:
        configs["providers"] = {}
    
    configs["providers"][request.id] = provider_data
    save_provider_configs(configs)
    
    return {"success": True, "provider": provider_data}

@router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: str):
    """删除自定义 Provider"""
    configs = load_provider_configs()
    
    # 不能删除内置 Provider
    if provider_id in BUILTIN_PROVIDERS or provider_id in LOCAL_PROVIDERS:
        raise HTTPException(status_code=400, detail="Cannot delete built-in providers")
    
    if provider_id not in configs.get("providers", {}):
        raise HTTPException(status_code=404, detail="Provider not found")
    
    del configs["providers"][provider_id]
    save_provider_configs(configs)
    
    return {"success": True}

@router.put("/providers/{provider_id}")
async def save_provider_config(provider_id: str, request: SaveProviderConfigRequest):
    """保存 Provider 配置"""
    configs = load_provider_configs()
    
    # 确保 providers 结构存在
    if "providers" not in configs:
        configs["providers"] = {}
    
    # 获取现有配置或使用默认值
    existing = configs["providers"].get(provider_id, {})
    
    # 合并新配置
    configs["providers"][provider_id] = {
        **existing,
        "enabled": request.enabled,
        "credentials": request.credentials.model_dump(),
    }
    
    save_provider_configs(configs)
    
    return {"success": True, "provider": configs["providers"][provider_id]}

@router.put("/providers/{provider_id}/defaults")
async def set_default_model(provider_id: str, kind: str):
    """设置默认模型"""
    configs = load_provider_configs()
    
    if "defaults" not in configs:
        configs["defaults"] = {}
    
    configs["defaults"][kind] = provider_id
    save_provider_configs(configs)
    
    return {"success": True, "defaults": configs["defaults"]}

@router.post("/test-connection")
async def test_connection(request: TestConnectionRequest):
    """测试 Provider 连接"""
    result = {
        "success": False,
        "connected": False,
        "models": [],
        "error": None,
    }
    
    try:
        base_url = request.base_url.rstrip("/")
        
        if request.provider_type == "ollama":
            # Ollama: GET /api/tags
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [m.get("name", m.get("model", "")) for m in data.get("models", [])]
                result["success"] = True
                result["connected"] = True
                result["models"] = models
        
        elif request.provider_type in ["vllm", "lmstudio", "custom"]:
            # vLLM / LM Studio / Custom: GET /v1/models
            headers = {}
            if request.api_key:
                headers["Authorization"] = f"Bearer {request.api_key}"
            
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{base_url}/v1/models", headers=headers)
                resp.raise_for_status()
                data = resp.json()
                models = [m.get("id", "") for m in data.get("data", [])]
                result["success"] = True
                result["connected"] = True
                result["models"] = models
        
        elif request.provider_type == "openai":
            # OpenAI 兼容格式
            headers = {"Authorization": f"Bearer {request.api_key or 'dummy'}"}
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{base_url}/v1/models", headers=headers)
                resp.raise_for_status()
                data = resp.json()
                models = [m.get("id", "") for m in data.get("data", [])]
                result["success"] = True
                result["connected"] = True
                result["models"] = models
        
        else:
            result["error"] = f"Unknown provider type: {request.provider_type}"
    
    except httpx.ConnectError:
        result["error"] = f"Cannot connect to {request.base_url}"
    except httpx.TimeoutException:
        result["error"] = "Connection timeout"
    except httpx.HTTPStatusError as e:
        result["error"] = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
    except Exception as e:
        result["error"] = str(e)
    
    return result

@router.get("/local/{provider_type}/models")
async def get_local_models(provider_type: str, base_url: str = None):
    """获取本地模型列表（Ollama / vLLM）"""
    result = {
        "success": False,
        "connected": False,
        "models": [],
        "error": None,
    }
    
    if provider_type not in LOCAL_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown local provider: {provider_type}")
    
    provider_def = LOCAL_PROVIDERS[provider_type]
    target_url = base_url or provider_def.get("default_base_url", "")
    
    if not target_url:
        raise HTTPException(status_code=400, detail="No base_url provided")
    
    try:
        target_url = target_url.rstrip("/")
        models_endpoint = provider_def.get("models_endpoint", "/v1/models")
        
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{target_url}{models_endpoint}")
            resp.raise_for_status()
            data = resp.json()
            
            if provider_type == "ollama":
                models = [
                    {
                        "id": m.get("name", ""),
                        "name": m.get("name", ""),
                        "model": m.get("model", ""),
                        "size": m.get("size", 0),
                        "modified_at": m.get("modified_at", ""),
                    }
                    for m in data.get("models", [])
                ]
            else:
                # vLLM / LM Studio 使用 OpenAI 兼容格式
                models = [
                    {
                        "id": m.get("id", ""),
                        "name": m.get("id", ""),
                        "object": m.get("object", ""),
                    }
                    for m in data.get("data", [])
                ]
            
            result["success"] = True
            result["connected"] = True
            result["models"] = models
    
    except httpx.ConnectError:
        result["error"] = f"Cannot connect to {target_url}"
    except httpx.TimeoutException:
        result["error"] = "Connection timeout"
    except Exception as e:
        result["error"] = str(e)
    
    return result

@router.post("/list")
async def list_models(request: dict):
    """根据 API Key 获取可用模型列表（向后兼容）
    
    注意：API 失败时返回错误信息，不再静默 fallback 到硬编码列表。
    前端需要正确处理 error 和 warning 字段。
    """
    provider = request.get("provider", "")
    api_key = request.get("api_key", "")
    base_url = request.get("base_url", "")
    
    provider_type = provider
    
    # 确定 API 端点
    if provider in BUILTIN_PROVIDERS:
        # 如果前端提供了 base_url，优先使用前端的（允许覆盖默认端点）
        if base_url:
            api_endpoint = f"{base_url.rstrip('/')}/models"
        else:
            api_endpoint = BUILTIN_PROVIDERS[provider].get("api_endpoint", "")
    elif provider in LOCAL_PROVIDERS:
        local_def = LOCAL_PROVIDERS[provider]
        base_url = base_url or local_def.get("default_base_url", "")
        api_endpoint = f"{base_url}{local_def.get('models_endpoint', '/v1/models')}"
    else:
        # 自定义 provider，必须提供 base_url
        if not base_url:
            return {
                "models": [],
                "error": f"Provider '{provider}' 是自定义 Provider，需要提供 base_url",
                "error_code": "missing_base_url",
                "warning": "请在设置中配置该 Provider 的 API 端点"
            }
        api_endpoint = f"{base_url.rstrip('/')}/models"
    
    if not api_endpoint:
        # API 端点未知，返回错误而非静默 fallback
        return {
            "models": [],
            "error": f"Provider '{provider}' 的 API 端点未知",
            "error_code": "unknown_endpoint",
            "warning": "请在设置中配置该 Provider 的 API 端点，或选择其他 Provider"
        }
    
    try:
        headers = {}
        
        if provider == "anthropic":
            headers["x-api-key"] = api_key
            headers["anthropic-version"] = "2023-06-01"
        elif provider == "wenxin":
            # 百度文心使用 AK/SK 认证
            import base64
            if len(api_key) > 50 and "." in api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            else:
                credentials = base64.b64encode(api_key.encode()).decode()
                headers["Authorization"] = f"Basic {credentials}"
            headers["Content-Type"] = "application/json"
        elif api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(api_endpoint, headers=headers, timeout=10)
            data = resp.json()
        
        # 提取模型列表
        models = []
        raw_data = data.get("data") or data.get("models") or []
        
        if provider == "openai" or provider in ["vllm", "lmstudio", "custom"]:
            models = [m["id"] for m in raw_data if isinstance(m, dict) and "id" in m]
        elif provider == "anthropic":
            models = [m["id"] for m in raw_data if isinstance(m, dict) and "id" in m]
        elif provider == "glm":
            if isinstance(raw_data, dict):
                models = [m.get("model") or m.get("id") for m in raw_data.get("models", []) if isinstance(m, dict)]
            elif isinstance(raw_data, list):
                models = [m.get("model") or m.get("id") for m in raw_data if isinstance(m, dict)]
        elif provider == "qwen":
            models = [m["id"] for m in raw_data if isinstance(m, dict) and "id" in m]
        elif provider == "doubao":
            for m in raw_data if isinstance(raw_data, list) else []:
                if isinstance(m, dict):
                    models.append(m.get("id") or m.get("model") or m.get("name"))
            if not models and isinstance(data, dict):
                for key in ["data", "models", "items"]:
                    sub = data.get(key)
                    if isinstance(sub, list):
                        for item in sub:
                            if isinstance(item, dict):
                                models.append(item.get("id") or item.get("model") or item.get("name"))
                        if models:
                            break
        elif provider == "wenxin":
            for m in raw_data if isinstance(raw_data, list) else []:
                if isinstance(m, dict):
                    models.append(m.get("model") or m.get("id"))
        elif provider == "hunyuan":
            for m in raw_data if isinstance(raw_data, list) else []:
                if isinstance(m, dict):
                    models.append(m.get("model") or m.get("id"))
        elif provider == "minimax":
            if isinstance(raw_data, list):
                for m in raw_data:
                    if isinstance(m, dict):
                        models.append(m.get("id") or m.get("model") or m.get("name"))
            if not models and isinstance(data, list):
                for m in data:
                    if isinstance(m, dict):
                        models.append(m.get("id") or m.get("model") or m.get("name"))
        elif provider == "ollama":
            for m in data.get("models", []) if isinstance(data.get("models"), list) else []:
                if isinstance(m, dict):
                    models.append(m.get("name") or m.get("model"))
        else:
            if isinstance(raw_data, list):
                for m in raw_data:
                    if isinstance(m, dict):
                        models.append(m.get("id") or m.get("model") or m.get("name"))
        
        # 去重并过滤空值
        models = [m for m in models if m]
        models = list(dict.fromkeys(models))  # 保持顺序去重
        
        if not models:
            # API 返回成功但没有模型数据，返回警告而非静默 fallback
            return {
                "models": [],
                "warning": f"API 返回成功但未发现可用模型，请检查 API Key 是否正确",
                "error_code": "no_models_found"
            }
        
        return {"models": models[:20]}
    
    except httpx.HTTPStatusError as e:
        # HTTP 错误（如 401 认证失败、403 权限不足等），返回具体错误信息
        error_detail = f"API 错误 (HTTP {e.response.status_code})"
        try:
            error_body = e.response.json()
            if "error" in error_body:
                if isinstance(error_body["error"], dict):
                    error_detail = error_body["error"].get("message", error_body["error"].get("type", error_detail))
                else:
                    error_detail = str(error_body["error"])
            elif "message" in error_body:
                error_detail = error_body["message"]
        except:
            pass
        
        # 针对常见错误码给出更友好的提示
        if e.response.status_code == 401:
            error_hint = "API Key 无效或已过期，请检查并更新"
        elif e.response.status_code == 403:
            error_hint = "权限不足，可能需要升级订阅或检查 API Key 权限"
        elif e.response.status_code == 429:
            error_hint = "请求过于频繁，请稍后重试"
        else:
            error_hint = "请检查 API Key、网络连接或 API 端点是否正确"
        
        # API 调用失败时，返回 fallback 模型列表（如果存在）
        fallback_models = FALLBACK_MODELS.get(provider, [])
        if fallback_models:
            return {
                "models": fallback_models[:10],  # 限制数量
                "error": error_detail,
                "error_hint": error_hint,
                "error_code": f"http_{e.response.status_code}",
                "warning": f"获取模型列表失败，已返回常见模型列表: {error_detail}",
                "is_fallback": True,
            }
        else:
            return {
                "models": [],
                "error": error_detail,
                "error_hint": error_hint,
                "error_code": f"http_{e.response.status_code}",
                "warning": f"获取模型列表失败: {error_detail}"
            }
    except httpx.RequestError as e:
        # 网络连接错误
        error_msg = str(e)
        if "Connection refused" in error_msg:
            error_hint = f"无法连接到 {provider}，请确认服务地址是否正确且服务正在运行"
        elif "Name or service not known" in error_msg or "getaddrinfo" in error_msg:
            error_hint = f"无法解析 {provider} 的域名，请检查网络连接"
        elif "ConnectTimeout" in error_msg or "ReadTimeout" in error_msg:
            error_hint = f"连接 {provider} 超时，请检查网络或服务状态"
        else:
            error_hint = f"无法连接到 {provider}，请检查网络连接和服务地址是否正确"
        
        # 网络错误时，返回 fallback 模型列表（如果存在）
        fallback_models = FALLBACK_MODELS.get(provider, [])
        if fallback_models:
            return {
                "models": fallback_models[:10],
                "error": f"连接失败: {error_msg}",
                "error_hint": error_hint,
                "error_code": "network_error",
                "warning": f"网络错误，已返回常见模型列表: {error_hint}",
                "is_fallback": True,
            }
        return {
            "models": [],
            "error": f"连接失败: {error_msg}",
            "error_hint": error_hint,
            "error_code": "network_error",
            "warning": error_hint
        }
    except Exception as e:
        # 未知错误时，也尝试返回 fallback 模型
        fallback_models = FALLBACK_MODELS.get(provider, [])
        if fallback_models:
            return {
                "models": fallback_models[:10],
                "error": f"获取模型列表时发生未知错误: {str(e)}",
                "error_hint": "请检查控制台日志获取更多信息",
                "error_code": "unknown",
                "warning": f"发生未知错误，已返回常见模型列表",
                "is_fallback": True,
            }
        else:
            return {
                "models": [],
                "error": f"获取模型列表时发生未知错误: {str(e)}",
                "error_hint": "请检查控制台日志获取更多信息",
                "error_code": "unknown"
            }
