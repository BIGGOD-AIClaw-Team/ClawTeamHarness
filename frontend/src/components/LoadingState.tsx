import React from 'react';
import { Spin } from 'antd';

interface LoadingStateProps {
  tip?: string;
}

export function LoadingState({ tip = '加载中...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <Spin size="large" tip={tip} />
    </div>
  );
}
