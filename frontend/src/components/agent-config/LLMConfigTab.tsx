import { useState, useEffect } from 'react';
import { Input, Select, Slider, Button, InputNumber, message, Divider } from 'antd';
import { SciFiCard } from '../SciFiCard';
import { useForm, Controller } from 'react-hook-form';

// ============ 常量定义 ============
const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: '#10a37f' },
  { value: 'anthropic', label: 'Anthropic', color: '#d4a574' },
  { value: 'cohere', label: 'Cohere', color: '#253858' },
  { value: 'google', label: 'Google Gemini', color: '#4285f4' },
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

// 向量维度自动映射表
const VECTOR_DIM_MAP: Record<string, number> = {
  openai: 1536,
  anthropic: 1536,
  cohere: 1536,
  google: 768,
};

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-sonnet-20241022', 'claude-3-opus-latest', 'claude-3-sonnet-latest', 'claude-3-haiku-latest'],
  glm: ['glm-4-plus', 'glm-4', 'glm-4-air', 'glm-4-flash', 'glm-3-turbo'],
  minimax: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6.5g-chat'],
  qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  doubao: ['doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k'],
  wenxin: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k', 'ernie-lite-8k'],
  hunyuan: ['hunyuan', 'hunyuan-pro'],
  cohere: ['command-r-plus', 'command-r', 'command', 'command-light'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  ollama: [], // 动态获取
  vllm: [], // 动态获取
  custom: [], // 动态获取
};

const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  'openai': 'https://api.openai.com/v1',
  'anthropic': 'https://api.anthropic.com',
  'cohere': 'https://api.cohere.ai',
  'google': 'https://generativelanguage.googleapis.com',
  'minimax': 'https://api.minimax.chat/v1',
  'qwen': 'https://dashscope.aliyuncs.com',
  'glm': 'https://open.bigmodel.cn/api/paas/v4',
  'doubao': 'https://ark.cn-beijing.volces.com/api/v3',
  'wenxin': 'https://aip.baidubce.com',
  'hunyuan': 'https://hunyuan.cloud.tencent.com',
  'ollama': 'http://localhost:11434',
  'vllm': 'http://localhost:8000',
};

// ============ 接口定义 ============
export interface LLMConfigFormData {
  provider: string;
  model: string;
  api_key: string;
  api_base: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  vector_dim: number; // 0 = auto-detect
}

interface TestResult {
  success: boolean;
  latency_ms?: number;
  error?: string;
  error_code?: string;
}

interface LLMConfigTabProps {
  defaultValues?: Partial<LLMConfigFormData>;
  onValuesChange?: (values: LLMConfigFormData) => void;
  onTestResult?: (result: TestResult | null) => void;
}

// ============ 组件 ============
export function LLMConfigTab({ defaultValues, onValuesChange, onTestResult }: LLMConfigTabProps) {
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<{ error: string; hint?: string } | null>(null);
  const [manualModelInput, setManualModelInput] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const {
    control,
    watch,
    setValue,
  } = useForm<LLMConfigFormData>({
    defaultValues: {
      provider: 'openai',
      model: 'gpt-4o',
      api_key: '',
      api_base: PROVIDER_DEFAULT_BASE_URLS['openai'],
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1.0,
      vector_dim: 0,
      ...defaultValues,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // 向父组件通知变化
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(watchedValues);
    }
  }, [watchedValues, onValuesChange]);

  // 向父组件通知测试结果
  useEffect(() => {
    if (onTestResult) {
      onTestResult(testResult);
    }
  }, [testResult, onTestResult]);

  // 动态获取模型列表
  const fetchModels = async (provider: string, apiKey: string, showMsg = true) => {
    if (!apiKey) {
      setModels([]);
      setModelError(null);
      return;
    }

    // 如果是已知 provider 且有预设模型，直接使用
    if (MODELS_BY_PROVIDER[provider] && MODELS_BY_PROVIDER[provider].length > 0) {
      setModels(MODELS_BY_PROVIDER[provider]);
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

      if (data.error || data.error_code) {
        setModels([]);
        setModelError({ error: data.warning || data.error || '获取模型列表失败', hint: data.error_hint });
        if (showMsg) message.error(data.warning || data.error);
        return;
      }

      if (data.models && data.models.length > 0) {
        setModels(data.models);
        if (!data.models.includes(watchedValues.model)) {
          setValue('model', data.models[0]);
        }
        if (data.warning && showMsg) message.warning(data.warning);
      } else if (data.warning && data.models?.length === 0) {
        setModels([]);
        setModelError({ error: data.warning, hint: data.error_hint || '请尝试手动输入模型名称' });
        if (showMsg) message.warning(data.warning);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
      setModels([]);
      setModelError({ error: '获取模型列表失败，请检查网络连接' });
    } finally {
      setLoadingModels(false);
    }
  };

  // Provider 变化时
  const handleProviderChange = (provider: string) => {
    const defaultBaseUrl = PROVIDER_DEFAULT_BASE_URLS[provider] || '';
    setValue('provider', provider);
    setValue('model', '');
    setValue('api_base', defaultBaseUrl);
    setModels([]);
    setModelError(null);
    setManualModelInput(false);

    // 自动设置向量维度
    if (VECTOR_DIM_MAP[provider]) {
      setValue('vector_dim', VECTOR_DIM_MAP[provider]);
    } else {
      setValue('vector_dim', 0); // 0 = auto-detect
    }

    // 如果是已知 provider，预设模型列表
    if (MODELS_BY_PROVIDER[provider] && MODELS_BY_PROVIDER[provider].length > 0) {
      setModels(MODELS_BY_PROVIDER[provider]);
      setValue('model', MODELS_BY_PROVIDER[provider][0]);
    }
  };

  // 测试连接
  const testConnection = async () => {
    if (!watchedValues.api_key) {
      message.warning('请先输入 API Key');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchedValues),
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {/* 模型选择卡片 */}
      <SciFiCard title="🧠 模型选择" icon="🤖">
        {/* Provider 选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Provider</label>
          <Controller
            name="provider"
            control={control}
            render={() => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LLM_PROVIDERS.map(p => (
                  <div
                    key={p.value}
                    onClick={() => handleProviderChange(p.value)}
                    style={{
                      padding: '6px 12px',
                      background: watchedValues.provider === p.value
                        ? `rgba(${p.color === '#10a37f' ? '16,163,127' : p.color === '#d4a574' ? '212,165,116' : '0,212,255'}, 0.2)`
                        : 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${watchedValues.provider === p.value ? p.color : 'rgba(0, 212, 255, 0.2)'}`,
                      borderRadius: 6,
                      color: watchedValues.provider === p.value ? p.color : '#888',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Controller
              name="api_key"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e6ed',
                    flex: 1,
                  }}
                  placeholder="输入 API Key"
                />
              )}
            />
            <Button
              onClick={() => fetchModels(watchedValues.provider, watchedValues.api_key)}
              disabled={!watchedValues.api_key}
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
              <div style={{ fontWeight: 500, marginBottom: 4 }}>❌ {modelError.error}</div>
              {modelError.hint && <div style={{ color: '#ff8787' }}>💡 {modelError.hint}</div>}
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

        {/* 模型选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            模型 {loadingModels && <span style={{ color: '#00d4ff' }}>(加载中...)</span>}
          </label>
          {manualModelInput ? (
            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e6ed',
                  }}
                  placeholder="手动输入模型名称，如 gpt-4o"
                  addonAfter={
                    <Button
                      type="text"
                      size="small"
                      onClick={() => setManualModelInput(false)}
                      style={{ color: '#00d4ff' }}
                    >
                      ← 返回列表
                    </Button>
                  }
                />
              )}
            />
          ) : (
            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  value={field.value || undefined}
                  onChange={(v) => {
                    if (v === '__manual_input__') {
                      setManualModelInput(true);
                      setValue('model', '');
                    } else {
                      field.onChange(v);
                    }
                  }}
                  placeholder={loadingModels ? '加载中...' : '请选择模型'}
                  loading={loadingModels}
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={
                    models.length > 0
                      ? [
                          ...models.map(m => ({ value: m, label: m })),
                          { value: '__manual_input__', label: '✨ 手动输入模型名称' },
                        ]
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
                  dropdownStyle={{
                    background: 'rgba(0, 20, 40, 0.95)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: 8,
                  }}
                />
              )}
            />
          )}
        </div>

        {/* API Base URL */}
        {(watchedValues.provider === 'custom' || watchedValues.provider === 'ollama' || watchedValues.provider === 'vllm') && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Base URL</label>
            <Controller
              name="api_base"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '6px',
                    color: '#e0e6ed',
                  }}
                  placeholder="https://api.your-provider.com/v1"
                  suffix={
                    watchedValues.provider !== 'custom' && PROVIDER_DEFAULT_BASE_URLS[watchedValues.provider] ? (
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setValue('api_base', PROVIDER_DEFAULT_BASE_URLS[watchedValues.provider] || '')}
                        style={{ color: '#00d4ff', fontSize: 10, padding: '0 4px' }}
                      >
                        重置
                      </Button>
                    ) : null
                  }
                />
              )}
            />
          </div>
        )}
      </SciFiCard>

      {/* 参数配置卡片 */}
      <SciFiCard title="⚙️ 生成参数" icon="🎛️">
        {/* Temperature */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ color: '#888', fontSize: 12 }}>Temperature</label>
            <span style={{ color: '#00d4ff', fontSize: 14, fontWeight: 600 }}>
              {watchedValues.temperature.toFixed(1)}
            </span>
          </div>
          <Controller
            name="temperature"
            control={control}
            render={({ field }) => (
              <Slider
                {...field}
                min={0}
                max={2}
                step={0.1}
                value={field.value}
                onChange={field.onChange}
                trackStyle={{ background: '#00d4ff' }}
                handleStyle={{ borderColor: '#00d4ff', background: '#00d4ff' }}
              />
            )}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#666' }}>精确 (0.0)</span>
            <span style={{ fontSize: 10, color: '#666' }}>创造 (2.0)</span>
          </div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            控制输出的随机性。较低值更确定，较高值更有创造性。
          </div>
        </div>

        {/* Max Tokens */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Max Tokens</label>
          <Controller
            name="max_tokens"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={1}
                max={100000}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#e0e6ed',
                  width: '100%',
                }}
              />
            )}
          />
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            最大生成 Token 数。设置为 -1 表示使用模型默认。
          </div>
        </div>

        {/* Top P */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Top P</label>
          <Controller
            name="top_p"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={0}
                max={1}
                step={0.05}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#e0e6ed',
                  width: '100%',
                }}
              />
            )}
          />
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            Nucleus 采样参数。控制考虑的概率质量。
          </div>
        </div>

        {/* 向量维度 - 长期记忆用 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ color: '#888', fontSize: 12 }}>向量维度 (Vector Dim)</label>
            <span style={{
              color: watchedValues.vector_dim === 0 ? '#f59e0b' : '#00d4ff',
              fontSize: 14,
              fontWeight: 600,
            }}>
              {watchedValues.vector_dim === 0 ? '自动检测' : watchedValues.vector_dim}
            </span>
          </div>
          <Controller
            name="vector_dim"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 0, label: '自动检测' },
                  { value: 1536, label: '1536 (OpenAI / Claude / Cohere)' },
                  { value: 768, label: '768 (Google Gemini)' },
                  { value: 1024, label: '1024 (其他常见维度)' },
                  { value: 2048, label: '2048 (大维度嵌入)' },
                ]}
                dropdownStyle={{
                  background: 'rgba(0, 20, 40, 0.95)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: 8,
                }}
              />
            )}
          />
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            用于长期记忆的向量嵌入维度。切换 Provider 时会自动匹配。
          </div>
        </div>

        <Divider style={{ borderColor: 'rgba(0, 212, 255, 0.2)', margin: '16px 0' }} />

        {/* 测试连接 */}
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
            {testResult.success
              ? `🟢 连接成功！延迟: ${testResult.latency_ms}ms`
              : `🔴 ${testResult.error}`}
          </div>
        )}

        <Button
          onClick={testConnection}
          loading={testing}
          disabled={!watchedValues.api_key}
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
    </div>
  );
}
