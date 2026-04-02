import { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Button, Space, Typography, Tag, Select, Input, Modal, message,
  Avatar, Row, Col, Empty, Switch, Progress, Drawer, List, Divider,
} from 'antd';
import {
  TeamOutlined, RobotOutlined, PlusOutlined, DeleteOutlined,
  EyeOutlined, ThunderboltOutlined, AimOutlined,
  ShareAltOutlined,
  MonitorOutlined, ArrowRightOutlined, SettingOutlined, ExperimentOutlined,
  BranchesOutlined,
} from '@ant-design/icons';

import {
  AgentCard, TeamChat, MissionTable, WorkflowTaskTable,
  StatsCards, StepCard, PageHeader, ProtocolConfig, AgentCapabilityPanel,
} from './components';
import { useAgents, useMissions, useWorkflow, useTeams, useCollaboration } from './hooks';
import {
  generateId, formatTime,
  WORKFLOW_TYPE_OPTIONS, STEP_TYPE_OPTIONS, DEFAULT_AGENT_CAPABILITIES,
  inputStyle, selectStyle, getModelsByProvider,
} from './constants';
import { WorkflowStep, ConditionRule, TeamAgent, AgentCapability } from './types';

const { Text } = Typography;
const { TextArea } = Input;

// ==================== Main Page ====================

export function MultiAgentPage() {
  // ==================== Hooks ====================
  const agentsHook = useAgents();
  const missionsHook = useMissions(agentsHook.agents);
  const workflowHook = useWorkflow();
  const teamsHook = useTeams();
  const collabHook = useCollaboration();

  // ==================== Local State ====================
  const [teamName, setTeamName] = useState('🚀 我的 Agent 团队');
  const [runningSimulation, setRunningSimulation] = useState(false);

  // Messages
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [messageInput, setMessageInput] = useState('');

  // Mission Modal
  const [createMissionModalVisible, setCreateMissionModalVisible] = useState(false);
  const [newMission, setNewMission] = useState({ objective: '', priority: 'medium' as any, assigned_to: [] as string[] });

  // Team Drawer
  const [teamDrawerVisible, setTeamDrawerVisible] = useState(false);
  const [newTeamConfig, setNewTeamConfig] = useState({ name: '', description: '', agents: [] as TeamAgent[] });

  // Workflow
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [newTaskConfig, setNewTaskConfig] = useState({
    name: '',
    description: '',
    workflow_type: 'sequential' as any,
    steps: [] as WorkflowStep[],
    team_id: undefined as string | undefined,
  });
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepDrawerVisible, setStepDrawerVisible] = useState(false);

  // Agent Capability
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, AgentCapability>>(DEFAULT_AGENT_CAPABILITIES);
  const [selectedAgentRole, setSelectedAgentRole] = useState<string | null>(null);

  // Task Orchestration
  const [orchestrationActiveTab, setOrchestrationActiveTab] = useState<string>('steps');
  const [conditionRules, setConditionRules] = useState<ConditionRule[]>([]);
  const [editingCondition, setEditingCondition] = useState<ConditionRule | null>(null);
  const [conditionDrawerVisible, setConditionDrawerVisible] = useState(false);

  // ==================== Effects ====================
  useEffect(() => {
    teamsHook.loadTeams();
    workflowHook.loadTasks();
  }, []);

  // ==================== Stats ====================
  const totalAgents = agentsHook.agents.filter(a => a.enabled).length;
  const onlineAgents = agentsHook.agents.filter(a => a.enabled && a.status !== 'offline').length;
  const completedMissions = missionsHook.missions.filter(m => m.status === 'completed').length;
  const runningMissions = missionsHook.missions.filter(m => m.status === 'running').length;

  // ==================== Callbacks (memoized with useCallback) ====================

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim()) return;
    const msg = { id: generateId(), sender: 'user', text: messageInput, time: formatTime(new Date()) };
    setMessages(prev => [...prev, msg]);
    setMessageInput('');
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
  }, [messageInput]);

  const handleSimulate = useCallback(() => {
    if (runningSimulation) return;
    setRunningSimulation(true);
    const pendingMission = missionsHook.missions.find(m => m.status === 'pending');
    if (pendingMission) {
      missionsHook.startMission(pendingMission.id);
      agentsHook.setBusyAgents(pendingMission.objective);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        missionsHook.updateProgress(pendingMission.id, progress);
        if (progress >= 100) {
          clearInterval(interval);
          missionsHook.completeMission(pendingMission.id, 'completed');
          agentsHook.incrementCompleted();
          setRunningSimulation(false);
        }
      }, 1000);
    } else {
      message.info('暂无待执行的任务');
      setRunningSimulation(false);
    }
  }, [runningSimulation, missionsHook, agentsHook]);

  const handleStartMission = useCallback((missionId: string) => {
    const mission = missionsHook.missions.find(m => m.id === missionId);
    if (mission) {
      missionsHook.startMission(missionId);
      agentsHook.setBusyAgents(mission.objective);
    }
  }, [missionsHook, agentsHook]);

  const handleCompleteMission = useCallback((missionId: string, status: 'completed' | 'failed') => {
    missionsHook.completeMission(missionId, status);
    if (status === 'completed') {
      agentsHook.incrementCompleted();
    }
  }, [missionsHook, agentsHook]);

  const handleCreateMission = useCallback(() => {
    const mission = missionsHook.createMission(newMission.objective, newMission.priority, newMission.assigned_to);
    if (mission) {
      setNewMission({ objective: '', priority: 'medium', assigned_to: [] });
      setCreateMissionModalVisible(false);
    }
  }, [newMission, missionsHook]);

  const handleAddTeamAgent = useCallback(() => {
    const agent: TeamAgent = {
      id: generateId(),
      name: `Agent ${newTeamConfig.agents.length + 1}`,
      role: `role_${newTeamConfig.agents.length + 1}`,
      agent_id: '',
      enabled: true,
    };
    setNewTeamConfig(prev => ({ ...prev, agents: [...prev.agents, agent] }));
  }, [newTeamConfig.agents.length]);

  const handleRemoveTeamAgent = useCallback((agentId: string) => {
    setNewTeamConfig(prev => ({ ...prev, agents: prev.agents.filter(a => a.id !== agentId) }));
  }, []);

  const handleUpdateTeamAgent = useCallback((agentId: string, field: string, value: any) => {
    setNewTeamConfig(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === agentId ? { ...a, [field]: value } : a),
    }));
  }, []);

  const handleCreateTeam = useCallback(async () => {
    const ok = await teamsHook.createTeam(newTeamConfig);
    if (ok) {
      setNewTeamConfig({ name: '', description: '', agents: [] });
      setTeamDrawerVisible(false);
    }
  }, [newTeamConfig, teamsHook]);

  const handleCreateWorkflowTask = useCallback(async () => {
    const ok = await workflowHook.createTask(newTaskConfig);
    if (ok) {
      setNewTaskConfig({ name: '', description: '', workflow_type: 'sequential', steps: [], team_id: undefined });
      setCreateTaskModalVisible(false);
    }
  }, [newTaskConfig, workflowHook]);

  const handleAddStep = useCallback(() => {
    const step: WorkflowStep = {
      id: generateId(),
      name: `步骤 ${newTaskConfig.steps.length + 1}`,
      step_type: 'agent',
      config: {},
    };
    setNewTaskConfig(prev => ({ ...prev, steps: [...prev.steps, step] }));
  }, [newTaskConfig.steps.length]);

  const handleRemoveStep = useCallback((stepId: string) => {
    setNewTaskConfig(prev => ({ ...prev, steps: prev.steps.filter(s => s.id !== stepId) }));
  }, []);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setNewTaskConfig(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    }));
  }, []);

  const handleOpenStepDrawer = useCallback((step?: WorkflowStep) => {
    setEditingStep(step || null);
    setStepDrawerVisible(true);
  }, []);

  const handleSaveStep = useCallback(() => {
    if (!editingStep) return;
    handleUpdateStep(editingStep.id, editingStep);
    setStepDrawerVisible(false);
    setEditingStep(null);
  }, [editingStep, handleUpdateStep]);

  const handleMoveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    const idx = newTaskConfig.steps.findIndex(s => s.id === stepId);
    if (direction === 'up' && idx > 0) {
      const newSteps = [...newTaskConfig.steps];
      [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]];
      setNewTaskConfig(prev => ({ ...prev, steps: newSteps }));
    } else if (direction === 'down' && idx < newTaskConfig.steps.length - 1) {
      const newSteps = [...newTaskConfig.steps];
      [newSteps[idx], newSteps[idx + 1]] = [newSteps[idx + 1], newSteps[idx]];
      setNewTaskConfig(prev => ({ ...prev, steps: newSteps }));
    }
  }, [newTaskConfig.steps]);

  const handleUpdateLlm = useCallback((role: string, field: 'provider' | 'model', value: string) => {
    if (field === 'provider') {
      const models = getModelsByProvider(value);
      setAgentCapabilities(prev => ({
        ...prev,
        [role]: { ...prev[role], llm: { provider: value, model: models[0]?.value || '' } },
      }));
    } else {
      setAgentCapabilities(prev => ({
        ...prev,
        [role]: { ...prev[role], llm: { ...prev[role].llm, [field]: value } },
      }));
    }
  }, []);

  const handleUpdateAgentCapability = useCallback((role: string, updates: Partial<AgentCapability>) => {
    setAgentCapabilities(prev => ({
      ...prev,
      [role]: { ...prev[role], ...updates },
    }));
  }, []);

  const handleSaveAgentCapability = useCallback((role: string) => {
    const agent = agentsHook.agents.find(a => a.role === role);
    message.success(`${agent?.name || role} 配置已保存`);
  }, [agentsHook.agents]);

  const handleAddConditionRule = useCallback(() => {
    const rule: ConditionRule = {
      id: generateId(),
      field: '',
      operator: '==',
      value: '',
    };
    setConditionRules(prev => [...prev, rule]);
  }, []);

  const handleUpdateConditionRule = useCallback((id: string, updates: Partial<ConditionRule>) => {
    setConditionRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const handleRemoveConditionRule = useCallback((id: string) => {
    setConditionRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleOpenConditionDrawer = useCallback((rule?: ConditionRule) => {
    setEditingCondition(rule || null);
    setConditionDrawerVisible(true);
  }, []);

  const handleSaveConditionRule = useCallback(() => {
    if (!editingCondition) return;
    if (conditionRules.find(r => r.id === editingCondition.id)) {
      handleUpdateConditionRule(editingCondition.id, editingCondition);
    } else {
      setConditionRules(prev => [...prev, { ...editingCondition, id: editingCondition.id || generateId() }]);
    }
    setConditionDrawerVisible(false);
    setEditingCondition(null);
  }, [editingCondition, conditionRules, handleUpdateConditionRule]);

  // ==================== Render ====================

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#0a0e17', padding: 0, color: '#e0e6ed' }}>
      <PageHeader
        teamName={teamName}
        onTeamNameChange={setTeamName}
        onSimulate={handleSimulate}
        onCreateMission={() => setCreateMissionModalVisible(true)}
        runningSimulation={runningSimulation}
      />

      <StatsCards
        totalAgents={totalAgents}
        onlineAgents={onlineAgents}
        runningMissions={runningMissions}
        completedMissions={completedMissions}
        totalMissions={missionsHook.missions.length}
      />

      <div style={{ padding: '0 24px 24px' }}>
        <Tabs
          items={[
            // ==================== Agents Tab ====================
            {
              key: 'agents',
              label: <span><RobotOutlined /> 团队成员 ({totalAgents})</span>,
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {agentsHook.agents.map(agent => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onToggle={agentsHook.toggleAgent}
                          onConfig={setSelectedAgentRole}
                        />
                      ))}
                    </div>
                  </Col>
                  <Col xs={24} lg={8}>
                    <TeamChat
                      messages={messages}
                      inputValue={messageInput}
                      onInputChange={setMessageInput}
                      onSend={handleSendMessage}
                    />
                  </Col>
                </Row>
              ),
            },

            // ==================== Missions Tab ====================
            {
              key: 'missions',
              label: <span><ThunderboltOutlined /> 任务列表 ({missionsHook.missions.length})</span>,
              children: (
                <MissionTable
                  missions={missionsHook.missions}
                  agents={agentsHook.agents}
                  loading={missionsHook.loading}
                  onStart={handleStartMission}
                  onComplete={handleCompleteMission}
                  onDelete={missionsHook.deleteMission}
                />
              ),
            },

            // ==================== Team Config Tab ====================
            {
              key: 'team-config',
              label: <span><TeamOutlined /> 团队配置</span>,
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card
                      size="small"
                      title="📋 团队列表"
                      extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTeamDrawerVisible(true)}>新建团队</Button>}
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      {teamsHook.teams.length === 0 ? (
                        <Empty description="暂无团队" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={teamsHook.teams}
                          renderItem={(team) => (
                            <List.Item
                              actions={[
                                <Button key="view" type="link" size="small">查看</Button>,
                              ]}
                            >
                              <List.Item.Meta
                                title={<Text style={{ color: '#e0e6ed' }}>{team.name}</Text>}
                                description={<Text style={{ color: '#888', fontSize: 11 }}>{team.description || '无描述'}</Text>}
                              />
                              <div><Tag>{team.agents.length} 个 Agent</Tag></div>
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card
                      size="small"
                      title="📊 团队统计"
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Text style={{ color: '#888', fontSize: 12 }}>团队数量</Text>
                          <div style={{ color: '#00d4ff', fontSize: 20 }}>{teamsHook.teams.length}</div>
                        </Col>
                        <Col span={12}>
                          <Text style={{ color: '#888', fontSize: 12 }}>总 Agent 数</Text>
                          <div style={{ color: '#00ff88', fontSize: 20 }}>
                            {teamsHook.teams.reduce((acc, t) => acc + t.agents.length, 0)}
                          </div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '12px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
                      <Text style={{ color: '#888', fontSize: 12 }}>团队角色分布</Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {Object.entries(
                          teamsHook.teams.flatMap(t => t.agents).reduce((acc: Record<string, number>, a) => {
                            acc[a.role] = (acc[a.role] || 0) + 1;
                            return acc;
                          }, {})
                        ).slice(0, 5).map(([role, count]) => (
                          <Tag key={role} color="blue">{role}: {count}</Tag>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },

            // ==================== Workflow Orchestration Tab ====================
            {
              key: 'workflow',
              label: <span><ShareAltOutlined /> 工作流编排</span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Select style={{ width: 150 }} placeholder="筛选团队" allowClear />
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTaskModalVisible(true)}>
                      创建工作流
                    </Button>
                  </div>
                  <WorkflowTaskTable
                    tasks={workflowHook.tasks}
                    loading={workflowHook.loading}
                    onExecute={workflowHook.executeWorkflow}
                    onStop={workflowHook.stopTask}
                  />
                </div>
              ),
            },

            // ==================== Task Monitor Tab ====================
            {
              key: 'monitor',
              label: <span><MonitorOutlined /> 任务监控</span>,
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <Card size="small" title="📈 执行中的任务" style={{ background: 'rgba(0, 20, 40, 0.6)' }}>
                      {workflowHook.tasks.filter(t => t.status === 'running').length === 0 ? (
                        <Empty description="暂无运行中的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={workflowHook.tasks.filter(t => t.status === 'running')}
                          renderItem={(task) => (
                            <List.Item>
                              <List.Item.Meta
                                title={<Space>
                                  <Text style={{ color: '#e0e6ed' }}>{task.name}</Text>
                                  <Tag color="blue">{task.workflow_type}</Tag>
                                </Space>}
                                description={
                                  <Space direction="vertical" size={4}>
                                    <Progress percent={task.progress} size="small" strokeColor="#00d4ff" />
                                    <Text style={{ color: '#888', fontSize: 11 }}>{task.steps.length} 个步骤</Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                    <Card size="small" title="📋 任务历史" style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}>
                      {workflowHook.tasks.filter(t => ['completed', 'failed'].includes(t.status)).length === 0 ? (
                        <Empty description="暂无任务历史" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={workflowHook.tasks.filter(t => ['completed', 'failed'].includes(t.status))}
                          renderItem={(task) => (
                            <List.Item>
                              <List.Item.Meta
                                title={<Space>
                                  <Text style={{ color: '#e0e6ed' }}>{task.name}</Text>
                                  <Tag color={task.status === 'completed' ? 'green' : 'red'}>{task.status}</Tag>
                                </Space>}
                                description={
                                  task.error ? (
                                    <Text style={{ color: '#ff4757', fontSize: 11 }}>{task.error}</Text>
                                  ) : (
                                    <Text style={{ color: '#888', fontSize: 11 }}>{task.steps.length} 个步骤 · {task.progress}% 完成</Text>
                                  )
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card size="small" title="📊 实时统计" style={{ background: 'rgba(0, 20, 40, 0.6)' }}>
                      <Row gutter={[16, 16]}>
                        {[
                          { label: '运行中', value: workflowHook.tasks.filter(t => t.status === 'running').length, color: '#00d4ff' },
                          { label: '已完成', value: workflowHook.tasks.filter(t => t.status === 'completed').length, color: '#00ff88' },
                          { label: '待执行', value: workflowHook.tasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
                          { label: '失败', value: workflowHook.tasks.filter(t => t.status === 'failed').length, color: '#ff4757' },
                        ].map(item => (
                          <Col key={item.label} span={12}>
                            <Text style={{ color: '#888', fontSize: 11 }}>{item.label}</Text>
                            <div style={{ color: item.color, fontSize: 20 }}>{item.value}</div>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                    <Card size="small" title="💡 工作流类型说明" style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { emoji: '🔄', label: '顺序执行', desc: '按步骤顺序依次执行' },
                          { emoji: '⚡', label: '并行执行', desc: '所有步骤同时执行' },
                          { emoji: '🔀', label: '条件执行', desc: '根据条件决定是否执行' },
                        ].map(item => (
                          <div key={item.label}>
                            <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>{item.emoji} {item.label}</Text>
                            <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>{item.desc}</Text>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },

            // ==================== Agent Capability Tab ====================
            {
              key: 'agent-capability',
              label: <span><SettingOutlined /> Agent 能力</span>,
              children: (
                <AgentCapabilityPanel
                  agents={agentsHook.agents}
                  selectedRole={selectedAgentRole}
                  capabilities={agentCapabilities}
                  onSelectRole={setSelectedAgentRole}
                  onUpdateLlm={handleUpdateLlm}
                  onUpdateCapability={handleUpdateAgentCapability}
                  onSave={handleSaveAgentCapability}
                />
              ),
            },

            // ==================== Task Orchestration Tab ====================
            {
              key: 'task-orchestration',
              label: <span><BranchesOutlined /> 任务编排</span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tabs
                      activeKey={orchestrationActiveTab}
                      onChange={setOrchestrationActiveTab}
                      items={[
                        { key: 'steps', label: '📝 步骤编排' },
                        { key: 'conditions', label: '🔀 条件规则' },
                      ]}
                      style={{ marginBottom: 0 }}
                    />
                    <Space>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTaskModalVisible(true)}>
                        新建工作流
                      </Button>
                    </Space>
                  </div>

                  {orchestrationActiveTab === 'steps' && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={16}>
                        <Card
                          size="small"
                          title="🗺️ 工作流步骤（拖拽排序）"
                          style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                          extra={
                            <Space>
                              <Select
                                style={{ width: 150 }}
                                placeholder="执行类型"
                                value={newTaskConfig.workflow_type}
                                onChange={v => setNewTaskConfig(prev => ({ ...prev, workflow_type: v }))}
                                options={WORKFLOW_TYPE_OPTIONS}
                              />
                              <Button size="small" icon={<PlusOutlined />} onClick={handleAddStep}>添加步骤</Button>
                            </Space>
                          }
                        >
                          {newTaskConfig.steps.length === 0 ? (
                            <Empty description="暂无步骤，点击添加开始编排" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          ) : (
                            newTaskConfig.steps.map((step, idx) => (
                              <StepCard
                                key={step.id}
                                step={step}
                                index={idx}
                                isFirst={idx === 0}
                                isLast={idx === newTaskConfig.steps.length - 1}
                                allAgents={agentsHook.agents}
                                onEdit={() => handleOpenStepDrawer(step)}
                                onDelete={() => handleRemoveStep(step.id)}
                                onMoveUp={() => handleMoveStep(step.id, 'up')}
                                onMoveDown={() => handleMoveStep(step.id, 'down')}
                              />
                            ))
                          )}
                        </Card>
                        {newTaskConfig.workflow_type === 'conditional' && (
                          <Card
                            size="small"
                            title="🔀 条件表达式"
                            style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}
                            extra={<Button size="small" icon={<PlusOutlined />} onClick={handleAddConditionRule}>添加规则</Button>}
                          >
                            {conditionRules.length === 0 ? (
                              <Empty description="条件执行模式：点击添加条件规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                              <List
                                dataSource={conditionRules}
                                renderItem={(rule) => (
                                  <List.Item
                                    actions={[
                                      <Button key="edit" type="link" size="small" onClick={() => handleOpenConditionDrawer(rule)}>编辑</Button>,
                                      <Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveConditionRule(rule.id)} />,
                                    ]}
                                  >
                                    <List.Item.Meta
                                      title={<Text style={{ color: '#e0e6ed' }}>{rule.field || '未设置字段'} {rule.operator} {rule.value || '?'}</Text>}
                                      description={
                                        <Space>
                                          {rule.thenAgentId && <Tag color="green">then: {agentsHook.agents.find(a => a.id === rule.thenAgentId)?.name || rule.thenAgentId}</Tag>}
                                          {rule.elseAgentId && <Tag color="red">else: {agentsHook.agents.find(a => a.id === rule.elseAgentId)?.name || rule.elseAgentId}</Tag>}
                                        </Space>
                                      }
                                    />
                                  </List.Item>
                                )}
                              />
                            )}
                          </Card>
                        )}
                      </Col>
                      <Col xs={24} lg={8}>
                        <Card size="small" title="🤖 Agent 选择器" style={{ background: 'rgba(0, 20, 40, 0.6)' }}>
                          <List
                            dataSource={agentsHook.agents.filter(a => a.enabled)}
                            renderItem={(agent) => (
                              <List.Item>
                                <List.Item.Meta
                                  avatar={
                                    <Avatar
                                      size="small"
                                      style={{ background: agent.color + '20', border: `1px solid ${agent.color}`, color: agent.color }}
                                      icon={agent.icon}
                                    />
                                  }
                                  title={<Text style={{ color: '#e0e6ed', fontSize: 12 }}>{agent.name}</Text>}
                                  description={<Text style={{ color: '#888', fontSize: 10 }}>{agent.role}</Text>}
                                />
                              </List.Item>
                            )}
                          />
                        </Card>
                        <Card size="small" title="📊 当前工作流信息" style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}>
                          <Row gutter={[8, 8]}>
                            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>执行类型</Text></Col>
                            <Col span={12}><Tag>{WORKFLOW_TYPE_OPTIONS.find(o => o.value === newTaskConfig.workflow_type)?.label || newTaskConfig.workflow_type}</Tag></Col>
                            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>步骤数量</Text></Col>
                            <Col span={12}><Text style={{ color: '#00d4ff', fontSize: 12 }}>{newTaskConfig.steps.length}</Text></Col>
                            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>任务名称</Text></Col>
                            <Col span={12}><Text style={{ color: '#e0e6ed', fontSize: 12 }}>{newTaskConfig.name || '未命名'}</Text></Col>
                            <Col span={12}><Text style={{ color: '#888', fontSize: 11 }}>条件规则</Text></Col>
                            <Col span={12}><Text style={{ color: '#f59e0b', fontSize: 12 }}>{conditionRules.length} 条</Text></Col>
                          </Row>
                          <Divider style={{ margin: '8px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
                          <Button
                            type="primary"
                            block
                            onClick={handleCreateWorkflowTask}
                            disabled={!newTaskConfig.name || newTaskConfig.steps.length === 0}
                          >
                            保存工作流
                          </Button>
                        </Card>
                        <Card size="small" title="💡 编排提示" style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <Text style={{ color: '#888', fontSize: 11 }}>• 顺序执行：步骤按编号顺序执行</Text>
                            <Text style={{ color: '#888', fontSize: 11 }}>• 并行执行：所有步骤同时触发</Text>
                            <Text style={{ color: '#888', fontSize: 11 }}>• 条件执行：根据规则选择分支</Text>
                            <Text style={{ color: '#888', fontSize: 11 }}>• 拖拽步骤可调整执行顺序</Text>
                            <Text style={{ color: '#888', fontSize: 11 }}>• Agent 步骤需指定执行 Agent</Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {orchestrationActiveTab === 'conditions' && (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={16}>
                        <Card
                          size="small"
                          title="🔀 条件规则列表"
                          style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                          extra={
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleOpenConditionDrawer({ id: generateId(), field: '', operator: '==', value: '' })}
                            >
                              添加规则
                            </Button>
                          }
                        >
                          {conditionRules.length === 0 ? (
                            <Empty description="暂无条件规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          ) : (
                            <List
                              dataSource={conditionRules}
                              renderItem={(rule) => (
                                <List.Item
                                  actions={[
                                    <Button key="edit" type="link" size="small" onClick={() => handleOpenConditionDrawer(rule)}>编辑</Button>,
                                    <Button key="del" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveConditionRule(rule.id)} />,
                                  ]}
                                >
                                  <List.Item.Meta
                                    title={<Space>
                                      <Tag>{rule.field || '?'}</Tag>
                                      <Tag color="blue">{rule.operator}</Tag>
                                      <Tag>{rule.value || '?'}</Tag>
                                    </Space>}
                                    description={
                                      <Space size={4}>
                                        <Text style={{ color: '#888', fontSize: 11 }}>then:</Text>
                                        <Tag color="green" style={{ margin: 0 }}>
                                          {rule.thenAgentId ? agentsHook.agents.find(a => a.id === rule.thenAgentId)?.name : '未指定'}
                                        </Tag>
                                        <Text style={{ color: '#888', fontSize: 11 }}>else:</Text>
                                        <Tag color="red" style={{ margin: 0 }}>
                                          {rule.elseAgentId ? agentsHook.agents.find(a => a.id === rule.elseAgentId)?.name : '未指定'}
                                        </Tag>
                                      </Space>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                          )}
                        </Card>
                      </Col>
                      <Col xs={24} lg={8}>
                        <Card size="small" title="📖 条件表达式语法" style={{ background: 'rgba(0, 20, 40, 0.6)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                              <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>字段 (field)</Text>
                              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>任务属性，如: status, progress, result</Text>
                            </div>
                            <div>
                              <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>操作符</Text>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains'].map(op => (
                                  <Tag key={op} style={{ fontSize: 10 }}>{op}</Tag>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>示例</Text>
                              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>{`status == 'completed'`}</Text>
                              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>{`progress > 50`}</Text>
                              <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>{`result contains 'success'`}</Text>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  )}
                </div>
              ),
            },

            // ==================== Collaboration Protocol Tab ====================
            {
              key: 'protocol-config',
              label: <span><ExperimentOutlined /> 协商协议</span>,
              children: (
                <ProtocolConfig
                  config={collabHook.collaborationConfig}
                  onModeChange={collabHook.setMode}
                  onFileBaseDirChange={collabHook.setFileBaseDir}
                  onWsEndpointChange={collabHook.setWsEndpoint}
                  onSave={collabHook.saveConfig}
                />
              ),
            },
          ]}
        />
      </div>

      {/* ==================== Modals ==================== */}

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
            options={agentsHook.agents.filter(a => a.enabled).map(a => ({ value: a.role, label: a.name }))}
          />
        </div>
      </Modal>

      {/* Create Team Drawer */}
      <Drawer
        title="创建新团队"
        placement="right"
        width={480}
        open={teamDrawerVisible}
        onClose={() => setTeamDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setTeamDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleCreateTeam}>创建</Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>团队名称</Text>
          <Input
            style={inputStyle}
            value={newTeamConfig.name}
            onChange={e => setNewTeamConfig({ ...newTeamConfig, name: e.target.value })}
            placeholder="输入团队名称"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>团队描述</Text>
          <TextArea
            style={{ ...inputStyle, resize: 'none' }}
            rows={2}
            value={newTeamConfig.description}
            onChange={e => setNewTeamConfig({ ...newTeamConfig, description: e.target.value })}
            placeholder="描述团队职责"
          />
        </div>
        <Divider style={{ margin: '16px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#e0e6ed' }}>团队成员</Text>
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddTeamAgent}>添加成员</Button>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {newTeamConfig.agents.map(agent => (
            <Card key={agent.id} size="small" style={{ marginBottom: 8, background: 'rgba(0, 20, 40, 0.4)' }}>
              <Row gutter={[8, 8]} align="middle">
                <Col span={8}>
                  <Input
                    style={inputStyle}
                    size="small"
                    placeholder="名称"
                    value={agent.name}
                    onChange={e => handleUpdateTeamAgent(agent.id, 'name', e.target.value)}
                  />
                </Col>
                <Col span={10}>
                  <Input
                    style={inputStyle}
                    size="small"
                    placeholder="Agent ID"
                    value={agent.agent_id}
                    onChange={e => handleUpdateTeamAgent(agent.id, 'agent_id', e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Switch size="small" checked={agent.enabled} onChange={() => handleUpdateTeamAgent(agent.id, 'enabled', true)} />
                </Col>
                <Col span={2}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveTeamAgent(agent.id)}
                  />
                </Col>
              </Row>
            </Card>
          ))}
          {newTeamConfig.agents.length === 0 && (
            <Empty description="点击添加成员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </Drawer>

      {/* Create Workflow Task Modal */}
      <Modal
        title="创建工作流任务"
        open={createTaskModalVisible}
        onCancel={() => setCreateTaskModalVisible(false)}
        onOk={handleCreateWorkflowTask}
        okText="创建"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>任务名称</Text>
          <Input
            style={inputStyle}
            value={newTaskConfig.name}
            onChange={e => setNewTaskConfig({ ...newTaskConfig, name: e.target.value })}
            placeholder="输入任务名称"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>任务描述</Text>
          <TextArea
            style={{ ...inputStyle, resize: 'none' }}
            rows={2}
            value={newTaskConfig.description}
            onChange={e => setNewTaskConfig({ ...newTaskConfig, description: e.target.value })}
            placeholder="描述任务内容"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>执行类型</Text>
          <Select
            style={{ width: '100%' }}
            value={newTaskConfig.workflow_type}
            onChange={v => setNewTaskConfig({ ...newTaskConfig, workflow_type: v })}
            options={WORKFLOW_TYPE_OPTIONS}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#888', fontSize: 12 }}>工作流步骤</Text>
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddStep}>添加步骤</Button>
          </div>
          <div style={{ maxHeight: 250, overflow: 'auto' }}>
            {newTaskConfig.steps.map((step, idx) => (
              <Card key={step.id} size="small" style={{ marginBottom: 8, background: 'rgba(0, 20, 40, 0.4)' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Tag icon={<ArrowRightOutlined />}>{idx + 1}</Tag>
                    <Text style={{ color: '#e0e6ed' }}>{step.name}</Text>
                    <Tag>{step.step_type}</Tag>
                  </Space>
                  <Space>
                    <Button size="small" type="link" onClick={() => handleOpenStepDrawer(step)}>编辑</Button>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveStep(step.id)} />
                  </Space>
                </Space>
              </Card>
            ))}
            {newTaskConfig.steps.length === 0 && (
              <Empty description="点击添加步骤" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>
        <div>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>所属团队 (可选)</Text>
          <Select
            style={{ width: '100%' }}
            placeholder="选择团队"
            allowClear
            value={newTaskConfig.team_id}
            onChange={v => setNewTaskConfig({ ...newTaskConfig, team_id: v })}
            options={teamsHook.teams.map(t => ({ value: t.team_id, label: t.name }))}
          />
        </div>
      </Modal>

      {/* Edit Step Drawer */}
      <Drawer
        title={`编辑步骤: ${editingStep?.name || ''}`}
        placement="right"
        width={400}
        open={stepDrawerVisible}
        onClose={() => { setStepDrawerVisible(false); setEditingStep(null); }}
        extra={
          <Space>
            <Button onClick={() => { setStepDrawerVisible(false); setEditingStep(null); }}>取消</Button>
            <Button type="primary" onClick={handleSaveStep}>保存</Button>
          </Space>
        }
      >
        {editingStep && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>步骤名称</Text>
              <Input
                style={inputStyle}
                value={editingStep.name}
                onChange={e => setEditingStep({ ...editingStep, name: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>步骤类型</Text>
              <Select
                style={{ width: '100%' }}
                value={editingStep.step_type}
                onChange={v => setEditingStep({ ...editingStep, step_type: v })}
                options={STEP_TYPE_OPTIONS}
              />
            </div>
            {editingStep.step_type === 'agent' && (
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>选择 Agent</Text>
                <Select
                  style={{ width: '100%' }}
                  value={editingStep.agent_id}
                  onChange={v => setEditingStep({ ...editingStep, agent_id: v })}
                  options={agentsHook.agents.filter(a => a.enabled).map(a => ({ value: a.id, label: `${a.name} (${a.role})` }))}
                  placeholder="选择执行 Agent"
                />
              </div>
            )}
            {editingStep.step_type === 'tool' && (
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>工具名称</Text>
                <Input
                  style={inputStyle}
                  value={editingStep.config?.tool_name || ''}
                  onChange={e => setEditingStep({ ...editingStep, config: { ...editingStep.config, tool_name: e.target.value } })}
                  placeholder="输入工具名称"
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>配置 (JSON)</Text>
              <TextArea
                style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace' }}
                rows={3}
                value={JSON.stringify(editingStep.config || {}, null, 2)}
                onChange={e => {
                  try { setEditingStep({ ...editingStep, config: JSON.parse(e.target.value) }); } catch {}
                }}
                placeholder="{}"
              />
            </div>
          </>
        )}
      </Drawer>

      {/* Condition Rule Drawer */}
      <Drawer
        title="编辑条件规则"
        placement="right"
        width={400}
        open={conditionDrawerVisible}
        onClose={() => { setConditionDrawerVisible(false); setEditingCondition(null); }}
        extra={
          <Space>
            <Button onClick={() => { setConditionDrawerVisible(false); setEditingCondition(null); }}>取消</Button>
            <Button type="primary" onClick={handleSaveConditionRule}>保存</Button>
          </Space>
        }
      >
        {editingCondition && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>字段 (field)</Text>
              <Input
                style={inputStyle}
                value={editingCondition.field}
                onChange={e => setEditingCondition({ ...editingCondition, field: e.target.value })}
                placeholder="如: status, progress, result"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>操作符</Text>
              <Select
                style={{ width: '100%' }}
                value={editingCondition.operator}
                onChange={v => setEditingCondition({ ...editingCondition, operator: v })}
                options={[
                  { value: '==', label: '== 等于' },
                  { value: '!=', label: '!= 不等于' },
                  { value: '>', label: '> 大于' },
                  { value: '<', label: '< 小于' },
                  { value: '>=', label: '>= 大于等于' },
                  { value: '<=', label: '<= 小于等于' },
                  { value: 'contains', label: 'contains 包含' },
                  { value: 'not_contains', label: 'not_contains 不包含' },
                ]}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>值 (value)</Text>
              <Input
                style={inputStyle}
                value={editingCondition.value}
                onChange={e => setEditingCondition({ ...editingCondition, value: e.target.value })}
                placeholder="如: completed, 50, success"
              />
            </div>
            <Divider style={{ margin: '12px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>条件为真时执行 (then)</Text>
              <Select
                style={{ width: '100%' }}
                value={editingCondition.thenAgentId}
                onChange={v => setEditingCondition({ ...editingCondition, thenAgentId: v })}
                options={agentsHook.agents.filter(a => a.enabled).map(a => ({ value: a.id, label: `${a.name} (${a.role})` }))}
                placeholder="选择 Agent (then 分支)"
                allowClear
              />
            </div>
            <div>
              <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>条件为假时执行 (else)</Text>
              <Select
                style={{ width: '100%' }}
                value={editingCondition.elseAgentId}
                onChange={v => setEditingCondition({ ...editingCondition, elseAgentId: v })}
                options={agentsHook.agents.filter(a => a.enabled).map(a => ({ value: a.id, label: `${a.name} (${a.role})` }))}
                placeholder="选择 Agent (else 分支)"
                allowClear
              />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default MultiAgentPage;
