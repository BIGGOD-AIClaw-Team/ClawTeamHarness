import React, { useState } from 'react';
import {
  Card, Tabs, Button, Space, Typography, Tag, Select, Input, Modal, message,
  Avatar, Timeline, Statistic, Row, Col, Popconfirm, Table, Empty, Badge,
  Tooltip, Switch, Progress,
} from 'antd';
import {
  TeamOutlined, RobotOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
PlayCircleOutlined, StopOutlined, CheckCircleOutlined,
ClockCircleOutlined, SyncOutlined,
  MessageOutlined, EyeOutlined, ThunderboltOutlined, AimOutlined,
AlertOutlined, PlusCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ==================== Types ====================

interface AgentRole {
  id: string;
  role: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  status: 'idle' | 'busy' | 'offline';
  missions_completed: number;
  current_task?: string;
}

interface Mission {
  id: string;
  objective: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string[];
  created_at: string;
  completed_at?: string;
  result?: string;
  progress: number;
}

interface TeamEvent {
  event_id: string;
  event_type: 'mission_assigned' | 'mission_completed' | 'agent_status_change' | 'message';
  source_agent: string;
  data: any;
  timestamp: string;
  mission_id?: string;
}

// ==================== Constants ====================

const PRESET_ROLES: AgentRole[] = [
  {
    id: 'commander', role: 'commander', name: '指挥官', description: '负责统筹协调、任务分配、决策制定',
    icon: <TeamOutlined />, color: '#ff6b00', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'analyst', role: 'analyst', name: '分析师', description: '负责信息收集、数据分析、情报整理',
    icon: <EyeOutlined />, color: '#3b82f6', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'planner', role: 'planner', name: '规划师', description: '负责计划制定、任务分解、资源调度',
    icon: <AimOutlined />, color: '#22c55e', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'executor', role: 'executor', name: '执行者', description: '负责任务执行、工具调用、结果反馈',
    icon: <ThunderboltOutlined />, color: '#f59e0b', enabled: true, status: 'idle', missions_completed: 0,
  },
  {
    id: 'critic', role: 'critic', name: '评审员', description: '负责质量把控、结果审查、风险评估',
    icon: <AlertOutlined />, color: '#ef4444', enabled: true, status: 'idle', missions_completed: 0,
  },
];

const inputStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  borderRadius: '6px',
  color: '#e0e6ed',
};

const selectStyle: React.CSSProperties = { width: '100%' };

// ==================== Helper Functions ====================

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const formatTime = (date: Date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const PRIORITY_COLORS: Record<string, string> = {
  low: '#888',
  medium: '#f59e0b',
  high: '#ff6b00',
  critical: '#ff4757',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#00ff88',
  busy: '#00d4ff',
  offline: '#888',
  pending: '#888',
  running: '#00d4ff',
  completed: '#00ff88',
  failed: '#ff4757',
};

// ==================== Main Component ====================

export function MultiAgentPage() {
  const [agents, setAgents] = useState<AgentRole[]>(PRESET_ROLES);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [createMissionModalVisible, setCreateMissionModalVisible] = useState(false);
  const [newMission, setNewMission] = useState({ objective: '', priority: 'medium' as Mission['priority'], assigned_to: [] as string[] });
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [teamName, setTeamName] = useState('🚀 我的 Agent 团队');
  const [runningSimulation, setRunningSimulation] = useState(false);

  // Statistics
  const totalAgents = agents.filter(a => a.enabled).length;
  const onlineAgents = agents.filter(a => a.enabled && a.status !== 'offline').length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const runningMissions = missions.filter(m => m.status === 'running').length;

  // Create a mission
  const handleCreateMission = () => {
    if (!newMission.objective) {
      message.warning('请输入任务目标');
      return;
    }
    const mission: Mission = {
      id: generateId(),
      objective: newMission.objective,
      status: 'pending',
      priority: newMission.priority,
      assigned_to: newMission.assigned_to.length > 0 ? newMission.assigned_to : agents.filter(a => a.enabled).map(a => a.role),
      created_at: new Date().toISOString(),
      progress: 0,
    };
    setMissions([...missions, mission]);
    setEvents([...events, {
      event_id: generateId(),
      event_type: 'mission_assigned',
      source_agent: 'system',
      data: { mission_id: mission.id, objective: mission.objective },
      timestamp: new Date().toISOString(),
      mission_id: mission.id,
    }]);
    setNewMission({ objective: '', priority: 'medium', assigned_to: [] });
    setCreateMissionModalVisible(false);
    message.success('任务已创建');
  };

  // Assign and start a mission
  const handleStartMission = (missionId: string) => {
    setMissions(missions.map(m => m.id === missionId ? { ...m, status: 'running' as const, progress: 0 } : m));
    setAgents(agents.map(a => {
      if (a.enabled && a.status === 'idle') {
        return { ...a, status: 'busy' as const, current_task: missions.find(m => m.id === missionId)?.objective };
      }
      return a;
    }));
    setEvents([...events, {
      event_id: generateId(),
      event_type: 'mission_assigned',
      source_agent: 'commander',
      data: { mission_id: missionId },
      timestamp: new Date().toISOString(),
      mission_id: missionId,
    }]);
    message.success('任务已开始执行');
  };

  // Complete a mission
  const handleCompleteMission = (missionId: string, status: 'completed' | 'failed') => {
    setMissions(missions.map(m => m.id === missionId ? {
      ...m, status, completed_at: new Date().toISOString(), progress: status === 'completed' ? 100 : m.progress
    } : m));
    setAgents(agents.map(a => {
      if (a.enabled && a.current_task === missions.find(m => m.id === missionId)?.objective) {
        return {
          ...a,
          status: 'idle' as const,
          current_task: undefined,
          missions_completed: status === 'completed' ? a.missions_completed + 1 : a.missions_completed,
        };
      }
      return a;
    }));
    setEvents([...events, {
      event_id: generateId(),
      event_type: 'mission_completed',
      source_agent: 'system',
      data: { mission_id: missionId, status },
      timestamp: new Date().toISOString(),
      mission_id: missionId,
    }]);
  };

  // Toggle agent enabled
  const handleToggleAgent = (agentId: string) => {
    setAgents(agents.map(a => a.id === agentId ? {
      ...a, enabled: !a.enabled, status: !a.enabled ? 'idle' : 'offline'
    } : a));
  };

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const msg = { id: generateId(), sender: 'user', text: messageInput, time: formatTime(new Date()) };
    setMessages([...messages, msg]);
    setMessageInput('');

    // Simulate agent response
    setTimeout(() => {
      const responses = [
        { sender: 'commander', text: '收到指令，正在分析...', icon: <TeamOutlined /> },
        { sender: 'analyst', text: '我来帮你收集相关信息。', icon: <EyeOutlined /> },
        { sender: 'planner', text: '已制定执行计划。', icon: <AimOutlined /> },
        { sender: 'executor', text: '任务执行中...', icon: <ThunderboltOutlined /> },
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, {
        id: generateId(),
        sender: response.sender,
        text: response.text,
        time: formatTime(new Date()),
      }]);
    }, 1000);
  };

  // Simulation: auto-run missions
  const handleSimulate = () => {
    if (runningSimulation) return;
    setRunningSimulation(true);

    const pendingMission = missions.find(m => m.status === 'pending');
    if (pendingMission) {
      handleStartMission(pendingMission.id);
      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setMissions(prev => prev.map(m => m.id === pendingMission.id ? { ...m, progress } : m));
        if (progress >= 100) {
          clearInterval(interval);
          handleCompleteMission(pendingMission.id, 'completed');
          setRunningSimulation(false);
        }
      }, 1000);
    } else {
      message.info('暂无待执行的任务');
      setRunningSimulation(false);
    }
  };

  // Delete mission
  const handleDeleteMission = (missionId: string) => {
    setMissions(missions.filter(m => m.id !== missionId));
  };

  const columns = [
    {
      title: '任务',
      dataIndex: 'objective',
      key: 'objective',
      render: (text: string, record: Mission) => (
        <Space>
          <Tag color={PRIORITY_COLORS[record.priority]} style={{ margin: 0 }}>{record.priority.toUpperCase()}</Tag>
          <Text style={{ color: '#e0e6ed', fontSize: 13 }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={status as any} text={<Text style={{ color: STATUS_COLORS[status], fontSize: 12 }}>{status}</Text>} />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: Mission) => (
        record.status === 'running' ? (
          <Progress percent={progress} size="small" strokeColor="#00d4ff" trailColor="rgba(0, 212, 255, 0.2)" />
        ) : (
          <Text style={{ color: '#888', fontSize: 12 }}>{progress}%</Text>
        )
      ),
    },
    {
      title: '执行者',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      width: 180,
      render: (assigned: string[]) => (
        <Space size={4}>
          {assigned.slice(0, 3).map(a => {
            const agent = agents.find(ag => ag.role === a);
            return <Tooltip key={a} title={agent?.name}><Tag color={agent?.color} style={{ margin: 0, fontSize: 10 }}>{agent?.icon}</Tag></Tooltip>;
          })}
          {assigned.length > 3 && <Tag style={{ margin: 0, fontSize: 10 }}>+{assigned.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Mission) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartMission(record.id)}>执行</Button>
          )}
          {record.status === 'running' && (
            <>
              <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#00ff88' }} onClick={() => handleCompleteMission(record.id, 'completed')}>完成</Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => handleCompleteMission(record.id, 'failed')}>失败</Button>
            </>
          )}
          {(record.status === 'completed' || record.status === 'failed') && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDeleteMission(record.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#0a0e17', padding: 0, color: '#e0e6ed' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0, 212, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>👥 多 Agent 协作中心</Title>
          <Input
            style={{ ...inputStyle, marginTop: 4, fontSize: 12, background: 'transparent', border: 'none', padding: 0, width: 300 }}
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            variant="borderless"
          />
        </div>
        <Space>
          <Button icon={<PlayCircleOutlined />} onClick={handleSimulate} loading={runningSimulation}>模拟执行</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateMissionModalVisible(true)}>创建任务</Button>
        </Space>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card size="small" style={{ flex: 1, minWidth: 140, background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <Statistic
            title={<Text style={{ color: '#888', fontSize: 12 }}>团队成员</Text>}
            value={`${onlineAgents} / ${totalAgents}`}
            prefix={<TeamOutlined style={{ color: '#00d4ff' }} />}
            valueStyle={{ color: '#00d4ff', fontSize: 20 }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140, background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <Statistic
            title={<Text style={{ color: '#888', fontSize: 12 }}>运行中任务</Text>}
            value={runningMissions}
            prefix={<SyncOutlined style={{ color: '#f59e0b' }} />}
            valueStyle={{ color: '#f59e0b', fontSize: 20 }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140, background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <Statistic
            title={<Text style={{ color: '#888', fontSize: 12 }}>已完成</Text>}
            value={completedMissions}
            prefix={<CheckCircleOutlined style={{ color: '#00ff88' }} />}
            valueStyle={{ color: '#00ff88', fontSize: 20 }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, minWidth: 140, background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <Statistic
            title={<Text style={{ color: '#888', fontSize: 12 }}>总任务数</Text>}
            value={missions.length}
            prefix={<ThunderboltOutlined style={{ color: '#a855f7' }} />}
            valueStyle={{ color: '#a855f7', fontSize: 20 }}
          />
        </Card>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0 24px 24px' }}>
        <Row gutter={[16, 16]}>
          {/* Left: Agents + Missions */}
          <Col xs={24} lg={16}>
            <Tabs
              items={[
                {
                  key: 'agents',
                  label: <span><RobotOutlined /> 团队成员 ({totalAgents})</span>,
                  children: (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {agents.map(agent => (
                        <Card
                          key={agent.id}
                          size="small"
                          style={{
                            background: agent.enabled ? 'rgba(0, 20, 40, 0.6)' : 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${agent.enabled ? agent.color + '40' : 'rgba(255,255,255,0.1)'}`,
                            opacity: agent.enabled ? 1 : 0.5,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <Avatar
                              size={40}
                              style={{ background: agent.enabled ? agent.color + '20' : '#333', border: `2px solid ${agent.color}`, color: agent.color }}
                              icon={agent.icon}
                            />
                            <Switch
                              size="small"
                              checked={agent.enabled}
                              onChange={() => handleToggleAgent(agent.id)}
                              style={{ background: agent.enabled ? agent.color : '#333' }}
                            />
                          </div>
                          <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 2 }}>{agent.name}</div>
                          <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>{agent.description}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: STATUS_COLORS[agent.status],
                                boxShadow: `0 0 6px ${STATUS_COLORS[agent.status]}`,
                              }} />
                              <Text style={{ color: STATUS_COLORS[agent.status], fontSize: 11 }}>
                                {agent.status === 'idle' ? '空闲' : agent.status === 'busy' ? '工作中' : '离线'}
                              </Text>
                            </div>
                            <Text style={{ color: '#888', fontSize: 11 }}>
                              完成 {agent.missions_completed} 个任务
                            </Text>
                          </div>
                          {agent.current_task && (
                            <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 4 }}>
                              <Text style={{ color: '#00d4ff', fontSize: 10 }}>当前任务: {agent.current_task}</Text>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'missions',
                  label: <span><ThunderboltOutlined /> 任务列表 ({missions.length})</span>,
                  children: (
                    <div>
                      {missions.length === 0 ? (
                        <Empty description="暂无任务，点击右上角「创建任务」开始" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                      ) : (
                        <Table
                          columns={columns}
                          dataSource={missions}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          style={{ background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8 }}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Col>

          {/* Right: Chat + Events */}
          <Col xs={24} lg={8}>
            <Tabs
              items={[
                {
                  key: 'chat',
                  label: <span><MessageOutlined /> 团队对话</span>,
                  children: (
                    <Card size="small" style={{ background: 'rgba(0, 20, 40, 0.6)', height: 400, display: 'flex', flexDirection: 'column' }}>
                      {/* Messages */}
                      <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
                        {messages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>
                            <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                            <div style={{ fontSize: 12 }}>开始与团队对话</div>
                          </div>
                        ) : (
                          messages.map(msg => (
                            <div key={msg.id} style={{
                              marginBottom: 8,
                              display: 'flex',
                              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            }}>
                              <div style={{
                                maxWidth: '80%',
                                padding: '8px 12px',
                                background: msg.sender === 'user' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 8,
                                border: `1px solid ${msg.sender === 'user' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                              }}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{msg.sender === 'user' ? '你' : msg.sender} · {msg.time}</div>
                                <Text style={{ color: '#e0e6ed', fontSize: 13 }}>{msg.text}</Text>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Input */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <TextArea
                          style={{ ...inputStyle, resize: 'none' }}
                          rows={2}
                          placeholder="输入消息..."
                          value={messageInput}
                          onChange={e => setMessageInput(e.target.value)}
                          onPressEnter={handleSendMessage}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} style={{ alignSelf: 'flex-end' }} />
                      </div>
                    </Card>
                  ),
                },
                {
                  key: 'events',
                  label: <span><ClockCircleOutlined /> 事件日志</span>,
                  children: (
                    <Card size="small" style={{ background: 'rgba(0, 20, 40, 0.6)', height: 400, overflow: 'auto' }}>
                      {events.length === 0 ? (
                        <Empty description="暂无事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Timeline
                          items={[...events].reverse().map(event => {
                            const agent = agents.find(a => a.role === event.source_agent);
                            const icon = event.event_type === 'mission_completed' ? <CheckCircleOutlined /> :
                              event.event_type === 'mission_assigned' ? <PlusCircleOutlined /> :
                                event.event_type === 'agent_status_change' ? <SyncOutlined /> : <MessageOutlined />;
                            const color = event.event_type === 'mission_completed' ? '#00ff88' :
                              event.event_type === 'mission_assigned' ? '#00d4ff' : '#888';
                            return {
                              color,
                              dot: icon,
                              children: (
                                <div>
                                  <Text style={{ color: '#e0e6ed', fontSize: 12 }}>
                                    {agent?.name || '系统'}: {
                                      event.event_type === 'mission_assigned' ? `任务已分配` :
                                        event.event_type === 'mission_completed' ? `任务完成 (${event.data.status})` :
                                          event.event_type === 'message' ? event.data.text : '状态变更'
                                    }
                                  </Text>
                                  <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                                    {new Date(event.timestamp).toLocaleTimeString('zh-CN')}
                                  </div>
                                </div>
                              ),
                            };
                          })}
                        />
                      )}
                    </Card>
                  ),
                },
              ]}
            />
          </Col>
        </Row>
      </div>

      {/* Create Mission Modal */}
      <Modal
        title="创建新任务"
        open={createMissionModalVisible}
        onCancel={() => setCreateMissionModalVisible(false)}
        onOk={handleCreateMission}
        okText="创建"
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>任务目标</Text>
          <TextArea
            style={{ ...inputStyle, resize: 'none' }}
            rows={3}
            value={newMission.objective}
            onChange={e => setNewMission({ ...newMission, objective: e.target.value })}
            placeholder="描述任务目标..."
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>优先级</Text>
          <Select
            style={selectStyle}
            value={newMission.priority}
            onChange={v => setNewMission({ ...newMission, priority: v })}
            options={[
              { value: 'low', label: '🟢 低优先级' },
              { value: 'medium', label: '🟡 中优先级' },
              { value: 'high', label: '🟠 高优先级' },
              { value: 'critical', label: '🔴 紧急' },
            ]}
          />
        </div>
        <div>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>分配给</Text>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={newMission.assigned_to}
            onChange={v => setNewMission({ ...newMission, assigned_to: v })}
            placeholder="分配给哪些角色（留空则分配给所有成员）"
            options={agents.filter(a => a.enabled).map(a => ({ value: a.role, label: `${a.name}` }))}
          />
        </div>
      </Modal>
    </div>
  );

}

export default MultiAgentPage;
