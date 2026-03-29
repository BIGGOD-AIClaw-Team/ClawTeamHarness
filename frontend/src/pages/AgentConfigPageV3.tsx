import { useState } from 'react';
import { Input, Select, Slider, Switch, Button, message, Tag } from 'antd';
import { SciFiCard } from '../components/SciFiCard';

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: '#10a37f', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', color: '#d4a574', models: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-sonnet-latest', 'claude-3-haiku-latest'] },
  { value: 'glm', label: 'GLM (智谱AI)', color: '#7c3aed', models: ['glm-4-plus', 'glm-4', 'glm-4-air', 'glm-3-turbo'] },
  { value: 'minimax', label: 'Minimax', color: '#f59e0b', models: ['abab6.5s-chat', 'abab6.5-chat', 'abab5.5-chat'] },
  { value: 'qwen', label: 'Qwen (通义千问)', color: '#ff6b00', models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'] },
  { value: 'doubao', label: 'Doubao (豆包)', color: '#ff4757', models: ['doubao-pro-32k', 'doubao-lite-32k', 'doubao-pro-128k'] },
  { value: 'wenxin', label: 'Wenxin (文心一言)', color: '#2932e1', models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-3.5-128k', 'ernie-speed-128k'] },
  { value: 'hunyuan', label: 'Hunyuan (混元)', color: '#c0392b', models: ['hunyuan-pro', 'hunyuan-standard', 'hunyuan-lite'] },
];

const AGENT_MODES = [
  { value: 'react', label: 'ReAct (推荐)' },
  { value: 'plan_and_execute', label: 'Plan-and-Execute' },
  { value: 'chat_conversation', label: 'Chat Conversation' },
  { value: 'baby_agi', label: 'Baby AGI' },
  { value: 'auto_gpt', label: 'AutoGPT' },
];

const MEMORY_TYPES = [
  { value: 'short_term', label: '短期记忆' },
  { value: 'long_term', label: '长期记忆' },
  { value: 'vector', label: '向量记忆' },
  { value: 'hybrid', label: '混合记忆 (推荐)' },
];

const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
};

interface TestResult {
  success: boolean;
  latency_ms?: number;
  error?: string;
  error_code?: string;
}

export function AgentConfigPageV3() {
  const [config, setConfig] = useState({
    name: '',
    description: '',
    llm: { provider: 'openai', model: 'gpt-4o', api_key: '', temperature: 0.7 },
    mode: { type: 'react', max_iterations: 10 },
    prompt: { system: '' },
    memory: { enabled: true, type: 'hybrid' },
    decision: { auto_critique: true },
    tools: { enabled: true },
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const currentProvider = LLM_PROVIDERS.find(p => p.value === config.llm.provider);

  const testConnection = async () => {
    if (!config.llm.api_key) {
      message.warning('请先输入 API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.llm),
      });
      const result: TestResult = await resp.json();
      setTestResult(result);
      if (result.success) {
        message.success(`连接成功！延迟: ${result.latency_ms}ms`);
      } else {
        message.error(`连接失败: ${result.error}`);
      }
    } catch (e) {
      const errorResult = { success: false, error: '连接测试失败' };
      setTestResult(errorResult);
      message.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/agents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          graph_def: {
            nodes: [],
            edges: [],
          },
          llm_config: config.llm,
          mode_config: config.mode,
          prompt_config: config.prompt,
          memory_config: config.memory,
          decision_config: config.decision,
          tools_config: config.tools,
        }),
      });
      message.success('配置已保存');
    } catch (e) {
      message.error('保存失败');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e17',
      padding: '24px',
      color: '#e0e6ed',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#00d4ff', margin: 0, textShadow: '0 0 20px rgba(0, 212, 255, 0.5)', fontSize: '24px' }}>
          🤖 Agent 配置中心 V3
        </h1>
        <Tag color="green">🟢 在线</Tag>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {/* Basic Info Card */}
        <SciFiCard title="基本信息" icon="📋">
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Agent 名称</label>
            <Input
              style={inputStyle}
              placeholder="给 Agent 起个名字"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>描述</label>
            <Input.TextArea
              style={{ ...inputStyle, resize: 'none' }}
              rows={3}
              placeholder="描述这个 Agent 的用途"
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
            />
          </div>
        </SciFiCard>

        {/* LLM Config Card */}
        <SciFiCard title="🧠 模型配置" icon="🤖">
          {/* Provider icons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {LLM_PROVIDERS.map(p => (
              <div
                key={p.value}
                onClick={() => setConfig({ ...config, llm: { ...config.llm, provider: p.value, model: p.models[0] } })}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${config.llm.provider === p.value ? p.color : 'rgba(0,212,255,0.2)'}`,
                  background: config.llm.provider === p.value ? `${p.color}22` : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: config.llm.provider === p.value ? p.color : '#888',
                  transition: 'all 0.2s',
                  boxShadow: config.llm.provider === p.value ? `0 0 10px ${p.color}44` : 'none',
                }}
                title={p.label}
              >
                {p.label.split(' ')[0]}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Provider</label>
            <Select
              style={selectStyle}
              value={config.llm.provider}
              onChange={v => setConfig({ ...config, llm: { ...config.llm, provider: v, model: LLM_PROVIDERS.find(p => p.value === v)?.models[0] || '' } })}
              options={LLM_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>模型</label>
            <Select
              style={selectStyle}
              value={config.llm.model}
              onChange={v => setConfig({ ...config, llm: { ...config.llm, model: v } })}
              options={currentProvider?.models.map(m => ({ value: m, label: m })) || []}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Key</label>
            <Input.Password
              style={inputStyle}
              placeholder="输入 API Key"
              value={config.llm.api_key}
              onChange={e => setConfig({ ...config, llm: { ...config.llm, api_key: e.target.value } })}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Temperature: {config.llm.temperature}</label>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={config.llm.temperature}
              onChange={v => setConfig({ ...config, llm: { ...config.llm, temperature: v } })}
              trackStyle={{ background: '#00d4ff' }}
              handleStyle={{ borderColor: '#00d4ff' }}
            />
          </div>

          {/* Test result */}
          {testResult && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 12,
              background: testResult.success ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)',
              border: `1px solid ${testResult.success ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
              color: testResult.success ? '#00ff88' : '#ff4757',
              fontSize: 13,
            }}>
              {testResult.success ? `🟢 连接成功！延迟: ${testResult.latency_ms}ms` : `🔴 ${testResult.error}`}
            </div>
          )}

          <Button
            onClick={testConnection}
            loading={testing}
            disabled={!config.llm.api_key}
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
              border: 'none',
              color: 'white',
              width: '100%',
              boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
            }}
          >
            🔗 测试连接
          </Button>
        </SciFiCard>

        {/* Mode Config */}
        <SciFiCard title="⚙️ Agent 模式" icon="🔄">
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>模式</label>
            <Select
              style={selectStyle}
              value={config.mode.type}
              onChange={v => setConfig({ ...config, mode: { ...config.mode, type: v } })}
              options={AGENT_MODES}
            />
          </div>
          <div>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>最大迭代次数: {config.mode.max_iterations}</label>
            <Slider
              min={1}
              max={50}
              value={config.mode.max_iterations}
              onChange={v => setConfig({ ...config, mode: { ...config.mode, max_iterations: v } })}
              trackStyle={{ background: '#00d4ff' }}
              handleStyle={{ borderColor: '#00d4ff' }}
            />
          </div>
        </SciFiCard>

        {/* Prompt Config */}
        <SciFiCard title="📝 提示词" icon="💬">
          <div>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>系统提示词</label>
            <Input.TextArea
              style={{ ...inputStyle, resize: 'none' }}
              rows={4}
              placeholder="你是一个...的 Agent"
              value={config.prompt.system}
              onChange={e => setConfig({ ...config, prompt: { ...config.prompt, system: e.target.value } })}
            />
          </div>
        </SciFiCard>

        {/* Memory Config */}
        <SciFiCard title="🧠 记忆配置" icon="💾">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span>启用记忆</span>
            <Switch
              checked={config.memory.enabled}
              onChange={v => setConfig({ ...config, memory: { ...config.memory, enabled: v } })}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
          {config.memory.enabled && (
            <Select
              style={selectStyle}
              value={config.memory.type}
              onChange={v => setConfig({ ...config, memory: { ...config.memory, type: v } })}
              options={MEMORY_TYPES}
            />
          )}
        </SciFiCard>

        {/* Tools Config */}
        <SciFiCard title="🔧 工具配置" icon="🛠️">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span>启用工具</span>
            <Switch
              checked={config.tools.enabled}
              onChange={v => setConfig({ ...config, tools: { ...config.tools, enabled: v } })}
            />
          </div>
          {config.tools.enabled && (
            <div>
              <div style={{ marginBottom: 8, color: '#888', fontSize: 12 }}>Skills:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="cyan">✓ Calculator</Tag>
                <Tag color="cyan">✓ Search</Tag>
                <Tag color="cyan">✓ WebRequest</Tag>
              </div>
            </div>
          )}
        </SciFiCard>

      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Button
          size="large"
          onClick={handleSave}
          style={{
            background: 'rgba(0, 212, 255, 0.2)',
            border: '1px solid #00d4ff',
            color: '#00d4ff',
          }}
        >
          💾 保存
        </Button>
        <Button
          size="large"
          style={{
            background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
            border: 'none',
            color: 'white',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
          }}
        >
          🚀 发布
        </Button>
      </div>
    </div>
  );
}
