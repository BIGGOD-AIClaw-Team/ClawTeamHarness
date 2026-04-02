import React from 'react';
import {
  TeamOutlined, EyeOutlined, AimOutlined, ThunderboltOutlined, AlertOutlined,
} from '@ant-design/icons';

// ==================== Constants ====================

export const PRESET_ROLES: import('./types').AgentRole[] = [
  {
    id: 'commander', role: 'commander', name: '指挥官', description: '负责统筹协调、任务分配、决策制定',
    icon: <TeamOutlined />, color: '#ff6b00', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'analyst', role: 'analyst', name: '分析师', description: '负责信息收集、数据分析、情报整理',
    icon: <EyeOutlined />, color: '#3b82f6', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'planner', role: 'planner', name: '规划师', description: '负责计划制定、任务分解、资源调度',
    icon: <AimOutlined />, color: '#22c55e', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'executor', role: 'executor', name: '执行者', description: '负责任务执行、工具调用、结果反馈',
    icon: <ThunderboltOutlined />, color: '#f59e0b', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'critic', role: 'critic', name: '评审员', description: '负责质量把控、结果审查、风险评估',
    icon: <AlertOutlined />, color: '#ef4444', enabled: true, status: 'idle', missions_completed: 0,
  },
];

export const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};

export const selectStyle: React.CSSProperties = { width: '100%' };

export const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const formatTime = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#888',
  medium: '#f59e0b',
  high: '#ff6b00',
  critical: '#ff4757',
};

export const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88',
  busy: '#00d4ff',
  offline: '#888',
  pending: '#888',
  running: '#00d4ff',
  completed: '#00ff88',
  failed: '#ff4757',
};

export const WORKFLOW_TYPE_OPTIONS = [
  { value: 'sequential', label: '🔄 顺序执行' },
  { value: 'parallel', label: '⚡ 并行执行' },
  { value: 'conditional', label: '🔀 条件执行' },
];

export const STEP_TYPE_OPTIONS = [
  { value: 'agent', label: '🤖 Agent' },
  { value: 'tool', label: '🛠️ 工具' },
  { value: 'condition', label: '❓ 条件' },
  { value: 'input', label: '📥 输入' },
  { value: 'output', label: '📤 输出' },
];

export const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'ollama', label: 'Ollama (本地)' },
  { value: 'minimax', label: 'MiniMax' },
];

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
const GOOGLE_MODELS = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
const AZURE_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-35-turbo'];
const OLLAMA_MODELS = ['llama3.2', 'qwen2.5', 'deepseek-v2'];
const MINIMAX_MODELS = ['MiniMax-M2', 'MiniMax-M2-Mini', 'abab6.5s'];

export const getModelsByProvider = (provider: string): { value: string; label: string }[] => {
  const map: Record<string, string[]> = {
    openai: OPENAI_MODELS,
    anthropic: ANTHROPIC_MODELS,
    google: GOOGLE_MODELS,
    azure: AZURE_MODELS,
    ollama: OLLAMA_MODELS,
    minimax: MINIMAX_MODELS,
  };
  return (map[provider] || []).map(m => ({ value: m, label: m }));
};

export const PRESET_SKILLS = [
  'github', 'weather', 'web-search', 'web-fetch', 'document-parsers',
  'apple-reminders', 'feishu-doc', 'feishu-drive', 'feishu-perm', 'feishu-wiki',
  'ima-note', 'healthcheck', 'remotion-best-practices',
];

export const PRESET_TOOLS = [
  'read', 'write', 'edit', 'exec', 'process', 'web_search', 'web_fetch', 'image',
  'message', 'edit', 'move', 'delete',
];

export const DEFAULT_AGENT_CAPABILITIES: Record<string, import('./types').AgentCapability> = {
  commander: {
    llm: { provider: 'openai', model: 'gpt-4o' },
    skills: ['github', 'web-search'],
    tools: ['read', 'write', 'exec'],
    prompt: '你是一位指挥官，负责统筹协调、任务分配和决策制定。',
  },
  analyst: {
    llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    skills: ['web-fetch', 'document-parsers'],
    tools: ['read', 'web_search', 'web_fetch'],
    prompt: '你是一位分析师，负责信息收集、数据分析和情报整理。',
  },
  planner: {
    llm: { provider: 'openai', model: 'gpt-4o-mini' },
    skills: ['github'],
    tools: ['read', 'write'],
    prompt: '你是一位规划师，负责计划制定、任务分解和资源调度。',
  },
  executor: {
    llm: { provider: 'google', model: 'gemini-2.0-flash' },
    skills: ['web-search', 'apple-reminders'],
    tools: ['read', 'write', 'edit', 'exec'],
    prompt: '你是一位执行者，负责任务执行、工具调用和结果反馈。',
  },
  critic: {
    llm: { provider: 'anthropic', model: 'claude-3-opus-20240229' },
    skills: ['healthcheck'],
    tools: ['read', 'write'],
    prompt: '你是一位评审员，负责质量把控、结果审查和风险评估。',
  },
};
