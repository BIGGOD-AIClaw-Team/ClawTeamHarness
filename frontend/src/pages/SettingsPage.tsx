import React from 'react';
import { Card, Form, Input, Button, Switch, Select, message, Divider, Tag, Descriptions } from 'antd';
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';

export function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleSave = (values: any) => {
    setLoading(true);
    // 模拟保存配置
    setTimeout(() => {
      message.success('配置已保存');
      setLoading(false);
    }, 500);
  };

  return (
    <div>
      <Card title="系统设置">
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{}}>
          <Divider>API 配置</Divider>
          <Form.Item label="API Key" name="api_key">
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
          <Form.Item label="API Base URL" name="api_base_url" initialValue="http://localhost:8000">
            <Input placeholder="API Base URL" />
          </Form.Item>

          <Divider>Agent 配置</Divider>
          <Form.Item label="默认模型" name="default_model" initialValue="gpt-4">
            <Select>
              <Select.Option value="gpt-4">GPT-4</Select.Option>
              <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
              <Select.Option value="claude-3">Claude-3</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="最大执行步骤" name="max_steps" initialValue={10}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="执行超时（秒）" name="timeout" initialValue={60}>
            <Input type="number" />
          </Form.Item>

          <Divider>Memory 配置</Divider>
          <Form.Item label="短期记忆容量" name="short_term_limit" initialValue={100}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="启用向量记忆" name="vector_enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Divider>MCP 配置</Divider>
          <Form.Item label="MCP 服务器 URL" name="mcp_server_url">
            <Input placeholder="http://localhost:8080" />
          </Form.Item>

          <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={loading}>
            保存设置
          </Button>
          <Button icon={<ReloadOutlined />} style={{ marginLeft: 8 }} onClick={() => form.resetFields()}>
            重置
          </Button>
        </Form>
      </Card>

      <Card title="系统信息" style={{ marginTop: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="版本">1.0.0 MVP</Descriptions.Item>
          <Descriptions.Item label="后端">FastAPI + Uvicorn</Descriptions.Item>
          <Descriptions.Item label="前端">React + Ant Design + Vite</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color="green">运行中</Tag></Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
