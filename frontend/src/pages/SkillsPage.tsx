import React, { useCallback, useState } from 'react';
import { Card, Tabs, Table, Tag, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusIcon, DeleteIcon, RocketIcon } from '../components/Icons';

interface Skill {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
}

interface MCPServer {
  server_id: string;
  name: string;
  endpoint: string;
  auth_token?: string;
}

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isMCPModalOpen, setIsMCPModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadSkills = useCallback(() => {
    fetch('/api/skills/')
      .then(res => res.json())
      .then(data => setSkills(data.skills || []))
      .catch(err => message.error('加载 Skills 失败: ' + err));
  }, []);

  const loadMCPServers = useCallback(() => {
    fetch('/api/mcp/servers/')
      .then(res => res.json())
      .then(data => setMcpServers(data.servers || []))
      .catch(err => message.error('加载 MCP Servers 失败: ' + err));
  }, []);

  React.useEffect(() => {
    loadSkills();
    loadMCPServers();
  }, [loadSkills, loadMCPServers]);

  const handleAddMCPServer = (values: any) => {
    fetch('/api/mcp/servers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then(() => {
        message.success('MCP Server 添加成功');
        setIsMCPModalOpen(false);
        form.resetFields();
        loadMCPServers();
      })
      .catch(err => message.error('添加失败: ' + err));
  };

  const handleDeleteMCPServer = (server_id: string) => {
    fetch(`/api/mcp/servers/${server_id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        message.success('已删除');
        loadMCPServers();
      })
      .catch(err => message.error('删除失败: ' + err));
  };

  const skillColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (name: string) => <Tag color="blue">{name}</Tag> },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: string) => <Tag>{v}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    {
      title: '标签', dataIndex: 'tags', key: 'tags',
      render: (tags: string[]) => tags.map(t => <Tag key={t} style={{ marginBottom: 2 }}>{t}</Tag>),
    },
  ];

  const mcpColumns = [
    { title: 'ID', dataIndex: 'server_id', key: 'server_id', render: (id: string) => <Tag color="purple">{id}</Tag> },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Endpoint', dataIndex: 'endpoint', key: 'endpoint', render: (ep: string) => <code style={{ fontSize: 12 }}>{ep}</code> },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MCPServer) => (
        <Popconfirm
          title="确认删除"
          description={`确定要删除 MCP Server "${record.name}" 吗？`}
          onConfirm={() => handleDeleteMCPServer(record.server_id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteIcon />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="skills"
        items={[
          {
            key: 'skills',
            label: <span>🔧 Skills</span>,
            children: (
              <Card
                title="Skills 配置"
                extra={<Button icon={<RocketIcon />} onClick={loadSkills}>刷新</Button>}
              >
                <Table
                  dataSource={skills}
                  columns={skillColumns}
                  rowKey="name"
                  size="small"
                  locale={{ emptyText: '暂无注册 Skills' }}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'mcp',
            label: <span>🔌 MCP Servers</span>,
            children: (
              <Card
                title="MCP Servers"
                extra={
                  <Button type="primary" icon={<PlusIcon />} onClick={() => setIsMCPModalOpen(true)}>
                    添加 Server
                  </Button>
                }
              >
                <Table
                  dataSource={mcpServers}
                  columns={mcpColumns}
                  rowKey="server_id"
                  size="small"
                  locale={{ emptyText: '暂无 MCP Servers，点击右上角添加' }}
                  pagination={false}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="添加 MCP Server"
        open={isMCPModalOpen}
        onCancel={() => setIsMCPModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddMCPServer}>
          <Form.Item name="server_id" label="Server ID" rules={[{ required: true, message: '请输入 Server ID' }]}>
            <Input placeholder="如: my-mcp-server" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如: My MCP Server" />
          </Form.Item>
          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true, message: '请输入 Endpoint' }]}>
            <Input placeholder="如: http://localhost:3000/mcp" />
          </Form.Item>
          <Form.Item name="auth_token" label="认证 Token（可选）">
            <Input.Password placeholder="可选的认证 Token" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">添加</Button>
            <Button onClick={() => setIsMCPModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
