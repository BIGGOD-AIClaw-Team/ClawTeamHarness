# 🔒 安全检查清单

## 禁止事项 (CRITICAL)
- ❌ 禁止在代码中硬编码 API Key、Token、密码
- ❌ 禁止提交 `.env`, `*.pem`, `*.key`, `secrets.json` 等文件
- ❌ 禁止在日志中打印敏感信息
- ❌ 禁止在错误信息中暴露内部路径结构

## 必须遵守
- ✅ 所有 secrets 必须通过环境变量注入
- ✅ 敏感配置必须使用 `.env.example` 模板
- ✅ 提交前运行 `git diff` 检查
- ✅ 定期扫描敏感信息泄露

## Git Hooks
推荐配置 pre-commit hook 检查敏感信息:

```bash
# .git/hooks/pre-commit
grep -r "api_key\|secret\|password\|token" --include="*.py" --include="*.ts" --include="*.json"
if [ $? -eq 0 ]; then
    echo "ERROR: Possible secret detected!"
    exit 1
fi
```

## 环境变量命名规范
- 使用 `*_API_KEY`, `*_SECRET`, `*_TOKEN` 后缀
- 示例: `OPENAI_API_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`

## 敏感信息扫描工具
- Python: `pip install detect-secrets`
- Node.js: `npm install -g secret-scanner`
- 通用: `grep -rE "(api_key|secret|password|token)\s*=" --include="*.py" --include="*.ts"`
