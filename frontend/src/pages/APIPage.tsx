import { Card, Table, Tag, Descriptions, Typography } from 'antd';


const { Title, Text } = Typography;

const apiEndpoints = [
  { method: 'GET', path: '/api/agents/', description: '列出所有 Agent', status: '正常' },
  { method: 'POST', path: '/api/agents/', description: '创建新 Agent', status: '正常' },
  { method: 'GET', path: '/api/agents/:id', description: '获取 Agent 详情', status: '正常' },
  { method: 'PUT', path: '/api/agents/:id', description: '更新 Agent', status: '正常' },
  { method: 'DELETE', path: '/api/agents/:id', description: '删除 Agent', status: '正常' },
  { method: 'POST', path: '/api/agents/:id/execute', description: '触发 Agent 执行', status: '正常' },
  { method: 'GET', path: '/api/skills/', description: '列出所有 Skills', status: '正常' },
  { method: 'GET', path: '/api/memory/', description: '获取记忆', status: '正常' },
  { method: 'POST', path: '/api/memory/', description: '添加记忆', status: '正常' },
  { method: 'GET', path: '/api/tasks/', description: '列出任务', status: '正常' },
  { method: 'GET', path: '/api/logs/', description: '查询日志', status: '正常' },
];

const methodColors: Record<string, string> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
};

export function APIPage() {
  const columns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag color={methodColors[method]}>{method}</Tag>,
    },
    { title: '路径', dataIndex: 'path', key: 'path', render: (path: string) => <Text code>{path}</Text> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color="green">{status}</Tag> },
  ];

  return (
    <div>
      <Title level={4}>API 文档</Title>
      <Card title="可用接口" style={{ marginBottom: 16 }}>
        <Table dataSource={apiEndpoints} columns={columns} rowKey="path" size="small" />
      </Card>
      
      <Card title="认证说明">
        <Descriptions column={1}>
          <Descriptions.Item label="方式">API Key 认证</Descriptions.Item>
          <Descriptions.Item label="Header">X-API-Key: your-api-key</Descriptions.Item>
          <Descriptions.Item label="注意">API Key 通过环境变量配置，切勿泄露</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
