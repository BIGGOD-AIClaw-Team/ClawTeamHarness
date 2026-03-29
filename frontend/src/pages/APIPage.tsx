import React from 'react';
import { Card, Tabs, Table, Tag, Descriptions, Button, message } from 'antd';
import { ApiOutlined, KeyOutlined, ThunderboltOutlined } from '@ant-design/icons';

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/agents/', description: '列出所有 Agent', tag: 'agents' },
  { method: 'POST', path: '/api/agents/', description: '创建新 Agent', tag: 'agents' },
  { method: 'GET', path: '/api/agents/{agent_id}', description: '获取指定 Agent', tag: 'agents' },
  { method: 'PUT', path: '/api/agents/{agent_id}', description: '更新 Agent', tag: 'agents' },
  { method: 'DELETE', path: '/api/agents/{agent_id}', description: '删除 Agent', tag: 'agents' },
  { method: 'GET', path: '/api/skills/', description: '列出所有 Skills', tag: 'skills' },
  { method: 'GET', path: '/api/skills/{skill_name}', description: '获取 Skill 详情', tag: 'skills' },
  { method: 'POST', path: '/api/skills/{skill_name}/enable', description: '启用 Skill', tag: 'skills' },
  { method: 'POST', path: '/api/skills/{skill_name}/disable', description: '禁用 Skill', tag: 'skills' },
  { method: 'GET', path: '/api/memory/', description: '获取记忆列表', tag: 'memory' },
  { method: 'POST', path: '/api/memory/', description: '添加记忆', tag: 'memory' },
  { method: 'DELETE', path: '/api/memory/', description: '清除记忆', tag: 'memory' },
  { method: 'GET', path: '/health', description: '健康检查', tag: 'system' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
};

export function APIPage() {
  const [skills, setSkills] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/skills/')
      .then(res => res.json())
      .then(data => setSkills(data.skills || []))
      .catch(() => {});
  }, []);

  const columns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: string) => <Tag color={METHOD_COLORS[method] || 'default'}>{method}</Tag>,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      render: (path: string) => <code style={{ fontSize: 12 }}>{path}</code>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      width: 80,
      render: (tag: string) => <Tag>{tag}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'endpoints',
      label: <span><ApiOutlined /> API 端点</span>,
      children: (
        <Table 
          dataSource={API_ENDPOINTS} 
          columns={columns} 
          rowKey="path" 
          size="small"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'auth',
      label: <span><KeyOutlined /> 认证</span>,
      children: (
        <Card title="API Key 认证">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Header">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </Descriptions.Item>
            <Descriptions.Item label="环境变量">
              <code>CLAW_API_KEY=your_api_key_here</code>
            </Descriptions.Item>
            <Descriptions.Item label="说明">
              API Key 必须通过环境变量传入，禁止硬编码！
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'skills',
      label: <span><ThunderboltOutlined /> Skills</span>,
      children: (
        <Table 
          dataSource={skills} 
          rowKey="name"
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="green">{s}</Tag> },
            { 
              title: '已启用', 
              dataIndex: 'enabled', 
              key: 'enabled', 
              render: (e: boolean) => <Tag color={e ? 'green' : 'red'}>{e ? '是' : '否'}</Tag> 
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <Card title="API 文档">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
