import React, { useMemo } from 'react';
import {
  Drawer, Descriptions, Tag, Divider, Timeline, Button, Space, message, Badge, Typography,
} from 'antd';
import {
  FileTextOutlined, RobotOutlined,
  TeamOutlined, ThunderboltOutlined, EyeOutlined, AimOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { Mission, ReasoningStep } from '../types';
import { getMissionExecutionSteps, EXECUTION_STEP_TITLES } from '../constants';
import { MissionExecutionSteps } from './MissionExecutionSteps';

const { Text, Paragraph } = Typography;

const PRIORITY_TAG_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const MISSION_TYPE_ICONS: Record<string, React.ReactNode> = {
  defense: <TeamOutlined />,
  offense: <ThunderboltOutlined />,
  reconnaissance: <EyeOutlined />,
  support: <AimOutlined />,
};

interface MissionResultDrawerProps {
  mission: Mission | null;
  visible: boolean;
  onClose: () => void;
}

export const MissionResultDrawer: React.FC<MissionResultDrawerProps> = ({ mission, visible, onClose }) => {
  const executionSteps = useMemo(() => {
    if (!mission) return [];
    // For pending/running missions, derive step from status
    if (mission.status === 'pending' || mission.status === 'running') {
      const stepIndex = mission.status === 'pending' ? 0 : Math.min(Math.floor(mission.progress / 16.67), 5);
      return EXECUTION_STEP_TITLES.map((title, idx) => ({
        title,
        status: idx < stepIndex ? 'finish' as const : idx === stepIndex ? 'process' as const : 'wait' as const,
      }));
    }
    return getMissionExecutionSteps(mission.status);
  }, [mission]);

  const reasoningChain = mission?.result_detail?.reasoning_chain || [];

  const handleExportReport = () => {
    if (!mission) return;
    const report = {
      mission_id: mission.id,
      mission_type: mission.mission_type || 'unknown',
      objective: mission.objective,
      priority: mission.priority,
      status: mission.status,
      created_at: mission.created_at,
      completed_at: mission.completed_at || new Date().toISOString(),
      execution_steps: executionSteps,
      result: mission.result_detail,
      progress: mission.progress,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_report_${mission.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('执行报告已导出');
  };

  if (!mission) return null;

  return (
    <Drawer
      title={
        <Space>
          <InfoCircleOutlined />
          <span>任务执行详情</span>
        </Space>
      }
      placement="right"
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        <Button icon={<FileTextOutlined />} onClick={handleExportReport}>
          导出报告
        </Button>
      }
      styles={{ body: { padding: 16 } }}
    >
      {/* Task Overview */}
      <Descriptions title="任务概览" bordered column={1} size="small">
        <Descriptions.Item label="任务ID">
          <Text code style={{ fontSize: 12 }}>{mission.id}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="任务类型">
          <Space>
            {MISSION_TYPE_ICONS[mission.mission_type || ''] || <RobotOutlined />}
            <Tag>{mission.mission_type || '未分类'}</Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="任务目标">{mission.objective}</Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={PRIORITY_TAG_COLORS[mission.priority]}>{mission.priority}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Badge
            status={
              mission.status === 'completed' ? 'success' :
              mission.status === 'failed' ? 'error' :
              mission.status === 'running' ? 'processing' : 'default'
            }
            text={mission.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label="进度">
          {mission.progress}%
        </Descriptions.Item>
        {mission.result_detail?.confidence && (
          <Descriptions.Item label="置信度">
            {(mission.result_detail.confidence * 100).toFixed(1)}%
          </Descriptions.Item>
        )}
        {mission.result_detail?.execution_time_ms && (
          <Descriptions.Item label="执行时间">
            {mission.result_detail.execution_time_ms}ms
          </Descriptions.Item>
        )}
      </Descriptions>

      <Divider>执行进度</Divider>
      <MissionExecutionSteps steps={executionSteps} />

      {/* Reasoning Chain */}
      {reasoningChain.length > 0 && (
        <>
          <Divider>推理链</Divider>
          <Timeline mode="left">
            {reasoningChain.map((step: ReasoningStep, index: number) => (
              <Timeline.Item
                key={step.step_id || index}
                color={
                  step.confidence && step.confidence > 0.8 ? 'green' :
                  step.confidence && step.confidence > 0.5 ? 'blue' : 'gray'
                }
              >
                <div>
                  <Tag color="purple">{step.action}</Tag>
                  {step.confidence && (
                    <Text type="secondary" style={{ fontSize: 12 }}> 置信度: {(step.confidence * 100).toFixed(0)}%</Text>
                  )}
                  <br />
                  {step.evidence && step.evidence.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      依据: {step.evidence.join(', ')}
                    </Text>
                  )}
                  {step.output_data && (
                    <pre style={{ fontSize: 10, background: 'rgba(0,20,40,0.3)', padding: 4, marginTop: 4, overflow: 'auto', maxHeight: 80, borderRadius: 4 }}>
                      {JSON.stringify(step.output_data, null, 2).slice(0, 200)}
                    </pre>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </>
      )}

      {/* Execution Summary */}
      {mission.result_detail?.summary && (
        <>
          <Divider>执行摘要</Divider>
          <Paragraph>{mission.result_detail.summary}</Paragraph>
        </>
      )}

      {/* Result Data */}
      {mission.result_detail?.data && (
        <>
          <Divider>详细数据</Divider>
          <pre style={{
            background: 'rgba(0,20,40,0.3)',
            padding: 12,
            borderRadius: 4,
            fontSize: 11,
            maxHeight: 300,
            overflow: 'auto',
          }}>
            {JSON.stringify(mission.result_detail.data, null, 2)}
          </pre>
        </>
      )}
    </Drawer>
  );
};
