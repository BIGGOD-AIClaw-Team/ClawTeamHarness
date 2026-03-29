import { useState } from 'react';
import { Card, Form, Input, Button, Switch, message, Divider, Typography, Space } from 'antd';
import { SaveIcon } from '../components/Icons';

const { Title, Text } = Typography;

export function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    message.success('设置已保存');
    setLoading(false);
  };

  return (
    <div>
      <Title level={4}>系统设置</Title>
      
      <Card title="LLM 配置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{
          llm_provider: 'openai',
          llm_model: 'gpt-4',
          log_level: 'INFO',
        }}>
          <Form.Item name="llm_provider" label="LLM Provider">
            <Input placeholder="openai" />
          </Form.Item>
          <Form.Item name="llm_model" label="模型">
            <Input placeholder="gpt-4" />
          </Form.Item>
          <Text type="secondary">API Key 请通过环境变量 LLM_API_KEY 配置</Text>
          <Divider />
          <Button type="primary" icon={<SaveIcon />} htmlType="submit" loading={loading}>
            保存设置
          </Button>
        </Form>
      </Card>

      <Card title="日志配置" style={{ marginBottom: 16 }}>
        <Form layout="vertical" onFinish={handleSave} initialValues={{ log_level: 'INFO' }}>
          <Form.Item name="log_level" label="日志级别">
            <Input placeholder="DEBUG, INFO, WARNING, ERROR" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="安全设置">
        <Space direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>CORS 跨域支持</Text>
            <Switch />
          </div>
          <Text type="secondary">生产环境建议关闭 CORS</Text>
        </Space>
      </Card>
    </div>
  );
}
