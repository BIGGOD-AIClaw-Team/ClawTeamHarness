// ==================== Types ====================

export interface AgentRole {
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

export interface Mission {
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

export interface TeamEvent {
  event_id: string;
  event_type: 'mission_assigned' | 'mission_completed' | 'agent_status_change' | 'message';
  source_agent: string;
  data: any;
  timestamp: string;
  mission_id?: string;
}

export interface TeamAgent {
  id: string;
  name: string;
  role: string;
  agent_id: string;
  enabled: boolean;
}

export interface Team {
  team_id: string;
  name: string;
  description: string;
  agents: TeamAgent[];
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  step_type: 'agent' | 'tool' | 'condition' | 'input' | 'output';
  agent_id?: string;
  config: Record<string, any>;
}

export interface WorkflowTask {
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

export interface AgentCapability {
  llm: { provider: string; model: string };
  skills: string[];
  tools: string[];
  prompt: string;
}

export interface CollaborationConfig {
  mode: 'file' | 'protocol' | 'hybrid';
  fileBaseDir: string;
  wsEndpoint: string;
}

export interface ConditionRule {
  id: string;
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains';
  value: string;
  thenAgentId?: string;
  elseAgentId?: string;
}

// State types
export interface AgentsState {
  agents: AgentRole[];
  loading: boolean;
  error: string | null;
}

export interface MissionsState {
  missions: Mission[];
  loading: boolean;
  error: string | null;
}

export interface WorkflowsState {
  tasks: WorkflowTask[];
  loading: boolean;
  error: string | null;
}

export interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}
