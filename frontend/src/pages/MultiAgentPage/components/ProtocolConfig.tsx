import { memo } from 'react';
import { Card, Radio, Space, Typography, Input, Row, Col, Divider, Button } from 'antd';
import { CollaborationConfig } from '../types';

const { Text } = Typography;

interface ProtocolConfigProps {
  config: CollaborationConfig;
  onModeChange: (mode: CollaborationConfig['mode']) => void;
  onFileBaseDirChange: (dir: string) => void;
  onWsEndpointChange: (endpoint: string) => void;
  onSave: () => void;
}

const MODES = [
  { value: 'file', label: '📁 文件协议', desc: '通过共享文件系统传递消息和状态' },
  { value: 'protocol', label: '🔌 WebSocket 协议', desc: '通过 WebSocket 实时双向通信' },
  { value: 'hybrid', label: '🔗 混合模式', desc: '结合文件存储与实时通信的优势' },
];

export const ProtocolConfig = memo(function ProtocolConfig({
  config,
  onModeChange,
  onFileBaseDirChange,
  onWsEndpointChange,
  onSave,
}: ProtocolConfigProps) {
  const cardStyle: React.CSSProperties = {
    background: 'rgba(0, 20, 40, 0.6)',
    border: '1px solid rgba(0, 212, 255, 0.1)',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '6px',
    color: '#e0e6ed',
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card size="small" title="🔧 协议模式选择" style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MODES.map(mode => (
              <Card
                key={mode.value}
                size="small"
                style={{
                  cursor: 'pointer',
                  background: config.mode === mode.value ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                  border: `1px solid ${config.mode === mode.value ? '#00d4ff' : 'rgba(0, 212, 255, 0.1)'}`,
                }}
                onClick={() => onModeChange(mode.value as CollaborationConfig['mode'])}
              >
                <Space>
                  <Radio checked={config.mode === mode.value} />
                  <div>
                    <Text strong style={{ color: '#e0e6ed', fontSize: 13 }}>{mode.label}</Text>
                    <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>{mode.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </div>
        </Card>
        <Card size="small" title="📂 文件协议配置" style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>任务目录</Text>
            <Input
              style={inputStyle}
              value={config.fileBaseDir}
              onChange={e => onFileBaseDirChange(e.target.value)}
              placeholder="/workspace/tasks"
              addonBefore="路径"
            />
          </div>
          <Text style={{ color: '#888', fontSize: 11 }}>
            文件协议说明：Agent 之间通过共享目录下的 JSON 文件交换消息和状态。每个任务创建一个子目录，包含输入、输出和状态文件。
          </Text>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" title="🔌 WebSocket 协议配置" style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>WebSocket 端点</Text>
            <Input
              style={inputStyle}
              value={config.wsEndpoint}
              onChange={e => onWsEndpointChange(e.target.value)}
              placeholder="ws://localhost:8080/ws"
              addonBefore="WS"
            />
          </div>
          <Text style={{ color: '#888', fontSize: 11 }}>
            WebSocket 协议说明：建立 Agent 之间的持久连接，支持实时消息推送和事件通知。适合低延迟协作场景。
          </Text>
        </Card>
        <Card size="small" title="🔗 混合模式说明" style={{ ...cardStyle, marginTop: 16 }}>
          <Text style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 12 }}>
            混合模式结合文件存储的持久性和 WebSocket 的实时性：关键状态变更写入文件确保持久化，实时事件通过 WebSocket 推送。
          </Text>
          <Divider style={{ margin: '8px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>✓ 文件存储</Text>
              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>任务状态、结果、持久化数据</Text>
            </div>
            <div>
              <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>✓ WebSocket</Text>
              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>进度更新、事件通知、心跳检测</Text>
            </div>
          </div>
        </Card>
        <Card size="small" title="📊 当前配置摘要" style={{ ...cardStyle, marginTop: 16 }}>
          <Row gutter={[8, 8]}>
            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>协议模式</Text></Col>
            <Col span={12}>
              <span style={{ color: '#00d4ff', fontSize: 12 }}>
                {config.mode === 'file' ? '📁 文件协议' : config.mode === 'protocol' ? '🔌 WebSocket' : '🔗 混合模式'}
              </span>
            </Col>
            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>任务目录</Text></Col>
            <Col span={12}><Text style={{ color: '#00d4ff', fontSize: 12 }}>{config.fileBaseDir}</Text></Col>
            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>WS 端点</Text></Col>
            <Col span={12}><Text style={{ color: '#00d4ff', fontSize: 12 }}>{config.wsEndpoint}</Text></Col>
          </Row>
          <Divider style={{ margin: '8px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
          <Button type="primary" block onClick={onSave}>保存协议配置</Button>
        </Card>
      </Col>
    </Row>
  );
});
