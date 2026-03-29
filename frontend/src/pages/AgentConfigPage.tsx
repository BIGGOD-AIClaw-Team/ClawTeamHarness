import { useState } from 'react';
import { Card, Tabs, Form, Input, Select, Switch, Slider, Button, message } from 'antd';

const { TabPane } = Tabs;

export function AgentConfigPage() {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');

  const handleSave = async (values: any) => {
    try {
      await fetch('/api/agents/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      message.success('保存成功');
    } catch (e) {
      message.error('保存失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="创建 Agent">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="基本信息" key="basic">
              <Form.Item name="name" label="Agent 名称" rules={[{ required: true }]}>
                <Input placeholder="给 Agent 起个名字" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={3} placeholder="描述这个 Agent 的用途" />
              </Form.Item>
            </TabPane>

            <TabPane tab="模型" key="llm">
              <Form.Item name={['llm', 'provider']} label="LLM Provider" initialValue="openai">
                <Select>
                  <Select.Option value="openai">OpenAI</Select.Option>
                  <Select.Option value="anthropic">Anthropic</Select.Option>
                  <Select.Option value="local">Local</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name={['llm', 'model']} label="模型" initialValue="gpt-4">
                <Input placeholder="gpt-4" />
              </Form.Item>
              <Form.Item name={['llm', 'temperature']} label="Temperature" initialValue={0.7}>
                <Slider min={0} max={2} step={0.1} />
              </Form.Item>
            </TabPane>

            <TabPane tab="模式" key="mode">
              <Form.Item name={['mode', 'type']} label="Agent 模式" initialValue="react">
                <Select>
                  <Select.Option value="react">ReAct (推荐)</Select.Option>
                  <Select.Option value="plan_and_execute">Plan-and-Execute</Select.Option>
                  <Select.Option value="chat_conversation">Chat Conversation</Select.Option>
                  <Select.Option value="baby_agi">Baby AGI</Select.Option>
                  <Select.Option value="auto_gpt">AutoGPT</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name={['mode', 'max_iterations']} label="最大迭代次数" initialValue={10}>
                <Input type="number" />
              </Form.Item>
            </TabPane>

            <TabPane tab="提示词" key="prompt">
              <Form.Item name={['prompt', 'system']} label="系统提示词">
                <Input.TextArea rows={6} placeholder="你是一个...的 Agent" />
              </Form.Item>
            </TabPane>

            <TabPane tab="记忆" key="memory">
              <Form.Item name={['memory', 'enabled']} label="启用记忆" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
              <Form.Item name={['memory', 'type']} label="记忆类型" initialValue="hybrid">
                <Select>
                  <Select.Option value="short_term">短期记忆</Select.Option>
                  <Select.Option value="long_term">长期记忆</Select.Option>
                  <Select.Option value="vector">向量记忆</Select.Option>
                  <Select.Option value="hybrid">混合记忆</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name={['memory', 'short_term', 'max_messages']} label="短期记忆容量" initialValue={50}>
                <Slider min={10} max={100} />
              </Form.Item>
            </TabPane>

            <TabPane tab="决策" key="decision">
              <Form.Item name={['decision', 'auto_critique']} label="自动反思" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
              <Form.Item name={['decision', 'confidence_threshold']} label="置信度阈值" initialValue={0.8}>
                <Slider min={0} max={1} step={0.1} />
              </Form.Item>
            </TabPane>

            <TabPane tab="工具" key="tools">
              <Form.Item label="Skills">
                <Switch /> Calculator
                <Switch /> Search
                <Switch /> WebRequest
              </Form.Item>
              <Form.Item label="MCP Servers">
                <Switch /> Filesystem
                <Switch /> HTTP Request
              </Form.Item>
            </TabPane>

            <TabPane tab="多智能体" key="multi_agent">
              <Form.Item name={['multi_agent', 'enabled']} label="启用多智能体" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </TabPane>
          </Tabs>

          <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
            保存 Agent
          </Button>
        </Form>
      </Card>
    </div>
  );
}
