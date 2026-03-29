import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Alert, Spin } from 'antd';

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
    setError(null);
    
    try {
      // 调用 Agent 执行
      const resp = await fetch(`/api/agents/${currentSession.agent_id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, session_id: currentSession.session_id }),
      });
      
      const result = await resp.json();
      
      if (!resp.ok || result.error) {
        setError(result.error || result.detail || '执行失败');
        setLoading(false);
        return;
      }
      
      // 从 result.result 中提取响应内容
      let responseText = 'Agent 已收到消息';
      if (result.result) {
        // 尝试多种可能的结果格式
        responseText = result.result.response 
          || result.result.message 
          || result.result.text
          || result.result.content
          || JSON.stringify(result.result);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };
      
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
      } : null);
    } catch (e: any) {
      setError('请求失败: ' + (e.message || '网络错误'));
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
                disabled={loading}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button type="primary" onClick={sendMessage} loading={loading} disabled={loading}>
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
