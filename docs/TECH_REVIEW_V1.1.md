# V1.0 技术复盘 - V1.1 改进建议

> 评审人：Cathy（代码审查专家）  
> 日期：2026-03-29  
> 复盘范围：Agent 引擎、Skills 系统、Memory 系统、API 层

---

## 一、技术不足分析

### 1. Agent 引擎

| 问题 | 根因 | 建议 |
|------|------|------|
| **LangGraph checkpoint/replay 未完整实现** | `MemorySaver` 已配置但仅用于基本状态持久化，缺少 `suspend/resume` 机制和 checkpoint 枚举/回放能力 | 实现 `get_checkpoint_history()` 接口，支持从任意 checkpoint 恢复执行；添加 `thread_id` 管理 API |
| **节点执行无超时控制** | `_execute_node` 和 `node_fn` 均无 `asyncio.timeout` 或 `asyncio.wait_for` 包裹 | 为每个节点执行添加可配置的 `timeout` 参数（默认 30s），超时时触发异常恢复分支 |
| **状态管理缺少 schema 校验** | `AgentState` 使用 `TypedDict(total=False)` 宽松定义，无输入/输出 contract | 引入 Pydantic model 或 `typed-schema` 为每个节点定义 `input_schema`/`output_schema`，执行前校验 |
| **异常恢复路径不完整** | 节点异常仅记录 `error` 字段并返回，graph 不会自动重试或降级 | 实现重试策略（指数退避）、降级分支（fallback node）、死信队列（DLQ）机制 |
| **条件路由使用 `eval` 存在安全隐患** | `evaluate_condition()` 直接 `eval(condition, ...)` 执行任意 Python 表达式 | 切换为 AST parsing 的安全表达式引擎（如 `asteval`、`expr-eval`），或白名单函数集 |
| **图修改后旧 checkpoint 可能失效** | 无 checkpoint 迁移/版本管理 | 添加 `graph_version` 字段，checkpoint 不兼容时提示用户 |

### 2. Skills 系统

| 问题 | 根因 | 建议 |
|------|------|------|
| **热加载未真正实现** | `SkillRegistry` 是进程内单例，动态 `register`/`unregister` 后需重启进程才能加载新 skill 文件 | 实现基于文件监控（`watchdog`）的热加载：skill 目录文件变化时自动 `import_module` + `SkillRegistry.register()`；支持 `unregister` 后重新加载 |
| **依赖解析不完整** | `manifest["dependencies"]` 仅声明，无实际解析和安装流程 | 接入 `pip` 或 `poetry` 进行依赖解析；提供 `skills/requirements.txt` 机制；安装时检查版本冲突 |
| **错误隔离不完善** | `ToolNode._call_tool` 异常直接外抛，skill 执行错误可能污染 graph 状态 | 每个 skill 执行包裹在独立 `try/except`，错误转换为标准 `{"success": False, "error": "..."}` 结构；支持配置错误处理策略（propagate/retry/skip） |
| **skill 实例生命周期不清晰** | `SkillRegistry.get_instance()` 懒加载单例，但无 `cleanup()` 调用时机 | 引入 `SkillContext` 管理实例生命周期，graph 节点完成后统一调用 `skill.cleanup()`；支持带资源的 skill（DB连接池等） |
| **skill 版本管理缺失** | manifest 只有 `version` 字符串，无兼容性和迁移策略 | 添加语义化版本（semver）比较；V1.1 接口变更时支持 version range 声明和 adapter |

### 3. Memory 系统

| 问题 | 根因 | 建议 |
|------|------|------|
| **向量召回参数不可配置** | `VectorMemory.search(top_k=5)` 硬编码 `top_k`，`similarity_threshold` 根本未暴露 | `search()` 增加 `top_k` 和 `similarity_threshold` 参数；或从 `AppConfig` 读取配置；返回结果时标注 `distance` 供上层过滤 |
| **ChromaDB 无连接池化** | 每次 `_ensure_client()` 都可能创建新 `PersistentClient`，未复用连接 | 封装单例 `ChromaClient`；或使用 `chromadb.HttpClient` 模式连接独立 Chroma 服务；减少进程内连接竞争 |
| **记忆过期/清理策略缺失** | `VectorMemory` 和 `LongTermMemory` 均无 TTL 概念，SQLite 无分区/归档 | 添加 `created_at` 字段并实现 `cleanup()` 方法（基于时间或重要性）；向量记忆按 `metadata.ttl` 自动过期；提供手动 `vacuum` 机制 |
| **短期记忆无持久化** | `ShortTermMemory` 仅内存 `deque`，服务重启后丢失 | 支持将 `deque` 内容序列化到 SQLite；或定期 `checkpoint` 到 long-term memory |
| **向量搜索结果无重排序/过滤** | 直接返回 ChromaDB 结果，无 rerank 或业务规则过滤 | 提供 `SearchResult` 后处理器接口，支持基于 metadata、业务规则的重排序 |

### 4. API 层

| 问题 | 根因 | 建议 |
|------|------|------|
| **参数校验不完整** | `AgentCreateRequest` 等 Pydantic model 仅校验必填，未校验 `graph_def` 结构合法性 | 增加 `graph_def` 内部结构校验（nodes/edges 格式、循环引用检测、类型枚举校验）；引入 JSON Schema |
| **错误处理不统一** | 各路由直接 `HTTPException`，无全局异常处理器和统一错误响应格式 | 添加 `@app.exception_handler`，统一错误响应结构 `{"error": {...}, "request_id": "..."}` |
| **无限流机制** | API 无 `rate limiting`，攻击或误用可直接压垮后端 | 引入 `slowapi` 或 `flask-limiter` 风格的限流中间件；按 IP/API Key 维度限流；返回 `429 Too Many Requests` 和 `Retry-After` |
| **无鉴权机制** | API 完全公开，无 API Key 验证或 JWT | 添加 API Key 验证中间件（环境变量配置）；未来支持 JWT OAuth2；敏感操作增加权限校验 |
| **CORS 配置过于宽松** | `allow_origins=["*"]` 在生产环境是安全风险 | CORS origins 配置化（环境变量），生产环境限制具体域名 |
| **API 路由与后端实现耦合** | `agents.py` 直接操作文件系统（`./data/agents`），难以测试和扩展 | 引入 Repository 模式，将数据访问抽象为 `AgentRepository` 接口，支持数据库或对象存储后端 |

---

## 二、V1.1 技术改进

| 改进点 | 优先级 | 技术方案 |
|--------|--------|----------|
| **P0 - Agent 节点超时控制** | 🔴 高 | `asyncio.timeout` 包裹节点执行；`graph_def` 节点配置 `timeout_seconds`；超时时 graph 路由到 error handler 节点 |
| **P0 - API 参数校验增强** | 🔴 高 | 为 `graph_def` 引入 JSON Schema；循环引用检测；节点类型白名单校验 |
| **P0 - 限流中间件** | 🔴 高 | `slowapi` 集成；默认每 IP 100req/min；Agent execute 端点单独限流（10req/min） |
| **P1 - Skills 热加载** | 🟠 中高 | `watchdog` 文件监控；skill 目录变更时 `importlib.reload`；`SkillWatcher` 服务线程 |
| **P1 - Skill 错误隔离** | 🟠 中高 | skill 执行包裹 `try/except SkillError`；统一错误结构；引入 `on_error` 配置（propagate/retry/skip） |
| **P1 - ChromaDB 连接池/单例** | 🟠 中高 | 封装 `ChromaClientSingleton`；支持 `HttpClient` 模式；配置化 Chroma 服务地址 |
| **P1 - 记忆过期策略** | 🟠 中高 | `VectorMemory` 增加 `cleanup(max_age_days)`；`LongTermMemory` 增加 `archive_old()`；定时任务触发 |
| **P1 - API 统一错误处理** | 🟠 中高 | 全局 `ExceptionHandlerMiddleware`；统一 `APIError` 响应格式；`request_id` 透传 |
| **P2 - LangGraph checkpoint replay** | 🟡 中 | `list_checkpoints(thread_id)`；`resume_from(checkpoint_id)`；checkpoint 版本迁移 |
| **P2 - API 鉴权** | 🟡 中 | API Key 中间件（`X-API-Key` header）；环境变量配置 key 列表；敏感路由鉴权注解 |
| **P2 - 条件路由安全引擎** | 🟡 中 | 替换 `eval` 为 `asteval`；白名单数学函数 + `context`/`messages` 变量访问 |
| **P2 - Skill 依赖解析** | 🟡 中 | `manifest.dependencies` 解析；`pip install` 自动化；版本冲突检测 |
| **P3 - Agent 重试/降级策略** | 🟢 低 | 节点级别 `max_retries`、`retry_delay` 配置；指数退避；fallback 节点路由 |
| **P3 - 短期记忆持久化** | 🟢 低 | `ShortTermMemory.checkpoint()` → SQLite；服务重启恢复 |

---

## 三、快速修复清单（V1.1 最小可行改进）

```
1. [5min] 节点执行加 try/except，记录错误而非外抛
2. [15min] search() 增加 top_k 参数
3. [30min] API 加 slowapi 限流（3行代码）
4. [1h] 条件路由从 eval 切换为 asteval
5. [2h] Skill 热加载框架（watchdog + reload）
6. [2h] 全局异常处理器 + 统一错误格式
```

---

## 四、总结

V1.0 MVP 完成了核心功能闭环（Agent 编排 + Skills + Memory + API），但工程化程度偏低：

- **稳定性**：超时、错误隔离、限流等基础保护缺失
- **可扩展性**：热加载、依赖解析、checkpoint replay 均未实现
- **生产可用性**：CORS 宽松、无鉴权、无参数校验

建议 V1.1 聚焦 **P0 稳定性改进**（超时控制 + 限流 + 参数校验），P1/P2 分阶段迭代。

---

*评审人：Cathy | 评审时间：2026-03-29*
