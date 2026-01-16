# CHUTEA 系统使用指南

<div align="center">

**🍵 完整的奶茶店管理系统 - 独立运行，无需外部API依赖**

[English](./README.md) | 简体中文

</div>

## 📖 目录

- [系统简介](#系统简介)
- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [测试命令](#测试命令)
- [系统架构](#系统架构)
- [常见问题](#常见问题)
- [技术栈](#技术栈)

## 系统简介

CHUTEA 是一个功能完整的奶茶店管理系统，包含：

- 🛍️ **产品管理** - 产品、规格、小料管理
- 📦 **订单系统** - 完整的订单生命周期管理
- 🏪 **门店管理** - 多门店支持
- 👥 **用户系统** - 用户注册、会员等级
- 🎫 **优惠券系统** - 优惠券发放和使用
- 📊 **统计报表** - 实时销售统计和分析
- 💰 **价格管理** - 支持手动价格调整和实时同步

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置数据库

复制环境变量模板：

```bash
cp .env.production.template .env
```

编辑 `.env` 文件，设置数据库连接：

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/chutea_db
```

### 3. 初始化数据库

同步数据库架构：

```bash
pnpm db:push
```

### 4. 初始化系统数据

运行一键初始化脚本，创建测试数据：

```bash
pnpm setup
```

这将创建：

- ✅ 1 个组织总部
- ✅ 3 个门店（莫斯科、圣彼得堡、喀山）
- ✅ 10 个产品（奶茶、果茶、小吃等）
- ✅ 5 张优惠券
- ✅ 100 个模拟用户
- ✅ 500 个历史订单（过去 30 天）

### 5. 启动服务

开发模式（支持热重载）：

```bash
pnpm dev
```

生产模式：

```bash
pnpm build
pnpm start
```

### 6. 访问系统

- 🌐 **前台页面**: http://localhost:3000
- 🔐 **后台管理**: http://localhost:3000/admin/dashboard
- 📊 **统计看板**: http://localhost:3000/admin/analytics

### 默认管理员账号

```
用户名: admin
密码: admin123
```

## 功能特性

### 前台功能

- 🏠 产品浏览和搜索
- 🛒 购物车管理
- 📱 订单创建和追踪
- 💳 多种支付方式（卡、现金、在线）
- 🎫 优惠券使用
- 👤 个人中心

### 后台功能

- 📊 实时销售统计
- 📈 订单趋势分析
- 💰 收入报表
- 🏪 门店管理
- 📦 产品管理
- 💲 价格调整（支持实时同步）
- 👥 用户管理
- 🎫 优惠券管理

## 测试命令

### 系统健康检查

运行完整的系统健康检查：

```bash
pnpm test:health
```

检查内容：

- ✅ 数据库连接状态
- ✅ 数据表访问权限
- ✅ API 端点可用性
- ✅ 数据完整性验证

### 价格实时同步测试

测试价格修改后的实时同步功能：

```bash
pnpm test:price-sync
```

测试流程：

1. 选择一个产品
2. 记录原价格
3. 修改产品价格
4. 验证数据库更新
5. 验证价格变更日志
6. 模拟前端查询新价格

### 生成更多测试数据

生成自定义数量的订单：

```bash
# 生成 1000 个订单
pnpm data:generate --orders=1000
```

### 清理测试数据

清理数据库中的测试数据（保留门店和组织）：

```bash
pnpm data:cleanup
```

## 系统架构

### 技术栈

**前端**

- ⚛️ React 19
- 🎨 Tailwind CSS
- 🔄 React Query
- 🚀 Vite

**后端**

- 🟢 Node.js + Express
- 🔷 TypeScript
- 🗄️ PostgreSQL
- 🔒 Prisma ORM
- 🔐 JWT 认证

**工具**

- 📦 pnpm
- 🎯 ESBuild
- 🔍 TypeScript

### 目录结构

```
CTEA/
├── client/              # 前端代码
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面组件
│   │   └── hooks/       # 自定义 Hooks
├── server/              # 后端代码
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── db/          # 数据库配置
│   │   └── trpc/        # tRPC 配置
│   └── _core/           # 核心功能
├── prisma/              # 数据库 schema
├── scripts/             # 工具脚本
│   ├── setup-complete-system.ts   # 系统初始化
│   ├── health-check.ts            # 健康检查
│   └── test-price-sync.ts         # 价格同步测试
└── shared/              # 共享代码
```

## 常见问题

### Q: 如何重置系统数据？

```bash
# 1. 清理现有数据
pnpm data:cleanup

# 2. 重新初始化
pnpm setup
```

### Q: 如何修改默认端口？

编辑 `.env` 文件：

```bash
PORT=8080
```

### Q: 数据库连接失败？

检查：

1. PostgreSQL 服务是否运行
2. `.env` 文件中的 `DATABASE_URL` 是否正确
3. 数据库用户权限是否足够

### Q: 如何查看数据库数据？

使用 Prisma Studio：

```bash
npx prisma studio
```

### Q: 如何添加新门店？

通过后台管理界面：

1. 访问 http://localhost:3000/admin/dashboard
2. 进入"门店管理"
3. 点击"添加门店"

### Q: 如何修改产品价格？

两种方式：

1. **通过后台**: 管理界面 → 产品管理 → 编辑价格
2. **通过脚本**: 修改 `scripts/test-price-sync.ts` 并运行

### Q: 如何生成更多订单？

```bash
# 生成 2000 个订单
pnpm data:generate --orders=2000
```

## 开发指南

### 开发环境设置

1. 安装 VS Code 扩展（推荐）：
   - Prisma
   - ESLint
   - Prettier
   - TypeScript

2. 配置代码格式化：

```bash
pnpm format
```

3. 类型检查：

```bash
pnpm check
```

### 添加新功能

1. **添加新 API 端点**:
   - 在 `server/src/routes/` 创建新路由文件
   - 在 `server/routers.ts` 注册路由

2. **添加新页面**:
   - 在 `client/src/pages/` 创建页面组件
   - 配置路由

3. **数据库 schema 更改**:
   - 编辑 `prisma/schema.prisma`
   - 运行 `pnpm db:push`

### 生产部署

1. 构建项目：

```bash
pnpm build
```

2. 设置环境变量（使用 `.env.production`）

3. 启动服务：

```bash
pnpm start
```

4. 使用 PM2 管理进程（推荐）：

```bash
pm2 start dist/index.js --name chutea
```

## 性能优化

- 🚀 使用 Vite 进行快速构建
- 📦 代码分割和懒加载
- 🗄️ 数据库连接池
- 💾 Redis 缓存（可选）
- 🔄 React Query 缓存

## 安全特性

- 🔐 JWT 身份验证
- 🛡️ CORS 配置
- 🔒 SQL 注入防护（Prisma ORM）
- 🚫 XSS 防护
- ⚡ 请求速率限制

## 许可证

MIT License

## 支持

如有问题或建议，请创建 Issue 或联系开发团队。

---

<div align="center">

**🍵 享受使用 CHUTEA！**

Made with ❤️ by CHUTEA Team

</div>
