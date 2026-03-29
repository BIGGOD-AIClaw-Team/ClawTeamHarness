import React, { useCallback, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, List, Tag, Modal, Form, Input, message, Space } from 'antd';
import { PlusIcon, EditIcon, PlayIcon, DeleteIcon, SaveIcon } from '../components/Icons';

const nodeTypes_list = ['input', 'default', 'output'] as const;
type NodeType = typeof nodeTypes_list[number];

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  graph_def?: {
    nodes?: Node[];
    edges?: Edge[];
  };
}

const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Start' }, type: 'input' },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'LLM' }, type: 'default' },
  { id: '3', position: { x: 400, y: 100 }, data: { label: 'Tool' }, type: 'default' },
  { id: '4', position: { x: 250, y: 200 }, data: { label: 'End' }, type: 'output' },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
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
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const loadAgents = useCallback(() => {
    fetch('/api/agents/')
      .then(res => res.json())
      .then(data => setAgents(data.agents || []))
      .catch(err => message.error('加载失败: ' + err));
  }, []);

  React.useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreateAgent = (values: any) => {
    fetch('/api/agents/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then(res => res.json())
      .then(() => {
        message.success('Agent 创建成功');
        setIsModalOpen(false);
        form.resetFields();
        loadAgents();
      })
      .catch(err => message.error('创建失败: ' + err));
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
    setAgentName(agent.name);
    if (agent.graph_def?.nodes && agent.graph_def?.edges) {
      setNodes(agent.graph_def.nodes);
      setEdges(agent.graph_def.edges);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    setIsCanvasOpen(true);
  };

  const saveGraph = () => {
    if (!currentAgent) return;
    const graphData = { name: agentName, nodes, edges };
    fetch(`/api/agents/${currentAgent.agent_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agentName, graph_def: graphData }),
    })
      .then(res => res.json())
      .then(() => {
        message.success('Agent 保存成功');
        loadAgents();
      })
      .catch(err => message.error('保存失败: ' + err));
  };

  const addNode = (type: NodeType) => {
    const id = String(Date.now());
    const labels: Record<NodeType, string> = { input: 'Start', default: 'Node', output: 'End' };
    const newNode: Node = { id, position: { x: 250, y: 150 }, data: { label: labels[type] }, type };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div>
      <Card
        title="Agent 列表"
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
                <Tag color="green" key="run" icon={<PlayIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>运行</Tag>,
                <Tag color="red" key="delete" icon={<DeleteIcon />} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => handleDeleteAgent(agent.agent_id)}>删除</Tag>,
              ]}
            >
              <List.Item.Meta
                title={agent.name || agent.agent_id}
                description={agent.description || "无描述"}
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="创建新 Agent"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAgent}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="Agent 名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="Agent 描述（可选）" rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>创建</Button>
        </Form>
      </Modal>

      <Modal
        title={`编辑 Agent: ${agentName}`}
        open={isCanvasOpen}
        onCancel={() => setIsCanvasOpen(false)}
        width={1200}
        footer={
          <Space>
            <Button onClick={() => setIsCanvasOpen(false)}>取消</Button>
            <Button type="primary" icon={<SaveIcon />} onClick={saveGraph}>保存</Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 12 }}>
          <span>添加节点：</span>
          <Button size="small" onClick={() => addNode('input')}>Start</Button>
          <Button size="small" onClick={() => addNode('default')}>Node</Button>
          <Button size="small" onClick={() => addNode('output')}>End</Button>
        </Space>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </Modal>
    </div>
  );
}
