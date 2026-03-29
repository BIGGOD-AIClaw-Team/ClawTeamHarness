# V1.2 技术改进方案 - Trace 系统与日志架构

> 评审人：Cathy（代码审查专家）  
> 日期：2026-03-29  
> 复盘范围：Trace 链路追踪设计、日志服务架构、API 中间件、UI/UX 技术支撑、P0 问题

---

## 一、当前状态评估

### 已有基础（值得保留）

| 模块 | 现状 | 评价 |
|------|------|------|
| `CircuitBreaker` | 已实现全局熔断器 | ✅ 可复用 |
| `execute_with_retry` | 节点级重试+退避 | ✅ 框架已成 |
| `CancellationToken` | 支持执行中断 | ✅ 设计合理 |
| `AgentEngine.execute()` | async generator 流式输出 | ✅ 基础可用 |
| `SkillRegistry` | 单例注册表模式 | ✅ 可扩展 |
| WebSocket 路由 | `routes/websocket.py` 已搭建 | ✅ 基础设施到位 |
| TaskQueue | 异步任务框架 | ✅ 可扩展 |

### 关键缺口（阻断性问题）

| 缺口 | 影响 | 优先级 |
|------|------|--------|
| **无 Trace 链路追踪** | Agent 执行黑盒，无法定位慢节点 | 🔴 P0 |
| **无结构化日志** | 日志分散、格式不一，难以关联排查 | 🔴 P0 |
| **API 无 Trace ID 透传** | 请求与 Agent 执行无法关联 | 🔴 P0 |
| **WebSocket 调试流未实现** | 前端无法实时展示 Agent 执行状态 | 🔴 P0 |
| **节点执行超时未配置化** | `asyncio.timeout` 包裹但无超时参数 | 🟡 P1 |
| `LLMNode._call_llm()` 调用后无日志 | LLM 调用无记录 | 🟡 P1 |

---

## 二、Trace 链路追踪系统设计

### 2.1 核心设计目标

1. **全链路追踪**：从 API 请求 → Agent 编排 → 节点执行 → LLM/Tool 调用 → 结果，全链路可追溯
2. **Span 粒度**：每个节点执行为一个 Span，支持嵌套父子关系
3. **Trace ID 透传**：HTTP Header `X-Trace-ID` 从 API 传入，贯穿 WebSocket 流式输出
4. **可观测性输出**：支持日志、内存结构、WebSocket 实时推送三路输出

### 2.2 目录结构

```
backend/src/trace/
├── __init__.py
├── span.py          # Span 数据结构
├── tracer.py        # TraceContext 上下文管理器
├── exporters.py     # 日志导出器、WebSocket 推送器
└── middleware.py    # API 中间件（自动注入 Trace ID）
```

### 2.3 Span 数据结构

```python
# backend/src/trace/span.py

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Optional, Any
from datetime import datetime


class SpanStatus:
    """Span 状态枚举"""
    OK = "ok"
    ERROR = "error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass
class Span:
    """
    追踪片段，代表一个独立的执行单元。
    
    支持树形嵌套：parent_span_id 建立父子关系。
    """
    span_id: str = field(default_factory=lambda: str(uuid.uuid4())[:16])
    trace_id: str = ""
    name: str = ""
    parent_span_id: Optional[str] = None
    span_type: str = "node"  # node | llm | tool | api | condition
    
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    
    status: str = SpanStatus.OK
    error_message: Optional[str] = None
    
    # 业务数据
    input_data: dict = field(default_factory=dict)
    output_data: dict = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)
    
    def end(self, status: str = SpanStatus.OK, output_data: Optional[dict] = None, 
            error: Optional[str] = None):
        """结束 Span，记录时长和结果"""
        self.end_time = time.time()
        self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        self.status = status
        if output_data is not None:
            self.output_data = output_data
        if error:
            self.error_message = error
            self.status = SpanStatus.ERROR
    
    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            "span_id": self.span_id,
            "trace_id": self.trace_id,
            "name": self.name,
            "parent_span_id": self.parent_span_id,
            "span_type": self.span_type,
            "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
            "end_time": datetime.fromtimestamp(self.end_time).isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "error_message": self.error_message,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "metadata": self.metadata,
        }


# 预创建常用 Span 类型的工厂函数
def create_api_span(trace_id: str, method: str, path: str) -> Span:
    """创建 API 请求 Span"""
    return Span(
        trace_id=trace_id,
        name=f"{method} {path}",
        span_type="api",
        metadata={"method": method, "path": path}
    )

def create_node_span(trace_id: str, node_id: str, node_type: str, 
                     parent_span_id: Optional[str] = None) -> Span:
    """创建节点执行 Span"""
    return Span(
        trace_id=trace_id,
        name=node_id,
        parent_span_id=parent_span_id,
        span_type="node",
        metadata={"node_type": node_type, "node_id": node_id}
    )

def create_llm_span(trace_id: str, model: str, parent_span_id: Optional[str] = None) -> Span:
    """创建 LLM 调用 Span"""
    return Span(
        trace_id=trace_id,
        name=f"llm:{model}",
        parent_span_id=parent_span_id,
        span_type="llm",
        metadata={"model": model}
    )

def create_tool_span(trace_id: str, tool_name: str, parent_span_id: Optional[str] = None) -> Span:
    """创建 Tool 执行 Span"""
    return Span(
        trace_id=trace_id,
        name=f"tool:{tool_name}",
        parent_span_id=parent_span_id,
        span_type="tool",
        metadata={"tool_name": tool_name}
    )
```

### 2.4 TraceContext 上下文管理器

```python
# backend/src/trace/tracer.py

from __future__ import annotations

import uuid
import logging
from contextvars import ContextVar
from typing import Optional
from .span import Span, SpanStatus, create_node_span, create_llm_span, create_tool_span
from .exporters import TraceExporter

logger = logging.getLogger(__name__)

# 使用 ContextVar 实现线程/协程安全的上下文
_current_trace_id: ContextVar[Optional[str]] = ContextVar("current_trace_id", default=None)
_current_span_stack: ContextVar[list[str]] = ContextVar("current_span_stack", default=[])

# 全局 Tracer 实例（单例）
_tracer_instance: Optional[TraceContext] = None


class TraceContext:
    """
    追踪上下文管理器。
    
    提供：
    - trace_id 管理（自动生成或从 Header 透传）
    - span 生命周期管理（start/end）
    - 父子关系追踪
    - 多 Exporter 输出
    
    使用方式：
    
        tracer = TraceContext(trace_id="abc123")
        with tracer.start_span("node_1") as span:
            # do work
            span.end(status=SpanStatus.OK, output_data={"result": "ok"})
        
        # 或使用 async context manager
        async with tracer.start_span_async("llm_node") as span:
            result = await call_llm()
            span.end(output_data={"response": result})
    """

    def __init__(self, trace_id: Optional[str] = None, exporters: Optional[list[TraceExporter]] = None):
        self.trace_id = trace_id or str(uuid.uuid4())[:16]
        self.spans: list[Span] = []
        self.exporters = exporters or []
        self._span_index: dict[str, Span] = {}

    def start_span(self, name: str, span_type: str = "node",
                   parent_span_id: Optional[str] = None) -> Span:
        """
        同步开始一个 Span。
        
        Args:
            name: Span 名称（通常为节点 ID）
            span_type: Span 类型 (node|llm|tool|api|condition)
            parent_span_id: 父 Span ID（默认使用当前栈顶）
        
        Returns:
            Span 实例
        """
        # 获取父 span
        if parent_span_id is None:
            stack = _current_span_stack.get()
            if stack:
                parent_span_id = stack[-1]

        span = Span(
            trace_id=self.trace_id,
            name=name,
            parent_span_id=parent_span_id,
            span_type=span_type,
        )
        
        self.spans.append(span)
        self._span_index[span.span_id] = span
        
        # 更新上下文
        stack = list(_current_span_stack.get())
        stack.append(span.span_id)
        _current_span_stack.set(stack)
        _current_trace_id.set(self.trace_id)
        
        logger.debug(f"[Trace:{self.trace_id}] Start span {span.span_id} ({name})")
        return span

    async def start_span_async(self, name: str, span_type: str = "node",
                                parent_span_id: Optional[str] = None) -> Span:
        """异步版本的 start_span"""
        return self.start_span(name, span_type, parent_span_id)

    def end_span(self, span: Span, status: str = SpanStatus.OK,
                 output_data: Optional[dict] = None, error: Optional[str] = None):
        """
        结束一个 Span。
        
        Args:
            span: 要结束的 Span
            status: 执行状态
            output_data: 输出数据
            error: 错误信息
        """
        span.end(status=status, output_data=output_data, error=error)
        
        # 从栈中弹出
        stack = list(_current_span_stack.get())
        if stack and stack[-1] == span.span_id:
            stack.pop()
            _current_span_stack.set(stack)
        
        # 导出到所有 Exporter
        for exporter in self.exporters:
            exporter.export(span)
        
        logger.info(
            f"[Trace:{self.trace_id}] End span {span.span_id} ({span.name}) "
            f"duration={span.duration_ms}ms status={status}"
        )

    def get_span(self, span_id: str) -> Optional[Span]:
        """根据 span_id 查找 Span"""
        return self._span_index.get(span_id)

    def get_current_span(self) -> Optional[Span]:
        """获取当前执行中的 Span（栈顶）"""
        stack = _current_span_stack.get()
        if stack:
            return self._span_index.get(stack[-1])
        return None

    def get_trace_tree(self) -> dict:
        """将 Span 列表构建为树形结构"""
        span_map = {s.span_id: s.to_dict() for s in self.spans}
        
        # 构建 children 关系
        children: dict[str, list] = {s.span_id: [] for s in self.spans}
        roots = []
        
        for s in self.spans:
            if s.parent_span_id and s.parent_span_id in children:
                children[s.parent_span_id].append(s.span_id)
            else:
                roots.append(s.span_id)
        
        def build_tree(span_id: str) -> dict:
            node = span_map[span_id]
            node["children"] = [build_tree(cid) for cid in children[span_id]]
            return node
        
        return {
            "trace_id": self.trace_id,
            "total_spans": len(self.spans),
            "total_duration_ms": sum(s.duration_ms or 0 for s in self.spans),
            "roots": [build_tree(r) for r in roots],
        }

    def export_all(self):
        """立即导出所有 Spans 到所有 Exporter"""
        for exporter in self.exporters:
            if hasattr(exporter, 'export_batch'):
                exporter.export_batch(self.spans)

    def to_dict(self) -> dict:
        """完整导出为字典"""
        return {
            "trace_id": self.trace_id,
            "total_spans": len(self.spans),
            "total_duration_ms": sum(s.duration_ms or 0 for s in self.spans),
            "spans": [s.to_dict() for s in self.spans],
        }


def get_current_trace_id() -> Optional[str]:
    """获取当前上下文的 trace_id"""
    return _current_trace_id.get()


def get_current_tracer() -> Optional[TraceContext]:
    """获取当前上下文中的 Tracer（需配合 middleware 使用）"""
    tid = _current_trace_id.get()
    if tid and _tracer_instance and _tracer_instance.trace_id == tid:
        return _tracer_instance
    return None
```

### 2.5 Exporter 导出器

```python
# backend/src/trace/exporters.py

from __future__ import annotations

import logging
import json
from pathlib import Path
from datetime import datetime
from typing import Protocol
from .span import Span

logger = logging.getLogger(__name__)


class TraceExporter(Protocol):
    """Trace 导出器协议"""
    def export(self, span: Span) -> None:
        """导出单个 Span"""
        ...
    
    def export_batch(self, spans: list[Span]) -> None:
        """批量导出 Spans"""
        ...


class LoggingExporter:
    """
    日志导出器 - 将 Span 写入结构化日志。
    
    日志格式：
    {
        "timestamp": "2026-03-29T12:00:00",
        "level": "INFO",
        "event": "span_end",
        "trace_id": "abc123",
        "span_id": "def456",
        "name": "llm_node",
        "span_type": "llm",
        "duration_ms": 234.5,
        "status": "ok"
    }
    """
    
    def __init__(self, log_dir: str = "./logs/traces"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._logger = logging.getLogger("trace")
        self._logger.setLevel(logging.INFO)
        
        if not self._logger.handlers:
            fh = logging.FileHandler(
                self.log_dir / f"trace_{datetime.now().date()}.log"
            )
            fh.setLevel(logging.INFO)
            formatter = logging.Formatter('%(message)s')
            fh.setFormatter(formatter)
            self._logger.addHandler(fh)
    
    def export(self, span: Span) -> None:
        """导出单个 Span 到日志"""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "event": "span_end",
            **{k: v for k, v in span.to_dict().items() if v is not None}
        }
        level = logging.INFO if span.status == "ok" else logging.ERROR
        self._logger.log(level, json.dumps(log_data))
    
    def export_batch(self, spans: list[Span]) -> None:
        """批量导出"""
        for span in spans:
            self.export(span)


class WebSocketExporter:
    """
    WebSocket 实时推送导出器。
    
    将 Span 状态实时推送到前端调试面板。
    """
    
    def __init__(self, connection_manager):
        """
        Args:
            connection_manager: routes.websocket.manager 实例
        """
        self.manager = connection_manager
    
    def export(self, span: Span) -> None:
        """实时推送 Span 更新到所有连接的 WebSocket 客户端"""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 在已有事件循环中调度任务
                asyncio.create_task(self._push(span))
            else:
                # 没有运行中的事件循环
                loop.run_until_complete(self._push(span))
        except RuntimeError:
            # 事件循环上下文不匹配，静默忽略
            pass
    
    async def _push(self, span: Span):
        """异步推送 Span"""
        try:
            await self.manager.broadcast({
                "type": "trace_span",
                "trace_id": span.trace_id,
                "span": span.to_dict(),
            })
        except Exception as e:
            logger.warning(f"Failed to push trace span: {e}")
    
    def export_batch(self, spans: list[Span]) -> None:
        """批量推送"""
        for span in spans:
            self.export(span)


class FileExporter:
    """
    JSON 文件导出器 - 将完整 Trace 写入文件。
    
    文件路径：./logs/traces/{trace_id}.json
    """
    
    def __init__(self, trace_dir: str = "./logs/traces"):
        self.trace_dir = Path(trace_dir)
        self.trace_dir.mkdir(parents=True, exist_ok=True)
    
    def export(self, span: Span) -> None:
        """单个 Span 暂存，最后批量写入"""
        # 单个 Span 不写入，由 export_batch 统一处理
        pass
    
    def export_batch(self, spans: list[Span]) -> None:
        """将完整 Trace 写入 JSON 文件"""
        if not spans:
            return
        
        trace_id = spans[0].trace_id
        filepath = self.trace_dir / f"{trace_id}.json"
        
        import json
        with open(filepath, "w") as f:
            json.dump({
                "trace_id": trace_id,
                "span_count": len(spans),
                "total_duration_ms": sum(s.duration_ms or 0 for s in spans),
                "spans": [s.to_dict() for s in spans],
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Trace {trace_id} exported to {filepath}")
```

### 2.6 API 中间件集成

```python
# backend/src/trace/middleware.py

from __future__ annotations

import uuid
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .tracer import TraceContext, _tracer_instance
from .exporters import LoggingExporter
from .span import create_api_span, SpanStatus

logger = logging.getLogger(__name__)


TRACE_HEADER = "X-Trace-ID"
TRACER_INSTANCE_KEY = "trace_context"


class TraceMiddleware(BaseHTTPMiddleware):
    """
    API 请求追踪中间件。
    
    功能：
    1. 自动生成或透传 Trace ID（从 X-Trace-ID Header）
    2. 为每个请求创建 API Span
    3. 将 TraceContext 挂载到 Request.state 供路由使用
    4. 在 Response Header 中返回 Trace ID
    """
    
    def __init__(self, app, exporters: list = None):
        super().__init__(app)
        self.exporters = exporters or [LoggingExporter()]
        global _tracer_instance
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # 获取或生成 Trace ID
        trace_id = request.headers.get(TRACE_HEADER) or str(uuid.uuid4())[:16]
        
        # 创建 Tracer
        tracer = TraceContext(trace_id=trace_id, exporters=self.exporters)
        global _tracer_instance
        _tracer_instance = tracer
        
        # 挂载到 Request.state
        request.state.trace_context = tracer
        
        # 创建 API Span
        span = create_api_span(trace_id, request.method, str(request.url.path))
        span.input_data = {
            "query_params": dict(request.query_params),
            "headers": {k: v for k, v in request.headers.items() 
                       if k.lower() not in ("authorization", "x-api-key")},
        }
        
        start_time = time.time()
        status_code = 200
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            span.end(
                status=SpanStatus.OK if status_code < 400 else SpanStatus.ERROR,
                output_data={"status_code": status_code},
            )
            return response
        except Exception as e:
            span.end(status=SpanStatus.ERROR, error=str(e))
            raise
        finally:
            # 在 Response Header 中返回 Trace ID
            if "response" in dir():
                response.headers[TRACE_HEADER] = trace_id
            else:
                # 异常情况下手动创建 Response
                pass
        
        return response


def get_trace_context(request: Request) -> TraceContext:
    """从 Request 获取 TraceContext"""
    return getattr(request.state, "trace_context", None)
```

---

## 三、日志服务架构

### 3.1 当前问题

| 问题 | 现状 |
|------|------|
| 日志分散 | 各模块直接 `logging.getLogger(__name__)`，无统一格式 |
| 格式不统一 | 无结构化输出，难以解析和搜索 |
| 无日志级别控制 | 全部打到 console，无文件持久化 |
| 敏感信息未过滤 | Authorization header 等直接记录 |

### 3.2 统一日志服务设计

```python
# backend/src/logging_service.py

from __future__ annotations

import logging
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Any


class StructuredLogFormatter(logging.Formatter):
    """
    结构化日志格式化器。
    
    输出 JSON 格式日志行：
    {
        "timestamp": "2026-03-29T12:00:00.123456",
        "level": "INFO",
        "logger": "agents.engine",
        "message": "Node executed",
        "trace_id": "abc123",
        "...": "..."
    }
    """
    
    def __init__(self, include_trace: bool = True, redact_keys: list = None):
        super().__init__()
        self.include_trace = include_trace
        self.redact_keys = set(redact_keys or [
            "authorization", "x-api-key", "api_key", "password", "token", "secret"
        ])
    
    def _redact(self, data: dict) -> dict:
        """脱敏敏感字段"""
        result = {}
        for k, v in data.items():
            k_lower = k.lower()
            if any(redact in k_lower for redact in self.redact_keys):
                result[k] = "***REDACTED***"
            elif isinstance(v, dict):
                result[k] = self._redact(v)
            else:
                result[k] = v
        return result
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 合并 extra 数据
        if hasattr(record, "extra_data"):
            log_data.update(self._redact(record.extra_data))
        
        # 添加 trace_id（如果有）
        if hasattr(record, "trace_id"):
            log_data["trace_id"] = record.trace_id
        
        return json.dumps(log_data, ensure_ascii=False)


class StructuredLogger:
    """
    结构化日志服务封装。
    
    提供类型安全的日志接口，自动携带上下文字段。
    
    使用方式：
        logger = StructuredLogger("agents.engine", trace_id="abc123")
        logger.info("node_executed", node_id="start", duration_ms=50)
        logger.error("node_failed", node_id="llm_node", error="timeout")
    """
    
    _instances: dict[str, logging.Logger] = {}
    _log_dir: Optional[Path] = None
    _initialized: bool = False
    
    def __init__(self, name: str, trace_id: Optional[str] = None,
                 log_dir: str = "./logs", level: str = "INFO"):
        self.name = name
        self.trace_id = trace_id
        self.logger = self._get_or_create_logger(name, log_dir, level)
    
    @classmethod
    def _get_or_create_logger(cls, name: str, log_dir: str, level: str) -> logging.Logger:
        """获取或创建 logger 实例"""
        if name in cls._instances:
            return cls._instances[name]
        
        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, level.upper(), logging.INFO))
        logger.handlers.clear()
        
        # Console handler
        console = logging.StreamHandler(sys.stdout)
        console.setLevel(logging.DEBUG)
        console.setFormatter(StructuredLogFormatter())
        logger.addHandler(console)
        
        # File handler
        if log_dir:
            log_path = Path(log_dir)
            log_path.mkdir(parents=True, exist_ok=True)
            
            fh = logging.FileHandler(log_path / f"{name.replace('.', '_')}.log")
            fh.setLevel(logging.DEBUG)
            fh.setFormatter(StructuredLogFormatter())
            logger.addHandler(fh)
        
        cls._instances[name] = logger
        return logger
    
    def _log(self, level: str, event: str, **kwargs):
        """内部日志方法"""
        extra = {"extra_data": {"event": event, **kwargs}}
        if self.trace_id:
            extra["trace_id"] = self.trace_id
        
        getattr(self.logger, level.lower())(event, extra=extra)
    
    def debug(self, event: str, **kwargs):
        self._log("DEBUG", event, **kwargs)
    
    def info(self, event: str, **kwargs):
        self._log("INFO", event, **kwargs)
    
    def warning(self, event: str, **kwargs):
        self._log("WARNING", event, **kwargs)
    
    def error(self, event: str, **kwargs):
        self._log("ERROR", event, **kwargs)
    
    def critical(self, event: str, **kwargs):
        self._log("CRITICAL", event, **kwargs)
    
    def with_trace(self, trace_id: str) -> "StructuredLogger":
        """返回带 trace_id 的新 Logger 实例"""
        return StructuredLogger(self.name, trace_id=trace_id)


# 全局日志服务初始化
def setup_logging(log_dir: str = "./logs", default_level: str = "INFO"):
    """
    初始化全局日志服务。
    
    应在 FastAPI app 启动时调用一次。
    """
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    # 设置根 logger
    root = logging.getLogger()
    root.setLevel(getattr(logging, default_level.upper(), logging.INFO))
    root.handlers.clear()
    
    # 全局 console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(StructuredLogFormatter())
    root.addHandler(console)
    
    # 按模块设置日志级别
    logging.getLogger("agents").setLevel(logging.DEBUG)
    logging.getLogger("skills").setLevel(logging.DEBUG)
    logging.getLogger("memory").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    logging.info("Logging system initialized", extra={"extra_data": {"log_dir": str(log_path)}})
```

### 3.3 Agent Engine 集成 Trace + 日志

```python
# backend/src/agents/engine.py 改动点

# 导入 trace 模块
from ..trace.tracer import TraceContext, SpanStatus
from ..trace.span import create_node_span, create_llm_span, create_tool_span
from ..trace.exporters import LoggingExporter, FileExporter
from ..logging_service import StructuredLogger

logger = StructuredLogger("agents.engine")


class AgentEngine:
    """
    LangGraph-based Agent orchestration engine (with Trace support).
    """
    
    def __init__(self, graph_def: dict, trace_exporters: list = None):
        self.graph_def = graph_def
        self.trace_exporters = trace_exporters or [LoggingExporter(), FileExporter()]
        self._nodes: dict[str, dict] = {}
        self._edges: list[dict] = []
        self._node_instances: dict[str, Any] = {}
        self.graph: StateGraph | None = self._build_graph()
    
    async def _execute_node(self, node_id: str, node_type: str, 
                            config: dict, state: AgentState,
                            tracer: TraceContext) -> Any:
        """Execute a single node with tracing"""
        from .nodes import LLMNode, ToolNode, ConditionNode
        
        # 根据节点类型创建对应 Span
        if node_type == "llm":
            model = config.get("model", "gpt-4")
            span = create_llm_span(tracer.trace_id, model)
        elif node_type == "tool":
            tool_name = config.get("tool_name", "")
            span = create_tool_span(tracer.trace_id, tool_name)
        else:
            span = create_node_span(tracer.trace_id, node_id, node_type)
        
        span.input_data = {"node_id": node_id, "config": config, "state_keys": list(state.keys())}
        
        # 获取当前节点 span 作为父 span
        current_span = tracer.get_current_span()
        if current_span:
            span.parent_span_id = current_span.span_id
        
        try:
            if node_type == "llm":
                node = LLMNode(...)
                result = await node.execute(state)
            elif node_type == "tool":
                node = ToolNode(...)
                result = await node.execute(state)
            elif node_type == "condition":
                node = ConditionNode(...)
                result = await node.execute(state)
            # ...
            
            span.end(status=SpanStatus.OK, output_data={"result": str(result)[:200]})
            tracer.end_span(span)
            return result
            
        except asyncio.TimeoutError:
            span.end(status=SpanStatus.TIMEOUT, error="Node execution timeout")
            tracer.end_span(span)
            raise
        except Exception as e:
            span.end(status=SpanStatus.ERROR, error=str(e))
            tracer.end_span(span)
            raise
    
    async def execute(self, initial_state: AgentState,
                      thread_id: str = "default",
                      cancellation_token: Optional[CancellationToken] = None,
                      trace_id: Optional[str] = None) -> AgentState:
        """
        Execute the graph with tracing support.
        """
        # 创建 TraceContext
        tracer = TraceContext(trace_id=trace_id, exporters=self.trace_exporters)
        logger = StructuredLogger("agents.engine", trace_id=tracer.trace_id)
        
        logger.info("execution_started", 
                    thread_id=thread_id, 
                    node_count=len(self._nodes))
        
        # 创建根 Span
        root_span = tracer.start_span("agent_execution", span_type="agent")
        
        try:
            async for state in self.graph.astream(initial_state, config):
                cancellation_token.check()
                final_state = state
                
                node_name = state.get("current_node", "unknown")
                logger.debug("node_completed", node=node_name)
                
                cancellation_token.check()
            
            root_span.end(status=SpanStatus.OK)
            tracer.end_span(root_span)
            tracer.export_all()
            
        except asyncio.CancelledError:
            root_span.end(status=SpanStatus.CANCELLED)
            tracer.end_span(root_span)
            logger.warning("execution_cancelled")
            return {"status": "cancelled", "state": final_state or initial_state}
        except Exception as e:
            root_span.end(status=SpanStatus.ERROR, error=str(e))
            tracer.end_span(root_span)
            logger.error("execution_failed", error=str(e))
            raise
        
        return final_state or initial_state
```

---

## 四、UI/UX 技术支撑方案

### 4.1 WebSocket 实时调试流

当前 `routes/websocket.py` 的 echo 实现需要升级为完整的调试面板支撑：

```python
# backend/src/api/routes/websocket.py 增强方案

class DebugStreamManager:
    """
    调试信息流管理器。
    
    将 Trace Span、节点状态、日志实时推送到前端调试面板。
    """
    
    def __init__(self):
        self._sessions: dict[str, set[WebSocket]] = {}  # session_id -> set of websockets
        self._trace_subscribers: dict[str, str] = {}   # session_id -> trace_id
    
    async def subscribe(self, websocket: WebSocket, session_id: str, trace_id: str = None):
        """订阅调试流"""
        await websocket.accept()
        
        if session_id not in self._sessions:
            self._sessions[session_id] = set()
        self._sessions[session_id].add(websocket)
        
        if trace_id:
            self._trace_subscribers[session_id] = trace_id
        
        # 发送订阅确认
        await websocket.send_json({
            "type": "subscribed",
            "session_id": session_id,
            "trace_id": trace_id,
        })
    
    async def push_trace_span(self, session_id: str, span: dict):
        """推送 Trace Span 更新"""
        if session_id not in self._sessions:
            return
        
        message = {
            "type": "trace_span",
            "data": span,
        }
        
        disconnected = set()
        for ws in self._sessions[session_id]:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.add(ws)
        
        # 清理断开的连接
        for ws in disconnected:
            self._sessions[session_id].discard(ws)
    
    async def push_node_status(self, session_id: str, node_id: str, status: str, 
                               duration_ms: float = None):
        """推送节点状态更新"""
        if session_id not in self._sessions:
            return
        
        message = {
            "type": "node_status",
            "data": {
                "node_id": node_id,
                "status": status,  # started | completed | error | timeout
                "duration_ms": duration_ms,
                "timestamp": datetime.now().isoformat(),
            }
        }
        
        for ws in self._sessions[session_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass
    
    async def push_log(self, session_id: str, level: str, message: str, meta: dict = None):
        """推送日志消息"""
        if session_id not in self._sessions:
            return
        
        ws_message = {
            "type": "log",
            "data": {
                "level": level,
                "message": message,
                "meta": meta or {},
                "timestamp": datetime.now().isoformat(),
            }
        }
        
        for ws in self._sessions[session_id]:
            try:
                await ws.send_json(ws_message)
            except Exception:
                pass
    
    async def push_result(self, session_id: str, result: dict):
        """推送执行结果"""
        if session_id not in self._sessions:
            return
        
        message = {
            "type": "execution_result",
            "data": result,
        }
        
        for ws in self._sessions[session_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass
```

### 4.2 前端调试面板数据结构

WebSocket 推送的完整消息协议：

```typescript
// 前端接收的消息类型

type WSMessage =
  | { type: "subscribed"; session_id: string; trace_id: string }
  | { type: "trace_span"; data: Span }
  | { type: "node_status"; data: NodeStatus }
  | { type: "log"; data: LogEntry }
  | { type: "execution_result"; data: any }
  | { type: "error"; message: string }

interface Span {
  span_id: string
  trace_id: string
  name: string
  span_type: "node" | "llm" | "tool" | "api" | "condition"
  parent_span_id: string | null
  start_time: string
  end_time: string | null
  duration_ms: number | null
  status: "ok" | "error" | "timeout" | "cancelled"
  error_message: string | null
  input_data: Record<string, any>
  output_data: Record<string, any>
}

interface NodeStatus {
  node_id: string
  status: "started" | "completed" | "error" | "timeout"
  duration_ms: number | null
  timestamp: string
}
```

### 4.3 API 层增强

在 `routes/agents.py` 中，为 execute 端点添加 trace 透传：

```python
@router.post("/{agent_id}/execute")
async def execute_agent(agent_id: str, 
                        request: AgentExecuteRequest,
                        trace_id: Optional[str] = Header(None, alias="X-Trace-ID")):
    """触发 Agent 执行（支持 Trace 透传）"""
    
    # 从 request.state 获取 middleware 注入的 tracer
    tracer: TraceContext = getattr(request.state, "trace_context", None)
    
    if tracer:
        logger = StructuredLogger("agents.api", trace_id=tracer.trace_id)
        logger.info("execute_request", agent_id=agent_id, input_keys=list(request.input_data.keys()))
    
    # ... 原有执行逻辑
    
    return {
        "status": "completed",
        "result": result,
        "trace_id": tracer.trace_id if tracer else None,
    }
```

---

## 五、P0 问题清单与改进优先级

### P0 - 阻断发布（V1.2 必须解决）

| # | 问题 | 当前状态 | 改进方案 | 预计工时 |
|---|------|----------|----------|----------|
| 1 | **无 Trace 链路追踪** | 完全缺失 | 实现 `backend/src/trace/` 模块 | 4h |
| 2 | **无结构化日志** | 各模块直接 logging | 实现 `logging_service.py` | 2h |
| 3 | **API 无 Trace ID 透传** | 无中间件 | 实现 `TraceMiddleware` | 1h |
| 4 | **WebSocket 调试流未实现** | 只有 echo | 实现 `DebugStreamManager` | 3h |
| 5 | **LLM 调用无日志记录** | `_call_llm()` 无任何日志 | 在 `_call_llm()` 加 StructuredLogger | 0.5h |

### P1 - 影响体验（V1.2 完成或 V1.3 继续）

| # | 问题 | 当前状态 | 改进方案 | 预计工时 |
|---|------|----------|----------|----------|
| 6 | **节点超时未配置化** | `asyncio.timeout` 包裹但无参数 | 节点 config 支持 `timeout_ms` | 1h |
| 7 | **条件路由 eval 安全** | 直接 `eval(condition, ...)` | 替换为 `ast.literal_eval` 限制 | 2h |
| 8 | **Skill 执行无隔离** | 异常直接外抛 | ToolNode 加 try/except 统一错误结构 | 1h |
| 9 | **无全局异常处理器** | 各路由直接 HTTPException | FastAPI 全局 exception_handler | 1h |
| 10 | **CORS 全开** | `allow_origins=["*"]` | 环境变量配置化 | 0.5h |

---

## 六、技术改进清单（V1.2）

### 6.1 Trace 系统（新增）

```
✅ backend/src/trace/__init__.py
✅ backend/src/trace/span.py           - Span 数据结构
✅ backend/src/trace/tracer.py         - TraceContext 上下文管理
✅ backend/src/trace/exporters.py     - LoggingExporter / WebSocketExporter / FileExporter
✅ backend/src/trace/middleware.py     - TraceMiddleware (API 层)
✅ backend/src/trace/__init__.py 导出
```

### 6.2 日志系统（新增）

```
✅ backend/src/logging_service.py      - StructuredLogger + 初始化
✅ backend/src/logging_service.py 中的 setup_logging()
```

### 6.3 Agent Engine 集成（改造）

```
🔧 backend/src/agents/engine.py        - 集成 TraceContext 到 execute()
🔧 backend/src/agents/nodes.py         - LLMNode._call_llm() 添加日志
```

### 6.4 API 层增强（改造）

```
🔧 backend/src/api/main.py             - 注册 TraceMiddleware
🔧 backend/src/api/routes/websocket.py - DebugStreamManager
🔧 backend/src/api/routes/agents.py   - trace_id 透传
```

### 6.5 WebSocket 协议定义（新增）

```
✅ docs/WEBSOCKET_PROTOCOL.md           - 调试面板消息协议
```

---

## 七、总结

### V1.2 核心目标

**从"能跑"到"能看"** —— V1.1 解决了核心功能可用性问题，V1.2 聚焦**可观测性**：

1. **Trace 链路追踪**：Agent 执行不再是黑盒，每个节点耗时、调用关系清晰可见
2. **结构化日志**：统一的 JSON 日志格式，支持 trace_id 关联，可直接接入 ELK/Loki
3. **WebSocket 实时流**：前端调试面板可实时展示执行状态、节点状态、日志
4. **API Trace 透传**：从 HTTP 请求到 Agent 执行全链路 trace_id 贯穿

### 与现有架构的兼容性

- `CircuitBreaker` → 继续复用
- `CancellationToken` → 继续复用
- `execute_with_retry` → 继续复用
- `SkillRegistry` → 继续复用
- 现有 WebSocket 路由 → 增强为 DebugStreamManager

### 交付物

1. `backend/src/trace/` 完整模块
2. `backend/src/logging_service.py` 统一日志
3. `docs/TECH_IMPROVEMENTS_V12.md` 本文档
4. `docs/WEBSOCKET_PROTOCOL.md` WebSocket 消息协议

---

*评审人：Cathy | 评审时间：2026-03-29*
