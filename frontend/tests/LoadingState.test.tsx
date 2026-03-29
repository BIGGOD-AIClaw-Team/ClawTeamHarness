import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingState } from '../src/components/LoadingState';

describe('LoadingState', () => {
  it('renders with default tip', () => {
    const { getByText } = render(<LoadingState />);
    expect(getByText('加载中...')).toBeTruthy();
  });

  it('renders with custom tip', () => {
    const { getByText } = render(<LoadingState tip="处理中..." />);
    expect(getByText('处理中...')).toBeTruthy();
  });
});
