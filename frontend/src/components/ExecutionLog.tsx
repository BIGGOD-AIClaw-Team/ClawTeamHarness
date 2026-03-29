import React, { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  event: string;
  message: string;
  duration_ms?: number;
}

interface ExecutionLogProps {
  sessionId: string;
}

export function ExecutionLog({ sessionId }: ExecutionLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const resp = await fetch(`/api/logs/?logger=agent&limit=50`);
        const data = await resp.json();
        setLogs(data.logs || []);
      } catch (e) {
        console.error('Failed to fetch logs:', e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const levelColors: Record<string, string> = {
    DEBUG: '#888',
    INFO: '#1890ff',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
  };

  return (
    <div className="execution-log">
      <div className="log-header">
        <h4>执行日志</h4>
        <button onClick={() => setLogs([])}>清除</button>
      </div>
      
      <div className="log-entries">
        {logs.map((log, index) => (
          <div 
            key={index} 
            className={`log-entry ${log.level.toLowerCase()}`}
          >
            <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span 
              className="log-level" 
              style={{ color: levelColors[log.level] || '#888' }}
            >
              {log.level}
            </span>
            <span className="log-event">[{log.event}]</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
