import React, { useState } from 'react';
import { Switch, Slider, Input, Tag, Tooltip } from 'antd';
import { QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { SciFiCard } from '../SciFiCard';

const { TextArea } = Input;

// ============ 常量定义 ============
const LOW_CONFIDENCE_ACTIONS = [
  { value: 'ask_user', label: '🤝 询问用户', description: '不确定时主动询问用户意见' },
  { value: 'defer', label: '⏳ 延迟回答', description: '等待更多信息后再回答' },
  { value: 'safe_default', label: '🛡️ 安全默认值', description: '返回安全的默认回复' },
  { value: 'refuse', label: '🚫 拒绝回答', description: '明确表示无法回答' },
  { value: 'use_fallback', label: '🔄 使用备用方案', description: '切换到备用模型或策略' },
  { value: 'reason_more', label: '🔍 继续推理', description: '增加推理深度重新尝试' },
];

const CRITIQUE_TEMPLATES = [
  {
    value: 'default',
    label: '🔍 默认审查模板',
    template: '请审查以下回答的准确性和完整性：\n\n问题：{question}\n回答：{answer}\n\n请指出任何潜在的错误、遗漏或不准确之处。',
  },
  {
    value: 'strict',
    label: '⚔️ 严格审查模板',
    template: '作为严格评审员，请仔细审查以下回答：\n\n问题：{question}\n回答：{answer}\n\n评估标准：\n1. 事实准确性（0-10分）\n2. 完整性（0-10分）\n3. 逻辑性（0-10分）\n4. 实用性（0-10分）\n\n请提供详细的问题分析。',
  },
  {
    value: 'tactical',
    label: '⚔️ 战术审查模板',
    template: '战术情报审查：\n\n输入：{question}\n分析结果：{answer}\n\n请从以下维度评估：\n1. 情报可信度评级\n2. 潜在偏差分析\n3. 补充情报建议\n4. 行动建议优先级',
  },
];

// ============ 接口定义 ============
export interface DecisionConfigFormData {
  auto_critique: boolean;
  critique_prompt: string;
  confidence_threshold: number;
  low_confidence_action: string;
  allow_replan: boolean;
  max_replans: number;
}

interface DecisionTabProps {
  defaultValues?: Partial<DecisionConfigFormData>;
  onValuesChange?: (values: DecisionConfigFormData) => void;
}

// ============ 组件 ============
export function DecisionTab({ defaultValues, onValuesChange }: DecisionTabProps) {
  const [config, setConfig] = useState<DecisionConfigFormData>({
    auto_critique: false,
    critique_prompt: CRITIQUE_TEMPLATES[0].template,
    confidence_threshold: 0.7,
    low_confidence_action: 'ask_user',
    allow_replan: true,
    max_replans: 3,
    ...defaultValues,
  });

  // 通知父组件
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange(config);
    }
  }, [config, onValuesChange]);

  const update = (patch: Partial<DecisionConfigFormData>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  };

  const getConfidenceColor = (value: number) => {
    if (value >= 0.8) return '#00ff88';
    if (value >= 0.5) return '#f59e0b';
    return '#ff4757';
  };

  return (
    <div>
      {/* ========== 自检控制 ========== */}
      <SciFiCard title="🔍 自检与批判性思考" icon="🧠">
        <div style={{
          marginBottom: 16,
          padding: '16px 20px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 8,
          border: `1px solid ${config.auto_critique ? 'rgba(0, 255, 136, 0.4)' : 'rgba(0, 212, 255, 0.2)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                启用自动自检
                <Tooltip title="Agent 在生成回答前会自动审查自己的输出，提高质量">
                  <QuestionCircleOutlined style={{ color: '#888', fontSize: 12 }} />
                </Tooltip>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                启用后 Agent 会对回答进行批判性审查
              </div>
            </div>
            <Switch
              checked={config.auto_critique}
              onChange={v => update({ auto_critique: v })}
              style={{ background: config.auto_critique ? '#00ff88' : '#444' }}
            />
          </div>
        </div>

        {config.auto_critique && (
          <>
            {/* 审查模板选择 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                审查提示词模板
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
                {CRITIQUE_TEMPLATES.map(tpl => (
                  <div
                    key={tpl.value}
                    onClick={() => update({ critique_prompt: tpl.template })}
                    style={{
                      padding: '10px 14px',
                      background: config.critique_prompt === tpl.template
                        ? 'rgba(0, 255, 136, 0.1)'
                        : 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${config.critique_prompt === tpl.template ? '#00ff88' : 'rgba(0, 212, 255, 0.2)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 12, color: config.critique_prompt === tpl.template ? '#00ff88' : '#fff', fontWeight: 600 }}>
                      {tpl.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* 自定义审查提示词 */}
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>
                自定义审查提示词
              </label>
              <TextArea
                value={config.critique_prompt}
                onChange={e => update({ critique_prompt: e.target.value })}
                rows={5}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: 6,
                  color: '#e0e6ed',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
                placeholder="请审查以下回答的准确性..."
              />
              <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                可用变量: <code style={{ color: '#00d4ff' }}>{'{question}'}</code> <code style={{ color: '#00d4ff' }}>{'{answer}'}</code>
              </div>
            </div>
          </>
        )}
      </SciFiCard>

      {/* ========== 置信度控制 ========== */}
      <SciFiCard title="📊 置信度与决策控制" icon="📐">
        {/* 置信度阈值 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              置信度阈值
              <Tooltip title="当模型对回答的置信度低于此值时，触发低置信度动作">
                <QuestionCircleOutlined style={{ color: '#888', fontSize: 11 }} />
              </Tooltip>
            </label>
            <Tag
              style={{
                background: `${getConfidenceColor(config.confidence_threshold)}20`,
                border: `1px solid ${getConfidenceColor(config.confidence_threshold)}`,
                color: getConfidenceColor(config.confidence_threshold),
                fontWeight: 600,
              }}
            >
              {config.confidence_threshold.toFixed(2)}
            </Tag>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={config.confidence_threshold}
            onChange={v => update({ confidence_threshold: v })}
            trackStyle={{ background: getConfidenceColor(config.confidence_threshold) }}
            handleStyle={{
              borderColor: getConfidenceColor(config.confidence_threshold),
              background: getConfidenceColor(config.confidence_threshold),
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#ff4757' }}>低 (0) - 容易触发</span>
            <span style={{ fontSize: 10, color: '#00ff88' }}>高 (1) - 严格标准</span>
          </div>

          {/* 置信度颜色条 */}
          <div style={{
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #ff4757 0%, #f59e0b 50%, #00ff88 100%)',
            marginTop: 8,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              left: `${config.confidence_threshold * 100}%`,
              top: '-4px',
              width: 2,
              height: 12,
              background: '#fff',
              borderRadius: 1,
              boxShadow: '0 0 6px rgba(255,255,255,0.5)',
            }} />
          </div>
        </div>

        {/* 低置信度动作 */}
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
            低置信度时的动作
            <Tooltip title="当置信度低于阈值时，Agent 会执行此动作">
              <WarningOutlined style={{ color: '#f59e0b', marginLeft: 6, fontSize: 11 }} />
            </Tooltip>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {LOW_CONFIDENCE_ACTIONS.map(action => (
              <div
                key={action.value}
                onClick={() => update({ low_confidence_action: action.value })}
                style={{
                  padding: '12px 14px',
                  background: config.low_confidence_action === action.value
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${config.low_confidence_action === action.value ? '#f59e0b' : 'rgba(0, 212, 255, 0.2)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 12, color: config.low_confidence_action === action.value ? '#f59e0b' : '#fff', fontWeight: 600, marginBottom: 2 }}>
                  {action.label}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {action.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SciFiCard>

      {/* ========== 重新规划控制 ========== */}
      <SciFiCard title="🔄 重新规划控制" icon="🔁">
        <div style={{
          padding: '16px 20px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 8,
          border: `1px solid ${config.allow_replan ? 'rgba(124, 58, 237, 0.4)' : 'rgba(0, 212, 255, 0.2)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                允许重新规划
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                当原规划失败时，允许重新生成执行计划
              </div>
            </div>
            <Switch
              checked={config.allow_replan}
              onChange={v => update({ allow_replan: v })}
              style={{ background: config.allow_replan ? '#7c3aed' : '#444' }}
            />
          </div>

          {config.allow_replan && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ color: '#888', fontSize: 12 }}>
                  最大重新规划次数
                </label>
                <Tag color="purple">{config.max_replans} 次</Tag>
              </div>
              <Slider
                min={1}
                max={10}
                value={config.max_replans}
                onChange={v => update({ max_replans: v })}
                trackStyle={{ background: '#7c3aed' }}
                handleStyle={{ borderColor: '#7c3aed', background: '#7c3aed' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#666' }}>1次</span>
                <span style={{ fontSize: 10, color: '#666' }}>10次</span>
              </div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 8 }}>
                当重新规划次数超过此限制后，将停止重试并返回当前最佳结果
              </div>
            </div>
          )}
        </div>
      </SciFiCard>

      {/* ========== 决策建议 ========== */}
      <SciFiCard title="💡 决策控制建议" icon="💡">
        <div style={{
          padding: '16px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: 8,
          border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: 12,
          color: '#888',
          lineHeight: 1.7,
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: '#60a5fa' }}>置信度阈值建议：</strong>
            <ul style={{ paddingLeft: 16, margin: '6px 0' }}>
              <li>高风险场景（医疗、法律）→ <span style={{ color: '#00ff88' }}>0.8-0.9</span></li>
              <li>一般场景 → <span style={{ color: '#f59e0b' }}>0.6-0.8</span></li>
              <li>创意/探索性任务 → <span style={{ color: '#ff4757' }}>0.4-0.6</span></li>
            </ul>
          </div>
          <div>
            <strong style={{ color: '#60a5fa' }}>重新规划建议：</strong>
            <ul style={{ paddingLeft: 16, margin: '6px 0' }}>
              <li>简单任务 → <span style={{ color: '#888' }}>关闭或 1-2 次</span></li>
              <li>复杂多步骤任务 → <span style={{ color: '#a855f7' }}>3-5 次</span></li>
              <li>开放式探索 → <span style={{ color: '#7c3aed' }}>5-10 次</span></li>
            </ul>
          </div>
        </div>
      </SciFiCard>
    </div>
  );
}
