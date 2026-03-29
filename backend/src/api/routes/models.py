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

@router.post("/list")
async def list_models(request: ModelsRequest):
    """根据 API Key 获取可用模型列表"""
    try:
        headers = {"Authorization": f"Bearer {request.api_key}"}

        if request.provider == "anthropic":
            headers["x-api-key"] = request.api_key
        elif request.provider == "wenxin":
            headers["Authorization"] = f"Bearer {request.api_key}"

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
        elif request.provider == "glm":
            models = data.get("data", [])
        elif request.provider == "qwen":
            models = [m["id"] for m in data.get("data", [])]
        elif request.provider == "anthropic":
            models = [m["id"] for m in data.get("data", [])]
        else:
            models = [str(m) for m in (data.get("data", []) or [])]

        return {"models": models[:20]}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
