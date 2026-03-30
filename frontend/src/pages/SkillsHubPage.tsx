import { useState, useEffect } from 'react';
import { Card, List, Button, Tag, message, Input, Select, Space, Typography, Row, Col, Empty, Spin, Tooltip, Switch, Drawer, Form, Input as InputAntd } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, CheckCircleOutlined, SettingOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

interface Skill {
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  installed: boolean;
  enabled?: boolean;
  config?: Record<string, string | number | boolean>;
}

export function SkillsHubPage() {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // 配置面板状态
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [configSkillName, setConfigSkillName] = useState<string | null>(null);
  const [skillConfig, setSkillConfig] = useState<Record<string, string | number | boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
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
      availableData.skills?.forEach((s: Skill) => s.tags?.forEach((t: string) => tags.add(t)));
      setAllTags(Array.from(tags));
    } catch (e) {
      message.error('获取 Skills 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleInstall = async (skillName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/install/${skillName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已安装 ${skillName}`);
        fetchSkills();
      } else {
        message.error(data.detail || '安装失败');
      }
    } catch (e) {
      message.error('安装失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (skillName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/uninstall/${skillName}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `已卸载 ${skillName}`);
        fetchSkills();
      } else {
        message.error(data.detail || '卸载失败');
      }
    } catch (e) {
      message.error('卸载失败');
    } finally {
      setLoading(false);
    }
  };

  // 启用/禁用 Skill
  const handleToggleEnabled = async (skillName: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/skills-hub/${enabled ? 'enable' : 'disable'}/${skillName}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `${enabled ? '启用' : '禁用'}成功`);
        fetchSkills();
      } else {
        message.error(data.detail || '操作失败');
      }
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 打开配置面板
  const handleOpenConfig = async (skillName: string) => {
    setConfigSkillName(skillName);
    setConfigDrawerOpen(true);
    setConfigLoading(true);
    try {
      const res = await fetch(`/api/skills-hub/config/${skillName}`);
      if (res.ok) {
        const data = await res.json();
        setSkillConfig(data.config || {});
      } else {
        // 如果没有配置接口，尝试空配置
        setSkillConfig({});
      }
    } catch (e) {
      setSkillConfig({});
    } finally {
      setConfigLoading(false);
    }
  };

  // 保存配置
  const handleSaveConfig = async () => {
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
        setConfigDrawerOpen(false);
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

  // 过滤 Skills
  const filteredSkills = availableSkills.filter(skill => {
    const matchSearch = !searchText || 
      skill.name.toLowerCase().includes(searchText.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchText.toLowerCase());
    const matchTag = !selectedTag || skill.tags?.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const installedNames = new Set(installedSkills.map(s => s.name));

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>
            🛠️ Skills Hub
          </Title>
          <Text type="secondary" style={{ color: '#888' }}>
            从 ClawHub 安装和管理 Skills
          </Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchSkills}
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
            placeholder="搜索 Skills..."
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
            共 {filteredSkills.length} 个 Skills
          </Text>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 可安装的 Skills */}
        <Col xs={24} lg={16}>
          <Card 
            title="📦 可安装的 Skills" 
            size="small"
            extra={<Tag>{filteredSkills.length}</Tag>}
            style={{ background: 'rgba(0, 20, 40, 0.6)' }}
          >
            {loading && filteredSkills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : filteredSkills.length === 0 ? (
              <Empty description="没有找到匹配的 Skills" />
            ) : (
              <List
                size="small"
                dataSource={filteredSkills}
                renderItem={(skill) => (
                  <List.Item
                    key={skill.name}
                    actions={[
                      skill.installed || installedNames.has(skill.name) ? (
                        <Tag color="green" icon={<CheckCircleOutlined />}>已安装</Tag>
                      ) : (
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleInstall(skill.name)}
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
              <Empty description="暂无已安装的 Skills" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                          onChange={(checked) => handleToggleEnabled(skill.name, checked)}
                        />
                      </Tooltip>,
                      <Tooltip title="配置">
                        <Button
                          type="text"
                          size="small"
                          icon={<SettingOutlined />}
                          onClick={() => handleOpenConfig(skill.name)}
                        />
                      </Tooltip>,
                      <Tooltip title="卸载">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleUninstall(skill.name)}
                          loading={loading}
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
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        styles={{ body: { background: 'rgba(0, 20, 40, 0.9)', padding: 16 } }}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingConfig}
            onClick={handleSaveConfig}
          >
            保存
          </Button>
        }
      >
        {configLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              配置 Skill 的运行参数。修改后点击「保存」生效。
            </Text>
            {Object.keys(skillConfig).length === 0 ? (
              <Empty description="该 Skill 暂无配置参数" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
  );
}
