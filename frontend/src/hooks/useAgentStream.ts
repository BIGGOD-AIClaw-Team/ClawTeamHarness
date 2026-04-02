import { useState, useEffect, useCallback } from 'react';

interface StreamEvent {
  type: 'node_start' | 'node_complete' | 'token_stream' | 'execution_complete' | 'error';
  data: any;
  timestamp: number;
}

export function useAgentStream(sessionId: string) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    const wsUrl = `ws://localhost:8001/ws/${sessionId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setStatus('connected');
    socket.onclose = () => setStatus('disconnected');
    socket.onerror = () => setStatus('disconnected');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [...prev, data]);
    };

    setWs(socket);
  }, [sessionId]);

  const disconnect = useCallback(() => {
    ws?.close();
  }, [ws]);

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  return { events, status, connect, disconnect };
}
