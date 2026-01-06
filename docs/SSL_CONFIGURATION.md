# SSL/TLS 数据库连接配置指南

## 概述

本文档说明如何为生产环境配置安全的 PostgreSQL SSL 连接。

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_SSL` | production=true, dev=false | 是否启用 SSL |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | true | 是否验证服务器证书 |

## 配置方案

### 方案 1: 使用受信任的 CA 证书（推荐）

```bash
# 生产环境 .env
DATABASE_URL=postgresql://user:pass@db.example.com:5432/milktea
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

这是最安全的配置，要求数据库服务器使用受信任 CA 签发的证书。

### 方案 2: 使用自定义 CA 证书

如果使用私有 CA 或企业内部 CA：

```bash
# 设置自定义 CA 证书路径
export NODE_EXTRA_CA_CERTS=/path/to/your/ca-certificate.pem

# 或在 .env 中
NODE_EXTRA_CA_CERTS=/path/to/your/ca-certificate.pem
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### 方案 3: AWS RDS 专用

AWS RDS 使用 Amazon 的根 CA，需要下载证书包：

```bash
# 下载 AWS RDS CA 证书包
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# 设置环境变量
export NODE_EXTRA_CA_CERTS=/path/to/global-bundle.pem
```

### 方案 4: 自签名证书（仅限开发/测试）

⚠️ **警告**: 此方案仅适用于开发和测试环境，**禁止在生产环境使用**。

```bash
# 开发环境 .env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false  # ⚠️ 不安全！
```

## 代码实现

`server/db.ts` 中的 SSL 配置逻辑：

```typescript
// SSL 配置由环境变量控制
const useSSL = process.env.DATABASE_SSL === 'true' || 
               (process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false');

// 证书验证默认启用（安全默认）
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

_pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized } : undefined,
  // ...
});
```

## 生产环境 Fail-Fast

生产环境下，数据库连接失败会立即终止应用启动：

```typescript
if (process.env.NODE_ENV === 'production') {
  await _pool.query('SELECT 1');  // 验证连接
  console.log('[Database] Production connection verified');
}
// ...
if (process.env.NODE_ENV === 'production') {
  throw new Error('Database connection required in production');  // Fail-fast
}
```

## 安全检查清单

部署前确认：

- [ ] `DATABASE_SSL=true`
- [ ] `DATABASE_SSL_REJECT_UNAUTHORIZED=true`（或使用 `NODE_EXTRA_CA_CERTS`）
- [ ] 数据库用户权限最小化
- [ ] 数据库密码强度足够
- [ ] 网络层面限制数据库访问（VPC/防火墙）

## 禁止事项

🚫 **禁止在生产环境长期使用 `DATABASE_SSL_REJECT_UNAUTHORIZED=false`**

这会禁用证书验证，使连接容易受到中间人攻击（MITM）。

如果必须临时使用（如紧急修复），必须：
1. 记录原因和时间
2. 设置提醒尽快修复
3. 在 48 小时内恢复安全配置

## 故障排除

### 证书验证失败

```
Error: self signed certificate in certificate chain
```

**解决方案**:
1. 使用 `NODE_EXTRA_CA_CERTS` 添加 CA 证书
2. 或联系 DBA 获取正确的 CA 证书

### 连接超时

```
Error: Connection timeout
```

**解决方案**:
1. 检查网络连接和防火墙规则
2. 确认数据库服务器允许 SSL 连接
3. 检查 `DATABASE_URL` 中的主机名和端口

### SSL 握手失败

```
Error: SSL handshake failed
```

**解决方案**:
1. 确认数据库服务器支持 SSL
2. 检查 SSL 证书是否过期
3. 确认使用的 TLS 版本兼容

---

**文档版本**: 1.0  
**最后更新**: 2026-01-06
