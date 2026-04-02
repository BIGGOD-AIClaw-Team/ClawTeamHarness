import React, { useState } from 'react';
import { Switch, Select, Slider, Button, message, Tag } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { SciFiCard } from '../SciFiCard';

// ============ 常量定义 ============
const MEMORY_TYPES = [
  { value: 'short_term', label: '🧠 短期记忆' },
  { value: 'long_term', label: '📚 长期记忆' },
  { value: 'vector', label: '🔢 向量记忆' },
  { value: 'hybrid', label: '🔗 混合记忆 (推荐)' },
];

const WINDOW_TYPES = [
  { value: 'sliding', label: '滑动窗口 (Sliding Window)' },
  { value: 'summary', label: '摘要窗口 (Summary)' },
  { value: 'full', label: '完整上下文 (Full)' },
];

const STORAGE_OPTIONS = [
  { value: 'chroma', label: 'Chroma (本地)', color: '#00d4ff' },
  { value: 'pinecone', label: 'Pinecone (云端)', color: '#10a37f' },
  { value: 'weaviate', label: 'Weaviate (开源)', color: '#7c3aed' },
  { value: 'milvus', label: 'Milvus (开源)', color: '#f59e0b' },
  { value: 'qdrant', label: 'Qdrant (开源)', color: '#ff4757' },
  { value: 'memory', label: '内存 (仅开发)', color: '#888' },
];

// ============ 接口定义 ============
export interface MemoryConfigFormData {
  enabled: boolean;
  type: string;
  // Short-term
  short_term_enabled: boolean;
  max_messages: number;
  window_type: string;
  // Long-term
  long_term_enabled: boolean;
  storage: string;
  top_k: number;
  similarity_threshold: number;
  namespace: string;
  // Vector
  vector_dim: number;
}

interface MemoryTabProps {
  defaultValues?: Partial<MemoryConfigFormData>;
  onValuesChange?: (values: MemoryConfigFormData) => void;
  vectorDim?: number;
}

// ============ 组件 ============
export function MemoryTab({ defaultValues, onValuesChange, vectorDim = 0 }: MemoryTabProps) {
  const [memoryConfig, setMemoryConfig] = useState<MemoryConfigFormData>({
    enabled: true,
    type: 'hybrid',
    short_term_enabled: true,
    max_messages: 50,
    window_type: 'sliding',
    long_term_enabled: false,
    storage: 'chroma',
    top_k: 5,
    similarity_threshold: 0.7,
    namespace: '',
    vector_dim: 0,
    ...defaultValues,
  });

  const [testingRecall, setTestingRecall] = useState(false);
  const [recallResult, setRecallResult] = useState<string | null>(null);

  // 通知父组件
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange(memoryConfig);
    }
  }, [memoryConfig, onValuesChange]);

  const update = (patch: Partial<MemoryConfigFormData>) => {
    setMemoryConfig(prev => ({ ...prev, ...patch }));
  };

  // 测试召回
  const handleTestRecall = async () => {
    setTestingRecall(true);
    setRecallResult(null);
    try {
      const resp = await fetch('/api/memory/test-recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage: memoryConfig.storage,
          namespace: memoryConfig.namespace,
          top_k: memoryConfig.top_k,
          similarity_threshold: memoryConfig.similarity_threshold,
        }),
      });
      const data = await resp.json();
      if (data.error) {
        setRecallResult(`❌ 召回测试失败: ${data.error}`);
        message.error(data.error);
      } else {
        setRecallResult(`✅ 召回测试成功！找到 ${data.recalled || 0} 条记忆`);
        message.success('召回测试成功');
      }
    } catch (e) {
      setRecallResult('❌ 网络错误，请检查后端连接');
      message.error('召回测试失败');
    } finally {
      setTestingRecall(false);
    }
  };

  const isHybrid = memoryConfig.type === 'hybrid' || memoryConfig.type === 'short_term';
  const isLongTerm = memoryConfig.type === 'long_term' || memoryConfig.type === 'hybrid' || memoryConfig.type === 'vector';

  return (
    <div>
      {/* 记忆总开关 */}
      <div style={{
        marginBottom: 20,
        padding: '16px 20px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
        border: `1px solid ${memoryConfig.enabled ? 'rgba(0, 212, 255, 0.4)' : 'rgba(255,255,255,0.1)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              🧠 启用记忆系统
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              控制 Agent 是否使用记忆功能
            </div>
          </div>
          <Switch
            checked={memoryConfig.enabled}
            onChange={v => update({ enabled: v })}
            style={{ background: memoryConfig.enabled ? '#00d4ff' : '#444' }}
          />
        </div>
      </div>

      {!memoryConfig.enabled && (
        <div style={{
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 8,
          border: '1px dashed rgba(0,212,255,0.2)',
          textAlign: 'center',
          color: '#666',
        }}>
          记忆系统已禁用，Agent 将不保留任何上下文记忆
        </div>
      )}

      {memoryConfig.enabled && (
        <>
          {/* 记忆类型 */}
          <SciFiCard title="🎛️ 记忆类型配置" icon="💾">
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                选择记忆模式
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {MEMORY_TYPES.map(type => (
                  <div
                    key={type.value}
                    onClick={() => update({ type: type.value })}
                    style={{
                      padding: '12px 14px',
                      background: memoryConfig.type === type.value
                        ? 'rgba(0, 212, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.3)',
                      border: `1px solid ${memoryConfig.type === type.value ? '#00d4ff' : 'rgba(0, 212, 255, 0.2)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 13, color: memoryConfig.type === type.value ? '#00d4ff' : '#aaa', fontWeight: 600 }}>
                      {type.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SciFiCard>

          {/* 短期记忆 */}
          {(isHybrid || memoryConfig.type === 'short_term') && (
            <SciFiCard title="🧠 短期记忆" icon="⚡">
              <div style={{
                padding: '16px 20px',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>启用短期记忆</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>保留最近 N 条对话上下文</div>
                  </div>
                  <Switch
                    checked={memoryConfig.short_term_enabled}
                    onChange={v => update({ short_term_enabled: v })}
                    style={{ background: memoryConfig.short_term_enabled ? '#3b82f6' : '#444' }}
                  />
                </div>

                {memoryConfig.short_term_enabled && (
                  <>
                    {/* 保留消息数 */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ color: '#888', fontSize: 12 }}>保留消息数</label>
                        <Tag color="blue">{memoryConfig.max_messages} 条</Tag>
                      </div>
                      <Slider
                        min={5}
                        max={200}
                        step={5}
                        value={memoryConfig.max_messages}
                        onChange={v => update({ max_messages: v })}
                        trackStyle={{ background: '#3b82f6' }}
                        handleStyle={{ borderColor: '#3b82f6', background: '#3b82f6' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#666' }}>5条</span>
                        <span style={{ fontSize: 10, color: '#666' }}>200条</span>
                      </div>
                    </div>

                    {/* 窗口类型 */}
                    <div>
                      <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                        窗口类型
                      </label>
                      <Select
                        value={memoryConfig.window_type}
                        onChange={v => update({ window_type: v })}
                        style={{ width: '100%' }}
                        options={WINDOW_TYPES}
                        dropdownStyle={{
                          background: 'rgba(0, 20, 40, 0.95)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: 8,
                        }}
                      />
                      <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                        {memoryConfig.window_type === 'sliding' && '滑动窗口：固定大小，新消息入，旧消息出'}
                        {memoryConfig.window_type === 'summary' && '摘要窗口：保留摘要+最近消息，节省 token'}
                        {memoryConfig.window_type === 'full' && '完整上下文：保留全部历史，最大 token 消耗'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </SciFiCard>
          )}

          {/* 长期记忆 */}
          {isLongTerm && (
            <SciFiCard title="📚 长期记忆 (向量检索)" icon="🔍">
              <div style={{
                padding: '16px 20px',
                background: 'rgba(168, 85, 247, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>启用长期记忆</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>基于向量数据库的持久化记忆</div>
                  </div>
                  <Switch
                    checked={memoryConfig.long_term_enabled}
                    onChange={v => update({ long_term_enabled: v })}
                    style={{ background: memoryConfig.long_term_enabled ? '#a855f7' : '#444' }}
                  />
                </div>

                {memoryConfig.long_term_enabled && (
                  <>
                    {/* 向量存储选择 */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                        向量存储
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {STORAGE_OPTIONS.map(opt => (
                          <div
                            key={opt.value}
                            onClick={() => update({ storage: opt.value })}
                            style={{
                              padding: '6px 12px',
                              background: memoryConfig.storage === opt.value
                                ? `${opt.color}20`
                                : 'rgba(0, 0, 0, 0.3)',
                              border: `1px solid ${memoryConfig.storage === opt.value ? opt.color : 'rgba(0, 212, 255, 0.2)'}`,
                              borderRadius: 6,
                              color: memoryConfig.storage === opt.value ? opt.color : '#888',
                              fontSize: 12,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top K */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ color: '#888', fontSize: 12 }}>Top K 检索数</label>
                        <Tag color="purple">{memoryConfig.top_k} 条</Tag>
                      </div>
                      <Slider
                        min={1}
                        max={20}
                        value={memoryConfig.top_k}
                        onChange={v => update({ top_k: v })}
                        trackStyle={{ background: '#a855f7' }}
                        handleStyle={{ borderColor: '#a855f7', background: '#a855f7' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#666' }}>1条</span>
                        <span style={{ fontSize: 10, color: '#666' }}>20条</span>
                      </div>
                    </div>

                    {/* 相似度阈值 */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ color: '#888', fontSize: 12 }}>相似度阈值</label>
                        <Tag color="cyan">{memoryConfig.similarity_threshold.toFixed(2)}</Tag>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={memoryConfig.similarity_threshold}
                        onChange={v => update({ similarity_threshold: v })}
                        trackStyle={{ background: '#00d4ff' }}
                        handleStyle={{ borderColor: '#00d4ff', background: '#00d4ff' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#666' }}>0 (宽松)</span>
                        <span style={{ fontSize: 10, color: '#666' }}>1 (严格)</span>
                      </div>
                    </div>

                    {/* Namespace */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        Namespace (命名空间)
                      </label>
                      <input
                        type="text"
                        value={memoryConfig.namespace}
                        onChange={e => update({ namespace: e.target.value })}
                        placeholder="可选，用于隔离不同用途的记忆"
                        style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: 6,
                          color: '#e0e6ed',
                          padding: '8px 12px',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                        用于在同一向量数据库中隔离不同 Agent 或用途的记忆
                      </div>
                    </div>

                    {/* 向量维度提示 */}
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 212, 255, 0.05)',
                      borderRadius: 6,
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        向量维度:{' '}
                        <span style={{ color: vectorDim === 0 ? '#f59e0b' : '#00d4ff', fontWeight: 600 }}>
                          {vectorDim === 0 ? '自动检测 (推荐)' : `${vectorDim}维`}
                        </span>
                        {' '}&nbsp;← 与 LLM 模型配置中的向量维度保持一致
                      </div>
                    </div>

                    {/* 测试召回按钮 */}
                    <Button
                      icon={<PlayCircleOutlined />}
                      onClick={handleTestRecall}
                      loading={testingRecall}
                      style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid #a855f7',
                        color: '#a855f7',
                        width: '100%',
                      }}
                    >
                      🧪 测试召回
                    </Button>

                    {recallResult && (
                      <div style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        background: recallResult.startsWith('✅')
                          ? 'rgba(0, 255, 136, 0.1)'
                          : 'rgba(255, 71, 87, 0.1)',
                        borderRadius: 6,
                        border: `1px solid ${recallResult.startsWith('✅') ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                        color: recallResult.startsWith('✅') ? '#00ff88' : '#ff4757',
                        fontSize: 12,
                      }}>
                        {recallResult}
                      </div>
                    )}
                  </>
                )}
              </div>
            </SciFiCard>
          )}
        </>
      )}
    </div>
  );
}
