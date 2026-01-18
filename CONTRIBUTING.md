# 贡献指南 | Contributing Guide

[English](#english) | [中文](#中文)

---

## 中文

感谢您考虑为 CHUTEA 项目做出贡献！我们欢迎任何形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 实现新功能

## 📋 目录

- [行为准则](#行为准则)
- [开始之前](#开始之前)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码审查](#代码审查)

## 行为准则

请保持尊重和专业的态度。我们致力于为所有人提供一个友好、安全和受欢迎的环境。

## 开始之前

### 1. Fork 项目

点击 GitHub 页面右上角的 "Fork" 按钮，将项目 fork 到您的账号下。

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/CTEA.git
cd CTEA
```

### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/jaosnxu/CTEA.git
```

### 4. 安装依赖

```bash
pnpm install
```

### 5. 配置环境

```bash
cp .env.production.template .env
# 编辑 .env 文件，配置数据库连接
```

### 6. 初始化数据库

```bash
pnpm db:push
pnpm setup
```

## 开发流程

### 1. 保持同步

在开始工作前，确保您的本地仓库是最新的：

```bash
git checkout main
git pull upstream main
```

### 2. 创建分支

根据您要做的工作类型创建分支：

```bash
# 新功能
git checkout -b feature/your-feature-name

# Bug 修复
git checkout -b fix/bug-description

# 文档更新
git checkout -b docs/what-you-are-documenting

# 性能优化
git checkout -b perf/what-you-are-optimizing

# 重构
git checkout -b refactor/what-you-are-refactoring
```

### 3. 进行开发

- 遵循[代码规范](#代码规范)
- 编写清晰的代码注释
- 添加或更新相关测试
- 更新相关文档

### 4. 本地测试

确保所有检查都通过：

```bash
# 代码格式检查
pnpm format

# 类型检查
pnpm check

# 运行测试
pnpm test

# 构建项目
pnpm build
```

### 5. 提交代码

遵循[提交规范](#提交规范)提交您的更改。

### 6. 推送到远程

```bash
git push origin your-branch-name
```

### 7. 创建 Pull Request

在 GitHub 上创建 Pull Request，详细描述您的更改。

## 代码规范

### TypeScript/JavaScript

- 使用 TypeScript 进行开发
- 遵循项目的 ESLint 和 Prettier 配置
- 使用有意义的变量和函数名
- 保持函数简短，单一职责
- 添加适当的类型注解

### 示例

```typescript
// ✅ 好的示例
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUserById(userId: string): Promise<User | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    return null;
  }
}

// ❌ 避免的示例
async function getUser(id: any) {
  return await db.user.findUnique({ where: { id } });
}
```

### React 组件

- 使用函数组件和 Hooks
- 组件命名使用 PascalCase
- Props 接口命名使用 `ComponentNameProps`
- 保持组件单一职责

```typescript
// ✅ 好的示例
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>添加到购物车</button>
    </div>
  );
}
```

### 数据库

- 使用 Prisma ORM 进行数据库操作
- 避免 N+1 查询问题
- 使用事务处理关联操作
- 添加适当的索引

## 提交规范

我们使用约定式提交（Conventional Commits）规范：

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码功能）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

### Scope（可选）

- `client`: 前端相关
- `server`: 后端相关
- `db`: 数据库相关
- `auth`: 认证相关
- `api`: API 相关
- `ui`: UI 组件相关

### 示例

```bash
# 添加新功能
git commit -m "feat(client): add product search functionality"

# 修复 Bug
git commit -m "fix(server): resolve order calculation error"

# 更新文档
git commit -m "docs: update API documentation for order endpoints"

# 性能优化
git commit -m "perf(db): add index to orders table for faster queries"

# 重构
git commit -m "refactor(client): simplify product card component"
```

## Pull Request 流程

### 1. PR 标题

使用清晰的标题，遵循提交规范：

```
feat: Add product filtering functionality
fix: Resolve cart calculation bug
docs: Update deployment guide
```

### 2. PR 描述

使用以下模板：

```markdown
## 📝 描述

简要描述这个 PR 做了什么。

## 🎯 相关 Issue

关闭 #123
相关 #456

## 🔄 变更类型

- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 测试

## 📋 变更清单

- 添加了产品搜索功能
- 更新了相关测试
- 更新了 API 文档

## 🧪 测试

描述如何测试这些更改：

1. 启动开发服务器：`pnpm dev`
2. 访问产品页面
3. 使用搜索框搜索产品
4. 验证搜索结果正确

## 📸 截图（如适用）

添加相关截图或 GIF。

## ✅ 检查清单

- [ ] 代码遵循项目规范
- [ ] 已添加/更新测试
- [ ] 所有测试通过
- [ ] 已更新相关文档
- [ ] 代码已经过自我审查
- [ ] CI/CD 检查全部通过
```

### 3. 等待审查

- 至少需要一个维护者的批准
- 所有 CI/CD 检查必须通过
- 解决所有审查意见

### 4. 合并

维护者会在审查通过后合并您的 PR。

## 代码审查

### 作为 PR 作者

- 对反馈保持开放态度
- 及时回应审查意见
- 不要害怕提问或讨论
- 认真对待所有建议

### 作为审查者

- 保持建设性和尊重
- 提供清晰的反馈和建议
- 解释为什么需要更改
- 认可好的代码和改进

## 报告 Bug

### 使用 Issue 模板

创建 Bug 报告时，请包含：

1. **Bug 描述**：清晰简洁的描述
2. **重现步骤**：详细的重现步骤
3. **预期行为**：应该发生什么
4. **实际行为**：实际发生了什么
5. **环境信息**：
   - 操作系统
   - Node.js 版本
   - 浏览器版本（如适用）
6. **截图/日志**：如果有的话

## 功能建议

创建功能请求时，请包含：

1. **功能描述**：清晰描述建议的功能
2. **使用场景**：为什么需要这个功能
3. **建议方案**：如何实现（可选）
4. **替代方案**：考虑过的其他方案（可选）

## 开发环境设置

### 推荐的 IDE 设置

**VS Code 扩展：**

- Prisma
- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense

### 配置文件

项目已包含：

- `.prettierrc` - Prettier 配置
- `.prettierignore` - Prettier 忽略文件
- `tsconfig.json` - TypeScript 配置
- `.gitignore` - Git 忽略文件

## CI/CD 流程

我们使用 GitHub Actions 进行持续集成：

### 自动检查

每个 PR 都会自动运行：

1. **代码格式检查**（Prettier）
2. **类型检查**（TypeScript）
3. **单元测试**（Vitest）
4. **构建验证**
5. **Prisma Schema 验证**
6. **安全审计**

### 所有检查必须通过

- ✅ 全绿才能合并
- ❌ 任何失败都需要修复
- 🔒 没有本地绕过

详见：`.github/workflows/zero-trust-audit.yml`

## 有用的命令

```bash
# 开发
pnpm dev                    # 启动开发服务器
pnpm build                  # 构建生产版本
pnpm start                  # 启动生产服务器

# 代码质量
pnpm format                 # 格式化代码
pnpm check                  # TypeScript 类型检查
pnpm test                   # 运行测试

# 数据库
pnpm db:push                # 同步数据库 schema
pnpm setup                  # 初始化系统数据
pnpm data:cleanup           # 清理测试数据
pnpm data:generate          # 生成测试数据

# 健康检查
pnpm test:health            # 系统健康检查
pnpm test:price-sync        # 价格同步测试
```

## 获取帮助

- 📖 查看项目文档
- 💬 在 Issue 中提问
- 📧 联系维护团队

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下授权。

---

## English

Thank you for considering contributing to the CHUTEA project! We welcome all forms of contributions, including but not limited to:

- 🐛 Bug reports
- 💡 Feature suggestions
- 📝 Documentation improvements
- 🔧 Code fixes
- ✨ New features

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)

## Code of Conduct

Please maintain a respectful and professional attitude. We are committed to providing a friendly, safe, and welcoming environment for everyone.

## Getting Started

### 1. Fork the Project

Click the "Fork" button in the upper right corner of the GitHub page.

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CTEA.git
cd CTEA
```

### 3. Add Upstream Repository

```bash
git remote add upstream https://github.com/jaosnxu/CTEA.git
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Configure Environment

```bash
cp .env.production.template .env
# Edit .env file to configure database connection
```

### 6. Initialize Database

```bash
pnpm db:push
pnpm setup
```

## Development Workflow

### 1. Stay Synchronized

Before starting work, ensure your local repository is up to date:

```bash
git checkout main
git pull upstream main
```

### 2. Create Branch

Create a branch based on the type of work:

```bash
# New feature
git checkout -b feature/your-feature-name

# Bug fix
git checkout -b fix/bug-description

# Documentation update
git checkout -b docs/what-you-are-documenting

# Performance optimization
git checkout -b perf/what-you-are-optimizing

# Refactoring
git checkout -b refactor/what-you-are-refactoring
```

### 3. Development

- Follow [Code Standards](#code-standards)
- Write clear code comments
- Add or update related tests
- Update related documentation

### 4. Local Testing

Ensure all checks pass:

```bash
# Code format check
pnpm format

# Type check
pnpm check

# Run tests
pnpm test

# Build project
pnpm build
```

### 5. Commit Code

Follow [Commit Guidelines](#commit-guidelines) to commit your changes.

### 6. Push to Remote

```bash
git push origin your-branch-name
```

### 7. Create Pull Request

Create a Pull Request on GitHub with a detailed description of your changes.

## Code Standards

### TypeScript/JavaScript

- Use TypeScript for development
- Follow project's ESLint and Prettier configuration
- Use meaningful variable and function names
- Keep functions short and single-responsibility
- Add appropriate type annotations

### Example

```typescript
// ✅ Good example
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUserById(userId: string): Promise<User | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error });
    return null;
  }
}

// ❌ Avoid
async function getUser(id: any) {
  return await db.user.findUnique({ where: { id } });
}
```

### React Components

- Use function components and Hooks
- Component naming uses PascalCase
- Props interface naming uses `ComponentNameProps`
- Keep components single-responsibility

```typescript
// ✅ Good example
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
}
```

## Commit Guidelines

We use Conventional Commits specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code format changes (not affecting functionality)
- `refactor`: Refactoring (neither new feature nor bug fix)
- `perf`: Performance optimization
- `test`: Add or modify tests
- `chore`: Build process or auxiliary tool changes

### Examples

```bash
git commit -m "feat(client): add product search functionality"
git commit -m "fix(server): resolve order calculation error"
git commit -m "docs: update API documentation for order endpoints"
```

## Pull Request Process

### 1. PR Title

Use clear title following commit guidelines.

### 2. PR Description

Include detailed description of changes and testing instructions.

### 3. Wait for Review

- At least one maintainer approval required
- All CI/CD checks must pass
- Resolve all review comments

### 4. Merge

Maintainers will merge your PR after approval.

## Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Code Quality
pnpm format                 # Format code
pnpm check                  # TypeScript type check
pnpm test                   # Run tests

# Database
pnpm db:push                # Sync database schema
pnpm setup                  # Initialize system data
pnpm data:cleanup           # Clean test data
pnpm data:generate          # Generate test data

# Health Checks
pnpm test:health            # System health check
pnpm test:price-sync        # Price sync test
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<div align="center">

**Thank you for contributing to CHUTEA! 🍵**

</div>
