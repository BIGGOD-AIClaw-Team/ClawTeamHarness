import { useReducer, useCallback } from 'react';
import { message } from 'antd';
import { CollaborationConfig } from '../types';

// ==================== Reducers ====================

type CollaborationAction =
  | { type: 'SET_MODE'; payload: CollaborationConfig['mode'] }
  | { type: 'SET_FILE_BASE_DIR'; payload: string }
  | { type: 'SET_WS_ENDPOINT'; payload: string };

const initialCollabState: CollaborationConfig = {
  mode: 'file',
  fileBaseDir: '/workspace/tasks',
  wsEndpoint: 'ws://localhost:8080/ws',
};

function collaborationReducer(state: CollaborationConfig, action: CollaborationAction): CollaborationConfig {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_FILE_BASE_DIR':
      return { ...state, fileBaseDir: action.payload };
    case 'SET_WS_ENDPOINT':
      return { ...state, wsEndpoint: action.payload };
    default:
      return state;
  }
}

export function useCollaboration() {
  const [collaborationConfig, dispatchCollab] = useReducer(collaborationReducer, initialCollabState);

  const setMode = useCallback((mode: CollaborationConfig['mode']) => {
    dispatchCollab({ type: 'SET_MODE', payload: mode });
  }, []);

  const setFileBaseDir = useCallback((dir: string) => {
    dispatchCollab({ type: 'SET_FILE_BASE_DIR', payload: dir });
  }, []);

  const setWsEndpoint = useCallback((endpoint: string) => {
    dispatchCollab({ type: 'SET_WS_ENDPOINT', payload: endpoint });
  }, []);

  const saveConfig = useCallback(() => {
    message.success('协商协议配置已保存');
  }, []);

  return {
    collaborationConfig,
    setMode,
    setFileBaseDir,
    setWsEndpoint,
    saveConfig,
  };
}
