import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import React from 'react';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(getByText('正常内容')).toBeTruthy();
  });

  it('shows error message when error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('出错了')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();
  });

  it('allows retry after error', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<div>出错了 <button onClick={() => window.location.reload()}>重试</button></div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('重试')).toBeTruthy();
  });
});
