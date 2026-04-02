import { useReducer, useCallback, useEffect, useRef } from 'react';
import { AgentRole, AgentsState, DynamicAgent, AgentCapability } from '../types';
import { PRESET_ROLES } from '../constants';

// ==================== Dynamic Agents State ====================

interface DynamicAgentsState {
  dynamicAgents: DynamicAgent[];
}

type DynamicAgentsAction =
  | { type: 'ADD_DYNAMIC_AGENT'; payload: DynamicAgent }
  | { type: 'REMOVE_DYNAMIC_AGENT'; payload: string }
  | { type: 'CLEAR_DYNAMIC_AGENTS' };

const dynamicAgentsInitialState: DynamicAgentsState = {
  dynamicAgents: [],
};

function dynamicAgentsReducer(state: DynamicAgentsState, action: DynamicAgentsAction): DynamicAgentsState {
  switch (action.type) {
    case 'ADD_DYNAMIC_AGENT':
      return { ...state, dynamicAgents: [...state.dynamicAgents, action.payload] };
    case 'REMOVE_DYNAMIC_AGENT':
      return { ...state, dynamicAgents: state.dynamicAgents.filter(a => a.id !== action.payload) };
    case 'CLEAR_DYNAMIC_AGENTS':
      return { ...state, dynamicAgents: state.dynamicAgents.filter(a => a.lifespan === 'manual') };
    default:
      return state;
  }
}

// ==================== Reducer ====================

type AgentsAction =
  | { type: 'SET_AGENTS'; payload: AgentRole[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_AGENT'; payload: string }
  | { type: 'UPDATE_AGENT_STATUS'; payload: { id: string; status: AgentRole['status']; current_task?: string } }
  | { type: 'INCREMENT_COMPLETED'; payload: string }
  | { type: 'RESET' };

const initialState: AgentsState = {
  agents: PRESET_ROLES,
  loading: false,
  error: null,
};

function agentsReducer(state: AgentsState, action: AgentsAction): AgentsState {
  switch (action.type) {
    case 'SET_AGENTS':
      return { ...state, agents: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'TOGGLE_AGENT':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload
            ? { ...a, enabled: !a.enabled, status: !a.enabled ? 'idle' : 'offline' }
            : a
        ),
      };
    case 'UPDATE_AGENT_STATUS':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.payload.id
            ? { ...a, status: action.payload.status, current_task: action.payload.current_task }
            : a
        ),
      };
    case 'INCREMENT_COMPLETED':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.current_task
            ? { ...a, status: 'idle', current_task: undefined, missions_completed: a.missions_completed + 1 }
            : a
        ),
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ==================== ID Generator ====================

const generateId = (prefix = 'agent') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ==================== Hook ====================

export function useAgents() {
  const [state, dispatch] = useReducer(agentsReducer, initialState);
  const [dynamicState, dynamicDispatch] = useReducer(dynamicAgentsReducer, dynamicAgentsInitialState);
  const autoDestroyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cleanup expired dynamic agents
  const cleanupExpiredAgents = useCallback(() => {
    const now = Date.now();
    dynamicState.dynamicAgents.forEach(agent => {
      if (agent.expiresAt && new Date(agent.expiresAt).getTime() <= now && agent.autoDestroy) {
        dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: agent.id });
        delete autoDestroyTimers.current[agent.id];
      }
    });
  }, [dynamicState.dynamicAgents]);

  // Periodic cleanup for task-lifespan agents
  useEffect(() => {
    const interval = setInterval(cleanupExpiredAgents, 5000);
    return () => clearInterval(interval);
  }, [cleanupExpiredAgents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(autoDestroyTimers.current).forEach(clearTimeout);
    };
  }, []);

  const toggleAgent = useCallback((agentId: string) => {
    dispatch({ type: 'TOGGLE_AGENT', payload: agentId });
  }, []);

  const updateAgentStatus = useCallback((id: string, status: AgentRole['status'], current_task?: string) => {
    dispatch({ type: 'UPDATE_AGENT_STATUS', payload: { id, status, current_task } });
  }, []);

  const setBusyAgents = useCallback((objective: string) => {
    state.agents.forEach(a => {
      if (a.enabled && a.status === 'idle') {
        updateAgentStatus(a.id, 'busy', objective);
      }
    });
  }, [state.agents, updateAgentStatus]);

  const incrementCompleted = useCallback(() => {
    dispatch({ type: 'INCREMENT_COMPLETED', payload: '' });
  }, []);

  const resetAgentTasks = useCallback(() => {
    state.agents.forEach(a => {
      if (a.status === 'busy') {
        dispatch({ type: 'UPDATE_AGENT_STATUS', payload: { id: a.id, status: 'idle', current_task: undefined } });
      }
    });
  }, [state.agents]);

  /**
   * 主Agent生成临时子Agent
   * @param mainAgentId 主Agent的ID
   * @param requirement 子Agent需要完成的需求描述
   * @param options 可选配置：lifespan、autoDestroy、capabilities
   * @returns 创建的动态Agent
   */
  const spawnSubAgent = useCallback((
    mainAgentId: string,
    requirement: string,
    options?: {
      lifespan?: DynamicAgent['lifespan'];
      autoDestroy?: boolean;
      ttlMs?: number;
      capabilities?: AgentCapability;
    }
  ): DynamicAgent => {
    const lifespan = options?.lifespan || 'task';
    const autoDestroy = options?.autoDestroy ?? true;
    const ttlMs = options?.ttlMs || (lifespan === 'task' ? 300000 : lifespan === 'session' ? 3600000 : 0);
    const agentId = generateId('dynamic');

    const dynamicAgent: DynamicAgent = {
      id: agentId,
      parentId: mainAgentId,
      isTemporary: true,
      lifespan,
      autoDestroy,
      name: `子Agent-${dynamicState.dynamicAgents.length + 1}`,
      role: `dynamic_${dynamicState.dynamicAgents.length + 1}`,
      description: requirement,
      createdAt: new Date().toISOString(),
      expiresAt: ttlMs > 0 ? new Date(Date.now() + ttlMs).toISOString() : undefined,
    };

    dynamicDispatch({ type: 'ADD_DYNAMIC_AGENT', payload: dynamicAgent });

    // Auto-destroy timer for task/session lifespan
    if (autoDestroy && ttlMs > 0) {
      const timer = setTimeout(() => {
        dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: agentId });
        delete autoDestroyTimers.current[agentId];
      }, ttlMs);
      autoDestroyTimers.current[agentId] = timer;
    }

    return dynamicAgent;
  }, [dynamicState.dynamicAgents.length]);

  /**
   * 销毁指定的动态Agent
   */
  const destroySubAgent = useCallback((agentId: string) => {
    if (autoDestroyTimers.current[agentId]) {
      clearTimeout(autoDestroyTimers.current[agentId]);
      delete autoDestroyTimers.current[agentId];
    }
    dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: agentId });
  }, []);

  /**
   * 销毁指定主Agent的所有子Agent
   */
  const destroyChildrenOf = useCallback((parentId: string) => {
    const children = dynamicState.dynamicAgents.filter(a => a.parentId === parentId);
    children.forEach(child => {
      if (autoDestroyTimers.current[child.id]) {
        clearTimeout(autoDestroyTimers.current[child.id]);
        delete autoDestroyTimers.current[child.id];
      }
      dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: child.id });
    });
  }, [dynamicState.dynamicAgents]);

  /**
   * 手动延长动态Agent的寿命
   */
  const extendSubAgentLife = useCallback((agentId: string, ttlMs: number) => {
    const agent = dynamicState.dynamicAgents.find(a => a.id === agentId);
    if (!agent) return;

    if (autoDestroyTimers.current[agentId]) {
      clearTimeout(autoDestroyTimers.current[agentId]);
    }
    const newExpiry = new Date(Date.now() + ttlMs).toISOString();
    const updatedAgent: DynamicAgent = { ...agent, expiresAt: newExpiry };
    dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: agentId });
    dynamicDispatch({ type: 'ADD_DYNAMIC_AGENT', payload: updatedAgent });

    if (ttlMs > 0) {
      autoDestroyTimers.current[agentId] = setTimeout(() => {
        dynamicDispatch({ type: 'REMOVE_DYNAMIC_AGENT', payload: agentId });
        delete autoDestroyTimers.current[agentId];
      }, ttlMs);
    }
  }, [dynamicState.dynamicAgents]);

  /**
   * 列出所有动态Agent（可按主Agent过滤）
   */
  const listDynamicAgents = useCallback((parentId?: string): DynamicAgent[] => {
    if (parentId) {
      return dynamicState.dynamicAgents.filter(a => a.parentId === parentId);
    }
    return dynamicState.dynamicAgents;
  }, [dynamicState.dynamicAgents]);

  return {
    ...state,
    dynamicAgents: dynamicState.dynamicAgents,
    toggleAgent,
    updateAgentStatus,
    setBusyAgents,
    incrementCompleted,
    resetAgentTasks,
    spawnSubAgent,
    destroySubAgent,
    destroyChildrenOf,
    extendSubAgentLife,
    listDynamicAgents,
  };
}
