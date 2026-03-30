import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, message, Divider, Typography, Space, Table, Tag, Modal, Popconfirm, Select, Collapse, Tabs, Alert, Row, Col, List, Tooltip, Input as InputAntd, Drawer, Spin } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, SaveOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { SaveIcon, PlusIcon, DeleteIcon, CheckCircleIcon } from '../components/Icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Skill {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  enabled?: boolean;
  installed?: boolean;
  installed_at?: string;
}

interface MCPServer {
  server_id: string;
  name: string;
  endpoint: string;
  auth_token?: string;
}

interface AvailableSkill {
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  installed: boolean;
}

interface AvailableMCPServer {
  name: string;
  description: string;
  package: string;
  author: string;
  version: string;
  tags: string[];
  installed: boolean;
}

interface OntologyConfig {
  entities: string[];
  relations: string[];
}

// ============================================================
// 模型配置相关类型
// ============================================================

interface ProviderCredential {
  api_key?: string;
  base_url?: string;
  api_type?: string;
  api_version?: string;
  auth_header?: string;
  organization_id?: string;
  default_model?: string;  // 默认模型版本
}

interface ModelProvider {
  id: string;
  name: string;
  provider_type: 'cloud' | 'local' | 'aggregation' | 'custom';
  icon?: string;
  api_endpoint?: string;
  default_base_url?: string;
  enabled: boolean;
  credentials: ProviderCredential;
  models: any[];
  supported_kinds?: string[];
}

interface LocalModel {
  id: string;
  name: string;
  model?: string;
  size?: number;
  modified_at?: string;
  object?: string;
}

interface ConnectionTestResult {
  success: boolean;
  connected: boolean;
  models: string[];
  error?: string;
}

interface DefaultLLMConfig {
  text: string;
  embedding: string;
  vision: string;
  tool_use: string;
}

interface SystemSettings {
  default_llm: DefaultLLMConfig;
  llm_providers: Record<string, any>;
  log_level: string;
}

// ============================================================
// Icon Components
// ============================================================
// SettingsPage Component
// ============================================================

export function SettingsPage() {
  const [_form] = Form.useForm();
  const [ontology, setOntology] = useState<OntologyConfig>({ entities: [], relations: [] });
  const [loading, setLoading] = useState(false);
  const [isOntologyModalOpen, setIsOntologyModalOpen] = useState(false);
  const [ontologyForm] = Form.useForm();
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [mcpForm] = Form.useForm();

  // ============================================================
  // Skills Hub State (integrated from SkillsHubPage)
  // ============================================================
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([]);
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
  const [skillsHubLoading, setSkillsHubLoading] = useState(false);
  const [skillsSearchText, setSkillsSearchText] = useState('');
  const [skillsSelectedTag, setSkillsSelectedTag] = useState<string | null>(null);
  const [skillsAllTags, setSkillsAllTags] = useState<string[]>([]);
  const [skillConfigDrawerOpen, setSkillConfigDrawerOpen] = useState(false);
  const [configSkillName, setConfigSkillName] = useState<string | null>(null);
  const [skillConfig, setSkillConfig] = useState<Record<string, string | number | boolean>>({});
  const [skillConfigLoading, setSkillConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ============================================================
  // MCP Hub State (integrated from MCPHubPage)
  // ============================================================
  const [availableMCPServers, setAvailableMCPServers] = useState<AvailableMCPServer[]>([]);
  const [installedMCPServers, setInstalledMCPServers] = useState<MCPServer[]>([]);
  const [mcpHubLoading, setMcpHubLoading] = useState(false);
  const [mcpSearchText, setMcpSearchText] = useState('');
  const [mcpSelectedTag, setMcpSelectedTag] = useState<string | null>(null);
  const [mcpAllTags, setMcpAllTags] = useState<string[]>([]);
  const [mcpConfigModalVisible, setMcpConfigModalVisible] = useState(false);
  const [mcpConfigContent, setMcpConfigContent] = useState('');

  // ============================================================
  // Model Config State
  // ============================================================
  const [activeTab, setActiveTab] = useState('model-config');
  const [modelProviders, setModelProviders] = useState<{
    cloud: ModelProvider[];
    local: ModelProvider[];
    aggregation: ModelProvider[];
    custom: ModelProvider[];
  }>({ cloud: [], local: [], aggregation: [], custom: [] });
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | null>(null);
  const [_providersLoading, setProvidersLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionTestResult>>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
  const [addProviderForm] = Form.useForm();
  const [isLocalModelsModalOpen, setIsLocalModelsModalOpen] = useState(false);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [localModelsLoading, setLocalModelsLoading] = useState(false);
  const [selectedModelVersion, setSelectedModelVersion] = useState<string>('');

  // 系统设置
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_llm: { text: 'gpt-4', embedding: 'text-embedding-3-small', vision: 'gpt-4o', tool_use: 'gpt-4' },
    llm_providers: {},
    log_level: 'INFO',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // ============================================================
  // Model Config API Methods
  // ============================================================

  const loadModelProviders = () => {
    setProvidersLoading(true);
    fetch('/api/models/providers')
      .then(res => res.json())
      .then(data => {
        setModelProviders({
          cloud: data.cloud || [],
          local: data.local || [],
          aggregation: data.aggregation || [],
          custom: data.custom || [],
        });
        setProvidersLoading(false);
      })
      .catch(err => {
        console.error('Failed to load model providers:', err);
        setProvidersLoading(false);
        message.error('加载模型配置失败');
      });
  };

  const handleSaveProvider = (provider: ModelProvider) => {
    fetch(`/api/models/providers/${provider.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: provider.enabled,
        credentials: provider.credentials,
      }),
    })
      .then(res => res.json())
      .then(() => {
        message.success(`Provider "${provider.name}" 配置已保存`);
        loadModelProviders();
      })
      .catch(err => {
        message.error(`保存失败: ${err}`);
      });
  };

  const handleTestConnection = async (provider: ModelProvider) => {
    setTestingConnection(true);
    try {
      const result = await fetch('/api/models/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: provider.provider_type,
          base_url: provider.credentials.base_url || provider.default_base_url || '',
          api_key: provider.credentials.api_key,
        }),
      }).then(res => res.json());

      setConnectionStatus(prev => ({
        ...prev,
        [provider.id]: result,
      }));

      if (result.success && result.connected) {
        message.success(`连接成功！发现 ${result.models.length} 个模型`);
      } else {
        message.error(`连接失败: ${result.error}`);
      }
    } catch (err) {
      message.error(`测试连接失败: ${err}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddProvider = (values: any) => {
    fetch('/api/models/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: values.id,
        name: values.name,
        provider_type: values.provider_type,
        base_url: values.base_url,
        api_key: values.api_key,
      }),
    })
      .then(res => res.json())
      .then(() => {
        message.success('Provider 添加成功');
        setIsAddProviderModalOpen(false);
        addProviderForm.resetFields();
        loadModelProviders();
      })
      .catch(err => {
        message.error(`添加失败: ${err}`);
      });
  };

  const handleDeleteProvider = (providerId: string) => {
    fetch(`/api/models/providers/${providerId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        message.success('Provider 已删除');
        if (selectedProvider?.id === providerId) {
          setSelectedProvider(null);
        }
        loadModelProviders();
      })
      .catch(err => {
        if (err.message?.includes('Cannot delete')) {
          message.error('不能删除内置 Provider');
        } else {
          message.error(`删除失败: ${err}`);
        }
      });
  };

  const handleRefreshLocalModels = async (provider: ModelProvider) => {
    const baseUrl = provider.credentials.base_url || provider.default_base_url;
    if (!baseUrl) {
      message.error('请先配置服务地址');
      return;
    }

    setLocalModelsLoading(true);
    setIsLocalModelsModalOpen(true);

    try {
      const result = await fetch(`/api/models/local/${provider.id}?base_url=${encodeURIComponent(baseUrl)}`)
        .then(res => res.json());

      if (result.success) {
        setLocalModels(result.models);
        message.success(`发现 ${result.models.length} 个模型`);
      } else {
        setLocalModels([]);
        message.error(`获取模型列表失败: ${result.error}`);
      }
    } catch (err) {
      message.error(`获取模型列表失败: ${err}`);
    } finally {
      setLocalModelsLoading(false);
    }
  };

  // ============================================================
  // Original Settings Methods
  // ============================================================



  // ============================================================
  // Skills Hub Methods (integrated from SkillsHubPage)
  // ============================================================

  const fetchSkillsHubData = async () => {
    setSkillsHubLoading(true);
    try {
      const [availableRes, installedRes] = await Promise.all([
        fetch('/api/skills-hub/list'),
        fetch('/api/skills-hub/installed'),
      ]);
      const availableData = await availableRes.json();
      const installedData = await installedRes.json();
      setAvailableSkills(availableData.skills || []);
      setInstalledSkills(installedData.skills || []);
      
      // 提取所有标签
      const tags = new Set<string>();
      availableData.skills?.forEach((s: AvailableSkill) => s.tags?.forEach((t: string) => tags.add(t)));
      setSkillsAllTags(Array.from(tags));
    } catch (e) {
      message.error('获取 Skills 列表失败');
    } finally {
      setSkillsHubLoading(false);
    }
  };

  const handleInstallSkill = async (skillName: string) => {
    setSkillsHubLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/install/${skillName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已安装 ${skillName}`);
        fetchSkillsHubData();
      } else {
        message.error(data.detail || '安装失败');
      }
    } catch (e) {
      message.error('安装失败');
    } finally {
      setSkillsHubLoading(false);
    }
  };

  const handleUninstallSkill = async (skillName: string) => {
    setSkillsHubLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/uninstall/${skillName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已卸载 ${skillName}`);
        fetchSkillsHubData();
      } else {
        message.error(data.detail || '卸载失败');
      }
    } catch (e) {
      message.error('卸载失败');
    } finally {
      setSkillsHubLoading(false);
    }
  };

  const handleToggleSkillEnabled = async (skillName: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/skills-hub/${enabled ? 'enable' : 'disable'}/${skillName}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `${enabled ? '启用' : '禁用'}成功`);
        fetchSkillsHubData();
      } else {
        message.error(data.detail || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  const handleOpenSkillDirectory = async (skillName: string) => {
    try {
      const res = await fetch(`/api/skills-hub/open-directory/${skillName}`, { method: 'POST' });
      if (res.ok) {
        message.success(`已打开 ${skillName} 目录`);
      } else {
        const data = await res.json();
        message.error(data.detail || '打开目录失败');
      }
    } catch (e) {
      message.error('打开目录失败');
    }
  };

  const handleOpenSkillConfig = async (skillName: string) => {
    setConfigSkillName(skillName);
    setSkillConfigDrawerOpen(true);
    setSkillConfigLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/config/${skillName}`);
      if (res.ok) {
        const data = await res.json();
        setSkillConfig(data.config || {});
      } else {
        setSkillConfig({});
      }
    } catch (e) {
      setSkillConfig({});
    } finally {
      setSkillConfigLoading(false);
    }
  };

  const handleSaveSkillConfig = async () => {
    if (!configSkillName) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`/api/skills-hub/config/${configSkillName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: skillConfig }),
      });
      if (res.ok) {
        message.success('配置已保存');
        setSkillConfigDrawerOpen(false);
      } else {
        const data = await res.json();
        message.error(data.detail || '保存失败');
      }
    } catch (e) {
      message.error('保存失败');
    } finally {
      setSavingConfig(false);
    }
  };

  // ============================================================
  // MCP Hub Methods (integrated from MCPHubPage)
  // ============================================================

  const fetchMCPServerData = async () => {
    setMcpHubLoading(true);
    try {
      const [availableRes, installedRes] = await Promise.all([
        fetch('/api/mcp-hub/list'),
        fetch('/api/mcp-hub/installed'),
      ]);
      const availableData = await availableRes.json();
      const installedData = await installedRes.json();
      setAvailableMCPServers(availableData.servers || []);
      setInstalledMCPServers(installedData.servers || []);
      
      // 提取所有标签
      const tags = new Set<string>();
      availableData.servers?.forEach((s: AvailableMCPServer) => s.tags?.forEach((t: string) => tags.add(t)));
      setMcpAllTags(Array.from(tags));
    } catch (e) {
      message.error('获取 MCP Servers 列表失败');
    } finally {
      setMcpHubLoading(false);
    }
  };

  const handleInstallMCPServer = async (serverName: string) => {
    setMcpHubLoading(true);
    try {
      const res = await fetch(`/api/mcp-hub/install/${serverName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已安装 ${serverName}`);
        fetchMCPServerData();
      } else {
        message.error(data.detail || '安装失败');
      }
    } catch (e) {
      message.error('安装失败');
    } finally {
      setMcpHubLoading(false);
    }
  };

  const handleUninstallMCPServer = async (serverName: string) => {
    setMcpHubLoading(true);
    try {
      const res = await fetch(`/api/mcp-hub/uninstall/${serverName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已卸载 ${serverName}`);
        fetchMCPServerData();
      } else {
        message.error(data.detail || '卸载失败');
      }
    } catch (e) {
      message.error('卸载失败');
    } finally {
      setMcpHubLoading(false);
    }
  };

  const handleShowMCPConfig = async () => {
    try {
      const res = await fetch('/api/mcp-hub/installed/config');
      const data = await res.json();
      setMcpConfigContent(data.config || '');
      setMcpConfigModalVisible(true);
    } catch (e) {
      message.error('获取配置失败');
    }
  };

  const handleCopyMCPConfig = () => {
    navigator.clipboard.writeText(mcpConfigContent);
    message.success('配置已复制到剪贴板');
  };

  const loadOntology = () => {
    fetch('/api/ontology/')
      .then(res => res.json())
      .then(data => setOntology(data || { entities: [], relations: [] }))
      .catch(() => {
        const saved = localStorage.getItem('ontology_config');
        if (saved) setOntology(JSON.parse(saved));
      });
  };

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
    loadModelProviders();
    loadOntology();
    loadSystemSettings();
    fetchSkillsHubData();
    fetchMCPServerData();
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
        // Refresh MCP Hub list if needed
        fetchMCPServerData();
      })
      .catch(err => {
        if (err.message?.includes('already exists')) {
          message.error('该 Server ID 已存在');
        } else {
          message.error('添加失败: ' + err);
        }
      });
  };

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
        localStorage.setItem('ontology_config', JSON.stringify(config));
        setOntology(config);
        setIsOntologyModalOpen(false);
        message.success('Ontology 配置已保存（本地）');
      });
  };

  const buildModelOptions = () => {
    const options: { value: string; label: string; disabled?: boolean }[] = [];
    Object.entries(systemSettings.llm_providers || {}).forEach(([_key, provider]) => {
      provider.models?.forEach((model: string) => {
        options.push({
          value: model,
          label: `${model} (${provider.name})`,
          disabled: !provider.capabilities?.thinking,
        });
      });
    });
    return options;
  };

  // ============================================================
  // Render: Model Configuration Tab
  // ============================================================

  const renderModelConfig = () => {
    const renderProviderCard = (provider: ModelProvider) => {
      const status = connectionStatus[provider.id];
      const isConnected = status?.connected;
      
      return (
        <Card
          key={provider.id}
          size="small"
          hoverable
          onClick={() => { setSelectedProvider(provider); setSelectedModelVersion(provider.credentials?.default_model || ''); }}
          style={{
            width: '100%',
            marginBottom: 8,
            border: selectedProvider?.id === provider.id ? '1px solid #00d4ff' : '1px solid rgba(0, 212, 255, 0.2)',
            background: selectedProvider?.id === provider.id ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 20, 40, 0.8)',
          }}
          bodyStyle={{ padding: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{provider.icon || '🔧'}</span>
              <div>
                <Text strong style={{ color: '#e0e6ed' }}>{provider.name}</Text>
                <div>
                  <Tag 
                    color={
                      provider.provider_type === 'cloud' ? 'blue' :
                      provider.provider_type === 'local' ? 'green' :
                      provider.provider_type === 'aggregation' ? 'purple' : 'orange'
                    }
                    style={{ fontSize: 10, marginRight: 4 }}
                  >
                    {provider.provider_type === 'cloud' ? '云厂商' :
                     provider.provider_type === 'local' ? '本地' :
                     provider.provider_type === 'aggregation' ? '聚合' : '自定义'}
                  </Tag>
                  {isConnected !== undefined && (
                    isConnected ? 
                      <Tag color="success" style={{ fontSize: 10 }}>✅ 已连接</Tag> :
                      <Tag color="error" style={{ fontSize: 10 }}>❌ 未连接</Tag>
                  )}
                </div>
              </div>
            </div>
            <Switch 
              size="small" 
              checked={provider.enabled}
              onClick={(checked, e) => {
                e?.stopPropagation();
                handleSaveProvider({ ...provider, enabled: checked });
              }}
            />
          </div>
        </Card>
      );
    };

    const renderProviderDetail = () => {
      if (!selectedProvider) {
        return (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <Text type="secondary">👈 请从左侧选择一个 Provider 进行配置</Text>
          </div>
        );
      }

      const status = connectionStatus[selectedProvider.id];
      const isLocal = selectedProvider.provider_type === 'local';
      const isCustom = selectedProvider.provider_type === 'custom';

      return (
        <Card title={
          <span>
            <span style={{ marginRight: 8 }}>{selectedProvider.icon}</span>
            {selectedProvider.name} 配置
          </span>
        }>
          <Form layout="vertical">
            {/* 基础信息 */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Provider ID: {selectedProvider.id} | 类型: {selectedProvider.provider_type}
              </Text>
            </div>

            {/* 连接状态 */}
            {status && (
              <Alert
                type={status.connected ? 'success' : 'error'}
                message={status.connected ? '连接成功' : '连接失败'}
                description={status.error || (status.models.length > 0 ? `发现 ${status.models.length} 个模型` : undefined)}
                style={{ marginBottom: 16 }}
                showIcon
              />
            )}

            {/* 本地服务特殊显示 */}
            {isLocal && selectedProvider.default_base_url && (
              <Form.Item label="默认服务地址">
                <Input value={selectedProvider.default_base_url} disabled />
              </Form.Item>
            )}

            {/* 凭证配置 */}
            <Divider orientation="left">连接配置</Divider>
            
            <Row gutter={16}>
              <Col span={isLocal || isCustom ? 24 : 12}>
                <Form.Item label={isLocal ? "服务地址" : "Base URL"}>
                  <Input
                    placeholder={isLocal ? "http://localhost:11434" : "https://api.openai.com/v1"}
                    value={selectedProvider.credentials.base_url || selectedProvider.default_base_url || ''}
                    onChange={e => {
                      setSelectedProvider({
                        ...selectedProvider,
                        credentials: { ...selectedProvider.credentials, base_url: e.target.value }
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              {!isLocal && (
                <Col span={12}>
                  <Form.Item label="API Key">
                    <Input.Password
                      placeholder="sk-..."
                      value={selectedProvider.credentials.api_key || ''}
                      onChange={e => {
                        setSelectedProvider({
                          ...selectedProvider,
                          credentials: { ...selectedProvider.credentials, api_key: e.target.value }
                        });
                      }}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* 本地服务额外字段 */}
            {isLocal && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="API Key（可选）">
                    <Input.Password
                      placeholder="Ollama 不需要 API Key"
                      value={selectedProvider.credentials.api_key || ''}
                      onChange={e => {
                        setSelectedProvider({
                          ...selectedProvider,
                          credentials: { ...selectedProvider.credentials, api_key: e.target.value }
                        });
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {/* 其他可选字段 */}
            <Collapse ghost>
              <Panel header="高级配置" key="advanced">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="API Type">
                      <Input
                        placeholder="如: azure, openai-compatible"
                        value={selectedProvider.credentials.api_type || ''}
                        onChange={e => {
                          setSelectedProvider({
                            ...selectedProvider,
                            credentials: { ...selectedProvider.credentials, api_type: e.target.value }
                          });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="API Version">
                      <Input
                        placeholder="如: 2024-01-01"
                        value={selectedProvider.credentials.api_version || ''}
                        onChange={e => {
                          setSelectedProvider({
                            ...selectedProvider,
                            credentials: { ...selectedProvider.credentials, api_version: e.target.value }
                          });
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Organization ID">
                      <Input
                        placeholder="OpenAI Organization"
                        value={selectedProvider.credentials.organization_id || ''}
                        onChange={e => {
                          setSelectedProvider({
                            ...selectedProvider,
                            credentials: { ...selectedProvider.credentials, organization_id: e.target.value }
                          });
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Custom Auth Header">
                      <Input
                        placeholder="如: x-api-key"
                        value={selectedProvider.credentials.auth_header || ''}
                        onChange={e => {
                          setSelectedProvider({
                            ...selectedProvider,
                            credentials: { ...selectedProvider.credentials, auth_header: e.target.value }
                          });
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>
            </Collapse>

            {/* 模型版本选择器 */}
            {(status?.models && status.models.length > 0) && (
              <>
                <Divider orientation="left">🤖 模型版本</Divider>
                <Form.Item label="选择默认模型">
                  <Select
                    value={selectedModelVersion || undefined}
                    onChange={val => {
                      setSelectedModelVersion(val || '');
                      // 更新到 credentials（会在点击保存时一起保存）
                      setSelectedProvider({
                        ...selectedProvider,
                        credentials: { ...selectedProvider.credentials, default_model: val || undefined }
                      });
                    }}
                    placeholder="选择默认模型版本"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    options={status.models.map(m => ({ value: m, label: m }))}
                    dropdownStyle={{ background: 'rgba(0, 20, 40, 0.95)' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    选择该 Provider 的默认模型版本，保存配置后生效
                  </Text>
                </Form.Item>
              </>
            )}

            {/* 操作按钮 */}
            <Divider />

            <Space>
              <Button
                type="primary"
                icon={<SaveIcon />}
                onClick={() => handleSaveProvider(selectedProvider)}
              >
                保存配置
              </Button>
              <Button
                icon={<CheckCircleIcon />}
                onClick={() => handleTestConnection(selectedProvider)}
                loading={testingConnection}
              >
                测试连接
              </Button>
              {isLocal && (
                <Button
                  onClick={() => handleRefreshLocalModels(selectedProvider)}
                  loading={localModelsLoading}
                >
                  刷新模型列表
                </Button>
              )}
              {isCustom && (
                <Popconfirm
                  title="确定要删除该 Provider 吗？"
                  onConfirm={() => handleDeleteProvider(selectedProvider.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteIcon />}>
                    删除
                  </Button>
                </Popconfirm>
              )}
            </Space>

            {/* 模型列表 */}
            {status?.models && status.models.length > 0 && (
              <>
                <Divider orientation="left">可用模型 ({status.models.length})</Divider>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                  {status.models.map(model => (
                    <Tag key={model} color="cyan" style={{ margin: 4 }}>
                      {model}
                    </Tag>
                  ))}
                </div>
              </>
            )}
          </Form>
        </Card>
      );
    };

    return (
      <Row gutter={16}>
        {/* 左侧 Provider 列表 */}
        <Col span={8}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>模型 Providers</span>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusIcon />}
                  onClick={() => setIsAddProviderModalOpen(true)}
                >
                  添加
                </Button>
              </div>
            }
            style={{ height: '100%' }}
            bodyStyle={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto', padding: 8 }}
          >
            {/* 本地服务 */}
            {modelProviders.local.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>🏠 本地服务</Text>
                {modelProviders.local.map(renderProviderCard)}
                <Divider style={{ margin: '8px 0' }} />
              </>
            )}

            {/* 云厂商 */}
            {modelProviders.cloud.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>☁️ 云厂商</Text>
                {modelProviders.cloud.map(renderProviderCard)}
                <Divider style={{ margin: '8px 0' }} />
              </>
            )}

            {/* 聚合平台 */}
            {modelProviders.aggregation.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>🔗 聚合平台</Text>
                {modelProviders.aggregation.map(renderProviderCard)}
                <Divider style={{ margin: '8px 0' }} />
              </>
            )}

            {/* 自定义 */}
            {modelProviders.custom.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>🔧 自定义</Text>
                {modelProviders.custom.map(renderProviderCard)}
              </>
            )}
          </Card>
        </Col>

        {/* 右侧 Provider 详情 */}
        <Col span={16}>
          {renderProviderDetail()}
        </Col>
      </Row>
    );
  };

  // ============================================================
  // Filter helpers for Skills Hub and MCP Hub
  // ============================================================

  const filteredAvailableSkills = availableSkills.filter(skill => {
    const matchSearch = !skillsSearchText || 
      skill.name.toLowerCase().includes(skillsSearchText.toLowerCase()) ||
      skill.description.toLowerCase().includes(skillsSearchText.toLowerCase());
    const matchTag = !skillsSelectedTag || skill.tags?.includes(skillsSelectedTag);
    return matchSearch && matchTag;
  });

  const filteredAvailableMCPServers = availableMCPServers.filter(server => {
    const matchSearch = !mcpSearchText || 
      server.name.toLowerCase().includes(mcpSearchText.toLowerCase()) ||
      server.description.toLowerCase().includes(mcpSearchText.toLowerCase()) ||
      server.package.toLowerCase().includes(mcpSearchText.toLowerCase());
    const matchTag = !mcpSelectedTag || server.tags?.includes(mcpSelectedTag);
    return matchSearch && matchTag;
  });

  // ============================================================
  // Render: Skills / MCP / etc Tabs (unchanged from original)
  // ============================================================

  const providerColumns = [
    { title: '提供商', dataIndex: 'name', key: 'name', render: (name: string, _record: any) => (
      <Tag color="cyan">{name}</Tag>
    )},
    { title: 'Provider Key', dataIndex: 'provider', key: 'provider' },
    { title: '模型数', key: 'modelCount', render: (_: any, record: any) => record.models?.length || 0 },
    { 
      title: '能力', 
      key: 'capabilities',
      render: (_: any, record: any) => (
        <Space>
          {record.capabilities?.thinking && <Tag color="green">🧠思考</Tag>}
          {record.capabilities?.tool_use && <Tag color="blue">🔧工具</Tag>}
          {record.capabilities?.vision && <Tag color="purple">👁️视觉</Tag>}
          {record.capabilities?.embedding && <Tag color="orange">📊向量</Tag>}
        </Space>
      )
    },
  ];

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div>
      <Title level={4}>系统设置</Title>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'model-config',
            label: '🤖 模型配置',
            children: renderModelConfig(),
          },
          {
            key: 'default-llm',
            label: '⚙️ 默认模型',
            children: (
              <Card title="🤖 默认大模型配置">
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
            ),
          },
          {
            key: 'skills',
            label: '📡 Skills Hub',
            children: (
              <div>
                {/* 搜索和过滤 */}
                <Card size="small" style={{ marginBottom: 16, background: 'rgba(0, 20, 40, 0.6)' }}>
                  <Space wrap>
                    <Input
                      placeholder="搜索 Skills..."
                      allowClear
                      value={skillsSearchText}
                      onChange={e => setSkillsSearchText(e.target.value)}
                      style={{ width: 200 }}
                      prefix={<SearchOutlined />}
                    />
                    <Select
                      placeholder="按标签筛选"
                      allowClear
                      style={{ width: 150 }}
                      value={skillsSelectedTag}
                      onChange={val => setSkillsSelectedTag(val)}
                      options={skillsAllTags.map(tag => ({ label: tag, value: tag }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchSkillsHubData} loading={skillsHubLoading}>
                      刷新
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      共 {filteredAvailableSkills.length} 个可安装 Skills
                    </Text>
                  </Space>
                </Card>

                <Row gutter={[16, 16]}>
                  {/* 可安装的 Skills */}
                  <Col xs={24} lg={16}>
                    <Card 
                      title="📦 可安装的 Skills" 
                      size="small"
                      extra={<Tag>{filteredAvailableSkills.length}</Tag>}
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      {skillsHubLoading && filteredAvailableSkills.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Spin />
                        </div>
                      ) : filteredAvailableSkills.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>没有找到匹配的 Skills</div>
                      ) : (
                        <List
                          size="small"
                          dataSource={filteredAvailableSkills}
                          renderItem={(skill) => (
                            <List.Item
                              key={skill.name}
                              actions={[
                                skill.installed ? (
                                  <Tag color="green" icon={<CheckCircleIcon />}>已安装</Tag>
                                ) : (
                                  <Button 
                                    type="primary" 
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() => handleInstallSkill(skill.name)}
                                    loading={skillsHubLoading}
                                  >
                                    安装
                                  </Button>
                                )
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space>
                                    <span style={{ color: '#00d4ff' }}>{skill.name}</span>
                                    <Tag color="blue" style={{ fontSize: 10 }}>v{skill.version}</Tag>
                                  </Space>
                                }
                                description={
                                  <div>
                                    <div style={{ color: '#888' }}>{skill.description}</div>
                                    <Space size={4} style={{ marginTop: 4 }}>
                                      {skill.tags?.map(tag => (
                                        <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>
                                      ))}
                                    </Space>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>

                  {/* 已安装的 Skills */}
                  <Col xs={24} lg={8}>
                    <Card 
                      title="✅ 已安装" 
                      size="small"
                      extra={<Tag color="green">{installedSkills.length}</Tag>}
                      style={{ background: 'rgba(0, 20, 40, 0.6)', height: '100%' }}
                    >
                      {installedSkills.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>暂无已安装的 Skills</div>
                      ) : (
                        <List
                          size="small"
                          dataSource={installedSkills}
                          renderItem={(skill) => (
                            <List.Item
                              key={skill.name}
                              actions={[
                                <Tooltip title={skill.enabled !== false ? '禁用' : '启用'}>
                                  <Switch
                                    size="small"
                                    checked={skill.enabled !== false}
                                    onChange={(checked) => handleToggleSkillEnabled(skill.name, checked)}
                                  />
                                </Tooltip>,
                                <Tooltip title="配置">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<SettingOutlined />}
                                    onClick={() => handleOpenSkillConfig(skill.name)}
                                  />
                                </Tooltip>,
                                <Tooltip title="打开目录">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<FolderOpenOutlined />}
                                    onClick={() => handleOpenSkillDirectory(skill.name)}
                                  />
                                </Tooltip>,
                                <Tooltip title="卸载">
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteIcon />}
                                    onClick={() => handleUninstallSkill(skill.name)}
                                    loading={skillsHubLoading}
                                  />
                                </Tooltip>
                              ]}
                            >
                              <List.Item.Meta
                                title={<span style={{ color: skill.enabled !== false ? '#00ff88' : '#666' }}>{skill.name}</span>}
                                description={
                                  <div>
                                    <div style={{ color: skill.enabled !== false ? '#888' : '#555', fontSize: 12 }}>{skill.description}</div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                      by {skill.author}
                                    </Text>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* Skill 配置面板 Drawer */}
                <Drawer
                  title={<Space><SettingOutlined /> <span>{configSkillName} 配置</span></Space>}
                  placement="right"
                  width={400}
                  open={skillConfigDrawerOpen}
                  onClose={() => setSkillConfigDrawerOpen(false)}
                  styles={{ body: { background: 'rgba(0, 20, 40, 0.9)', padding: 16 } }}
                  extra={
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={savingConfig}
                      onClick={handleSaveSkillConfig}
                    >
                      保存
                    </Button>
                  }
                >
                  {skillConfigLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Spin />
                    </div>
                  ) : (
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        配置 Skill 的运行参数。修改后点击「保存」生效。
                      </Text>
                      {Object.keys(skillConfig).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>该 Skill 暂无配置参数</div>
                      ) : (
                        <Form layout="vertical">
                          {Object.entries(skillConfig).map(([key, value]) => (
                            <Form.Item key={key} label={key} style={{ marginBottom: 12 }}>
                              <InputAntd
                                value={String(value)}
                                onChange={(e) => setSkillConfig(prev => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  border: '1px solid rgba(0, 212, 255, 0.3)',
                                  color: '#e0e6ed',
                                }}
                              />
                            </Form.Item>
                          ))}
                        </Form>
                      )}
                    </div>
                  )}
                </Drawer>
              </div>
            ),
          },
          {
            key: 'mcp',
            label: '☁️ MCP Hub',
            children: (
              <div>
                {/* 搜索和过滤 */}
                <Card size="small" style={{ marginBottom: 16, background: 'rgba(0, 20, 40, 0.6)' }}>
                  <Space wrap>
                    <Input
                      placeholder="搜索 Servers..."
                      allowClear
                      value={mcpSearchText}
                      onChange={e => setMcpSearchText(e.target.value)}
                      style={{ width: 200 }}
                      prefix={<SearchOutlined />}
                    />
                    <Select
                      placeholder="按标签筛选"
                      allowClear
                      style={{ width: 150 }}
                      value={mcpSelectedTag}
                      onChange={val => setMcpSelectedTag(val)}
                      options={mcpAllTags.map(tag => ({ label: tag, value: tag }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchMCPServerData} loading={mcpHubLoading}>
                      刷新
                    </Button>
                    <Button icon={<SettingOutlined />} onClick={handleShowMCPConfig} disabled={installedMCPServers.length === 0}>
                      获取配置
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      共 {filteredAvailableMCPServers.length} 个可安装 Servers
                    </Text>
                  </Space>
                </Card>

                <Row gutter={[16, 16]}>
                  {/* 可安装的 MCP Servers */}
                  <Col xs={24} lg={16}>
                    <Card 
                      title="📦 可安装的 MCP Servers" 
                      size="small"
                      extra={<Tag>{filteredAvailableMCPServers.length}</Tag>}
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      {mcpHubLoading && filteredAvailableMCPServers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <Spin />
                        </div>
                      ) : filteredAvailableMCPServers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>没有找到匹配的 Servers</div>
                      ) : (
                        <List
                          size="small"
                          dataSource={filteredAvailableMCPServers}
                          renderItem={(server) => (
                            <List.Item
                              key={server.name}
                              actions={[
                                server.installed ? (
                                  <Tag color="green" icon={<CheckCircleIcon />}>已安装</Tag>
                                ) : (
                                  <Button 
                                    type="primary" 
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() => handleInstallMCPServer(server.name)}
                                    loading={mcpHubLoading}
                                  >
                                    安装
                                  </Button>
                                )
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space>
                                    <span style={{ color: '#00d4ff' }}>{server.name}</span>
                                    <Tag color="purple" style={{ fontSize: 10 }}>{server.package}</Tag>
                                  </Space>
                                }
                                description={
                                  <div>
                                    <div style={{ color: '#888' }}>{server.description}</div>
                                    <Space size={4} style={{ marginTop: 4 }}>
                                      {server.tags?.map(tag => (
                                        <Tag key={tag} style={{ fontSize: 10 }}>{tag}</Tag>
                                      ))}
                                    </Space>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>

                  {/* 已安装的 MCP Servers */}
                  <Col xs={24} lg={8}>
                    <Card 
                      title="✅ 已安装" 
                      size="small"
                      extra={<Tag color="green">{installedMCPServers.length}</Tag>}
                      style={{ background: 'rgba(0, 20, 40, 0.6)', height: '100%' }}
                    >
                      {installedMCPServers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>暂无已安装的 Servers</div>
                      ) : (
                        <List
                          size="small"
                          dataSource={installedMCPServers}
                          renderItem={(server) => (
                            <List.Item
                              key={server.server_id}
                              actions={[
                                <Tooltip title="卸载">
                                  <Button 
                                    type="text" 
                                    danger 
                                    size="small"
                                    icon={<DeleteIcon />}
                                    onClick={() => handleUninstallMCPServer(server.server_id)}
                                    loading={mcpHubLoading}
                                  />
                                </Tooltip>
                              ]}
                            >
                              <List.Item.Meta
                                title={<span style={{ color: '#00ff88' }}>{server.name}</span>}
                                description={
                                  <div>
                                    <div style={{ color: '#888', fontSize: 12 }}>{server.server_id}</div>
                                    <Paragraph type="secondary" style={{ fontSize: 10, margin: '4px 0 0 0' }}>
                                      {server.endpoint}
                                    </Paragraph>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* MCP 配置 Modal */}
                <Modal
                  title="MCP 配置"
                  open={mcpConfigModalVisible}
                  onCancel={() => setMcpConfigModalVisible(false)}
                  footer={[
                    <Button key="close" onClick={() => setMcpConfigModalVisible(false)}>
                      关闭
                    </Button>,
                    <Button key="copy" type="primary" icon={<SaveOutlined />} onClick={handleCopyMCPConfig}>
                      复制配置
                    </Button>
                  ]}
                  width={700}
                >
                  <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                    将以下配置添加到 OpenClaw 的 <code>mcp.servers</code> 配置中：
                  </Paragraph>
                  <Card size="small" style={{ background: '#0a0e17' }}>
                    <pre style={{ color: '#00ff88', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {mcpConfigContent || '# 暂无已安装的 MCP Servers'}
                    </pre>
                  </Card>
                </Modal>
              </div>
            ),
          },
          {
            key: 'ontology',
            label: '🔗 Ontology',
            children: (
              <Card 
                title="Ontology 配置"
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
            ),
          },
          {
            key: 'logs',
            label: '📋 日志',
            children: (
              <Card title="日志配置">
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
            ),
          },
          {
            key: 'security',
            label: '🔒 安全',
            children: (
              <Card title="安全设置">
                <Space direction="vertical">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text>CORS 跨域支持</Text>
                    <Switch defaultChecked />
                  </div>
                  <Text type="secondary">生产环境建议关闭 CORS</Text>
                </Space>
              </Card>
            ),
          },
        ]}
      />

      {/* 添加自定义 Provider Modal */}
      <Modal
        title="添加自定义 Provider"
        open={isAddProviderModalOpen}
        onCancel={() => {
          setIsAddProviderModalOpen(false);
          addProviderForm.resetFields();
        }}
        footer={null}
      >
        <Form form={addProviderForm} layout="vertical" onFinish={handleAddProvider}>
          <Form.Item name="id" label="Provider ID" rules={[{ required: true, message: '请输入 Provider ID' }]}>
            <Input placeholder="如: my-ollama, custom-gpt" />
          </Form.Item>
          <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="如: 我的 Ollama" />
          </Form.Item>
          <Form.Item name="provider_type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              placeholder="选择类型"
              options={[
                { value: 'cloud', label: '☁️ 云厂商' },
                { value: 'local', label: '🏠 本地服务' },
                { value: 'aggregation', label: '🔗 聚合平台' },
                { value: 'custom', label: '🔧 自定义' },
              ]}
            />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL">
            <Input placeholder="如: http://localhost:11434" />
          </Form.Item>
          <Form.Item name="api_key" label="API Key（可选）">
            <Input.Password placeholder="API Key（可选）" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>添加</Button>
        </Form>
      </Modal>

      {/* 本地模型列表 Modal */}
      <Modal
        title={`${selectedProvider?.name || '本地'} 可用模型`}
        open={isLocalModelsModalOpen}
        onCancel={() => setIsLocalModelsModalOpen(false)}
        footer={null}
        width={600}
      >
        {localModelsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
        ) : localModels.length > 0 ? (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {localModels.map(model => (
              <Card key={model.id} size="small" style={{ marginBottom: 8 }}>
                <Text strong>{model.name || model.id}</Text>
                {model.size && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                  </Text>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Text type="secondary">未发现模型，请确保服务正在运行</Text>
        )}
      </Modal>

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
