import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar } from 'antd';

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

export function ChatPage() {
  const [_sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载已发布的 Agent 列表
  const [publishedAgents, setPublishedAgents] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/agents/?status=published')
      .then(res => res.json())
      .then(data => setPublishedAgents(data.agents || []));
  }, []);

  // 发送消息
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
    
    setInput('');
    setLoading(true);
    
    try {
      // 调用 Agent 执行
      const resp = await fetch(`/api/agents/${currentSession.agent_id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { message: input }, session_id: currentSession.session_id }),
      });
      
      const result = await resp.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.result?.response || result.result?.message || 'Agent 响应中...',
        timestamp: new Date().toISOString(),
      };
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
      } : null);
    } catch (e) {
      console.error('Agent execution failed:', e);
    } finally {
      setLoading(false);
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
                    >
                      <div>{msg.content}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
              <div ref={messagesEndRef} />
            </div>
            
            {/* 输入框 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Input.TextArea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="输入消息..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button type="primary" onClick={sendMessage} loading={loading}>
                发送
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
