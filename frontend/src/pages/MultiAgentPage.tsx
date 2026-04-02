import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Button, Space, Typography, Tag, Select, Input, Modal, message,
  Avatar, Timeline, Statistic, Row, Col, Popconfirm, Table, Empty, Badge,
  Tooltip, Switch, Progress, Drawer, List, Divider, Alert, InputNumber,
} from 'antd';
import {
  TeamOutlined, RobotOutlined, SendOutlined, PlusOutlined, DeleteOutlined,
  PlayCircleOutlined, StopOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SyncOutlined,
  MessageOutlined, EyeOutlined, ThunderboltOutlined, AimOutlined,
  AlertOutlined, PlusCircleOutlined, SettingOutlined, WorkflowOutlined,
  MonitorOutlined, BarChartOutlined, ArrowRightOutlined,
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

// Team & Workflow types
interface TeamAgent {
  id: string;
  name: string;
  role: string;
  agent_id: string;
  enabled: boolean;
}

interface Team {
  team_id: string;
  name: string;
  description: string;
  agents: TeamAgent[];
  created_at: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  step_type: 'agent' | 'tool' | 'condition' | 'input' | 'output';
  agent_id?: string;
  config: Record<string, any>;
}

interface WorkflowTask {
  task_id: string;
  name: string;
  description: string;
  workflow_type: 'sequential' | 'parallel' | 'conditional';
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
  created_at: string;
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

// ==================== API ====================

const API_BASE = '/api';

const api = {
  async createTeam(data: any) {
    const res = await fetch(`${API_BASE}/teams/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getTeams() {
    const res = await fetch(`${API_BASE}/teams`);
    return res.json();
  },

  async getTeam(teamId: string) {
    const res = await fetch(`${API_BASE}/teams/teams/${teamId}`);
    return res.json();
  },

  async createTask(data: any) {
    const res = await fetch(`${API_BASE}/teams/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getTasks(params?: { team_id?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/teams/tasks${query ? `?${query}` : ''}`);
    return res.json();
  },

  async getTaskStatus(taskId: string) {
    const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/status`);
    return res.json();
  },

  async executeWorkflow(taskId: string) {
    const res = await fetch(`${API_BASE}/teams/tasks/${taskId}/execute`, { method: 'POST' });
    return res.json();
  },
};

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

const WORKFLOW_TYPE_OPTIONS = [
  { value: 'sequential', label: '🔄 顺序执行' },
  { value: 'parallel', label: '⚡ 并行执行' },
  { value: 'conditional', label: '🔀 条件执行' },
];

const STEP_TYPE_OPTIONS = [
  { value: 'agent', label: '🤖 Agent' },
  { value: 'tool', label: '🛠️ 工具' },
  { value: 'condition', label: '❓ 条件' },
  { value: 'input', label: '📥 输入' },
  { value: 'output', label: '📤 输出' },
];

// ==================== Main Component ====================

export function MultiAgentPage() {
  // ==================== State ====================
  const [agents, setAgents] = useState<AgentRole[]>(PRESET_ROLES);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [createMissionModalVisible, setCreateMissionModalVisible] = useState(false);
  const [newMission, setNewMission] = useState({ objective: '', priority: 'medium' as Mission['priority'], assigned_to: [] as string[] });
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [teamName, setTeamName] = useState('🚀 我的 Agent 团队');
  const [runningSimulation, setRunningSimulation] = useState(false);

  // Team Config State
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamDrawerVisible, setTeamDrawerVisible] = useState(false);
  const [newTeamConfig, setNewTeamConfig] = useState({ name: '', description: '', agents: [] as TeamAgent[] });

  // Workflow State
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([]);
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [newTaskConfig, setNewTaskConfig] = useState({
    name: '',
    description: '',
    workflow_type: 'sequential' as WorkflowTask['workflow_type'],
    steps: [] as WorkflowStep[],
    team_id: undefined as string | undefined,
  });
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepDrawerVisible, setStepDrawerVisible] = useState(false);

  // Task Monitor State
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Statistics
  const totalAgents = agents.filter(a => a.enabled).length;
  const onlineAgents = agents.filter(a => a.enabled && a.status !== 'offline').length;
  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const runningMissions = missions.filter(m => m.status === 'running').length;

  // ==================== Effects ====================

  // Load initial data
  useEffect(() => {
    loadTeams();
    loadWorkflowTasks();
  }, []);

  // Poll running tasks
  useEffect(() => {
    const runningTasks = workflowTasks.filter(t => t.status === 'running');
    if (runningTasks.length === 0) return;

    const interval = setInterval(() => {
      runningTasks.forEach(task => {
        api.getTaskStatus(task.task_id).then(res => {
          if (res.code === 0) {
            const { status, progress, error } = res.data;
            setWorkflowTasks(prev => prev.map(t =>
              t.task_id === task.task_id ? { ...t, status, progress, error } : t
            ));
          }
        });
      });
    }, 2000);

    setPollingInterval(interval);
    return () => clearInterval(interval);
  }, [workflowTasks.filter(t => t.status === 'running').length]);

  // ==================== Data Loading ====================

  const loadTeams = async () => {
    try {
      const res = await api.getTeams();
      if (res.code === 0) setTeams(res.data || []);
    } catch (e) {
      console.error('Failed to load teams:', e);
    }
  };

  const loadWorkflowTasks = async () => {
    try {
      const res = await api.getTasks();
      if (res.code === 0) {
        setWorkflowTasks(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  // ==================== Mission Handlers ====================

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

  const handleToggleAgent = (agentId: string) => {
    setAgents(agents.map(a => a.id === agentId ? {
      ...a, enabled: !a.enabled, status: !a.enabled ? 'idle' : 'offline'
    } : a));
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    const msg = { id: generateId(), sender: 'user', text: messageInput, time: formatTime(new Date()) };
    setMessages([...messages, msg]);
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
  };

  const handleSimulate = () => {
    if (runningSimulation) return;
    setRunningSimulation(true);

    const pendingMission = missions.find(m => m.status === 'pending');
    if (pendingMission) {
      handleStartMission(pendingMission.id);
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

  const handleDeleteMission = (missionId: string) => {
    setMissions(missions.filter(m => m.id !== missionId));
  };

  // ==================== Team Config Handlers ====================

  const handleCreateTeam = async () => {
    if (!newTeamConfig.name) {
      message.warning('请输入团队名称');
      return;
    }
    try {
      const res = await api.createTeam(newTeamConfig);
      if (res.code === 0) {
        message.success('团队创建成功');
        await loadTeams();
        setNewTeamConfig({ name: '', description: '', agents: [] });
        setTeamDrawerVisible(false);
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (e) {
      message.error('创建团队失败');
    }
  };

  const handleAddTeamAgent = () => {
    const agent: TeamAgent = {
      id: generateId(),
      name: `Agent ${newTeamConfig.agents.length + 1}`,
      role: `role_${newTeamConfig.agents.length + 1}`,
      agent_id: '',
      enabled: true,
    };
    setNewTeamConfig({ ...newTeamConfig, agents: [...newTeamConfig.agents, agent] });
  };

  const handleRemoveTeamAgent = (agentId: string) => {
    setNewTeamConfig({ ...newTeamConfig, agents: newTeamConfig.agents.filter(a => a.id !== agentId) });
  };

  const handleUpdateTeamAgent = (agentId: string, field: string, value: any) => {
    setNewTeamConfig({
      ...newTeamConfig,
      agents: newTeamConfig.agents.map(a => a.id === agentId ? { ...a, [field]: value } : a),
    });
  };

  // ==================== Workflow Task Handlers ====================

  const handleCreateWorkflowTask = async () => {
    if (!newTaskConfig.name) {
      message.warning('请输入任务名称');
      return;
    }
    try {
      const res = await api.createTask({
        name: newTaskConfig.name,
        description: newTaskConfig.description,
        workflow_type: newTaskConfig.workflow_type,
        steps: newTaskConfig.steps,
        team_id: newTaskConfig.team_id,
      });
      if (res.code === 0) {
        message.success('工作流任务创建成功');
        await loadWorkflowTasks();
        setNewTaskConfig({ name: '', description: '', workflow_type: 'sequential', steps: [], team_id: undefined });
        setCreateTaskModalVisible(false);
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (e) {
      message.error('创建工作流任务失败');
    }
  };

  const handleAddStep = () => {
    const step: WorkflowStep = {
      id: generateId(),
      name: `步骤 ${newTaskConfig.steps.length + 1}`,
      step_type: 'agent',
      config: {},
    };
    setNewTaskConfig({ ...newTaskConfig, steps: [...newTaskConfig.steps, step] });
  };

  const handleRemoveStep = (stepId: string) => {
    setNewTaskConfig({ ...newTaskConfig, steps: newTaskConfig.steps.filter(s => s.id !== stepId) });
  };

  const handleUpdateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setNewTaskConfig({
      ...newTaskConfig,
      steps: newTaskConfig.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    });
  };

  const handleOpenStepDrawer = (step?: WorkflowStep) => {
    setEditingStep(step || null);
    setStepDrawerVisible(true);
  };

  const handleSaveStep = () => {
    if (!editingStep) return;
    handleUpdateStep(editingStep.id, editingStep);
    setStepDrawerVisible(false);
    setEditingStep(null);
  };

  const handleExecuteWorkflow = async (taskId: string) => {
    try {
      const res = await api.executeWorkflow(taskId);
      if (res.code === 0) {
        message.success('工作流开始执行');
        await loadWorkflowTasks();
      } else {
        message.error(res.message || '执行失败');
      }
    } catch (e) {
      message.error('执行工作流失败');
    }
  };

  // ==================== Table Columns ====================

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

  // Workflow Task columns
  const workflowColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WorkflowTask) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: '#e0e6ed', fontWeight: 500 }}>{text}</Text>
          <Text style={{ color: '#666', fontSize: 11 }}>{record.description || '无描述'}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'workflow_type',
      key: 'workflow_type',
      width: 100,
      render: (type: string) => {
        const opt = WORKFLOW_TYPE_OPTIONS.find(o => o.value === type);
        return <Tag>{opt?.label || type}</Tag>;
      },
    },
    {
      title: '步骤',
      dataIndex: 'steps',
      key: 'steps',
      width: 80,
      render: (steps: WorkflowStep[]) => <Text style={{ color: '#888' }}>{steps.length} 步</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge
          status={status as any}
          text={<Text style={{ color: STATUS_COLORS[status], fontSize: 12 }}>{status}</Text>}
        />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: WorkflowTask) => (
        record.status === 'running' ? (
          <Progress percent={progress} size="small" strokeColor="#00d4ff" trailColor="rgba(0, 212, 255, 0.2)" />
        ) : (
          <Text style={{ color: '#888', fontSize: 12 }}>{progress}%</Text>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: WorkflowTask) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleExecuteWorkflow(record.task_id)}>
              执行
            </Button>
          )}
          {record.status === 'running' && (
            <Button size="small" danger icon={<StopOutlined />}>
              停止
            </Button>
          )}
          {record.status === 'failed' && record.error && (
            <Tooltip title={record.error}>
              <Button size="small" type="text" danger>查看错误</Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ==================== Render ====================

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
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card size="small" title="💬 团队对话" style={{ background: 'rgba(0, 20, 40, 0.6)', height: 400, display: 'flex', flexDirection: 'column' }}>
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
                  </Col>
                </Row>
              ),
            },

            // ==================== Missions Tab ====================
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
                      {teams.length === 0 ? (
                        <Empty description="暂无团队" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={teams}
                          renderItem={(team: Team) => (
                            <List.Item
                              actions={[
                                <Button key="view" type="link" size="small" onClick={() => { setSelectedTeam(team); }}>查看</Button>,
                              ]}
                            >
                              <List.Item.Meta
                                title={<Text style={{ color: '#e0e6ed' }}>{team.name}</Text>}
                                description={<Text style={{ color: '#888', fontSize: 11 }}>{team.description || '无描述'}</Text>}
                              />
                              <div>
                                <Tag>{team.agents.length} 个 Agent</Tag>
                              </div>
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
                          <Statistic title={<Text style={{ color: '#888' }}>团队数量</Text>} value={teams.length} valueStyle={{ color: '#00d4ff' }} />
                        </Col>
                        <Col span={12}>
                          <Statistic title={<Text style={{ color: '#888' }}>总 Agent 数</Text>} value={teams.reduce((acc, t) => acc + t.agents.length, 0)} valueStyle={{ color: '#00ff88' }} />
                        </Col>
                      </Row>
                      <Divider style={{ margin: '12px 0', borderColor: 'rgba(0, 212, 255, 0.1)' }} />
                      <div>
                        <Text style={{ color: '#888', fontSize: 12 }}>团队角色分布</Text>
                        <div style={{ marginTop: 8 }}>
                          {teams.flatMap(t => t.agents).reduce((acc: Record<string, number>, a) => {
                            acc[a.role] = (acc[a.role] || 0) + 1;
                            return acc;
                          }, {}) as Record<string, number> && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {Object.entries(teams.flatMap(t => t.agents).reduce((acc: Record<string, number>, a) => {
                                acc[a.role] = (acc[a.role] || 0) + 1;
                                return acc;
                              }, {})).slice(0, 5).map(([role, count]) => (
                                <Tag key={role} color="blue">{role}: {count}</Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },

            // ==================== Workflow Orchestration Tab ====================
            {
              key: 'workflow',
              label: <span><WorkflowOutlined /> 工作流编排</span>,
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Select
                        style={{ width: 150 }}
                        placeholder="筛选团队"
                        allowClear
                        onChange={(v) => loadWorkflowTasks()}
                      />
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTaskModalVisible(true)}>
                      创建工作流
                    </Button>
                  </div>
                  {workflowTasks.length === 0 ? (
                    <Empty description="暂无工作流任务" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                  ) : (
                    <Table
                      columns={workflowColumns}
                      dataSource={workflowTasks}
                      rowKey="task_id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      style={{ background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8 }}
                    />
                  )}
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
                    <Card
                      size="small"
                      title="📈 执行中的任务"
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      {workflowTasks.filter(t => t.status === 'running').length === 0 ? (
                        <Empty description="暂无运行中的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={workflowTasks.filter(t => t.status === 'running')}
                          renderItem={(task: WorkflowTask) => (
                            <List.Item>
                              <List.Item.Meta
                                title={<Space>
                                  <Text style={{ color: '#e0e6ed' }}>{task.name}</Text>
                                  <Tag color="blue">{task.workflow_type}</Tag>
                                </Space>}
                                description={
                                  <Space direction="vertical" size={4}>
                                    <Progress percent={task.progress} size="small" strokeColor="#00d4ff" />
                                    <Text style={{ color: '#888', fontSize: 11 }}>
                                      {task.steps.length} 个步骤
                                    </Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                    <Card
                      size="small"
                      title="📋 任务历史"
                      style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}
                    >
                      {workflowTasks.filter(t => ['completed', 'failed'].includes(t.status)).length === 0 ? (
                        <Empty description="暂无任务历史" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <List
                          dataSource={workflowTasks.filter(t => ['completed', 'failed'].includes(t.status))}
                          renderItem={(task: WorkflowTask) => (
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
                                    <Text style={{ color: '#888', fontSize: 11 }}>
                                      {task.steps.length} 个步骤 · {task.progress}% 完成
                                    </Text>
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
                    <Card
                      size="small"
                      title="📊 实时统计"
                      style={{ background: 'rgba(0, 20, 40, 0.6)' }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Statistic
                            title={<Text style={{ color: '#888', fontSize: 11 }}>运行中</Text>}
                            value={workflowTasks.filter(t => t.status === 'running').length}
                            valueStyle={{ color: '#00d4ff' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text style={{ color: '#888', fontSize: 11 }}>已完成</Text>}
                            value={workflowTasks.filter(t => t.status === 'completed').length}
                            valueStyle={{ color: '#00ff88' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text style={{ color: '#888', fontSize: 11 }}>待执行</Text>}
                            value={workflowTasks.filter(t => t.status === 'pending').length}
                            valueStyle={{ color: '#f59e0b' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<Text style={{ color: '#888', fontSize: 11 }}>失败</Text>}
                            value={workflowTasks.filter(t => t.status === 'failed').length}
                            valueStyle={{ color: '#ff4757' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                    <Card
                      size="small"
                      title="💡 工作流类型说明"
                      style={{ background: 'rgba(0, 20, 40, 0.6)', marginTop: 16 }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>🔄 顺序执行</Text>
                          <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>按步骤顺序依次执行</Text>
                        </div>
                        <div>
                          <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>⚡ 并行执行</Text>
                          <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>所有步骤同时执行</Text>
                        </div>
                        <div>
                          <Text strong style={{ color: '#e0e6ed', fontSize: 12 }}>🔀 条件执行</Text>
                          <Text style={{ color: '#888', fontSize: 11, display: 'block' }}>根据条件决定是否执行</Text>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>
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
            options={agents.filter(a => a.enabled).map(a => ({ value: a.role, label: `${a.name}` }))}
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
          {newTeamConfig.agents.map((agent, idx) => (
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
                  <Switch
                    size="small"
                    checked={agent.enabled}
                    onChange={(v) => handleUpdateTeamAgent(agent.id, 'enabled', v)}
                  />
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
            options={teams.map(t => ({ value: t.team_id, label: t.name }))}
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
                <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Agent ID</Text>
                <Input
                  style={inputStyle}
                  value={editingStep.agent_id || ''}
                  onChange={e => setEditingStep({ ...editingStep, agent_id: e.target.value })}
                  placeholder="输入 Agent ID"
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
          </>
        )}
      </Drawer>
    </div>
  );
}

export default MultiAgentPage;
