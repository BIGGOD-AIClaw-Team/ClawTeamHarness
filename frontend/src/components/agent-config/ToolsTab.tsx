import React, { useState } from 'react';
import { Switch, Checkbox, Button, Tag, message, Modal, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { SciFiCard } from '../SciFiCard';

// 

// ============ 常量定义 ============
const SKILL_CATEGORIES = [
  { key: 'analysis', label: '🔍 分析类', color: '#3b82f6' },
  { key: 'tactical', label: '⚔️ 战术类', color: '#a855f7' },
  { key: 'planning', label: '📋 规划类', color: '#22c55e' },
  { key: 'creative', label: '🎨 创意类', color: '#f59e0b' },
  { key: 'utility', label: '🛠️ 工具类', color: '#06b6d4' },
];

interface SkillItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'analysis' | 'tactical' | 'planning' | 'creative' | 'utility';
}

const AVAILABLE_SKILLS: SkillItem[] = [
  { id: 'web_search', name: '网页搜索', icon: '🔍', description: '使用 DuckDuckGo 搜索互联网', category: 'analysis' },
  { id: 'data_analysis', name: '数据分析', icon: '📊', description: '分析数据、发现规律、提供洞察', category: 'analysis' },
  { id: 'code_assistant', name: '代码助手', icon: '💻', description: '编写、调试和优化代码', category: 'analysis' },
  { id: 'image_analysis', name: '图像分析', icon: '🖼️', description: '分析和理解图像内容', category: 'analysis' },
  { id: 'document_parser', name: '文档解析', icon: '📄', description: '解析 PDF、DOCX、HTML 等文档', category: 'analysis' },
  { id: 'ocr', name: 'OCR 识别', icon: '✍️', description: '从图像中提取文字', category: 'analysis' },
  { id: 'tactical_recommendation', name: '战术推荐', icon: '⚔️', description: '推荐战术方案和策略', category: 'tactical' },
  { id: 'risk_assessment', name: '风险评估', icon: '⚠️', description: '多维度风险分析和评估', category: 'tactical' },
  { id: 'resource_optimization', name: '资源优化', icon: '📦', description: '优化资源分配和利用', category: 'tactical' },
  { id: 'decision_support', name: '决策支持', icon: '🎯', description: '辅助决策分析和推荐', category: 'tactical' },
  { id: 'task_decomposition', name: '任务分解', icon: '📋', description: '分解复杂任务为子任务', category: 'planning' },
  { id: 'goal_planning', name: '目标规划', icon: '🎯', description: '制定实现目标的计划', category: 'planning' },
  { id: 'progress_tracking', name: '进度跟踪', icon: '📈', description: '跟踪任务执行进度', category: 'planning' },
  { id: 'schedule_optimization', name: '日程优化', icon: '📅', description: '优化时间安排和日程', category: 'planning' },
  { id: 'creative_writer', name: '创意写作', icon: '✍️', description: '生成创意文案和内容', category: 'creative' },
  { id: 'image_generator', name: '图像生成', icon: '🎨', description: '使用 AI 生成图像', category: 'creative' },
  { id: 'calculator', name: '计算器', icon: '🔢', description: '执行数学计算和公式', category: 'utility' },
  { id: 'unit_converter', name: '单位转换', icon: '🔄', description: '转换各种计量单位', category: 'utility' },
];

interface MCPServer {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, string>;
}

const DEFAULT_MCP_SERVERS: MCPServer[] = [
  { id: 'filesystem', name: '文件系统', description: '读写本地文件、浏览目录结构', enabled: false },
  { id: 'github', name: 'GitHub', description: 'GitHub API 操作、Issue/PR 管理', enabled: false },
  { id: 'database', name: '数据库', description: 'SQL 数据库查询和操作', enabled: false },
  { id: 'web_fetch', name: '网页获取', description: '抓取网页内容、提取信息', enabled: false },
  { id: 'slack', name: 'Slack', description: 'Slack 消息发送和频道管理', enabled: false },
  { id: 'discord', name: 'Discord', description: 'Discord 消息和频道操作', enabled: false },
  { id: 'twitter', name: 'Twitter', description: 'Twitter 推文发布和读取', enabled: false },
  { id: 'email', name: '邮件', description: '发送和管理电子邮件', enabled: false },
  { id: 'calendar', name: '日历', description: '日历事件管理和提醒', enabled: false },
  { id: 'reminder', name: '提醒', description: '设置和管理提醒事项', enabled: false },
];

// ============ 接口定义 ============
export interface ToolsConfigFormData {
  enabled: boolean;
  skills: string[];
  mcp_servers: string[];
  mcp_configs: Record<string, Record<string, string>>;
}

interface ToolsTabProps {
  defaultValues?: Partial<ToolsConfigFormData>;
  onValuesChange?: (values: ToolsConfigFormData) => void;
}

// ============ 组件 ============
export function ToolsTab({ defaultValues, onValuesChange }: ToolsTabProps) {
  const [enabled, setEnabled] = useState(defaultValues?.enabled ?? true);
  const [skills, setSkills] = useState<string[]>(defaultValues?.skills ?? []);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(
    defaultValues?.mcp_servers
      ? DEFAULT_MCP_SERVERS.map(s => ({
          ...s,
          enabled: defaultValues.mcp_servers?.includes(s.id) ?? false,
        }))
      : DEFAULT_MCP_SERVERS
  );
  const [mcpConfigs, setMcpConfigs] = useState<Record<string, Record<string, string>>>(
    defaultValues?.mcp_configs ?? {}
  );
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [customServer, setCustomServer] = useState({ name: '', description: '', url: '' });

  // 通知父组件
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        enabled,
        skills,
        mcp_servers: mcpServers.filter(s => s.enabled).map(s => s.id),
        mcp_configs: mcpConfigs,
      });
    }
  }, [enabled, skills, mcpServers, mcpConfigs, onValuesChange]);

  const toggleSkill = (skillId: string) => {
    setSkills(prev =>
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
  };

  const toggleMCPServer = (serverId: string) => {
    setMcpServers(prev =>
      prev.map(s => s.id === serverId ? { ...s, enabled: !s.enabled } : s)
    );
  };

  const addCustomServer = () => {
    if (!customServer.name || !customServer.url) {
      message.warning('请填写服务器名称和 URL');
      return;
    }
    const newServer: MCPServer = {
      id: `custom_${Date.now()}`,
      name: customServer.name,
      description: customServer.description || '自定义 MCP Server',
      enabled: true,
      config: { url: customServer.url },
    };
    setMcpServers(prev => [...prev, newServer]);
    setCustomServer({ name: '', description: '', url: '' });
    setAddServerModalOpen(false);
    message.success('自定义服务器添加成功');
  };

  const removeMCPServer = (serverId: string) => {
    setMcpServers(prev => prev.filter(s => s.id !== serverId));
    message.info('服务器已移除');
  };

  const updateMCPServerConfig = (serverId: string, key: string, value: string) => {
    setMcpConfigs(prev => ({
      ...prev,
      [serverId]: {
        ...(prev[serverId] || {}),
        [key]: value,
      },
    }));
  };

  const enabledSkillCount = skills.length;
  const enabledMCPCount = mcpServers.filter(s => s.enabled).length;

  return (
    <div>
      {/* 总开关 */}
      <div style={{
        marginBottom: 20,
        padding: '16px 20px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
        border: `1px solid ${enabled ? 'rgba(0, 212, 255, 0.4)' : 'rgba(255,255,255,0.1)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              🛠️ 启用工具系统
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              启用后 Agent 可调用 Skills 和 MCP Tools
            </div>
          </div>
          <Switch
            checked={enabled}
            onChange={v => setEnabled(v)}
            style={{ background: enabled ? '#00d4ff' : '#444' }}
          />
        </div>
      </div>

      {!enabled && (
        <div style={{
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 8,
          border: '1px dashed rgba(0,212,255,0.2)',
          textAlign: 'center',
          color: '#666',
        }}>
          工具系统已禁用，Agent 将无法调用任何外部工具
        </div>
      )}

      {enabled && (
        <>
          {/* ========== Skills Section ========== */}
          <SciFiCard title="🧩 Skills 配置" icon="⚙️">
            <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
              选择该 Agent 可调用的 Skills（勾选启用）。Skills 将增强 Agent 的能力。
            </div>

            {SKILL_CATEGORIES.map(cat => (
              <div key={cat.key} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: cat.color,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {cat.label}
                  <Tag style={{
                    background: `${cat.color}20`,
                    border: `1px solid ${cat.color}60`,
                    color: cat.color,
                    margin: 0,
                    fontSize: 10,
                  }}>
                    {AVAILABLE_SKILLS.filter(s => s.category === cat.key).filter(s => skills.includes(s.id)).length} / {AVAILABLE_SKILLS.filter(s => s.category === cat.key).length}
                  </Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {AVAILABLE_SKILLS.filter(s => s.category === cat.key).map(skill => (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: skills.includes(skill.id) ? `${cat.color}15` : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${skills.includes(skill.id) ? cat.color : 'rgba(0, 212, 255, 0.15)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Checkbox
                        checked={skills.includes(skill.id)}
                        onChange={() => toggleSkill(skill.id)}
                      />
                      <span style={{ fontSize: 16 }}>{skill.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{skill.name}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{skill.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 统计 */}
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              background: 'rgba(0, 212, 255, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}>
              <div style={{ color: '#00d4ff', fontSize: 13 }}>
                已选择 <strong>{enabledSkillCount}</strong> / {AVAILABLE_SKILLS.length} 个 Skills
              </div>
              {skills.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {skills.map(skillId => {
                    const skill = AVAILABLE_SKILLS.find(s => s.id === skillId);
                    return skill ? (
                      <Tag
                        key={skill.id}
                        color={SKILL_CATEGORIES.find(c => c.key === skill.category)?.color || 'blue'}
                        closable
                        onClose={() => toggleSkill(skill.id)}
                        style={{ margin: 0 }}
                      >
                        {skill.icon} {skill.name}
                      </Tag>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </SciFiCard>

          {/* ========== MCP Servers Section ========== */}
          <SciFiCard title="🔌 MCP Servers 配置" icon="🔗">
            <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
              配置 Agent 可调用的 MCP Servers（MCP = Model Context Protocol）。
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 16 }}>
              {mcpServers.map(server => (
                <div
                  key={server.id}
                  style={{
                    padding: '14px 16px',
                    background: server.enabled ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${server.enabled ? '#a855f7' : 'rgba(0, 212, 255, 0.15)'}`,
                    borderRadius: 8,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Checkbox
                      checked={server.enabled}
                      onChange={() => toggleMCPServer(server.id)}
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 2 }}>
                        {server.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>{server.description}</div>
                    </div>
                    {!DEFAULT_MCP_SERVERS.find(s => s.id === server.id) && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeMCPServer(server.id)}
                        style={{ padding: '0 2px', minWidth: 0 }}
                      />
                    )}
                  </div>

                  {/* 配置字段 (仅已启用时显示) */}
                  {server.enabled && server.config && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      {Object.entries(server.config).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: 6 }}>
                          <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 2 }}>
                            {key.toUpperCase()}
                          </label>
                          <Input
                            size="small"
                            value={value}
                            onChange={e => updateMCPServerConfig(server.id, key, e.target.value)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              borderRadius: 4,
                              color: '#e0e6ed',
                              fontSize: 12,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 添加自定义服务器 */}
            <Button
              icon={<PlusOutlined />}
              onClick={() => setAddServerModalOpen(true)}
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px dashed #a855f7',
                color: '#a855f7',
                width: '100%',
              }}
            >
              添加自定义 MCP Server
            </Button>

            {/* 统计 */}
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              background: 'rgba(168, 85, 247, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}>
              <div style={{ color: '#a855f7', fontSize: 13 }}>
                已启用 <strong>{enabledMCPCount}</strong> / {mcpServers.length} 个 MCP Servers
              </div>
            </div>
          </SciFiCard>
        </>
      )}

      {/* 添加自定义服务器 Modal */}
      <Modal
        title={<span style={{ color: '#a855f7' }}>➕ 添加自定义 MCP Server</span>}
        open={addServerModalOpen}
        onCancel={() => setAddServerModalOpen(false)}
        onOk={addCustomServer}
        okText="添加"
        okButtonProps={{ style: { background: '#a855f7' } }}
        styles={{
          mask: { background: 'rgba(0, 0, 0, 0.7)' },
          content: {
            background: 'rgba(0, 20, 40, 0.95)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: 12,
          },
          header: {
            background: 'rgba(0, 20, 40, 0.95)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          },
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            服务器名称 <span style={{ color: '#ff4757' }}>*</span>
          </label>
          <Input
            value={customServer.name}
            onChange={e => setCustomServer(prev => ({ ...prev, name: e.target.value }))}
            placeholder="如：我的自定义服务器"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: '#e0e6ed',
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            描述
          </label>
          <Input
            value={customServer.description}
            onChange={e => setCustomServer(prev => ({ ...prev, description: e.target.value }))}
            placeholder="服务器功能描述"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: '#e0e6ed',
            }}
          />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            Server URL <span style={{ color: '#ff4757' }}>*</span>
          </label>
          <Input
            value={customServer.url}
            onChange={e => setCustomServer(prev => ({ ...prev, url: e.target.value }))}
            placeholder="http://localhost:3000 或 https://..."
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: '#e0e6ed',
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
