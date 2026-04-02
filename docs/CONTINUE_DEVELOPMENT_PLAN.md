# ClawTeamHarness 继续开发计划

> 版本: V2.1  
> 日期: 2026-04-02  
> 状态: **待分配任务**

---

## 一、当前状态

### 已完成模块 ✅

| 模块 | 状态 |
|------|------|
| Pydantic模型 (config_models.py) | ✅ |
| Agent Factory | ✅ |
| 5种Agent模式 (modes/) | ✅ |
| 记忆管理器 (memory/manager.py) | ✅ |
| AgentEngine | ✅ |
| AgentConfigPageV3 | ✅ |
| MultiAgentPage | ✅ |
| SkillsOrchestratorPage | ✅ |

### 需修复问题 ❌

| 问题 | 文件 | 严重性 |
|------|------|--------|
| TypeScript编译错误 | WorkflowPage.tsx | 🔴 高 |
| 未使用变量警告 | ToolsTab.tsx, WorkflowPage.tsx | 🟡 中 |
| Type类型不匹配 | WorkflowPage.tsx | 🔴 高 |

---

## 二、待完成任务

### P0: 必须修复

#### 2.1 TypeScript编译错误修复 🔴
**问题**: WorkflowPage.tsx有类型不匹配错误，导致无法构建

**错误信息**:
```
Type 'string' is not assignable to type '"end" | "start" | "llm" | "mcp" | "skill" | "condition" | "agent"'
```

**修复方案**: 使用 `as const` 或类型断言确保类型安全

---

#### 2.2 未使用变量清理 🟡
**文件**: 
- `ToolsTab.tsx` - TextArea未使用
- `WorkflowPage.tsx` - 多个import未使用

**修复**: 删除未使用的import

---

### P1: 继续开发

#### 2.3 多Agent协同配置（Phase 1）🔴
**文件**: `MultiAgentPage.tsx` 增强

**功能**:
- 支持配置协商模式（文件/协议/混合）
- 团队成员独立配置
- 工作流编排

**参考文档**: `docs/MULTI_AGENT_COLLABORATION_DESIGN.md`

---

#### 2.4 后端API完善
**文件**: `backend/src/api/routes/agents.py`

**功能**:
- [ ] `/agents/{id}/execute` - 执行Agent
- [ ] `/agents/{id}/validate` - 验证配置
- [ ] `/agents/{id}/export` - 导出YAML
- [ ] `/agents/{id}/import` - 导入YAML

---

#### 2.5 Skills编排引擎完善
**文件**: `backend/src/skills/`, `frontend/src/pages/SkillsOrchestratorPage.tsx`

**功能**:
- [ ] 可视化工作流编辑
- [ ] 节点串联执行
- [ ] 执行状态展示

---

#### 2.6 调试面板
**文件**: 待创建 `frontend/src/pages/DebugPanel.tsx`

**功能**:
- [ ] 实时查看Agent执行状态
- [ ] 查看记忆内容
- [ ] 日志输出

---

## 三、任务分配建议

| 优先级 | 任务 | 建议负责人 |
|--------|------|------------|
| P0 | TypeScript错误修复 | Bob |
| P0 | 未使用变量清理 | Bob |
| P1 | 多Agent协同配置Phase1 | Bob |
| P1 | 后端API完善 | Bob |
| P1 | Skills编排引擎 | Bob |

---

## 四、技术债务

### 需清理的警告
```bash
# 构建时警告
TS6133: 'XXX' is declared but its value is never read
```

### 需增强的错误处理
- WebSocket连接失败处理
- API超时处理
- 文件操作错误处理

---

_待分配任务给开发团队_
