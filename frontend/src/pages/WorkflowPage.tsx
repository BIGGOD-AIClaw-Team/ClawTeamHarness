/**
 * WorkflowPage.tsx - Skills 编排工作流页面
 * 用于创建和管理 Skills 编排工作流
 */
import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Button, Space, Typography, Tag, Select, Input,
  Modal, message, Steps, Collapse, Badge, Tooltip, Spin,
  Empty, Divider, Switch, Alert, Dropdown, Menu,
} from 'antd';
import {
  PlayCircleOutlined, SaveOutlined, PlusOutlined, DeleteOutlined,
  SettingOutlined, CloudServerOutlined, RobotOutlined, BranchesOutlined,
  SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  MoreOutlined, EditOutlined, CopyOutlined, ExportOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// ============ 类型定义 ============
interface SkillNode {
  id: string;
  type: 'skill' | 'mcp' | 'agent' | 'condition' | 'llm' | 'start' | 'end';
  label: string;
  skillName?: string;
  params: Record<string, any>;
  status?: 'idle' | 'running' | 'success' | 'error';
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
}

// ============ 预设工作流模板 ============
const PRESET_TEMPLATES = [
  {
    id: 'research',
    name: '🔬 研究助手',
    description: '收集信息 → 分析整理 → 生成报告',
    nodes: [
      { id: 'start-1', type: 'start', label: '开始', status: 'idle' },
      { id: 'skill-web_search', type: 'skill', label: '网页搜索', skillName: 'web_search', params: {}, status: 'idle' },
      { id: 'skill-data_analysis', type: 'skill', label: '数据分析', skillName: 'data_analysis', params: {}, status: 'idle' },
      { id: 'skill-doc_writer', type: 'skill', label: '文档生成', skillName: 'document_writer', params: {}, status: 'idle' },
      { id: 'end-1', type: 'end', label: '结束', status: 'idle' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'skill-web_search' },
      { id: 'e2', source: 'skill-web_search', target: 'skill-data_analysis' },
      { id: 'e3', source: 'skill-data_analysis', target: 'skill-doc_writer' },
      { id: 'e4', source: 'skill-doc_writer', target: 'end-1' },
    ],
  },
  {
    id: 'code_assist',
    name: '💻 代码助手',
    description: '需求理解 → 代码生成 → 代码审查',
    nodes: [
      { id: 'start-1', type: 'start', label: '开始', status: 'idle' },
      { id: 'skill-code_assistant', type: 'skill', label: '代码助手', skillName: 'code_assistant', params: {}, status: 'idle' },
      { id: 'skill-critic', type: 'skill', label: '代码审查', skillName: 'code_review', params: {}, status: 'idle' },
      { id: 'end-1', type: 'end', label: '结束', status: 'idle' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'skill-code_assistant' },
      { id: 'e2', source: 'skill-code_assistant', target: 'skill-critic' },
      { id: 'e3', source: 'skill-critic', target: 'end-1' },
    ],
  },
  {
    id: 'analysis',
    name: '📊 分析助手',
    description: '数据采集 → 数据清洗 → 可视化分析',
    nodes: [
      { id: 'start-1', type: 'start', label: '开始', status: 'idle' },
      { id: 'skill-data_collection', type: 'skill', label: '数据采集', skillName: 'data_collection', params: {}, status: 'idle' },
      { id: 'skill-data_cleaning', type: 'skill', label: '数据清洗', skillName: 'data_cleaning', params: {}, status: 'idle' },
      { id: 'skill-visualization', type: 'skill', label: '可视化', skillName: 'visualization', params: {}, status: 'idle' },
      { id: 'end-1', type: 'end', label: '结束', status: 'idle' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'skill-data_collection' },
      { id: 'e2', source: 'skill-data_collection', target: 'skill-data_cleaning' },
      { id: 'e3', source: 'skill-data_cleaning', target: 'skill-visualization' },
      { id: 'e4', source: 'skill-visualization', target: 'end-1' },
    ],
  },
];

// ============ 节点类型图标 ============
const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  skill: <SettingOutlined />,
  mcp: <CloudServerOutlined />,
  agent: <RobotOutlined />,
  condition: <BranchesOutlined />,
  llm: <RobotOutlined />,
  start: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
  end: <CheckCircleOutlined style={{ color: '#ff4d4f' }} />,
};

const NODE_COLORS: Record<string, string> = {
  start: '#52c41a',
  end: '#ff4d4f',
  skill: '#3b82f6',
  mcp: '#a855f7',
  agent: '#f59e0b',
  condition: '#22c55e',
  llm: '#06b6d4',
};

// ============ 样式 ============
const canvasStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 8,
  minHeight: 400,
  position: 'relative',
  overflow: 'hidden',
};

const nodeStyle = (type: string, status?: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  background: status === 'running' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 20, 40, 0.8)',
  border: `2px solid ${status === 'running' ? '#3b82f6' : NODE_COLORS[type] || '#666'}`,
  borderRadius: 8,
  cursor: 'pointer',
  minWidth: 120,
  color: '#fff',
  fontSize: 13,
  boxShadow: status === 'running' ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
});

// ============ 主组件 ============
export function WorkflowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [searchText, setSearchText] = useState('');

  // 加载工作流列表
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch (e) {
      // 使用空列表
    } finally {
      setLoading(false);
    }
  };

  // 保存工作流
  const handleSaveWorkflow = async (workflow: Workflow) => {
    try {
      const url = workflow.id ? `/api/workflows/${workflow.id}` : '/api/workflows';
      const method = workflow.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });
      if (res.ok) {
        message.success('工作流已保存');
        loadWorkflows();
        setModalVisible(false);
      } else {
        message.error('保存失败');
      }
    } catch (e) {
      message.error('保存失败');
    }
  };

  // 执行工作流
  const handleRunWorkflow = async (workflow: Workflow) => {
    setRunningWorkflow(true);
    try {
      // 模拟执行
      for (const node of workflow.nodes) {
        if (node.type !== 'start' && node.type !== 'end') {
          node.status = 'running';
          setSelectedWorkflow({ ...workflow });
          await new Promise(r => setTimeout(r, 800));
          node.status = 'success';
          setSelectedWorkflow({ ...workflow });
        }
      }
      message.success('工作流执行完成');
    } catch (e) {
      message.error('执行失败');
    } finally {
      setRunningWorkflow(false);
    }
  };

  // 删除工作流
  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm('确定要删除这个工作流吗？')) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('已删除');
        loadWorkflows();
        if (selectedWorkflow?.id === id) setSelectedWorkflow(null);
      }
    } catch (e) {
      message.error('删除失败');
    }
  };

  // 从模板创建
  const handleCreateFromTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    const newWorkflow: Workflow = {
      id: '',
      name: template.name,
      description: template.description,
      nodes: template.nodes.map(n => ({ ...n })),
      edges: template.edges.map(e => ({ ...e })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingWorkflow(newWorkflow);
    setModalVisible(true);
  };

  // 渲染节点
  const renderNode = (node: SkillNode, index: number) => {
    const statusIcon = node.status === 'running' ? <LoadingOutlined spin /> :
                       node.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                       node.status === 'error' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
                       null;

    return (
      <div key={node.id} style={nodeStyle(node.type, node.status)}>
        {NODE_TYPE_ICONS[node.type]}
        <span>{node.label}</span>
        {statusIcon}
        {node.type !== 'start' && node.type !== 'end' && (
          <Tooltip title="配置">
            <Button type="text" size="small" icon={<SettingOutlined />} style={{ marginLeft: 4, color: '#888' }} />
          </Tooltip>
        )}
      </div>
    );
  };

  // 渲染工作流图（简化版）
  const renderWorkflowCanvas = (workflow: Workflow) => {
    const nodeCount = workflow.nodes.length;
    const startNode = workflow.nodes.find(n => n.type === 'start');
    const endNode = workflow.nodes.find(n => n.type === 'end');
    const middleNodes = workflow.nodes.filter(n => n.type !== 'start' && n.type !== 'end');

    return (
      <div style={{ ...canvasStyle, padding: 40 }}>
        {/* 节点布局 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          {/* 开始节点 */}
          {startNode && renderNode(startNode, 0)}
          
          {/* 连接线 */}
          {startNode && middleNodes.length > 0 && (
            <div style={{ color: '#3b82f6', fontSize: 20 }}>→</div>
          )}
          
          {/* 中间节点 */}
          {middleNodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              {renderNode(node, idx + 1)}
              {idx < middleNodes.length - 1 && (
                <div style={{ color: '#3b82f6', fontSize: 20 }}>→</div>
              )}
            </React.Fragment>
          ))}
          
          {/* 连接线 */}
          {middleNodes.length > 0 && endNode && (
            <div style={{ color: '#3b82f6', fontSize: 20 }}>→</div>
          )}
          
          {/* 结束节点 */}
          {endNode && renderNode(endNode, nodeCount - 1)}
        </div>

        {/* 状态统计 */}
        <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Tag icon={<SettingOutlined />} color="blue">Skills: {workflow.nodes.filter(n => n.type === 'skill').length}</Tag>
            <Tag icon={<CloudServerOutlined />} color="purple">MCP: {workflow.nodes.filter(n => n.type === 'mcp').length}</Tag>
            <Tag icon={<RobotOutlined />} color="orange">Agent: {workflow.nodes.filter(n => n.type === 'agent').length}</Tag>
          </div>
        </div>
      </div>
    );
  };

  // 过滤工作流
  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchText.toLowerCase()) ||
    w.description.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>
            ⚡ Skills 编排
          </Title>
          <Text type="secondary" style={{ color: '#888' }}>
            创建和管理 Skills 工作流，实现自动化任务编排
          </Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingWorkflow(null); setModalVisible(true); }}>
            新建工作流
          </Button>
          <Button icon={<SyncOutlined />} onClick={loadWorkflows} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'templates',
            label: '📋 模板库',
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Search placeholder="搜索模板..." allowClear onChange={e => setSearchText(e.target.value)} style={{ width: 300 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {PRESET_TEMPLATES.filter(t =>
                    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    t.description.toLowerCase().includes(searchText.toLowerCase())
                  ).map(template => (
                    <Card key={template.id} size="small"
                      style={{ background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}
                      actions={[
                        <Button key="use" type="text" icon={<PlusOutlined />} onClick={() => handleCreateFromTemplate(template)}>
                          使用模板
                        </Button>,
                        <Button key="view" type="text" icon={<ExportOutlined />} onClick={() => {
                          setSelectedWorkflow({
                            id: '', name: template.name, description: template.description,
                            nodes: template.nodes, edges: template.edges,
                            created_at: '', updated_at: '',
                          });
                          setActiveTab('canvas');
                        }}>
                          预览
                        </Button>,
                      ]}>
                      <Card.Meta
                        title={<span style={{ color: '#00d4ff' }}>{template.name}</span>}
                        description={<span style={{ color: '#888' }}>{template.description}</span>}
                      />
                      <div style={{ marginTop: 12 }}>
                        <Tag color="blue">{template.nodes.length} 节点</Tag>
                        <Tag color="green">{template.edges.length} 连接</Tag>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'my-workflows',
            label: `📁 我的工作流 (${workflows.length})`,
            children: (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : filteredWorkflows.length === 0 ? (
                  <Empty description="暂无工作流" />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {filteredWorkflows.map(workflow => (
                      <Card key={workflow.id} size="small"
                        style={{ background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}
                        actions={[
                          <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => {
                            setEditingWorkflow(workflow);
                            setModalVisible(true);
                          }}>编辑</Button>,
                          <Button key="run" type="text" icon={<PlayCircleOutlined />} onClick={() => handleRunWorkflow(workflow)} loading={runningWorkflow}>运行</Button>,
                          <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteWorkflow(workflow.id)}>删除</Button>,
                        ]}>
                        <Card.Meta
                          title={<span style={{ color: '#00d4ff' }}>{workflow.name}</span>}
                          description={<span style={{ color: '#888' }}>{workflow.description}</span>}
                        />
                        <div style={{ marginTop: 12 }}>
                          <Tag color="blue">{workflow.nodes.length} 节点</Tag>
                          <Tag color="green">{workflow.edges.length} 连接</Tag>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'canvas',
            label: '🎨 工作流画布',
            children: selectedWorkflow ? (
              <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Title level={5} style={{ margin: 0, color: '#00d4ff' }}>{selectedWorkflow.name}</Title>
                    <Text type="secondary" style={{ color: '#888' }}>{selectedWorkflow.description}</Text>
                  </div>
                  <Space>
                    <Button icon={<PlayCircleOutlined />} type="primary" onClick={() => handleRunWorkflow(selectedWorkflow)} loading={runningWorkflow}>
                      执行工作流
                    </Button>
                  </Space>
                </div>
                {renderWorkflowCanvas(selectedWorkflow)}
              </div>
            ) : (
              <Empty description="请先选择一个工作流或从模板创建" />
            ),
          },
        ]}
      />

      {/* 新建/编辑工作流 Modal */}
      <Modal
        title={editingWorkflow?.id ? '编辑工作流' : '新建工作流'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => editingWorkflow && handleSaveWorkflow(editingWorkflow)}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>工作流名称</label>
          <Input
            value={editingWorkflow?.name || ''}
            onChange={e => setEditingWorkflow(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="输入工作流名称"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>描述</label>
          <Input.TextArea
            value={editingWorkflow?.description || ''}
            onChange={e => setEditingWorkflow(prev => prev ? { ...prev, description: e.target.value } : null)}
            placeholder="描述工作流的用途"
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      </Modal>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};
