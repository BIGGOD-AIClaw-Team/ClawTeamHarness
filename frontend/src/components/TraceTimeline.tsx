import React from 'react';

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
  const maxDuration = Math.max(...trace.spans.map(s => s.duration_ms || 0));

  return (
    <div className="trace-timeline">
      <div className="trace-header">
        <h4>执行时间线</h4>
        <span>总耗时: {trace.total_duration_ms}ms</span>
      </div>
      
      <div className="spans">
        {trace.spans.map((span, index) => (
          <div 
            key={span.span_id} 
            className={`span-item ${span.status}`}
            style={{ width: `${(span.duration_ms / maxDuration) * 100}%` }}
          >
            <div className="span-name">{span.name}</div>
            <div className="span-duration">{span.duration_ms}ms</div>
            <div className="span-status">{span.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
