import { memo } from 'react';
import { Typography, Input, Button, Space } from 'antd';
import { PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface PageHeaderProps {
  teamName: string;
  onTeamNameChange: (v: string) => void;
  onSimulate: () => void;
  onCreateMission: () => void;
  runningSimulation: boolean;
}

export const PageHeader = memo(function PageHeader({
  teamName,
  onTeamNameChange,
  onSimulate,
  onCreateMission,
  runningSimulation,
}: PageHeaderProps) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <Title level={4} style={{ margin: 0, color: '#00d4ff' }}>👥 多 Agent 协作中心</Title>
        <Input
          style={{
            marginTop: 4,
            fontSize: 12,
            background: 'transparent',
            border: 'none',
            padding: 0,
            width: 300,
            color: '#e0e6ed',
          }}
          value={teamName}
          onChange={e => onTeamNameChange(e.target.value)}
          variant="borderless"
        />
      </div>
      <Space>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={onSimulate}
          loading={runningSimulation}
        >
          模拟执行
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateMission}
        >
          创建任务
        </Button>
      </Space>
    </div>
  );
});
