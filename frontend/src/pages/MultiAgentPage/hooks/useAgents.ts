import { useReducer, useCallback } from 'react';
import { AgentRole, AgentsState } from '../types';
import { PRESET_ROLES } from '../constants';

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

// ==================== Hook ====================

export function useAgents() {
  const [state, dispatch] = useReducer(agentsReducer, initialState);

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

  return {
    ...state,
    toggleAgent,
    updateAgentStatus,
    setBusyAgents,
    incrementCompleted,
    resetAgentTasks,
  };
}
