import { useReducer, useCallback } from 'react';
import { message } from 'antd';
import { Mission, MissionsState } from '../types';
import { generateId } from '../constants';

// ==================== Reducer ====================

type MissionsAction =
  | { type: 'SET_MISSIONS'; payload: Mission[] }
  | { type: 'ADD_MISSION'; payload: Mission }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_MISSION'; payload: { id: string; updates: Partial<Mission> } }
  | { type: 'DELETE_MISSION'; payload: string }
  | { type: 'START_MISSION'; payload: string }
  | { type: 'COMPLETE_MISSION'; payload: { id: string; status: 'completed' | 'failed' } }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: number } };

const initialState: MissionsState = {
  missions: [],
  loading: false,
  error: null,
};

function missionsReducer(state: MissionsState, action: MissionsAction): MissionsState {
  switch (action.type) {
    case 'SET_MISSIONS':
      return { ...state, missions: action.payload };
    case 'ADD_MISSION':
      return { ...state, missions: [...state.missions, action.payload] };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_MISSION':
      return {
        ...state,
        missions: state.missions.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'DELETE_MISSION':
      return { ...state, missions: state.missions.filter(m => m.id !== action.payload) };
    case 'START_MISSION':
      return {
        ...state,
        missions: state.missions.map(m =>
          m.id === action.payload ? { ...m, status: 'running', progress: 0 } : m
        ),
      };
    case 'COMPLETE_MISSION':
      return {
        ...state,
        missions: state.missions.map(m =>
          m.id === action.payload.id
            ? {
                ...m,
                status: action.payload.status,
                completed_at: new Date().toISOString(),
                progress: action.payload.status === 'completed' ? 100 : m.progress,
              }
            : m
        ),
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        missions: state.missions.map(m =>
          m.id === action.payload.id ? { ...m, progress: action.payload.progress } : m
        ),
      };
    default:
      return state;
  }
}

// ==================== Hook ====================

export function useMissions(agents: { enabled: boolean; role: string }[]) {
  const [state, dispatch] = useReducer(missionsReducer, initialState);

  const createMission = useCallback((objective: string, priority: Mission['priority'], assigned_to: string[]) => {
    if (!objective) {
      message.warning('请输入任务目标');
      return null;
    }
    const mission: Mission = {
      id: generateId(),
      objective,
      status: 'pending',
      priority,
      assigned_to:
        assigned_to.length > 0
          ? assigned_to
          : agents.filter(a => a.enabled).map(a => a.role),
      created_at: new Date().toISOString(),
      progress: 0,
    };
    dispatch({ type: 'ADD_MISSION', payload: mission });
    message.success('任务已创建');
    return mission;
  }, [agents]);

  const startMission = useCallback((missionId: string) => {
    dispatch({ type: 'START_MISSION', payload: missionId });
    message.success('任务已开始执行');
  }, []);

  const completeMission = useCallback((missionId: string, status: 'completed' | 'failed') => {
    dispatch({ type: 'COMPLETE_MISSION', payload: { id: missionId, status } });
  }, []);

  const deleteMission = useCallback((missionId: string) => {
    dispatch({ type: 'DELETE_MISSION', payload: missionId });
    message.success('任务已删除');
  }, []);

  const updateProgress = useCallback((missionId: string, progress: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { id: missionId, progress } });
  }, []);

  return {
    ...state,
    createMission,
    startMission,
    completeMission,
    deleteMission,
    updateProgress,
  };
}
