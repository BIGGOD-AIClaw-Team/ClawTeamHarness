import { useState, useEffect } from 'react';
import { Card, List, Button, Tag, Modal, Form, Input, Select, message, Space } from 'antd';
import { PlusIcon, DeleteIcon } from '../components/Icons';

type MemoryType = 'short_term' | 'long_term' | 'vector';

interface MemoryItem {
  id?: string;
  content: string;
  memory_type: MemoryType;
  metadata?: Record<string, any>;
}

export function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memoryType, setMemoryType] = useState<MemoryType>('short_term');
  const [form] = Form.useForm();

  const loadMemories = () => {
    fetch(`/api/memory/?memory_type=${memoryType}&limit=50`)
      .then(res => res.json())
      .then(data => setMemories(data.memories || []))
      .catch(() => setMemories([]));
  };

  useEffect(() => {
    loadMemories();
  }, [memoryType]);

  const handleAddMemory = (values: { content: string }) => {
    fetch('/api/memory/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, memory_type: memoryType }),
    })
      .then(() => {
        message.success('添加成功');
        setIsModalOpen(false);
        form.resetFields();
        loadMemories();
      })
      .catch(() => message.error('添加失败'));
  };

  const handleDeleteMemory = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记忆吗？',
      onOk: () => {
        fetch(`/api/memory/?id=${id}`, { method: 'DELETE' })
          .then(() => {
            message.success('已删除');
            loadMemories();
          })
          .catch(() => message.error('删除失败'));
      },
    });
  };

  return (
    <div>
      <Card
        title="记忆管理"
        extra={
          <Space>
            <Select value={memoryType} onChange={setMemoryType} style={{ width: 120 }}>
              <Select.Option value="short_term">短期记忆</Select.Option>
              <Select.Option value="long_term">长期记忆</Select.Option>
              <Select.Option value="vector">向量记忆</Select.Option>
            </Select>
            <Button type="primary" icon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
              添加记忆
            </Button>
          </Space>
        }
      >
        <List
          dataSource={memories}
          locale={{ emptyText: '暂无记忆' }}
          renderItem={(item: MemoryItem) => (
            <List.Item
              actions={[
                <Button key="delete" type="text" danger icon={<DeleteIcon />} onClick={() => item.id && handleDeleteMemory(item.id)} />
              ]}
            >
              <List.Item.Meta
                title={item.content.substring(0, 50) + (item.content.length > 50 ? '...' : '')}
                description={
                  <Space>
                    <Tag>{item.memory_type}</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal title="添加记忆" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAddMemory}>
          <Form.Item name="content" label="记忆内容" rules={[{ required: true, message: '请输入记忆内容' }]}>
            <Input.TextArea rows={4} placeholder="输入记忆内容..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>
    </div>
  );
}
