import { Descriptions, Tag } from 'antd';

interface Span {
  span_id: string;
  name: string;
  duration_ms: number;
  status: 'ok' | 'error';
  start_time: number;
  input?: any;
  output?: any;
}

interface TraceTimelineProps {
  trace: {
    trace_id: string;
    total_duration_ms: number;
    spans: Span[];
  };
}

export function TraceTimeline({ trace }: TraceTimelineProps) {
  return (
    <div>
      <Descriptions title="执行追踪" size="small">
        <Descriptions.Item label="Trace ID">{trace.trace_id}</Descriptions.Item>
        <Descriptions.Item label="总耗时">{trace.total_duration_ms}ms</Descriptions.Item>
        <Descriptions.Item label="Span 数量">{trace.spans.length}</Descriptions.Item>
      </Descriptions>
      
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {trace.spans.map((span) => (
          <div key={span.span_id} style={{ 
            padding: '8px 12px', 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Tag color={span.status === 'ok' ? 'green' : 'red'}>{span.status}</Tag>
            <span style={{ fontWeight: 'bold' }}>{span.name}</span>
            <span style={{ color: '#888' }}>{span.duration_ms}ms</span>
          </div>
        ))}
        {trace.spans.length === 0 && <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>暂无追踪数据</div>}
      </div>
    </div>
  );
}
