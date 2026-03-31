import React, { useState } from 'react';
import {
  Card, Tabs, Button, Space, Typography, Tag, Select, Input, Modal, message,
  List, Empty, Divider,
} from 'antd';
import {
  PlayCircleOutlined, SaveOutlined, PlusOutlined, DeleteOutlined,
  SettingOutlined, CloudServerOutlined, RobotOutlined, BranchesOutlined,
  SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,

} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface OrchestrationNode {
  id: string;
  type: 'skill' | 'mcp' | 'llm' | 'condition' | 'start' | 'end' | 'parallel';
  label: string;
  icon: React.ReactNode;
  status: 'idle' | 'running' | 'success' | 'error';
  params: Record<string, any>;
}

interface OrchestrationEdge {
  id: string;
  source: string;
  target: string;
}

const NODE_TYPES = [
  { value: 'skill', label: '🛠️ Skill', color: '#3b82f6' },
  { value: 'mcp', label: '🔌 MCP Tool', color: '#a855f7' },
  { value: 'llm', label: '🤖 LLM Call', color: '#00d4ff' },
  { value: 'condition', label: '⚡ Condition', color: '#f59e0b' },
  { value: 'parallel', label: '🔄 Parallel', color: '#22c55e' },
];

const SKILL_OPTIONS = [
  { value: 'web_search', label: '🔍 网页搜索' },
  { value: 'data_analysis', label: '📊 数据分析' },
  { value: 'code_assistant', label: '💻 代码助手' },
  { value: 'image_analysis', label: '🖼️ 图像分析' },
  { value: 'document_parser', label: '📄 文档解析' },
  { value: 'weather', label: '🌤️ 天气查询' },
];

const MCP_OPTIONS = [
  { value: 'filesystem', label: '📁 文件系统' },
  { value: 'github', label: '🐙 GitHub' },
  { value: 'database', label: '🗄️ 数据库' },
  { value: 'web_fetch', label: '🌐 网页获取' },
];

const PRESET_WORKFLOWS = [
  {
    id: 'research', name: '🔬 研究分析流', description: '搜索 → 分析 → 总结',
    nodes: [
      { id: 'start', type: 'start', label: '开始', icon: <PlayCircleOutlined />, status: 'idle', params: {} },
      { id: 'search', type: 'skill', label: '网页搜索', icon: <SettingOutlined />, status: 'idle', params: { skill: 'web_search' } },
      { id: 'analyze', type: 'llm', label: '数据分析', icon: <RobotOutlined />, status: 'idle', params: {} },
      { id: 'end', type: 'end', label: '结束', icon: <CheckCircleOutlined />, status: 'idle', params: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'search' },
      { id: 'e2', source: 'search', target: 'analyze' },
      { id: 'e3', source: 'analyze', target: 'end' },
    ],
  },
  {
    id: 'multi_tool', name: '🔧 多工具协作流', description: '搜索 → 多工具并行 → 汇总',
    nodes: [
      { id: 'start', type: 'start', label: '开始', icon: <PlayCircleOutlined />, status: 'idle', params: {} },
      { id: 'parallel', type: 'parallel', label: '并行执行', icon: <SyncOutlined />, status: 'idle', params: {} },
      { id: 'skill1', type: 'skill', label: '网页搜索', icon: <SettingOutlined />, status: 'idle', params: { skill: 'web_search' } },
      { id: 'skill2', type: 'skill', label: '文档解析', icon: <SettingOutlined />, status: 'idle', params: { skill: 'document_parser' } },
      { id: 'merge', type: 'llm', label: '汇总结果', icon: <RobotOutlined />, status: 'idle', params: {} },
      { id: 'end', type: 'end', label: '结束', icon: <CheckCircleOutlined />, status: 'idle', params: {} },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'parallel' },
      { id: 'e2', source: 'parallel', target: 'skill1' },
      { id: 'e3', source: 'parallel', target: 'skill2' },
      { id: 'e4', source: 'skill1', target: 'merge' },
      { id: 'e5', source: 'skill2', target: 'merge' },
      { id: 'e6', source: 'merge', target: 'end' },
    ],
  },
];

const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};

export function SkillsOrchestratorPage() {
  const [nodes, setNodes] = useState<OrchestrationNode[]>([]);
  const [edges, setEdges] = useState<OrchestrationEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [executionLog, setExecutionLog] = useState<{ nodeId: string; status: string; duration_ms?: number; error?: string }[]>([]);
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);

  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleAddNode = (type: string) => {
    const typeConfig = NODE_TYPES.find(t => t.value === type) || NODE_TYPES[0];
    const nodeIcons: Record<string, React.ReactNode> = {
      skill: <SettingOutlined />, mcp: <CloudServerOutlined />, llm: <RobotOutlined />,
      condition: <BranchesOutlined />, parallel: <SyncOutlined />, start: <PlayCircleOutlined />, end: <CheckCircleOutlined />,
    };
    const newNode: OrchestrationNode = {
      id: `${type}_${Date.now()}`,
      type: type as OrchestrationNode['type'],
      label: typeConfig.label.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, ''),
      icon: nodeIcons[type] || <SettingOutlined />,
      status: 'idle',
      params: {},
    };
    setNodes([...nodes, newNode]);
    setAddNodeModalVisible(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNode = (nodeId: string, params: Record<string, any>) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, params: { ...n.params, ...params } } : n));
  };

  const handleConnect = (sourceId: string, targetId: string) => {
    if (edges.find(e => e.source === sourceId && e.target === targetId)) {
      message.warning('该连接已存在');
      return;
    }
    setEdges([...edges, { id: `e_${Date.now()}`, source: sourceId, target: targetId }]);
  };

  const handleLoadPreset = (template: typeof PRESET_WORKFLOWS[0]) => {
    setNodes(template.nodes.map(n => ({ ...n, status: "idle" as const, type: n.type as OrchestrationNode["type"] })))
    setEdges([...template.edges]);
    setWorkflowName(template.name);
    setWorkflowDescription(template.description);
    message.success(`已加载: ${template.name}`);
  };

  const topologicalSort = (nodes: OrchestrationNode[], edges: OrchestrationEdge[]): OrchestrationNode[] => {
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
    edges.forEach(e => {
      adj[e.source]?.push(e.target);
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });
    const queue = nodes.filter(n => inDegree[n.id] === 0);
    const result: OrchestrationNode[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      adj[node.id]?.forEach(target => {
        inDegree[target]--;
        if (inDegree[target] === 0) {
          const next = nodes.find(n => n.id === target);
          if (next) queue.push(next);
        }
      });
    }
    return result;
  };

  const handleExecute = async () => {
    if (nodes.length === 0) { message.warning('请先添加节点'); return; }
    setRunning(true);
    setExecutionLog([]);
    const sortedNodes = topologicalSort(nodes, edges);
    for (const node of sortedNodes) {
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: 'running' as const } : n));
      await new Promise(resolve => setTimeout(resolve, 800));
      const success = Math.random() > 0.1;
      setExecutionLog(prev => [...prev, {
        nodeId: node.id,
        status: success ? 'success' : 'error',
        duration_ms: 800,
        error: success ? undefined : '执行失败',
      }]);
      setNodes(prev => prev.map(n => n.id === node.id ? { ...n, status: success ? 'success' : 'error' as const } : n));
    }
    setRunning(false);
    message.success('工作流执行完成');
  };

  const handleSave = () => {
    if (!workflowName) { message.warning('请输入工作流名称'); return; }
    message.success(`工作流「${workflowName}」已保存`);
    setSaveModalVisible(false);
  };

  const handleClear = () => {
    if (!window.confirm('确定要清空所有节点吗？')) return;
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setExecutionLog([]);
  };

  const getConnectedNodes = (nodeId: string) => {
    const outgoing = edges.filter(e => e.source === nodeId).map(e => nodes.find(n => n.id === e.target)!);
    const incoming = edges.filter(e => e.target === nodeId).map(e => nodes.find(n => n.id === e.source)!);
    return { outgoing, incoming };
  };

  const { outgoing: outgoingConnected, incoming: incomingConnected } = selectedNode ? getConnectedNodes(selectedNode.id) : { outgoing: [], incoming: [] };

  const statusColors: Record<string, string> = { idle: '#888', running: '#00d4ff', success: '#00ff88', error: '#ff4757' };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#0a0e17', padding: 0, color: '#e0e6ed' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0, 212, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>⚡ Skills 编排引擎</Title>
          <Text type="secondary" style={{ color: '#888', fontSize: 12 }}>可视化编排多 Skills / MCP Tools 协作工作流</Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setAddNodeModalVisible(true)}>添加节点</Button>
          <Button icon={<SaveOutlined />} onClick={() => setSaveModalVisible(true)}>保存</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClear}>清空</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 160px)' }}>
        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12, marginRight: 12 }}>快速模板:</Text>
            {PRESET_WORKFLOWS.map(t => (
              <Button key={t.id} size="small" style={{ marginRight: 8 }} onClick={() => handleLoadPreset(t)}>{t.name}</Button>
            ))}
          </div>

          {nodes.length === 0 ? (
            <Empty description={<span style={{ color: '#888' }}>点击「添加节点」开始构建工作流，或选择一个快速模板</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 80 }} />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const isConnectedToSelected = selectedNode ? edges.find(e => (e.source === selectedNode.id && e.target === node.id) || (e.source === node.id && e.target === selectedNode.id)) : false;
                const typeConfig = NODE_TYPES.find(t => t.value === node.type) || NODE_TYPES[0];
                return (
                  <div key={node.id} style={{ opacity: selectedNodeId && !isSelected && !isConnectedToSelected ? 0.5 : 1 }}>
                    <div
                      onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      style={{
                        padding: '12px 16px', minWidth: 160,
                        background: isSelected ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                        border: `2px solid ${isSelected ? '#00d4ff' : typeConfig.color}`,
                        borderRadius: 10, cursor: 'pointer',
                        boxShadow: isSelected ? `0 0 20px ${typeConfig.color}40` : 'none',
                        transition: 'all 0.2s', position: 'relative',
                      }}
                    >
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: statusColors[node.status], boxShadow: `0 0 8px ${statusColors[node.status]}` }} />
                      {node.type !== 'start' && node.type !== 'end' && (
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          style={{ position: 'absolute', top: 4, right: 24, padding: 0, width: 16, height: 16 }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18, color: typeConfig.color }}>{node.icon}</span>
                        <Tag color={typeConfig.color} style={{ margin: 0, fontSize: 10 }}>{typeConfig.label}</Tag>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{node.label}</div>
                      {node.type === 'skill' && (
                        <Select size="small" style={{ width: '100%', marginTop: 8 }}
                          value={node.params.skill}
                          onChange={(v) => handleUpdateNode(node.id, { skill: v })}
                          onClick={(e) => e.stopPropagation()}
                          options={SKILL_OPTIONS} placeholder="选择 Skill" />
                      )}
                      {node.type === 'mcp' && (
                        <Select size="small" style={{ width: '100%', marginTop: 8 }}
                          value={node.params.mcp}
                          onChange={(v) => handleUpdateNode(node.id, { mcp: v })}
                          onClick={(e) => e.stopPropagation()}
                          options={MCP_OPTIONS} placeholder="选择 MCP Tool" />
                      )}
                      {node.type === 'llm' && (
                        <Input size="small" style={{ ...inputStyle, marginTop: 8, fontSize: 11 }}
                          placeholder="LLM 指令..." value={node.params.prompt || ''}
                          onChange={(e) => handleUpdateNode(node.id, { prompt: e.target.value })}
                          onClick={(e) => e.stopPropagation()} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedNode && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 8, border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <Text style={{ color: '#00d4ff', fontSize: 12 }}>
                已选中「{selectedNode.label}」
                {incomingConnected.length > 0 && ` ← ${incomingConnected.map(n => n.label).join(', ')}`}
                {outgoingConnected.length > 0 && ` → ${outgoingConnected.map(n => n.label).join(', ')}`}
              </Text>
            </div>
          )}

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button type="primary" size="large" icon={running ? <LoadingOutlined /> : <PlayCircleOutlined />} loading={running}
              onClick={handleExecute} disabled={nodes.length === 0}
              style={{ background: running ? 'rgba(0, 212, 255, 0.3)' : 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)', border: 'none', boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' }}>
              {running ? '执行中...' : '▶ 执行工作流'}
            </Button>
          </div>

          {executionLog.length > 0 && (
            <Card size="small" title="📋 执行日志" style={{ marginTop: 16, background: 'rgba(0, 20, 40, 0.6)' }}>
              <List size="small" dataSource={executionLog} renderItem={(item) => {
                const node = nodes.find(n => n.id === item.nodeId);
                return (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Space>
                      {item.status === 'success' ? <CheckCircleOutlined style={{ color: '#00ff88' }} /> : <CloseCircleOutlined style={{ color: '#ff4757' }} />}
                      <Text style={{ color: item.status === 'success' ? '#00ff88' : '#ff4757' }}>{node?.label || item.nodeId}</Text>
                      {item.duration_ms && <Tag style={{ fontSize: 10 }}>{item.duration_ms}ms</Tag>}
                      {item.error && <Text type="danger" style={{ fontSize: 11 }}>{item.error}</Text>}
                    </Space>
                  </List.Item>
                );
              }} />
            </Card>
          )}
        </div>

        <div style={{ width: 320, borderLeft: '1px solid rgba(0, 212, 255, 0.1)', padding: 16, overflow: 'auto' }}>
          <Tabs items={[
            {
              key: 'properties', label: '属性',
              children: selectedNode ? (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#888', fontSize: 12 }}>节点名称</Text>
                    <Input style={inputStyle} value={selectedNode.label} onChange={(e) => handleUpdateNode(selectedNode.id, { label: e.target.value })} />
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>节点参数</Text>
                  {selectedNode.type === 'skill' && (
                    <Select style={{ width: '100%' }} value={selectedNode.params.skill}
                      onChange={(v) => handleUpdateNode(selectedNode.id, { skill: v })} options={SKILL_OPTIONS} />
                  )}
                  {selectedNode.type === 'mcp' && (
                    <Select style={{ width: '100%' }} value={selectedNode.params.mcp}
                      onChange={(v) => handleUpdateNode(selectedNode.id, { mcp: v })} options={MCP_OPTIONS} />
                  )}
                  {selectedNode.type === 'llm' && (
                    <TextArea style={{ ...inputStyle, resize: 'none' }} rows={4} placeholder="输入 LLM 指令..."
                      value={selectedNode.params.prompt || ''} onChange={(e) => handleUpdateNode(selectedNode.id, { prompt: e.target.value })} />
                  )}
                </div>
              ) : <Empty description="选择一个节点查看属性" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            },
            {
              key: 'nodes', label: `节点 (${nodes.length})`,
              children: (
                <List size="small" dataSource={nodes} renderItem={(node) => {
                  const typeConfig = NODE_TYPES.find(t => t.value === node.type) || NODE_TYPES[0];
                  return (
                    <List.Item style={{ cursor: 'pointer', padding: '4px 0' }} onClick={() => setSelectedNodeId(node.id)}>
                      <Space>
                        <span style={{ color: typeConfig.color }}>{node.icon}</span>
                        <Text style={{ color: selectedNodeId === node.id ? '#00d4ff' : '#e0e6ed', fontSize: 12 }}>{node.label}</Text>
                      </Space>
                    </List.Item>
                  );
                }} />
              ),
            },
            {
              key: 'connect', label: '连接',
              children: selectedNode ? (
                <div>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>连接到...</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {nodes.filter(n => n.id !== selectedNode.id).map(n => {
                      const isConnected = edges.find(e => e.source === selectedNode.id && e.target === n.id);
                      return (
                        <Button key={n.id} size="small" type={isConnected ? 'primary' : 'default'}
                          onClick={() => !isConnected && handleConnect(selectedNode.id, n.id)} disabled={!!isConnected}>
                          → {n.label}
                        </Button>
                      );
                    })}
                  </div>
                  {edges.filter(e => e.source === selectedNode.id).length > 0 && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>已连接的输出</Text>
                      {edges.filter(e => e.source === selectedNode.id).map(e => {
                        const target = nodes.find(n => n.id === e.target);
                        return (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ color: '#00ff88', fontSize: 11 }}>→ {target?.label}</Text>
                            <Button type="text" size="small" danger icon={<DeleteOutlined />}
                              onClick={() => setEdges(edges.filter(ed => ed.id !== e.id))} />
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : <Empty description="选择一个节点来建立连接" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            },
          ]} />
        </div>
      </div>

      <Modal title="添加节点" open={addNodeModalVisible} onCancel={() => setAddNodeModalVisible(false)} footer={null}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {NODE_TYPES.map(type => (
            <Card key={type.value} size="small" hoverable onClick={() => handleAddNode(type.value)}
              style={{ background: 'rgba(0, 20, 40, 0.8)', border: `1px solid ${type.color}`, cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 24, color: type.color, marginBottom: 8 }}>
                {type.value === 'skill' ? <SettingOutlined /> :
                  type.value === 'mcp' ? <CloudServerOutlined /> :
                    type.value === 'llm' ? <RobotOutlined /> :
                      type.value === 'condition' ? <BranchesOutlined /> :
                        type.value === 'parallel' ? <SyncOutlined /> : null}
              </div>
              <div style={{ color: '#e0e6ed', fontSize: 13 }}>{type.label}</div>
            </Card>
          ))}
        </div>
      </Modal>

      <Modal title="保存工作流" open={saveModalVisible} onCancel={() => setSaveModalVisible(false)} onOk={handleSave} okText="保存">
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>工作流名称</Text>
          <Input style={inputStyle} value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="给工作流起个名字" />
        </div>
        <div>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>描述</Text>
          <TextArea style={{ ...inputStyle, resize: 'none' }} rows={2} value={workflowDescription}
            onChange={e => setWorkflowDescription(e.target.value)} placeholder="描述这个工作流的用途" />
        </div>
      </Modal>
    </div>
  );
}

export default SkillsOrchestratorPage;
