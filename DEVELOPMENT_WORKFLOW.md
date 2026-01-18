# 开发流程指南 | Development Workflow Guide

[中文](#中文) | [English](#english)

---

## 中文

本文档详细说明 CHUTEA 项目的开发流程、分支策略、代码审查流程和发布流程。

## 📋 目录

- [开发模式](#开发模式)
- [分支策略](#分支策略)
- [工作流程](#工作流程)
- [代码审查](#代码审查)
- [CI/CD 流程](#cicd-流程)
- [发布流程](#发布流程)
- [最佳实践](#最佳实践)

## 开发模式

CHUTEA 使用基于 GitHub Flow 的简化工作流：

```
main (生产)
  ↑
  └── feature/xxx (功能分支)
  └── fix/xxx (修复分支)
  └── docs/xxx (文档分支)
```

### 分支类型

| 分支类型 | 命名规范 | 用途 | 生命周期 |
|---------|---------|------|---------|
| `main` | `main` | 生产环境，始终保持可部署状态 | 永久 |
| 功能分支 | `feature/feature-name` | 开发新功能 | 临时 |
| 修复分支 | `fix/bug-description` | 修复 Bug | 临时 |
| 文档分支 | `docs/what-documenting` | 更新文档 | 临时 |
| 性能分支 | `perf/what-optimizing` | 性能优化 | 临时 |
| 重构分支 | `refactor/what-refactoring` | 代码重构 | 临时 |

## 分支策略

### Main 分支

- 受保护分支
- 只能通过 PR 合并
- 需要至少一个审查批准
- 所有 CI 检查必须通过
- 始终保持可部署状态

### 功能分支

从 `main` 创建，完成后合并回 `main`：

```bash
# 1. 确保 main 是最新的
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/user-authentication

# 3. 开发功能...
git add .
git commit -m "feat(auth): implement JWT authentication"

# 4. 推送到远程
git push origin feature/user-authentication

# 5. 在 GitHub 上创建 PR
```

## 工作流程

### 1. 计划阶段

- 创建 GitHub Issue 描述任务
- 添加适当的标签（`feature`, `bug`, `enhancement` 等）
- 估算工作量和优先级
- 分配给合适的开发者

### 2. 开发阶段

```bash
# 步骤 1: 保持同步
git checkout main
git pull upstream main

# 步骤 2: 创建分支
git checkout -b feature/product-search

# 步骤 3: 开发功能
# - 编写代码
# - 添加测试
# - 更新文档

# 步骤 4: 频繁提交
git add .
git commit -m "feat(product): add search functionality"

# 步骤 5: 保持更新
git fetch upstream
git rebase upstream/main

# 步骤 6: 推送更改
git push origin feature/product-search
```

### 3. 测试阶段

在提交 PR 前，确保通过所有本地检查：

```bash
# 格式化代码
pnpm format

# 类型检查
pnpm check

# 运行测试
pnpm test

# 构建项目
pnpm build

# 系统健康检查
pnpm test:health
```

### 4. Pull Request 阶段

#### 创建 PR

1. 访问 GitHub 仓库
2. 点击 "Pull requests" → "New pull request"
3. 选择您的分支
4. 填写 PR 模板：
   - 清晰的标题
   - 详细的描述
   - 相关的 Issue 链接
   - 测试说明
   - 截图（如适用）

#### PR 要求

- [ ] 标题遵循约定式提交规范
- [ ] 描述清晰完整
- [ ] 关联相关 Issue
- [ ] 包含测试
- [ ] 更新了文档
- [ ] CI 检查全部通过
- [ ] 至少一个审查批准

### 5. 审查阶段

#### 作为 PR 作者

- 响应审查意见
- 进行必要的修改
- 及时更新 PR
- 保持沟通

#### 作为审查者

检查以下方面：

**代码质量**
- [ ] 代码逻辑正确
- [ ] 遵循项目规范
- [ ] 命名清晰易懂
- [ ] 适当的错误处理
- [ ] 无安全隐患

**测试覆盖**
- [ ] 有相关测试
- [ ] 测试用例充分
- [ ] 边界情况考虑

**性能**
- [ ] 无明显性能问题
- [ ] 查询优化良好
- [ ] 避免 N+1 问题

**可维护性**
- [ ] 代码易于理解
- [ ] 适当的注释
- [ ] 文档完整

**数据库变更**
- [ ] Schema 变更合理
- [ ] 迁移脚本正确
- [ ] 索引适当

### 6. 合并阶段

满足以下条件后可以合并：

- ✅ 至少一个维护者批准
- ✅ 所有 CI/CD 检查通过
- ✅ 无未解决的评论
- ✅ 分支是最新的（已 rebase）

合并方式：
- 使用 "Squash and merge" 保持历史整洁
- 或使用 "Merge commit" 保留完整历史

### 7. 清理阶段

合并后：

```bash
# 切换回 main
git checkout main

# 拉取最新代码
git pull origin main

# 删除本地分支
git branch -d feature/product-search

# 删除远程分支（如果还存在）
git push origin --delete feature/product-search
```

## 代码审查

### 审查清单

#### 功能性
- [ ] 功能按预期工作
- [ ] 边界情况已处理
- [ ] 错误处理适当
- [ ] 用户体验良好

#### 代码质量
- [ ] 代码清晰易读
- [ ] 遵循 DRY 原则
- [ ] 函数职责单一
- [ ] 适当的抽象层次

#### 测试
- [ ] 单元测试覆盖
- [ ] 集成测试（如需要）
- [ ] 测试用例清晰
- [ ] 测试数据合理

#### 性能
- [ ] 无不必要的计算
- [ ] 数据库查询优化
- [ ] 缓存使用适当
- [ ] 资源使用合理

#### 安全
- [ ] 输入验证
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] 认证授权正确

#### 文档
- [ ] 代码注释适当
- [ ] API 文档更新
- [ ] README 更新
- [ ] 变更日志更新

### 审查反馈准则

**提供建设性反馈**

✅ 好的反馈：
```
建议使用 useMemo 来优化这个计算，因为它在每次渲染时都会执行。
可以这样改：
const total = useMemo(() => calculateTotal(items), [items]);
```

❌ 不好的反馈：
```
这个代码有问题。
```

**分类反馈**

使用标签明确反馈类型：
- `[MUST]` - 必须修改
- `[SHOULD]` - 应该修改
- `[CONSIDER]` - 建议考虑
- `[QUESTION]` - 有疑问
- `[PRAISE]` - 表扬好的代码

## CI/CD 流程

### GitHub Actions 工作流

我们使用零信任审计流程（Zero Trust Audit Pipeline）：

```
┌─────────────────────────────────────────────────┐
│  Stage 1: Environment Setup                     │
│  - 安装依赖                                      │
│  - 缓存依赖                                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 2: Code Format Check (Prettier)          │
│  - 检查代码格式                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 3: TypeScript Type Check                 │
│  - 类型检查                                      │
│  - 生成 Prisma Client                           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 4: Unit Tests (Vitest)                   │
│  - 运行单元测试                                  │
│  - 生成覆盖率报告                                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 5: Build Verification                    │
│  - 构建前端                                      │
│  - 构建后端                                      │
│  - 验证构建产物                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 6: Prisma Schema Validation              │
│  - 验证 Schema                                   │
│  - 生成 Client                                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 7: Security Audit                        │
│  - 依赖安全扫描                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Stage 8: Final Compliance Gate                 │
│  - 最终合规检查                                  │
│  - 生成审计报告                                  │
└─────────────────────────────────────────────────┘
```

### 所有检查必须通过

- ✅ 全绿才能合并 (All Green Required)
- ❌ 任何失败都必须修复
- 🔒 无本地绕过 (No Local Bypassing)

### CI 失败处理

如果 CI 检查失败：

1. **检查错误日志**
   - 点击失败的检查
   - 查看详细日志
   - 确定失败原因

2. **本地复现**
   ```bash
   # 运行相同的检查
   pnpm format    # 对应 Stage 2
   pnpm check     # 对应 Stage 3
   pnpm test      # 对应 Stage 4
   pnpm build     # 对应 Stage 5
   ```

3. **修复问题**
   - 修复代码
   - 本地验证
   - 提交修复

4. **重新推送**
   ```bash
   git add .
   git commit -m "fix: resolve CI issues"
   git push
   ```

## 发布流程

### 版本号规范

遵循语义化版本 (Semantic Versioning)：

- `MAJOR.MINOR.PATCH` (例如：`1.2.3`)
- `MAJOR`: 不兼容的 API 变更
- `MINOR`: 向后兼容的功能新增
- `PATCH`: 向后兼容的 Bug 修复

### 发布步骤

1. **准备发布**
   ```bash
   # 确保在 main 分支
   git checkout main
   git pull origin main
   
   # 运行所有测试
   pnpm test
   pnpm build
   ```

2. **更新版本号**
   ```bash
   # 编辑 package.json
   # 更新版本号
   ```

3. **更新 CHANGELOG**
   - 添加新版本的变更记录
   - 包含功能、修复、破坏性变更

4. **创建标签**
   ```bash
   git tag -a v1.2.3 -m "Release version 1.2.3"
   git push origin v1.2.3
   ```

5. **创建 GitHub Release**
   - 访问 GitHub Releases 页面
   - 点击 "Create a new release"
   - 选择标签
   - 填写发布说明
   - 发布

6. **部署到生产环境**
   ```bash
   # 根据部署指南进行部署
   # 见 DEPLOYMENT_GUIDE.md
   ```

## 最佳实践

### 提交频率

- ✅ 频繁提交小的、逻辑完整的变更
- ✅ 每个提交都应该是可工作的状态
- ❌ 避免大量文件的单次提交
- ❌ 避免混合不相关的变更

### 提交消息

```bash
# 好的提交消息
git commit -m "feat(auth): add JWT token refresh mechanism"
git commit -m "fix(order): resolve cart calculation error for discounts"
git commit -m "docs(api): update authentication endpoints documentation"

# 不好的提交消息
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

### 分支管理

- ✅ 保持分支小而专注
- ✅ 一个分支只做一件事
- ✅ 及时删除已合并的分支
- ❌ 避免长期存在的功能分支

### 代码审查

- ✅ 及时审查 PR
- ✅ 提供建设性反馈
- ✅ 认可好的代码
- ❌ 避免吹毛求疵

### 测试

- ✅ 先写测试（TDD）
- ✅ 测试边界情况
- ✅ 保持测试简单
- ❌ 避免测试实现细节

### 文档

- ✅ 代码即文档（清晰的命名）
- ✅ 复杂逻辑需要注释
- ✅ API 变更更新文档
- ❌ 避免过时的注释

## 常见问题

### Q: 如何处理合并冲突？

```bash
# 1. 拉取最新的 main
git checkout main
git pull origin main

# 2. 切换到功能分支
git checkout feature/your-feature

# 3. Rebase
git rebase main

# 4. 解决冲突
# 编辑冲突文件

# 5. 继续 rebase
git add .
git rebase --continue

# 6. 强制推送
git push -f origin feature/your-feature
```

### Q: 如何撤销最后一次提交？

```bash
# 撤销提交但保留更改
git reset --soft HEAD~1

# 撤销提交和更改
git reset --hard HEAD~1
```

### Q: 如何修改最后一次提交消息？

```bash
git commit --amend -m "new commit message"
git push -f origin your-branch
```

### Q: PR 被合并前，main 分支有新提交怎么办？

```bash
# 1. 获取最新 main
git checkout main
git pull origin main

# 2. 切换到功能分支
git checkout feature/your-feature

# 3. Rebase 到最新 main
git rebase main

# 4. 推送更新
git push -f origin feature/your-feature
```

### Q: 如何暂存当前工作？

```bash
# 暂存更改
git stash

# 切换分支做其他工作
git checkout other-branch

# 回来恢复工作
git checkout your-branch
git stash pop
```

## 工具推荐

### Git GUI 工具

- **GitKraken** - 可视化 Git 客户端
- **SourceTree** - 免费的 Git GUI
- **GitHub Desktop** - 简单易用
- **VS Code Git** - IDE 集成

### 浏览器扩展

- **Refined GitHub** - 增强 GitHub 界面
- **Octotree** - GitHub 代码树
- **GitHub File Icons** - 文件图标

### 命令行工具

- **gh** - GitHub CLI
- **tig** - 文本模式 Git 仓库浏览器
- **lazygit** - 终端 Git UI

## 相关文档

- [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献指南
- [README_CN.md](../README_CN.md) - 项目说明
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API 文档
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - 部署指南

---

## English

This document details the development workflow, branching strategy, code review process, and release process for the CHUTEA project.

## 📋 Table of Contents

- [Development Model](#development-model)
- [Branching Strategy](#branching-strategy)
- [Workflow](#workflow)
- [Code Review](#code-review-1)
- [CI/CD Process](#cicd-process)
- [Release Process](#release-process)
- [Best Practices](#best-practices-1)

## Development Model

CHUTEA uses a simplified workflow based on GitHub Flow:

```
main (production)
  ↑
  └── feature/xxx (feature branch)
  └── fix/xxx (fix branch)
  └── docs/xxx (docs branch)
```

### Branch Types

| Branch Type | Naming Convention | Purpose | Lifecycle |
|------------|-------------------|---------|-----------|
| `main` | `main` | Production, always deployable | Permanent |
| Feature | `feature/feature-name` | Develop new features | Temporary |
| Fix | `fix/bug-description` | Fix bugs | Temporary |
| Docs | `docs/what-documenting` | Update documentation | Temporary |
| Performance | `perf/what-optimizing` | Performance optimization | Temporary |
| Refactor | `refactor/what-refactoring` | Code refactoring | Temporary |

## Branching Strategy

### Main Branch

- Protected branch
- Can only be merged via PR
- Requires at least one review approval
- All CI checks must pass
- Always in a deployable state

### Feature Branches

Create from `main`, merge back to `main` when complete:

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Develop feature...
git add .
git commit -m "feat(auth): implement JWT authentication"

# 4. Push to remote
git push origin feature/user-authentication

# 5. Create PR on GitHub
```

## Workflow

### 1. Planning Phase

- Create GitHub Issue describing the task
- Add appropriate labels (`feature`, `bug`, `enhancement`, etc.)
- Estimate effort and priority
- Assign to appropriate developer

### 2. Development Phase

```bash
# Step 1: Stay synchronized
git checkout main
git pull upstream main

# Step 2: Create branch
git checkout -b feature/product-search

# Step 3: Develop feature
# - Write code
# - Add tests
# - Update documentation

# Step 4: Commit frequently
git add .
git commit -m "feat(product): add search functionality"

# Step 5: Stay updated
git fetch upstream
git rebase upstream/main

# Step 6: Push changes
git push origin feature/product-search
```

### 3. Testing Phase

Before submitting PR, ensure all local checks pass:

```bash
# Format code
pnpm format

# Type check
pnpm check

# Run tests
pnpm test

# Build project
pnpm build

# System health check
pnpm test:health
```

### 4. Pull Request Phase

#### Creating PR

1. Visit GitHub repository
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Fill in PR template:
   - Clear title
   - Detailed description
   - Related Issue links
   - Testing instructions
   - Screenshots (if applicable)

#### PR Requirements

- [ ] Title follows conventional commits
- [ ] Clear and complete description
- [ ] Related Issues linked
- [ ] Includes tests
- [ ] Documentation updated
- [ ] All CI checks pass
- [ ] At least one review approval

### 5. Review Phase

#### As PR Author

- Respond to review comments
- Make necessary changes
- Update PR promptly
- Maintain communication

#### As Reviewer

Check the following:

**Code Quality**
- [ ] Code logic is correct
- [ ] Follows project standards
- [ ] Clear naming
- [ ] Appropriate error handling
- [ ] No security issues

**Test Coverage**
- [ ] Has related tests
- [ ] Sufficient test cases
- [ ] Edge cases considered

**Performance**
- [ ] No obvious performance issues
- [ ] Queries optimized
- [ ] Avoids N+1 problems

**Maintainability**
- [ ] Code is easy to understand
- [ ] Appropriate comments
- [ ] Complete documentation

**Database Changes**
- [ ] Schema changes are reasonable
- [ ] Migration scripts correct
- [ ] Indexes appropriate

### 6. Merge Phase

Can be merged when:

- ✅ At least one maintainer approval
- ✅ All CI/CD checks pass
- ✅ No unresolved comments
- ✅ Branch is up to date (rebased)

Merge methods:
- Use "Squash and merge" for clean history
- Or "Merge commit" for full history

### 7. Cleanup Phase

After merge:

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Delete local branch
git branch -d feature/product-search

# Delete remote branch (if still exists)
git push origin --delete feature/product-search
```

## Code Review

### Review Checklist

#### Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error handling appropriate
- [ ] Good user experience

#### Code Quality
- [ ] Code is clear and readable
- [ ] Follows DRY principle
- [ ] Single responsibility
- [ ] Appropriate abstraction

#### Testing
- [ ] Unit test coverage
- [ ] Integration tests (if needed)
- [ ] Clear test cases
- [ ] Reasonable test data

#### Performance
- [ ] No unnecessary calculations
- [ ] Database queries optimized
- [ ] Cache used appropriately
- [ ] Resource usage reasonable

#### Security
- [ ] Input validation
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] Authentication/authorization correct

#### Documentation
- [ ] Appropriate code comments
- [ ] API documentation updated
- [ ] README updated
- [ ] Changelog updated

## CI/CD Process

### GitHub Actions Workflow

We use a Zero Trust Audit Pipeline with 8 stages that all must pass before code can be merged.

See `.github/workflows/zero-trust-audit.yml` for details.

## Release Process

### Version Numbering

Follow Semantic Versioning:

- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- `MAJOR`: Incompatible API changes
- `MINOR`: Backward-compatible new features
- `PATCH`: Backward-compatible bug fixes

### Release Steps

1. **Prepare release**
   ```bash
   git checkout main
   git pull origin main
   pnpm test
   pnpm build
   ```

2. **Update version**
   - Edit `package.json`
   - Update version number

3. **Update CHANGELOG**
   - Add changes for new version
   - Include features, fixes, breaking changes

4. **Create tag**
   ```bash
   git tag -a v1.2.3 -m "Release version 1.2.3"
   git push origin v1.2.3
   ```

5. **Create GitHub Release**
   - Visit GitHub Releases page
   - Click "Create a new release"
   - Select tag
   - Fill in release notes
   - Publish

6. **Deploy to production**
   - Follow deployment guide
   - See DEPLOYMENT_GUIDE.md

## Best Practices

### Commit Frequency

- ✅ Commit small, logical changes frequently
- ✅ Each commit should be in a working state
- ❌ Avoid large single commits
- ❌ Avoid mixing unrelated changes

### Commit Messages

```bash
# Good commit messages
git commit -m "feat(auth): add JWT token refresh mechanism"
git commit -m "fix(order): resolve cart calculation error for discounts"

# Bad commit messages
git commit -m "update"
git commit -m "fix bug"
```

## Related Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution Guide
- [README_CN.md](../README_CN.md) - Project Overview
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API Documentation
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Deployment Guide

---

<div align="center">

**Made with ❤️ by CHUTEA Team | 🍵**

</div>
