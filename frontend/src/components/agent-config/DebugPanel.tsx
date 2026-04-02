import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Button, Input, Tag, Spin, Timeline, message, Divider } from 'antd';
import {
  PlayCircleOutlined, ClearOutlined, CopyOutlined,
  CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

// ============ 类型定义 ============
interface ExecutionStep {
  id: string;
  timestamp: number;
  type: 'start' | 'llm_call' | 'tool_call' | 'tool_result' | 'memory_retrieval' | 'critique' | 'final' | 'error';
  title: string;
  detail?: string;
  duration_ms?: number;
  tokens_used?: number;
  success?: boolean;
}

interface TokenStats {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
}

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
  agentConfig: Record<string, any>;
}

// ============ 常量 ============
const STEP_ICONS: Record<string, React.ReactNode> = {
  start: <PlayCircleOutlined style={{ color: '#00d4ff' }} />,
  llm_call: <span style={{ color: '#7c3aed', fontSize: 12 }}>🤖</span>,
  tool_call: <span style={{ color: '#f59e0b', fontSize: 12 }}>🔧</span>,
  tool_result: <CheckCircleOutlined style={{ color: '#22c55e' }} />,
  memory_retrieval: <span style={{ color: '#3b82f6', fontSize: 12 }}>🧠</span>,
  critique: <span style={{ color: '#a855f7', fontSize: 12 }}>🔍</span>,
  final: <CheckCircleOutlined style={{ color: '#00ff88' }} />,
  error: <CloseCircleOutlined style={{ color: '#ff4757' }} />,
};

const STEP_COLORS: Record<string, string> = {
  start: '#00d4ff',
  llm_call: '#7c3aed',
  tool_call: '#f59e0b',
  tool_result: '#22c55e',
  memory_retrieval: '#3b82f6',
  critique: '#a855f7',
  final: '#00ff88',
  error: '#ff4757',
};

const COST_PER_1K_TOKENS: Record<string, number> = {
  'gpt-4o': 0.015,
  'gpt-4o-mini': 0.0015,
  'gpt-4-turbo': 0.03,
  'claude-3-5-sonnet-latest': 0.015,
  'claude-3-opus-latest': 0.075,
  default: 0.01,
};

// ============ 组件 ============
export function DebugPanel({ open, onClose, agentConfig }: DebugPanelProps) {
  const [testQuestion, setTestQuestion] = useState('');
  const [executing, setExecuting] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [streamingOutput, setStreamingOutput] = useState('');
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 自动滚动到输出底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamingOutput]);

  // 模拟执行流程（实际对接后端）
  const runExecution = async () => {
    if (!testQuestion.trim()) {
      message.warning('请输入测试问题');
      return;
    }
    if (!agentConfig?.llm_config?.api_key) {
      message.warning('请先在「模型配置」中配置 API Key');
      return;
    }

    setExecuting(true);
    setSteps([]);
    setStreamingOutput('');
    setTokenStats(null);
    setElapsedMs(0);

    // 启动计时器
    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);

    // 添加开始步骤
    addStep({
      id: `step_${Date.now()}_start`,
      timestamp: Date.now(),
      type: 'start',
      title: '开始执行',
      detail: testQuestion,
      success: true,
    });

    try {
      // 模拟：记忆检索
      await delay(300);
      if (!executing) return;
      addStep({
        id: `step_${Date.now()}_memory`,
        timestamp: Date.now(),
        type: 'memory_retrieval',
        title: '🧠 记忆检索',
        detail: '检索相关上下文记忆...',
        duration_ms: 120,
        success: true,
      });
      await delay(200);

      // 模拟：LLM 调用
      if (!executing) return;
      addStep({
        id: `step_${Date.now()}_llm`,
        timestamp: Date.now(),
        type: 'llm_call',
        title: '🤖 LLM 调用',
        detail: `${agentConfig.llm_config.provider} / ${agentConfig.llm_config.model}`,
        tokens_used: 0,
      });

      // 模拟流式输出
      const model = agentConfig.llm_config.model || 'default';
      const costPerK = COST_PER_1K_TOKENS[model] || COST_PER_1K_TOKENS.default;

      let fullOutput = '';
      let promptTokens = 0;
      let completionTokens = 0;

      // 模拟 prompt tokens
      promptTokens = Math.floor(testQuestion.length / 4);

      // 模拟流式响应
      const mockResponses = [
        `正在分析您的问题：${testQuestion}\n\n`,
        `根据我的理解，这个问题涉及以下几个方面：\n\n`,
        `1. **核心概念解析**\n2. **相关背景知识**\n3. **可能的解决方案**\n\n`,
        `让我进一步思考...\n\n`,
        `综合以上分析，我的建议是：\n\n`,
        `首先，建议您明确具体的需求和约束条件。\n\n`,
        `其次，可以考虑以下几个方向：\n`,
        `- 方案A：保守策略\n`,
        `- 方案B：平衡策略\n`,
        `- 方案C：激进策略\n\n`,
        `综合来看，**方案B** 可能最适合当前情况。\n\n`,
        `如有其他问题，欢迎继续提问！`,
      ];

      for (const chunk of mockResponses) {
        if (!executing) break;
        await delay(200 + Math.random() * 300);
        fullOutput += chunk;
        completionTokens += Math.floor(chunk.length / 4);
        setStreamingOutput(fullOutput);

        // 更新 LLM 步骤的 tokens
        setSteps(prev => prev.map(s =>
          s.id.includes('llm') ? { ...s, tokens_used: promptTokens + completionTokens } : s
        ));
      }

      if (!executing) return;

      // 完成 LLM 调用
      const totalTokens = promptTokens + completionTokens;
      const estimatedCost = (totalTokens / 1000) * costPerK;

      setTokenStats({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
      });

      // 最终步骤
      await delay(100);
      addStep({
        id: `step_${Date.now()}_final`,
        timestamp: Date.now(),
        type: 'final',
        title: '✅ 执行完成',
        duration_ms: Date.now() - startTime,
        success: true,
      });

      message.success('执行完成！');
    } catch (e: any) {
      addStep({
        id: `step_${Date.now()}_error`,
        timestamp: Date.now(),
        type: 'error',
        title: '❌ 执行失败',
        detail: e.message || '未知错误',
        success: false,
      });
      message.error(e.message || '执行失败');
    } finally {
      setExecuting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const addStep = (step: ExecutionStep) => {
    setSteps(prev => [...prev, step]);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const stopExecution = () => {
    setExecuting(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAll = () => {
    setSteps([]);
    setStreamingOutput('');
    setTokenStats(null);
    setElapsedMs(0);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(streamingOutput);
    message.success('已复制到剪贴板');
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🐛</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>调试面板</span>
          <Tag color="purple" style={{ marginLeft: 4 }}>V2</Tag>
        </div>
      }
      placement="right"
      width={520}
      onClose={onClose}
      open={open}
      styles={{
        mask: { background: 'rgba(0, 0, 0, 0.6)' },
        header: { background: 'rgba(0, 20, 40, 0.95)', borderBottom: '1px solid rgba(0, 212, 255, 0.2)' },
        body: { background: 'rgba(0, 10, 20, 0.98)', padding: 0 },
      }}
    >
      <div style={{ padding: '0 16px 16px' }}>
        {/* ========== 测试输入 ========== */}
        <div style={{
          padding: 16,
          background: 'rgba(0, 20, 40, 0.6)',
          borderRadius: 10,
          border: '1px solid rgba(0, 212, 255, 0.2)',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>
            🧪 输入测试问题
          </div>
          <TextArea
            value={testQuestion}
            onChange={e => setTestQuestion(e.target.value)}
            placeholder="输入一个问题来测试 Agent..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: '#e0e6ed',
              fontSize: 13,
              resize: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {executing ? (
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={stopExecution}
                style={{ flex: 1 }}
              >
                停止执行
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={runExecution}
                disabled={!testQuestion.trim()}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
                  border: 'none',
                }}
              >
                执行测试
              </Button>
            )}
            <Button
              icon={<ClearOutlined />}
              onClick={clearAll}
              style={{
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.3)',
                color: '#ff4757',
              }}
            >
              清空
            </Button>
          </div>
        </div>

        {/* ========== 计时器 & Token 统计 ========== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {/* 耗时 */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 8,
            border: '1px solid rgba(0, 212, 255, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>⏱️ 耗时</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: executing ? '#00d4ff' : '#fff', fontFamily: 'monospace' }}>
              {(elapsedMs / 1000).toFixed(1)}s
            </div>
          </div>

          {/* Token 统计 */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 8,
            border: '1px solid rgba(124, 58, 237, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>💎 Token</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>
              {tokenStats ? tokenStats.total_tokens.toLocaleString() : '--'}
            </div>
          </div>
        </div>

        {/* ========== 详细 Token 统计 ========== */}
        {tokenStats && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: '1px solid rgba(0, 212, 255, 0.15)',
            marginBottom: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>Prompt</div>
              <div style={{ fontSize: 13, color: '#00d4ff', fontWeight: 600 }}>{tokenStats.prompt_tokens.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>Completion</div>
              <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{tokenStats.completion_tokens.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>估算费用</div>
              <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
                ${tokenStats.estimated_cost?.toFixed(6) || '0.00'}
              </div>
            </div>
          </div>
        )}

        <Divider style={{ borderColor: 'rgba(0, 212, 255, 0.15)', margin: '12px 0' }} />

        {/* ========== 执行追踪 ========== */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            📋 执行追踪
            <Tag style={{ margin: 0, fontSize: 10, background: 'rgba(0, 212, 255, 0.1)', border: 'none', color: '#00d4ff' }}>
              {steps.length} 步
            </Tag>
          </div>

          <div style={{
            maxHeight: 300,
            overflow: 'auto',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: '1px solid rgba(0, 212, 255, 0.15)',
            padding: '12px 14px',
          }}>
            {steps.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', fontSize: 12, padding: '20px 0' }}>
                还没有执行步骤
              </div>
            ) : (
              <Timeline
                items={steps.map((step, idx) => ({
                  dot: STEP_ICONS[step.type] || <LoadingOutlined />,
                  color: STEP_COLORS[step.type] || '#00d4ff',
                  children: (
                    <div key={step.id} style={{ paddingBottom: idx === steps.length - 1 ? 0 : 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: '#e0e6ed', fontWeight: 500 }}>
                          {step.title}
                        </span>
                        {step.duration_ms !== undefined && (
                          <Tag style={{
                            margin: 0,
                            fontSize: 10,
                            background: 'rgba(0, 212, 255, 0.1)',
                            border: 'none',
                            color: '#00d4ff',
                          }}>
                            {step.duration_ms}ms
                          </Tag>
                        )}
                        {step.tokens_used !== undefined && step.tokens_used > 0 && (
                          <Tag style={{
                            margin: 0,
                            fontSize: 10,
                            background: 'rgba(124, 58, 237, 0.1)',
                            border: 'none',
                            color: '#a855f7',
                          }}>
                            {step.tokens_used} tokens
                          </Tag>
                        )}
                      </div>
                      {step.detail && (
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>
                          {step.detail}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </div>
        </div>

        <Divider style={{ borderColor: 'rgba(0, 212, 255, 0.15)', margin: '12px 0' }} />

        {/* ========== 流式输出 ========== */}
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            📤 流式输出
            {executing && (
              <Spin size="small" indicator={<LoadingOutlined style={{ color: '#00d4ff', fontSize: 10 }} />} />
            )}
          </div>

          <div
            ref={outputRef}
            style={{
              minHeight: 150,
              maxHeight: 300,
              overflow: 'auto',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 8,
              border: '1px solid rgba(0, 212, 255, 0.2)',
              padding: '14px 16px',
              fontSize: 13,
              color: '#e0e6ed',
              lineHeight: 1.7,
              fontFamily: executing ? 'monospace' : 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {streamingOutput || (
              <span style={{ color: '#555', fontStyle: 'italic' }}>
                执行后将在这里显示流式输出...
              </span>
            )}
            {executing && (
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 14,
                background: '#00d4ff',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'blink 1s infinite',
              }} />
            )}
          </div>

          {streamingOutput && (
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={copyOutput}
              size="small"
              style={{ color: '#888', marginTop: 6, padding: '2px 8px' }}
            >
              复制输出
            </Button>
          )}
        </div>

        {/* ========== 配置预览 ========== */}
        <Divider style={{ borderColor: 'rgba(0, 212, 255, 0.15)', margin: '16px 0 12px' }} />

        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>
          🔍 当前配置预览
        </div>
        <pre style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(0, 212, 255, 0.15)',
          borderRadius: 8,
          padding: 12,
          fontSize: 10,
          color: '#a0d8ef',
          maxHeight: 200,
          overflow: 'auto',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {JSON.stringify({
            name: agentConfig?.basicInfo?.name || '未命名',
            agent_id: agentConfig?.basicInfo?.agent_id || '',
            llm: {
              provider: agentConfig?.llm_config?.provider || 'unknown',
              model: agentConfig?.llm_config?.model || 'unknown',
              temperature: agentConfig?.llm_config?.temperature || 0.7,
            },
            mode: agentConfig?.mode_config?.type || 'react',
            memory: {
              enabled: agentConfig?.memory_config?.enabled ?? true,
              type: agentConfig?.memory_config?.type || 'hybrid',
            },
            skills_count: (agentConfig?.skills || []).length,
            mcp_count: (agentConfig?.mcp_tools || []).length,
          }, null, 2)}
        </pre>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </Drawer>
  );
}
