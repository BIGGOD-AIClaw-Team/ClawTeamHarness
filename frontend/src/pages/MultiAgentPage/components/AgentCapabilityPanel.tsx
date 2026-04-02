import { memo } from 'react';
import {
  Card, List, Avatar, Tag, Button, Typography, Row, Col, Select, Space,
} from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { AgentRole, AgentCapability } from '../types';

const { Text } = Typography;
import {
  LLM_PROVIDERS, getModelsByProvider, PRESET_SKILLS, PRESET_TOOLS,
} from '../constants';

interface AgentCapabilityPanelProps {
  agents: AgentRole[];
  selectedRole: string | null;
  capabilities: Record<string, AgentCapability>;
  onSelectRole: (role: string) => void;
  onUpdateLlm: (role: string, field: 'provider' | 'model', value: string) => void;
  onUpdateCapability: (role: string, updates: Partial<AgentCapability>) => void;
  onSave: (role: string) => void;
}

export const AgentCapabilityPanel = memo(function AgentCapabilityPanel({
  agents,
  selectedRole,
  capabilities,
  onSelectRole,
  onUpdateLlm,
  onUpdateCapability,
  onSave,
}: AgentCapabilityPanelProps) {
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '6px',
    color: '#e0e6ed',
  };

  const cap = selectedRole ? capabilities[selectedRole] : null;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card
          size="small"
          title="🤖 Agent 列表"
          style={{ background: 'rgba(0, 20, 40, 0.6)' }}
          styles={{ body: { padding: 0 } }}
        >
          <List
            dataSource={agents}
            renderItem={agent => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedRole === agent.role ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                  padding: '8px 12px',
                }}
                onClick={() => onSelectRole(agent.role)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{
                        background: agent.color + '20',
                        border: `2px solid ${agent.color}`,
                        color: agent.color,
                      }}
                      icon={agent.icon}
                    />
                  }
                  title={<Text style={{ color: '#e0e6ed' }}>{agent.name}</Text>}
                  description={<Text style={{ color: '#888', fontSize: 11 }}>{agent.description}</Text>}
                />
                <Button
                  key="config"
                  type="link"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={e => {
                    e.stopPropagation();
                    onSelectRole(agent.role);
                  }}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col xs={24} lg={16}>
        <Card
          size="small"
          title="⚙️ 能力配置详情"
          style={{ background: 'rgba(0, 20, 40, 0.6)' }}
        >
          {!selectedRole || !cap ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <Text>点击左侧 Agent 进行配置</Text>
            </div>
          ) : (
            <div>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>LLM Provider</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={cap.llm.provider}
                    onChange={v => onUpdateLlm(selectedRole, 'provider', v)}
                    options={LLM_PROVIDERS}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Model</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={cap.llm.model}
                    onChange={v => onUpdateLlm(selectedRole, 'model', v)}
                    options={getModelsByProvider(cap.llm.provider)}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Skills</Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  value={cap.skills}
                  onChange={v => onUpdateCapability(selectedRole, { skills: v })}
                  options={PRESET_SKILLS.map(s => ({ value: s, label: s }))}
                  placeholder="选择技能..."
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Tools</Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  value={cap.tools}
                  onChange={v => onUpdateCapability(selectedRole, { tools: v })}
                  options={PRESET_TOOLS.map(t => ({ value: t, label: t }))}
                  placeholder="选择工具..."
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>System Prompt</Text>
                <Select
                  mode="tags"
                  style={{ width: '100%', ...inputStyle }}
                  value={[cap.prompt]}
                  onChange={v => onUpdateCapability(selectedRole, { prompt: v[0] || '' })}
                  placeholder="输入 Agent 系统提示词..."
                  tokenSeparators={[',']}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={() => onSave(selectedRole)}>保存配置</Button>
              </div>
            </div>
          )}
        </Card>
        <Card
          size="small"
          title="📋 快速配置模板"
          style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}
        >
          <Space wrap>
            {agents.map(agent => (
              <Tag
                key={agent.role}
                style={{ padding: '4px 12px', cursor: 'pointer' }}
                onClick={() => onSelectRole(agent.role)}
              >
                {agent.icon} {agent.name}
              </Tag>
            ))}
          </Space>
        </Card>
      </Col>
    </Row>
  );
});
