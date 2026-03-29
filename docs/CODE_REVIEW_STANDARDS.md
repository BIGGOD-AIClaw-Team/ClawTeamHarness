# 代码审查标准

## 命名规范
- Python: snake_case
- TypeScript: camelCase (组件 PascalCase)
- 常量: UPPER_SNAKE_CASE
- 文件名: snake_case.py / camelCase.ts

## 测试覆盖率
- 核心模块: >= 80%
- 一般模块: >= 60%
- 测试文件命名: `test_*.py` 或 `*_test.py`

## PR 审查清单
- [ ] 代码风格符合规范
- [ ] 有对应的单元测试
- [ ] 无敏感信息泄露
- [ ] 文档已更新
- [ ] 所有测试通过
- [ ] 无硬编码配置值
- [ ] 错误处理完善

## 代码风格
- Python: 遵循 PEP 8
- TypeScript: 遵循 ESLint + Prettier
- 最大行长度: 120 字符
- 缩进: 4 空格

## 提交规范
- Commit 消息: `type: description`
- Types: feat, fix, docs, test, refactor, chore
- 示例: `feat: add agent communication module`

## 目录结构
```
backend/
  ├── agents/      # Agent 实现
  ├── api/         # API 接口
  ├── mcp/         # MCP 协议
  ├── memory/      # 记忆管理
  ├── sandbox/     # 沙箱隔离
  └── skills/      # 技能定义
```
