import { memo } from 'react';
import { Table, Tag, Space, Typography, Badge, Progress, Button, Tooltip } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { WorkflowTask } from '../types';
import { STATUS_COLORS, WORKFLOW_TYPE_OPTIONS } from '../constants';

const { Text } = Typography;

interface WorkflowTaskTableProps {
  tasks: WorkflowTask[];
  loading?: boolean;
  onExecute: (taskId: string) => void;
  onStop: (taskId: string) => void;
}

export const WorkflowTaskTable = memo(function WorkflowTaskTable({
  tasks,
  loading,
  onExecute,
  onStop,
}: WorkflowTaskTableProps) {
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WorkflowTask) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: '#e0e6ed', fontWeight: 500 }}>{text}</Text>
          <Text style={{ color: '#666', fontSize: 11 }}>{record.description || '无描述'}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'workflow_type',
      key: 'workflow_type',
      width: 100,
      render: (type: string) => {
        const opt = WORKFLOW_TYPE_OPTIONS.find(o => o.value === type);
        return <Tag>{opt?.label || type}</Tag>;
      },
    },
    {
      title: '步骤',
      dataIndex: 'steps',
      key: 'steps',
      width: 80,
      render: (steps: WorkflowTask['steps']) => <Text style={{ color: '#888' }}>{steps.length} 步</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge
          status={status as any}
          text={<Text style={{ color: STATUS_COLORS[status], fontSize: 12 }}>{status}</Text>}
        />
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: WorkflowTask) =>
        record.status === 'running' ? (
          <Progress
            percent={progress}
            size="small"
            strokeColor="#00d4ff"
            trailColor="rgba(0, 212, 255, 0.2)"
          />
        ) : (
          <Text style={{ color: '#888', fontSize: 12 }}>{progress}%</Text>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: WorkflowTask) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onExecute(record.task_id)}
            >
              执行
            </Button>
          )}
          {record.status === 'running' && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => onStop(record.task_id)}
            >
              停止
            </Button>
          )}
          {record.status === 'failed' && record.error && (
            <Tooltip title={record.error}>
              <Button size="small" type="text" danger>
                查看错误
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Text style={{ color: '#888' }}>暂无工作流任务</Text>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="task_id"
      size="small"
      loading={loading}
      pagination={{ pageSize: 10 }}
      style={{ background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8 }}
    />
  );
});
