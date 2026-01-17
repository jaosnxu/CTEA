# Docker Compose Test Environment - RUNBOOK

## 概述 (Overview)

本 Docker Compose 配置用于**内部测试**，提供一个独立的本地测试环境，用于验证 OAuth 流程和后端接口，**不影响现有的 PM2 + Nginx 部署方式**。

This Docker Compose setup is for **internal testing only**. It provides an isolated local environment to test OAuth flows and backend APIs, **without affecting the existing PM2 + Nginx deployment**.

## 架构 (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose 环境                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Postgres   │  │  Mock OAuth  │  │  App:3000    │     │
│  │   Database   │  │   Server     │  │              │     │
│  │   (port 5432)│  │  (port 9000) │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│                                       ┌──────────────┐     │
│                                       │ App:3001     │     │
│                                       │ (secondary)  │     │
│                                       └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 服务说明 (Services)

1. **postgres** - MySQL 8.0 数据库，用于测试环境
2. **mock-oauth** - 模拟 OAuth 服务器，支持标准 OAuth 2.0 和 Manus OAuth
3. **app** - 主应用实例 (端口 3000)
4. **app-secondary** - 辅助应用实例 (端口 3001)，用于测试负载均衡

## 快速开始 (Quick Start)

### 前置条件 (Prerequisites)

- Docker Engine 20.10+
- Docker Compose v2.0+
- 至少 2GB 可用内存

### 启动环境 (Start Environment)

```bash
# 1. 构建并启动所有服务
docker compose up -d --build

# 2. 查看服务状态
docker compose ps

# 3. 验证服务健康状态
curl -i http://localhost:3000/health
curl -i http://localhost:3001/health
curl -i http://localhost:9000/health
```

### 预期输出 (Expected Output)

所有服务都应该返回 HTTP 200 状态码：

```bash
# App (3000)
HTTP/1.1 200 OK
Content-Type: application/json
{"status":"ok","timestamp":"2026-01-14T16:40:00.000Z","service":"chutea-backend","version":"1.0.0"}

# App Secondary (3001)
HTTP/1.1 200 OK
Content-Type: application/json
{"status":"ok","timestamp":"2026-01-14T16:40:00.000Z","service":"chutea-backend","version":"1.0.0"}

# Mock OAuth (9000)
HTTP/1.1 200 OK
Content-Type: application/json
{"status":"ok","service":"mock-oauth"}
```

## OAuth 流程测试 (OAuth Flow Testing)

### 1. 标准 OAuth 2.0 / OpenID Connect 流程

#### 步骤 1: 初始化授权请求

在浏览器中访问：

```
http://localhost:9000/oauth/authorize?
  client_id=test-client-id&
  redirect_uri=http://localhost:3000/oauth/callback&
  response_type=code&
  scope=openid%20email%20profile&
  state=random-state-123
```

#### 步骤 2: 自动重定向到回调

Mock OAuth 服务器会自动生成授权码并重定向到：

```
http://localhost:3000/oauth/callback?code=mock-auth-code-xxxxx&state=random-state-123
```

#### 步骤 3: 验证令牌交换

应用会自动：

1. 验证 `state` 参数
2. 使用 `code` 交换访问令牌和 ID 令牌
3. 解码 ID 令牌获取用户信息
4. 重定向到 `/?oauth=success`

### 2. 手动测试令牌交换 (Manual Token Exchange Test)

```bash
# 交换授权码获取令牌
curl -X POST http://localhost:9000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=test-code" \
  -d "client_id=test-client-id" \
  -d "client_secret=test-client-secret" \
  -d "redirect_uri=http://localhost:3000/oauth/callback"
```

预期响应：

```json
{
  "access_token": "eyJhbGc...",
  "id_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "mock-refresh-token-...",
  "scope": "openid email profile"
}
```

### 3. Manus OAuth 流程测试

Mock OAuth 服务器也支持 Manus OAuth 端点：

```bash
# 交换令牌 (Manus)
curl -X POST http://localhost:9000/webdev.v1.WebDevAuthPublicService/ExchangeToken \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-app-id",
    "grantType": "authorization_code",
    "code": "test-code",
    "redirectUri": "http://localhost:3000/api/oauth/callback"
  }'

# 获取用户信息 (Manus)
curl -X POST http://localhost:9000/webdev.v1.WebDevAuthPublicService/GetUserInfo \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "mock-manus-access-token"
  }'
```

## 环境变量 (Environment Variables)

### 应用环境变量 (App Environment Variables)

所有环境变量在 `docker-compose.yml` 中配置：

| 变量名                | 值                                     | 说明             |
| --------------------- | -------------------------------------- | ---------------- |
| `NODE_ENV`            | `development`                          | 运行环境         |
| `PORT`                | `3000` / `3001`                        | 服务端口         |
| `DATABASE_URL`        | `mysql://...`                     | 数据库连接字符串 |
| `API_KEY`             | `test-api-key-12345`                   | API 密钥         |
| `OAUTH_CLIENT_ID`     | `test-client-id`                       | OAuth 客户端 ID  |
| `OAUTH_CLIENT_SECRET` | `test-client-secret`                   | OAuth 客户端密钥 |
| `OAUTH_CALLBACK_URL`  | `http://localhost:3000/oauth/callback` | OAuth 回调 URL   |
| `OAUTH_TOKEN_URL`     | `http://mock-oauth:9000/oauth/token`   | OAuth 令牌端点   |

### 修改环境变量 (Modify Environment Variables)

编辑 `docker-compose.yml` 文件中的 `environment` 部分，然后重启服务：

```bash
docker compose down
docker compose up -d --build
```

## 日志查看 (View Logs)

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app
docker compose logs -f mock-oauth
docker compose logs -f postgres

# 查看最近 100 行日志
docker compose logs --tail=100 app
```

## 调试 (Debugging)

### 进入容器 (Enter Container)

```bash
# 进入应用容器
docker compose exec app sh

# 进入数据库容器
docker compose exec postgres mysql -U chutea_test -d chutea_test
```

### 检查网络连接 (Check Network Connectivity)

```bash
# 从应用容器测试 Mock OAuth 连接
docker compose exec app wget -O- http://mock-oauth:9000/health

# 从应用容器测试数据库连接
docker compose exec app nc -zv postgres 5432
```

### 重启特定服务 (Restart Specific Service)

```bash
# 重启应用服务
docker compose restart app

# 重启所有服务
docker compose restart
```

## 清理环境 (Cleanup)

### 停止服务 (Stop Services)

```bash
# 停止所有服务
docker compose down

# 停止并删除卷（数据库数据会丢失）
docker compose down -v
```

### 清理 Docker 资源 (Clean Docker Resources)

```bash
# 删除未使用的容器、网络、镜像
docker system prune -a

# 删除所有卷
docker volume prune
```

## 常见问题 (Troubleshooting)

### 问题 1: 端口已被占用

**错误信息:**

```
Error: bind: address already in use
```

**解决方案:**

1. 检查端口占用：

```bash
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :9000
```

2. 停止占用端口的进程或修改 `docker-compose.yml` 中的端口映射

### 问题 2: 服务启动失败

**解决方案:**

1. 查看服务日志：

```bash
docker compose logs app
```

2. 检查依赖服务是否健康：

```bash
docker compose ps
```

3. 重新构建镜像：

```bash
docker compose build --no-cache
docker compose up -d
```

### 问题 3: 数据库连接失败

**错误信息:**

```
Error: connect ECONNREFUSED
```

**解决方案:**

1. 确保 MySQL 服务已启动且健康：

```bash
docker compose ps postgres
```

2. 检查数据库连接字符串是否正确

3. 等待数据库完全启动（通常需要 5-10 秒）

### 问题 4: OAuth 回调失败

**解决方案:**

1. 确认 Mock OAuth 服务正在运行：

```bash
curl http://localhost:9000/health
```

2. 检查应用日志中的错误信息：

```bash
docker compose logs -f app | grep OAuth
```

3. 验证环境变量配置正确

## 测试检查清单 (Testing Checklist)

完成以下测试以确保环境正常工作：

- [ ] `docker compose up -d --build` 成功启动所有服务
- [ ] `docker compose ps` 显示所有服务状态为 "Up (healthy)"
- [ ] `curl http://localhost:3000/health` 返回 200 OK
- [ ] `curl http://localhost:3001/health` 返回 200 OK
- [ ] `curl http://localhost:9000/health` 返回 200 OK
- [ ] OAuth 授权流程可以完成（访问 authorize 端点，重定向到回调）
- [ ] 手动令牌交换成功返回访问令牌和 ID 令牌
- [ ] 应用日志中没有严重错误
- [ ] 数据库连接正常（应用启动时自动测试）

## 与生产环境的区别 (Differences from Production)

| 方面     | Docker Compose (测试) | PM2 + Nginx (生产)       |
| -------- | --------------------- | ------------------------ |
| 用途     | 本地开发和测试        | 生产部署                 |
| 数据库   | 容器内 MySQL     | 独立 MySQL 服务器   |
| OAuth    | Mock OAuth 服务器     | 真实 OAuth 提供商        |
| HTTPS    | 不支持                | 支持（通过 Nginx + SSL） |
| 负载均衡 | 无                    | Nginx 反向代理           |
| 进程管理 | Docker Compose        | PM2                      |
| 日志     | Docker logs           | PM2 logs + 系统日志      |
| 持久化   | Docker 卷             | 文件系统                 |

## 下一步 (Next Steps)

完成本地测试后：

1. **集成测试**: 在测试环境中运行完整的集成测试套件
2. **真实 OAuth 提供商**: 配置真实的 Google/VK/Telegram OAuth 凭证
3. **会话管理**: 实现用户会话创建和持久化
4. **性能测试**: 使用负载测试工具验证性能
5. **安全审查**: 运行安全扫描工具检查漏洞

## 支持 (Support)

如有问题，请：

1. 检查本 RUNBOOK 的常见问题部分
2. 查看服务日志获取详细错误信息
3. 在项目仓库中创建 Issue，附上完整的错误日志和环境信息

---

**注意**: 此配置仅用于开发和测试环境，不适合生产使用。生产环境请使用 PM2 + Nginx 部署方式。

**Note**: This setup is for development and testing only. For production, use the PM2 + Nginx deployment method.
