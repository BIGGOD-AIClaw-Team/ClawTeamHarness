import { useReducer, useCallback } from 'react';
import { message } from 'antd';
import { Team, TeamsState, TeamAgent } from '../types';
import { api } from '../api';

// ==================== Reducer ====================

type TeamsAction =
  | { type: 'SET_TEAMS'; payload: Team[] }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: TeamsState = {
  teams: [],
  loading: false,
  error: null,
};

function teamsReducer(state: TeamsState, action: TeamsAction): TeamsState {
  switch (action.type) {
    case 'SET_TEAMS':
      return { ...state, teams: action.payload };
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// ==================== Hook ====================

export function useTeams() {
  const [state, dispatch] = useReducer(teamsReducer, initialState);

  const loadTeams = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.getTeams();
      if (res.code === 0) {
        dispatch({ type: 'SET_TEAMS', payload: res.data || [] });
      } else {
        dispatch({ type: 'SET_ERROR', payload: res.message || '加载失败' });
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: '加载团队失败' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createTeam = useCallback(async (data: { name: string; description: string; agents: TeamAgent[] }) => {
    if (!data.name) {
      message.warning('请输入团队名称');
      return false;
    }
    try {
      const res = await api.createTeam(data);
      if (res.code === 0) {
        message.success('团队创建成功');
        await loadTeams();
        return true;
      } else {
        message.error(res.message || '创建失败');
        return false;
      }
    } catch (e) {
      message.error('创建团队失败');
      return false;
    }
  }, [loadTeams]);

  return {
    ...state,
    loadTeams,
    createTeam,
  };
}
