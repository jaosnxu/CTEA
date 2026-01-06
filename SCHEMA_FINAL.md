# CHU TEA Platform - Final Schema (All 14 Fixes Applied)

**Version:** 3.0 (Production-Ready)  
**Date:** January 6, 2026  
**Status:** Ready for Final Architecture Review

---

## 修改清单总览

### 🔴 必须修改（已完成）
1. ✅ `offline_scan_log.client_event_id` 改为 UUID 类型 + 大小写不敏感
2. ✅ `coupon_instance` 增加状态一致性 CHECK
3. ✅ `updated_at` 硬规范（Repository 层自动注入）

### 🟠 强烈建议修改（已完成）
4. ✅ `client_event_id` 改为 PostgreSQL UUID 类型
5. ✅ 所有时间字段改为 `timestamptz`（UTC）
6. ✅ 金额字段统一为 `numeric(12,2)`
7. ✅ `order` 表增加积分/优惠券互斥 CHECK

### 🟡 强烈建议补充（已完成）
8. ✅ `coupon_template` SIMPLE_* 类型必须 `discount_value NOT NULL`
9. ✅ `coupon_template.rule_json` 应用层校验（文档化）
10. ✅ `scope_*_ids` 应用层数组校验（文档化）
11. ✅ `product_option_group` 默认值规则（文档化 + DB CHECK）
12. ✅ `product_option_group` 复合外键写入迁移 SQL
13. ✅ `offline_scan_log` 增加 `match_method` 字段
14. ✅ 幂等字段命名规范（文档化）

### 🟢 可选增强（已完成）
15. ✅ `coupon_instance.tags` GIN 索引
16. ✅ `member_points_history` 增加 `expires_at`（预留）

---

## 1. offline_scan_log（修复 1, 4, 5, 13）

### SQL Schema

```sql
CREATE TABLE offline_scan_log (
  id SERIAL PRIMARY KEY,
  
  -- 修复 1 & 4: 改为 UUID 类型（原生校验，无需正则）
  client_event_id UUID NOT NULL UNIQUE,
  
  campaign_code_id INTEGER NOT NULL REFERENCES campaign_code(id),
  store_id INTEGER NOT NULL REFERENCES store(id),
  cashier_id INTEGER REFERENCES users(id),
  
  -- 扫码来源
  scan_source VARCHAR(20) NOT NULL CHECK (scan_source IN ('POS', 'CASHIER_APP', 'ADMIN', 'QR')),
  
  -- 订单关联
  order_id INTEGER REFERENCES "order"(id),
  order_amount NUMERIC(12,2),  -- 修复 6: 改为 numeric(12,2)
  
  -- 修复 5: 所有时间字段改为 timestamptz
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 匹配状态
  matched BOOLEAN NOT NULL DEFAULT FALSE,
  matched_at TIMESTAMPTZ,
  
  -- 修复 13: 增加 match_method 字段
  match_method VARCHAR(20) CHECK (match_method IN ('AUTO', 'MANUAL', 'IIKO')),
  
  -- 重复扫码计数
  dup_count INTEGER NOT NULL DEFAULT 0,
  last_dup_at TIMESTAMPTZ,
  
  -- 修复 3 & 5: updated_at 改为 timestamptz
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_offline_scan_log_code ON offline_scan_log(campaign_code_id);
CREATE INDEX idx_offline_scan_log_store ON offline_scan_log(store_id);
CREATE INDEX idx_offline_scan_log_order ON offline_scan_log(order_id);
CREATE INDEX idx_offline_scan_log_matched ON offline_scan_log(matched, scanned_at);
CREATE INDEX idx_offline_scan_log_source ON offline_scan_log(scan_source);
CREATE INDEX idx_offline_scan_log_match_method ON offline_scan_log(match_method);
```

### Drizzle Schema

```typescript
import { pgTable, serial, uuid, integer, varchar, numeric, boolean, timestamptz, check, sql } from 'drizzle-orm/pg-core';

export const offlineScanLog = pgTable('offline_scan_log', {
  id: serial('id').primaryKey(),
  clientEventId: uuid('client_event_id').notNull().unique(),  // 修复 1 & 4
  campaignCodeId: integer('campaign_code_id').notNull().references(() => campaignCode.id),
  storeId: integer('store_id').notNull().references(() => store.id),
  cashierId: integer('cashier_id').references(() => users.id),
  scanSource: varchar('scan_source', { length: 20 }).notNull().$type<'POS' | 'CASHIER_APP' | 'ADMIN' | 'QR'>(),
  orderId: integer('order_id').references(() => order.id),
  orderAmount: numeric('order_amount', { precision: 12, scale: 2 }),  // 修复 6
  scannedAt: timestamptz('scanned_at').notNull().defaultNow(),  // 修复 5
  matched: boolean('matched').notNull().default(false),
  matchedAt: timestamptz('matched_at'),  // 修复 5
  matchMethod: varchar('match_method', { length: 20 }).$type<'AUTO' | 'MANUAL' | 'IIKO'>(),  // 修复 13
  dupCount: integer('dup_count').notNull().default(0),
  lastDupAt: timestamptz('last_dup_at'),  // 修复 5
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  scanSourceCheck: check('scan_source_check', sql`${table.scanSource} IN ('POS', 'CASHIER_APP', 'ADMIN', 'QR')`),
  matchMethodCheck: check('match_method_check', sql`${table.matchMethod} IN ('AUTO', 'MANUAL', 'IIKO')`)
}));
```

---

## 2. option_group（修复 5, 11）

### SQL Schema

```sql
CREATE TABLE option_group (
  id SERIAL PRIMARY KEY,
  group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING')),
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_ru VARCHAR(100),
  
  -- 修复 11: 组规则（业务规则锁死）
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  selection_type VARCHAR(10) NOT NULL DEFAULT 'SINGLE' CHECK (selection_type IN ('SINGLE', 'MULTI')),
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 修复 5
  
  -- 修复 11: 业务规则 CHECK
  CONSTRAINT option_group_business_rules CHECK (
    (group_type IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL') AND is_required = TRUE AND selection_type = 'SINGLE') OR
    (group_type = 'TOPPING' AND is_required = FALSE AND selection_type = 'MULTI')
  )
);

CREATE INDEX idx_option_group_type ON option_group(group_type);
```

### Drizzle Schema

```typescript
export const optionGroup = pgTable('option_group', {
  id: serial('id').primaryKey(),
  groupType: varchar('group_type', { length: 20 }).notNull().$type<'TEMPERATURE' | 'ICE_LEVEL' | 'SUGAR_LEVEL' | 'TOPPING'>(),
  nameZh: varchar('name_zh', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameRu: varchar('name_ru', { length: 100 }),
  isRequired: boolean('is_required').notNull().default(true),
  selectionType: varchar('selection_type', { length: 10 }).notNull().default('SINGLE').$type<'SINGLE' | 'MULTI'>(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamptz('created_at').notNull().defaultNow()  // 修复 5
}, (table) => ({
  groupTypeCheck: check('group_type_check', sql`${table.groupType} IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING')`),
  selectionTypeCheck: check('selection_type_check', sql`${table.selectionType} IN ('SINGLE', 'MULTI')`),
  // 修复 11: 业务规则 CHECK
  businessRulesCheck: check('option_group_business_rules', sql`
    (${table.groupType} IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL') AND ${table.isRequired} = TRUE AND ${table.selectionType} = 'SINGLE') OR
    (${table.groupType} = 'TOPPING' AND ${table.isRequired} = FALSE AND ${table.selectionType} = 'MULTI')
  `)
}));
```

---

## 3. option_item（修复 5, 6）

### SQL Schema

```sql
CREATE TABLE option_item (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES option_group(id),
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_ru VARCHAR(100),
  
  -- 修复 6: 价格增量改为 numeric(12,2)
  price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 修复 5
);

CREATE INDEX idx_option_item_group ON option_item(group_id);

-- 修复 12: 复合唯一索引（支持复合外键）
CREATE UNIQUE INDEX idx_option_item_group_id_unique ON option_item(group_id, id);
```

### Drizzle Schema

```typescript
export const optionItem = pgTable('option_item', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => optionGroup.id),
  nameZh: varchar('name_zh', { length: 100 }).notNull(),
  nameEn: varchar('name_en', { length: 100 }),
  nameRu: varchar('name_ru', { length: 100 }),
  priceDelta: numeric('price_delta', { precision: 12, scale: 2 }).notNull().default('0'),  // 修复 6
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamptz('created_at').notNull().defaultNow()  // 修复 5
});
```

---

## 4. product_option_group（修复 5, 11, 12）

### SQL Schema

```sql
CREATE TABLE product_option_group (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product(id),
  group_id INTEGER NOT NULL REFERENCES option_group(id),
  
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  selection_type VARCHAR(10) NOT NULL DEFAULT 'SINGLE' CHECK (selection_type IN ('SINGLE', 'MULTI')),
  
  -- 默认选项（仅对单选组有效）
  default_item_id INTEGER REFERENCES option_item(id),
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 修复 5
  
  UNIQUE (product_id, group_id),
  
  -- 修复 12: 复合外键约束（确保 default_item_id 属于 group_id）
  FOREIGN KEY (group_id, default_item_id) REFERENCES option_item(group_id, id),
  
  -- 修复 11: 单选组必须有默认值
  CONSTRAINT default_item_required_for_single CHECK (
    (selection_type = 'MULTI') OR (selection_type = 'SINGLE' AND default_item_id IS NOT NULL)
  )
);

CREATE INDEX idx_product_option_group_product ON product_option_group(product_id);
CREATE INDEX idx_product_option_group_group ON product_option_group(group_id);
```

### Drizzle Schema

```typescript
export const productOptionGroup = pgTable('product_option_group', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => product.id),
  groupId: integer('group_id').notNull().references(() => optionGroup.id),
  isRequired: boolean('is_required').notNull().default(true),
  selectionType: varchar('selection_type', { length: 10 }).notNull().default('SINGLE').$type<'SINGLE' | 'MULTI'>(),
  defaultItemId: integer('default_item_id').references(() => optionItem.id),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamptz('created_at').notNull().defaultNow()  // 修复 5
}, (table) => ({
  uniqueProductGroup: unique().on(table.productId, table.groupId),
  selectionTypeCheck: check('selection_type_check', sql`${table.selectionType} IN ('SINGLE', 'MULTI')`),
  // 修复 11: 单选组必须有默认值
  defaultItemRequiredCheck: check('default_item_required_for_single', sql`
    (${table.selectionType} = 'MULTI') OR (${table.selectionType} = 'SINGLE' AND ${table.defaultItemId} IS NOT NULL)
  `)
  // 修复 12: 复合外键需要在迁移 SQL 中手动添加
}));
```

---

## 5. product_option_item（修复 3, 5, 6）

### SQL Schema

```sql
CREATE TABLE product_option_item (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product(id),
  item_id INTEGER NOT NULL REFERENCES option_item(id),
  
  -- 修复 6: 价格覆盖改为 numeric(12,2)
  price_delta_override NUMERIC(12,2),
  is_available_override BOOLEAN,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 修复 3 & 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (product_id, item_id)
);

CREATE INDEX idx_product_option_item_product ON product_option_item(product_id);
CREATE INDEX idx_product_option_item_item ON product_option_item(item_id);
```

### Drizzle Schema

```typescript
export const productOptionItem = pgTable('product_option_item', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => product.id),
  itemId: integer('item_id').notNull().references(() => optionItem.id),
  priceDeltaOverride: numeric('price_delta_override', { precision: 12, scale: 2 }),  // 修复 6
  isAvailableOverride: boolean('is_available_override'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  uniqueProductItem: unique().on(table.productId, table.itemId)
}));
```

---

## 6. member（修复 3, 5）

### SQL Schema

```sql
CREATE TABLE member (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,  -- 修复 5
  name VARCHAR(100),
  email VARCHAR(320),
  avatar_url TEXT,
  group_id INTEGER REFERENCES member_group(id),
  
  available_points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  
  current_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE' CHECK (current_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
  
  -- 修复 3 & 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_member_phone ON member(phone);
CREATE INDEX idx_member_group ON member(group_id);
```

### Drizzle Schema

```typescript
export const member = pgTable('member', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  phoneVerifiedAt: timestamptz('phone_verified_at'),  // 修复 5
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 320 }),
  avatarUrl: text('avatar_url'),
  groupId: integer('group_id').references(() => memberGroup.id),
  availablePointsBalance: integer('available_points_balance').notNull().default(0),
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  currentTier: varchar('current_tier', { length: 20 }).notNull().default('BRONZE').$type<'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'>(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  tierCheck: check('current_tier_check', sql`${table.currentTier} IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')`)
}));
```

---

## 7. member_points_history（修复 5, 16）

### SQL Schema

```sql
CREATE TABLE member_points_history (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES member(id),
  
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('SIGNUP_BONUS', 'ORDER_EARN', 'ORDER_REDEEM', 'ADMIN_ADJUST', 'EXPIRED', 'REFUND')),
  
  order_id INTEGER REFERENCES "order"(id),
  idempotency_key VARCHAR(255),
  description TEXT,
  
  -- 修复 16: 预留积分过期时间
  expires_at TIMESTAMPTZ,
  
  -- 修复 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_history_member ON member_points_history(member_id, created_at DESC);
CREATE INDEX idx_points_history_order ON member_points_history(order_id);
CREATE INDEX idx_points_history_reason ON member_points_history(reason);
CREATE INDEX idx_points_history_expires ON member_points_history(expires_at) WHERE expires_at IS NOT NULL;

-- 部分唯一索引：idempotency_key 非空时必须唯一
CREATE UNIQUE INDEX idx_points_history_idempotency_unique ON member_points_history(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### Drizzle Schema

```typescript
export const memberPointsHistory = pgTable('member_points_history', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id').notNull().references(() => member.id),
  delta: integer('delta').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  reason: varchar('reason', { length: 20 }).notNull().$type<'SIGNUP_BONUS' | 'ORDER_EARN' | 'ORDER_REDEEM' | 'ADMIN_ADJUST' | 'EXPIRED' | 'REFUND'>(),
  orderId: integer('order_id').references(() => order.id),
  idempotencyKey: varchar('idempotency_key', { length: 255 }),
  description: text('description'),
  expiresAt: timestamptz('expires_at'),  // 修复 16
  createdAt: timestamptz('created_at').notNull().defaultNow()  // 修复 5
}, (table) => ({
  reasonCheck: check('reason_check', sql`${table.reason} IN ('SIGNUP_BONUS', 'ORDER_EARN', 'ORDER_REDEEM', 'ADMIN_ADJUST', 'EXPIRED', 'REFUND')`)
}));
```

---

## 8. coupon_template（修复 3, 5, 6, 8）

### SQL Schema

```sql
CREATE TABLE coupon_template (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name_zh VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  name_ru VARCHAR(200),
  description_zh TEXT,
  description_en TEXT,
  description_ru TEXT,
  
  type VARCHAR(30) NOT NULL CHECK (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M', 'SIMPLE_PERCENTAGE', 'SIMPLE_FIXED')),
  
  -- 修复 6: 金额字段改为 numeric(12,2)
  discount_value NUMERIC(12,2),
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  rule_json JSONB,
  
  scope_type VARCHAR(20) NOT NULL DEFAULT 'ALL_STORES' CHECK (scope_type IN ('ALL_STORES', 'STORES', 'PRODUCTS', 'CATEGORIES')),
  scope_store_ids JSONB,
  scope_product_ids JSONB,
  scope_category_ids JSONB,
  
  stackable BOOLEAN NOT NULL DEFAULT FALSE,
  max_usage_per_user INTEGER NOT NULL DEFAULT 1,
  total_quantity INTEGER,
  
  -- 修复 5: 时间字段改为 timestamptz
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 修复 3 & 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- CHECK 约束 1: scope 字段一致性
  CONSTRAINT scope_consistency CHECK (
    (scope_type = 'ALL_STORES' AND scope_store_ids IS NULL AND scope_product_ids IS NULL AND scope_category_ids IS NULL) OR
    (scope_type = 'STORES' AND scope_store_ids IS NOT NULL AND scope_product_ids IS NULL AND scope_category_ids IS NULL) OR
    (scope_type = 'PRODUCTS' AND scope_store_ids IS NULL AND scope_product_ids IS NOT NULL AND scope_category_ids IS NULL) OR
    (scope_type = 'CATEGORIES' AND scope_store_ids IS NULL AND scope_product_ids IS NULL AND scope_category_ids IS NOT NULL)
  ),
  
  -- CHECK 约束 2: rule_json 一致性
  CONSTRAINT rule_json_consistency CHECK (
    (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M') AND rule_json IS NOT NULL) OR
    (type IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND rule_json IS NULL)
  ),
  
  -- 修复 8: SIMPLE_* 类型必须 discount_value NOT NULL
  CONSTRAINT discount_value_consistency CHECK (
    (type IN ('SIMPLE_FIXED', 'SIMPLE_PERCENTAGE') AND discount_value IS NOT NULL) OR
    (type NOT IN ('SIMPLE_FIXED', 'SIMPLE_PERCENTAGE') AND discount_value IS NULL)
  )
);

CREATE INDEX idx_coupon_template_type ON coupon_template(type);
CREATE INDEX idx_coupon_template_enabled ON coupon_template(is_enabled);
CREATE INDEX idx_coupon_template_scope ON coupon_template(scope_type);
CREATE INDEX idx_coupon_template_valid ON coupon_template(valid_from, valid_until);
```

### Drizzle Schema

```typescript
export const couponTemplate = pgTable('coupon_template', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  nameZh: varchar('name_zh', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }),
  nameRu: varchar('name_ru', { length: 200 }),
  descriptionZh: text('description_zh'),
  descriptionEn: text('description_en'),
  descriptionRu: text('description_ru'),
  type: varchar('type', { length: 30 }).notNull().$type<'BOGO' | 'THRESHOLD_OFF' | 'BUY_N_GET_M' | 'SIMPLE_PERCENTAGE' | 'SIMPLE_FIXED'>(),
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }),  // 修复 6
  minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }).notNull().default('0'),  // 修复 6
  ruleJson: jsonb('rule_json'),
  scopeType: varchar('scope_type', { length: 20 }).notNull().default('ALL_STORES').$type<'ALL_STORES' | 'STORES' | 'PRODUCTS' | 'CATEGORIES'>(),
  scopeStoreIds: jsonb('scope_store_ids'),
  scopeProductIds: jsonb('scope_product_ids'),
  scopeCategoryIds: jsonb('scope_category_ids'),
  stackable: boolean('stackable').notNull().default(false),
  maxUsagePerUser: integer('max_usage_per_user').notNull().default(1),
  totalQuantity: integer('total_quantity'),
  validFrom: timestamptz('valid_from').notNull(),  // 修复 5
  validUntil: timestamptz('valid_until').notNull(),  // 修复 5
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  typeCheck: check('type_check', sql`${table.type} IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M', 'SIMPLE_PERCENTAGE', 'SIMPLE_FIXED')`),
  scopeTypeCheck: check('scope_type_check', sql`${table.scopeType} IN ('ALL_STORES', 'STORES', 'PRODUCTS', 'CATEGORIES')`),
  scopeConsistency: check('scope_consistency', sql`
    (${table.scopeType} = 'ALL_STORES' AND ${table.scopeStoreIds} IS NULL AND ${table.scopeProductIds} IS NULL AND ${table.scopeCategoryIds} IS NULL) OR
    (${table.scopeType} = 'STORES' AND ${table.scopeStoreIds} IS NOT NULL AND ${table.scopeProductIds} IS NULL AND ${table.scopeCategoryIds} IS NULL) OR
    (${table.scopeType} = 'PRODUCTS' AND ${table.scopeStoreIds} IS NULL AND ${table.scopeProductIds} IS NOT NULL AND ${table.scopeCategoryIds} IS NULL) OR
    (${table.scopeType} = 'CATEGORIES' AND ${table.scopeStoreIds} IS NULL AND ${table.scopeProductIds} IS NULL AND ${table.scopeCategoryIds} IS NOT NULL)
  `),
  ruleJsonConsistency: check('rule_json_consistency', sql`
    (${table.type} IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M') AND ${table.ruleJson} IS NOT NULL) OR
    (${table.type} IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND ${table.ruleJson} IS NULL)
  `),
  // 修复 8: SIMPLE_* 类型必须 discount_value NOT NULL
  discountValueConsistency: check('discount_value_consistency', sql`
    (${table.type} IN ('SIMPLE_FIXED', 'SIMPLE_PERCENTAGE') AND ${table.discountValue} IS NOT NULL) OR
    (${table.type} NOT IN ('SIMPLE_FIXED', 'SIMPLE_PERCENTAGE') AND ${table.discountValue} IS NULL)
  `)
}));
```

---

## 9. coupon_instance（修复 2, 3, 5, 15）

### SQL Schema

```sql
CREATE TABLE coupon_instance (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES coupon_template(id),
  member_id INTEGER NOT NULL REFERENCES member(id),
  
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('REGISTRATION', 'CAMPAIGN', 'INFLUENCER', 'MANUAL', 'COMPENSATION')),
  source_id VARCHAR(100),
  tags JSONB,
  
  status VARCHAR(20) NOT NULL DEFAULT 'UNUSED' CHECK (status IN ('UNUSED', 'USED', 'EXPIRED', 'FROZEN')),
  
  -- 修复 5: 时间字段改为 timestamptz
  used_at TIMESTAMPTZ,
  used_order_id INTEGER REFERENCES "order"(id),
  
  original_valid_until TIMESTAMPTZ NOT NULL,
  adjusted_valid_until TIMESTAMPTZ,
  
  -- 修复 3 & 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 修复 2: 状态一致性 CHECK
  CONSTRAINT coupon_use_state_consistency CHECK (
    (status = 'USED' AND used_order_id IS NOT NULL AND used_at IS NOT NULL) OR
    (status <> 'USED' AND used_order_id IS NULL AND used_at IS NULL)
  )
);

CREATE INDEX idx_coupon_instance_member ON coupon_instance(member_id, status);
CREATE INDEX idx_coupon_instance_template ON coupon_instance(template_id);
CREATE INDEX idx_coupon_instance_source ON coupon_instance(source_type, source_id);
CREATE INDEX idx_coupon_instance_used_order ON coupon_instance(used_order_id);

-- 部分唯一索引：同一券只能被使用一次
CREATE UNIQUE INDEX idx_coupon_instance_used_order_unique ON coupon_instance(used_order_id) WHERE used_order_id IS NOT NULL;

-- 修复 15: GIN 索引支持标签查询
CREATE INDEX idx_coupon_instance_tags ON coupon_instance USING GIN (tags);
```

### Drizzle Schema

```typescript
export const couponInstance = pgTable('coupon_instance', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => couponTemplate.id),
  memberId: integer('member_id').notNull().references(() => member.id),
  sourceType: varchar('source_type', { length: 20 }).notNull().$type<'REGISTRATION' | 'CAMPAIGN' | 'INFLUENCER' | 'MANUAL' | 'COMPENSATION'>(),
  sourceId: varchar('source_id', { length: 100 }),
  tags: jsonb('tags'),
  status: varchar('status', { length: 20 }).notNull().default('UNUSED').$type<'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN'>(),
  usedAt: timestamptz('used_at'),  // 修复 5
  usedOrderId: integer('used_order_id').references(() => order.id),
  originalValidUntil: timestamptz('original_valid_until').notNull(),  // 修复 5
  adjustedValidUntil: timestamptz('adjusted_valid_until'),  // 修复 5
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  sourceTypeCheck: check('source_type_check', sql`${table.sourceType} IN ('REGISTRATION', 'CAMPAIGN', 'INFLUENCER', 'MANUAL', 'COMPENSATION')`),
  statusCheck: check('status_check', sql`${table.status} IN ('UNUSED', 'USED', 'EXPIRED', 'FROZEN')`),
  // 修复 2: 状态一致性 CHECK
  useStateConsistency: check('coupon_use_state_consistency', sql`
    (${table.status} = 'USED' AND ${table.usedOrderId} IS NOT NULL AND ${table.usedAt} IS NOT NULL) OR
    (${table.status} <> 'USED' AND ${table.usedOrderId} IS NULL AND ${table.usedAt} IS NULL)
  `)
}));
```

---

## 10. order（修复 3, 5, 6, 7）

### SQL Schema

```sql
CREATE TABLE "order" (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  member_id INTEGER NOT NULL REFERENCES member(id),
  store_id INTEGER NOT NULL REFERENCES store(id),
  
  -- 修复 6: 金额字段改为 numeric(12,2)
  subtotal NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(12,2) NOT NULL,
  
  -- 积分与优惠券
  used_points INTEGER NOT NULL DEFAULT 0,
  coupon_instance_id INTEGER REFERENCES coupon_instance(id),
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  
  -- 修复 5: 时间字段改为 timestamptz
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 修复 3
  
  -- 修复 7: 积分与优惠券互斥 CHECK
  CONSTRAINT points_coupon_mutual_exclusion CHECK (
    NOT (used_points > 0 AND coupon_instance_id IS NOT NULL)
  )
);

CREATE INDEX idx_order_member ON "order"(member_id);
CREATE INDEX idx_order_store ON "order"(store_id);
CREATE INDEX idx_order_status ON "order"(status, created_at DESC);
CREATE INDEX idx_order_coupon ON "order"(coupon_instance_id);
```

### Drizzle Schema

```typescript
export const order = pgTable('order', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  memberId: integer('member_id').notNull().references(() => member.id),
  storeId: integer('store_id').notNull().references(() => store.id),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),  // 修复 6
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),  // 修复 6
  finalAmount: numeric('final_amount', { precision: 12, scale: 2 }).notNull(),  // 修复 6
  usedPoints: integer('used_points').notNull().default(0),
  couponInstanceId: integer('coupon_instance_id').references(() => couponInstance.id),
  status: varchar('status', { length: 20 }).notNull().default('PENDING').$type<'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'>(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),  // 修复 5
  updatedAt: timestamptz('updated_at').notNull().defaultNow()  // 修复 3 & 5
}, (table) => ({
  statusCheck: check('status_check', sql`${table.status} IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')`),
  // 修复 7: 积分与优惠券互斥 CHECK
  pointsCouponMutualExclusion: check('points_coupon_mutual_exclusion', sql`
    NOT (${table.usedPoints} > 0 AND ${table.couponInstanceId} IS NOT NULL)
  `)
}));
```

---

## 11. iiko_sync_log（修复 5）

### SQL Schema

```sql
CREATE TABLE iiko_sync_log (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES iiko_sync_job(id),
  attempt_number INTEGER NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  
  request_summary TEXT,
  response_summary TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  
  -- 修复 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (job_id, attempt_number)
);

CREATE INDEX idx_iiko_sync_log_job ON iiko_sync_log(job_id);
CREATE INDEX idx_iiko_sync_log_status ON iiko_sync_log(status, created_at);
```

### Drizzle Schema

```typescript
export const iikoSyncLog = pgTable('iiko_sync_log', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => iikoSyncJob.id),
  attemptNumber: integer('attempt_number').notNull(),
  status: varchar('status', { length: 10 }).notNull().$type<'SUCCESS' | 'FAILED'>(),
  requestSummary: text('request_summary'),
  responseSummary: text('response_summary'),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  createdAt: timestamptz('created_at').notNull().defaultNow()  // 修复 5
}, (table) => ({
  statusCheck: check('status_check', sql`${table.status} IN ('SUCCESS', 'FAILED')`),
  uniqueJobAttempt: unique().on(table.jobId, table.attemptNumber)
}));
```

---

## 手写迁移 SQL（修复 12）

### 迁移顺序与复合外键

```sql
-- 步骤 1: 创建 option_group 表
CREATE TABLE option_group (
  id SERIAL PRIMARY KEY,
  group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING')),
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_ru VARCHAR(100),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  selection_type VARCHAR(10) NOT NULL DEFAULT 'SINGLE' CHECK (selection_type IN ('SINGLE', 'MULTI')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT option_group_business_rules CHECK (
    (group_type IN ('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL') AND is_required = TRUE AND selection_type = 'SINGLE') OR
    (group_type = 'TOPPING' AND is_required = FALSE AND selection_type = 'MULTI')
  )
);

-- 步骤 2: 创建 option_item 表
CREATE TABLE option_item (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES option_group(id),
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  name_ru VARCHAR(100),
  price_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 步骤 3: 创建复合唯一索引（支持复合外键）
CREATE UNIQUE INDEX idx_option_item_group_id_unique ON option_item(group_id, id);

-- 步骤 4: 创建 product_option_group 表
CREATE TABLE product_option_group (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product(id),
  group_id INTEGER NOT NULL REFERENCES option_group(id),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  selection_type VARCHAR(10) NOT NULL DEFAULT 'SINGLE' CHECK (selection_type IN ('SINGLE', 'MULTI')),
  default_item_id INTEGER REFERENCES option_item(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, group_id),
  CONSTRAINT default_item_required_for_single CHECK (
    (selection_type = 'MULTI') OR (selection_type = 'SINGLE' AND default_item_id IS NOT NULL)
  )
);

-- 步骤 5: 添加复合外键约束
ALTER TABLE product_option_group
ADD CONSTRAINT fk_product_option_group_default_item
FOREIGN KEY (group_id, default_item_id) REFERENCES option_item(group_id, id);
```

---

## Repository 层 updated_at 自动注入（修复 3）

### 实现方式

```typescript
// server/repositories/base.repository.ts
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class BaseRepository<T> {
  /**
   * 自动注入 updated_at 的更新方法
   */
  async updateWithTouch(
    table: any,
    id: number,
    data: Partial<T>
  ) {
    return await db.update(table)
      .set({
        ...data,
        updatedAt: new Date()  // 自动注入
      })
      .where(sql`${table.id} = ${id}`)
      .returning();
  }
  
  /**
   * 批量更新（自动注入 updated_at）
   */
  async batchUpdateWithTouch(
    table: any,
    updates: Array<{ id: number; data: Partial<T> }>
  ) {
    return await db.transaction(async (tx) => {
      const results = [];
      for (const { id, data } of updates) {
        const result = await tx.update(table)
          .set({
            ...data,
            updatedAt: new Date()  // 自动注入
          })
          .where(sql`${table.id} = ${id}`)
          .returning();
        results.push(result[0]);
      }
      return results;
    });
  }
}

// 使用示例
class CouponRepository extends BaseRepository<CouponInstance> {
  async markAsUsed(couponId: number, orderId: number) {
    return await this.updateWithTouch(couponInstance, couponId, {
      status: 'USED',
      usedAt: new Date(),
      usedOrderId: orderId
      // updatedAt 自动注入，无需手写
    });
  }
}
```

---

## 应用层校验规则（修复 9, 10, 14）

### 1. rule_json 字段校验（修复 9）

```typescript
// server/validators/coupon.validator.ts
import { z } from 'zod';

// BOGO 规则校验
const bogoRuleSchema = z.object({
  buy_quantity: z.number().int().positive(),
  get_quantity: z.number().int().positive(),
  get_discount_percent: z.number().min(0).max(100),
  applicable_products: z.array(z.number().int()).optional(),
  applicable_categories: z.array(z.number().int()).optional(),
  max_free_items: z.number().int().positive().optional()
});

// BUY_N_GET_M 规则校验
const buyNGetMRuleSchema = z.object({
  buy_quantity: z.number().int().positive(),
  get_quantity: z.number().int().positive(),
  get_discount_percent: z.number().min(0).max(100),
  applicable_categories: z.array(z.number().int()),
  cheapest_free: z.boolean().optional()
});

// THRESHOLD_OFF 规则校验
const thresholdOffRuleSchema = z.object({
  tiers: z.array(z.object({
    min_amount: z.number().positive(),
    discount_amount: z.number().positive()
  })).min(1)  // 至少一个档位
});

// 统一校验函数
export function validateCouponRule(type: string, ruleJson: any) {
  switch (type) {
    case 'BOGO':
      return bogoRuleSchema.parse(ruleJson);
    case 'BUY_N_GET_M':
      return buyNGetMRuleSchema.parse(ruleJson);
    case 'THRESHOLD_OFF':
      return thresholdOffRuleSchema.parse(ruleJson);
    default:
      throw new Error(`Unknown coupon type: ${type}`);
  }
}
```

---

### 2. scope_*_ids 数组校验（修复 10）

```typescript
// server/validators/coupon.validator.ts
export function validateScopeIds(scopeType: string, scopeIds: any) {
  if (scopeType === 'ALL_STORES') {
    if (scopeIds !== null) {
      throw new Error('ALL_STORES scope must have null scope_ids');
    }
    return;
  }
  
  // 必须是数组
  if (!Array.isArray(scopeIds)) {
    throw new Error(`scope_ids must be an array, got ${typeof scopeIds}`);
  }
  
  // 必须非空
  if (scopeIds.length === 0) {
    throw new Error('scope_ids array cannot be empty');
  }
  
  // 必须全部为整数
  if (!scopeIds.every(id => Number.isInteger(id) && id > 0)) {
    throw new Error('scope_ids must contain only positive integers');
  }
}

// 使用示例
export const createCouponTemplateSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M', 'SIMPLE_PERCENTAGE', 'SIMPLE_FIXED']),
  scopeType: z.enum(['ALL_STORES', 'STORES', 'PRODUCTS', 'CATEGORIES']),
  scopeStoreIds: z.any().nullable(),
  // ... 其他字段
}).refine(data => {
  // 校验 scope_ids
  const idsField = data.scopeType === 'STORES' ? data.scopeStoreIds :
                   data.scopeType === 'PRODUCTS' ? data.scopeProductIds :
                   data.scopeType === 'CATEGORIES' ? data.scopeCategoryIds : null;
  
  validateScopeIds(data.scopeType, idsField);
  return true;
});
```

---

### 3. 幂等字段命名规范文档（修复 14）

```markdown
# 幂等性字段命名规范

## 1. idempotency_key

**用途：** 防止业务操作重复执行（如积分发放、订单创建）

**生成方：** 服务端

**格式：** `{operation_type}:{unique_identifier}`

**示例：**
- `signup_bonus:+79001234567` - 注册送积分
- `order_refund:ORD123456` - 订单退款

**生命周期：** 永久保留（用于审计）

**唯一性范围：** 全局唯一（跨所有操作类型）

---

## 2. client_event_id

**用途：** 防止客户端事件重复提交（如扫码、支付）

**生成方：** 客户端

**格式：** UUID v4（标准格式）

**示例：** `550e8400-e29b-41d4-a716-446655440000`

**生命周期：** 永久保留（用于审计）

**唯一性范围：** 全局唯一（跨所有客户端）

---

## 3. 使用指南

### 何时使用 idempotency_key？
- 服务端主动触发的操作
- 需要防止定时任务重复执行
- 需要防止分布式系统中的重复消息

### 何时使用 client_event_id？
- 客户端主动发起的请求
- 需要防止网络重试导致的重复提交
- 需要防止用户重复点击

### 校验逻辑
```typescript
// idempotency_key 校验
async function checkIdempotency(key: string) {
  const existing = await db.select()
    .from(memberPointsHistory)
    .where(eq(memberPointsHistory.idempotencyKey, key));
  
  if (existing.length > 0) {
    throw new Error('Operation already executed');
  }
}

// client_event_id 校验
async function checkClientEvent(eventId: string) {
  const existing = await db.select()
    .from(offlineScanLog)
    .where(eq(offlineScanLog.clientEventId, eventId));
  
  if (existing.length > 0) {
    // 增加重复计数，不创建新记录
    await db.update(offlineScanLog)
      .set({ dupCount: sql`dup_count + 1`, lastDupAt: new Date() })
      .where(eq(offlineScanLog.clientEventId, eventId));
    return { isDuplicate: true };
  }
  
  return { isDuplicate: false };
}
```
```

---

## ✅ 完成清单

### 🔴 必须修改（3 项）
1. ✅ `offline_scan_log.client_event_id` 改为 UUID 类型（原生校验，大小写不敏感）
2. ✅ `coupon_instance` 增加状态一致性 CHECK
3. ✅ `updated_at` 硬规范（Repository 层 `updateWithTouch()` 自动注入）

### 🟠 强烈建议修改（4 项）
4. ✅ `client_event_id` 改为 PostgreSQL UUID 类型
5. ✅ 所有时间字段改为 `timestamptz`（UTC）
6. ✅ 金额字段统一为 `numeric(12,2)`
7. ✅ `order` 表增加积分/优惠券互斥 CHECK

### 🟡 强烈建议补充（7 项）
8. ✅ `coupon_template` SIMPLE_* 类型必须 `discount_value NOT NULL`
9. ✅ `coupon_template.rule_json` 应用层校验（Zod Schema）
10. ✅ `scope_*_ids` 应用层数组校验（Zod Schema）
11. ✅ `product_option_group` 默认值规则（DB CHECK + 文档）
12. ✅ `product_option_group` 复合外键写入迁移 SQL
13. ✅ `offline_scan_log` 增加 `match_method` 字段
14. ✅ 幂等字段命名规范（文档化）

### 🟢 可选增强（2 项）
15. ✅ `coupon_instance.tags` GIN 索引
16. ✅ `member_points_history` 增加 `expires_at`（预留）

---

## 📋 新增/变更的 CHECK / INDEX / FK 汇总

### CHECK 约束（新增 9 个）
1. `offline_scan_log.scan_source` - 扫码来源枚举
2. `offline_scan_log.match_method` - 匹配方式枚举
3. `option_group.option_group_business_rules` - 业务规则锁死
4. `product_option_group.default_item_required_for_single` - 单选组必须有默认值
5. `coupon_template.scope_consistency` - scope 字段一致性
6. `coupon_template.rule_json_consistency` - rule_json 一致性
7. `coupon_template.discount_value_consistency` - SIMPLE_* 必须有 discount_value
8. `coupon_instance.coupon_use_state_consistency` - 状态一致性
9. `order.points_coupon_mutual_exclusion` - 积分与优惠券互斥

### INDEX（新增 4 个）
1. `idx_offline_scan_log_match_method` - 匹配方式索引
2. `idx_coupon_template_valid` - 有效期索引
3. `idx_coupon_instance_tags` - GIN 索引（标签查询）
4. `idx_points_history_expires` - 积分过期时间索引

### 部分唯一索引（已有 2 个）
1. `idx_points_history_idempotency_unique` - WHERE idempotency_key IS NOT NULL
2. `idx_coupon_instance_used_order_unique` - WHERE used_order_id IS NOT NULL

### 复合外键（新增 1 个）
1. `product_option_group(group_id, default_item_id)` → `option_item(group_id, id)`

---

## 📁 文档位置

- **最终 Schema**: `/home/ubuntu/milktea-pwa/SCHEMA_FINAL.md`
- **迁移 SQL**: 见上方"手写迁移 SQL"章节
- **应用层校验**: 见上方"应用层校验规则"章节

---

**所有 16 条修改已完成，等待最后一次架构审查。**
