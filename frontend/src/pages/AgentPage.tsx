import React from 'react';
import { Card, Button, List, Tag, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  graph_def?: any;
}

export function AgentPage() {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [form] = Form.useForm();

  const loadAgents = React.useCallback(() => {
    fetch('/api/agents/')
      .then(res => res.json())
      .then(data => setAgents(data.agents || []))
      .catch(err => message.error('加载失败: ' + err));
  }, []);

  React.useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreateAgent = (values: any) => {
    fetch('/api/agents/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then(data => {
        message.success('Agent 创建成功');
        setIsModalOpen(false);
        form.resetFields();
        loadAgents();
      })
      .catch(err => message.error('创建失败: ' + err));
  };

  const handleDeleteAgent = (agent_id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 Agent "${agent_id}" 吗？`,
      onOk: () => {
        fetch(`/api/agents/${agent_id}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(() => {
            message.success('已删除');
            loadAgents();
          })
          .catch(err => message.error('删除失败: ' + err));
      },
    });
  };

  return (
    <div>
      <Card 
        title="Agent 列表" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            创建 Agent
          </Button>
        }
      >
        <List
          dataSource={agents}
          locale={{ emptyText: '暂无 Agent，点击上方按钮创建' }}
          renderItem={(agent: Agent) => (
            <List.Item
              actions={[
                <Tag color="blue" key="edit" icon={<EditOutlined />} style={{ cursor: 'pointer' }}>编辑</Tag>,
                <Tag color="green" key="run" icon={<PlayCircleOutlined />} style={{ cursor: 'pointer' }}>运行</Tag>,
                <Tag color="red" key="delete" icon={<DeleteOutlined />} style={{ cursor: 'pointer' }} onClick={() => handleDeleteAgent(agent.agent_id)}>删除</Tag>,
              ]}
            >
              <List.Item.Meta
                title={agent.name || agent.agent_id}
                description={agent.description || "无描述"}
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="创建新 Agent"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAgent}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="Agent 名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="Agent 描述（可选）" rows={3} />
          </Form.Item>
          <Form.Item name="graph_def" label="图定义">
            <Input.TextArea placeholder='{"nodes": [], "edges": []}' rows={4} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>
    </div>
  );
}
