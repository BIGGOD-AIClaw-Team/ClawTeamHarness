import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Alert, Spin } from 'antd';
import { marked } from 'marked';
import hljs from 'highlight.js';

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

interface ChatPageProps {
  onEditAgent?: (agentId: string) => void;
}

export function ChatPage({ onEditAgent }: ChatPageProps) {
  const [_sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载已发布的 Agent 列表
  const [publishedAgents, setPublishedAgents] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/agents/?status=published')
      .then(res => res.json())
      .then(data => setPublishedAgents(data.agents || []));
  }, []);

  // 发送消息（流式）
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
      const resp = await fetch(`/api/agents/${currentSession.agent_id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput, session_id: currentSession.session_id }),
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
      
      // 添加空的 assistant 消息
      const assistantMessageId = (Date.now() + 1).toString();
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        }],
      } : null);
      
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
                assistantContent += data.chunk;
                // 实时更新消息
                setCurrentSession(prev => {
                  if (!prev) return prev;
                  const msgs = [...prev.messages];
                  const lastIdx = msgs.length - 1;
                  if (msgs[lastIdx]?.role === 'assistant') {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      content: assistantContent,
                    };
                  }
                  return { ...prev, messages: msgs };
                });
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
  const startNewChat = (agentId: string) => {
    const newSession: ChatSession = {
      session_id: `session_${Date.now()}`,
      agent_id: agentId,
      messages: [],
    };
    setCurrentSession(newSession);
    setSessions(prev => [...prev, newSession]);
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 渲染 Markdown 内容
  const renderContent = (content: string) => {
    if (!content) return '';
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
      {/* 左侧：Agent 列表 */}
      <div style={{ width: 280, borderRight: '1px solid #f0f0f0', padding: 16 }}>
        <h3>已发布 Agent</h3>
        <List
          dataSource={publishedAgents}
          locale={{ emptyText: '暂无已发布的 Agent' }}
          renderItem={(agent: any) => (
            <List.Item 
              key={agent.agent_id}
              style={{ cursor: 'pointer', padding: 8 }}
              onClick={() => startNewChat(agent.agent_id)}
              actions={onEditAgent ? [
                <Button 
                  key="edit" 
                  size="small" 
                  type="text" 
                  onClick={(e) => { e.stopPropagation(); onEditAgent(agent.agent_id); }}
                >
                  ✏️ 编辑
                </Button>
              ] : []}
            >
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>🤖</Avatar>}
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
            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
              <List
                dataSource={currentSession.messages}
                locale={{ emptyText: '开始对话吧！' }}
                renderItem={(msg: Message) => (
                  <List.Item style={{ border: 'none', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Card 
                      style={{ 
                        maxWidth: '70%', 
                        background: msg.role === 'user' ? '#1890ff' : '#f5f5f5',
                        color: msg.role === 'user' ? 'white' : 'black',
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
                  <Spin size="small" style={{ marginRight: 8 }} />
                  <span style={{ color: '#888' }}>思考中...</span>
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
  );
}
