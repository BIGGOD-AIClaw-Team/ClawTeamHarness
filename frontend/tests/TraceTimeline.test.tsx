import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TraceTimeline } from '../src/components/TraceTimeline';

describe('TraceTimeline', () => {
  it('renders trace header with total duration', () => {
    const mockTrace = {
      trace_id: 'test-123',
      total_duration_ms: 500,
      spans: [
        { span_id: '1', name: 'step1', duration_ms: 200, status: 'ok', start_time: 0 },
        { span_id: '2', name: 'step2', duration_ms: 300, status: 'ok', start_time: 200 },
      ],
    };

    const { getByText } = render(<TraceTimeline trace={mockTrace} />);
    expect(getByText('执行时间线')).toBeTruthy();
    expect(getByText('总耗时: 500ms')).toBeTruthy();
  });

  it('renders all spans', () => {
    const mockTrace = {
      trace_id: 'test-123',
      total_duration_ms: 500,
      spans: [
        { span_id: '1', name: 'step1', duration_ms: 200, status: 'ok', start_time: 0 },
        { span_id: '2', name: 'step2', duration_ms: 300, status: 'error', start_time: 200 },
      ],
    };

    const { getByText } = render(<TraceTimeline trace={mockTrace} />);
    expect(getByText('step1')).toBeTruthy();
    expect(getByText('step2')).toBeTruthy();
  });
});
