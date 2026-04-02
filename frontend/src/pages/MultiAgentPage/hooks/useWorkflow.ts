import { useReducer, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { WorkflowTask, WorkflowsState, WorkflowStep } from '../types';
import { api } from '../api';

// ==================== Reducer ====================

type WorkflowsAction =
  | { type: 'SET_TASKS'; payload: WorkflowTask[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<WorkflowTask> } }
  | { type: 'ADD_TASK'; payload: WorkflowTask }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: WorkflowTask['status']; progress?: number; error?: string } };

const initialState: WorkflowsState = {
  tasks: [],
  loading: false,
  error: null,
};

function workflowsReducer(state: WorkflowsState, action: WorkflowsAction): WorkflowsState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.task_id === action.payload.taskId ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.task_id === action.payload.taskId
            ? {
                ...t,
                status: action.payload.status,
                progress: action.payload.progress ?? t.progress,
                error: action.payload.error ?? t.error,
              }
            : t
        ),
      };
    default:
      return state;
  }
}

// ==================== Hook ====================

export function useWorkflow() {
  const [state, dispatch] = useReducer(workflowsReducer, initialState);

  const loadTasks = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.getTasks();
      if (res.code === 0) {
        dispatch({ type: 'SET_TASKS', payload: res.data || [] });
      } else {
        dispatch({ type: 'SET_ERROR', payload: res.message || '加载失败' });
      }
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: '加载工作流任务失败' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createTask = useCallback(async (data: {
    name: string;
    description: string;
    workflow_type: WorkflowTask['workflow_type'];
    steps: WorkflowStep[];
    team_id?: string;
  }) => {
    if (!data.name) {
      message.warning('请输入任务名称');
      return false;
    }
    try {
      const res = await api.createTask(data);
      if (res.code === 0) {
        message.success('工作流任务创建成功');
        await loadTasks();
        return true;
      } else {
        message.error(res.message || '创建失败');
        return false;
      }
    } catch (e) {
      message.error('创建工作流任务失败');
      return false;
    }
  }, [loadTasks]);

  const executeWorkflow = useCallback(async (taskId: string) => {
    try {
      const res = await api.executeWorkflow(taskId);
      if (res.code === 0) {
        message.success('工作流开始执行');
        await loadTasks();
      } else {
        message.error(res.message || '执行失败');
      }
    } catch (e) {
      message.error('执行工作流失败');
    }
  }, [loadTasks]);

  const stopTask = useCallback((taskId: string) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status: 'failed', error: '用户停止' } });
    message.info('任务已停止');
  }, []);

  // Poll running tasks
  useEffect(() => {
    const runningTasks = state.tasks.filter(t => t.status === 'running');
    if (runningTasks.length === 0) return;

    const interval = setInterval(() => {
      runningTasks.forEach(task => {
        api.getTaskStatus(task.task_id).then((res: any) => {
          if (res.code === 0) {
            const { status, progress, error } = res.data;
            dispatch({
              type: 'UPDATE_TASK_STATUS',
              payload: { taskId: task.task_id, status, progress, error },
            });
          }
        });
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [state.tasks.filter(t => t.status === 'running').length]);

  return {
    ...state,
    loadTasks,
    createTask,
    executeWorkflow,
    stopTask,
  };
}
