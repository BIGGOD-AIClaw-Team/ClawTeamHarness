import { memo } from 'react';
import { Table, Tag, Space, Typography, Badge, Progress, Button, Popconfirm, Tooltip } from 'antd';
import { PlayCircleOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { Mission, AgentRole } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS } from '../constants';

const { Text } = Typography;

interface MissionTableProps {
  missions: Mission[];
  agents: AgentRole[];
  loading?: boolean;
  onStart: (id: string) => void;
  onComplete: (id: string, status: 'completed' | 'failed') => void;
  onDelete: (id: string) => void;
}

export const MissionTable = memo(function MissionTable({
  missions,
  agents,
  loading,
  onStart,
  onComplete,
  onDelete,
}: MissionTableProps) {
  const columns = [
    {
      title: '任务',
      dataIndex: 'objective',
      key: 'objective',
      render: (text: string, record: Mission) => (
        <Space>
          <Tag color={PRIORITY_COLORS[record.priority]} style={{ margin: 0 }}>{record.priority.toUpperCase()}</Tag>
          <Text style={{ color: '#e0e6ed', fontSize: 13 }} ellipsis={{ tooltip: text }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={status as any} text={<Text style={{ color: STATUS_COLORS[status], fontSize: 12 }}>{status}</Text>} />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: Mission) =>
        record.status === 'running' ? (
          <Progress percent={progress} size="small" strokeColor="#00d4ff" trailColor="rgba(0, 212, 255, 0.2)" />
        ) : (
          <Text style={{ color: '#888', fontSize: 12 }}>{progress}%</Text>
        ),
    },
    {
      title: '执行者',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      width: 180,
      render: (assigned: string[]) => (
        <Space size={4} wrap>
          {assigned.slice(0, 3).map(a => {
            const agent = agents.find(ag => ag.role === a);
            return (
              <Tooltip key={a} title={agent?.name}>
                <Tag color={agent?.color} style={{ margin: 0, fontSize: 10 }}>
                  {agent?.icon}
                </Tag>
              </Tooltip>
            );
          })}
          {assigned.length > 3 && <Tag style={{ margin: 0, fontSize: 10 }}>+{assigned.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Mission) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onStart(record.id)}
            >
              执行
            </Button>
          )}
          {record.status === 'running' && (
            <>
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#00ff88' }}
                onClick={() => onComplete(record.id, 'completed')}
              >
                完成
              </Button>
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => onComplete(record.id, 'failed')}
              >
                失败
              </Button>
            </>
          )}
          {(record.status === 'completed' || record.status === 'failed') && (
            <Popconfirm title="确定删除？" onConfirm={() => onDelete(record.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (missions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Text style={{ color: '#888' }}>暂无任务，点击右上角「创建任务」开始</Text>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={missions}
      rowKey="id"
      size="small"
      loading={loading}
      pagination={false}
      style={{ background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8 }}
    />
  );
});
