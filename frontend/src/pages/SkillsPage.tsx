import { useCallback, useState, useEffect } from 'react';
import { Card, Tabs, Table, Tag, Button, Modal, Form, Input, message, Space, Popconfirm, Divider, Typography } from 'antd';
import { PlusIcon, DeleteIcon, RocketIcon, SaveIcon } from '../components/Icons';

const { Text } = Typography;

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

  // Skills.md 内容
  const [skillsMdContent, setSkillsMdContent] = useState('');
  const [skillsMdPath, setSkillsMdPath] = useState('');
  const [_loadingSkillsMd, setLoadingSkillsMd] = useState(false);
  const [savingSkillsMd, setSavingSkillsMd] = useState(false);
  const [isSkillsMdModalOpen, setIsSkillsMdModalOpen] = useState(false);

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

  const loadSkillsMdContent = useCallback(() => {
    setLoadingSkillsMd(true);
    fetch('/api/skills/content')
      .then(res => res.json())
      .then(data => {
        setSkillsMdContent(data.content || '');
        setSkillsMdPath(data.path || '');
      })
      .catch(err => {
        message.error('加载 skills.md 失败: ' + err);
      })
      .finally(() => setLoadingSkillsMd(false));
  }, []);

  useEffect(() => {
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

  const handleSaveSkillsMd = async () => {
    setSavingSkillsMd(true);
    try {
      const resp = await fetch('/api/skills/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: skillsMdContent }),
      });
      if (resp.ok) {
        message.success('skills.md 保存成功');
        setIsSkillsMdModalOpen(false);
      } else {
        const data = await resp.json();
        message.error(data.detail || '保存失败');
      }
    } catch (err: any) {
      message.error('保存失败: ' + err.message);
    } finally {
      setSavingSkillsMd(false);
    }
  };

  const handleOpenSkillsMdModal = () => {
    loadSkillsMdContent();
    setIsSkillsMdModalOpen(true);
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
                extra={
                  <Space>
                    <Button icon={<RocketIcon />} onClick={loadSkills}>刷新</Button>
                    <Button type="primary" icon={<SaveIcon />} onClick={handleOpenSkillsMdModal}>
                      编辑 skills.md
                    </Button>
                  </Space>
                }
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

      {/* Skills.md 编辑 Modal */}
      <Modal
        title={
          <div>
            <span>📝 编辑 skills.md</span>
            {skillsMdPath && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                {skillsMdPath}
              </Text>
            )}
          </div>
        }
        open={isSkillsMdModalOpen}
        onCancel={() => setIsSkillsMdModalOpen(false)}
        width={800}
        footer={
          <Space>
            <Button onClick={() => setIsSkillsMdModalOpen(false)}>取消</Button>
            <Button type="primary" icon={<SaveIcon />} onClick={handleSaveSkillsMd} loading={savingSkillsMd}>
              保存
            </Button>
          </Space>
        }
      >
        <Divider />
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">支持 Markdown 格式，保存后将更新 skills.md 配置文件</Text>
        </div>
        <Input.TextArea
          value={skillsMdContent}
          onChange={e => setSkillsMdContent(e.target.value)}
          rows={20}
          style={{ 
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: 13,
            background: '#0a1428',
            color: '#e0e6ed',
          }}
          placeholder="# Skills 配置&#10;&#10;在此编辑 skills.md 内容..."
        />
      </Modal>
    </div>
  );
}
