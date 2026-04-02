import { memo, useCallback, useMemo } from 'react';
import {
  Modal, Form, Select, Input, Tag, Space, Typography, Row, Col,
  Divider, Button, message, Switch,
} from 'antd';
import { SettingOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { AgentRole, AgentCapability } from '../types';
import {
  LLM_PROVIDERS, getModelsByProvider, PRESET_SKILLS, PRESET_TOOLS,
  inputStyle,
} from '../constants';

const { Text } = Typography;
const { TextArea } = Input;

interface AgentConfigModalProps {
  visible: boolean;
  agent: AgentRole | null;
  capabilities: Record<string, AgentCapability>;
  onClose: () => void;
  onSave: (role: string, cap: AgentCapability) => void;
}

export const AgentConfigModal = memo(function AgentConfigModal({
  visible,
  agent,
  capabilities,
  onClose,
  onSave,
}: AgentConfigModalProps) {
  const [form] = Form.useForm();

  const cap = agent ? (capabilities[agent.role] || {
    llm: { provider: 'openai', model: 'gpt-4o' },
    skills: [],
    tools: [],
    prompt: '',
  }) : null;

  const handleProviderChange = useCallback((value: string) => {
    const models = getModelsByProvider(value);
    form.setFieldsValue({ model: models[0]?.value || '' });
  }, [form]);

  const handleSave = useCallback(() => {
    if (!agent) return;
    const values = form.getFieldsValue();
    const newCap: AgentCapability = {
      llm: { provider: values.provider, model: values.model },
      skills: values.skills || [],
      tools: values.tools || [],
      prompt: values.prompt || '',
    };
    onSave(agent.role, newCap);
    message.success(`${agent.name} 配置已保存`);
    onClose();
  }, [agent, form, onSave, onClose]);

  const isTemporary = agent?.role.startsWith('dynamic_');

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>配置 Agent: {agent?.name || ''}</span>
          {isTemporary && <Tag color="orange">临时</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          <Button icon={<CloseOutlined />} onClick={onClose}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
        </Space>
      }
      destroyOnClose
    >
      {agent && cap && (
        <>
          {/* Agent Info Banner */}
          <div style={{
            background: 'rgba(0, 20, 40, 0.6)',
            border: `1px solid ${agent.color}40`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: agent.color + '20',
              border: `2px solid ${agent.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: agent.color,
              fontSize: 18,
            }}>
              {agent.icon}
            </div>
            <div>
              <Text style={{ color: '#e0e6ed', fontWeight: 600, display: 'block' }}>{agent.name}</Text>
              <Text style={{ color: '#888', fontSize: 11 }}>{agent.description}</Text>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: agent.status === 'idle' ? '#00ff88' : agent.status === 'busy' ? '#00d4ff' : '#888',
              }} />
              <Text style={{ color: '#888', fontSize: 11 }}>
                {agent.status === 'idle' ? '空闲' : agent.status === 'busy' ? '工作中' : '离线'}
              </Text>
              <Text style={{ color: '#888', fontSize: 11 }}>· {agent.missions_completed} 个任务</Text>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              provider: cap.llm.provider,
              model: cap.llm.model,
              skills: cap.skills,
              tools: cap.tools,
              prompt: cap.prompt,
            }}
          >
            {/* LLM Configuration */}
            <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
              🤖 LLM 配置
            </Divider>
            <Row gutter={[12, 0]}>
              <Col span={12}>
                <Form.Item name="provider" label={<Text style={{ color: '#888', fontSize: 11 }}>Provider</Text>} style={{ marginBottom: 12 }}>
                  <Select
                    style={{ width: '100%' }}
                    options={LLM_PROVIDERS}
                    onChange={handleProviderChange}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="model" label={<Text style={{ color: '#888', fontSize: 11 }}>Model</Text>} style={{ marginBottom: 12 }}>
                  <Select style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {/* Skills */}
            <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
              🛠️ Skills（可多选）
            </Divider>
            <Form.Item name="skills" style={{ marginBottom: 12 }}>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择此 Agent 可用的 Skills..."
                options={PRESET_SKILLS.map(s => ({ value: s, label: s }))}
                tagRender={({ label, closable, onClose }) => (
                  <Tag
                    key={label as string}
                    closable={closable}
                    onClose={onClose}
                    style={{ marginRight: 3 }}
                  >
                    {label}
                  </Tag>
                )}
              />
            </Form.Item>

            {/* Tools */}
            <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
              🔧 Tools（可多选）
            </Divider>
            <Form.Item name="tools" style={{ marginBottom: 12 }}>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择此 Agent 可用的 Tools..."
                options={PRESET_TOOLS.map(t => ({ value: t, label: t }))}
                tagRender={({ label, closable, onClose }) => (
                  <Tag
                    key={label as string}
                    closable={closable}
                    onClose={onClose}
                    color="blue"
                    style={{ marginRight: 3 }}
                  >
                    {label}
                  </Tag>
                )}
              />
            </Form.Item>

            {/* System Prompt */}
            <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
              💬 System Prompt
            </Divider>
            <Form.Item name="prompt" style={{ marginBottom: 0 }}>
              <TextArea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                rows={4}
                placeholder="输入 Agent 的系统提示词，用于定义其角色、行为和能力..."
              />
            </Form.Item>
          </Form>

          {/* Quick Templates */}
          <Divider orientation="left" plain style={{ margin: '16px 0 12px', fontSize: 12 }}>
            📋 快速模板
          </Divider>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              { label: '通用助手', prompt: `你是一位${agent.name}，负责${agent.description}。` },
              { label: '研究型', prompt: `你是一位专业的研究助手，擅长信息收集、分析和总结。请以结构化方式输出结果。` },
              { label: '执行型', prompt: `你是一位高效执行者，收到任务后立即行动，注重效率和结果交付。` },
            ].map(tpl => (
              <Tag
                key={tpl.label}
                style={{ cursor: 'pointer', padding: '4px 10px' }}
                onClick={() => form.setFieldValue('prompt', tpl.prompt)}
              >
                {tpl.label}
              </Tag>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
});
