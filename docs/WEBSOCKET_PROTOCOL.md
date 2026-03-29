# WebSocket 调试面板协议

> 文档版本：V1.0  
> 日期：2026-03-29  
> 描述：前端调试面板与后端 WebSocket 通信协议

---

## 一、连接方式

### 1.1 WebSocket 端点

```
WS /ws/{session_id}?trace_id={trace_id}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 是 | 会话 ID，用于标识连接 |
| `trace_id` | string | 否 | Trace ID，用于关联特定执行链路 |

### 1.2 连接示例

```javascript
// 前端连接
const ws = new WebSocket("ws://localhost:8000/ws/session_123?trace_id=abc123");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  handleMessage(msg);
};
```

---

## 二、消息类型

### 2.1 服务器 → 客户端

#### 2.1.1 订阅确认 `subscribed`

```json
{
  "type": "subscribed",
  "session_id": "session_123",
  "trace_id": "abc123",
  "timestamp": "2026-03-29T12:00:00.000Z"
}
```

**触发时机：** WebSocket 连接建立后自动发送

---

#### 2.1.2 Trace Span 更新 `trace_span`

```json
{
  "type": "trace_span",
  "trace_id": "abc123",
  "span": {
    "span_id": "def456",
    "trace_id": "abc123",
    "name": "llm:gpt-4",
    "span_type": "llm",
    "parent_span_id": "root789",
    "start_time": "2026-03-29T12:00:01.000Z",
    "end_time": "2026-03-29T12:00:01.500Z",
    "duration_ms": 500.0,
    "status": "ok",
    "error_message": null,
    "input_data": {
      "model": "gpt-4",
      "message_count": 5
    },
    "output_data": {
      "response": "Hello! How can I help you?"
    }
  }
}
```

**触发时机：** 每个 Span 开始时和结束时

**span_type 值：**

| 值 | 说明 |
|----|------|
| `agent` | Agent 整体执行根 Span |
| `node` | 节点执行 Span |
| `llm` | LLM 调用 Span |
| `tool` | Tool/Skill 调用 Span |
| `condition` | 条件评估 Span |
| `api` | API 请求 Span |

**status 值：**

| 值 | 说明 |
|----|------|
| `ok` | 正常完成 |
| `error` | 执行出错 |
| `timeout` | 执行超时 |
| `cancelled` | 执行被取消 |

---

#### 2.1.3 节点状态更新 `node_status`

```json
{
  "type": "node_status",
  "trace_id": "abc123",
  "data": {
    "node_id": "llm_node",
    "node_type": "llm",
    "status": "completed",
    "duration_ms": 523.4,
    "timestamp": "2026-03-29T12:00:01.500Z"
  }
}
```

**触发时机：** 节点执行开始、完成、出错时

**status 值：** `started` | `completed` | `error` | `timeout`

---

#### 2.1.4 日志消息 `log`

```json
{
  "type": "log",
  "trace_id": "abc123",
  "data": {
    "level": "INFO",
    "logger": "agents.engine",
    "message": "Node executed successfully",
    "event": "node_executed",
    "node_id": "start",
    "duration_ms": 12.5,
    "timestamp": "2026-03-29T12:00:00.500Z"
  }
}
```

**level 值：** `DEBUG` | `INFO` | `WARNING` | `ERROR` | `CRITICAL`

---

#### 2.1.5 执行结果 `execution_result`

```json
{
  "type": "execution_result",
  "trace_id": "abc123",
  "data": {
    "status": "completed",
    "result": {
      "messages": [...],
      "context": {...},
      "final_result": "..."
    },
    "total_duration_ms": 2345.6,
    "spans_count": 12,
    "completed_at": "2026-03-29T12:00:02.500Z"
  }
}
```

**触发时机：** Agent 执行完成时

---

#### 2.1.6 错误消息 `error`

```json
{
  "type": "error",
  "trace_id": "abc123",
  "data": {
    "code": "NODE_EXECUTION_FAILED",
    "message": "LLM call timeout after 30s",
    "node_id": "llm_node",
    "details": {}
  }
}
```

---

### 2.2 客户端 → 服务器

#### 2.2.1 订阅 Trace `subscribe`

```json
{
  "type": "subscribe",
  "trace_id": "abc123"
}
```

**说明：** 订阅特定 trace_id 的调试流

---

#### 2.2.2 取消订阅 `unsubscribe`

```json
{
  "type": "unsubscribe",
  "trace_id": "abc123"
}
```

---

#### 2.2.3 Ping 心跳 `ping`

```json
{
  "type": "ping"
}
```

**服务器响应：** `{"type": "pong", "timestamp": "..."}`

---

## 三、前端调试面板状态机

```
[Disconnected]
     │
     ▼
[Connecting] ──(onopen)──► [Connected]
     │                         │
     │(onerror/onclose)       │
     ▼                         ▼
[Error] ◄───────────────── [Subscribed]
                                  │
                                  │ subscribe(trace_id)
                                  ▼
                             [Streaming]
                                  │
                                  │ execution_complete
                                  ▼
                             [Completed]
```

## 四、使用场景示例

### 4.1 场景一：用户触发 Agent 执行

**前端操作：**
1. 用户点击"执行"按钮
2. 前端调用 `POST /api/agents/{id}/execute`，获取 `trace_id`
3. 前端建立 WebSocket 连接：`ws:///ws/session_xxx?trace_id={trace_id}`
4. 订阅确认到达 → 进入 `Streaming` 状态
5. 实时接收 `trace_span`、`node_status`、`log` 消息
6. 收到 `execution_result` → 进入 `Completed` 状态
7. 展示执行结果和 Trace 链路图

### 4.2 场景二：实时调试

**前端操作：**
1. 前端打开调试面板，建立 WebSocket 连接（不传 trace_id）
2. 用户在画布上触发 Agent 执行
3. 前端接收所有 trace_span，渲染实时链路图
4. 点击任意 span 查看详情（输入、输出、耗时）

---

## 五、错误码对照表

| code | 说明 | 处理建议 |
|------|------|----------|
| `TRACE_NOT_FOUND` | trace_id 不存在或已过期 | 忽略或提示用户 |
| `SESSION_NOT_FOUND` | session_id 无效 | 重新建立连接 |
| `WS_CONNECTION_LIMIT` | 连接数超限 | 关闭旧连接后重试 |
| `INTERNAL_ERROR` | 服务器内部错误 | 查看 server logs |

---

## 六、消息频率建议

| 消息类型 | 预期频率 | 说明 |
|----------|----------|------|
| `trace_span` | 1-20 次/执行 | 每个节点开始/结束各一次 |
| `node_status` | 1-10 次/执行 | 节点状态变化时 |
| `log` | 10-100 次/执行 | 取决于日志级别配置 |
| `execution_result` | 1 次/执行 | 执行结束时 |

---

*文档维护：Cathy | 版本：V1.0*
