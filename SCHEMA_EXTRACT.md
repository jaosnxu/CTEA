# CHU TEA Platform - Schema & API Extract (Requested Sections)

**Date:** January 6, 2026  
**Purpose:** Extract key table definitions and API endpoints as requested

---

## A) 数据模型关键片段

### 1. `member` 表

**字段定义：**
```typescript
member {
  id: int (PK, auto-increment)
  phone: varchar(20) UNIQUE NOT NULL  // 手机号（唯一）
  phone_verified: boolean DEFAULT false  // 手机是否已验证
  phone_verified_at: timestamp NULL  // 首次验证时间（用于判断注册奖励）
  name: varchar(100)
  email: varchar(320)
  avatar_url: text
  group_id: int (FK -> member_group.id) NULL  // 保留单组，预留扩展
  total_points: int DEFAULT 0  // 积分余额
  current_tier: enum('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') DEFAULT 'BRONZE'
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_member_phone ON member(phone)
INDEX idx_member_group ON member(group_id)
```

**关键说明：**
- `phone` 字段唯一约束，防止重复注册
- `phone_verified_at` 用于判断是否首次验证（注册送积分幂等性依据）
- `total_points` 为冗余字段，实时积分余额（便于快速查询）
- `group_id` 保留单组关系，未来可扩展为多对多

---

### 2. `phone_verification` 表

**字段定义：**
```typescript
phone_verification {
  id: int (PK, auto-increment)
  phone: varchar(20) NOT NULL
  code: varchar(6) NOT NULL  // 6位验证码
  purpose: enum('REGISTRATION', 'LOGIN', 'RESET_PASSWORD') NOT NULL
  expires_at: timestamp NOT NULL  // 验证码过期时间（5分钟）
  verified: boolean DEFAULT false
  verified_at: timestamp NULL
  ip_address: varchar(45) NULL  // 记录请求IP（防刷）
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_phone_verification_phone ON phone_verification(phone, purpose, verified)
INDEX idx_phone_verification_expires ON phone_verification(expires_at)
```

**业务规则：**
- 验证码5分钟过期
- 同一手机号每分钟只能请求1次（速率限制）
- 验证码为6位数字

---

### 3. `idempotency_key` 表

**字段定义：**
```typescript
idempotency_key {
  id: int (PK, auto-increment)
  key: varchar(255) UNIQUE NOT NULL  // 格式: "signup_bonus:{phone}", "payment_capture:{order_id}"
  resource_type: varchar(50) NOT NULL  // 'SIGNUP_BONUS', 'PAYMENT_CAPTURE', etc.
  resource_id: varchar(100) NULL  // 关联资源ID（如member_id, order_id）
  created_at: timestamp DEFAULT NOW()
  expires_at: timestamp NULL  // 可选：幂等键过期时间（某些场景需要）
}
```

**索引：**
```sql
UNIQUE INDEX idx_idempotency_key ON idempotency_key(key)
INDEX idx_idempotency_resource ON idempotency_key(resource_type, resource_id)
```

**使用示例：**
```typescript
// 注册送积分幂等性检查
const key = `signup_bonus:${phone}`;
const existing = await db.select().from(idempotencyKey).where(eq(idempotencyKey.key, key));
if (existing.length > 0) {
  return { success: false, message: 'Signup bonus already granted' };
}

// 发放积分并记录幂等键
await db.insert(memberPointsHistory).values({ ... });
await db.insert(idempotencyKey).values({ 
  key, 
  resource_type: 'SIGNUP_BONUS', 
  resource_id: memberId 
});
```

---

### 4. `member_points_history` 表（积分变更记录）

**说明：** 当前设计中积分变更记录存储在 `member_points_history` 表中（已存在于现有架构）

**字段定义：**
```typescript
member_points_history {
  id: int (PK, auto-increment)
  member_id: int (FK -> member.id) NOT NULL
  points_change: int NOT NULL  // 积分变动（正数=增加，负数=减少）
  balance_after: int NOT NULL  // 变动后余额（快照）
  reason: enum('SIGNUP_BONUS', 'ORDER_EARN', 'ORDER_REDEEM', 'ADMIN_ADJUST', 'EXPIRED', 'REFUND') NOT NULL
  order_id: int (FK -> order.id) NULL  // 关联订单（如果是订单相关）
  description: text NULL  // 详细说明
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_points_history_member ON member_points_history(member_id, created_at DESC)
INDEX idx_points_history_order ON member_points_history(order_id)
INDEX idx_points_history_reason ON member_points_history(reason)
```

**业务规则：**
- 每次积分变动都记录一条历史记录
- `balance_after` 字段用于审计和对账
- `reason` 枚举值覆盖所有积分变动场景

---

### 5. `coupon_template` 表

**字段定义：**
```typescript
coupon_template {
  id: int (PK, auto-increment)
  code: varchar(50) UNIQUE NOT NULL
  name_zh: varchar(200) NOT NULL
  name_en: varchar(200)
  name_ru: varchar(200)
  description_zh: text
  description_en: text
  description_ru: text
  discount_type: enum('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL
  discount_value: decimal(10,2) NOT NULL
  min_order_amount: decimal(10,2) DEFAULT 0
  
  // 适用范围配置
  scope_type: enum('ALL_STORES', 'STORES', 'PRODUCTS', 'CATEGORIES') DEFAULT 'ALL_STORES'
  scope_store_ids: json NULL  // 适用门店ID数组: [1, 3, 5]
  scope_product_ids: json NULL  // 适用商品ID数组
  scope_category_ids: json NULL  // 适用分类ID数组
  
  max_usage_per_user: int DEFAULT 1
  total_quantity: int NULL
  valid_from: timestamp NOT NULL
  valid_until: timestamp NOT NULL
  is_enabled: boolean DEFAULT true
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_coupon_template_code ON coupon_template(code)
INDEX idx_coupon_template_enabled ON coupon_template(is_enabled)
```

**Scope 逻辑：**
- `ALL_STORES`: 全门店可用
- `STORES`: 仅 `scope_store_ids` 中的门店可用
- `PRODUCTS`: 仅 `scope_product_ids` 中的商品可用
- `CATEGORIES`: 仅 `scope_category_ids` 中的分类可用

---

### 6. `coupon_instance` 表

**字段定义：**
```typescript
coupon_instance {
  id: int (PK, auto-increment)
  template_id: int (FK -> coupon_template.id) NOT NULL
  member_id: int (FK -> member.id) NOT NULL
  
  // 来源追踪
  source_type: enum('REGISTRATION', 'CAMPAIGN', 'INFLUENCER', 'MANUAL', 'COMPENSATION') NOT NULL
  source_id: varchar(100) NULL  // 来源ID（如campaign_id, influencer_id）
  
  // 标签系统（用于分类和分析）
  tags: json NULL  // 标签数组: ["high_value_user", "compensation", "test"]
  
  status: enum('UNUSED', 'USED', 'EXPIRED', 'FROZEN') DEFAULT 'UNUSED'
  used_at: timestamp NULL
  used_order_id: int (FK -> order.id) NULL
  
  // 调节能力
  original_valid_until: timestamp NOT NULL  // 原始过期时间
  adjusted_valid_until: timestamp NULL  // 调整后的过期时间（NULL表示未调整）
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_coupon_instance_member ON coupon_instance(member_id, status)
INDEX idx_coupon_instance_template ON coupon_instance(template_id)
INDEX idx_coupon_instance_source ON coupon_instance(source_type, source_id)
INDEX idx_coupon_instance_used_order ON coupon_instance(used_order_id)
```

**追踪能力：**
- `source_type` + `source_id`: 追踪优惠券来源（活动/达人/人工发放）
- `tags`: 灵活标签系统（如"投诉补偿"、"高价值用户"）
- `adjusted_valid_until`: 后台可延期有效期
- `status = FROZEN`: 后台可冻结优惠券

---

### 7. `coupon_audit_log` 表

**字段定义：**
```typescript
coupon_audit_log {
  id: int (PK, auto-increment)
  coupon_instance_id: int (FK -> coupon_instance.id) NOT NULL
  operator_id: int (FK -> users.id) NOT NULL
  action: enum('CREATED', 'EXTENDED', 'FROZEN', 'UNFROZEN', 'REISSUED', 'CANCELLED') NOT NULL
  old_value: json NULL  // 操作前的值（如旧的过期时间）
  new_value: json NULL  // 操作后的值
  reason: text NULL  // 操作原因
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_coupon_audit_instance ON coupon_audit_log(coupon_instance_id)
INDEX idx_coupon_audit_operator ON coupon_audit_log(operator_id)
```

**审计能力：**
- 记录所有后台操作（谁、何时、改了什么、为什么）
- `old_value` / `new_value` 使用 JSON 存储变更前后的完整状态

---

### 8. `store` 表

**字段定义：**
```typescript
store {
  id: int (PK, auto-increment)
  name_zh: varchar(200) NOT NULL
  name_en: varchar(200)
  name_ru: varchar(200)
  address_zh: text
  address_en: text
  address_ru: text
  phone: varchar(20)
  latitude: decimal(10,8) NULL
  longitude: decimal(11,8) NULL
  is_enabled: boolean DEFAULT true
  iiko_terminal_id: varchar(100) NULL  // IIKO终端映射ID
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_store_enabled ON store(is_enabled)
```

---

### 9. `store_product` 表

**字段定义：**
```typescript
store_product {
  id: int (PK, auto-increment)
  store_id: int (FK -> store.id) NOT NULL
  product_id: int (FK -> product.id) NOT NULL
  is_enabled: boolean DEFAULT true  // 门店是否上架此商品
  price_override: decimal(10,2) NULL  // 门店特殊定价（NULL表示使用product.base_price）
  stock_status: enum('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK') DEFAULT 'IN_STOCK'
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
UNIQUE INDEX idx_store_product_unique ON store_product(store_id, product_id)
INDEX idx_store_product_store ON store_product(store_id, is_enabled)
INDEX idx_store_product_product ON store_product(product_id)
```

**业务规则：**
- 如果 `store_product` 记录不存在，则该门店不售卖该商品
- 如果 `price_override` 为 NULL，使用 `product.base_price`
- 前端查询门店菜单时必须 JOIN `store_product`

---

### 10. `special_price_request` 表

**字段定义：**
```typescript
special_price_request {
  id: int (PK, auto-increment)
  request_type: enum('PRODUCT', 'STORE_PRODUCT') NOT NULL  // 全局特价 or 门店特价
  product_id: int (FK -> product.id) NOT NULL
  store_id: int (FK -> store.id) NULL  // 仅当request_type=STORE_PRODUCT时有值
  
  original_price: decimal(10,2) NOT NULL  // 原价
  special_price: decimal(10,2) NOT NULL  // 申请的特价
  start_date: date NOT NULL  // 生效日期
  end_date: date NOT NULL  // 结束日期
  reason: text NOT NULL  // 申请原因
  
  // 申请人信息
  requester_id: int (FK -> users.id) NOT NULL  // 申请人（门店店长/运营）
  requester_role: varchar(50) NOT NULL  // 申请人角色（便于审计）
  
  // 审批流程（状态机）
  status: enum('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'ENDED') DEFAULT 'DRAFT'
  approver_id: int (FK -> users.id) NULL  // 审批人
  approved_at: timestamp NULL
  approval_comment: text NULL  // 审批意见
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_special_price_request_status ON special_price_request(status)
INDEX idx_special_price_request_product ON special_price_request(product_id, store_id)
INDEX idx_special_price_request_requester ON special_price_request(requester_id)
INDEX idx_special_price_request_dates ON special_price_request(start_date, end_date, status)
```

**状态机流转：**
1. `DRAFT`: 草稿（未提交）
2. `PENDING`: 待审批
3. `APPROVED`: 已批准（等待生效日期）
4. `ACTIVE`: 生效中（系统自动转换，当 `start_date <= TODAY`）
5. `ENDED`: 已结束（系统自动转换，当 `end_date < TODAY`）
6. `REJECTED`: 已驳回

**自动转换逻辑：**
- Cron 任务每日检查 `APPROVED` 且 `start_date <= TODAY` → 转为 `ACTIVE`
- Cron 任务每日检查 `ACTIVE` 且 `end_date < TODAY` → 转为 `ENDED`

---

### 11. `special_price_audit_log` 表

**字段定义：**
```typescript
special_price_audit_log {
  id: int (PK, auto-increment)
  request_id: int (FK -> special_price_request.id) NOT NULL
  operator_id: int (FK -> users.id) NOT NULL
  action: enum('CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVATED', 'ENDED', 'CANCELLED') NOT NULL
  comment: text NULL
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_special_price_audit_request ON special_price_audit_log(request_id)
INDEX idx_special_price_audit_operator ON special_price_audit_log(operator_id)
```

---

### 12. `order` 表（互斥约束）

**字段定义：**
```typescript
order {
  id: int (PK, auto-increment)
  order_number: varchar(50) UNIQUE NOT NULL  // 格式: P20260106001 (P=PWA, T=Telegram, K=Delivery, M=Pickup)
  member_id: int (FK -> member.id) NOT NULL
  store_id: int (FK -> store.id) NOT NULL
  
  // 订单金额
  subtotal: decimal(10,2) NOT NULL  // 小计（商品总价）
  discount_amount: decimal(10,2) DEFAULT 0  // 折扣金额
  final_amount: decimal(10,2) NOT NULL  // 实付金额
  
  // 积分与优惠券（互斥）
  used_points: int DEFAULT 0  // 使用的积分数
  points_discount_amount: decimal(10,2) DEFAULT 0  // 积分抵扣金额
  coupon_instance_id: int (FK -> coupon_instance.id) NULL  // 使用的优惠券
  coupon_discount_amount: decimal(10,2) DEFAULT 0  // 优惠券折扣金额
  
  // 达人活动码
  campaign_code_id: int (FK -> campaign_code.id) NULL  // 关联的活动码
  
  // 订单状态
  status: enum('PENDING', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'VOIDED') DEFAULT 'PENDING'
  
  // 支付信息
  payment_method: enum('TINKOFF', 'YOOKASSA', 'CASH', 'POINTS') NULL
  payment_status: enum('PENDING', 'HELD', 'CAPTURED', 'VOIDED', 'FAILED') DEFAULT 'PENDING'
  payment_transaction_id: varchar(100) NULL
  
  // IIKO同步
  iiko_order_id: varchar(100) NULL
  iiko_synced: boolean DEFAULT false
  iiko_sync_error: text NULL
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_order_member ON order(member_id)
INDEX idx_order_store ON order(store_id)
INDEX idx_order_status ON order(status)
INDEX idx_order_payment_status ON order(payment_status)
INDEX idx_order_campaign_code ON order(campaign_code_id)
INDEX idx_order_coupon ON order(coupon_instance_id)
```

**互斥约束（数据库级别）：**
```sql
CHECK (NOT (used_points > 0 AND coupon_instance_id IS NOT NULL))
```

**业务规则：**
- **积分与优惠券互斥**：后端在订单创建时强制校验 `(used_points > 0 && coupon_instance_id != null)` → 抛出错误
- **积分全额抵扣**：如果用户选择使用积分，必须积分足够完全抵扣，否则拒绝
- **特价不积分**：计算订单获得积分时，排除 `product.is_special_price = true` 的商品

---

### 13. `product_option` 表（选项组与选项项）

**说明：** 当前设计使用扁平化表结构，不使用 `option_group` 分组表。选项通过 `option_type` 枚举分组。

**字段定义：**
```typescript
product_option {
  id: int (PK, auto-increment)
  product_id: int (FK -> product.id) NOT NULL
  option_type: enum('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING') NOT NULL
  option_name_zh: varchar(100) NOT NULL  // 选项名称（如"珍珠"）
  option_name_en: varchar(100)
  option_name_ru: varchar(100)
  price_adjustment: decimal(10,2) DEFAULT 0  // 加价金额（小料常用，温度/冰/糖一般为0）
  is_enabled: boolean DEFAULT true  // 可售开关（小料可能缺货临时下架）
  sort_order: int DEFAULT 0  // 显示顺序
  iiko_modifier_id: varchar(100) NULL  // IIKO修饰符映射ID
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_product_option_product ON product_option(product_id, option_type)
INDEX idx_product_option_enabled ON product_option(is_enabled)
```

**选项类型说明：**
- `TEMPERATURE` / `ICE_LEVEL` / `SUGAR_LEVEL`: 单选（radio）
- `TOPPING`: 多选（checkbox），可有加价

**默认值存储：**
默认值存储在 `product` 表中（每个商品独立配置）：
```typescript
product {
  default_temperature: enum('HOT', 'WARM', 'COLD', 'ICED') DEFAULT 'COLD'
  default_ice_level: enum('NO_ICE', 'LESS_ICE', 'NORMAL_ICE', 'EXTRA_ICE') DEFAULT 'NORMAL_ICE'
  default_sugar_level: enum('NO_SUGAR', 'HALF_SUGAR', 'NORMAL_SUGAR', 'EXTRA_SUGAR') DEFAULT 'NORMAL_SUGAR'
}
```

---

### 14. `order_item_option` 表

**字段定义：**
```typescript
order_item_option {
  id: int (PK, auto-increment)
  order_item_id: int (FK -> order_item.id) NOT NULL
  option_id: int (FK -> product_option.id) NOT NULL
  option_type: enum('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING') NOT NULL
  option_name_snapshot: varchar(100) NOT NULL  // 快照：下单时的选项名称
  price_adjustment_snapshot: decimal(10,2) NOT NULL  // 快照：下单时的加价金额
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_order_item_option_item ON order_item_option(order_item_id)
INDEX idx_order_item_option_option ON order_item_option(option_id)
```

**快照机制：**
- 订单创建时，保存选项的名称和价格快照
- 即使后续选项价格变动，历史订单价格不受影响

---

### 15. `campaign` 表

**字段定义：**
```typescript
campaign {
  id: int (PK, auto-increment)
  name: varchar(200) NOT NULL
  description: text
  start_date: date NOT NULL
  end_date: date NOT NULL
  status: enum('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') DEFAULT 'DRAFT'
  discount_type: enum('PERCENTAGE', 'FIXED_AMOUNT', 'NONE') DEFAULT 'NONE'
  discount_value: decimal(10,2) DEFAULT 0
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_campaign_status ON campaign(status)
INDEX idx_campaign_dates ON campaign(start_date, end_date)
```

---

### 16. `influencer` 表

**字段定义：**
```typescript
influencer {
  id: int (PK, auto-increment)
  name: varchar(200) NOT NULL
  phone: varchar(20)
  email: varchar(320)
  social_media: json NULL  // 社交媒体账号: { wechat: "xxx", douyin: "xxx" }
  commission_rate: decimal(5,2) DEFAULT 0  // 佣金比例（如10.00表示10%）
  is_enabled: boolean DEFAULT true
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_influencer_enabled ON influencer(is_enabled)
```

---

### 17. `campaign_code` 表（唯一约束）

**字段定义：**
```typescript
campaign_code {
  id: int (PK, auto-increment)
  campaign_id: int (FK -> campaign.id) NOT NULL
  influencer_id: int (FK -> influencer.id) NOT NULL
  code: varchar(20) UNIQUE NOT NULL  // 格式: A1234（展示友好）
  
  // 统计数据（冗余字段，便于快速查询）
  scan_count: int DEFAULT 0  // 扫码次数
  order_count: int DEFAULT 0  // 关联订单数
  total_gmv: decimal(10,2) DEFAULT 0  // 带来的GMV
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引与唯一约束：**
```sql
UNIQUE INDEX idx_campaign_code_unique ON campaign_code(campaign_id, influencer_id)
UNIQUE INDEX idx_campaign_code_code ON campaign_code(code)
INDEX idx_campaign_code_campaign ON campaign_code(campaign_id)
INDEX idx_campaign_code_influencer ON campaign_code(influencer_id)
```

**唯一性保证：**
- 每个达人在每个活动中只能有一个码（`campaign_id + influencer_id` 唯一）
- 码本身全局唯一（`code` 字段唯一）

---

### 18. `offline_scan_log` 表（去重策略）

**字段定义：**
```typescript
offline_scan_log {
  id: int (PK, auto-increment)
  campaign_code_id: int (FK -> campaign_code.id) NOT NULL
  store_id: int (FK -> store.id) NOT NULL
  cashier_id: int (FK -> users.id) NULL  // 收银员ID（可选）
  
  // 订单关联（可能为空，因为扫码时订单可能还未生成）
  order_id: int (FK -> order.id) NULL
  order_amount: decimal(10,2) NULL
  
  // 扫码时间（用于后续对账）
  scanned_at: timestamp DEFAULT NOW()
  
  // 匹配状态（用于后续对账流程）
  matched: boolean DEFAULT false  // 是否已匹配到订单
  matched_at: timestamp NULL
  
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_offline_scan_log_code ON offline_scan_log(campaign_code_id)
INDEX idx_offline_scan_log_store ON offline_scan_log(store_id)
INDEX idx_offline_scan_log_order ON offline_scan_log(order_id)
INDEX idx_offline_scan_log_matched ON offline_scan_log(matched, scanned_at)
```

**去重策略：**
- **不去重**：每次扫码都记录一条新记录（即使同一码在同一门店被多次扫描）
- **原因**：扫码记录用于对账和审计，不应删除或合并
- **匹配逻辑**：后台任务通过时间窗口（±5分钟）+ 门店 + 金额匹配订单

**业务规则：**
- 扫码行为立即落库，即使订单创建失败
- `order_id` 可为 NULL（后续匹配）
- 记录永久保留，不因活动结束删除

---

### 19. `iiko_sync_job` 表（幂等/去重/重试）

**字段定义：**
```typescript
iiko_sync_job {
  id: int (PK, auto-increment)
  job_type: enum('PRODUCT_SYNC', 'ORDER_PUSH', 'STOCK_SYNC', 'MENU_SYNC') NOT NULL
  resource_type: varchar(50) NOT NULL  // 'PRODUCT', 'ORDER', etc.
  resource_id: varchar(100) NOT NULL  // 关联资源ID
  
  // 同步方向
  direction: enum('TO_IIKO', 'FROM_IIKO') NOT NULL
  
  // 任务状态
  status: enum('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED') DEFAULT 'PENDING'
  retry_count: int DEFAULT 0
  max_retries: int DEFAULT 3
  
  // 同步数据（快照）
  payload: json NOT NULL  // 同步的数据内容
  
  // 执行结果
  error_message: text NULL
  iiko_response: json NULL  // IIKO API响应
  
  // 时间戳
  scheduled_at: timestamp DEFAULT NOW()
  started_at: timestamp NULL
  completed_at: timestamp NULL
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

**索引：**
```sql
INDEX idx_iiko_sync_job_status ON iiko_sync_job(status, scheduled_at)
INDEX idx_iiko_sync_job_resource ON iiko_sync_job(resource_type, resource_id)
INDEX idx_iiko_sync_job_retry ON iiko_sync_job(retry_count, status)
```

**幂等性保证：**
- 同一 `resource_type + resource_id` 同时只能有一个 `RUNNING` 状态的任务
- Worker 在启动任务前检查是否存在 `RUNNING` 任务 → 如果存在则跳过

**重试机制：**
- 失败后自动重试，最多 `max_retries` 次（默认3次）
- 每次重试递增 `retry_count`
- 超过最大重试次数后，状态保持 `FAILED`，需人工介入

**去重策略：**
- 通过 `resource_type + resource_id` 组合键防止重复任务
- 如果需要重新同步，必须等待当前任务完成或手动取消

---

### 20. `iiko_sync_log` 表

**字段定义：**
```typescript
iiko_sync_log {
  id: int (PK, auto-increment)
  job_id: int (FK -> iiko_sync_job.id) NOT NULL
  attempt_number: int NOT NULL  // 第几次尝试
  status: enum('SUCCESS', 'FAILED') NOT NULL
  request_payload: json NOT NULL
  response_payload: json NULL
  error_message: text NULL
  duration_ms: int NULL  // 执行耗时（毫秒）
  created_at: timestamp DEFAULT NOW()
}
```

**索引：**
```sql
INDEX idx_iiko_sync_log_job ON iiko_sync_log(job_id)
INDEX idx_iiko_sync_log_status ON iiko_sync_log(status, created_at)
```

**审计能力：**
- 每次同步尝试都记录详细日志
- 包含请求/响应完整内容（便于调试）
- 记录执行耗时（便于性能分析）

---

## 总结：关键约束与索引

### 唯一约束
1. `member.phone` - 手机号唯一
2. `idempotency_key.key` - 幂等键唯一
3. `coupon_template.code` - 优惠券模板代码唯一
4. `store_product(store_id, product_id)` - 门店商品组合唯一
5. `campaign_code.code` - 活动码全局唯一
6. `campaign_code(campaign_id, influencer_id)` - 每个达人每个活动一个码

### 互斥约束
1. `order` 表：`CHECK (NOT (used_points > 0 AND coupon_instance_id IS NOT NULL))`
   - 数据库级别强制积分与优惠券互斥

### 幂等性保证
1. `idempotency_key` 表：防止重复操作（注册送积分、支付捕获）
2. `iiko_sync_job` 表：同一资源同时只能有一个 RUNNING 任务

### 审计日志
1. `member_points_history` - 积分变更记录
2. `coupon_audit_log` - 优惠券调整记录
3. `special_price_audit_log` - 特价审批记录
4. `iiko_sync_log` - IIKO 同步记录
5. `offline_scan_log` - 线下扫码记录（永久保留）

---

**下一部分：B) API 端点详细定义**


---

## B) API 端点详细定义

### 1. 注册与验证 APIs

#### 1.1 `auth.sendVerificationCode`

**权限：** Public Mutation（无需登录）

**输入 DTO：**
```typescript
{
  phone: string;  // 格式: +79001234567 (E.164 format)
  purpose: 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';
}
```

**输出 DTO:**
```typescript
{
  success: boolean;
  message: string;  // "Verification code sent" or error message
  expiresIn: number;  // Seconds until code expires (300 = 5 minutes)
}
```

**关键校验逻辑：**
1. **速率限制**：检查 `phone_verification` 表，同一手机号1分钟内只能请求1次
2. **格式校验**：验证手机号符合 E.164 格式
3. **生成验证码**：随机生成6位数字验证码
4. **存储验证码**：插入 `phone_verification` 表，设置 `expires_at = NOW() + 5分钟`
5. **发送短信**：调用外部 SMS 服务（Twilio/Aliyun）

**错误码：**
- `TOO_MANY_REQUESTS`: 超过速率限制
- `INVALID_PHONE`: 手机号格式无效

---

#### 1.2 `auth.verifyPhoneAndRegister`

**权限：** Public Mutation（无需登录）

**输入 DTO：**
```typescript
{
  phone: string;
  code: string;  // 6-digit code
  name?: string;  // Optional: member name
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  member: {
    id: number;
    phone: string;
    name: string;
    total_points: number;  // Should be 100 for new members
    current_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  isNewMember: boolean;  // true if signup bonus was granted
  message: string;
}
```

**关键校验逻辑（注册送100积分幂等）：**
```typescript
// 1. 验证验证码
const verification = await db.select()
  .from(phoneVerification)
  .where(
    and(
      eq(phoneVerification.phone, phone),
      eq(phoneVerification.code, code),
      eq(phoneVerification.purpose, 'REGISTRATION'),
      eq(phoneVerification.verified, false),
      gt(phoneVerification.expiresAt, new Date())
    )
  );

if (verification.length === 0) {
  throw new Error('INVALID_CODE');
}

// 2. 检查会员是否已存在
let member = await db.select().from(members).where(eq(members.phone, phone));

let isNewMember = false;

if (member.length === 0) {
  // 3. 创建新会员
  const [newMember] = await db.insert(members).values({
    phone,
    name: name || `User_${phone.slice(-4)}`,
    phone_verified: true,
    phone_verified_at: new Date(),
    total_points: 0,
    current_tier: 'BRONZE'
  }).returning();
  
  member = [newMember];
  isNewMember = true;
  
  // 4. 幂等性检查：注册送积分
  const idempotencyKey = `signup_bonus:${phone}`;
  const existing = await db.select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, idempotencyKey));
  
  if (existing.length === 0) {
    // 5. 发放100积分
    await db.insert(memberPointsHistory).values({
      member_id: newMember.id,
      points_change: 100,
      balance_after: 100,
      reason: 'SIGNUP_BONUS',
      description: 'Welcome bonus for new member'
    });
    
    // 6. 更新会员积分余额
    await db.update(members)
      .set({ total_points: 100 })
      .where(eq(members.id, newMember.id));
    
    // 7. 记录幂等键
    await db.insert(idempotencyKeys).values({
      key: idempotencyKey,
      resource_type: 'SIGNUP_BONUS',
      resource_id: newMember.id.toString()
    });
  }
} else {
  // 已存在会员，仅标记手机已验证
  await db.update(members)
    .set({ 
      phone_verified: true,
      phone_verified_at: member[0].phone_verified_at || new Date()
    })
    .where(eq(members.id, member[0].id));
}

// 8. 标记验证码已使用
await db.update(phoneVerification)
  .set({ verified: true, verified_at: new Date() })
  .where(eq(phoneVerification.id, verification[0].id));

return {
  success: true,
  member: member[0],
  isNewMember,
  message: isNewMember ? 'Registration successful, 100 points granted' : 'Login successful'
};
```

**错误码：**
- `INVALID_CODE`: 验证码不匹配或已过期
- `CODE_ALREADY_USED`: 验证码已被使用

---

### 2. 结算与价格计算 APIs

#### 2.1 `products.calculatePrice`

**权限：** Public Query（无需登录）

**输入 DTO：**
```typescript
{
  productId: number;
  storeId?: number;  // Optional: if provided, use store-specific price
  selectedOptions: {
    temperatureId: number;
    iceLevelId: number;
    sugarLevelId: number;
    toppingIds: number[];  // Array of topping IDs
  };
}
```

**输出 DTO：**
```typescript
{
  basePrice: number;
  optionsPrice: number;  // Sum of all price adjustments
  totalPrice: number;  // basePrice + optionsPrice
  breakdown: {
    base: { label: string; amount: number };
    options: Array<{ label: string; amount: number }>;
  };
}
```

**关键校验逻辑（实时价格计算）：**
```typescript
// 1. 获取商品基础价格
const product = await db.select().from(products).where(eq(products.id, productId));
let basePrice = product[0].base_price;

// 2. 如果提供了门店ID，检查门店特殊定价
if (storeId) {
  const storeProduct = await db.select()
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.store_id, storeId),
        eq(storeProducts.product_id, productId)
      )
    );
  
  if (storeProduct.length > 0 && storeProduct[0].price_override !== null) {
    basePrice = storeProduct[0].price_override;
  }
}

// 3. 计算选项加价
const optionIds = [
  selectedOptions.temperatureId,
  selectedOptions.iceLevelId,
  selectedOptions.sugarLevelId,
  ...selectedOptions.toppingIds
];

const options = await db.select()
  .from(productOptions)
  .where(inArray(productOptions.id, optionIds));

let optionsPrice = 0;
const breakdown = [];

for (const option of options) {
  optionsPrice += option.price_adjustment;
  if (option.price_adjustment > 0) {
    breakdown.push({
      label: option.option_name_zh,  // Or use current language
      amount: option.price_adjustment
    });
  }
}

// 4. 计算总价
const totalPrice = basePrice + optionsPrice;

return {
  basePrice,
  optionsPrice,
  totalPrice,
  breakdown: {
    base: { label: product[0].name_zh, amount: basePrice },
    options: breakdown
  }
};
```

---

#### 2.2 `orders.createOrder`

**权限：** Protected Mutation（需要登录）

**输入 DTO：**
```typescript
{
  storeId: number;
  items: Array<{
    productId: number;
    quantity: number;
    selectedOptions: {
      temperatureId: number;
      iceLevelId: number;
      sugarLevelId: number;
      toppingIds: number[];
    };
  }>;
  
  // Payment options (mutual exclusion)
  usePoints: boolean;
  couponInstanceId?: number;
  
  // Campaign code
  campaignCode?: string;  // Optional: if user scanned code in app
  
  deliveryAddress?: string;
  notes?: string;
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  order: {
    id: number;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    finalAmount: number;
    status: 'PENDING';
    paymentUrl?: string;  // If payment required
  };
}
```

**关键校验逻辑（后端复算 + 互斥校验）：**
```typescript
// 1. **互斥校验**：积分与优惠券不能同时使用
if (usePoints && couponInstanceId) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot use points and coupon together'
  });
}

// 2. 后端重新计算订单价格（防止前端篡改）
let subtotal = 0;
let pointsEarnedTotal = 0;
const orderItems = [];

for (const item of items) {
  // 获取商品价格（含门店覆盖价）
  const product = await db.select().from(products).where(eq(products.id, item.productId));
  let itemPrice = product[0].base_price;
  
  const storeProduct = await db.select()
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.store_id, storeId),
        eq(storeProducts.product_id, item.productId)
      )
    );
  
  if (storeProduct.length > 0 && storeProduct[0].price_override !== null) {
    itemPrice = storeProduct[0].price_override;
  }
  
  // 计算选项加价
  const optionIds = [
    item.selectedOptions.temperatureId,
    item.selectedOptions.iceLevelId,
    item.selectedOptions.sugarLevelId,
    ...item.selectedOptions.toppingIds
  ];
  
  const options = await db.select()
    .from(productOptions)
    .where(inArray(productOptions.id, optionIds));
  
  let optionsPrice = 0;
  for (const option of options) {
    optionsPrice += option.price_adjustment;
  }
  
  const itemTotal = (itemPrice + optionsPrice) * item.quantity;
  subtotal += itemTotal;
  
  // 特价商品不参与积分累积
  if (!product[0].is_special_price) {
    pointsEarnedTotal += Math.floor(itemTotal / 10);  // 每10元1积分
  }
  
  orderItems.push({
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: itemPrice,
    options_price: optionsPrice,
    subtotal: itemTotal,
    options: options  // 保存选项快照
  });
}

// 3. 计算折扣金额
let discountAmount = 0;
let usedPoints = 0;
let pointsDiscountAmount = 0;
let couponDiscountAmount = 0;

if (usePoints) {
  // **积分全额抵扣逻辑**
  const member = await db.select().from(members).where(eq(members.id, ctx.user.id));
  const availablePoints = member[0].total_points;
  
  // 计算需要的积分数（假设1积分=1元）
  const requiredPoints = subtotal;
  
  if (availablePoints < requiredPoints) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient points. Required: ${requiredPoints}, Available: ${availablePoints}`
    });
  }
  
  usedPoints = requiredPoints;
  pointsDiscountAmount = requiredPoints;
  discountAmount = pointsDiscountAmount;
  
} else if (couponInstanceId) {
  // 验证优惠券
  const coupon = await db.select()
    .from(couponInstances)
    .where(
      and(
        eq(couponInstances.id, couponInstanceId),
        eq(couponInstances.member_id, ctx.user.id),
        eq(couponInstances.status, 'UNUSED')
      )
    );
  
  if (coupon.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid or expired coupon'
    });
  }
  
  // 检查优惠券有效期（使用adjusted_valid_until优先）
  const validUntil = coupon[0].adjusted_valid_until || coupon[0].original_valid_until;
  if (new Date() > validUntil) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Coupon expired'
    });
  }
  
  // 获取优惠券模板
  const template = await db.select()
    .from(couponTemplates)
    .where(eq(couponTemplates.id, coupon[0].template_id));
  
  // 检查最低订单金额
  if (subtotal < template[0].min_order_amount) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Minimum order amount: ${template[0].min_order_amount}`
    });
  }
  
  // 检查适用范围
  if (template[0].scope_type === 'STORES') {
    const scopeStoreIds = JSON.parse(template[0].scope_store_ids);
    if (!scopeStoreIds.includes(storeId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Coupon not valid at this store'
      });
    }
  }
  
  // 计算折扣金额
  if (template[0].discount_type === 'PERCENTAGE') {
    couponDiscountAmount = subtotal * (template[0].discount_value / 100);
  } else {
    couponDiscountAmount = template[0].discount_value;
  }
  
  discountAmount = couponDiscountAmount;
}

// 4. 计算最终金额
const finalAmount = subtotal - discountAmount;

// 5. 生成订单号（P=PWA, T=Telegram, K=Delivery, M=Pickup）
const orderNumber = `P${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

// 6. 创建订单
const [order] = await db.insert(orders).values({
  order_number: orderNumber,
  member_id: ctx.user.id,
  store_id: storeId,
  subtotal,
  discount_amount: discountAmount,
  final_amount: finalAmount,
  used_points: usedPoints,
  points_discount_amount: pointsDiscountAmount,
  coupon_instance_id: couponInstanceId || null,
  coupon_discount_amount: couponDiscountAmount,
  status: 'PENDING',
  payment_status: 'PENDING'
}).returning();

// 7. 创建订单项（含选项快照）
for (const item of orderItems) {
  const [orderItem] = await db.insert(orderItems).values({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    options_price: item.options_price,
    subtotal: item.subtotal
  }).returning();
  
  // 保存选项快照
  for (const option of item.options) {
    await db.insert(orderItemOptions).values({
      order_item_id: orderItem.id,
      option_id: option.id,
      option_type: option.option_type,
      option_name_snapshot: option.option_name_zh,
      price_adjustment_snapshot: option.price_adjustment
    });
  }
}

// 8. 如果使用积分，扣除积分
if (usedPoints > 0) {
  await db.update(members)
    .set({ total_points: sql`total_points - ${usedPoints}` })
    .where(eq(members.id, ctx.user.id));
  
  await db.insert(memberPointsHistory).values({
    member_id: ctx.user.id,
    points_change: -usedPoints,
    balance_after: member[0].total_points - usedPoints,
    reason: 'ORDER_REDEEM',
    order_id: order.id,
    description: `Redeemed ${usedPoints} points for order ${orderNumber}`
  });
}

// 9. 如果使用优惠券，标记为已使用
if (couponInstanceId) {
  await db.update(couponInstances)
    .set({ 
      status: 'USED',
      used_at: new Date(),
      used_order_id: order.id
    })
    .where(eq(couponInstances.id, couponInstanceId));
}

// 10. 如果需要支付，创建支付链接
let paymentUrl = null;
if (finalAmount > 0) {
  // 调用支付网关创建预授权
  paymentUrl = await createPaymentHold(order.id, finalAmount);
}

return {
  success: true,
  order: {
    id: order.id,
    orderNumber: order.order_number,
    subtotal: order.subtotal,
    discountAmount: order.discount_amount,
    finalAmount: order.final_amount,
    status: order.status,
    paymentUrl
  }
};
```

**错误码：**
- `POINTS_COUPON_CONFLICT`: 积分与优惠券同时使用
- `INSUFFICIENT_POINTS`: 积分不足以全额抵扣
- `INVALID_COUPON`: 优惠券无效或已过期
- `PRICE_MISMATCH`: 前后端价格不一致（防篡改）

---

### 3. 优惠券管理 APIs

#### 3.1 `coupons.getMyCoupons`

**权限：** Protected Query（需要登录）

**输入 DTO：**
```typescript
{
  status?: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
  tags?: string[];  // Filter by tags
}
```

**输出 DTO：**
```typescript
{
  coupons: Array<{
    id: number;
    template: {
      code: string;
      name: { zh: string; en: string; ru: string };
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      discountValue: number;
      minOrderAmount: number;
    };
    status: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
    validUntil: string;  // Use adjusted_valid_until if exists, else original_valid_until
    sourceType: string;
    tags: string[];
    usedAt?: string;
  }>;
}
```

**关键校验逻辑（追踪与审计）：**
- 返回用户所有优惠券，包含来源追踪信息（`source_type`, `source_id`）
- 返回标签信息（`tags`），便于前端分类展示
- 优先使用 `adjusted_valid_until`（如果后台延期过）

---

#### 3.2 `coupons.validateCoupon`

**权限：** Protected Query（需要登录）

**输入 DTO：**
```typescript
{
  couponInstanceId: number;
  storeId: number;
  productIds: number[];
  orderAmount: number;
  usingPoints: boolean;  // If true, reject (mutual exclusion)
}
```

**输出 DTO：**
```typescript
{
  valid: boolean;
  reason?: string;  // If invalid, explain why
  discountAmount: number;  // Calculated discount if valid
}
```

**关键校验逻辑：**
```typescript
// 1. 互斥检查
if (usingPoints) {
  return {
    valid: false,
    reason: 'Cannot use coupon with points',
    discountAmount: 0
  };
}

// 2. 查询优惠券实例
const coupon = await db.select()
  .from(couponInstances)
  .where(
    and(
      eq(couponInstances.id, couponInstanceId),
      eq(couponInstances.member_id, ctx.user.id)
    )
  );

if (coupon.length === 0) {
  return { valid: false, reason: 'Coupon not found', discountAmount: 0 };
}

// 3. 检查状态
if (coupon[0].status !== 'UNUSED') {
  return { valid: false, reason: `Coupon status: ${coupon[0].status}`, discountAmount: 0 };
}

// 4. 检查有效期（优先使用adjusted_valid_until）
const validUntil = coupon[0].adjusted_valid_until || coupon[0].original_valid_until;
if (new Date() > validUntil) {
  return { valid: false, reason: 'Coupon expired', discountAmount: 0 };
}

// 5. 查询优惠券模板
const template = await db.select()
  .from(couponTemplates)
  .where(eq(couponTemplates.id, coupon[0].template_id));

// 6. 检查最低订单金额
if (orderAmount < template[0].min_order_amount) {
  return { 
    valid: false, 
    reason: `Minimum order amount: ${template[0].min_order_amount}`, 
    discountAmount: 0 
  };
}

// 7. 检查适用范围
if (template[0].scope_type === 'STORES') {
  const scopeStoreIds = JSON.parse(template[0].scope_store_ids);
  if (!scopeStoreIds.includes(storeId)) {
    return { valid: false, reason: 'Not valid at this store', discountAmount: 0 };
  }
}

if (template[0].scope_type === 'PRODUCTS') {
  const scopeProductIds = JSON.parse(template[0].scope_product_ids);
  const hasValidProduct = productIds.some(id => scopeProductIds.includes(id));
  if (!hasValidProduct) {
    return { valid: false, reason: 'Not valid for these products', discountAmount: 0 };
  }
}

// 8. 计算折扣金额
let discountAmount = 0;
if (template[0].discount_type === 'PERCENTAGE') {
  discountAmount = orderAmount * (template[0].discount_value / 100);
} else {
  discountAmount = template[0].discount_value;
}

return {
  valid: true,
  discountAmount
};
```

---

#### 3.3 `coupons.extendCouponExpiration` (Admin)

**权限：** Admin Mutation（需要管理员权限）

**输入 DTO：**
```typescript
{
  couponInstanceId: number;
  newExpirationDate: string;  // ISO date
  reason: string;
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  message: string;
}
```

**关键校验逻辑（审计）：**
```typescript
// 1. 获取优惠券当前状态
const coupon = await db.select()
  .from(couponInstances)
  .where(eq(couponInstances.id, couponInstanceId));

if (coupon.length === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Coupon not found' });
}

const oldValue = {
  original_valid_until: coupon[0].original_valid_until,
  adjusted_valid_until: coupon[0].adjusted_valid_until
};

// 2. 更新有效期
await db.update(couponInstances)
  .set({ adjusted_valid_until: new Date(newExpirationDate) })
  .where(eq(couponInstances.id, couponInstanceId));

// 3. 记录审计日志
await db.insert(couponAuditLogs).values({
  coupon_instance_id: couponInstanceId,
  operator_id: ctx.user.id,
  action: 'EXTENDED',
  old_value: JSON.stringify(oldValue),
  new_value: JSON.stringify({ adjusted_valid_until: newExpirationDate }),
  reason
});

return {
  success: true,
  message: 'Coupon expiration extended successfully'
};
```

---

### 4. 特价审批 APIs

#### 4.1 `specialPrice.createRequest`

**权限：** Protected Mutation（门店店长或管理员）

**输入 DTO：**
```typescript
{
  requestType: 'PRODUCT' | 'STORE_PRODUCT';
  productId: number;
  storeId?: number;  // Required if requestType = STORE_PRODUCT
  specialPrice: number;
  startDate: string;  // ISO date: "2026-01-15"
  endDate: string;
  reason: string;
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  request: {
    id: number;
    status: 'PENDING';
    message: string;  // "Special price request submitted for approval"
  };
}
```

**关键校验逻辑：**
```typescript
// 1. 获取原价
let originalPrice = 0;
if (requestType === 'PRODUCT') {
  const product = await db.select().from(products).where(eq(products.id, productId));
  originalPrice = product[0].base_price;
} else {
  const storeProduct = await db.select()
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.store_id, storeId),
        eq(storeProducts.product_id, productId)
      )
    );
  originalPrice = storeProduct[0].price_override || product[0].base_price;
}

// 2. 创建审批请求
const [request] = await db.insert(specialPriceRequests).values({
  request_type: requestType,
  product_id: productId,
  store_id: storeId || null,
  original_price: originalPrice,
  special_price: specialPrice,
  start_date: new Date(startDate),
  end_date: new Date(endDate),
  reason,
  requester_id: ctx.user.id,
  requester_role: ctx.user.role,
  status: 'PENDING'
}).returning();

// 3. 记录审计日志
await db.insert(specialPriceAuditLogs).values({
  request_id: request.id,
  operator_id: ctx.user.id,
  action: 'CREATED',
  comment: reason
});

// 4. 通知审批人（TODO: 发送通知）

return {
  success: true,
  request: {
    id: request.id,
    status: 'PENDING',
    message: 'Special price request submitted for approval'
  }
};
```

---

#### 4.2 `specialPrice.approveRequest` (Admin)

**权限：** Admin Mutation（需要管理员权限）

**输入 DTO：**
```typescript
{
  requestId: number;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  message: string;
}
```

**关键校验逻辑（生效/结束机制）：**
```typescript
// 1. 获取请求
const request = await db.select()
  .from(specialPriceRequests)
  .where(eq(specialPriceRequests.id, requestId));

if (request.length === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found' });
}

if (request[0].status !== 'PENDING') {
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request already processed' });
}

// 2. 更新请求状态
const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
await db.update(specialPriceRequests)
  .set({
    status: newStatus,
    approver_id: ctx.user.id,
    approved_at: new Date(),
    approval_comment: comment || null
  })
  .where(eq(specialPriceRequests.id, requestId));

// 3. 如果批准且生效日期<=今天，立即生效
if (action === 'APPROVE' && new Date(request[0].start_date) <= new Date()) {
  await db.update(specialPriceRequests)
    .set({ status: 'ACTIVE' })
    .where(eq(specialPriceRequests.id, requestId));
  
  // 应用特价
  if (request[0].request_type === 'PRODUCT') {
    await db.update(products)
      .set({ 
        base_price: request[0].special_price,
        is_special_price: true
      })
      .where(eq(products.id, request[0].product_id));
  } else {
    await db.update(storeProducts)
      .set({ price_override: request[0].special_price })
      .where(
        and(
          eq(storeProducts.store_id, request[0].store_id),
          eq(storeProducts.product_id, request[0].product_id)
        )
      );
  }
}

// 4. 记录审计日志
await db.insert(specialPriceAuditLogs).values({
  request_id: requestId,
  operator_id: ctx.user.id,
  action: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
  comment: comment || null
});

return {
  success: true,
  message: `Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`
};
```

**自动生效/结束机制（Cron Job）：**
```typescript
// 每日运行的 Cron 任务
async function runDailyTransition() {
  const today = new Date();
  
  // 1. 激活已批准且到达生效日期的请求
  const toActivate = await db.select()
    .from(specialPriceRequests)
    .where(
      and(
        eq(specialPriceRequests.status, 'APPROVED'),
        lte(specialPriceRequests.start_date, today)
      )
    );
  
  for (const request of toActivate) {
    // 应用特价
    if (request.request_type === 'PRODUCT') {
      await db.update(products)
        .set({ 
          base_price: request.special_price,
          is_special_price: true
        })
        .where(eq(products.id, request.product_id));
    } else {
      await db.update(storeProducts)
        .set({ price_override: request.special_price })
        .where(
          and(
            eq(storeProducts.store_id, request.store_id),
            eq(storeProducts.product_id, request.product_id)
          )
        );
    }
    
    // 更新状态
    await db.update(specialPriceRequests)
      .set({ status: 'ACTIVE' })
      .where(eq(specialPriceRequests.id, request.id));
    
    // 记录审计日志
    await db.insert(specialPriceAuditLogs).values({
      request_id: request.id,
      operator_id: null,  // System action
      action: 'ACTIVATED',
      comment: 'Auto-activated by system'
    });
  }
  
  // 2. 结束已过期的活动特价
  const toEnd = await db.select()
    .from(specialPriceRequests)
    .where(
      and(
        eq(specialPriceRequests.status, 'ACTIVE'),
        lt(specialPriceRequests.end_date, today)
      )
    );
  
  for (const request of toEnd) {
    // 恢复原价
    if (request.request_type === 'PRODUCT') {
      await db.update(products)
        .set({ 
          base_price: request.original_price,
          is_special_price: false
        })
        .where(eq(products.id, request.product_id));
    } else {
      await db.update(storeProducts)
        .set({ price_override: request.original_price })
        .where(
          and(
            eq(storeProducts.store_id, request.store_id),
            eq(storeProducts.product_id, request.product_id)
          )
        );
    }
    
    // 更新状态
    await db.update(specialPriceRequests)
      .set({ status: 'ENDED' })
      .where(eq(specialPriceRequests.id, request.id));
    
    // 记录审计日志
    await db.insert(specialPriceAuditLogs).values({
      request_id: request.id,
      operator_id: null,  // System action
      action: 'ENDED',
      comment: 'Auto-ended by system'
    });
  }
}
```

---

### 5. 达人活动码 APIs

#### 5.1 `campaigns.createCampaignCode`

**权限：** Admin Mutation（需要管理员权限）

**输入 DTO：**
```typescript
{
  campaignId: number;
  influencerId: number;
  codePrefix?: string;  // Optional: custom prefix (default: auto-generated)
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  code: {
    id: number;
    code: string;  // e.g., "A1234"
    campaignId: number;
    influencerId: number;
  };
}
```

**关键校验逻辑（唯一约束）：**
```typescript
// 1. 检查是否已存在
const existing = await db.select()
  .from(campaignCodes)
  .where(
    and(
      eq(campaignCodes.campaign_id, campaignId),
      eq(campaignCodes.influencer_id, influencerId)
    )
  );

if (existing.length > 0) {
  return {
    success: true,
    code: existing[0]  // 返回已存在的码
  };
}

// 2. 生成唯一码
let code = '';
let isUnique = false;

while (!isUnique) {
  const prefix = codePrefix || 'A';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);  // 4位随机数
  code = `${prefix}${randomDigits}`;
  
  // 检查全局唯一性
  const duplicate = await db.select()
    .from(campaignCodes)
    .where(eq(campaignCodes.code, code));
  
  if (duplicate.length === 0) {
    isUnique = true;
  }
}

// 3. 创建活动码
const [newCode] = await db.insert(campaignCodes).values({
  campaign_id: campaignId,
  influencer_id: influencerId,
  code,
  scan_count: 0,
  order_count: 0,
  total_gmv: 0
}).returning();

return {
  success: true,
  code: newCode
};
```

---

#### 5.2 `campaigns.scanOfflineCode`

**权限：** Protected Mutation（收银员角色）

**输入 DTO：**
```typescript
{
  code: string;  // Scanned code (e.g., "A1234")
  storeId: number;
  orderId?: number;  // Optional: if order already created
  orderAmount?: number;  // Optional: if order already created
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  campaign: {
    id: number;
    name: string;
    discountType: string;
    discountValue: number;
  };
  influencer: {
    id: number;
    name: string;
  };
  message: string;  // "Code scanned successfully"
}
```

**关键校验逻辑：**
```typescript
// 1. 验证活动码
const campaignCode = await db.select()
  .from(campaignCodes)
  .where(eq(campaignCodes.code, code));

if (campaignCode.length === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid code' });
}

// 2. 验证活动状态
const campaign = await db.select()
  .from(campaigns)
  .where(eq(campaigns.id, campaignCode[0].campaign_id));

if (campaign[0].status !== 'ACTIVE') {
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign is not active' });
}

// 3. **立即记录扫码日志**（即使订单未创建）
await db.insert(offlineScanLogs).values({
  campaign_code_id: campaignCode[0].id,
  store_id: storeId,
  cashier_id: ctx.user.id,
  order_id: orderId || null,
  order_amount: orderAmount || null,
  scanned_at: new Date(),
  matched: orderId ? true : false,
  matched_at: orderId ? new Date() : null
});

// 4. 更新活动码统计
await db.update(campaignCodes)
  .set({ 
    scan_count: sql`scan_count + 1`,
    order_count: orderId ? sql`order_count + 1` : sql`order_count`,
    total_gmv: orderId && orderAmount ? sql`total_gmv + ${orderAmount}` : sql`total_gmv`
  })
  .where(eq(campaignCodes.id, campaignCode[0].id));

// 5. 如果提供了订单ID，更新订单
if (orderId) {
  await db.update(orders)
    .set({ campaign_code_id: campaignCode[0].id })
    .where(eq(orders.id, orderId));
}

// 6. 获取达人信息
const influencer = await db.select()
  .from(influencers)
  .where(eq(influencers.id, campaignCode[0].influencer_id));

return {
  success: true,
  campaign: {
    id: campaign[0].id,
    name: campaign[0].name,
    discountType: campaign[0].discount_type,
    discountValue: campaign[0].discount_value
  },
  influencer: {
    id: influencer[0].id,
    name: influencer[0].name
  },
  message: 'Code scanned successfully'
};
```

---

### 6. IIKO 同步队列 APIs

#### 6.1 `iiko.queueProductSync`

**权限：** Admin Mutation（需要管理员权限）

**输入 DTO：**
```typescript
{
  productIds: number[];  // Array of product IDs to sync
  direction: 'TO_IIKO' | 'FROM_IIKO';
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  jobIds: number[];  // Created job IDs
  message: string;
}
```

**关键校验逻辑（幂等/去重）：**
```typescript
const jobIds = [];

for (const productId of productIds) {
  // 1. 检查是否已有RUNNING任务
  const runningJobs = await db.select()
    .from(iikoSyncJobs)
    .where(
      and(
        eq(iikoSyncJobs.resource_type, 'PRODUCT'),
        eq(iikoSyncJobs.resource_id, productId.toString()),
        eq(iikoSyncJobs.status, 'RUNNING')
      )
    );
  
  if (runningJobs.length > 0) {
    console.log(`Skipping product ${productId}: already syncing`);
    continue;
  }
  
  // 2. 获取商品数据
  const product = await db.select().from(products).where(eq(products.id, productId));
  
  // 3. 创建同步任务
  const [job] = await db.insert(iikoSyncJobs).values({
    job_type: 'PRODUCT_SYNC',
    resource_type: 'PRODUCT',
    resource_id: productId.toString(),
    direction,
    status: 'PENDING',
    retry_count: 0,
    max_retries: 3,
    payload: JSON.stringify(product[0]),
    scheduled_at: new Date()
  }).returning();
  
  jobIds.push(job.id);
}

return {
  success: true,
  jobIds,
  message: `${jobIds.length} sync jobs created`
};
```

---

#### 6.2 `iiko.processSyncQueue` (Background Worker)

**权限：** Internal（后台任务）

**处理逻辑（重试机制）：**
```typescript
async function processSyncQueue() {
  // 1. 获取待处理任务
  const pendingJobs = await db.select()
    .from(iikoSyncJobs)
    .where(eq(iikoSyncJobs.status, 'PENDING'))
    .orderBy(iikoSyncJobs.scheduled_at)
    .limit(10);
  
  for (const job of pendingJobs) {
    // 2. 冲突检查：同一资源是否有RUNNING任务
    const runningJobs = await db.select()
      .from(iikoSyncJobs)
      .where(
        and(
          eq(iikoSyncJobs.resource_type, job.resource_type),
          eq(iikoSyncJobs.resource_id, job.resource_id),
          eq(iikoSyncJobs.status, 'RUNNING')
        )
      );
    
    if (runningJobs.length > 0) {
      console.log(`Skipping job ${job.id}: resource already syncing`);
      continue;
    }
    
    // 3. 标记为RUNNING
    await db.update(iikoSyncJobs)
      .set({ status: 'RUNNING', started_at: new Date() })
      .where(eq(iikoSyncJobs.id, job.id));
    
    const startTime = Date.now();
    
    try {
      // 4. 执行同步
      if (job.direction === 'FROM_IIKO') {
        // 从IIKO拉取数据
        const iikoData = await fetchFromIIKO(job.resource_type, job.resource_id);
        
        // 5. 检查手动覆盖保护
        if (job.resource_type === 'PRODUCT') {
          const product = await db.select()
            .from(products)
            .where(eq(products.id, parseInt(job.resource_id)));
          
          if (product[0].is_manual_override) {
            // 记录冲突，跳过价格更新
            await db.insert(iikoSyncLogs).values({
              job_id: job.id,
              attempt_number: job.retry_count + 1,
              status: 'SUCCESS',
              request_payload: JSON.stringify(job.payload),
              response_payload: JSON.stringify(iikoData),
              error_message: 'Price update skipped: manual override enabled',
              duration_ms: Date.now() - startTime
            });
            
            await db.update(iikoSyncJobs)
              .set({ 
                status: 'SUCCESS',
                completed_at: new Date(),
                iiko_response: JSON.stringify(iikoData)
              })
              .where(eq(iikoSyncJobs.id, job.id));
            
            continue;
          }
        }
        
        // 6. 更新本地数据
        await updateLocalData(job.resource_type, job.resource_id, iikoData);
        
      } else {
        // 推送数据到IIKO
        const response = await pushToIIKO(job.resource_type, JSON.parse(job.payload));
      }
      
      // 7. 标记为SUCCESS
      await db.update(iikoSyncJobs)
        .set({ 
          status: 'SUCCESS',
          completed_at: new Date()
        })
        .where(eq(iikoSyncJobs.id, job.id));
      
      // 8. 记录成功日志
      await db.insert(iikoSyncLogs).values({
        job_id: job.id,
        attempt_number: job.retry_count + 1,
        status: 'SUCCESS',
        request_payload: JSON.stringify(job.payload),
        response_payload: JSON.stringify(response),
        duration_ms: Date.now() - startTime
      });
      
    } catch (error) {
      // 9. 处理失败
      const errorMessage = error.message;
      
      // 10. 记录失败日志
      await db.insert(iikoSyncLogs).values({
        job_id: job.id,
        attempt_number: job.retry_count + 1,
        status: 'FAILED',
        request_payload: JSON.stringify(job.payload),
        error_message: errorMessage,
        duration_ms: Date.now() - startTime
      });
      
      // 11. 重试逻辑
      if (job.retry_count < job.max_retries) {
        await db.update(iikoSyncJobs)
          .set({ 
            status: 'PENDING',
            retry_count: job.retry_count + 1,
            error_message: errorMessage,
            scheduled_at: new Date(Date.now() + 60000)  // 1分钟后重试
          })
          .where(eq(iikoSyncJobs.id, job.id));
      } else {
        await db.update(iikoSyncJobs)
          .set({ 
            status: 'FAILED',
            error_message: errorMessage,
            completed_at: new Date()
          })
          .where(eq(iikoSyncJobs.id, job.id));
      }
    }
  }
}
```

---

#### 6.3 `iiko.retryFailedJob` (Admin)

**权限：** Admin Mutation（需要管理员权限）

**输入 DTO：**
```typescript
{
  jobId: number;
}
```

**输出 DTO：**
```typescript
{
  success: boolean;
  message: string;
}
```

**关键校验逻辑：**
```typescript
// 1. 获取任务
const job = await db.select()
  .from(iikoSyncJobs)
  .where(eq(iikoSyncJobs.id, jobId));

if (job.length === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
}

if (job[0].status !== 'FAILED') {
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Job is not in FAILED status' });
}

// 2. 重置任务状态（手动重试不计入retry_count）
await db.update(iikoSyncJobs)
  .set({ 
    status: 'PENDING',
    retry_count: 0,  // 重置重试次数
    error_message: null,
    scheduled_at: new Date()
  })
  .where(eq(iikoSyncJobs.id, jobId));

return {
  success: true,
  message: 'Job reset to PENDING for retry'
};
```

---

## C) 代码实现（当前阶段未开始）

**说明：** 当前阶段处于设计评审阶段，尚未开始编写 Drizzle schema 和业务逻辑代码。

待您批准数据模型和 API 规范后，将按以下顺序实施：

1. **Drizzle Schema 定义**（`drizzle/schema.ts`）
2. **数据库迁移**（`pnpm db:push`）
3. **tRPC Routers 实现**（`server/routers/*.ts`）
4. **业务逻辑函数**（价格计算、积分计算、优惠券校验）
5. **自动化测试**（Vitest 单元测试）

---

**状态：** ⏳ 等待您的批准后开始实施
