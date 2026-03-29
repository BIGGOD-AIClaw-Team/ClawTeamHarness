"""LLM configuration and connection testing API."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import time
import httpx

router = APIRouter(prefix="/api/llm", tags=["llm"])


class LLMConfigRequest(BaseModel):
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: Optional[float] = 1.0


@router.post("/test")
async def test_llm_connection(config: LLMConfigRequest):
    """测试 LLM 连接"""
    start = time.time()
    error_msg = None
    error_code = "UNKNOWN"

    try:
        if config.provider == "openai":
            base_url = config.base_url or "https://api.openai.com/v1"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效，请检查是否正确"
                elif resp.status_code == 429:
                    error_code = "RATE_LIMIT"
                    error_msg = "请求过于频繁，请稍后重试"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "anthropic":
            base_url = config.base_url or "https://api.anthropic.com/v1"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/messages",
                    headers={
                        "x-api-key": config.api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "max_tokens": 5,
                        "messages": [{"role": "user", "content": "hi"}],
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code == 429:
                    error_code = "RATE_LIMIT"
                    error_msg = "请求过于频繁"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "glm":
            base_url = config.base_url or "https://open.bigmodel.cn/api/paas/v4"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "qwen":
            base_url = config.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "doubao":
            base_url = config.base_url or "https://ark.cn-beijing.volces.com/api/v3"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "minimax":
            base_url = config.base_url or "https://api.minimax.chat/v1"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "wenxin":
            base_url = config.base_url or "https://qianfan.baidubce.com/v2"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        elif config.provider == "hunyuan":
            base_url = config.base_url or "https://hunyuan.cloud.tencent.com"
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {config.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": config.model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                if resp.status_code == 401:
                    error_code = "INVALID_KEY"
                    error_msg = "API Key 无效"
                elif resp.status_code != 200:
                    error_code = "API_ERROR"
                    error_msg = f"API 错误: {resp.status_code}"

        else:
            error_code = "UNSUPPORTED_PROVIDER"
            error_msg = f"不支持的 Provider: {config.provider}"

        latency_ms = round((time.time() - start) * 1000)

        if error_msg:
            return {
                "success": False,
                "error": error_msg,
                "error_code": error_code,
                "latency_ms": latency_ms,
            }

        return {"success": True, "latency_ms": latency_ms}

    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "请求超时，请检查网络或 Base URL",
            "error_code": "TIMEOUT",
            "latency_ms": round((time.time() - start) * 1000),
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"连接失败: {str(e)}",
            "error_code": "NETWORK_ERROR",
            "latency_ms": round((time.time() - start) * 1000),
        }
