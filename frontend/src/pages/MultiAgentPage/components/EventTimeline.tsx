import React, { useMemo, useState } from 'react';
import { Timeline, Tag, Select, Space, Badge, Empty, Typography } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  TeamOutlined, RobotOutlined, ExclamationCircleOutlined, MessageOutlined,
} from '@ant-design/icons';
import { TeamEvent } from '../types';
import { EVENT_TYPE_OPTIONS } from '../constants';

const { Text } = Typography;

const EVENT_COLORS: Record<string, string> = {
  'mission_completed': 'green',
  'mission_failed': 'red',
  'agent_alert': 'red',
  'team_update': 'blue',
  'agent_status_change': 'cyan',
  'mission_assigned': 'purple',
  'mission_update': 'orange',
  'message': 'gray',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'mission_completed': <CheckCircleOutlined />,
  'mission_failed': <CloseCircleOutlined />,
  'agent_alert': <ExclamationCircleOutlined />,
  'mission_update': <ClockCircleOutlined />,
  'team_update': <TeamOutlined />,
  'agent_status_change': <RobotOutlined />,
  'mission_assigned': <TeamOutlined />,
  'message': <MessageOutlined />,
};

interface EventTimelineProps {
  events: TeamEvent[];
  connected?: boolean;
  maxItems?: number;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, connected = false, maxItems = 50 }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filter === 'mission') {
      filtered = events.filter(e => e.event_type.includes('mission'));
    } else if (filter === 'agent') {
      filtered = events.filter(e => e.event_type.includes('agent'));
    } else if (filter === 'team') {
      filtered = events.filter(e => e.event_type.includes('team'));
    }
    return filtered.slice(0, maxItems);
  }, [events, filter, maxItems]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Badge status={connected ? 'success' : 'error'} text={connected ? '已连接' : '未连接'} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredEvents.length} 条事件
          </Text>
        </Space>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>筛选:</Text>
          <Select
            value={filter}
            onChange={setFilter}
            options={EVENT_TYPE_OPTIONS}
            style={{ width: 120 }}
            size="small"
          />
        </Space>
      </div>
      <Timeline mode="left" style={{ maxHeight: 400, overflow: 'auto' }}>
        {filteredEvents.length === 0 ? (
          <Empty description="暂无事件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          filteredEvents.map((event, index) => (
            <Timeline.Item
              key={event.event_id || index}
              color={EVENT_COLORS[event.event_type] || 'gray'}
              dot={EVENT_ICONS[event.event_type] || <MessageOutlined />}
            >
              <div style={{ fontSize: 12 }}>
                <Tag color="blue">{event.event_type}</Tag>
                {event.source_agent && <Text type="secondary" style={{ fontSize: 11 }}> from {event.source_agent}</Text>}
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>{new Date(event.timestamp).toLocaleString()}</Text>
                {event.data && (
                  <pre style={{
                    fontSize: 10,
                    background: 'rgba(0,20,40,0.3)',
                    padding: 4,
                    marginTop: 4,
                    overflow: 'auto',
                    maxHeight: 100,
                    borderRadius: 4,
                  }}>
                    {JSON.stringify(event.data, null, 2).slice(0, 200)}
                  </pre>
                )}
              </div>
            </Timeline.Item>
          ))
        )}
      </Timeline>
    </div>
  );
};
