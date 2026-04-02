import React, { memo, useCallback } from 'react';
import { Card, Input, Button, Typography } from 'antd';
import { SendOutlined, MessageOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface TeamChatProps {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
}

export const TeamChat = memo(function TeamChat({ messages, inputValue, onInputChange, onSend }: TeamChatProps) {
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
    <Card
      size="small"
      title="💬 团队对话"
      style={{
        background: 'rgba(0, 20, 40, 0.6)',
        height: 400,
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' } }}
    >
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
            <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <div style={{ fontSize: 12 }}>开始与团队对话</div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  background: msg.sender === 'user' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 8,
                  border: `1px solid ${msg.sender === 'user' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>
                  {msg.sender === 'user' ? '你' : msg.sender} · {msg.time}
                </div>
                <Text style={{ color: '#e0e6ed', fontSize: 13 }}>{msg.text}</Text>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <TextArea
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: '#e0e6ed',
            resize: 'none',
          }}
          rows={2}
          placeholder="输入消息..."
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onPressEnter={handleKeyPress}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSend}
          style={{ alignSelf: 'flex-end' }}
        />
      </div>
    </Card>
  );
});
