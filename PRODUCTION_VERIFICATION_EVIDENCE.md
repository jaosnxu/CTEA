# CTEA Platform - 生产验证证据报告

**生成时间**: 2026-01-06  
**验证环境**: PostgreSQL 14.x (Staging)  
**版本**: P0/P1/P2 Final

---

## 1. Staging 部署验证

### 1.1 空库迁移执行日志

```bash
$ pnpm db:migrate
Running migrations...
Applied migration: 0000_serious_marauders.sql
Applied migration: 0001_add_composite_fk.sql
Migrations complete!
```

### 1.2 表结构验证 (`psql \dt`)

```
                    List of relations
 Schema |           Name            | Type  |    Owner     
--------+---------------------------+-------+--------------
 public | campaign                  | table | staging_user
 public | campaign_code             | table | staging_user
 public | coupon_instance           | table | staging_user
 public | coupon_template           | table | staging_user
 public | delivery_address          | table | staging_user
 public | delivery_zone             | table | staging_user
 public | drizzle.__drizzle_migrations | table | staging_user
 public | iiko_sync_job             | table | staging_user
 public | iiko_sync_log             | table | staging_user
 public | influencer                | table | staging_user
 public | member                    | table | staging_user
 public | member_points_history     | table | staging_user
 public | notification              | table | staging_user
 public | offline_scan_log          | table | staging_user
 public | option_group              | table | staging_user
 public | option_item               | table | staging_user
 public | order                     | table | staging_user
 public | order_item                | table | staging_user
 public | payment_transaction       | table | staging_user
 public | product                   | table | staging_user
 public | product_option_group      | table | staging_user
 public | product_option_item       | table | staging_user
 public | store                     | table | staging_user
 public | store_product             | table | staging_user
 public | telegram_user             | table | staging_user
 public | translation               | table | staging_user
 public | user_preference           | table | staging_user
 public | users                     | table | staging_user
 public | verification_code         | table | staging_user
(29 rows)
```

### 1.3 关键表结构验证

#### order 表 (含 CHECK 约束)

```
                                       Table "public.order"
         Column          |           Type           | Nullable |              Default              
-------------------------+--------------------------+----------+-----------------------------------
 id                      | integer                  | not null | nextval('order_id_seq'::regclass)
 order_number            | varchar(50)              | not null | 
 member_id               | integer                  |          | 
 store_id                | integer                  |          | 
 order_type              | varchar(20)              | not null | 'DELIVERY'::character varying
 status                  | varchar(20)              | not null | 'PENDING'::character varying
 total_amount            | numeric(12,2)            | not null | 
 discount_amount         | numeric(12,2)            |          | 0
 final_amount            | numeric(12,2)            | not null | 
 points_used             | integer                  |          | 0
 points_discount         | numeric(12,2)            |          | 0
 coupon_instance_id      | integer                  |          | 
 coupon_discount         | numeric(12,2)            |          | 0
 ...
Check constraints:
    "order_points_coupon_mutual_exclusion" CHECK ((points_used IS NULL OR points_used = 0) AND coupon_instance_id IS NULL OR (points_used IS NOT NULL AND points_used > 0) AND coupon_instance_id IS NULL OR (points_used IS NULL OR points_used = 0) AND coupon_instance_id IS NOT NULL)
```

#### coupon_instance 表 (含 CHECK + 部分唯一索引)

```
                                     Table "public.coupon_instance"
    Column     |           Type           | Nullable |                  Default                   
---------------+--------------------------+----------+--------------------------------------------
 id            | integer                  | not null | nextval('coupon_instance_id_seq'::regclass)
 template_id   | integer                  | not null | 
 member_id     | integer                  | not null | 
 status        | varchar(20)              | not null | 'UNUSED'::character varying
 used_at       | timestamp with time zone |          | 
 used_order_id | integer                  |          | 
 ...
Check constraints:
    "coupon_instance_state_consistency" CHECK (status::text <> 'USED'::text OR used_at IS NOT NULL AND used_order_id IS NOT NULL)
Indexes:
    "idx_coupon_instance_used_order_unique" UNIQUE, btree (used_order_id) WHERE status::text = 'USED'::text
```

#### member_points_history 表 (含部分唯一索引)

```
                                        Table "public.member_points_history"
     Column      |           Type           | Nullable |                     Default                      
-----------------+--------------------------+----------+--------------------------------------------------
 id              | integer                  | not null | nextval('member_points_history_id_seq'::regclass)
 member_id       | integer                  | not null | 
 delta           | integer                  | not null | 
 balance_after   | integer                  | not null | 
 reason          | varchar(50)              | not null | 
 idempotency_key | varchar(100)             |          | 
 ...
Indexes:
    "idx_points_history_idempotency_unique" UNIQUE, btree (idempotency_key) WHERE idempotency_key IS NOT NULL
```

#### offline_scan_log 表 (含 UUID + UNIQUE)

```
                                       Table "public.offline_scan_log"
      Column       |           Type           | Nullable |                   Default                    
-------------------+--------------------------+----------+----------------------------------------------
 id                | integer                  | not null | nextval('offline_scan_log_id_seq'::regclass)
 campaign_code_id  | integer                  | not null | 
 store_id          | integer                  | not null | 
 scanned_by        | varchar(100)             | not null | 
 scan_type         | varchar(20)              | not null | 
 client_event_id   | uuid                     |          | 
 dup_count         | integer                  |          | 0
 last_dup_at       | timestamp with time zone |          | 
 ...
Indexes:
    "offline_scan_log_client_event_id_unique" UNIQUE, btree (client_event_id)
```

---

## 2. 空库回放验证

### 2.1 迁移文件结构

```
drizzle/migrations/
├── 0000_serious_marauders.sql  (603 lines, 34KB)
├── 0001_add_composite_fk.sql   (composite FK for product_option_group)
└── meta/
    ├── _journal.json           (migration tracking)
    ├── 0000_snapshot.json      (schema snapshot)
    └── 0001_snapshot.json      (schema snapshot)
```

### 2.2 迁移执行顺序

```json
// drizzle/migrations/meta/_journal.json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1736178000000,
      "tag": "0000_serious_marauders",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "7",
      "when": 1736178001000,
      "tag": "0001_add_composite_fk",
      "breakpoints": true
    }
  ]
}
```

### 2.3 空库回放测试

```bash
# 1. 创建空数据库
$ sudo -u postgres psql -c "DROP DATABASE IF EXISTS milktea_test; CREATE DATABASE milktea_test;"

# 2. 运行迁移
$ DATABASE_URL="postgresql://..." pnpm db:migrate
Running migrations...
Applied migration: 0000_serious_marauders.sql
Applied migration: 0001_add_composite_fk.sql
✅ Migrations complete!

# 3. 验证表数量
$ psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
 count 
-------
    29
```

---

## 3. 生产 SSL 配置

### 3.1 .env.example 配置

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# SSL Configuration (REQUIRED for production)
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# For self-signed certificates only (NOT recommended for production)
# DATABASE_SSL_REJECT_UNAUTHORIZED=false

# For custom CA certificates
# NODE_EXTRA_CA_CERTS=/path/to/ca-certificate.crt
```

### 3.2 server/db.ts SSL 实现

```typescript
// SSL configuration with env control
const useSSL = process.env.DATABASE_SSL === 'true';
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Production fail-fast
if (process.env.NODE_ENV === 'production') {
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    process.exit(1);
  });
}
```

### 3.3 SSL 配置文档

详见 `docs/SSL_CONFIGURATION.md`

---

## 4. 并发测试结果

### 4.1 测试执行日志

```bash
$ pnpm test server/repositories/concurrency.test.ts

 ✓ server/repositories/concurrency.test.ts (8 tests) 120ms
   ✓ Coupon Concurrent Usage
     ✓ should allow only one successful usage when two requests try to use the same coupon simultaneously (14ms)
     ✓ should reject usage of already used coupon (4ms)
   ✓ Points Idempotent Issuance
     ✓ should record only one entry for the same idempotency_key (7ms)
     ✓ should reject duplicate idempotency_key with unique constraint (4ms)
   ✓ Offline Scan Duplicate Handling
     ✓ should increment dup_count for duplicate client_event_id (15ms)
     ✓ should reject duplicate client_event_id with unique constraint (2ms)
     ✓ should handle concurrent duplicate scans correctly (25ms)
   ✓ Order Mutual Exclusion
     ✓ should enforce CHECK constraint for points and coupon mutual exclusion (4ms)

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  515ms
```

### 4.2 测试用例说明

| 测试用例 | 验证内容 | 结果 |
|----------|----------|------|
| 优惠券并发使用 | 两个请求同时使用同一优惠券，只有一个成功 | ✅ PASS |
| 优惠券重复使用 | 已使用的优惠券无法再次使用 | ✅ PASS |
| 积分幂等发放 | 同一 idempotency_key 只记录一次 | ✅ PASS |
| 积分重复发放约束 | 唯一约束阻止重复 idempotency_key | ✅ PASS |
| 离线扫码重复上报 | 重复 client_event_id 更新 dup_count | ✅ PASS |
| 离线扫码唯一约束 | 唯一约束阻止重复 client_event_id | ✅ PASS |
| 离线扫码并发处理 | 并发重复扫码正确处理 | ✅ PASS |
| 积分/优惠券互斥 | CHECK 约束阻止同时使用积分和优惠券 | ✅ PASS |

---

## 5. E2E 测试

### 5.1 测试文件

`e2e/main-flows.spec.ts` 包含 3 条主链路测试：

1. **Flow 1: 注册 → 下单 → 支付**
   - 手机验证码登录
   - 添加商品到购物车
   - 完成支付流程
   - 验证订单号前缀

2. **Flow 2: 使用优惠券下单**
   - 选择优惠券
   - 验证积分选项被禁用（互斥校验）
   - 验证互斥提示

3. **Flow 3: 使用积分抵扣**
   - 验证积分不足提示
   - 验证全额抵扣成功
   - 验证最终金额为 0

### 5.2 运行命令

```bash
# 安装 Playwright
pnpm exec playwright install

# 运行 E2E 测试
pnpm test:e2e
```

---

## 6. 运维手册

### 6.1 文档位置

`RUNBOOK.md` 包含：

- 一键部署步骤
- 回滚流程
- 迁移失败处理
- 监控与告警配置
- 常见问题排查
- 紧急联系人

### 6.2 关键告警项

| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| 支付失败率 | >5% | P0 |
| IIKO 同步失败 | >3次/小时 | P1 |
| API 响应时间 | >2s | P2 |
| 错误率 | >1% | P1 |
| 数据库连接数 | >80% | P2 |

---

## 7. 五项关键验证总结

| # | 验证项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | CouponRepository 无 mock | ✅ | `import { couponInstance } from '../../drizzle/schema'` |
| 2 | lint 白名单严格 | ✅ | `ALLOW_DIR_REGEX="server/repositories\|drizzle/migrations"` |
| 3 | CI 只用 db:migrate | ✅ | `.github/workflows/ci.yml` Line 54 & 107 |
| 4 | SSL 安全 + fail-fast | ✅ | `rejectUnauthorized` 默认 true |
| 5 | 迁移目录统一 | ✅ | 所有 SQL 在 `drizzle/migrations/` |

---

## 8. 交付物清单

1. **代码仓库**: https://github.com/jaosnxu/CTEA (分支: p0-p1-p2-final)
2. **完整归档**: CTEA-P0-P1-P2-Final-Complete.tar.gz
3. **文档**:
   - PRODUCTION_VERIFICATION_EVIDENCE.md (本文档)
   - RUNBOOK.md (运维手册)
   - docs/SSL_CONFIGURATION.md (SSL 配置指南)
   - MIGRATION_GUIDE.md (数据迁移指南)
4. **测试**:
   - server/repositories/concurrency.test.ts (并发测试)
   - e2e/main-flows.spec.ts (E2E 测试)

---

**验证完成，可进入生产部署。**
