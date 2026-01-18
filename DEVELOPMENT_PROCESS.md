# 开发流程文档 | Development Process Documentation

[中文](#中文) | [English](#english)

---

## 中文

欢迎来到 CHUTEA 项目！本文档为您提供项目开发所需的所有文档链接和快速导航。

## 📚 文档导航

### 🚀 快速开始

1. **[README_CN.md](./README_CN.md)** - 项目概览和快速开始指南
   - 系统介绍
   - 安装配置
   - 基本使用
   - 常见问题

### 🤝 贡献和开发

2. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 贡献指南
   - 如何开始贡献
   - 代码规范
   - 提交规范
   - Pull Request 流程

3. **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - 开发流程详解
   - 分支策略
   - 工作流程（从开发到合并）
   - 代码审查流程
   - CI/CD 流程
   - 发布流程

### 📖 技术文档

4. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API 接口文档
   - 认证接口
   - 产品接口
   - 订单接口
   - 用户接口

5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构文档
   - 技术栈
   - 系统架构
   - 数据库设计

6. **[SCHEMA.md](./SCHEMA.md)** - 数据库模型文档
   - 数据表结构
   - 关系设计
   - 索引说明

### 🚢 部署和运维

7. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 部署指南
   - 环境准备
   - 部署步骤
   - 配置说明
   - 监控和日志

8. **[RUNBOOK.md](./RUNBOOK.md)** - 运维手册
   - 常见问题处理
   - 故障排查
   - 维护任务

### 📋 其他文档

9. **[CHANGELOG.md](./CHANGELOG.md)** - 更新日志
10. **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** - 安全审计报告
11. **[TEST_REPORT_FINAL.md](./TEST_REPORT_FINAL.md)** - 测试报告

## 🎯 根据角色选择文档

### 我是新贡献者

1. 先阅读：[README_CN.md](./README_CN.md)
2. 然后阅读：[CONTRIBUTING.md](./CONTRIBUTING.md)
3. 开始开发前阅读：[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)

### 我是新开发者

1. 快速开始：[README_CN.md](./README_CN.md) → 快速开始部分
2. 开发环境：[CONTRIBUTING.md](./CONTRIBUTING.md) → 开始之前
3. API 参考：[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. 架构了解：[ARCHITECTURE.md](./ARCHITECTURE.md)

### 我要修复 Bug

1. 创建 Issue：使用 [Bug Report 模板](./.github/ISSUE_TEMPLATE/bug_report.md)
2. 开发流程：[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → 工作流程
3. 提交 PR：[CONTRIBUTING.md](./CONTRIBUTING.md) → Pull Request 流程

### 我要添加新功能

1. 提出建议：使用 [Feature Request 模板](./.github/ISSUE_TEMPLATE/feature_request.md)
2. 开发流程：[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → 工作流程
3. API 设计：[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. 提交 PR：使用 [PR 模板](./.github/PULL_REQUEST_TEMPLATE.md)

### 我要部署应用

1. 部署指南：[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. 环境配置：[README_CN.md](./README_CN.md) → 配置数据库
3. 运维参考：[RUNBOOK.md](./RUNBOOK.md)

### 我要审查代码

1. 审查流程：[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → 代码审查
2. 代码规范：[CONTRIBUTING.md](./CONTRIBUTING.md) → 代码规范
3. CI/CD 检查：[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) → CI/CD 流程

## 📝 模板文件

### GitHub 模板

- **[Pull Request 模板](./.github/PULL_REQUEST_TEMPLATE.md)** - 创建 PR 时使用
- **[Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md)** - 报告 Bug
- **[Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md)** - 请求新功能
- **[Question](./.github/ISSUE_TEMPLATE/question.md)** - 询问问题

## 🔄 开发流程概览

```
1. 规划阶段
   └─ 创建 Issue (使用模板)
   └─ 讨论和规划

2. 开发阶段
   └─ Fork 项目
   └─ 创建功能分支 (feature/xxx)
   └─ 编写代码和测试
   └─ 本地测试 (format, check, test, build)

3. 提交阶段
   └─ 创建 Pull Request (使用模板)
   └─ 自动 CI/CD 检查
   └─ 等待代码审查

4. 审查阶段
   └─ 维护者审查代码
   └─ 回应审查意见
   └─ 修改代码

5. 合并阶段
   └─ 所有检查通过
   └─ 至少一个批准
   └─ 合并到 main

6. 发布阶段 (维护者)
   └─ 更新版本号
   └─ 创建 Release
   └─ 部署到生产
```

## 🛠️ 开发工具

### 必需工具

- **Node.js** 22.x
- **pnpm** 10.x
- **MySQL** 8.0+
- **Git**

### 推荐工具

- **VS Code** - IDE
- **Prisma Studio** - 数据库管理
- **Postman** - API 测试
- **GitHub Desktop** - Git GUI

### VS Code 扩展

- Prisma
- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense

## 🎓 学习资源

### 项目技术栈

- **前端**: React 19, Tailwind CSS, React Query, Vite
- **后端**: Node.js, Express, TypeScript, Prisma
- **数据库**: MySQL
- **工具**: pnpm, ESBuild, TypeScript

### 外部资源

- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## 📞 获取帮助

### 有问题？

1. **搜索现有 Issues** - 可能已经有答案
2. **查看文档** - 特别是常见问题部分
3. **创建 Issue** - 使用适当的模板
4. **联系维护者** - 通过 GitHub

### 贡献渠道

- 🐛 报告 Bug → [创建 Bug Issue](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 功能建议 → [创建 Feature Issue](./.github/ISSUE_TEMPLATE/feature_request.md)
- ❓ 提问 → [创建 Question Issue](./.github/ISSUE_TEMPLATE/question.md)
- 📝 改进文档 → 直接提交 PR
- 💻 贡献代码 → 遵循 [贡献指南](./CONTRIBUTING.md)

## ✅ 检查清单

### 首次设置

- [ ] Fork 项目
- [ ] 克隆到本地
- [ ] 安装依赖 (`pnpm install`)
- [ ] 配置环境 (`.env`)
- [ ] 初始化数据库 (`pnpm db:push`)
- [ ] 运行系统 (`pnpm dev`)
- [ ] 阅读贡献指南

### 开始开发前

- [ ] 已阅读 CONTRIBUTING.md
- [ ] 已阅读 DEVELOPMENT_WORKFLOW.md
- [ ] 了解分支命名规范
- [ ] 了解提交消息规范
- [ ] 了解 PR 流程

### 提交 PR 前

- [ ] 代码已格式化 (`pnpm format`)
- [ ] 类型检查通过 (`pnpm check`)
- [ ] 测试通过 (`pnpm test`)
- [ ] 构建成功 (`pnpm build`)
- [ ] 已更新相关文档
- [ ] 已添加/更新测试
- [ ] PR 描述完整

## 🚀 快速命令参考

```bash
# 开发
pnpm dev                    # 启动开发服务器
pnpm build                  # 构建生产版本
pnpm start                  # 启动生产服务器

# 质量检查
pnpm format                 # 格式化代码
pnpm check                  # TypeScript 类型检查
pnpm test                   # 运行测试

# 数据库
pnpm db:push                # 同步数据库 schema
pnpm setup                  # 初始化系统数据
pnpm data:cleanup           # 清理测试数据

# 健康检查
pnpm test:health            # 系统健康检查
pnpm test:price-sync        # 价格同步测试
```

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## English

Welcome to the CHUTEA project! This document provides links to all documentation needed for project development and quick navigation.

## 📚 Documentation Navigation

### 🚀 Quick Start

1. **[README_CN.md](./README_CN.md)** - Project overview and quick start guide
   - System introduction
   - Installation and configuration
   - Basic usage
   - FAQ

### 🤝 Contributing and Development

2. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
   - How to start contributing
   - Code standards
   - Commit guidelines
   - Pull Request process

3. **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)** - Development workflow details
   - Branching strategy
   - Workflow (from development to merge)
   - Code review process
   - CI/CD process
   - Release process

### 📖 Technical Documentation

4. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API documentation
5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
6. **[SCHEMA.md](./SCHEMA.md)** - Database schema

### 🚢 Deployment and Operations

7. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment guide
8. **[RUNBOOK.md](./RUNBOOK.md)** - Operations manual

## 🎯 Choose Documentation by Role

### I'm a New Contributor

1. Read first: [README_CN.md](./README_CN.md)
2. Then read: [CONTRIBUTING.md](./CONTRIBUTING.md)
3. Before development: [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)

### I'm a New Developer

1. Quick start: [README_CN.md](./README_CN.md)
2. Development setup: [CONTRIBUTING.md](./CONTRIBUTING.md)
3. API reference: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
4. Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

### I Want to Fix a Bug

1. Create Issue: Use [Bug Report template](./.github/ISSUE_TEMPLATE/bug_report.md)
2. Development flow: [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
3. Submit PR: [CONTRIBUTING.md](./CONTRIBUTING.md)

### I Want to Add a Feature

1. Suggest feature: Use [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.md)
2. Development flow: [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)
3. Submit PR: Use [PR template](./.github/PULL_REQUEST_TEMPLATE.md)

## 📝 Template Files

### GitHub Templates

- **[Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md)** - Use when creating PR
- **[Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md)** - Report bugs
- **[Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md)** - Request features
- **[Question](./.github/ISSUE_TEMPLATE/question.md)** - Ask questions

## 🚀 Quick Command Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Quality Checks
pnpm format                 # Format code
pnpm check                  # TypeScript type check
pnpm test                   # Run tests

# Database
pnpm db:push                # Sync database schema
pnpm setup                  # Initialize system data
pnpm data:cleanup           # Clean test data

# Health Checks
pnpm test:health            # System health check
pnpm test:price-sync        # Price sync test
```

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

---

<div align="center">

**Made with ❤️ by CHUTEA Team | 🍵**

</div>
