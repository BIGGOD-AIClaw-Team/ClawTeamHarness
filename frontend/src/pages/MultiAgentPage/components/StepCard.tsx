import { memo } from 'react';
import { Card, Row, Col, Tag, Typography, Space, Button, Tooltip } from 'antd';
import { DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { WorkflowStep, AgentRole } from '../types';

const { Text } = Typography;

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  allAgents: AgentRole[];
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const StepCard = memo(function StepCard({
  step,
  index,
  allAgents,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  return (
    <Card
      size="small"
      style={{
        background: 'rgba(0, 20, 40, 0.4)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        marginBottom: 8,
      }}
      bodyStyle={{ padding: '8px 12px' }}
    >
      <Row gutter={[8, 8]} align="middle">
        <Col>
          <Tag style={{ margin: 0 }}>{index + 1}</Tag>
        </Col>
        <Col flex="auto">
          <Space>
            <Text style={{ color: '#e0e6ed', fontSize: 13 }}>{step.name}</Text>
            <Tag style={{ margin: 0, fontSize: 10 }}>{step.step_type}</Tag>
            {step.step_type === 'agent' && step.agent_id && (
              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                {allAgents.find(a => a.id === step.agent_id)?.name || step.agent_id}
              </Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space size={4}>
            <Tooltip title="上移">
              <Button
                size="small"
                type="text"
                icon={<UpOutlined />}
                disabled={isFirst}
                onClick={onMoveUp}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                size="small"
                type="text"
                icon={<DownOutlined />}
                disabled={isLast}
                onClick={onMoveDown}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button size="small" type="link" onClick={onEdit}>编辑</Button>
            </Tooltip>
            <Tooltip title="删除">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </Card>
  );
});
