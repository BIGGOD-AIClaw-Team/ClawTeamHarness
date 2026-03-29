import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, message, Divider, Typography, Space, Table, Tag, Modal, Popconfirm, Select, Collapse } from 'antd';
import { SaveIcon, PlusIcon, DeleteIcon } from '../components/Icons';

const { Title, Text } = Typography;

interface Skill {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  enabled?: boolean;
}

interface MCPServer {
  server_id: string;
  name: string;
  endpoint: string;
  auth_token?: string;
}

interface OntologyConfig {
  entities: string[];
  relations: string[];
}

interface LLMProvider {
  name: string;
  provider: string;
  models: string[];
  capabilities: {
    thinking: boolean;
    tool_use: boolean;
    vision: boolean;
    embedding: boolean;
  };
}

interface DefaultLLMConfig {
  text: string;
  embedding: string;
  vision: string;
  tool_use: string;
}

interface SystemSettings {
  default_llm: DefaultLLMConfig;
  llm_providers: Record<string, LLMProvider>;
  log_level: string;
}

export function SettingsPage() {
  const [form] = Form.useForm();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [ontology, setOntology] = useState<OntologyConfig>({ entities: [], relations: [] });
  const [loading, setLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [mcpForm] = Form.useForm();
  const [isOntologyModalOpen, setIsOntologyModalOpen] = useState(false);
  const [ontologyForm] = Form.useForm();

  // 系统设置
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_llm: { text: 'gpt-4', embedding: 'text-embedding-3-small', vision: 'gpt-4o', tool_use: 'gpt-4' },
    llm_providers: {},
    log_level: 'INFO',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load skills from API
  const loadSkills = () => {
    setSkillsLoading(true);
    fetch('/api/skills/')
      .then(res => res.json())
      .then(data => {
        setSkills(data.skills || []);
        setSkillsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load skills:', err);
        setSkillsLoading(false);
        message.error('加载 Skills 失败');
      });
  };

  // Load MCP servers from API
  const loadMcpServers = () => {
    setMcpLoading(true);
    fetch('/api/mcp/servers/')
      .then(res => res.json())
      .then(data => {
        setMcpServers(data.servers || []);
        setMcpLoading(false);
      })
      .catch(err => {
        console.error('Failed to load MCP servers:', err);
        setMcpLoading(false);
        message.error('加载 MCP Servers 失败');
      });
  };

  // Load ontology config
  const loadOntology = () => {
    fetch('/api/ontology/')
      .then(res => res.json())
      .then(data => setOntology(data || { entities: [], relations: [] }))
      .catch(() => {
        // If no ontology endpoint exists, use local state
        const saved = localStorage.getItem('ontology_config');
        if (saved) setOntology(JSON.parse(saved));
      });
  };

  // 加载系统设置
  const loadSystemSettings = () => {
    setSettingsLoading(true);
    fetch('/api/settings/')
      .then(res => res.json())
      .then(data => {
        setSystemSettings(data);
        setSettingsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        setSettingsLoading(false);
        message.error('加载系统设置失败');
      });
  };

  useEffect(() => {
    loadSkills();
    loadMcpServers();
    loadOntology();
    loadSystemSettings();
  }, []);

  const handleSave = () => {
    setLoading(true);
    fetch('/api/settings/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemSettings),
    })
      .then(res => res.json())
      .then(() => {
        message.success('设置已保存');
      })
      .catch(err => {
        message.error('保存失败: ' + err);
      })
      .finally(() => setLoading(false));
  };

  // Skill management
  const handleToggleSkill = (skillName: string, enabled: boolean) => {
    const endpoint = enabled ? `/api/skills/${skillName}/enable` : `/api/skills/${skillName}/disable`;
    fetch(endpoint, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        message.success(`Skill "${skillName}" ${enabled ? '已启用' : '已禁用'}`);
        loadSkills();
      })
      .catch(err => {
        message.error(`操作失败: ${err}`);
        loadSkills();
      });
  };

  // MCP Server management
  const handleAddMcpServer = (values: any) => {
    fetch('/api/mcp/servers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then(() => {
        message.success('MCP Server 添加成功');
        setIsMcpModalOpen(false);
        mcpForm.resetFields();
        loadMcpServers();
      })
      .catch(err => {
        if (err.message?.includes('already exists')) {
          message.error('该 Server ID 已存在');
        } else {
          message.error('添加失败: ' + err);
        }
      });
  };

  const handleDeleteMcpServer = (server_id: string) => {
    fetch(`/api/mcp/servers/${server_id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        message.success('MCP Server 已删除');
        loadMcpServers();
      })
      .catch(err => message.error('删除失败: ' + err));
  };

  // Ontology management
  const handleSaveOntology = (values: any) => {
    const entities = values.entities?.split('\n').filter((e: string) => e.trim()) || [];
    const relations = values.relations?.split('\n').filter((r: string) => r.trim()) || [];
    const config = { entities, relations };
    
    fetch('/api/ontology/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then(() => {
        message.success('Ontology 配置已保存');
        setOntology(config);
        setIsOntologyModalOpen(false);
      })
      .catch(() => {
        // Fallback to localStorage if API doesn't exist
        localStorage.setItem('ontology_config', JSON.stringify(config));
        setOntology(config);
        setIsOntologyModalOpen(false);
        message.success('Ontology 配置已保存（本地）');
      });
  };

  // 构建模型选择选项
  const buildModelOptions = () => {
    const options: { value: string; label: string; disabled?: boolean }[] = [];
    Object.entries(systemSettings.llm_providers || {}).forEach(([key, provider]) => {
      provider.models?.forEach(model => {
        const disabled = provider.capabilities?.thinking ? false : !provider.capabilities?.thinking;
        options.push({
          value: model,
          label: `${model} (${provider.name})`,
          disabled: !provider.capabilities?.thinking,
        });
      });
    });
    return options;
  };

  const skillColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '作者', dataIndex: 'author', key: 'author', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Skill) => (
        <Switch
          defaultChecked={record.enabled !== false}
          onChange={(checked) => handleToggleSkill(record.name, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
  ];

  const mcpColumns = [
    { title: 'ID', dataIndex: 'server_id', key: 'server_id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Endpoint', dataIndex: 'endpoint', key: 'endpoint' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: MCPServer) => (
        <Popconfirm
          title="确定要删除该 MCP Server 吗？"
          onConfirm={() => handleDeleteMcpServer(record.server_id)}
          okText="确定"
          cancelText="取消"
        >
          <Tag color="red" style={{ cursor: 'pointer' }}><DeleteIcon /> 删除</Tag>
        </Popconfirm>
      ),
    },
  ];

  // LLM Provider 显示列
  const providerColumns = [
    { title: '提供商', dataIndex: 'name', key: 'name', render: (name: string, record: LLMProvider) => (
      <Tag color="cyan">{name}</Tag>
    )},
    { title: 'Provider Key', dataIndex: 'provider', key: 'provider' },
    { title: '模型数', key: 'modelCount', render: (_: any, record: LLMProvider) => record.models?.length || 0 },
    { 
      title: '能力', 
      key: 'capabilities',
      render: (_: any, record: LLMProvider) => (
        <Space>
          {record.capabilities?.thinking && <Tag color="green">🧠思考</Tag>}
          {record.capabilities?.tool_use && <Tag color="blue">🔧工具</Tag>}
          {record.capabilities?.vision && <Tag color="purple">👁️视觉</Tag>}
          {record.capabilities?.embedding && <Tag color="orange">📊向量</Tag>}
        </Space>
      )
    },
  ];

  return (
    <div>
      <Title level={4}>系统设置</Title>
      
      {/* LLM 默认模型配置 */}
      <Card title="🤖 默认大模型配置" style={{ marginBottom: 16 }}>
        {settingsLoading ? (
          <Text>加载中...</Text>
        ) : (
          <Form layout="vertical" onFinish={handleSave}>
            <Collapse 
              defaultActiveKey={['text', 'embedding', 'vision', 'tool_use']}
              items={[
                {
                  key: 'text',
                  label: '💬 文本对话模型',
                  children: (
                    <Form.Item label="默认模型">
                      <Select
                        value={systemSettings.default_llm?.text}
                        onChange={v => setSystemSettings(prev => ({
                          ...prev,
                          default_llm: { ...prev.default_llm, text: v }
                        }))}
                        options={buildModelOptions().filter(o => !o.disabled)}
                        style={{ width: 300 }}
                        placeholder="选择默认文本模型"
                      />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        用于普通对话、生成文本等
                      </Text>
                    </Form.Item>
                  ),
                },
                {
                  key: 'embedding',
                  label: '📊 Embedding 模型',
                  children: (
                    <Form.Item label="默认模型">
                      <Select
                        value={systemSettings.default_llm?.embedding}
                        onChange={v => setSystemSettings(prev => ({
                          ...prev,
                          default_llm: { ...prev.default_llm, embedding: v }
                        }))}
                        options={buildModelOptions().filter(o => o.label.includes('embedding') || o.value.includes('embedding') || o.value.includes('text-embedding'))}
                        style={{ width: 300 }}
                        placeholder="选择默认 Embedding 模型"
                      />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        用于向量检索、语义搜索等
                      </Text>
                    </Form.Item>
                  ),
                },
                {
                  key: 'vision',
                  label: '👁️ 视觉模型',
                  children: (
                    <Form.Item label="默认模型">
                      <Select
                        value={systemSettings.default_llm?.vision}
                        onChange={v => setSystemSettings(prev => ({
                          ...prev,
                          default_llm: { ...prev.default_llm, vision: v }
                        }))}
                        options={buildModelOptions().filter(o => !o.disabled)}
                        style={{ width: 300 }}
                        placeholder="选择默认视觉模型"
                      />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        用于图片理解、视觉问答等
                      </Text>
                    </Form.Item>
                  ),
                },
                {
                  key: 'tool_use',
                  label: '🔧 工具调用模型',
                  children: (
                    <Form.Item label="默认模型">
                      <Select
                        value={systemSettings.default_llm?.tool_use}
                        onChange={v => setSystemSettings(prev => ({
                          ...prev,
                          default_llm: { ...prev.default_llm, tool_use: v }
                        }))}
                        options={buildModelOptions().filter(o => !o.disabled)}
                        style={{ width: 300 }}
                        placeholder="选择默认工具调用模型"
                      />
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        用于 Agent 工具调用、ReAct 推理等
                      </Text>
                    </Form.Item>
                  ),
                },
              ]}
            />

            <Divider />

            {/* 已配置模型提供商 */}
            <Text strong style={{ display: 'block', marginBottom: 8 }}>已配置模型提供商</Text>
            <Table
              dataSource={Object.entries(systemSettings.llm_providers || {}).map(([key, val]) => ({
                key,
                provider: key,
                ...val,
              }))}
              columns={providerColumns}
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无配置' }}
            />
            
            <Divider />
            
            <Button type="primary" icon={<SaveIcon />} htmlType="submit" loading={loading}>
              保存设置
            </Button>
          </Form>
        )}
      </Card>

      {/* Skills 配置 */}
      <Card 
        title="Skills 配置" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="primary" 
            icon={<PlusIcon />} 
            size="small"
            onClick={() => message.info('请通过 Skill 文件添加新的 Skill')}
          >
            添加 Skill
          </Button>
        }
      >
        <Table
          dataSource={skills}
          columns={skillColumns}
          rowKey="name"
          loading={skillsLoading}
          locale={{ emptyText: '暂无 Skills，请安装 Skill 包' }}
          pagination={false}
          size="small"
        />
      </Card>

      {/* MCP Servers 配置 */}
      <Card 
        title="MCP Servers 配置" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="primary" 
            icon={<PlusIcon />} 
            size="small"
            onClick={() => setIsMcpModalOpen(true)}
          >
            添加 Server
          </Button>
        }
      >
        <Table
          dataSource={mcpServers}
          columns={mcpColumns}
          rowKey="server_id"
          loading={mcpLoading}
          locale={{ emptyText: '暂无 MCP Servers，点击上方添加' }}
          pagination={false}
          size="small"
        />
      </Card>

      {/* Ontology 配置 */}
      <Card 
        title="Ontology 配置" 
        style={{ marginBottom: 16 }}
        extra={
          <Button 
            type="primary" 
            icon={<SaveIcon />} 
            size="small"
            onClick={() => {
              ontologyForm.setFieldsValue({
                entities: ontology.entities?.join('\n') || '',
                relations: ontology.relations?.join('\n') || '',
              });
              setIsOntologyModalOpen(true);
            }}
          >
            编辑配置
          </Button>
        }
      >
        <Space direction="vertical">
          <div>
            <Text strong>实体类型 ({ontology.entities?.length || 0})：</Text>
            <div style={{ marginTop: 8 }}>
              {ontology.entities?.map(e => (
                <Tag key={e} color="blue">{e}</Tag>
              )) || <Text type="secondary">暂无</Text>}
            </div>
          </div>
          <div>
            <Text strong>关系类型 ({ontology.relations?.length || 0})：</Text>
            <div style={{ marginTop: 8 }}>
              {ontology.relations?.map(r => (
                <Tag key={r} color="green">{r}</Tag>
              )) || <Text type="secondary">暂无</Text>}
            </div>
          </div>
        </Space>
      </Card>

      {/* 日志配置 */}
      <Card title="日志配置" style={{ marginBottom: 16 }}>
        <Form layout="vertical" onFinish={handleSave} initialValues={{ log_level: systemSettings.log_level || 'INFO' }}>
          <Form.Item name="log_level" label="日志级别">
            <Select
              style={{ width: 200 }}
              options={[
                { value: 'DEBUG', label: 'DEBUG' },
                { value: 'INFO', label: 'INFO' },
                { value: 'WARNING', label: 'WARNING' },
                { value: 'ERROR', label: 'ERROR' },
              ]}
            />
          </Form.Item>
          <Button type="primary" icon={<SaveIcon />} htmlType="submit" loading={loading}>
            保存
          </Button>
        </Form>
      </Card>

      {/* 安全设置 */}
      <Card title="安全设置">
        <Space direction="vertical">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>CORS 跨域支持</Text>
            <Switch defaultChecked />
          </div>
          <Text type="secondary">生产环境建议关闭 CORS</Text>
        </Space>
      </Card>

      {/* 添加 MCP Server Modal */}
      <Modal
        title="添加 MCP Server"
        open={isMcpModalOpen}
        onCancel={() => {
          setIsMcpModalOpen(false);
          mcpForm.resetFields();
        }}
        footer={null}
      >
        <Form form={mcpForm} layout="vertical" onFinish={handleAddMcpServer}>
          <Form.Item name="server_id" label="Server ID" rules={[{ required: true, message: '请输入 Server ID' }]}>
            <Input placeholder="e.g., filesystem, github" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="e.g., 文件系统" />
          </Form.Item>
          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true, message: '请输入 Endpoint' }]}>
            <Input placeholder="e.g., http://localhost:8080" />
          </Form.Item>
          <Form.Item name="auth_token" label="认证 Token（可选）">
            <Input.Password placeholder="认证 Token（可选）" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>

      {/* Ontology 编辑 Modal */}
      <Modal
        title="编辑 Ontology 配置"
        open={isOntologyModalOpen}
        onCancel={() => setIsOntologyModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={ontologyForm} layout="vertical" onFinish={handleSaveOntology}>
          <Form.Item name="entities" label="实体类型（一行一个）">
            <Input.TextArea 
              placeholder="例如：&#10;Person&#10;Organization&#10;Location" 
              rows={6}
            />
          </Form.Item>
          <Form.Item name="relations" label="关系类型（一行一个）">
            <Input.TextArea 
              placeholder="例如：&#10;knows&#10;works_for&#10;located_in" 
              rows={6}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>保存</Button>
        </Form>
      </Modal>
    </div>
  );
}
