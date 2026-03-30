import { useState, useEffect } from 'react';
import { Card, List, Button, Tag, message, Input, Select, Space, Typography, Row, Col, Empty, Spin, Tooltip, Modal } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, CodeOutlined, CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface MCPServer {
  name: string;
  description: string;
  package: string;
  author: string;
  version: string;
  tags: string[];
  installed: boolean;
}

interface MCPServerDetail {
  name: string;
  description: string;
  package: string;
  author: string;
  version: string;
  tags: string[];
  installed_at?: string;
}

export function MCPHubPage() {
  const [availableServers, setAvailableServers] = useState<MCPServer[]>([]);
  const [installedServers, setInstalledServers] = useState<MCPServerDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [mcpConfig, setMcpConfig] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const [availableRes, installedRes] = await Promise.all([
        fetch('/api/mcp-hub/list'),
        fetch('/api/mcp-hub/installed'),
      ]);
      const availableData = await availableRes.json();
      const installedData = await installedRes.json();
      setAvailableServers(availableData.servers || []);
      setInstalledServers(installedData.servers || []);
      
      // 提取所有标签
      const tags = new Set<string>();
      availableData.servers?.forEach((s: MCPServer) => s.tags?.forEach((t: string) => tags.add(t)));
      setAllTags(Array.from(tags));
    } catch (e) {
      message.error('获取 MCP Servers 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleInstall = async (serverName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mcp-hub/install/${serverName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已安装 ${serverName}`);
        fetchServers();
      } else {
        message.error(data.detail || '安装失败');
      }
    } catch (e) {
      message.error('安装失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (serverName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mcp-hub/uninstall/${serverName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已卸载 ${serverName}`);
        fetchServers();
      } else {
        message.error(data.detail || '卸载失败');
      }
    } catch (e) {
      message.error('卸载失败');
    } finally {
      setLoading(false);
    }
  };

  const showConfig = async () => {
    try {
      const res = await fetch('/api/mcp-hub/installed/config');
      const data = await res.json();
      setMcpConfig(data.config || '');
      setConfigModalVisible(true);
    } catch (e) {
      message.error('获取配置失败');
    }
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(mcpConfig);
    message.success('配置已复制到剪贴板');
  };

  // 过滤 Servers
  const filteredServers = availableServers.filter(server => {
    const matchSearch = !searchText || 
      server.name.toLowerCase().includes(searchText.toLowerCase()) ||
      server.description.toLowerCase().includes(searchText.toLowerCase()) ||
      server.package.toLowerCase().includes(searchText.toLowerCase());
    const matchTag = !selectedTag || server.tags?.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const installedNames = new Set(installedServers.map(s => s.name));

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>
            🔌 MCP Hub
          </Title>
          <Text type="secondary" style={{ color: '#888' }}>
            安装和管理 Model Context Protocol Servers
          </Text>
        </div>
        <Space>
          <Button 
            icon={<CodeOutlined />} 
            onClick={showConfig}
            disabled={installedServers.length === 0}
          >
            获取配置
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchServers}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 搜索和过滤 */}
      <Card size="small" style={{ marginBottom: 16, background: 'rgba(0, 20, 40, 0.6)' }}>
        <Space wrap>
          <Search
            placeholder="搜索 Servers..."
            allowClear
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="按标签筛选"
            allowClear
            style={{ width: 150 }}
            onChange={val => setSelectedTag(val)}
            options={allTags.map(tag => ({ label: tag, value: tag }))}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {filteredServers.length} 个 Servers
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 可安装的 Servers */}
        <Col xs={24} lg={16}>
          <Card 
            title="📦 可安装的 MCP Servers" 
            size="small"
            extra={<Tag>{filteredServers.length}</Tag>}
            style={{ background: 'rgba(0, 20, 40, 0.6)' }}
          >
            {loading && filteredServers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : filteredServers.length === 0 ? (
              <Empty description="没有找到匹配的 Servers" />
            ) : (
              <List
                size="small"
                dataSource={filteredServers}
                renderItem={(server) => (
                  <List.Item
                    key={server.name}
                    actions={[
                      server.installed || installedNames.has(server.name) ? (
                        <Tag color="green" icon={<CheckCircleOutlined />}>已安装</Tag>
                      ) : (
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleInstall(server.name)}
                          loading={loading}
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

        {/* 已安装的 Servers */}
        <Col xs={24} lg={8}>
          <Card 
            title="✅ 已安装" 
            size="small"
            extra={<Tag color="green">{installedServers.length}</Tag>}
            style={{ background: 'rgba(0, 20, 40, 0.6)', height: '100%' }}
          >
            {installedServers.length === 0 ? (
              <Empty description="暂无已安装的 Servers" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={installedServers}
                renderItem={(server) => (
                  <List.Item
                    key={server.name}
                    actions={[
                      <Tooltip title="卸载">
                        <Button 
                          type="text" 
                          danger 
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleUninstall(server.name)}
                          loading={loading}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      title={<span style={{ color: '#00ff88' }}>{server.name}</span>}
                      description={
                        <div>
                          <div style={{ color: '#888', fontSize: 12 }}>{server.description}</div>
                          <Paragraph type="secondary" style={{ fontSize: 10, margin: '4px 0 0 0' }} copyable={{ text: server.package }}>
                            {server.package}
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
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setConfigModalVisible(false)}>
            关闭
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyConfig}>
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
            {mcpConfig || '# 暂无已安装的 MCP Servers'}
          </pre>
        </Card>
      </Modal>
    </div>
  );
}
