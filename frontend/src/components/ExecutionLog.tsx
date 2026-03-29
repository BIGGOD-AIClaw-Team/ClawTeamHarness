import { useState, useEffect } from 'react';
import { Button } from 'antd';
import { ClearIcon } from './Icons';

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
      <div className="log-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>执行日志</h4>
        <Button size="small" icon={<ClearIcon />} onClick={() => setLogs([])}>清除</Button>
      </div>
      
      <div className="log-entries" style={{ maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
        {logs.map((log, idx) => (
          <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span style={{ color: levelColors[log.level] || '#888', marginLeft: 8, fontWeight: 'bold' }}>{log.level}</span>
            <span style={{ color: '#666', marginLeft: 8 }}>[{log.event}]</span>
            <span style={{ marginLeft: 8 }}>{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>暂无日志</div>}
      </div>
    </div>
  );
}
