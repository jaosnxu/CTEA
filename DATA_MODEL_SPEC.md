# CHU TEA Platform - Data Model Specification

**Version:** 2.0  
**Date:** January 6, 2026  
**Status:** Pending Approval

---

## Overview

This document defines the complete database schema for the 8 advanced business features:

1. Phone verification registration with idempotency
2. Product options with real-time pricing
3. Product reviews and likes
4. Store-product configuration
5. Special price approval workflow
6. Enhanced coupon tracking
7. Influencer campaign codes with offline scanning
8. IIKO sync queue with conflict protection

---

## 1. Member & Registration System

### 1.1 Extended `member` Table

**Purpose:** Store member information with phone verification support

```typescript
member {
  id: int (PK, auto-increment)
  phone: varchar(20) UNIQUE NOT NULL  // 新增：手机号（唯一）
  phone_verified: boolean DEFAULT false  // 新增：手机是否已验证
  phone_verified_at: timestamp NULL  // 新增：首次验证时间（用于判断注册奖励）
  name: varchar(100)
  email: varchar(320)
  avatar_url: text
  group_id: int (FK -> member_group.id) NULL  // 保留单组，预留扩展
  total_points: int DEFAULT 0
  current_tier: enum('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') DEFAULT 'BRONZE'
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_member_phone ON member(phone)
INDEX idx_member_group ON member(group_id)
```

**Key Changes:**
- Added `phone`, `phone_verified`, `phone_verified_at` for phone verification
- `group_id` remains single-group (nullable for future multi-group migration)

---

### 1.2 New `phone_verification` Table

**Purpose:** Store phone verification codes with expiration and idempotency

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

INDEX idx_phone_verification_phone ON phone_verification(phone, purpose, verified)
INDEX idx_phone_verification_expires ON phone_verification(expires_at)
```

**Business Rules:**
- Verification code expires in 5 minutes
- Same phone can only request 1 code per minute (rate limiting)
- Code is 6 digits (numeric)

---

### 1.3 New `idempotency_key` Table

**Purpose:** Prevent duplicate operations (signup bonus, payment capture, etc.)

```typescript
idempotency_key {
  id: int (PK, auto-increment)
  key: varchar(255) UNIQUE NOT NULL  // 格式: "signup_bonus:{phone}", "payment_capture:{order_id}"
  resource_type: varchar(50) NOT NULL  // 'SIGNUP_BONUS', 'PAYMENT_CAPTURE', etc.
  resource_id: varchar(100) NULL  // 关联资源ID（如member_id, order_id）
  created_at: timestamp DEFAULT NOW()
  expires_at: timestamp NULL  // 可选：幂等键过期时间（某些场景需要）
}

UNIQUE INDEX idx_idempotency_key ON idempotency_key(key)
INDEX idx_idempotency_resource ON idempotency_key(resource_type, resource_id)
```

**Usage Example:**
```typescript
// Check idempotency before granting signup bonus
const key = `signup_bonus:${phone}`;
const existing = await db.select().from(idempotencyKey).where(eq(idempotencyKey.key, key));
if (existing.length > 0) {
  return { success: false, message: 'Signup bonus already granted' };
}

// Grant bonus and record idempotency key
await db.insert(memberPointsHistory).values({ ... });
await db.insert(idempotencyKey).values({ key, resource_type: 'SIGNUP_BONUS', resource_id: memberId });
```

---

## 2. Product Options & Real-time Pricing

### 2.1 Extended `product` Table

**Purpose:** Add default option values per product

```typescript
product {
  id: int (PK, auto-increment)
  name_zh: varchar(200) NOT NULL
  name_en: varchar(200)
  name_ru: varchar(200)
  description_zh: text
  description_en: text
  description_ru: text
  base_price: decimal(10,2) NOT NULL
  image_url: text
  category_id: int (FK -> category.id)
  is_special_price: boolean DEFAULT false  // 是否特价商品（特价不积分）
  is_enabled: boolean DEFAULT true
  
  // 新增：默认选项值（每个商品独立配置）
  default_temperature: enum('HOT', 'WARM', 'COLD', 'ICED') DEFAULT 'COLD'
  default_ice_level: enum('NO_ICE', 'LESS_ICE', 'NORMAL_ICE', 'EXTRA_ICE') DEFAULT 'NORMAL_ICE'
  default_sugar_level: enum('NO_SUGAR', 'HALF_SUGAR', 'NORMAL_SUGAR', 'EXTRA_SUGAR') DEFAULT 'NORMAL_SUGAR'
  
  // 新增：商品详情页内容
  nutrition_info: json NULL  // 营养信息: { calories: 250, energy: 1046, protein: 5, ... }
  detail_content_zh: text NULL  // 富文本产品介绍（中文）
  detail_content_en: text NULL
  detail_content_ru: text NULL
  detail_images: json NULL  // 详情页图片数组: ["url1", "url2", ...]
  detail_video_url: text NULL  // 详情页视频
  
  iiko_item_id: varchar(100) NULL  // IIKO商品映射ID
  is_manual_override: boolean DEFAULT false  // 手动改价保护标记
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_product_category ON product(category_id)
INDEX idx_product_enabled ON product(is_enabled)
INDEX idx_product_special_price ON product(is_special_price)
```

**Key Changes:**
- Added `default_temperature`, `default_ice_level`, `default_sugar_level` (per-product defaults)
- Added `is_special_price` flag (special price products don't earn points)
- Added `nutrition_info`, `detail_content_*`, `detail_images`, `detail_video_url` for product detail page

---

### 2.2 Extended `product_option` Table

**Purpose:** Define option groups and items with pricing

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

INDEX idx_product_option_product ON product_option(product_id, option_type)
INDEX idx_product_option_enabled ON product_option(is_enabled)
```

**Business Rules:**
- `TEMPERATURE`, `ICE_LEVEL`, `SUGAR_LEVEL`: Single-select (radio buttons)
- `TOPPING`: Multi-select (checkboxes), each can have `price_adjustment > 0`
- Frontend calculates real-time price: `base_price + sum(selected_topping.price_adjustment)`
- Backend validates price on order submission

---

### 2.3 New `order_item_option` Table

**Purpose:** Store selected options for each order item

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

INDEX idx_order_item_option_item ON order_item_option(order_item_id)
INDEX idx_order_item_option_option ON order_item_option(option_id)
```

**Why Snapshot Fields?**
- Product options may change after order is placed
- Snapshot ensures order history remains accurate

---

## 3. Product Reviews & Likes

### 3.1 New `product_review` Table

**Purpose:** Store user reviews with ratings, text, and images

```typescript
product_review {
  id: int (PK, auto-increment)
  product_id: int (FK -> product.id) NOT NULL
  member_id: int (FK -> member.id) NOT NULL
  order_id: int (FK -> order.id) NULL  // 关联订单（建议"购买后可评"）
  store_id: int (FK -> store.id) NULL  // 关联门店
  rating: int NOT NULL CHECK (rating >= 1 AND rating <= 5)  // 1-5星
  content: text NULL  // 评价文字
  images: json NULL  // 评价图片数组: ["url1", "url2", ...]
  
  // 审核与可见性控制
  status: enum('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN') DEFAULT 'PENDING'
  is_pinned: boolean DEFAULT false  // 置顶（优质评价）
  
  like_count: int DEFAULT 0  // 点赞数（冗余字段，便于排序）
  
  reviewed_at: timestamp DEFAULT NOW()
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_product_review_product ON product_review(product_id, status)
INDEX idx_product_review_member ON product_review(member_id)
INDEX idx_product_review_order ON product_review(order_id)
INDEX idx_product_review_pinned ON product_review(is_pinned, like_count DESC)
```

**Business Rules:**
- Only members who purchased the product can review (check `order_id`)
- Reviews require admin approval before visible (`status = APPROVED`)
- Admin can hide/pin reviews

---

### 3.2 New `review_like` Table

**Purpose:** Track review likes with anti-spam protection

```typescript
review_like {
  id: int (PK, auto-increment)
  review_id: int (FK -> product_review.id) NOT NULL
  member_id: int (FK -> member.id) NOT NULL
  created_at: timestamp DEFAULT NOW()
}

UNIQUE INDEX idx_review_like_unique ON review_like(review_id, member_id)
INDEX idx_review_like_review ON review_like(review_id)
```

**Business Rules:**
- One member can only like one review once (enforced by unique index)
- When like is added, increment `product_review.like_count`
- When like is removed, decrement `product_review.like_count`

---

## 4. Store-Product Configuration

### 4.1 New `store` Table

**Purpose:** Define physical stores (for multi-store chain)

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

INDEX idx_store_enabled ON store(is_enabled)
```

---

### 4.2 New `store_product` Table

**Purpose:** Per-store product configuration (availability, price override, stock)

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

UNIQUE INDEX idx_store_product_unique ON store_product(store_id, product_id)
INDEX idx_store_product_store ON store_product(store_id, is_enabled)
INDEX idx_store_product_product ON store_product(product_id)
```

**Business Rules:**
- If `store_product` record doesn't exist, product is not available in that store
- If `price_override` is NULL, use `product.base_price`
- Frontend queries `store_product` to show store-specific menu

---

## 5. Special Price Approval Workflow

### 5.1 New `special_price_request` Table

**Purpose:** Store special price approval requests with workflow states

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
  
  // 审批流程
  status: enum('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'ENDED') DEFAULT 'DRAFT'
  approver_id: int (FK -> users.id) NULL  // 审批人
  approved_at: timestamp NULL
  approval_comment: text NULL  // 审批意见
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_special_price_request_status ON special_price_request(status)
INDEX idx_special_price_request_product ON special_price_request(product_id, store_id)
INDEX idx_special_price_request_requester ON special_price_request(requester_id)
INDEX idx_special_price_request_dates ON special_price_request(start_date, end_date, status)
```

**Workflow States:**
1. `DRAFT`: Request created but not submitted
2. `PENDING`: Submitted and waiting for approval
3. `APPROVED`: Approved by manager, waiting for `start_date`
4. `ACTIVE`: Currently active (system auto-transitions on `start_date`)
5. `ENDED`: Expired (system auto-transitions on `end_date`)
6. `REJECTED`: Rejected by manager

**Auto-Transition Logic:**
- Cron job runs daily to check `APPROVED` requests where `start_date <= TODAY` → set to `ACTIVE`
- Cron job runs daily to check `ACTIVE` requests where `end_date < TODAY` → set to `ENDED`

---

### 5.2 New `special_price_audit_log` Table

**Purpose:** Audit trail for all approval actions

```typescript
special_price_audit_log {
  id: int (PK, auto-increment)
  request_id: int (FK -> special_price_request.id) NOT NULL
  operator_id: int (FK -> users.id) NOT NULL
  action: enum('CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVATED', 'ENDED', 'CANCELLED') NOT NULL
  comment: text NULL
  created_at: timestamp DEFAULT NOW()
}

INDEX idx_special_price_audit_request ON special_price_audit_log(request_id)
INDEX idx_special_price_audit_operator ON special_price_audit_log(operator_id)
```

---

## 6. Enhanced Coupon Tracking

### 6.1 Extended `coupon_template` Table

**Purpose:** Add scope configuration for coupons

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
  
  // 新增：适用范围配置
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

INDEX idx_coupon_template_code ON coupon_template(code)
INDEX idx_coupon_template_enabled ON coupon_template(is_enabled)
```

**Scope Logic:**
- `ALL_STORES`: Coupon valid at all stores
- `STORES`: Coupon valid only at stores in `scope_store_ids`
- `PRODUCTS`: Coupon valid only for products in `scope_product_ids`
- `CATEGORIES`: Coupon valid only for products in `scope_category_ids`

---

### 6.2 Extended `coupon_instance` Table

**Purpose:** Add tracking, tagging, and adjustment capabilities

```typescript
coupon_instance {
  id: int (PK, auto-increment)
  template_id: int (FK -> coupon_template.id) NOT NULL
  member_id: int (FK -> member.id) NOT NULL
  
  // 新增：来源追踪
  source_type: enum('REGISTRATION', 'CAMPAIGN', 'INFLUENCER', 'MANUAL', 'COMPENSATION') NOT NULL
  source_id: varchar(100) NULL  // 来源ID（如campaign_id, influencer_id）
  
  // 新增：标签系统（用于分类和分析）
  tags: json NULL  // 标签数组: ["high_value_user", "compensation", "test"]
  
  status: enum('UNUSED', 'USED', 'EXPIRED', 'FROZEN') DEFAULT 'UNUSED'
  used_at: timestamp NULL
  used_order_id: int (FK -> order.id) NULL
  
  // 新增：调节能力
  original_valid_until: timestamp NOT NULL  // 原始过期时间
  adjusted_valid_until: timestamp NULL  // 调整后的过期时间（NULL表示未调整）
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_coupon_instance_member ON coupon_instance(member_id, status)
INDEX idx_coupon_instance_template ON coupon_instance(template_id)
INDEX idx_coupon_instance_source ON coupon_instance(source_type, source_id)
INDEX idx_coupon_instance_used_order ON coupon_instance(used_order_id)
```

**New Capabilities:**
- **Tracking:** `source_type` and `source_id` track where coupon came from
- **Tagging:** `tags` JSON array for flexible categorization
- **Adjustment:** Admin can extend expiration via `adjusted_valid_until`
- **Freezing:** Admin can freeze coupon via `status = FROZEN`

---

### 6.3 New `coupon_audit_log` Table

**Purpose:** Audit trail for all coupon adjustments

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

INDEX idx_coupon_audit_instance ON coupon_audit_log(coupon_instance_id)
INDEX idx_coupon_audit_operator ON coupon_audit_log(operator_id)
```

---

## 7. Influencer Campaign Codes

### 7.1 New `influencer` Table

**Purpose:** Store influencer (达人) basic information

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

INDEX idx_influencer_enabled ON influencer(is_enabled)
```

---

### 7.2 New `campaign` Table

**Purpose:** Define marketing campaigns

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

INDEX idx_campaign_status ON campaign(status)
INDEX idx_campaign_dates ON campaign(start_date, end_date)
```

---

### 7.3 New `campaign_code` Table

**Purpose:** Generate unique code for each influencer in each campaign

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

UNIQUE INDEX idx_campaign_code_unique ON campaign_code(campaign_id, influencer_id)
UNIQUE INDEX idx_campaign_code_code ON campaign_code(code)
INDEX idx_campaign_code_campaign ON campaign_code(campaign_id)
INDEX idx_campaign_code_influencer ON campaign_code(influencer_id)
```

**Code Generation Logic:**
- Format: `{PREFIX}{RANDOM_4_DIGITS}` (e.g., `A1234`, `B5678`)
- Prefix can be influencer's initial or campaign identifier
- Must be globally unique

---

### 7.4 New `offline_scan_log` Table

**Purpose:** Record every offline code scan (even if order fails)

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

INDEX idx_offline_scan_log_code ON offline_scan_log(campaign_code_id)
INDEX idx_offline_scan_log_store ON offline_scan_log(store_id)
INDEX idx_offline_scan_log_order ON offline_scan_log(order_id)
INDEX idx_offline_scan_log_matched ON offline_scan_log(matched, scanned_at)
```

**Business Rules:**
- **Immediate Recording:** Scan action is recorded immediately, even if order creation fails
- **Permanent Storage:** Records are never deleted, even after campaign ends
- **Matching Logic:** If `order_id` is NULL at scan time, system can match later via time window + store + amount

---

## 8. IIKO Sync Queue & Conflict Protection

### 8.1 New `iiko_sync_job` Table

**Purpose:** Queue-based IIKO sync with retry and conflict protection

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

INDEX idx_iiko_sync_job_status ON iiko_sync_job(status, scheduled_at)
INDEX idx_iiko_sync_job_resource ON iiko_sync_job(resource_type, resource_id)
INDEX idx_iiko_sync_job_retry ON iiko_sync_job(retry_count, status)
```

**Queue Processing:**
- Background worker picks `PENDING` jobs ordered by `scheduled_at`
- Before starting, check if another `RUNNING` job exists for same `resource_type + resource_id` → skip (conflict protection)
- On failure, increment `retry_count` and reschedule if `retry_count < max_retries`

---

### 8.2 New `iiko_sync_log` Table

**Purpose:** Detailed log for each sync attempt (for debugging and audit)

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

INDEX idx_iiko_sync_log_job ON iiko_sync_log(job_id)
INDEX idx_iiko_sync_log_status ON iiko_sync_log(status, created_at)
```

---

### 8.3 Extended `product` Conflict Protection

**Existing Field:** `is_manual_override` (already implemented in previous version)

**Enhanced Logic:**
- When admin changes price via backend, set `is_manual_override = true`
- IIKO sync job checks this flag before updating price
- If `is_manual_override = true`, log conflict and skip price update
- Admin can manually reset flag to allow IIKO sync to overwrite

---

## 9. Order System Enhancements

### 9.1 Extended `order` Table

**Purpose:** Add points/coupon mutual exclusion and campaign tracking

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

INDEX idx_order_member ON order(member_id)
INDEX idx_order_store ON order(store_id)
INDEX idx_order_status ON order(status)
INDEX idx_order_payment_status ON order(payment_status)
INDEX idx_order_campaign_code ON order(campaign_code_id)
INDEX idx_order_coupon ON order(coupon_instance_id)

// 新增约束：积分与优惠券互斥（后端强校验）
CHECK (NOT (used_points > 0 AND coupon_instance_id IS NOT NULL))
```

**Key Business Rules:**
- **Points/Coupon Mutual Exclusion:** Backend validates `(used_points > 0 && coupon_instance_id != null)` → reject
- **Special Price No Points:** When calculating earned points, exclude items where `product.is_special_price = true`
- **Points Full Deduction Only:** If user selects "use points", calculate required points for full deduction. If insufficient, reject and force user to switch payment method

---

## 10. Summary of New Tables

| Table Name | Purpose | Key Features |
|------------|---------|--------------|
| `phone_verification` | Phone verification codes | Expiration, rate limiting |
| `idempotency_key` | Prevent duplicate operations | Signup bonus, payment capture |
| `product_review` | User reviews | Rating, images, approval workflow |
| `review_like` | Review likes | Anti-spam (unique constraint) |
| `store` | Physical stores | Multi-store support |
| `store_product` | Per-store product config | Availability, price override |
| `special_price_request` | Special price approval | Workflow states, audit trail |
| `special_price_audit_log` | Approval audit trail | Who, when, what, why |
| `coupon_audit_log` | Coupon adjustment audit | Extension, freezing, reissue |
| `influencer` | Influencer profiles | Commission rate |
| `campaign` | Marketing campaigns | Date range, discount |
| `campaign_code` | Per-influencer campaign codes | Unique code, stats |
| `offline_scan_log` | Offline code scans | Permanent storage, matching |
| `iiko_sync_job` | IIKO sync queue | Retry, conflict protection |
| `iiko_sync_log` | IIKO sync audit | Attempt details |
| `order_item_option` | Order item options snapshot | Price calculation history |

---

## 11. Summary of Extended Tables

| Table Name | New Fields | Purpose |
|------------|------------|---------|
| `member` | `phone`, `phone_verified`, `phone_verified_at` | Phone verification |
| `product` | `default_temperature`, `default_ice_level`, `default_sugar_level`, `is_special_price`, `nutrition_info`, `detail_content_*`, `detail_images`, `detail_video_url` | Per-product defaults, detail page content |
| `product_option` | (No new fields, but clarified pricing logic) | Real-time price calculation |
| `coupon_template` | `scope_type`, `scope_store_ids`, `scope_product_ids`, `scope_category_ids` | Flexible coupon scope |
| `coupon_instance` | `source_type`, `source_id`, `tags`, `original_valid_until`, `adjusted_valid_until` | Tracking, tagging, adjustment |
| `order` | `campaign_code_id`, CHECK constraint for points/coupon exclusion | Campaign tracking, mutual exclusion |

---

## 12. Migration Strategy

**Phase 1: Add New Tables**
- Create all 15 new tables
- No impact on existing data

**Phase 2: Extend Existing Tables**
- Add new columns to `member`, `product`, `coupon_template`, `coupon_instance`, `order`
- Set default values for existing rows

**Phase 3: Data Migration (if needed)**
- Backfill `phone` for existing members (if available from OAuth)
- Set `is_special_price = false` for all existing products

**Phase 4: Deploy New APIs**
- Deploy backend APIs incrementally
- Frontend remains functional during deployment

---

## Next Steps

1. **Review & Approve** this data model specification
2. **Generate API Specification** document (endpoints, request/response schemas)
3. **Implement Database Schema** (Drizzle ORM migrations)
4. **Implement Backend APIs** (tRPC procedures)
5. **Write Automated Tests** (Vitest unit tests)
6. **Update Documentation**

---

**Status:** ⏳ Awaiting Approval  
**Prepared By:** Manus AI Engineering Team  
**Date:** January 6, 2026
