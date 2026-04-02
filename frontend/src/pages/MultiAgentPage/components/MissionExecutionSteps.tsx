import { Steps } from 'antd';
import { StepItem } from '../constants';

interface MissionExecutionStepsProps {
  steps: StepItem[];
  size?: 'small' | 'default' | 'small';
}

export const MissionExecutionSteps: React.FC<MissionExecutionStepsProps> = ({ steps, size = 'small' }) => {
  const currentStep = steps.findIndex(s => s.status === 'process');
  
  return (
    <Steps
      current={currentStep >= 0 ? currentStep : 0}
      size={size}
      items={steps.map(step => ({
        title: step.title,
        status: step.status,
      }))}
    />
  );
};
