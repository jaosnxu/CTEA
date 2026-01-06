# CHU TEA Platform - Corrected Schema & Examples

**Version:** 2.1 (Corrected)  
**Date:** January 6, 2026  
**Status:** Awaiting Final Approval

---

## 修正清单

### ✅ 修正 1: 扫码记录幂等性
- **问题**：每次扫码都创建新记录，无幂等保护
- **修正**：增加 `client_event_id` 字段作为幂等键，重复提交增加 `dup_count`

### ✅ 修正 2: 商品选项关联表
- **问题**：缺少商品与选项的显式关联表
- **修正**：增加 `product_option_group` 表，支持每个商品独立配置选项、默认值、排序

### ✅ 修正 3: 积分字段语义
- **问题**：`member.total_points` 语义模糊
- **修正**：改为 `available_points_balance`（当前可用余额） + `total_points_earned`（累计获得）

### ✅ 修正 4: 优惠券规则示例
- **问题**：复杂规则（BOGO/满减/买N送M）无法表达
- **修正**：增加 `rule_json` 字段，提供三种券型完整示例

### ✅ 修正 5: IIKO 同步日志脱敏
- **问题**：完整存储请求/响应（可能包含敏感信息）
- **修正**：脱敏处理 + 长度限制（最多 5000 字符）

---

## 1. Member 表（修正积分字段）

```typescript
member {
  id: int (PK, auto-increment)
  phone: varchar(20) UNIQUE NOT NULL
  phone_verified: boolean DEFAULT false
  phone_verified_at: timestamp NULL
  name: varchar(100)
  email: varchar(320)
  avatar_url: text
  group_id: int (FK -> member_group.id) NULL
  
  // 修正：明确积分字段语义
  available_points_balance: int DEFAULT 0  // 当前可用余额（可消费）
  total_points_earned: int DEFAULT 0  // 累计获得积分（统计用，只增不减）
  
  current_tier: enum('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') DEFAULT 'BRONZE'
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

INDEX idx_member_phone ON member(phone)
INDEX idx_member_group ON member(group_id)
```

**字段说明：**
- `available_points_balance`: 当前可用积分余额（可用于抵扣订单）
- `total_points_earned`: 累计获得积分（用于会员等级计算、统计报表）

**业务规则：**
- 用户获得积分时：`available_points_balance += N`, `total_points_earned += N`
- 用户消费积分时：`available_points_balance -= N`, `total_points_earned` 不变
- 积分过期时：`available_points_balance -= N`, `total_points_earned` 不变

---

## 2. Product Option 系统（修正关联表）

### 2.1 `option_group` 表（新增）

**目的：** 定义选项组类型和规则

```typescript
option_group {
  id: int (PK, auto-increment)
  group_type: enum('TEMPERATURE', 'ICE_LEVEL', 'SUGAR_LEVEL', 'TOPPING') NOT NULL
  name_zh: varchar(100) NOT NULL  // 组名称：温度、冰量、糖度、小料
  name_en: varchar(100)
  name_ru: varchar(100)
  is_required: boolean DEFAULT true  // 是否必选（温度/冰/糖为必选，小料为可选）
  is_multi_select: boolean DEFAULT false  // 是否多选（温度/冰/糖为单选，小料为多选）
  sort_order: int DEFAULT 0
  created_at: timestamp DEFAULT NOW()
}

INDEX idx_option_group_type ON option_group(group_type)
```

**预设数据：**
```sql
INSERT INTO option_group (group_type, name_zh, name_en, name_ru, is_required, is_multi_select, sort_order) VALUES
('TEMPERATURE', '温度', 'Temperature', 'Температура', true, false, 1),
('ICE_LEVEL', '冰量', 'Ice Level', 'Лед', true, false, 2),
('SUGAR_LEVEL', '糖度', 'Sugar Level', 'Сахар', true, false, 3),
('TOPPING', '小料', 'Toppings', 'Добавки', false, true, 4);
```

---

### 2.2 `option_item` 表（新增）

**目的：** 定义选项组内的具体选项

```typescript
option_item {
  id: int (PK, auto-increment)
  group_id: int (FK -> option_group.id) NOT NULL
  name_zh: varchar(100) NOT NULL  // 选项名称：热、冷、珍珠、椰果等
  name_en: varchar(100)
  name_ru: varchar(100)
  sort_order: int DEFAULT 0
  created_at: timestamp DEFAULT NOW()
}

INDEX idx_option_item_group ON option_item(group_id)
```

**预设数据示例：**
```sql
-- 温度选项
INSERT INTO option_item (group_id, name_zh, name_en, name_ru, sort_order) VALUES
(1, '热', 'Hot', 'Горячий', 1),
(1, '温', 'Warm', 'Теплый', 2),
(1, '冷', 'Cold', 'Холодный', 3),
(1, '冰', 'Iced', 'Со льдом', 4);

-- 冰量选项
INSERT INTO option_item (group_id, name_zh, name_en, name_ru, sort_order) VALUES
(2, '去冰', 'No Ice', 'Без льда', 1),
(2, '少冰', 'Less Ice', 'Мало льда', 2),
(2, '正常冰', 'Normal Ice', 'Нормально льда', 3),
(2, '多冰', 'Extra Ice', 'Много льда', 4);

-- 糖度选项
INSERT INTO option_item (group_id, name_zh, name_en, name_ru, sort_order) VALUES
(3, '无糖', 'No Sugar', 'Без сахара', 1),
(3, '半糖', 'Half Sugar', 'Половина сахара', 2),
(3, '正常糖', 'Normal Sugar', 'Нормально сахара', 3),
(3, '多糖', 'Extra Sugar', 'Много сахара', 4);

-- 小料选项
INSERT INTO option_item (group_id, name_zh, name_en, name_ru, sort_order) VALUES
(4, '珍珠', 'Pearls', 'Жемчуг', 1),
(4, '椰果', 'Coconut Jelly', 'Кокосовое желе', 2),
(4, '布丁', 'Pudding', 'Пудинг', 3),
(4, '红豆', 'Red Beans', 'Красная фасоль', 4);
```

---

### 2.3 `product_option_group` 表（新增：关联表）

**目的：** 关联商品与选项组，支持每个商品独立配置默认值、价格增量、可售状态

```typescript
product_option_group {
  id: int (PK, auto-increment)
  product_id: int (FK -> product.id) NOT NULL
  group_id: int (FK -> option_group.id) NOT NULL
  is_enabled: boolean DEFAULT true  // 该商品是否启用此选项组
  sort_order: int DEFAULT 0  // 该商品中此选项组的显示顺序
  created_at: timestamp DEFAULT NOW()
}

UNIQUE INDEX idx_product_option_group_unique ON product_option_group(product_id, group_id)
INDEX idx_product_option_group_product ON product_option_group(product_id)
```

---

### 2.4 `product_option_item` 表（新增：商品选项配置）

**目的：** 为每个商品的每个选项配置价格增量、默认值、可售状态

```typescript
product_option_item {
  id: int (PK, auto-increment)
  product_id: int (FK -> product.id) NOT NULL
  option_item_id: int (FK -> option_item.id) NOT NULL
  
  // 价格配置
  price_adjustment: decimal(10,2) DEFAULT 0  // 加价金额（小料常用，温度/冰/糖一般为0）
  
  // 默认值配置（每个商品独立）
  is_default: boolean DEFAULT false  // 是否为该商品的默认选项
  
  // 可售状态（每个商品独立）
  is_enabled: boolean DEFAULT true  // 该选项在该商品中是否可售（小料可能缺货）
  
  // 显示顺序（每个商品独立）
  sort_order: int DEFAULT 0
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

UNIQUE INDEX idx_product_option_item_unique ON product_option_item(product_id, option_item_id)
INDEX idx_product_option_item_product ON product_option_item(product_id)
INDEX idx_product_option_item_option ON product_option_item(option_item_id)
INDEX idx_product_option_item_default ON product_option_item(product_id, is_default)
```

**业务规则：**
- 每个商品在每个单选组（温度/冰/糖）中必须有且仅有一个 `is_default = true` 的选项
- 小料组（多选）可以没有默认选项（`is_default = false`）
- 前端加载商品详情时，自动预选所有 `is_default = true` 的选项

**示例数据：**
```sql
-- 商品ID=1（奶茶）的选项配置
-- 温度默认：冷
INSERT INTO product_option_item (product_id, option_item_id, price_adjustment, is_default, is_enabled, sort_order) VALUES
(1, 1, 0, false, true, 1),  -- 热
(1, 2, 0, false, true, 2),  -- 温
(1, 3, 0, true, true, 3),   -- 冷（默认）
(1, 4, 0, false, true, 4);  -- 冰

-- 冰量默认：正常冰
INSERT INTO product_option_item (product_id, option_item_id, price_adjustment, is_default, is_enabled, sort_order) VALUES
(1, 5, 0, false, true, 1),  -- 去冰
(1, 6, 0, false, true, 2),  -- 少冰
(1, 7, 0, true, true, 3),   -- 正常冰（默认）
(1, 8, 0, false, true, 4);  -- 多冰

-- 糖度默认：正常糖
INSERT INTO product_option_item (product_id, option_item_id, price_adjustment, is_default, is_enabled, sort_order) VALUES
(1, 9, 0, false, true, 1),   -- 无糖
(1, 10, 0, false, true, 2),  -- 半糖
(1, 11, 0, true, true, 3),   -- 正常糖（默认）
(1, 12, 0, false, true, 4);  -- 多糖

-- 小料（多选，无默认，有加价）
INSERT INTO product_option_item (product_id, option_item_id, price_adjustment, is_default, is_enabled, sort_order) VALUES
(1, 13, 5.00, false, true, 1),  -- 珍珠 +5元
(1, 14, 5.00, false, true, 2),  -- 椰果 +5元
(1, 15, 6.00, false, true, 3),  -- 布丁 +6元
(1, 16, 4.00, false, false, 4); -- 红豆 +4元（缺货，不可售）
```

---

### 2.5 修正后的 `product` 表

**移除字段：**
- ~~`default_temperature`~~
- ~~`default_ice_level`~~
- ~~`default_sugar_level`~~

**原因：** 默认值现在存储在 `product_option_item.is_default` 中，支持每个商品独立配置

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
  is_special_price: boolean DEFAULT false
  is_enabled: boolean DEFAULT true
  
  // 商品详情页内容
  nutrition_info: json NULL
  detail_content_zh: text NULL
  detail_content_en: text NULL
  detail_content_ru: text NULL
  detail_images: json NULL
  detail_video_url: text NULL
  
  iiko_item_id: varchar(100) NULL
  is_manual_override: boolean DEFAULT false
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

---

## 3. Offline Scan Log（修正幂等性）

### 3.1 修正后的 `offline_scan_log` 表

```typescript
offline_scan_log {
  id: int (PK, auto-increment)
  
  // 幂等键（客户端生成）
  client_event_id: varchar(100) UNIQUE NOT NULL  // 格式: {cashier_id}_{timestamp}_{random}
  
  campaign_code_id: int (FK -> campaign_code.id) NOT NULL
  store_id: int (FK -> store.id) NOT NULL
  cashier_id: int (FK -> users.id) NULL
  
  // 订单关联（可能为空）
  order_id: int (FK -> order.id) NULL
  order_amount: decimal(10,2) NULL
  
  // 扫码时间
  scanned_at: timestamp DEFAULT NOW()
  
  // 匹配状态
  matched: boolean DEFAULT false
  matched_at: timestamp NULL
  
  // 重复扫码计数
  dup_count: int DEFAULT 0  // 重复提交次数（幂等保护）
  last_dup_at: timestamp NULL  // 最后一次重复提交时间
  
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}

UNIQUE INDEX idx_offline_scan_log_event ON offline_scan_log(client_event_id)
INDEX idx_offline_scan_log_code ON offline_scan_log(campaign_code_id)
INDEX idx_offline_scan_log_store ON offline_scan_log(store_id)
INDEX idx_offline_scan_log_order ON offline_scan_log(order_id)
INDEX idx_offline_scan_log_matched ON offline_scan_log(matched, scanned_at)
```

**幂等性保护逻辑：**
```typescript
// 扫码接口
async function scanOfflineCode(input: {
  code: string;
  storeId: number;
  clientEventId: string;  // 客户端生成的唯一事件ID
  orderId?: number;
  orderAmount?: number;
}) {
  // 1. 检查幂等键是否已存在
  const existing = await db.select()
    .from(offlineScanLogs)
    .where(eq(offlineScanLogs.client_event_id, input.clientEventId));
  
  if (existing.length > 0) {
    // 幂等保护：增加重复计数，不创建新记录
    await db.update(offlineScanLogs)
      .set({ 
        dup_count: sql`dup_count + 1`,
        last_dup_at: new Date()
      })
      .where(eq(offlineScanLogs.client_event_id, input.clientEventId));
    
    return {
      success: true,
      message: 'Duplicate scan detected, count incremented',
      isDuplicate: true,
      dupCount: existing[0].dup_count + 1
    };
  }
  
  // 2. 验证活动码
  const campaignCode = await db.select()
    .from(campaignCodes)
    .where(eq(campaignCodes.code, input.code));
  
  if (campaignCode.length === 0) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid code' });
  }
  
  // 3. 创建新扫码记录
  await db.insert(offlineScanLogs).values({
    client_event_id: input.clientEventId,
    campaign_code_id: campaignCode[0].id,
    store_id: input.storeId,
    cashier_id: ctx.user.id,
    order_id: input.orderId || null,
    order_amount: input.orderAmount || null,
    scanned_at: new Date(),
    matched: input.orderId ? true : false,
    matched_at: input.orderId ? new Date() : null,
    dup_count: 0
  });
  
  return {
    success: true,
    message: 'Code scanned successfully',
    isDuplicate: false
  };
}
```

**客户端事件ID生成规则：**
```typescript
// 前端生成唯一事件ID
const clientEventId = `${cashierId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// 示例: "123_1704528000000_a3b5c7d9e"
```

---

## 4. Coupon Template（修正规则示例）

### 4.1 修正后的 `coupon_template` 表

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
  
  // 基础折扣配置（简单券型）
  discount_type: enum('PERCENTAGE', 'FIXED_AMOUNT', 'COMPLEX') NOT NULL
  discount_value: decimal(10,2) NULL  // 简单券型使用，复杂券型为NULL
  min_order_amount: decimal(10,2) DEFAULT 0
  
  // 复杂规则配置（BOGO/满减/买N送M）
  rule_json: json NULL  // 复杂券型规则（见下方示例）
  
  // 适用范围配置
  scope_type: enum('ALL_STORES', 'STORES', 'PRODUCTS', 'CATEGORIES') DEFAULT 'ALL_STORES'
  scope_store_ids: json NULL
  scope_product_ids: json NULL
  scope_category_ids: json NULL
  
  max_usage_per_user: int DEFAULT 1
  total_quantity: int NULL
  valid_from: timestamp NOT NULL
  valid_until: timestamp NOT NULL
  is_enabled: boolean DEFAULT true
  created_at: timestamp DEFAULT NOW()
  updated_at: timestamp DEFAULT NOW() ON UPDATE NOW()
}
```

---

### 4.2 优惠券规则示例（rule_json）

#### **示例 1: BOGO（买一送一）**

```json
{
  "rule_type": "BOGO",
  "description": "Buy 1 Get 1 Free",
  "conditions": {
    "buy_quantity": 1,
    "get_quantity": 1,
    "get_discount": 100,
    "applicable_products": [101, 102, 103],
    "max_free_items": 2
  }
}
```

**业务逻辑：**
- 用户购买商品 101/102/103 中的任意 1 件，可免费获得 1 件相同商品
- 最多赠送 2 件（即买 2 送 2）
- `get_discount: 100` 表示赠品 100% 折扣（免费）

---

#### **示例 2: 满减券**

```json
{
  "rule_type": "TIERED_DISCOUNT",
  "description": "Spend more, save more",
  "tiers": [
    {
      "min_amount": 50,
      "discount_type": "FIXED_AMOUNT",
      "discount_value": 10
    },
    {
      "min_amount": 100,
      "discount_type": "FIXED_AMOUNT",
      "discount_value": 25
    },
    {
      "min_amount": 200,
      "discount_type": "FIXED_AMOUNT",
      "discount_value": 60
    }
  ]
}
```

**业务逻辑：**
- 订单金额 ≥ 50元：减 10元
- 订单金额 ≥ 100元：减 25元
- 订单金额 ≥ 200元：减 60元
- 系统自动选择最高档位

---

#### **示例 3: 买N送M券**

```json
{
  "rule_type": "BUY_N_GET_M",
  "description": "Buy 3 Get 1 Free",
  "conditions": {
    "buy_quantity": 3,
    "get_quantity": 1,
    "get_discount": 100,
    "applicable_categories": [5, 6],
    "cheapest_free": true
  }
}
```

**业务逻辑：**
- 用户购买分类 5/6 中的任意 3 件商品，可免费获得 1 件
- `cheapest_free: true` 表示赠送最便宜的那件商品
- `get_discount: 100` 表示赠品 100% 折扣（免费）

---

### 4.3 适用范围示例（scope_type）

#### **示例 1: 全门店可用（ALL_STORES）**

```json
{
  "code": "WELCOME100",
  "name_zh": "新用户专享券",
  "discount_type": "FIXED_AMOUNT",
  "discount_value": 10.00,
  "min_order_amount": 50.00,
  "scope_type": "ALL_STORES",
  "scope_store_ids": null,
  "scope_product_ids": null,
  "scope_category_ids": null
}
```

**业务逻辑：**
- 所有门店均可使用
- 订单金额 ≥ 50元，减 10元

---

#### **示例 2: 指定门店可用（STORES）**

```json
{
  "code": "STORE123OFF",
  "name_zh": "123号店专属券",
  "discount_type": "PERCENTAGE",
  "discount_value": 15.00,
  "min_order_amount": 30.00,
  "scope_type": "STORES",
  "scope_store_ids": [1, 2, 3],
  "scope_product_ids": null,
  "scope_category_ids": null
}
```

**业务逻辑：**
- 仅限门店 1/2/3 使用
- 订单金额 ≥ 30元，打 85 折（15% 折扣）

**校验逻辑：**
```typescript
if (template.scope_type === 'STORES') {
  const scopeStoreIds = JSON.parse(template.scope_store_ids);
  if (!scopeStoreIds.includes(order.store_id)) {
    throw new Error('Coupon not valid at this store');
  }
}
```

---

#### **示例 3: 指定商品可用（PRODUCTS）**

```json
{
  "code": "MILKTEA20",
  "name_zh": "奶茶专享券",
  "discount_type": "PERCENTAGE",
  "discount_value": 20.00,
  "min_order_amount": 0,
  "scope_type": "PRODUCTS",
  "scope_store_ids": null,
  "scope_product_ids": [101, 102, 103, 104],
  "scope_category_ids": null
}
```

**业务逻辑：**
- 仅限商品 101/102/103/104 使用
- 无最低消费，打 8 折（20% 折扣）

**校验逻辑：**
```typescript
if (template.scope_type === 'PRODUCTS') {
  const scopeProductIds = JSON.parse(template.scope_product_ids);
  const orderProductIds = order.items.map(item => item.product_id);
  const hasValidProduct = orderProductIds.some(id => scopeProductIds.includes(id));
  
  if (!hasValidProduct) {
    throw new Error('Coupon not valid for these products');
  }
}
```

---

#### **示例 4: 指定分类可用（CATEGORIES）**

```json
{
  "code": "DESSERT30",
  "name_zh": "甜品专享券",
  "discount_type": "FIXED_AMOUNT",
  "discount_value": 15.00,
  "min_order_amount": 50.00,
  "scope_type": "CATEGORIES",
  "scope_store_ids": null,
  "scope_product_ids": null,
  "scope_category_ids": [5, 6]
}
```

**业务逻辑：**
- 仅限分类 5/6（甜品类）使用
- 订单金额 ≥ 50元，减 15元

---

## 5. IIKO Sync Log（修正脱敏与长度限制）

### 5.1 修正后的 `iiko_sync_log` 表

```typescript
iiko_sync_log {
  id: int (PK, auto-increment)
  job_id: int (FK -> iiko_sync_job.id) NOT NULL
  attempt_number: int NOT NULL
  status: enum('SUCCESS', 'FAILED') NOT NULL
  
  // 脱敏后的请求/响应（最多 5000 字符）
  request_summary: text NULL  // 脱敏后的请求摘要（最多 5000 字符）
  response_summary: text NULL  // 脱敏后的响应摘要（最多 5000 字符）
  
  error_message: text NULL
  duration_ms: int NULL
  created_at: timestamp DEFAULT NOW()
}

INDEX idx_iiko_sync_log_job ON iiko_sync_log(job_id)
INDEX idx_iiko_sync_log_status ON iiko_sync_log(status, created_at)
```

---

### 5.2 脱敏与截断逻辑

```typescript
// 脱敏函数
function sanitizeForLog(data: any): string {
  // 1. 深拷贝对象
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // 2. 脱敏敏感字段
  const sensitiveKeys = [
    'token', 'api_key', 'password', 'secret',
    'phone', 'mobile', 'email',
    'card_number', 'cvv', 'payment_token',
    'access_token', 'refresh_token', 'authorization'
  ];
  
  function recursiveSanitize(obj: any) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      
      // 检查是否为敏感字段
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        recursiveSanitize(obj[key]);
      }
    }
  }
  
  recursiveSanitize(sanitized);
  
  // 3. 转为字符串
  let jsonString = JSON.stringify(sanitized, null, 2);
  
  // 4. 截断到 5000 字符
  if (jsonString.length > 5000) {
    jsonString = jsonString.substring(0, 4950) + '\n... (truncated)';
  }
  
  return jsonString;
}

// 使用示例
await db.insert(iikoSyncLogs).values({
  job_id: job.id,
  attempt_number: job.retry_count + 1,
  status: 'SUCCESS',
  request_summary: sanitizeForLog(requestPayload),
  response_summary: sanitizeForLog(responsePayload),
  duration_ms: Date.now() - startTime
});
```

---

### 5.3 脱敏前后对比示例

**脱敏前（原始数据）：**
```json
{
  "api_key": "sk_live_51234567890abcdef",
  "product": {
    "id": 101,
    "name": "珍珠奶茶",
    "price": 25.00
  },
  "customer": {
    "phone": "+79001234567",
    "email": "user@example.com"
  },
  "payment": {
    "card_number": "4242424242424242",
    "cvv": "123"
  }
}
```

**脱敏后（存储到数据库）：**
```json
{
  "api_key": "***REDACTED***",
  "product": {
    "id": 101,
    "name": "珍珠奶茶",
    "price": 25.00
  },
  "customer": {
    "phone": "***REDACTED***",
    "email": "***REDACTED***"
  },
  "payment": {
    "card_number": "***REDACTED***",
    "cvv": "***REDACTED***"
  }
}
```

---

## 6. 完整的数据模型关系图

```
member (available_points_balance, total_points_earned)
  ├─ member_points_history (积分变更记录)
  ├─ coupon_instance (优惠券实例)
  └─ order (订单)
      ├─ order_item (订单项)
      │   └─ order_item_option (订单项选项快照)
      └─ campaign_code (活动码)

product
  ├─ product_option_group (商品选项组关联)
  │   └─ option_group (选项组定义)
  └─ product_option_item (商品选项配置)
      └─ option_item (选项项定义)

store
  └─ store_product (门店商品配置)

campaign
  └─ campaign_code (活动码)
      └─ offline_scan_log (扫码记录，含幂等键)

coupon_template (含 rule_json 复杂规则)
  └─ coupon_instance
      └─ coupon_audit_log (审计日志)

special_price_request (状态机)
  └─ special_price_audit_log (审计日志)

iiko_sync_job (幂等保护)
  └─ iiko_sync_log (脱敏日志)
```

---

## 7. 总结：修正后的关键改进

### ✅ 1. 扫码记录幂等性
- **字段**：`client_event_id` (UNIQUE)
- **逻辑**：重复提交增加 `dup_count`，不创建新记录
- **保留**：所有扫码记录永久保留（包括重复扫码的计数）

### ✅ 2. 商品选项系统
- **新增表**：`option_group`, `option_item`, `product_option_group`, `product_option_item`
- **支持**：每个商品独立配置默认值、价格增量、可售状态、显示顺序
- **规则**：温度/冰/糖为单选必选组，小料为多选可选组

### ✅ 3. 积分字段语义
- **字段**：`available_points_balance`（当前可用余额）+ `total_points_earned`（累计获得）
- **逻辑**：获得积分时两者都增加，消费积分时只减少 `available_points_balance`

### ✅ 4. 优惠券规则
- **字段**：`rule_json`（复杂规则）
- **示例**：BOGO、满减、买N送M 三种券型完整示例
- **范围**：ALL_STORES / STORES / PRODUCTS / CATEGORIES 四种适用范围示例

### ✅ 5. IIKO 同步日志
- **脱敏**：token/手机号/支付信息自动替换为 `***REDACTED***`
- **截断**：最多存储 5000 字符，超出部分截断并标记 `(truncated)`

---

**状态：** ⏳ 等待最终批准后开始实施
