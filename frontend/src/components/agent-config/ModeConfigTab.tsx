import { InputNumber, Switch, Divider } from 'antd';
import { SciFiCard } from '../SciFiCard';
import { useForm, Controller } from 'react-hook-form';
import React from 'react';

// ============ 常量定义 ============
const AGENT_MODE_CARDS = [
  {
    value: 'react',
    label: 'ReAct',
    badge: '推荐',
    badgeColor: '#10a37f',
    icon: '🔄',
    description: '思考 → 行动 → 观察 → ...',
    detail: '通过思考-行动-观察循环进行推理，适合需要调用工具的复杂任务。',
   适用场景: ['工具调用', '复杂推理', '多步骤任务'],
  },
  {
    value: 'plan_and_execute',
    label: 'Plan-and-Execute',
    badge: '规划',
    badgeColor: '#7c3aed',
    icon: '📐',
    description: '先计划，再执行',
    detail: '先制定完整计划，然后按顺序执行。适合有明确步骤的复杂任务。',
    适用场景: ['项目规划', '复杂任务分解', '批量执行'],
  },
  {
    value: 'chat_conversation',
    label: 'Chat Conversation',
    badge: '简单',
    badgeColor: '#3b82f6',
    icon: '💬',
    description: '纯对话模式',
    detail: '简单的对话模式，不支持工具调用。适合简单问答和客服场景。',
    适用场景: ['问答', '客服', '闲聊'],
  },
  {
    value: 'baby_agi',
    label: 'Baby AGI',
    badge: '自主',
    badgeColor: '#f59e0b',
    icon: '👶',
    description: '自主任务分解与执行',
    detail: '自主分解目标为子任务，存储结果，循环执行直到完成。适合开放性目标驱动任务。',
    适用场景: ['目标驱动', '研究助理', '自动化工作流'],
  },
  {
    value: 'auto_gpt',
    label: 'AutoGPT',
    badge: '自主',
    badgeColor: '#ff4757',
    icon: '🤖',
    description: '自主决策循环',
    detail: '端到端自主任务执行：接收反馈 → 重新评估 → 选择动作 → 执行。适合需要持续自主决策的任务。',
    适用场景: ['自动化助手', '持续性任务', '端到端执行'],
  },
];

const STOP_CONDITIONS = [
  { value: 'answer_found', label: '找到明确答案' },
  { value: 'max_steps', label: '达到最大迭代' },
  { value: 'error', label: '遇到错误' },
  { value: 'confidence_high', label: '高置信度' },
];

// ============ 接口定义 ============
export interface ModeConfigFormData {
  type: string;
  max_iterations: number;
  max_iterations_per_step: number;
  early_stopping: boolean;
  stop_when: string[];
}

interface ModeConfigTabProps {
  defaultValues?: Partial<ModeConfigFormData>;
  onValuesChange?: (values: ModeConfigFormData) => void;
}

// ============ 组件 ============
export function ModeConfigTab({ defaultValues, onValuesChange }: ModeConfigTabProps) {
  const {
    control,
    watch,
  } = useForm<ModeConfigFormData>({
    defaultValues: {
      type: 'react',
      max_iterations: 10,
      max_iterations_per_step: 5,
      early_stopping: true,
      stop_when: ['answer_found', 'max_steps'],
      ...defaultValues,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // 向父组件通知变化
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange(watchedValues);
    }
  }, [watchedValues, onValuesChange]);

  const selectedMode = AGENT_MODE_CARDS.find(m => m.value === watchedValues.type);

  // Chat 模式下隐藏 max_iterations 相关配置
  const isChatMode = watchedValues.type === 'chat_conversation';

  return (
    <div>
      {/* 模式选择 */}
      <SciFiCard title="⚙️ Agent 模式" icon="🔧">
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
            选择 Agent 的运行模式
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {AGENT_MODE_CARDS.map(mode => (
            <div
              key={mode.value}
              onClick={() => {
                // Chat 模式下不允许选择其他需要迭代的模式
                if (mode.value !== 'chat_conversation' && isChatMode) {
                  return;
                }
                // 不允许从 Chat 切换到其他模式
                if (watchedValues.type === 'chat_conversation' && mode.value !== 'chat_conversation') {
                  return;
                }
                // TODO: 解除注释以启用限制
                // return;
              }}
              style={{
                padding: '16px',
                background: watchedValues.type === mode.value
                  ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: `2px solid ${watchedValues.type === mode.value ? mode.badgeColor : 'rgba(0, 212, 255, 0.2)'}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                opacity: (isChatMode && mode.value !== 'chat_conversation') ? 0.5 : 1,
              }}
            >
              {/* 标签 */}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: '2px 8px',
                background: `${mode.badgeColor}20`,
                border: `1px solid ${mode.badgeColor}`,
                borderRadius: 4,
                color: mode.badgeColor,
                fontSize: 10,
                fontWeight: 600,
              }}>
                {mode.badge}
              </div>

              {/* 图标 */}
              <div style={{ fontSize: 28, marginBottom: 8 }}>{mode.icon}</div>

              {/* 名称 */}
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                {mode.label}
              </div>

              {/* 描述 */}
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                {mode.description}
              </div>

              {/* 适用场景 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {mode.适用场景.map(s => (
                  <span
                    key={s}
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      borderRadius: 4,
                      color: '#00d4ff',
                      fontSize: 10,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 选中模式说明 */}
        {selectedMode && (
          <div style={{
            marginTop: 16,
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: `1px solid ${selectedMode.badgeColor}40`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{selectedMode.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{selectedMode.label}</span>
            </div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              {selectedMode.detail}
            </div>
          </div>
        )}
      </SciFiCard>

      {/* 迭代配置 - Chat 模式下隐藏 */}
      {!isChatMode && (
        <SciFiCard title="🔄 迭代控制" icon="⚡">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {/* 最大迭代次数 */}
            <div>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
                最大迭代次数
              </label>
              <Controller
                name="max_iterations"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    min={1}
                    max={100}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#e0e6ed',
                      width: '100%',
                    }}
                  />
                )}
              />
              <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Agent 执行的最大循环次数，达到后自动停止
              </div>
            </div>

            {/* 每步最大工具调用次数 */}
            {watchedValues.type === 'react' && (
              <div>
                <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
                  每步最大工具调用
                </label>
                <Controller
                  name="max_iterations_per_step"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      min={1}
                      max={20}
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#e0e6ed',
                        width: '100%',
                      }}
                    />
                  )}
                />
                <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                  单次推理中允许的最大工具调用数
                </div>
              </div>
            )}
          </div>

          <Divider style={{ borderColor: 'rgba(0, 212, 255, 0.2)' }} />

          {/* 提前停止 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>提前停止</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                达到条件后自动停止执行
              </div>
            </div>
            <Controller
              name="early_stopping"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  style={{ background: field.value ? '#00d4ff' : '#444' }}
                />
              )}
            />
          </div>

          {/* 停止条件 */}
          {watchedValues.early_stopping && (
            <div>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                停止条件
              </label>
              <Controller
                name="stop_when"
                control={control}
                render={({ field }) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STOP_CONDITIONS.map(condition => (
                      <div
                        key={condition.value}
                        onClick={() => {
                          if (field.value.includes(condition.value)) {
                            field.onChange(field.value.filter((v: string) => v !== condition.value));
                          } else {
                            field.onChange([...field.value, condition.value]);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: field.value.includes(condition.value)
                            ? 'rgba(0, 212, 255, 0.2)'
                            : 'rgba(0, 0, 0, 0.3)',
                          border: `1px solid ${field.value.includes(condition.value) ? '#00d4ff' : 'rgba(0, 212, 255, 0.2)'}`,
                          borderRadius: 6,
                          color: field.value.includes(condition.value) ? '#00d4ff' : '#888',
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {condition.label}
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          )}
        </SciFiCard>
      )}

      {/* Chat 模式提示 */}
      {isChatMode && (
        <SciFiCard title="💡 Chat 模式说明" icon="ℹ️">
          <div style={{
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: '#60a5fa' }}>Chat Conversation</strong> 模式是纯对话模式，不支持工具调用和迭代执行。
              </p>
              <p style={{ marginBottom: 8 }}>
                适用于：
              </p>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>简单问答</li>
                <li>客服对话</li>
                <li>闲聊</li>
                <li>内容生成</li>
              </ul>
              <p style={{ margin: 0 }}>
                如果需要工具调用能力，建议选择 <strong style={{ color: '#10a37f' }}>ReAct</strong> 模式。
              </p>
            </div>
          </div>
        </SciFiCard>
      )}
    </div>
  );
}
