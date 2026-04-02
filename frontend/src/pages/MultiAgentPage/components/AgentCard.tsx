import { memo, useCallback } from 'react';
import { Card, Avatar, Switch, Typography } from 'antd';
import { AgentRole } from '../types';
import { STATUS_COLORS } from '../constants';

const { Text } = Typography;

interface AgentCardProps {
  agent: AgentRole;
  onToggle: (id: string) => void;
  onConfig: (role: string) => void;
}

export const AgentCard = memo(function AgentCard({ agent, onToggle, onConfig }: AgentCardProps) {
  const handleToggle = useCallback((_checked: boolean, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onToggle(agent.id);
  }, [agent.id, onToggle]);

  const handleConfig = useCallback(() => {
    onConfig(agent.role);
  }, [agent.role, onConfig]);

  return (
    <Card
      size="small"
      style={{
        background: agent.enabled ? 'rgba(0, 20, 40, 0.6)' : 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${agent.enabled ? agent.color + '40' : 'rgba(255,255,255,0.1)'}`,
        opacity: agent.enabled ? 1 : 0.5,
        cursor: 'pointer',
      }}
      onClick={handleConfig}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Avatar
          size={40}
          style={{
            background: agent.enabled ? agent.color + '20' : '#333',
            border: `2px solid ${agent.color}`,
            color: agent.color,
          }}
          icon={agent.icon}
        />
        <div onClick={e => e.stopPropagation()}>
          <Switch
            size="small"
            checked={agent.enabled}
            onChange={handleToggle}
            style={{ background: agent.enabled ? agent.color : '#333' }}
          />
        </div>
      </div>
      <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 2 }}>{agent.name}</div>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>{agent.description}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: STATUS_COLORS[agent.status],
              boxShadow: `0 0 6px ${STATUS_COLORS[agent.status]}`,
            }}
          />
          <Text style={{ color: STATUS_COLORS[agent.status], fontSize: 11 }}>
            {agent.status === 'idle' ? '空闲' : agent.status === 'busy' ? '工作中' : '离线'}
          </Text>
        </div>
        <Text style={{ color: '#888', fontSize: 11 }}>
          完成 {agent.missions_completed} 个任务
        </Text>
      </div>
      {agent.current_task && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: 4 }}>
          <Text style={{ color: '#00d4ff', fontSize: 10 }}>当前任务: {agent.current_task}</Text>
        </div>
      )}
    </Card>
  );
});
