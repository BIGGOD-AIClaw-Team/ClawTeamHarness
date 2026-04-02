import React, { useState, useEffect } from 'react';
import { Input, Select, Slider, Switch, Button, message, Tag, Tabs, Checkbox, Tooltip } from 'antd';
import { SciFiCard } from '../components/SciFiCard';
import {
  ControlOutlined, CheckSquareOutlined, ExperimentOutlined,
  TeamOutlined, ApiOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

// ============ 常量定义 ============
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

// ============ Skills 配置（分类显示）============
interface SkillItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'analysis' | 'tactical' | 'planning';
}

const AVAILABLE_SKILLS: SkillItem[] = [
  { id: 'web_search', name: '网页搜索', icon: '🔍', description: '使用 DuckDuckGo 搜索互联网', category: 'analysis' },
  { id: 'data_analysis', name: '数据分析', icon: '📊', description: '分析数据、发现规律、提供洞察', category: 'analysis' },
  { id: 'code_assistant', name: '代码助手', icon: '💻', description: '编写、调试和优化代码', category: 'analysis' },
  { id: 'image_analysis', name: '图像分析', icon: '🖼️', description: '分析和理解图像内容', category: 'analysis' },
  { id: 'document_parser', name: '文档解析', icon: '📄', description: '解析 PDF、DOCX、HTML 等文档', category: 'analysis' },
  { id: 'ocr', name: 'OCR 识别', icon: '✍️', description: '从图像中提取文字', category: 'analysis' },
  { id: 'tactical_recommendation', name: '战术推荐', icon: '⚔️', description: '推荐战术方案和策略', category: 'tactical' },
  { id: 'risk_assessment', name: '风险评估', icon: '⚠️', description: '多维度风险分析和评估', category: 'tactical' },
  { id: 'resource_optimization', name: '资源优化', icon: '📦', description: '优化资源分配和利用', category: 'tactical' },
  { id: 'decision_support', name: '决策支持', icon: '🎯', description: '辅助决策分析和推荐', category: 'tactical' },
  { id: 'task_decomposition', name: '任务分解', icon: '📋', description: '分解复杂任务为子任务', category: 'planning' },
  { id: 'goal_planning', name: '目标规划', icon: '🎯', description: '制定实现目标的计划', category: 'planning' },
  { id: 'progress_tracking', name: '进度跟踪', icon: '📈', description: '跟踪任务执行进度', category: 'planning' },
  { id: 'schedule_optimization', name: '日程优化', icon: '📅', description: '优化时间安排和日程', category: 'planning' },
];

const SKILL_CATEGORIES = [
  { key: 'analysis', label: '🔍 分析类', color: '#3b82f6' },
  { key: 'tactical', label: '⚔️ 战术类', color: '#a855f7' },
  { key: 'planning', label: '📋 规划类', color: '#22c55e' },
];

// ============ 子 Agent 配置 ============
interface SubAgent {
  id: string;
  role: string;
  name: string;
  enabled: boolean;
}

const PRESET_ROLES = [
  { value: 'researcher', label: 'Researcher 研究员', icon: '🔬', description: '信息收集、研究分析' },
  { value: 'planner', label: 'Planner 规划师', icon: '📐', description: '制定计划、任务分解' },
  { value: 'executor', label: 'Executor 执行者', icon: '⚙️', description: '执行任务、操作工具' },
  { value: 'critic', label: 'Critic 评审员', icon: '👀', description: '审查结果、质量把控' },
  { value: 'coordinator', label: 'Coordinator 协调员', icon: '🔄', description: '多任务协调、进度管理' },
];

// ============ MCP Tools 配置 ============
interface MCPTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const AVAILABLE_MCP_TOOLS: MCPTool[] = [
  { id: 'filesystem', name: '文件系统', description: '读写本地文件、浏览目录', enabled: false },
  { id: 'github', name: 'GitHub', description: 'GitHub API 操作、Issue/PR 管理', enabled: false },
  { id: 'database', name: '数据库', description: 'SQL 数据库查询和操作', enabled: false },
  { id: 'web_fetch', name: '网页获取', description: '抓取网页内容、提取信息', enabled: false },
  { id: 'slack', name: 'Slack', description: 'Slack 消息发送和频道管理', enabled: false },
  { id: 'discord', name: 'Discord', description: 'Discord 消息和频道操作', enabled: false },
  { id: 'twitter', name: 'Twitter', description: 'Twitter 推文发布和读取', enabled: false },
  { id: 'email', name: '邮件', description: '发送和管理电子邮件', enabled: false },
  { id: 'calendar', name: '日历', description: '日历事件管理和提醒', enabled: false },
  { id: ' reminder', name: '提醒', description: '设置和管理提醒事项', enabled: false },
];

// ============ 通用样式 ============
const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};

const selectStyle: React.CSSProperties = { width: '100%' };

// ============ 接口定义 ============
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

// ============ 主组件 ============
export function AgentConfigPageV3({ agentId: propAgentId, onEditComplete, onPublishSuccess }: AgentConfigPageV3Props) {
  const [agentId, setAgentId] = useState<string | null>(propAgentId || null);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [config, setConfig] = useState({
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
    // 增强配置
    skills: [] as string[],
    sub_agents: [] as SubAgent[],
    mcp_tools: [] as string[],
    // 记忆详细配置
    memory_detail: {
      short_term_enabled: true,
      max_messages: 50,
      long_term_enabled: false,
      storage: 'chroma',
      top_k: 5,
    },
  });
  
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<{ error: string; hint?: string } | null>(null);
  const [manualModelInput, setManualModelInput] = useState(false);

  // 动态获取模型列表 - 使用 ref 避免闭包问题
  const modelsAbortControllerRef = React.useRef<AbortController | null>(null);
  
  const fetchModels = React.useCallback(async (provider: string, apiKey: string, currentModel: string, showMsg = true) => {
    // 取消之前的请求
    if (modelsAbortControllerRef.current) {
      modelsAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    modelsAbortControllerRef.current = abortController;
    
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
        signal: abortController.signal,
      });
      
      if (abortController.signal.aborted) return;
      
      const data = await resp.json();
      
      if (abortController.signal.aborted) return;
      
      if (data.error || data.error_code) {
        setModels([]);
        setModelError({ error: data.warning || data.error || '获取模型列表失败', hint: data.error_hint });
        if (showMsg) message.error(data.warning || data.error);
        return;
      }
      
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        // 使用传入的 currentModel 而不是闭包中的 config
        if (currentModel && !data.models.includes(currentModel)) {
          setConfig(prev => ({ ...prev, llm: { ...prev.llm, model: data.models[0] } }));
        }
        if (data.warning && showMsg) message.warning(data.warning);
      } else if (data.warning && data.models?.length === 0) {
        setModels([]);
        setModelError({ error: data.warning, hint: data.error_hint || '请尝试手动输入模型名称' });
        if (showMsg) message.warning(data.warning);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return; // 忽略取消的请求
      console.error('Failed to fetch models:', e);
      setModels([]);
      setModelError({ error: '获取模型列表失败，请检查网络连接' });
    } finally {
      if (!abortController.signal.aborted) {
        setLoadingModels(false);
      }
    }
  }, []);

  useEffect(() => {
    if (config.llm.api_key) {
      fetchModels(config.llm.provider, config.llm.api_key, config.llm.model);
    } else {
      setModels([]);
    }
  }, [config.llm.provider, config.llm.api_key, fetchModels]);

  // 加载已有 Agent 配置 - 添加 AbortController 避免竞态条件
  useEffect(() => {
    if (!propAgentId) return;
    
    const abortController = new AbortController();
    setAgentId(propAgentId);
    
    fetch(`/api/agents/${propAgentId}`, { signal: abortController.signal })
      .then(res => res.json())
      .then(data => {
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
          skills: data.skills || [],
          sub_agents: data.sub_agents || [],
          mcp_tools: data.mcp_tools || [],
          memory_detail: {
            short_term_enabled: memoryCfg.short_term_enabled ?? true,
            max_messages: memoryCfg.max_messages || 50,
            long_term_enabled: memoryCfg.long_term_enabled ?? false,
            storage: memoryCfg.storage || 'chroma',
            top_k: memoryCfg.top_k || 5,
          },
        });
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to load agent:', err);
        message.error('加载 Agent 失败');
      });
      
    return () => {
      abortController.abort();
    };
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
      setTestResult({ success: false, error: '连接测试失败' });
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
      const url = agentId ? `/api/agents/${agentId}` : '/api/agents/';
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
          memory_config: { ...config.memory, ...config.memory_detail },
          decision_config: config.decision,
          tools_config: config.tools,
          skills: config.skills,
          sub_agents: config.sub_agents,
          mcp_tools: config.mcp_tools,
          prompt_template: config.prompt_template,
          enable_suggestions: config.enable_suggestions,
          suggestions: config.suggestions,
          status: 'draft',
        }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.detail || '保存失败');

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
      const resp = await fetch(`/api/agents/${agentId}/publish`, { method: 'POST' });
      if (resp.ok) {
        message.success('发布成功！Agent 已上线');
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
      const resp = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (resp.ok) {
        message.success('删除成功');
        setAgentId(null);
        setConfig({
          name: '', description: '',
          llm: { provider: 'openai', model: 'gpt-4o', api_key: '', base_url: 'https://api.openai.com/v1', temperature: 0.7 },
          mode: { type: 'react', max_iterations: 10 },
          prompt: { system: '' },
          memory: { enabled: true, type: 'hybrid' },
          decision: { auto_critique: true },
          tools: { enabled: true },
          prompt_template: 'assistant',
          enable_suggestions: false,
          suggestions: '',
          skills: [],
          sub_agents: [],
          mcp_tools: [],
          memory_detail: { short_term_enabled: true, max_messages: 50, long_term_enabled: false, storage: 'chroma', top_k: 5 },
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
    setConfig({ ...config, llm: { ...config.llm, provider, model: '', base_url: defaultBaseUrl } });
    setModels([]);
    setModelError(null);
    setManualModelInput(false);
  };

  // ============ Skills 操作 ============
  const toggleSkill = (skillId: string) => {
    if (config.skills.includes(skillId)) {
      setConfig({ ...config, skills: config.skills.filter(s => s !== skillId) });
    } else {
      setConfig({ ...config, skills: [...config.skills, skillId] });
    }
  };

  // ============ Sub-Agent 操作 ============
  const addSubAgent = (role: string) => {
    if (config.sub_agents.find(a => a.role === role)) {
      message.warning('该角色已添加');
      return;
    }
    const preset = PRESET_ROLES.find(r => r.value === role);
    setConfig({
      ...config,
      sub_agents: [...config.sub_agents, {
        id: `sub_${Date.now()}`,
        role,
        name: preset?.label.split(' ')[0] || role,
        enabled: true,
      }],
    });
  };

  const removeSubAgent = (id: string) => {
    setConfig({ ...config, sub_agents: config.sub_agents.filter(a => a.id !== id) });
  };

  const toggleSubAgentEnabled = (id: string) => {
    setConfig({
      ...config,
      sub_agents: config.sub_agents.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a),
    });
  };

  // ============ MCP Tools 操作 ============
  const toggleMCPTool = (toolId: string) => {
    if (config.mcp_tools.includes(toolId)) {
      setConfig({ ...config, mcp_tools: config.mcp_tools.filter(t => t !== toolId) });
    } else {
      setConfig({ ...config, mcp_tools: [...config.mcp_tools, toolId] });
    }
  };

  // ============ 渲染 Tab 内容 ============
  const renderBasicTab = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {/* Basic Info Card */}
      <SciFiCard title="基本信息" icon="📋">
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Agent 名称</label>
          <Input style={inputStyle} placeholder="给 Agent 起个名字" value={config.name}
            onChange={e => setConfig({ ...config, name: e.target.value })} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>描述</label>
          <TextArea style={{ ...inputStyle, resize: 'none' }} rows={3} placeholder="描述这个 Agent 的用途"
            value={config.description} onChange={e => setConfig({ ...config, description: e.target.value })} />
        </div>
      </SciFiCard>

      {/* LLM Config Card */}
      <SciFiCard title="🧠 模型配置" icon="🤖">
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Provider</label>
          <Select style={selectStyle} value={config.llm.provider} onChange={handleProviderChange}
            options={LLM_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
            dropdownStyle={{ background: 'rgba(0, 20, 40, 0.95)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Base URL</label>
          <Input style={inputStyle} placeholder="https://api.your-provider.com/v1" value={config.llm.base_url}
            onChange={e => setConfig({ ...config, llm: { ...config.llm, base_url: e.target.value } })}
            suffix={config.llm.provider !== 'custom' && PROVIDER_DEFAULT_BASE_URLS[config.llm.provider] ? (
              <Button type="text" size="small" onClick={() => setConfig({ ...config, llm: { ...config.llm, base_url: PROVIDER_DEFAULT_BASE_URLS[config.llm.provider] || '' } })} style={{ color: '#00d4ff', fontSize: 10, padding: '0 4px' }}>重置</Button>
            ) : null} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            模型 {loadingModels && '(加载中...)'}
          </label>
          {manualModelInput ? (
            <Input style={inputStyle} placeholder="手动输入模型名称，如 gpt-4o" value={config.llm.model}
              onChange={e => setConfig({ ...config, llm: { ...config.llm, model: e.target.value } })}
              addonAfter={<Button type="text" size="small" onClick={() => setManualModelInput(false)}>← 返回列表</Button>} />
          ) : (
            <Select style={selectStyle} value={config.llm.model || undefined} onChange={v => {
              if (v === '__manual_input__') { setManualModelInput(true); setConfig({ ...config, llm: { ...config.llm, model: '' } }); }
              else setConfig({ ...config, llm: { ...config.llm, model: v } });
            }} placeholder={loadingModels ? '加载中...' : '请选择模型'} loading={loadingModels} showSearch allowClear
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={models.length > 0 ? [...models.map(m => ({ value: m, label: m })), { value: '__manual_input__', label: '✨ 手动输入模型名称' }] : [{ value: '__manual_input__', label: '✨ 手动输入模型名称' }]}
              notFoundContent={<div><div style={{ color: '#888', marginBottom: 8 }}>无法获取模型列表</div><Button type="primary" size="small" onClick={() => setManualModelInput(true)}>手动输入模型</Button></div>} />
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.Password style={{ ...inputStyle, flex: 1 }} placeholder="输入 API Key" value={config.llm.api_key}
              onChange={e => setConfig({ ...config, llm: { ...config.llm, api_key: e.target.value } })} />
            <Button onClick={() => fetchModels(config.llm.provider, config.llm.api_key, config.llm.model)} disabled={!config.llm.api_key} loading={loadingModels}
              style={{ background: 'rgba(0, 212, 255, 0.2)', border: '1px solid #00d4ff', color: '#00d4ff', whiteSpace: 'nowrap' }}>
              📥 获取模型
            </Button>
          </div>
          {modelError && (
            <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 4, background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#ff6b81', fontSize: 12 }}>
              <div style={{ fontWeight: 500, marginBottom: modelError.hint ? 4 : 0 }}>❌ {modelError.error}</div>
              {modelError.hint && <div style={{ color: '#ff8787' }}>💡 {modelError.hint}</div>}
              <Button type="link" size="small" onClick={() => setManualModelInput(true)} style={{ padding: '4px 0', height: 'auto', color: '#00d4ff' }}>手动输入模型名称 →</Button>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Temperature: {config.llm.temperature}</label>
          <Slider min={0} max={2} step={0.1} value={config.llm.temperature}
            onChange={v => setConfig({ ...config, llm: { ...config.llm, temperature: v } })}
            trackStyle={{ background: '#00d4ff' }} handleStyle={{ borderColor: '#00d4ff' }} />
        </div>
        {testResult && (
          <div style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 12, background: testResult.success ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)', border: `1px solid ${testResult.success ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`, color: testResult.success ? '#00ff88' : '#ff4757', fontSize: 13 }}>
            {testResult.success ? `🟢 连接成功！延迟: ${testResult.latency_ms}ms` : `🔴 ${testResult.error}`}
          </div>
        )}
        <Button onClick={testConnection} loading={testing} disabled={!config.llm.api_key}
          style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', color: 'white', width: '100%', boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)' }}>
          🔗 测试连接
        </Button>
      </SciFiCard>

      {/* Mode Config */}
      <SciFiCard title="⚙️ Agent 模式" icon="🔄">
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>模式</label>
          <Select style={selectStyle} value={config.mode.type}
            onChange={v => setConfig({ ...config, mode: { ...config.mode, type: v } })} options={AGENT_MODES} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>最大迭代次数: {config.mode.max_iterations}</label>
          <Slider min={1} max={50} value={config.mode.max_iterations}
            onChange={v => setConfig({ ...config, mode: { ...config.mode, max_iterations: v } })}
            trackStyle={{ background: '#00d4ff' }} handleStyle={{ borderColor: '#00d4ff' }} />
        </div>
      </SciFiCard>

      {/* Prompt Config */}
      <SciFiCard title="📝 提示词" icon="💬">
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>提示词模板</label>
          <Select style={selectStyle} value={config.prompt_template} onChange={v => {
            const tpl = PROMPT_TEMPLATES.find(t => t.value === v);
            setConfig({ ...config, prompt_template: v, prompt: { ...config.prompt, system: tpl?.template || config.prompt.system } });
          }} options={PROMPT_TEMPLATES.map(t => ({ value: t.value, label: t.label }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>系统提示词</label>
          <TextArea style={{ ...inputStyle, resize: 'none' }} rows={4} placeholder="你是一个...的 Agent"
            value={config.prompt.system} onChange={e => setConfig({ ...config, prompt: { ...config.prompt, system: e.target.value } })} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#888', fontSize: 12 }}>上下文推荐问题</span>
          <Switch size="small" checked={config.enable_suggestions}
            onChange={v => setConfig({ ...config, enable_suggestions: v })} />
        </div>
        {config.enable_suggestions && (
          <TextArea style={{ ...inputStyle, resize: 'none' }} rows={3} placeholder="每行一个问题，Agent会根据上下文推荐这些问题"
            value={config.suggestions} onChange={e => setConfig({ ...config, suggestions: e.target.value })} />
        )}
      </SciFiCard>
    </div>
  );

  const renderSkillsTab = () => (
    <div>
      <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
        选择该 Agent 可调用的 Skills（勾选启用）。Skills 将增强 Agent 的能力。
      </div>
      {SKILL_CATEGORIES.map(cat => (
        <div key={cat.key} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: cat.color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {cat.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {AVAILABLE_SKILLS.filter(s => s.category === cat.key).map(skill => (
              <div key={skill.id} onClick={() => toggleSkill(skill.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: config.skills.includes(skill.id) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${config.skills.includes(skill.id) ? '#3b82f6' : 'rgba(0, 212, 255, 0.2)'}`,
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                }}>
                <Checkbox checked={config.skills.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
                <span style={{ fontSize: 18 }}>{skill.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{skill.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{skill.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 8, border: '1px solid rgba(0, 212, 255, 0.2)' }}>
        <div style={{ color: '#00d4ff', fontSize: 13 }}>
          已选择 <strong>{config.skills.length}</strong> / {AVAILABLE_SKILLS.length} 个 Skills
        </div>
        {config.skills.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {config.skills.map(skillId => {
              const skill = AVAILABLE_SKILLS.find(s => s.id === skillId);
              return skill ? (
                <Tag key={skill.id} color="blue" style={{ margin: 0 }}>
                  {skill.icon} {skill.name}
                </Tag>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderMemoryTab = () => (
    <div>
      <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
        配置 Agent 的记忆系统，控制上下文保留和知识持久化。
      </div>
      
      {/* 记忆总开关 */}
      <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, border: '1px solid rgba(0, 212, 255, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🧠 启用记忆系统</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>控制 Agent 是否使用记忆功能</div>
          </div>
          <Switch checked={config.memory.enabled} onChange={v => setConfig({ ...config, memory: { ...config.memory, enabled: v } })} />
        </div>
      </div>

      {config.memory.enabled && (
        <>
          {/* 记忆类型 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>记忆类型</label>
            <Select style={selectStyle} value={config.memory.type}
              onChange={v => setConfig({ ...config, memory: { ...config.memory, type: v } })}
              options={MEMORY_TYPES} />
          </div>

          {/* 短期记忆 */}
          <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🧠 短期记忆</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>保留最近 N 条对话上下文</div>
              </div>
              <Switch checked={config.memory_detail.short_term_enabled}
                onChange={v => setConfig({ ...config, memory_detail: { ...config.memory_detail, short_term_enabled: v } })} />
            </div>
            {config.memory_detail.short_term_enabled && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <TextArea style={{ fontSize: 11, color: '#888', resize: 'none', background: 'transparent', border: 'none' }}>保留消息数</TextArea>
                  <Tag color="blue">{config.memory_detail.max_messages} 条</Tag>
                </div>
                <Slider min={10} max={200} step={10} value={config.memory_detail.max_messages}
                  onChange={v => setConfig({ ...config, memory_detail: { ...config.memory_detail, max_messages: v } })} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#666' }}>10条</span>
                  <span style={{ fontSize: 10, color: '#666' }}>200条</span>
                </div>
              </div>
            )}
          </div>

          {/* 长期记忆 */}
          <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>📚 长期记忆</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>基于向量数据库的持久化记忆</div>
              </div>
              <Switch checked={config.memory_detail.long_term_enabled}
                onChange={v => setConfig({ ...config, memory_detail: { ...config.memory_detail, long_term_enabled: v } })} />
            </div>
            {config.memory_detail.long_term_enabled && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>向量存储</label>
                  <Select style={selectStyle} value={config.memory_detail.storage}
                    onChange={v => setConfig({ ...config, memory_detail: { ...config.memory_detail, storage: v } })}
                    options={[
                      { value: 'chroma', label: 'Chroma (本地)' },
                      { value: 'pinecone', label: 'Pinecone (云端)' },
                      { value: 'weaviate', label: 'Weaviate (开源)' },
                      { value: 'memory', label: '内存 (仅开发)' },
                    ]} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <TextArea style={{ fontSize: 11, color: '#888', resize: 'none', background: 'transparent', border: 'none' }}>Top K 检索数</TextArea>
                    <Tag color="purple">{config.memory_detail.top_k}</Tag>
                  </div>
                  <Slider min={1} max={20} value={config.memory_detail.top_k}
                    onChange={v => setConfig({ ...config, memory_detail: { ...config.memory_detail, top_k: v } })} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: '#666' }}>1条</span>
                    <span style={{ fontSize: 10, color: '#666' }}>20条</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderSubAgentsTab = () => {
    const usedRoles = config.sub_agents.map(a => a.role);
    return (
      <div>
        <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
          配置 Agent 的子 Agent 团队（支持多角色协作）。每个子 Agent 可以执行特定任务。
        </div>

        {/* 已添加的子 Agent */}
        {config.sub_agents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 12 }}>已添加的子 Agent</div>
            {config.sub_agents.map(agent => {
              const preset = PRESET_ROLES.find(r => r.value === agent.role);
              return (
                <div key={agent.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: '#0f0f0f', borderRadius: 8,
                  marginBottom: 8, border: `1px solid ${agent.enabled ? '#3b82f6' : '#1a1a1a'}`,
                  opacity: agent.enabled ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 20 }}>{preset?.icon || '🤖'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{preset?.label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{preset?.description}</div>
                  </div>
                  <Tooltip title={agent.enabled ? '禁用' : '启用'}>
                    <Switch size="small" checked={agent.enabled} onChange={() => toggleSubAgentEnabled(agent.id)} />
                  </Tooltip>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeSubAgent(agent.id)} />
                </div>
              );
            })}
          </div>
        )}

        {/* 添加子 Agent */}
        <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 12 }}>添加子 Agent</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_ROLES.filter(r => !usedRoles.includes(r.value)).map(role => (
              <button key={role.value} onClick={() => addSubAgent(role.value)}
                style={{
                  padding: '8px 14px', background: '#0a0a12', border: '1px dashed #2a4a6a',
                  borderRadius: 6, color: '#8ab4f8', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <PlusOutlined /> {role.icon} {role.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 统计 */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <div style={{ color: '#a855f7', fontSize: 13 }}>
            共 <strong>{config.sub_agents.length}</strong> 个子 Agent，其中 <strong>{config.sub_agents.filter(a => a.enabled).length}</strong> 个已启用
          </div>
        </div>
      </div>
    );
  };

  const renderMCPTab = () => (
    <div>
      <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
        选择该 Agent 可调用的 MCP Tools（MCP = Model Context Protocol）。MCP Tools 提供外部能力集成。
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
        {AVAILABLE_MCP_TOOLS.map(tool => (
          <div key={tool.id} onClick={() => toggleMCPTool(tool.id)}
            style={{
              padding: '14px 16px', background: config.mcp_tools.includes(tool.id) ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${config.mcp_tools.includes(tool.id) ? '#a855f7' : 'rgba(0, 212, 255, 0.2)'}`,
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Checkbox checked={config.mcp_tools.includes(tool.id)} onChange={() => toggleMCPTool(tool.id)} />
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{tool.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{tool.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <div style={{ color: '#a855f7', fontSize: 13 }}>
          已启用 <strong>{config.mcp_tools.length}</strong> / {AVAILABLE_MCP_TOOLS.length} 个 MCP Tools
        </div>
        {config.mcp_tools.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {config.mcp_tools.map(toolId => {
              const tool = AVAILABLE_MCP_TOOLS.find(t => t.id === toolId);
              return tool ? (
                <Tag key={tool.id} color="purple">{tool.name}</Tag>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ============ Tab 配置 ============
  const tabItems = [
    {
      key: 'basic',
      label: <span><ControlOutlined /> 基础配置</span>,
      children: renderBasicTab(),
    },
    {
      key: 'skills',
      label: <span><CheckSquareOutlined /> Skills ({config.skills.length})</span>,
      children: renderSkillsTab(),
    },
    {
      key: 'memory',
      label: <span><ExperimentOutlined /> 记忆管理</span>,
      children: renderMemoryTab(),
    },
    {
      key: 'subagents',
      label: <span><TeamOutlined /> 子Agent ({config.sub_agents.length})</span>,
      children: renderSubAgentsTab(),
    },
    {
      key: 'mcp',
      label: <span><ApiOutlined /> MCP ({config.mcp_tools.length})</span>,
      children: renderMCPTab(),
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#0a0e17', padding: '24px', color: '#e0e6ed' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {agentId && (
            <Button size="small" onClick={onEditComplete} type="text" style={{ color: '#888' }}>← 返回</Button>
          )}
          <h1 style={{ color: '#00d4ff', margin: 0, textShadow: '0 0 20px rgba(0, 212, 255, 0.5)', fontSize: '24px' }}>
            {agentId ? '✏️ 编辑 Agent' : '🤖 Agent 配置中心 V3'}
          </h1>
        </div>
        <Tag color="green">🟢 在线</Tag>
      </div>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems}
        style={{ background: 'rgba(0, 20, 40, 0.4)', padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(0, 212, 255, 0.1)' }}
      />

      {/* Action Buttons */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Button size="large" onClick={handleSave}
          style={{ background: 'rgba(0, 212, 255, 0.2)', border: '1px solid #00d4ff', color: '#00d4ff' }}>
          💾 保存
        </Button>
        <Button size="large" onClick={handlePublish}
          style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', color: 'white', boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' }}>
          🚀 发布
        </Button>
        {agentId && (
          <Button size="large" onClick={handleDelete} danger
            style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.5)', color: '#ff4757' }}>
            🗑️ 删除
          </Button>
        )}
      </div>
    </div>
  );
}
