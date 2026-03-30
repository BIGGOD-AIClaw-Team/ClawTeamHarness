import { useState, useEffect } from 'react';
import { Input, Select, Slider, Switch, Button, message, Tag } from 'antd';
import { SciFiCard } from '../components/SciFiCard';

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: '#10a37f' },
  { value: 'anthropic', label: 'Anthropic', color: '#d4a574' },
  { value: 'glm', label: 'GLM (智谱AI)', color: '#7c3aed' },
  { value: 'minimax', label: 'Minimax', color: '#f59e0b' },
  { value: 'qwen', label: 'Qwen (通义千问)', color: '#ff6b00' },
  { value: 'doubao', label: 'Doubao (豆包)', color: '#ff4757' },
  { value: 'wenxin', label: 'Wenxin (文心一言)', color: '#2932e1' },
  { value: 'hunyuan', label: 'Hunyuan (混元)', color: '#c0392b' },
  { value: 'ollama', label: 'Ollama (本地)', color: '#00d4ff' },
  { value: 'vllm', label: 'vLLM (本地)', color: '#00ff88' },
  { value: 'custom', label: '✨ 自定义 Provider', color: '#ff00ff' },
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

const PROMPT_TEMPLATES = [
  { value: 'assistant', label: '🤖 AI 助手', template: '你是一个专业的AI助手，帮助用户解答问题、完成各种任务。' },
  { value: 'coder', label: '💻 代码助手', template: '你是一个经验丰富的程序员，擅长Python、JavaScript、TypeScript等语言，帮助用户编写、调试和优化代码。' },
  { value: 'analyst', label: '📊 分析师', template: '你是一个专业的数据分析师，擅长分析数据、发现规律、提供洞察和建议。' },
  { value: 'custom', label: '✏️ 自定义', template: '' },
];

// Provider 默认 Base URL 映射
const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  'openai': 'https://api.openai.com/v1',
  'anthropic': 'https://api.anthropic.com',
  'minimax': 'https://api.minimax.chat/v1',
  'qwen': 'https://dashscope.aliyuncs.com',
  'glm': 'https://open.bigmodel.cn/api/paas/v4',
  'doubao': 'https://ark.cn-beijing.volces.com/api/v3',
  'wenxin': 'https://aip.baidubce.com',
  'ollama': 'http://localhost:11434',
  'vllm': 'http://localhost:8000',
};

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

interface AgentConfigPageV3Props {
  agentId?: string | null;
  onEditComplete?: () => void;
  onPublishSuccess?: (agentId: string) => void;
}

export function AgentConfigPageV3({ agentId: propAgentId, onEditComplete, onPublishSuccess }: AgentConfigPageV3Props) {
  const [agentId, setAgentId] = useState<string | null>(propAgentId || null);
  const [config, setConfig] = useState({
    name: '',
    description: '',
    llm: { provider: 'openai', model: 'gpt-4o', api_key: '', base_url: 'https://api.openai.com/v1', temperature: 0.7 },
    mode: { type: 'react', max_iterations: 10 },
    prompt: { system: '' },
    memory: { enabled: true, type: 'hybrid' },
    decision: { auto_critique: true },
    tools: { enabled: true },
    // 新功能
    prompt_template: 'assistant',
    enable_suggestions: false,
    suggestions: '',
  });
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<{ error: string; hint?: string } | null>(null);
  const [manualModelInput, setManualModelInput] = useState(false);

  // 动态获取模型列表
  const fetchModels = async (provider: string, apiKey: string, showMsg = true) => {
    if (!apiKey) {
      setModels([]);
      setModelError(null);
      return;
    }
    setLoadingModels(true);
    setModelError(null);
    try {
      const resp = await fetch('/api/models/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey }),
      });
      const data = await resp.json();
      
      // 检查是否有错误
      if (data.error || data.error_code) {
        setModels([]);
        const errorInfo = {
          error: data.warning || data.error || '获取模型列表失败',
          hint: data.error_hint
        };
        setModelError(errorInfo);
        if (showMsg) {
          message.error(data.warning || data.error);
        }
        return;
      }
      
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        // 如果当前模型不在列表中，自动选择第一个
        if (!data.models.includes(config.llm.model)) {
          setConfig(prev => ({ ...prev, llm: { ...prev.llm, model: data.models[0] } }));
        }
        // 显示警告信息（如有）
        if (data.warning && showMsg) {
          message.warning(data.warning);
        }
      } else if (data.warning && data.models?.length === 0) {
        // API 返回成功但没有模型
        setModels([]);
        setModelError({
          error: data.warning,
          hint: data.error_hint || '请尝试手动输入模型名称'
        });
        if (showMsg) {
          message.warning(data.warning);
        }
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
      setModels([]);
      setModelError({ error: '获取模型列表失败，请检查网络连接' });
    } finally {
      setLoadingModels(false);
    }
  };

  // 当 API Key 或 Provider 变化时获取模型
  useEffect(() => {
    if (config.llm.api_key) {
      fetchModels(config.llm.provider, config.llm.api_key);
    } else {
      setModels([]);
    }
  }, [config.llm.provider, config.llm.api_key]);

  // 加载已有 Agent 配置
  useEffect(() => {
    if (propAgentId) {
      setAgentId(propAgentId);
      fetch(`/api/agents/${propAgentId}`)
        .then(res => res.json())
        .then(data => {
          // Properly restore llm_config with all fields and defaults
          const llmCfg = data.llm_config || {};
          const modeCfg = data.mode_config || {};
          const promptCfg = data.prompt_config || {};
          const memoryCfg = data.memory_config || {};
          const decisionCfg = data.decision_config || {};
          const toolsCfg = data.tools_config || {};
          
          setConfig({
            name: data.name || '',
            description: data.description || '',
            llm: {
              provider: llmCfg.provider || 'openai',
              model: llmCfg.model || 'gpt-4o',
              api_key: llmCfg.api_key || '',
              base_url: llmCfg.base_url || PROVIDER_DEFAULT_BASE_URLS[llmCfg.provider] || '',
              temperature: llmCfg.temperature ?? 0.7,
            },
            mode: {
              type: modeCfg.type || 'react',
              max_iterations: modeCfg.max_iterations || 10,
            },
            prompt: {
              system: promptCfg.system || '',
            },
            memory: {
              enabled: memoryCfg.enabled !== false,
              type: memoryCfg.type || 'hybrid',
            },
            decision: {
              auto_critique: decisionCfg.auto_critique !== false,
            },
            tools: {
              enabled: toolsCfg.enabled !== false,
            },
            prompt_template: data.prompt_template || 'assistant',
            enable_suggestions: data.enable_suggestions || false,
            suggestions: data.suggestions || '',
          });
        })
        .catch(err => {
          console.error('Failed to load agent:', err);
          message.error('加载 Agent 失败');
        });
    }
  }, [propAgentId]);

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
    if (!config.name) {
      message.warning('请输入 Agent 名称');
      return;
    }
    try {
      const url = agentId
        ? `/api/agents/${agentId}`
        : '/api/agents/';
      const method = agentId ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          graph_def: {
            nodes: [
              { id: 'start-1', type: 'input', position: { x: 250, y: 0 }, data: { label: '开始' } },
              { id: 'llm-1', type: 'default', position: { x: 250, y: 100 }, data: { label: 'LLM 对话' } },
              { id: 'end-1', type: 'output', position: { x: 250, y: 200 }, data: { label: '结束' } },
            ],
            edges: [
              { id: 'e1', source: 'start-1', target: 'llm-1' },
              { id: 'e2', source: 'llm-1', target: 'end-1' },
            ]
          },
          llm_config: config.llm,
          mode_config: config.mode,
          prompt_config: config.prompt,
          memory_config: config.memory,
          decision_config: config.decision,
          tools_config: config.tools,
          // 新功能
          prompt_template: config.prompt_template,
          enable_suggestions: config.enable_suggestions,
          suggestions: config.suggestions,
          status: 'draft',
        }),
      });

      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.detail || '保存失败');
      }

      if (!agentId && result.agent_id) {
        setAgentId(result.agent_id);
      }

      message.success('保存成功！');
    } catch (e: any) {
      message.error(e.message || '保存失败');
    }
  };

  const handlePublish = async () => {
    if (!agentId) {
      message.warning('请先保存 Agent');
      return;
    }
    try {
      const resp = await fetch(`/api/agents/${agentId}/publish`, {
        method: 'POST',
      });
      if (resp.ok) {
        message.success('发布成功！Agent 已上线');
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => onPublishSuccess?.(agentId), 300);
      } else {
        const data = await resp.json();
        message.error(data.detail || '发布失败');
      }
    } catch (e) {
      message.error('发布失败');
    }
  };

  const handleDelete = async () => {
    if (!agentId) return;
    if (!window.confirm('确定要删除这个 Agent 吗？此操作不可撤销。')) return;
    try {
      const resp = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        message.success('删除成功');
        setAgentId(null);
        // Reset form
        setConfig({
          name: '',
          description: '',
          llm: { provider: 'openai', model: 'gpt-4o', api_key: '', base_url: 'https://api.openai.com/v1', temperature: 0.7 },
          mode: { type: 'react', max_iterations: 10 },
          prompt: { system: '' },
          memory: { enabled: true, type: 'hybrid' },
          decision: { auto_critique: true },
          tools: { enabled: true },
          prompt_template: 'assistant',
          enable_suggestions: false,
          suggestions: '',
        });
        onEditComplete?.();
      } else {
        const data = await resp.json();
        message.error(data.detail || '删除失败');
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleProviderChange = (provider: string) => {
    const defaultBaseUrl = PROVIDER_DEFAULT_BASE_URLS[provider] || '';
    setConfig({
      ...config,
      llm: { ...config.llm, provider, model: '', base_url: defaultBaseUrl },
    });
    setModels([]);
    setModelError(null);
    setManualModelInput(false);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: '#0a0e17',
      padding: '24px',
      color: '#e0e6ed',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {agentId && (
            <Button size="small" onClick={onEditComplete} type="text" style={{ color: '#888' }}>
              ← 返回
            </Button>
          )}
          <h1 style={{ color: '#00d4ff', margin: 0, textShadow: '0 0 20px rgba(0, 212, 255, 0.5)', fontSize: '24px' }}>
            {agentId ? '✏️ 编辑 Agent' : '🤖 Agent 配置中心 V3'}
          </h1>
        </div>
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
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Provider</label>
            <Select
              style={selectStyle}
              value={config.llm.provider}
              onChange={handleProviderChange}
              options={LLM_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
              dropdownStyle={{ 
                background: 'rgba(0, 20, 40, 0.95)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: 8,
              }}
              className="provider-select"
            />
          </div>
          
          {/* Base URL input - auto-filled based on provider, editable for custom providers */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Base URL</label>
            <Input
              style={inputStyle}
              placeholder="https://api.your-provider.com/v1"
              value={config.llm.base_url}
              onChange={e => setConfig({ ...config, llm: { ...config.llm, base_url: e.target.value } })}
              suffix={
                config.llm.provider !== 'custom' && PROVIDER_DEFAULT_BASE_URLS[config.llm.provider] ? (
                  <Button type="text" size="small" onClick={() => setConfig({ ...config, llm: { ...config.llm, base_url: PROVIDER_DEFAULT_BASE_URLS[config.llm.provider] || '' } })} style={{ color: '#00d4ff', fontSize: 10, padding: '0 4px' }}>
                    重置
                  </Button>
                ) : null
              }
            />
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
              模型 {loadingModels && '(加载中...)'}
            </label>
            {manualModelInput ? (
              <Input
                style={inputStyle}
                placeholder="手动输入模型名称，如 gpt-4o"
                value={config.llm.model}
                onChange={e => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
                addonAfter={
                  <Button type="text" size="small" onClick={() => setManualModelInput(false)}>
                    ← 返回列表
                  </Button>
                }
              />
            ) : (
              <Select
                style={selectStyle}
                value={config.llm.model || undefined}
                onChange={v => {
                  if (v === '__manual_input__') {
                    setManualModelInput(true);
                    setConfig({ ...config, llm: { ...config.llm, model: '' } });
                  } else {
                    setConfig({ ...config, llm: { ...config.llm, model: v } });
                  }
                }}
                placeholder={loadingModels ? '加载中...' : '请选择模型'}
                loading={loadingModels}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                options={models.length > 0
                  ? [...models.map(m => ({ value: m, label: m })), { value: '__manual_input__', label: '✨ 手动输入模型名称' }]
                  : [{ value: '__manual_input__', label: '✨ 手动输入模型名称' }]
                }
                notFoundContent={
                  <div>
                    <div style={{ color: '#888', marginBottom: 8 }}>无法获取模型列表</div>
                    <Button type="primary" size="small" onClick={() => setManualModelInput(true)}>
                      手动输入模型
                    </Button>
                  </div>
                }
              />
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input.Password
                style={{ ...inputStyle, flex: 1 }}
                placeholder="输入 API Key"
                value={config.llm.api_key}
                onChange={e => setConfig({ ...config, llm: { ...config.llm, api_key: e.target.value } })}
              />
              <Button
                onClick={() => fetchModels(config.llm.provider, config.llm.api_key)}
                disabled={!config.llm.api_key}
                loading={loadingModels}
                style={{
                  background: 'rgba(0, 212, 255, 0.2)',
                  border: '1px solid #00d4ff',
                  color: '#00d4ff',
                  whiteSpace: 'nowrap',
                }}
              >
                📥 获取模型
              </Button>
            </div>
            {modelError && (
              <div style={{
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 4,
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.3)',
                color: '#ff6b81',
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 500, marginBottom: modelError.hint ? 4 : 0 }}>
                  ❌ {modelError.error}
                </div>
                {modelError.hint && (
                  <div style={{ color: '#ff8787' }}>
                    💡 {modelError.hint}
                  </div>
                )}
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => setManualModelInput(true)}
                  style={{ padding: '4px 0', height: 'auto', color: '#00d4ff' }}
                >
                  手动输入模型名称 →
                </Button>
              </div>
            )}
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
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>提示词模板</label>
            <Select
              style={selectStyle}
              value={config.prompt_template}
              onChange={v => {
                const tpl = PROMPT_TEMPLATES.find(t => t.value === v);
                setConfig({ 
                  ...config, 
                  prompt_template: v,
                  prompt: { ...config.prompt, system: tpl?.template || config.prompt.system }
                });
              }}
              options={PROMPT_TEMPLATES.map(t => ({ value: t.value, label: t.label }))}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>系统提示词</label>
            <Input.TextArea
              style={{ ...inputStyle, resize: 'none' }}
              rows={4}
              placeholder="你是一个...的 Agent"
              value={config.prompt.system}
              onChange={e => setConfig({ ...config, prompt: { ...config.prompt, system: e.target.value } })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 12 }}>上下文推荐问题</span>
            <Switch
              size="small"
              checked={config.enable_suggestions}
              onChange={v => setConfig({ ...config, enable_suggestions: v })}
            />
          </div>
          {config.enable_suggestions && (
            <Input.TextArea
              style={{ ...inputStyle, resize: 'none' }}
              rows={3}
              placeholder="每行一个问题，Agent会根据上下文推荐这些问题"
              value={config.suggestions}
              onChange={e => setConfig({ ...config, suggestions: e.target.value })}
            />
          )}
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
          onClick={handlePublish}
          style={{
            background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
            border: 'none',
            color: 'white',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
          }}
        >
          🚀 发布
        </Button>
        {agentId && (
          <Button
            size="large"
            onClick={handleDelete}
            danger
            style={{
              background: 'rgba(255, 71, 87, 0.1)',
              border: '1px solid rgba(255, 71, 87, 0.5)',
              color: '#ff4757',
            }}
          >
            🗑️ 删除
          </Button>
        )}
      </div>
    </div>
  );
}
