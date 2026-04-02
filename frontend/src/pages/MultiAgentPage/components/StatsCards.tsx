import { memo } from 'react';
import { Card, Statistic, Typography } from 'antd';
import {
  TeamOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface StatsCardsProps {
  totalAgents: number;
  onlineAgents: number;
  runningMissions: number;
  completedMissions: number;
  totalMissions: number;
}

export const StatsCards = memo(function StatsCards({
  totalAgents,
  onlineAgents,
  runningMissions,
  completedMissions,
  totalMissions,
}: StatsCardsProps) {
  const cardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 140,
    background: 'rgba(0, 20, 40, 0.6)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
  };

  return (
    <div style={{ padding: '16px 24px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Card size="small" style={cardStyle}>
        <Statistic
          title={<Text style={{ color: '#888', fontSize: 12 }}>团队成员</Text>}
          value={`${onlineAgents} / ${totalAgents}`}
          prefix={<TeamOutlined style={{ color: '#00d4ff' }} />}
          valueStyle={{ color: '#00d4ff', fontSize: 20 }}
        />
      </Card>
      <Card size="small" style={cardStyle}>
        <Statistic
          title={<Text style={{ color: '#888', fontSize: 12 }}>运行中任务</Text>}
          value={runningMissions}
          prefix={<SyncOutlined style={{ color: '#f59e0b' }} />}
          valueStyle={{ color: '#f59e0b', fontSize: 20 }}
        />
      </Card>
      <Card size="small" style={cardStyle}>
        <Statistic
          title={<Text style={{ color: '#888', fontSize: 12 }}>已完成</Text>}
          value={completedMissions}
          prefix={<CheckCircleOutlined style={{ color: '#00ff88' }} />}
          valueStyle={{ color: '#00ff88', fontSize: 20 }}
        />
      </Card>
      <Card size="small" style={cardStyle}>
        <Statistic
          title={<Text style={{ color: '#888', fontSize: 12 }}>总任务数</Text>}
          value={totalMissions}
          prefix={<ThunderboltOutlined style={{ color: '#a855f7' }} />}
          valueStyle={{ color: '#a855f7', fontSize: 20 }}
        />
      </Card>
    </div>
  );
});
