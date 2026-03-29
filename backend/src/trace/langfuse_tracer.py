"""
Langfuse Tracer - 生产级分布式追踪
提供类似 Langfuse 的追踪能力，支持 LLM 调用、工具调用、Agent 步骤的追踪
"""
import os
import time
import logging
from typing import Optional, Any, Dict
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Langfuse 支持检测
langfuse_available = False
try:
    from langfuse import Langfuse
    from langfuse.decorators import observe
    from langfuse.context import callback_manager
    langfuse_available = True
except ImportError:
    logger.warning("langfuse not installed. Run: pip install langfuse")
    Langfuse = None
    observe = None
    callback_manager = None


class AgentTracer:
    """
    Agent 执行追踪器 - 集成 Langfuse
    支持: LLM 调用追踪、工具调用追踪、Agent 步骤追踪
    """
    
    def __init__(self):
        self._client = None
        self._enabled = False
        
        if langfuse_available:
            try:
                self._client = Langfuse(
                    public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
                    secret_key=os.getenv("LANGFUSE_SECRET_KEY", ""),
                    host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
                )
                self._enabled = bool(os.getenv("LANGFUSE_PUBLIC_KEY", ""))
                if self._enabled:
                    logger.info("Langfuse tracer initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Langfuse: {e}")
    
    @property
    def is_enabled(self) -> bool:
        return self._enabled and self._client is not None
    
    def trace_llm_call(
        self,
        prompt: str,
        model: str,
        response: str,
        latency_ms: float,
        provider: str = "openai",
        metadata: Optional[Dict] = None
    ):
        """追踪 LLM 调用"""
        if not self.is_enabled:
            return {"prompt": prompt, "model": model, "latency_ms": latency_ms, "traced": False}
        
        try:
            trace = self._client.trace(
                name="llm_call",
                input={"prompt": prompt, "model": model, "provider": provider},
                output={"response": response[:500] if response else ""},  # 截断避免存储过大
                metadata={
                    "model": model,
                    "provider": provider,
                    "latency_ms": latency_ms,
                    **(metadata or {})
                }
            )
            return {"trace_id": trace.id, "model": model, "latency_ms": latency_ms, "traced": True}
        except Exception as e:
            logger.error(f"Failed to trace LLM call: {e}")
            return {"prompt": prompt, "model": model, "latency_ms": latency_ms, "traced": False, "error": str(e)}
    
    def trace_tool_call(
        self,
        tool_name: str,
        input_data: Dict[str, Any],
        output: str,
        latency_ms: float = 0,
        metadata: Optional[Dict] = None
    ):
        """追踪工具调用"""
        if not self.is_enabled:
            return {"tool": tool_name, "traced": False}
        
        try:
            trace = self._client.trace(
                name="tool_call",
                input={"tool": tool_name, "input": input_data},
                output={"output": str(output)[:500] if output else ""},
                metadata={
                    "tool_name": tool_name,
                    "latency_ms": latency_ms,
                    **(metadata or {})
                }
            )
            return {"trace_id": trace.id, "tool": tool_name, "traced": True}
        except Exception as e:
            logger.error(f"Failed to trace tool call: {e}")
            return {"tool": tool_name, "traced": False, "error": str(e)}
    
    def trace_agent_step(
        self,
        step_name: str,
        input_data: Dict[str, Any],
        output: Any,
        metadata: Optional[Dict] = None
    ):
        """追踪 Agent 执行步骤"""
        if not self.is_enabled:
            return {"step": step_name, "traced": False}
        
        try:
            trace = self._client.trace(
                name="agent_step",
                input={"step": step_name, "input": input_data},
                output={"output": str(output)[:500] if output else ""},
                metadata={
                    "step_name": step_name,
                    **(metadata or {})
                }
            )
            return {"trace_id": trace.id, "step": step_name, "traced": True}
        except Exception as e:
            logger.error(f"Failed to trace agent step: {e}")
            return {"step": step_name, "traced": False, "error": str(e)}
    
    def create_generation(
        self,
        name: str,
        input: Dict[str, Any],
        output: Dict[str, Any],
        model: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        """创建 generation 事件 (用于 Langfuse 界面显示)"""
        if not self.is_enabled:
            return None
        
        try:
            return self._client.generation(
                name=name,
                input=input,
                output=output,
                model=model,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Failed to create generation: {e}")
            return None
    
    def score(self, name: str, value: float, comment: Optional[str] = None):
        """记录评分"""
        if not self.is_enabled:
            return
        
        try:
            self._client.score(
                name=name,
                value=value,
                comment=comment
            )
        except Exception as e:
            logger.error(f"Failed to score: {e}")


# 全局 tracer 实例
tracer = AgentTracer()


# 装饰器风格的追踪 (需要 langfuse 上下文)
if langfuse_available:
    def trace_async(name: str = None, as_type: str = "general"):
        """异步追踪装饰器"""
        def decorator(func):
            @observe(as_type=as_type, name=name)
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)
            return wrapper
        return decorator
else:
    def trace_async(name: str = None, as_type: str = "general"):
        """No-op when langfuse unavailable"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                return await func(*args, **kwargs)
            return wrapper
        return decorator
