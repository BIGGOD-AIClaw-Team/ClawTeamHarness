import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Input, Button, List, Avatar, Alert, Select, message, Popconfirm } from 'antd';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

// Sci-Fi CSS Animations
const sciFiStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  @keyframes typing {
    from { width: 0; }
    to { width: 100%; }
  }
  
  .message-enter {
    animation: slideIn 0.3s ease-out;
  }
  
  .user-message {
    border-radius: 16px 16px 4px 16px !important;
  }
  
  .assistant-message {
    border-radius: 16px 16px 16px 4px !important;
  }
  
  .thinking-indicator::after {
    content: '...';
    animation: blink 1s infinite;
  }
  
  .thinking-dots {
    display: inline-block;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .typewriter-text {
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

// 配置 marked
marked.use({
  breaks: true,
  gfm: true,
});

// 自定义代码块渲染
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  session_id: string;
  agent_id: string;
  messages: Message[];
}

interface LLMProvider {
  value: string;
  label: string;
  models: { value: string; label: string }[];
  capabilities: {
    thinking: boolean;
    tool_use: boolean;
    vision: boolean;
    embedding: boolean;
  };
}

interface ChatPageProps {
  onEditAgent?: (agentId: string) => void;
  initialAgentId?: string | null;
}

// localStorage key for favorites
const FAVORITES_KEY = 'clawteamharness_agent_favorites';

export function ChatPage({ onEditAgent, initialAgentId }: ChatPageProps) {
  const [_sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载已发布的 Agent 列表
  const [publishedAgents, setPublishedAgents] = useState<any[]>([]);

  // P2-1: 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'favorites'>('all');

  // P2-2: 收藏状态
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // 从 localStorage 加载收藏状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
  }, []);

  // 持久化收藏状态到 localStorage
  const persistFavorites = useCallback((favs: Set<string>) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
    } catch (e) {
      console.error('Failed to persist favorites:', e);
    }
  }, []);

  // 切换收藏状态
  const toggleFavorite = useCallback((agentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      persistFavorites(next);
      return next;
    });
  }, [persistFavorites]);

  // 筛选后的 Agent 列表
  const filteredAgents = useCallback(() => {
    let agents = [...publishedAgents];

    // 按名称搜索
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      agents = agents.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    // Tab 筛选
    if (filterTab === 'favorites') {
      agents = agents.filter(a => favorites.has(a.agent_id));
    } else if (filterTab === 'mine') {
      // "我的" Tab：只显示本地创建的 Agent（通过 author 字段或本地存储判断）
      // 暂时用 author === 'local' 或本地 session 过滤，可按需调整
      agents = agents.filter(a => a.author === 'local' || a.author === undefined);
    }

    // 收藏的 Agent 置顶
    agents.sort((a, b) => {
      const aFav = favorites.has(a.agent_id) ? 1 : 0;
      const bFav = favorites.has(b.agent_id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return (a.name || '').localeCompare(b.name || '');
    });

    return agents;
  }, [publishedAgents, searchQuery, filterTab, favorites]);
  
  // 当前选中的模型
  const [currentModel, setCurrentModel] = useState<string>('gpt-4');
  
  // 可用模型列表
  const [availableModels, setAvailableModels] = useState<LLMProvider[]>([]);
  
  // 加载系统设置获取模型列表（从 /api/models/providers 获取已配置的 provider）
  useEffect(() => {
    fetch('/api/models/providers')
      .then(res => res.json())
      .then(data => {
        // 合并所有类型的 providers
        const allProviders = [
          ...(data.cloud || []),
          ...(data.local || []),
          ...(data.aggregation || []),
          ...(data.custom || []),
        ];
        // 只保留 enabled 且 credentials 完整的 provider
        const providers = allProviders
          .filter((p: any) => p.enabled && p.credentials && p.credentials.api_key)
          .map((p: any) => ({
            value: p.id,
            label: p.name,
            models: (p.models || []).map((m: any) => ({ 
              value: typeof m === 'string' ? m : m.id || m.name, 
              label: typeof m === 'string' ? m : (m.name || m.id || m),
            })),
            capabilities: {
              thinking: true,
              tool_use: true,
              vision: p.supported_kinds?.includes('vision') || false,
              embedding: p.supported_kinds?.includes('embedding') || false,
            },
          }));
        if (providers.length > 0) {
          setAvailableModels(providers);
        }
      })
      .catch(() => {
        // Fallback to default models
        setAvailableModels([
          { value: 'openai', label: 'OpenAI', models: [{ value: 'gpt-4', label: 'gpt-4' }, { value: 'gpt-4o', label: 'gpt-4o' }], capabilities: { thinking: true, tool_use: true, vision: true, embedding: true } },
          { value: 'anthropic', label: 'Anthropic', models: [{ value: 'claude-3-5-sonnet', label: 'claude-3-5-sonnet' }], capabilities: { thinking: true, tool_use: false, vision: true, embedding: false } },
        ]);
      });
  }, []);

  // 加载已发布的 Agent 列表
  const loadPublishedAgents = useCallback(() => {
    fetch('/api/v1/agents/?status=published')
      .then(res => res.json())
      .then(data => setPublishedAgents(data.agents || []))
      .catch(err => console.error('Failed to load agents:', err));
  }, []);

  useEffect(() => {
    loadPublishedAgents();
  }, [loadPublishedAgents]);

  // Agent 发布后自动跳转并开始对话
  useEffect(() => {
    if (initialAgentId) {
      startNewChat(initialAgentId);
    }
  }, [initialAgentId]);

  // 删除 Agent
  const handleDeleteAgent = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resp = await fetch(`/api/v1/agents/${agentId}`, { method: 'DELETE' });
      if (resp.ok) {
        message.success('Agent 已删除');
        loadPublishedAgents();
        if (currentSession?.agent_id === agentId) {
          setCurrentSession(null);
        }
      } else {
        const data = await resp.json();
        message.error(data.detail || '删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  // 发送消息（流式）- 修复版：使用 ref 累积文本，减少 UI 更新
  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
    } : null);
    
    const userInput = input;
    setInput('');
    setLoading(true);
    setError(null);
    setStreaming(true);
    
    try {
      // 调用流式 API
      const resp = await fetch(`/api/v1/agents/${currentSession.agent_id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userInput, 
          session_id: currentSession.session_id,
          model: currentModel, // 传递选中的模型
        }),
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || '请求失败');
        setLoading(false);
        setStreaming(false);
        return;
      }
      
      const reader = resp.body?.getReader();
      if (!reader) {
        setError('无法读取响应流');
        setLoading(false);
        setStreaming(false);
        return;
      }
      
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = (Date.now() + 1).toString();
      
      // 添加空的 assistant 消息
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        }],
      } : null);
      
      // 使用 ref 累积完整文本，避免每次 chunk 都 setState
      const fullTextRef = { current: '' };
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 50; // 每 50ms 更新一次 UI
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.chunk) {
                fullTextRef.current += data.chunk;
                assistantContent += data.chunk;
                
                // 节流：只在一定时间间隔内更新 UI
                const now = Date.now();
                if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                  lastUpdateTime = now;
                  setCurrentSession(prev => {
                    if (!prev) return prev;
                    const msgs = [...prev.messages];
                    const lastIdx = msgs.length - 1;
                    if (msgs[lastIdx]?.role === 'assistant') {
                      msgs[lastIdx] = {
                        ...msgs[lastIdx],
                        content: fullTextRef.current,
                      };
                    }
                    return { ...prev, messages: msgs };
                  });
                }
              }
              
              if (data.done || data.error) {
                setStreaming(false);
                if (data.error) {
                  setError(data.error);
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 最终更新：确保显示完整文本
      setCurrentSession(prev => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'assistant') {
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content: fullTextRef.current,
          };
        }
        return { ...prev, messages: msgs };
      });
      
      setStreaming(false);
      
    } catch (e: any) {
      setError('请求失败: ' + (e.message || '网络错误'));
      setStreaming(false);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  // 创建新对话
  const startNewChat = async (agentId: string) => {
    // 创建新会话
    const sessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      session_id: sessionId,
      agent_id: agentId,
      messages: [],
    };
    
    // 尝试加载历史会话
    try {
      const sessionsResp = await fetch(`/api/v1/agents/${agentId}/conversations`);
      const sessionsData = await sessionsResp.json();
      
      if (sessionsData.conversations && sessionsData.conversations.length > 0) {
        // 使用最新的会话
        const latestConv = sessionsData.conversations[0];
        const messagesResp = await fetch(`/api/v1/agents/${agentId}/messages/${latestConv.id}`);
        const messagesData = await messagesResp.json();
        
        if (messagesData.messages && messagesData.messages.length > 0) {
          newSession.session_id = latestConv.session_id;
          newSession.messages = messagesData.messages.map((msg: any, idx: number) => ({
            id: `${idx}`,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      // 加载失败，继续使用空会话
      console.error('Failed to load history:', e);
    }
    
    setCurrentSession(newSession);
    setSessions(prev => [...prev, newSession]);
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 渲染 Markdown 内容（XSS 防护：使用 DOMPurify 消毒）
  const renderContent = (content: string) => {
    if (!content) return '';
    try {
      const html = marked.parse(content) as string;
      // 使用 DOMPurify 消毒，只允许安全标签
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'class', 'style'],
      });
    } catch {
      // 解析失败时转义返回
      return DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
  };

  // 模型选择器选项
  const modelOptions = availableModels.flatMap(p => 
    p.models.map(m => ({
      value: m.value,
      label: `${m.label} (${p.label})`,
      disabled: !p.capabilities.thinking,
    }))
  );

  return (
    <>
      <style>{sciFiStyles}</style>
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
      {/* 左侧：Agent 列表 */}
      <div style={{ width: 300, borderRight: '1px solid #f0f0f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>已发布 Agent</h3>

        {/* P2-1: 搜索框 */}
        <Input
          prefix="🔍"
          placeholder="搜索 Agent..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />

        {/* P2-1: Tab 筛选 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'mine', 'favorites'] as const).map(tab => (
            <Button
              key={tab}
              size="small"
              type={filterTab === tab ? 'primary' : 'text'}
              onClick={() => setFilterTab(tab)}
              style={{ flex: 1, fontSize: 12 }}
            >
              {tab === 'all' ? '全部' : tab === 'mine' ? '我的' : `收藏 ⭐`}
            </Button>
          ))}
        </div>

        {/* Agent 列表 */}
        <List
          dataSource={filteredAgents()}
          locale={{ emptyText: filterTab === 'favorites' ? '暂无收藏的 Agent' : '暂无 Agent' }}
          style={{ flex: 1, overflow: 'auto' }}
          renderItem={(agent: any) => (
            <List.Item
              key={agent.agent_id}
              style={{
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                marginBottom: 4,
                background: favorites.has(agent.agent_id) ? 'rgba(255, 200, 0, 0.08)' : 'transparent',
                border: favorites.has(agent.agent_id) ? '1px solid rgba(255, 200, 0, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onClick={() => startNewChat(agent.agent_id)}
              actions={[
                // P2-2: 收藏按钮
                <Button
                  key="favorite"
                  size="small"
                  type="text"
                  onClick={(e) => toggleFavorite(agent.agent_id, e)}
                  style={{ color: favorites.has(agent.agent_id) ? '#ffb800' : '#ccc', fontSize: 14 }}
                >
                  {favorites.has(agent.agent_id) ? '⭐' : '☆'}
                </Button>,
                onEditAgent ? (
                  <Button
                    key="edit"
                    size="small"
                    type="text"
                    onClick={(e) => { e.stopPropagation(); onEditAgent(agent.agent_id); }}
                  >
                    ✏️
                  </Button>
                ) : null,
                <Popconfirm
                  key="delete"
                  title="确认删除"
                  description={`确定要删除 Agent "${agent.name}" 吗？`}
                  onConfirm={(e) => handleDeleteAgent(agent.agent_id, e as any)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={(e) => e.stopPropagation()}
                  >
                    🗑️
                  </Button>
                </Popconfirm>
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ position: 'relative' }}>
                    <Avatar style={{ backgroundColor: '#1890ff' }}>🤖</Avatar>
                    {favorites.has(agent.agent_id) && (
                      <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>⭐</span>
                    )}
                  </div>
                }
                title={agent.name}
                description={agent.description || '无描述'}
              />
            </List.Item>
          )}
        />
      </div>
      
      {/* 右侧：对话界面 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
        {currentSession ? (
          <>
            {/* Agent 信息栏 + 收藏按钮 */}
            {currentSession && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 12,
                padding: '8px 12px',
                background: 'rgba(0, 20, 40, 0.6)',
                borderRadius: 8,
                border: '1px solid rgba(0, 212, 255, 0.2)',
              }}>
                <Avatar style={{ backgroundColor: '#1890ff' }}>🤖</Avatar>
                <span style={{ color: '#e0f7ff', fontSize: 14, flex: 1 }}>
                  {publishedAgents.find(a => a.agent_id === currentSession.agent_id)?.name || 'Agent'}
                </span>
                <Button
                  size="small"
                  type="text"
                  onClick={(e) => toggleFavorite(currentSession.agent_id, e)}
                  style={{ color: favorites.has(currentSession.agent_id) ? '#ffb800' : '#888', fontSize: 16 }}
                >
                  {favorites.has(currentSession.agent_id) ? '★' : '☆'}
                </Button>
              </div>
            )}
            
            {/* 模型选择器 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 12,
              padding: '8px 12px',
              background: 'rgba(0, 20, 40, 0.6)',
              borderRadius: 8,
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}>
              <span style={{ color: '#888', fontSize: 13 }}>模型：</span>
              <Select
                value={currentModel}
                onChange={setCurrentModel}
                options={modelOptions}
                style={{ minWidth: 200 }}
                dropdownStyle={{ background: '#0a1428' }}
              />
              <span style={{ color: '#666', fontSize: 11 }}>
                {availableModels.find(p => p.models.some(m => m.value === currentModel))?.capabilities.thinking ? '✓ 支持思考' : ''}
              </span>
            </div>
            
            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
              <List
                dataSource={currentSession.messages}
                locale={{ emptyText: '开始对话吧！' }}
                renderItem={(msg: Message) => (
                  <List.Item style={{ border: 'none', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Card 
                      className={msg.role === 'user' ? 'user-message' : 'assistant-message'}
                      style={{ 
                        maxWidth: '70%', 
                        background: msg.role === 'user' 
                          ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(124, 58, 237, 0.1) 100%)',
                        border: msg.role === 'user' 
                          ? '1px solid rgba(0, 212, 255, 0.5)'
                          : '1px solid rgba(124, 58, 237, 0.5)',
                        color: msg.role === 'user' ? '#e0f7ff' : '#e0d6ff',
                        boxShadow: msg.role === 'user'
                          ? '0 0 15px rgba(0, 212, 255, 0.2)'
                          : '0 0 15px rgba(124, 58, 237, 0.2)',
                        animation: 'slideIn 0.3s ease-out',
                      }}
                      bodyStyle={{ padding: 12 }}
                    >
                      {msg.role === 'user' ? (
                        <div>{msg.content}</div>
                      ) : (
                        <div 
                          dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                          style={{ lineHeight: 1.6 }}
                        />
                      )}
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
              
              {/* 思考中状态 */}
              {streaming && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px' }}>
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    marginRight: 8,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0ms' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '200ms' }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '400ms' }} />
                  </div>
                  <span style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0, 212, 255, 0.5)' }}>思考中</span>
                  <span className="thinking-dots" style={{ color: '#7c3aed' }}>...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* 错误提示 */}
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 12 }}
              />
            )}

            {/* 输入框 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Input.TextArea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="输入消息..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={loading || streaming}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button 
                type="primary" 
                onClick={sendMessage} 
                loading={loading || streaming}
                disabled={loading || streaming || !input.trim()}
              >
                {streaming ? '生成中' : '发送'}
              </Button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            选择左侧一个 Agent 开始对话
          </div>
        )}
      </div>
    </div>
    </>
  );
}
