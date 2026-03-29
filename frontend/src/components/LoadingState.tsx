import { Spin } from 'antd';

interface LoadingStateProps {
  tip?: string;
}

export function LoadingState({ tip = '加载中...' }: LoadingStateProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 50 }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}
