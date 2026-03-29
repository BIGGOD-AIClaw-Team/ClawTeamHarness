from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api/models", tags=["models"])

class ModelsRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str = None

MODELS_API = {
    "openai": "https://api.openai.com/v1/models",
    "anthropic": "https://api.anthropic.com/v1/models",
    "glm": "https://open.bigmodel.cn/api/paas/v4/models",
    "minimax": "https://api.minimax.chat/v1/models",
    "qwen": "https://dashscope.aliyuncs.com/api/v1/models",
    "doubao": "https://ark.cn-beijing.volces.com/api/v3/models",
    "wenxin": "https://qianfan.baidubce.com/v2/models",
    "hunyuan": "https://hunyuan.cloud.tencent.com/api/v1/models",
}

FALLBACK_MODELS = {
    "openai": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini"],
    "anthropic": ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    "glm": ["glm-4", "glm-4-plus", "glm-3-turbo", "glm-4v", "glm-4v-plus"],
    "minimax": ["abab6-chat", "abab5.5-chat", "abab6.5s-chat"],
    "qwen": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-turbo", "qwen-max-longcontext"],
    "doubao": ["doubao-pro-32k", "doubao-lite-32k", "doubao-pro-128k"],
    "wenxin": ["ernie-4.0-8k", "ernie-3.5-8k", "ernie-4.0-128k", "ernie-speed-128k"],
    "hunyuan": ["hunyuan-pro", "hunyuan-standard", "hunyuan-lite"],
}

@router.post("/list")
async def list_models(request: ModelsRequest):
    """根据 API Key 获取可用模型列表，失败时返回 fallback 列表"""
    try:
        headers = {"Authorization": f"Bearer {request.api_key}"}

        if request.provider == "anthropic":
            headers["x-api-key"] = request.api_key
            headers["anthropic-version"] = "2023-06-01"
        elif request.provider == "wenxin":
            # 百度文心使用不同认证方式
            headers = {"Content-Type": "application/json"}

        base = request.base_url or MODELS_API.get(request.provider, "")
        if not base:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")

        async with httpx.AsyncClient() as client:
            resp = await client.get(base, headers=headers, timeout=10)
            data = resp.json()

        # 提取模型列表（各厂商格式不同，需要适配）
        models = []
        if request.provider == "openai":
            models = [m["id"] for m in data.get("data", [])]
        elif request.provider == "anthropic":
            models = [m["id"] for m in data.get("data", [])]
        elif request.provider == "glm":
            models = data.get("data", []) if isinstance(data.get("data"), list) else []
            if not models and isinstance(data, dict):
                # GLM 可能返回 {"data": {"models": [...]}}
                models = data.get("data", {}).get("models", [])
        elif request.provider == "qwen":
            models = [m["id"] for m in data.get("data", [])]
        elif request.provider == "doubao":
            models = [m["id"] for m in data.get("data", [])]
        elif request.provider == "wenxin":
            # 百度文心格式
            models = [m["model"] for m in data.get("data", [])]
        elif request.provider == "hunyuan":
            models = [m["model"] for m in data.get("data", [])]
        else:
            models = [str(m) for m in (data.get("data", []) or [])]

        # 确保返回至少有一些模型
        if not models:
            models = FALLBACK_MODELS.get(request.provider, [])

        return {"models": models[:20]}

    except httpx.HTTPStatusError as e:
        # HTTP 错误，返回 fallback 列表而不是报错
        fallback = FALLBACK_MODELS.get(request.provider, [])
        return {"models": fallback, "warning": f"API error, using fallback: {e.response.status_code}"}
    except httpx.RequestError as e:
        # 网络错误，返回 fallback 列表
        fallback = FALLBACK_MODELS.get(request.provider, [])
        return {"models": fallback, "warning": f"Network error, using fallback: {str(e)}"}
    except Exception as e:
        # 其他错误，返回 fallback 列表
        fallback = FALLBACK_MODELS.get(request.provider, [])
        return {"models": fallback, "warning": f"Error, using fallback: {str(e)}"}
