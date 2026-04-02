import { Input, Button, Space, Tag, message, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { SciFiCard } from '../SciFiCard';
import { useForm, Controller, useFieldArray } from 'react-hook-form';

const { TextArea } = Input;

const { Panel } = Collapse;

// ============ 接口定义 ============
export interface FewShotExample {
  id: string;
  input: string;
  output: string;
}

export interface PromptConfigFormData {
  system: string;
  user_template: string;
  few_shot_examples: FewShotExample[];
}

interface PromptTabProps {
  defaultValues?: Partial<PromptConfigFormData>;
  onValuesChange?: (values: PromptConfigFormData) => void;
}

// ============ 预设变量 ============
const PRESET_VARIABLES = [
  { value: '{input}', label: '{input}', description: '用户输入' },
  { value: '{history}', label: '{history}', description: '对话历史' },
  { value: '{context}', label: '{context}', description: '上下文信息' },
  { value: '{time}', label: '{time}', description: '当前时间' },
  { value: '{date}', label: '{date}', description: '当前日期' },
  { value: '{user_name}', label: '{user_name}', description: '用户名' },
];

// ============ 预设提示词模板 ============
const PROMPT_TEMPLATES = [
  {
    value: 'assistant',
    label: '🤖 AI 助手',
    template: '你是一个专业、友好的AI助手，帮助用户解答问题、完成各种任务。\n\n请遵循以下原则：\n1. 准确、简洁地回答问题\n2. 如果不确定，明确说明\n3. 主动提供有用的补充信息',
  },
  {
    value: 'coder',
    label: '💻 代码助手',
    template: '你是一个经验丰富的程序员，擅长Python、JavaScript、TypeScript、Go等语言。\n\n你的职责：\n1. 编写高质量、可维护的代码\n2. 调试和修复 bug\n3. 优化代码性能\n4. 解释代码逻辑和技术细节\n\n请确保代码符合最佳实践。',
  },
  {
    value: 'analyst',
    label: '📊 分析师',
    template: '你是一个专业的数据分析师，擅长分析数据、发现规律、提供洞察和建议。\n\n分析框架：\n1. 数据收集与清洗\n2. 探索性数据分析\n3. 规律发现与假设验证\n4. 洞察提炼与建议提出\n\n请用数据和事实支撑你的分析结论。',
  },
  {
    value: 'tactical',
    label: '⚔️ 战术分析',
    template: '你是一个专业的战术情报分析助手。\n\n你的职责包括：\n1. 收集和分析战场情报\n2. 评估敌我双方战力对比\n3. 提供战术建议和行动方案\n\n始终保持客观、严谨的分析态度。',
  },
];

// ============ 组件 ============
export function PromptTab({ defaultValues, onValuesChange }: PromptTabProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromptConfigFormData>({
    defaultValues: {
      system: '',
      user_template: '{input}',
      few_shot_examples: [],
      ...defaultValues,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'few_shot_examples',
  });

  const watchedValues = watch();

  // 向父组件通知变化
  if (onValuesChange) {
    onValuesChange(watchedValues);
  }

  // 插入变量到末尾（简化版本）
  const insertVariable = (variable: string) => {
    setValue('system', watchedValues.system + variable);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  return (
    <div>
      {/* System Prompt */}
      <SciFiCard title="📝 System Prompt" icon="💬">
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#888', fontSize: 12 }}>
              系统提示词 <span style={{ color: '#ff4757' }}>*</span>
            </label>
            <Space size={4}>
              <span style={{ fontSize: 11, color: '#666' }}>快速插入：</span>
              {PRESET_VARIABLES.slice(0, 4).map(v => (
                <Tag
                  key={v.value}
                  onClick={() => insertVariable(v.value)}
                  style={{
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                >
                  {v.label}
                </Tag>
              ))}
            </Space>
          </div>

          <Controller
            name="system"
            control={control}
            rules={{ required: '请输入 System Prompt' }}
            render={({ field }) => (
              <TextArea
                {...field}
                ref={null}
                rows={8}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${errors.system ? '#ff4757' : 'rgba(0, 212, 255, 0.3)'}`,
                  borderRadius: '6px',
                  color: '#e0e6ed',
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  fontSize: 13,
                }}
                placeholder={`你是一个人工智能助手...

你可以使用的工具：
- 搜索：搜索互联网信息
- 计算：执行数学计算
- 代码：编写和运行代码

请以专业、友好的方式回答用户的问题。`}
              />
            )}
          />
          {errors.system && (
            <div style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.system.message}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#666' }}>
              字符数：{watchedValues.system.length} | 建议长度：100-2000 字符
            </div>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(watchedValues.system)}
              style={{ color: '#888' }}
            >
              复制
            </Button>
          </div>
        </div>

        {/* 提示词模板 */}
        <Collapse
          ghost
          style={{
            background: 'transparent',
            border: 'none',
          }}
        >
          <Panel
            header={<span style={{ color: '#888', fontSize: 12 }}>📚 从模板选择</span>}
            key="templates"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {PROMPT_TEMPLATES.map(tpl => (
                <div
                  key={tpl.value}
                  onClick={() => setValue('system', tpl.template)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                    {tpl.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>
                    {tpl.template.substring(0, 60)}...
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>
      </SciFiCard>

      {/* 用户输入模板 */}
      <SciFiCard title="👤 用户输入模板" icon="📨">
        <div style={{ marginBottom: 8 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            用户输入模板
          </label>
          <Controller
            name="user_template"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#e0e6ed',
                }}
                placeholder="{input}"
              />
            )}
          />
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            定义用户输入的格式，支持变量：{PRESET_VARIABLES.map(v => (
              <Tag
                key={v.value}
                onClick={() => setValue('user_template', watchedValues.user_template + v.value)}
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  color: '#00d4ff',
                  cursor: 'pointer',
                  margin: '0 2px',
                }}
              >
                {v.label}
              </Tag>
            ))}
          </div>
        </div>
      </SciFiCard>

      {/* Few-Shot 示例 */}
      <SciFiCard title="🎯 Few-Shot 示例" icon="📋">
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <label style={{ color: '#888', fontSize: 12 }}>
                Few-Shot 示例 <span style={{ color: '#666', fontWeight: 400 }}>（可选）</span>
              </label>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                提供示例来帮助模型理解期望的输出格式
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                append({
                  id: `example_${Date.now()}`,
                  input: '',
                  output: '',
                });
              }}
              style={{
                background: 'rgba(0, 212, 255, 0.2)',
                border: '1px solid #00d4ff',
                color: '#00d4ff',
              }}
            >
              添加示例
            </Button>
          </div>

          {/* 示例列表 */}
          {fields.length === 0 ? (
            <div style={{
              padding: '32px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              border: '1px dashed rgba(0, 212, 255, 0.2)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>暂无示例</div>
              <div style={{ fontSize: 12, color: '#555' }}>
                点击上方按钮添加 Few-Shot 示例
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  style={{
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 8,
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    position: 'relative',
                  }}
                >
                  {/* 示例编号 */}
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    left: 12,
                    padding: '2px 8px',
                    background: 'rgba(0, 20, 40, 0.95)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: 4,
                    color: '#00d4ff',
                    fontSize: 11,
                  }}>
                    示例 {index + 1}
                  </div>

                  {/* 删除按钮 */}
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(index)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }}
                  />

                  {/* 输入 */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 4 }}>
                      输入 (Input)
                    </label>
                    <Controller
                      name={`few_shot_examples.${index}.input`}
                      control={control}
                      render={({ field }) => (
                        <TextArea
                          {...field}
                          rows={2}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            borderRadius: '6px',
                            color: '#e0e6ed',
                            resize: 'none',
                            fontSize: 12,
                          }}
                          placeholder="用户输入..."
                        />
                      )}
                    />
                  </div>

                  {/* 输出 */}
                  <div>
                    <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 4 }}>
                      输出 (Output)
                    </label>
                    <Controller
                      name={`few_shot_examples.${index}.output`}
                      control={control}
                      render={({ field }) => (
                        <TextArea
                          {...field}
                          rows={3}
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            borderRadius: '6px',
                            color: '#e0e6ed',
                            resize: 'none',
                            fontSize: 12,
                          }}
                          placeholder="期望的输出..."
                        />
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 统计 */}
          {fields.length > 0 && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(0, 212, 255, 0.05)',
              borderRadius: 6,
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}>
              <div style={{ color: '#00d4ff', fontSize: 12 }}>
                共 {fields.length} 个示例
              </div>
            </div>
          )}
        </div>
      </SciFiCard>
    </div>
  );
}
