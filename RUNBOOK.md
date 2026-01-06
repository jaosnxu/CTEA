# CTEA Platform - 运维手册 (RUNBOOK)

## 目录

1. [部署流程](#1-部署流程)
2. [回滚流程](#2-回滚流程)
3. [迁移失败处理](#3-迁移失败处理)
4. [监控与告警](#4-监控与告警)
5. [常见问题排查](#5-常见问题排查)
6. [紧急联系人](#6-紧急联系人)

---

## 1. 部署流程

### 1.1 一键部署步骤

```bash
# Step 1: 拉取最新代码
git pull origin main

# Step 2: 安装依赖
pnpm install --frozen-lockfile

# Step 3: 运行数据库迁移
pnpm db:migrate

# Step 4: 构建应用
pnpm build

# Step 5: 重启服务
pm2 restart ctea-platform

# Step 6: 健康检查
curl -f http://localhost:3000/api/health || exit 1
```

### 1.2 完整部署脚本

```bash
#!/bin/bash
set -e

echo "=== CTEA Platform Deployment ==="
DEPLOY_TIME=$(date +%Y%m%d_%H%M%S)

# 备份当前版本
echo "[1/6] Creating backup..."
cp -r /app/current /app/backup_$DEPLOY_TIME

# 拉取代码
echo "[2/6] Pulling latest code..."
cd /app/current
git pull origin main

# 安装依赖
echo "[3/6] Installing dependencies..."
pnpm install --frozen-lockfile

# 运行迁移
echo "[4/6] Running database migrations..."
pnpm db:migrate

# 构建
echo "[5/6] Building application..."
pnpm build

# 重启
echo "[6/6] Restarting services..."
pm2 restart ctea-platform

# 健康检查
sleep 5
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed, rolling back..."
    /app/scripts/rollback.sh $DEPLOY_TIME
    exit 1
fi
```

### 1.3 环境变量检查清单

部署前必须确认以下环境变量已正确配置：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `DATABASE_SSL` | ✅ | 必须为 `true` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | ✅ | 必须为 `true`（或使用 CA 证书） |
| `JWT_SECRET` | ✅ | 至少 32 字符 |
| `NODE_ENV` | ✅ | 必须为 `production` |
| `PAYMENT_PROVIDER` | ✅ | 不能为 `mock` |
| `IIKO_API_KEY` | ✅ | IIKO 集成密钥 |

---

## 2. 回滚流程

### 2.1 快速回滚（代码层面）

```bash
#!/bin/bash
# rollback.sh <backup_timestamp>

BACKUP_DIR="/app/backup_$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup not found: $BACKUP_DIR"
    exit 1
fi

echo "Rolling back to $BACKUP_DIR..."

# 停止服务
pm2 stop ctea-platform

# 恢复代码
rm -rf /app/current
cp -r $BACKUP_DIR /app/current

# 重启服务
pm2 start ctea-platform

echo "✅ Rollback complete"
```

### 2.2 数据库回滚

⚠️ **警告**: 数据库回滚可能导致数据丢失，仅在紧急情况下使用。

```bash
# 查看迁移历史
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC;"

# 回滚到指定版本（需要手动编写回滚 SQL）
# 1. 首先备份当前数据
pg_dump $DATABASE_URL > backup_before_rollback.sql

# 2. 执行回滚 SQL（根据具体迁移内容编写）
psql $DATABASE_URL -f rollback_migration.sql

# 3. 更新迁移记录
psql $DATABASE_URL -c "DELETE FROM drizzle.__drizzle_migrations WHERE hash = 'xxx';"
```

### 2.3 回滚决策树

```
部署后出现问题？
    │
    ├── 应用无法启动
    │   └── 立即回滚代码 → rollback.sh
    │
    ├── 数据库连接失败
    │   ├── 检查 DATABASE_URL
    │   ├── 检查 SSL 配置
    │   └── 检查网络/防火墙
    │
    ├── 迁移失败
    │   └── 见 [3. 迁移失败处理]
    │
    └── 功能异常但服务正常
        ├── 评估影响范围
        ├── 如果影响 >10% 用户 → 回滚
        └── 如果影响 <10% 用户 → 热修复
```

---

## 3. 迁移失败处理

### 3.1 迁移失败诊断

```bash
# 查看迁移错误日志
pnpm db:migrate 2>&1 | tee migration_error.log

# 检查数据库状态
psql $DATABASE_URL -c "\dt"  # 列出所有表
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations;"  # 迁移历史
```

### 3.2 常见迁移失败原因及解决方案

#### 3.2.1 约束违反

```
ERROR: new row violates check constraint "xxx"
```

**解决方案**:
```sql
-- 1. 找出违反约束的数据
SELECT * FROM table_name WHERE NOT (constraint_condition);

-- 2. 修复数据
UPDATE table_name SET column = fixed_value WHERE NOT (constraint_condition);

-- 3. 重新运行迁移
pnpm db:migrate
```

#### 3.2.2 唯一约束冲突

```
ERROR: could not create unique index "xxx" - duplicate key
```

**解决方案**:
```sql
-- 1. 找出重复数据
SELECT column, COUNT(*) FROM table_name GROUP BY column HAVING COUNT(*) > 1;

-- 2. 决定保留哪条记录，删除其他
DELETE FROM table_name WHERE id NOT IN (
    SELECT MIN(id) FROM table_name GROUP BY unique_column
);

-- 3. 重新运行迁移
pnpm db:migrate
```

#### 3.2.3 外键约束失败

```
ERROR: insert or update on table "xxx" violates foreign key constraint
```

**解决方案**:
```sql
-- 1. 找出孤立记录
SELECT * FROM child_table c 
LEFT JOIN parent_table p ON c.parent_id = p.id 
WHERE p.id IS NULL;

-- 2. 删除孤立记录或创建缺失的父记录
DELETE FROM child_table WHERE parent_id NOT IN (SELECT id FROM parent_table);

-- 3. 重新运行迁移
pnpm db:migrate
```

### 3.3 迁移回滚脚本模板

```sql
-- rollback_0001.sql
-- 回滚 0001_add_composite_fk.sql

BEGIN;

-- 删除复合外键
ALTER TABLE product_option_group 
DROP CONSTRAINT IF EXISTS product_option_group_default_item_composite_fk;

-- 删除触发器
DROP TRIGGER IF EXISTS validate_default_item_trigger ON product_option_group;
DROP FUNCTION IF EXISTS validate_default_item_belongs_to_group();

-- 更新迁移记录
DELETE FROM drizzle.__drizzle_migrations WHERE hash = '0001_add_composite_fk';

COMMIT;
```

---

## 4. 监控与告警

### 4.1 关键指标

| 指标 | 阈值 | 告警级别 | 处理方式 |
|------|------|----------|----------|
| 支付失败率 | >5% | P0 | 立即检查支付网关 |
| IIKO 同步失败 | >3次/小时 | P1 | 检查 IIKO API 状态 |
| API 响应时间 | >2s | P2 | 检查数据库性能 |
| 错误率 | >1% | P1 | 检查日志 |
| 数据库连接数 | >80% | P2 | 扩容或优化连接池 |

### 4.2 告警配置示例（Prometheus + Alertmanager）

```yaml
# prometheus-rules.yml
groups:
  - name: ctea-platform
    rules:
      # 支付失败率告警
      - alert: HighPaymentFailureRate
        expr: |
          sum(rate(payment_failures_total[5m])) / 
          sum(rate(payment_attempts_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "支付失败率过高"
          description: "当前支付失败率: {{ $value | humanizePercentage }}"

      # IIKO 同步失败告警
      - alert: IIKOSyncFailure
        expr: increase(iiko_sync_failures_total[1h]) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IIKO 同步失败次数过多"
          description: "过去 1 小时 IIKO 同步失败 {{ $value }} 次"

      # 数据库连接告警
      - alert: HighDatabaseConnections
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "数据库连接数过高"
          description: "当前连接使用率: {{ $value | humanizePercentage }}"
```

### 4.3 日志查看命令

```bash
# 查看应用日志
pm2 logs ctea-platform --lines 100

# 查看错误日志
pm2 logs ctea-platform --err --lines 50

# 查看特定时间段日志
journalctl -u ctea-platform --since "2024-01-01 00:00:00" --until "2024-01-01 01:00:00"

# 搜索支付相关日志
grep -i "payment\|charge\|refund" /var/log/ctea-platform/app.log
```

---

## 5. 常见问题排查

### 5.1 数据库连接失败

**症状**: `Error: Connection terminated unexpectedly`

**排查步骤**:
```bash
# 1. 检查数据库服务状态
pg_isready -h $DB_HOST -p $DB_PORT

# 2. 检查连接字符串
echo $DATABASE_URL | grep -o "postgresql://[^:]*:[^@]*@[^/]*"

# 3. 测试 SSL 连接
psql "$DATABASE_URL?sslmode=require" -c "SELECT 1"

# 4. 检查连接池状态
curl http://localhost:3000/api/health/db
```

### 5.2 支付失败

**症状**: 用户支付后订单状态未更新

**排查步骤**:
```bash
# 1. 检查支付网关回调日志
grep "payment_callback" /var/log/ctea-platform/app.log | tail -20

# 2. 检查订单状态
psql $DATABASE_URL -c "SELECT id, order_number, payment_status, payment_transaction_id FROM \"order\" WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 10;"

# 3. 手动触发支付状态同步
curl -X POST http://localhost:3000/api/admin/sync-payment-status -d '{"orderId": 123}'
```

### 5.3 IIKO 同步失败

**症状**: 产品/库存数据未更新

**排查步骤**:
```bash
# 1. 检查 IIKO 同步日志
psql $DATABASE_URL -c "SELECT * FROM iiko_sync_log ORDER BY created_at DESC LIMIT 10;"

# 2. 测试 IIKO API 连接
curl -X POST https://api-ru.iiko.services/api/1/access_token \
  -H "Content-Type: application/json" \
  -d '{"apiLogin": "'$IIKO_API_KEY'"}'

# 3. 手动触发同步
curl -X POST http://localhost:3000/api/admin/sync-iiko
```

### 5.4 优惠券/积分异常

**症状**: 优惠券无法使用或积分计算错误

**排查步骤**:
```bash
# 1. 检查优惠券状态
psql $DATABASE_URL -c "SELECT * FROM coupon_instance WHERE member_id = 123 ORDER BY created_at DESC;"

# 2. 检查积分历史
psql $DATABASE_URL -c "SELECT * FROM member_points_history WHERE member_id = 123 ORDER BY created_at DESC LIMIT 20;"

# 3. 验证约束
psql $DATABASE_URL -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'order'::regclass;"
```

---

## 6. 紧急联系人

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|----------|------|
| 技术负责人 | TBD | TBD | 架构决策、紧急回滚授权 |
| DBA | TBD | TBD | 数据库问题、迁移失败 |
| 运维 | TBD | TBD | 服务器、网络问题 |
| 支付对接 | TBD | TBD | 支付网关问题 |
| IIKO 对接 | TBD | TBD | IIKO API 问题 |

---

## 附录

### A. 健康检查端点

```
GET /api/health          - 基础健康检查
GET /api/health/db       - 数据库连接检查
GET /api/health/redis    - Redis 连接检查
GET /api/health/iiko     - IIKO API 连接检查
GET /api/health/payment  - 支付网关连接检查
```

### B. 常用 SQL 查询

```sql
-- 今日订单统计
SELECT 
    COUNT(*) as total_orders,
    SUM(total_amount) as total_gmv,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
FROM "order" 
WHERE created_at >= CURRENT_DATE;

-- 支付失败订单
SELECT * FROM "order" 
WHERE payment_status = 'FAILED' 
AND created_at >= NOW() - INTERVAL '24 hours';

-- 优惠券使用统计
SELECT 
    ct.name,
    COUNT(ci.id) as total_issued,
    COUNT(CASE WHEN ci.status = 'USED' THEN 1 END) as used
FROM coupon_template ct
LEFT JOIN coupon_instance ci ON ct.id = ci.template_id
GROUP BY ct.id, ct.name;
```

### C. 版本历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | 2026-01-06 | System | 初始版本 |

---

**文档维护**: 本文档应随系统更新同步维护。任何部署流程、告警规则或联系人变更，请及时更新本文档。
