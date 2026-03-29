import React from 'react';
import { Card, Tabs, Table, Tag, Button, Form, Input, Select, message, Space } from 'antd';
import { DatabaseOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface MemoryItem {
  id: string;
  content: string;
  memory_type: string;
  metadata: any;
}

export function MemoryPage() {
  const [shortTerm, setShortTerm] = React.useState<MemoryItem[]>([]);
  const [longTerm, setLongTerm] = React.useState<MemoryItem[]>([]);
  const [vector, setVector] = React.useState<MemoryItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form] = Form.useForm();

  const loadMemory = React.useCallback((type: string, setter: (data: MemoryItem[]) => void) => {
    fetch(`/api/memory/?memory_type=${type}`)
      .then(res => res.json())
      .then(data => setter(data.memories || []))
      .catch(err => message.error(`加载 ${type} 失败: ${err}`));
  }, []);

  const loadAll = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      loadMemory('short_term', setShortTerm),
      loadMemory('long_term', setLongTerm),
      loadMemory('vector', setVector),
    ]).finally(() => setLoading(false));
  }, [loadMemory]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAddMemory = (values: any) => {
    fetch('/api/memory/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then(data => {
        message.success('记忆添加成功');
        form.resetFields();
        loadAll();
      })
      .catch(err => message.error('添加失败: ' + err));
  };

  const handleClearMemory = (type: string) => {
    fetch(`/api/memory/?memory_type=${type}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        message.success(`${type} 已清空`);
        loadAll();
      })
      .catch(err => message.error('清空失败: ' + err));
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: '类型', dataIndex: 'memory_type', key: 'memory_type', width: 100, render: (t: string) => <Tag>{t}</Tag> },
  ];

  const tabItems = [
    {
      key: 'short_term',
      label: '短期记忆',
      children: (
        <Table dataSource={shortTerm} columns={columns} rowKey="id" size="small" loading={loading} />
      ),
    },
    {
      key: 'long_term',
      label: '长期记忆',
      children: (
        <Table dataSource={longTerm} columns={columns} rowKey="id" size="small" loading={loading} />
      ),
    },
    {
      key: 'vector',
      label: '向量记忆',
      children: (
        <Table dataSource={vector} columns={columns} rowKey="id" size="small" loading={loading} />
      ),
    },
  ];

  return (
    <div>
      <Card 
        title="记忆管理"
        extra={
          <Space>
            <Button icon={<DeleteOutlined />} onClick={() => handleClearMemory('short_term')}>清空短期</Button>
            <Button icon={<DeleteOutlined />} onClick={() => handleClearMemory('long_term')}>清空长期</Button>
            <Button icon={<DeleteOutlined />} onClick={() => handleClearMemory('vector')}>清空向量</Button>
          </Space>
        }
      >
        <Card title="添加记忆" size="small" style={{ marginBottom: 16 }}>
          <Form form={form} layout="inline" onFinish={handleAddMemory}>
            <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]} style={{ flex: 1 }}>
              <TextArea placeholder="记忆内容" rows={2} />
            </Form.Item>
            <Form.Item name="memory_type" initialValue="short_term" rules={[{ required: true }]}>
              <Select style={{ width: 120 }}>
                <Select.Option value="short_term">短期记忆</Select.Option>
                <Select.Option value="long_term">长期记忆</Select.Option>
                <Select.Option value="vector">向量记忆</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" icon={<PlusOutlined />} htmlType="submit">添加</Button>
            </Form.Item>
          </Form>
        </Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
