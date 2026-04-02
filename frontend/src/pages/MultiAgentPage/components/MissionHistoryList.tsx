import React, { useMemo, useState } from 'react';
import { List, Tag, Avatar, Space, Select, Pagination, Tooltip, Button, Typography } from 'antd';
import {
  TeamOutlined, ThunderboltOutlined, EyeOutlined, AlertOutlined,
  InfoCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { Mission } from '../types';
import { MissionExecutionSteps } from './MissionExecutionSteps';
import { getMissionExecutionSteps } from '../constants';

const { Text } = Typography;

const MISSION_TYPE_ICONS: Record<string, React.ReactNode> = {
  defense: <TeamOutlined />,
  offense: <ThunderboltOutlined />,
  reconnaissance: <EyeOutlined />,
  support: <AlertOutlined />,
};

const PRIORITY_TAG_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const STATUS_TAG_COLORS: Record<string, string> = {
  completed: 'success',
  failed: 'error',
  running: 'processing',
  pending: 'default',
};

interface MissionHistoryListProps {
  missions: Mission[];
  pageSize?: number;
  onViewDetails?: (mission: Mission) => void;
}

export const MissionHistoryList: React.FC<MissionHistoryListProps> = ({
  missions,
  pageSize: defaultPageSize = 10,
  onViewDetails,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMissions = useMemo(() => {
    if (statusFilter === 'all') return missions;
    return missions.filter(m => m.status === statusFilter);
  }, [missions, statusFilter]);

  const paginatedMissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMissions.slice(start, start + pageSize);
  }, [filteredMissions, page, pageSize]);

  const executionSteps = (mission: Mission) => {
    // For pending/running, derive step from progress
    if (mission.status === 'pending' || mission.status === 'running') {
      const stepIndex = mission.status === 'pending' ? 0 : Math.min(Math.floor(mission.progress / 16.67), 5);
      return [
        { title: '任务下发', status: stepIndex >= 0 ? 'finish' as const : 'wait' as const },
        { title: '情报收集', status: stepIndex >= 1 ? 'finish' as const : stepIndex === 1 ? 'process' as const : 'wait' as const },
        { title: '态势分析', status: stepIndex >= 2 ? 'finish' as const : stepIndex === 2 ? 'process' as const : 'wait' as const },
        { title: '战术规划', status: stepIndex >= 3 ? 'finish' as const : stepIndex === 3 ? 'process' as const : 'wait' as const },
        { title: '作战执行', status: stepIndex >= 4 ? 'finish' as const : stepIndex === 4 ? 'process' as const : 'wait' as const },
        { title: '结果汇报', status: stepIndex >= 5 ? 'finish' as const : stepIndex === 5 ? 'process' as const : 'wait' as const },
      ];
    }
    return getMissionExecutionSteps(mission.status);
  };

  const renderMissionItem = (mission: Mission) => (
    <List.Item
      key={mission.id}
      actions={[
        <Tooltip title="查看详情" key="view">
          <Button
            type="text"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => onViewDetails?.(mission)}
          />
        </Tooltip>,
        <Tooltip title="生成报告" key="report">
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => {
              if (!onViewDetails) return;
              // Quick report generation
              const report = {
                mission_id: mission.id,
                mission_type: mission.mission_type || 'unknown',
                objective: mission.objective,
                priority: mission.priority,
                status: mission.status,
                created_at: mission.created_at,
                completed_at: mission.completed_at || new Date().toISOString(),
                result: mission.result_detail,
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mission_report_${mission.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        </Tooltip>,
      ]}
      extra={
        <Tag color={STATUS_TAG_COLORS[mission.status] || 'default'}>
          {mission.status}
        </Tag>
      }
    >
      <List.Item.Meta
        avatar={
          <Avatar
            icon={MISSION_TYPE_ICONS[mission.mission_type || ''] || <ThunderboltOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
        }
        title={<Text style={{ color: '#e0e6ed' }}>{mission.objective}</Text>}
        description={
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {mission.id} • <Tag color={PRIORITY_TAG_COLORS[mission.priority]} style={{ margin: 0 }}>{mission.priority}</Tag>
            </Text>
            <div style={{ maxWidth: 300 }}>
              <MissionExecutionSteps steps={executionSteps(mission)} size="small" />
            </div>
          </Space>
        }
      />
    </List.Item>
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          共 {filteredMissions.length} 条任务记录
        </Text>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>状态筛选:</Text>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: '全部' },
              { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' },
              { value: 'running', label: '进行中' },
              { value: 'pending', label: '待执行' },
            ]}
            style={{ width: 100 }}
            size="small"
          />
        </Space>
      </div>
      <List
        size="small"
        dataSource={paginatedMissions}
        renderItem={renderMissionItem}
        locale={{ emptyText: '暂无历史任务' }}
        style={{ background: 'rgba(0, 20, 40, 0.6)', borderRadius: 8, padding: 8 }}
      />
      {filteredMissions.length > pageSize && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredMissions.length}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps || pageSize);
            }}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
            size="small"
          />
        </div>
      )}
    </div>
  );
};
