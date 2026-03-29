import { useCallback, useState, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Node, Edge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, List, Tag, Modal, Form, Input, message, Space, Typography, Popconfirm } from 'antd';
import { PlusIcon, EditIcon, PlayIcon, DeleteIcon, SaveIcon, RocketIcon } from '../components/Icons';

const { Title, Text } = Typography;

const nodeTypes_list = ['input', 'default', 'output'] as const;
type NodeType = typeof nodeTypes_list[number];

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'published';
  published_at?: string;
  graph_def?: {
    nodes?: Node[];
    edges?: Edge[];
  };
}

const initialNodes: Node[] = [
  { id: 'start-1', position: { x: 250, y: 0 }, data: { label: '开始' }, type: 'input' },
  { id: 'llm-1', position: { x: 250, y: 100 }, data: { label: 'LLM 对话' }, type: 'default' },
  { id: 'end-1', position: { x: 250, y: 200 }, data: { label: '结束' }, type: 'output' },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'llm-1' },
  { id: 'e2', source: 'llm-1', target: 'end-1' },
];

export function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [form] = Form.useForm();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [agentName, setAgentName] = useState('My Agent');

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const loadAgents = useCallback(() => {
    fetch('/api/agents/')
      .then(res => res.json())
      .then(data => {
        setAgents(data.agents || []);
      })
      .catch(err => message.error('加载失败: ' + err));
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreateAgent = (values: any) => {
    fetch('/api/agents/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then((data) => {
        message.success('Agent 创建成功');
        setIsModalOpen(false);
        form.resetFields();
        loadAgents();
        
        // Auto-open editor after creation
        const newAgent: Agent = {
          agent_id: data.agent_id,
          name: values.name,
          description: values.description || '',
          status: 'draft',
          graph_def: {
            nodes: initialNodes,
            edges: initialEdges,
          },
        };
        handleEditCanvas(newAgent);
      })
      .catch(err => {
        if (err.message?.includes('already exists')) {
          message.error('该名称的 Agent 已存在');
        } else {
          message.error('创建失败: ' + err);
        }
      });
  };

  const handlePublishAgent = (agent: Agent) => {
    // 验证 Agent 图完整性
    if (!agent.graph_def?.nodes || agent.graph_def.nodes.length === 0) {
      message.error('Agent 图为空，请先编辑并添加节点后再发布');
      return;
    }
    if (!agent.graph_def?.edges || agent.graph_def.edges.length === 0) {
      message.error('Agent 图没有连接边，请先连接节点后再发布');
      return;
    }
    
    // 检查是否有输入输出节点
    const hasInput = agent.graph_def.nodes.some(n => n.type === 'input');
    const hasOutput = agent.graph_def.nodes.some(n => n.type === 'output');
    if (!hasInput || !hasOutput) {
      message.error('Agent 图必须有输入（Start）和输出（End）节点');
      return;
    }
    
    Modal.confirm({
      title: '确认发布',
      content: `确定要发布 Agent "${agent.name}" 吗？发布后可开始对话。`,
      onOk: () => {
        fetch(`/api/agents/${agent.agent_id}/publish`, { method: 'POST' })
          .then(res => res.json())
          .then(() => {
            message.success('Agent 发布成功');
            loadAgents();
          })
          .catch(err => message.error('发布失败: ' + err));
      },
    });
  };

  const handleUnpublishAgent = (agent_id: string) => {
    Modal.confirm({
      title: '确认取消发布',
      content: `确定要取消发布该 Agent 吗？取消后用户无法再发起对话。`,
      onOk: () => {
        fetch(`/api/agents/${agent_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'draft' }),
        })
          .then(res => res.json())
          .then(() => {
            message.success('已取消发布');
            loadAgents();
          })
          .catch(err => message.error('操作失败: ' + err));
      },
    });
  };

  const handleDeleteAgent = (agent_id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 Agent "${agent_id}" 吗？`,
      onOk: () => {
        fetch(`/api/agents/${agent_id}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(() => {
            message.success('已删除');
            loadAgents();
          })
          .catch(err => message.error('删除失败: ' + err));
      },
    });
  };

  const handleEditCanvas = (agent: Agent) => {
    setCurrentAgent(agent);
    setAgentName(agent.name || agent.agent_id);
    
    // Load graph from agent, or use default
    if (agent.graph_def?.nodes && agent.graph_def.nodes.length > 0) {
      setNodes(agent.graph_def.nodes);
      setEdges(agent.graph_def.edges || []);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    setIsCanvasOpen(true);
  };

  const saveGraph = () => {
    if (!currentAgent) return;
    
    const graphData = { nodes, edges };
    fetch(`/api/agents/${currentAgent.agent_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: agentName, 
        graph_def: graphData 
      }),
    })
      .then(res => res.json())
      .then(() => {
        message.success('Agent 保存成功');
        setIsCanvasOpen(false);
        loadAgents();
      })
      .catch(err => message.error('保存失败: ' + err));
  };

  const addNode = (type: NodeType) => {
    const id = `node_${Date.now()}`;
    const labels: Record<NodeType, string> = { 
      input: '输入', 
      default: '处理节点', 
      output: '输出' 
    };
    
    // Calculate position - find the rightmost node and place new one to its right
    const maxX = Math.max(...nodes.map(n => n.position?.x || 0), 100);
    const newNode: Node = { 
      id, 
      position: { x: maxX + 50, y: 150 }, 
      data: { label: labels[type] }, 
      type 
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Agent 列表</Title>}
        extra={
          <Button type="primary" icon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
            创建 Agent
          </Button>
        }
      >
        <List
          dataSource={agents}
          locale={{ emptyText: '暂无 Agent，点击上方按钮创建' }}
          renderItem={(agent: Agent) => (
            <List.Item
              actions={[
                <Tag key="edit" icon={<EditIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handleEditCanvas(agent)}>编辑</Tag>,
                agent.status === 'published' ? (
                  <Tag color="orange" key="unpub" icon={<RocketIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handleUnpublishAgent(agent.agent_id)}>取消发布</Tag>
                ) : (
                  <Tag color="blue" key="pub" icon={<RocketIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handlePublishAgent(agent)}>发布</Tag>
                ),
                <Tag color="green" key="run" icon={<PlayIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => window.location.href = '/chat'}>对话</Tag>,
                <Popconfirm
                  key="delete"
                  title="确定要删除吗？"
                  onConfirm={() => handleDeleteAgent(agent.agent_id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Tag color="red" icon={<DeleteIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>删除</Tag>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{agent.name || agent.agent_id}</span>
                    <Tag color={agent.status === 'published' ? 'green' : 'default'}>
                      {agent.status === 'published' ? '已发布' : '草稿'}
                    </Tag>
                    {agent.graph_def?.nodes && agent.graph_def.nodes.length > 0 && (
                      <Tag color="blue">{agent.graph_def.nodes.length} 节点</Tag>
                    )}
                  </Space>
                }
                description={agent.description || "无描述"}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 创建 Agent Modal */}
      <Modal
        title="创建新 Agent"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAgent}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="Agent 名称，如：客服助手" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="Agent 描述（可选）" rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建并编辑</Button>
        </Form>
      </Modal>

      {/* 编辑 Canvas Modal */}
      <Modal
        title={
          <Space>
            <span>编辑 Agent:</span>
            <Input 
              value={agentName} 
              onChange={e => setAgentName(e.target.value)}
              style={{ width: 200 }}
              placeholder="Agent 名称"
            />
          </Space>
        }
        open={isCanvasOpen}
        onCancel={() => setIsCanvasOpen(false)}
        width={1200}
        footer={
          <Space>
            <Text type="secondary">拖拽节点连接，编辑属性</Text>
            <div style={{ flex: 1 }} />
            <Button onClick={() => setIsCanvasOpen(false)}>取消</Button>
            <Button type="primary" icon={<SaveIcon />} onClick={saveGraph}>保存</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 12 }}>
          <Text strong>添加节点：</Text>
          <Button size="small" onClick={() => addNode('input')}>+ 输入</Button>
          <Button size="small" onClick={() => addNode('default')}>+ 处理</Button>
          <Button size="small" onClick={() => addNode('output')}>+ 输出</Button>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            提示：拖拽节点到画布，连接桩可创建边
          </Text>
        </Space>
        <div style={{ height: 500, border: '1px solid #f0f0f0', borderRadius: 8 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background />
            <Panel position="top-right">
              <Space>
                <Text type="secondary">节点: {nodes.length}</Text>
                <Text type="secondary">边: {edges.length}</Text>
              </Space>
            </Panel>
          </ReactFlow>
        </div>
      </Modal>
    </div>
  );
}
