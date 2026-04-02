import React from 'react';
import { Input, Select, Tag, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { SciFiCard } from '../SciFiCard';
import { useForm, Controller } from 'react-hook-form';

const { TextArea } = Input;

// ============ 常量定义 ============
const PRESET_ICONS = ['🤖', '🛡️', '💻', '📊', '🎯', '🔍', '⚔️', '📋', '💡', '🔮', '🎨', '📚', '🏆', '⭐', '🚀', '🎭'];

const CATEGORIES = [
  { value: 'general', label: '🌐 通用' },
  { value: 'analysis', label: '📊 分析' },
  { value: 'tactical', label: '⚔️ 战术' },
  { value: 'coding', label: '💻 编程' },
  { value: 'creative', label: '🎨 创意' },
  { value: 'knowledge', label: '📚 知识' },
  { value: 'assistant', label: '🤝 助手' },
  { value: 'research', label: '🔬 研究' },
];

// ============ 接口定义 ============
export interface BasicInfoFormData {
  name: string;
  agent_id: string;
  description: string;
  icon: string;
  tags: string[];
  category: string;
}

interface BasicInfoTabProps {
  defaultValues?: Partial<BasicInfoFormData>;
  onValuesChange?: (values: BasicInfoFormData) => void;
}

// ============ 组件 ============
export function BasicInfoTab({ defaultValues, onValuesChange }: BasicInfoTabProps) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BasicInfoFormData>({
    defaultValues: {
      name: '',
      agent_id: '',
      description: '',
      icon: '🤖',
      tags: [],
      category: 'general',
      ...defaultValues,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // 向父组件通知变化
  if (onValuesChange) {
    onValuesChange(watchedValues);
  }

  // 自动生成 agent_id
  const generateAgentId = (name: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    // 如果 agent_id 为空或由名称自动生成，则同步更新
    const currentAgentId = watch('agent_id');
    if (!currentAgentId || currentAgentId === generateAgentId(watchedValues.name)) {
      setValue('agent_id', generateAgentId(name));
    }
  };

  const [tagInput, setTagInput] = React.useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !watchedValues.tags.includes(trimmed)) {
      setValue('tags', [...watchedValues.tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue('tags', watchedValues.tags.filter(t => t !== tag));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {/* 基本信息卡片 */}
      <SciFiCard title="基本信息" icon="📋">
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            Agent 名称 <span style={{ color: '#ff4757' }}>*</span>
          </label>
          <Controller
            name="name"
            control={control}
            rules={{ required: '请输入 Agent 名称' }}
            render={({ field }) => (
              <Input
                {...field}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${errors.name ? '#ff4757' : 'rgba(0, 212, 255, 0.3)'}`,
                  borderRadius: '6px',
                  color: '#e0e6ed',
                }}
                placeholder="给 Agent 起个名字"
                onChange={(e) => {
                  field.onChange(e);
                  handleNameChange(e);
                }}
              />
            )}
          />
          {errors.name && (
            <div style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.name.message}</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
            Agent ID <span style={{ color: '#666', fontSize: 11 }}>（唯一标识）</span>
          </label>
          <Controller
            name="agent_id"
            control={control}
            rules={{
              pattern: {
                value: /^[a-z][a-z0-9_]*$/,
                message: '仅支持小写字母、数字、下划线，以字母开头',
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${errors.agent_id ? '#ff4757' : 'rgba(0, 212, 255, 0.3)'}`,
                  borderRadius: '6px',
                  color: '#e0e6ed',
                }}
                placeholder="自动生成，也可手动编辑"
                suffix={
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setValue('agent_id', generateAgentId(watchedValues.name))}
                    style={{ color: '#00d4ff', fontSize: 10, padding: '0 4px' }}
                  >
                    重新生成
                  </Button>
                }
              />
            )}
          />
          {errors.agent_id && (
            <div style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.agent_id.message}</div>
          )}
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            用于 API 调用，如: <code style={{ color: '#00d4ff' }}>tactical_analyst</code>
          </div>
        </div>

        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>描述</label>
          <Controller
            name="description"
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
                }}
                placeholder="描述这个 Agent 的用途和能力..."
              />
            )}
          />
        </div>
      </SciFiCard>

      {/* 外观配置卡片 */}
      <SciFiCard title="外观配置" icon="🎨">
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>图标</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_ICONS.map((icon) => (
              <div
                key={icon}
                onClick={() => setValue('icon', icon)}
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  background: watchedValues.icon === icon
                    ? 'rgba(0, 212, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${watchedValues.icon === icon ? '#00d4ff' : 'rgba(0, 212, 255, 0.2)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
            分类
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                options={CATEGORIES}
                dropdownStyle={{
                  background: 'rgba(0, 20, 40, 0.95)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: 8,
                }}
              />
            )}
          />
        </div>

        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>标签</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {watchedValues.tags.map((tag) => (
              <Tag
                key={tag}
                closable
                onClose={() => removeTag(tag)}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onPressEnter={() => {
              addTag(tagInput);
              setTagInput('');
            }}
            onBlur={() => {
              if (tagInput.trim()) {
                addTag(tagInput);
              }
            }}
            placeholder="输入标签后按 Enter 添加"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '6px',
              color: '#e0e6ed',
            }}
            suffix={
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  addTag(tagInput);
                  setTagInput('');
                }}
                style={{ color: '#00d4ff', padding: '0 4px' }}
              />
            }
          />
          <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
            用于分类和搜索，如: <span style={{ color: '#60a5fa' }}>战术</span> <span style={{ color: '#60a5fa' }}>分析</span>
          </div>
        </div>
      </SciFiCard>
    </div>
  );
}
