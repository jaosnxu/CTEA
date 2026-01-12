import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================================
// 通用类型定义
// ============================================================================

// 多语言 JSONB 类型示例: { "ru": "...", "zh": "...", "en": "..." }
// 在 MySQL 中使用 JSON 类型存储

// ============================================================================
// 第一章：系统管理模块 (System Management)
// ============================================================================

/**
 * 组织表 - 三级架构：总部(HQ) → 组织(ORG) → 门店(STORE)
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parent_id"), // 上级组织ID，总部为 null
  code: varchar("code", { length: 50 }).notNull().unique(), // 组织编码
  name: json("name").notNull(), // 多语言名称 {ru, zh, en}
  level: mysqlEnum("level", ["HQ", "ORG", "STORE"]).notNull(), // 组织层级
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"), // 时区
  currency: varchar("currency", { length: 10 }).default("RUB"), // 货币
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  config: json("config"), // 组织级配置
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentIdx: index("org_parent_idx").on(table.parentId),
  levelIdx: index("org_level_idx").on(table.level),
}));

/**
 * 门店表
 */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(), // 所属组织（隔离字段）
  code: varchar("code", { length: 50 }).notNull(), // 门店编码
  name: json("name").notNull(), // 多语言名称 {ru, zh, en}
  address: json("address"), // 多语言地址 {ru, zh, en}
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }).default("Europe/Moscow"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  businessHours: json("business_hours"), // 营业时间配置
  cutoffHour: int("cutoff_hour").default(5), // 营业日切换时间（凌晨几点）
  iikoTerminalId: varchar("iiko_terminal_id", { length: 100 }), // iiko 终端ID
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  config: json("config"), // 门店级配置
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("store_org_idx").on(table.orgId),
  codeIdx: uniqueIndex("store_code_idx").on(table.orgId, table.code),
}));

/**
 * 管理员用户表
 */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id"), // 所属组织，总部管理员为 null
  storeId: int("store_id"), // 所属门店，组织/总部管理员为 null
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false),
  email: varchar("email", { length: 255 }),
  name: json("name"), // 多语言名称 {ru, zh, en}
  role: mysqlEnum("role", ["HQ_ADMIN", "HQ_OPERATOR", "ORG_ADMIN", "ORG_OPERATOR", "STORE_MANAGER", "STORE_STAFF"]).notNull(),
  permissions: json("permissions"), // 权限列表
  languagePref: varchar("language_pref", { length: 10 }).default("ru"),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_ACTIVATION"]).default("PENDING_ACTIVATION"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("admin_org_idx").on(table.orgId),
  storeIdx: index("admin_store_idx").on(table.storeId),
  roleIdx: index("admin_role_idx").on(table.role),
}));

/**
 * 审计日志表 - Diff Log（不可篡改）
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id"), // 所属组织
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: int("record_id").notNull(),
  action: mysqlEnum("action", ["INSERT", "UPDATE", "DELETE"]).notNull(),
  diffBefore: json("diff_before"), // 修改前数据
  diffAfter: json("diff_after"), // 修改后数据
  operatorId: int("operator_id"),
  operatorType: mysqlEnum("operator_type", ["ADMIN", "USER", "SYSTEM", "API"]),
  operatorName: varchar("operator_name", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  reason: text("reason"), // 操作原因
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("audit_org_idx").on(table.orgId),
  tableIdx: index("audit_table_idx").on(table.tableName),
  recordIdx: index("audit_record_idx").on(table.tableName, table.recordId),
  createdIdx: index("audit_created_idx").on(table.createdAt),
}));

/**
 * 系统配置表 - 参数化配置（严禁 Hardcode）
 */
export const systemConfigs = mysqlTable("system_configs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id"), // null 表示全局配置
  storeId: int("store_id"), // null 表示组织级配置
  configKey: varchar("config_key", { length: 100 }).notNull(),
  configValue: json("config_value").notNull(),
  valueType: mysqlEnum("value_type", ["STRING", "NUMBER", "BOOLEAN", "JSON", "ARRAY"]).notNull(),
  description: json("description"), // 多语言描述 {ru, zh, en}
  isEditable: boolean("is_editable").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  keyIdx: uniqueIndex("config_key_idx").on(table.orgId, table.storeId, table.configKey),
}));

/**
 * 权限规则表
 */
export const permissionRules = mysqlTable("permission_rules", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(), // 资源类型
  action: varchar("action", { length: 50 }).notNull(), // 操作类型
  conditions: json("conditions"), // 条件表达式
  isAllowed: boolean("is_allowed").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  roleIdx: index("perm_role_idx").on(table.role),
  resourceIdx: index("perm_resource_idx").on(table.resource),
}));

// ============================================================================
// 第二章：财务模块 (Finance)
// ============================================================================

/**
 * 虚拟保证金账户表
 */
export const depositAccounts = mysqlTable("deposit_accounts", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id").notNull(),
  accountType: mysqlEnum("account_type", ["DEPOSIT", "REVENUE", "SETTLEMENT"]).default("DEPOSIT"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  frozenAmount: decimal("frozen_amount", { precision: 15, scale: 2 }).default("0.00"), // 冻结金额
  currency: varchar("currency", { length: 10 }).default("RUB"),
  status: mysqlEnum("status", ["ACTIVE", "FROZEN", "CLOSED"]).default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("deposit_org_idx").on(table.orgId),
  storeIdx: uniqueIndex("deposit_store_idx").on(table.storeId, table.accountType),
}));

/**
 * 结算规则表
 */
export const settlementRules = mysqlTable("settlement_rules", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id"),
  ruleCode: varchar("rule_code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  delayDays: int("delay_days").default(7), // 延迟结算天数
  autoRefundThreshold: decimal("auto_refund_threshold", { precision: 5, scale: 2 }).default("0.30"), // 超额退回阈值 30%
  settlementCycle: mysqlEnum("settlement_cycle", ["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * 跨店对账表 - A店发券B店核销
 */
export const crossStoreLedger = mysqlTable("cross_store_ledger", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  couponId: int("coupon_id").notNull(),
  userCouponId: int("user_coupon_id").notNull(),
  issueStoreId: int("issue_store_id").notNull(), // 发券门店
  redeemStoreId: int("redeem_store_id").notNull(), // 核销门店
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(), // 核销金额
  settlementStatus: mysqlEnum("settlement_status", ["PENDING", "PROCESSING", "SETTLED", "CANCELLED"]).default("PENDING"),
  settlementBatchId: int("settlement_batch_id"), // 结算批次
  settledAt: timestamp("settled_at"),
  businessDate: varchar("business_date", { length: 10 }), // 营业日 YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("ledger_org_idx").on(table.orgId),
  orderIdx: index("ledger_order_idx").on(table.orderId),
  issueIdx: index("ledger_issue_idx").on(table.issueStoreId),
  redeemIdx: index("ledger_redeem_idx").on(table.redeemStoreId),
  statusIdx: index("ledger_status_idx").on(table.settlementStatus),
}));

/**
 * 结算批次表
 */
export const settlementBatches = mysqlTable("settlement_batches", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  batchNo: varchar("batch_no", { length: 50 }).notNull().unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"), // 轧差后净额
  recordCount: int("record_count").default(0),
  status: mysqlEnum("status", ["DRAFT", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  confirmedBy: int("confirmed_by"),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("batch_org_idx").on(table.orgId),
  statusIdx: index("batch_status_idx").on(table.status),
}));

/**
 * 退款记录表
 */
export const refundRecords = mysqlTable("refund_records", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  refundNo: varchar("refund_no", { length: 50 }).notNull().unique(),
  refundType: mysqlEnum("refund_type", ["FULL", "PARTIAL", "AUTO_EXCESS"]).notNull(), // AUTO_EXCESS = 超额自动退回
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  reason: json("reason"), // 多语言原因
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "COMPLETED"]).default("PENDING"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("refund_org_idx").on(table.orgId),
  orderIdx: index("refund_order_idx").on(table.orderId),
}));

/**
 * 财务报表表
 */
export const financialReports = mysqlTable("financial_reports", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id"),
  reportType: mysqlEnum("report_type", ["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]).notNull(),
  reportDate: varchar("report_date", { length: 10 }).notNull(), // YYYY-MM-DD
  revenue: decimal("revenue", { precision: 15, scale: 2 }).default("0.00"),
  couponDiscount: decimal("coupon_discount", { precision: 15, scale: 2 }).default("0.00"),
  refundAmount: decimal("refund_amount", { precision: 15, scale: 2 }).default("0.00"),
  netRevenue: decimal("net_revenue", { precision: 15, scale: 2 }).default("0.00"),
  orderCount: int("order_count").default(0),
  avgOrderValue: decimal("avg_order_value", { precision: 15, scale: 2 }).default("0.00"),
  reportData: json("report_data"), // 详细数据
  generatedBy: mysqlEnum("generated_by", ["SYSTEM", "AI", "MANUAL"]).default("SYSTEM"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("report_org_idx").on(table.orgId),
  dateIdx: index("report_date_idx").on(table.reportDate),
}));

// ============================================================================
// 第三章：营销模块 (Marketing)
// ============================================================================

/**
 * 营销活动表
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"), // 多语言描述
  campaignType: mysqlEnum("campaign_type", ["COUPON", "POINTS", "DISCOUNT", "GIFT", "COMBO"]).notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  targetStores: json("target_stores"), // 适用门店列表
  targetUsers: json("target_users"), // 目标用户条件
  budget: decimal("budget", { precision: 15, scale: 2 }),
  usedBudget: decimal("used_budget", { precision: 15, scale: 2 }).default("0.00"),
  rules: json("rules"), // 活动规则
  status: mysqlEnum("status", ["DRAFT", "PENDING", "ACTIVE", "PAUSED", "ENDED"]).default("DRAFT"),
  createdBy: int("created_by"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("campaign_org_idx").on(table.orgId),
  statusIdx: index("campaign_status_idx").on(table.status),
  dateIdx: index("campaign_date_idx").on(table.startAt, table.endAt),
}));

/**
 * 优惠券模板表
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  campaignId: int("campaign_id"),
  code: varchar("code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"), // 多语言描述
  couponType: mysqlEnum("coupon_type", ["FIXED", "PERCENT", "GIFT", "FREE_ITEM"]).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(), // 面值或折扣率
  minOrderAmount: decimal("min_order_amount", { precision: 15, scale: 2 }).default("0.00"), // 最低消费
  maxDiscount: decimal("max_discount", { precision: 15, scale: 2 }), // 最大折扣金额
  applicableProducts: json("applicable_products"), // 适用商品
  applicableCategories: json("applicable_categories"), // 适用分类
  issueStores: json("issue_stores"), // 可发放门店
  redeemStores: json("redeem_stores"), // 可核销门店（支持跨店）
  totalQuantity: int("total_quantity"), // 总发行量
  issuedQuantity: int("issued_quantity").default(0), // 已发放数量
  usedQuantity: int("used_quantity").default(0), // 已使用数量
  validDays: int("valid_days"), // 有效天数（从领取开始）
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  status: mysqlEnum("status", ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED"]).default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("coupon_org_idx").on(table.orgId),
  codeIdx: uniqueIndex("coupon_code_idx").on(table.orgId, table.code),
  statusIdx: index("coupon_status_idx").on(table.status),
}));

/**
 * 用户优惠券表
 */
export const userCoupons = mysqlTable("user_coupons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  couponId: int("coupon_id").notNull(),
  issueStoreId: int("issue_store_id").notNull(), // 发放门店
  couponCode: varchar("coupon_code", { length: 50 }).notNull().unique(), // 唯一券码
  status: mysqlEnum("status", ["UNUSED", "USED", "EXPIRED", "CANCELLED"]).default("UNUSED"),
  usedAt: timestamp("used_at"),
  usedStoreId: int("used_store_id"), // 核销门店
  usedOrderId: bigint("used_order_id", { mode: "number" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_coupon_user_idx").on(table.userId),
  couponIdx: index("user_coupon_coupon_idx").on(table.couponId),
  statusIdx: index("user_coupon_status_idx").on(table.status),
}));

/**
 * SDUI 动态布局表
 */
export const sduiLayouts = mysqlTable("sdui_layouts", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  layoutCode: varchar("layout_code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  platform: mysqlEnum("platform", ["APP", "TV", "WEB", "TELEGRAM"]).notNull(),
  layoutType: mysqlEnum("layout_type", ["HOME", "MENU", "PROMOTION", "BANNER"]).notNull(),
  layoutData: json("layout_data").notNull(), // SDUI 布局数据
  targetStores: json("target_stores"), // 适用门店
  priority: int("priority").default(0),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  status: mysqlEnum("status", ["DRAFT", "ACTIVE", "INACTIVE"]).default("DRAFT"),
  version: int("version").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("sdui_org_idx").on(table.orgId),
  platformIdx: index("sdui_platform_idx").on(table.platform),
}));

/**
 * 地理围栏规则表
 */
export const geoFenceRules = mysqlTable("geo_fence_rules", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  name: json("name").notNull(), // 多语言名称
  fenceType: mysqlEnum("fence_type", ["CIRCLE", "POLYGON"]).notNull(),
  centerLat: decimal("center_lat", { precision: 10, scale: 7 }),
  centerLng: decimal("center_lng", { precision: 10, scale: 7 }),
  radius: int("radius"), // 半径（米）
  polygon: json("polygon"), // 多边形坐标
  triggerAction: json("trigger_action"), // 触发动作
  targetCampaignId: int("target_campaign_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("geo_org_idx").on(table.orgId),
}));

/**
 * 天气触发规则表
 */
export const weatherTriggers = mysqlTable("weather_triggers", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  name: json("name").notNull(), // 多语言名称
  weatherCondition: json("weather_condition"), // 天气条件 {temp_min, temp_max, weather_type}
  triggerAction: json("trigger_action"), // 触发动作
  targetCampaignId: int("target_campaign_id"),
  targetStores: json("target_stores"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("weather_org_idx").on(table.orgId),
}));

// ============================================================================
// 第四章：商品模块 (Product)
// ============================================================================

/**
 * 商品分类表
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  parentId: int("parent_id"),
  code: varchar("code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"), // 多语言描述
  image: varchar("image", { length: 500 }),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("cat_org_idx").on(table.orgId),
  parentIdx: index("cat_parent_idx").on(table.parentId),
}));

/**
 * 商品表
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  categoryId: int("category_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"), // 多语言描述
  image: varchar("image", { length: 500 }),
  images: json("images"), // 多图
  basePrice: decimal("base_price", { precision: 15, scale: 2 }).notNull(),
  iikoProductId: varchar("iiko_product_id", { length: 100 }), // iiko 商品ID
  iikoGroupId: varchar("iiko_group_id", { length: 100 }), // iiko 分组ID
  nutritionInfo: json("nutrition_info"), // 营养信息
  allergens: json("allergens"), // 过敏原
  preparationTime: int("preparation_time"), // 制作时间（分钟）
  isActive: boolean("is_active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("product_org_idx").on(table.orgId),
  catIdx: index("product_cat_idx").on(table.categoryId),
  codeIdx: uniqueIndex("product_code_idx").on(table.orgId, table.code),
}));

/**
 * SKU 属性定义表 - 原子化配置
 */
export const skuAttributes = mysqlTable("sku_attributes", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  attributeCode: varchar("attribute_code", { length: 50 }).notNull(), // SIZE, ICE, SUGAR, TOPPING
  name: json("name").notNull(), // 多语言名称
  attributeType: mysqlEnum("attribute_type", ["SINGLE", "MULTIPLE"]).default("SINGLE"), // 单选/多选
  options: json("options").notNull(), // 选项列表 [{code, name, priceAdjust, isDefault}]
  isRequired: boolean("is_required").default(false),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("sku_attr_org_idx").on(table.orgId),
  codeIdx: uniqueIndex("sku_attr_code_idx").on(table.orgId, table.attributeCode),
}));

/**
 * 商品 SKU 配置表
 */
export const productSkus = mysqlTable("product_skus", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  skuCode: varchar("sku_code", { length: 100 }).notNull(),
  attributes: json("attributes").notNull(), // SKU 属性组合 {SIZE: "M", ICE: "LESS"}
  priceAdjust: decimal("price_adjust", { precision: 15, scale: 2 }).default("0.00"),
  iikoModifierId: varchar("iiko_modifier_id", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: index("sku_product_idx").on(table.productId),
  codeIdx: uniqueIndex("sku_code_idx").on(table.productId, table.skuCode),
}));

/**
 * 门店价格表 - 支持门店级别定价
 */
export const storePrices = mysqlTable("store_prices", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("store_id").notNull(),
  productId: int("product_id").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  storeIdx: index("store_price_store_idx").on(table.storeId),
  productIdx: index("store_price_product_idx").on(table.productId),
}));

/**
 * 分时段菜单表 - 支持 11 个时区
 */
export const timeSlotMenus = mysqlTable("time_slot_menus", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id"),
  name: json("name").notNull(), // 多语言名称
  menuType: mysqlEnum("menu_type", ["BREAKFAST", "LUNCH", "DINNER", "LATE_NIGHT", "ALL_DAY"]).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM
  products: json("products"), // 菜单商品列表
  categories: json("categories"), // 菜单分类列表
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("menu_org_idx").on(table.orgId),
  storeIdx: index("menu_store_idx").on(table.storeId),
}));

/**
 * iiko 影子菜单表 - 价格熔断机制
 */
export const iikoShadowMenu = mysqlTable("iiko_shadow_menu", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  productId: int("product_id").notNull(),
  iikoProductId: varchar("iiko_product_id", { length: 100 }).notNull(),
  iikoName: varchar("iiko_name", { length: 255 }),
  iikoPrice: decimal("iiko_price", { precision: 15, scale: 2 }).notNull(),
  localPrice: decimal("local_price", { precision: 15, scale: 2 }).notNull(),
  variancePercent: decimal("variance_percent", { precision: 5, scale: 2 }), // 价格变动百分比
  isFused: boolean("is_fused").default(false), // 是否触发熔断
  syncStatus: mysqlEnum("sync_status", ["AUTO", "PENDING", "APPROVED", "REJECTED"]).default("AUTO"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("shadow_org_idx").on(table.orgId),
  productIdx: index("shadow_product_idx").on(table.productId),
  statusIdx: index("shadow_status_idx").on(table.syncStatus),
}));

/**
 * 价格变更日志表
 */
export const priceChangeLogs = mysqlTable("price_change_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  productId: int("product_id").notNull(),
  storeId: int("store_id"),
  previousPrice: decimal("previous_price", { precision: 15, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 15, scale: 2 }).notNull(),
  changeSource: mysqlEnum("change_source", ["MANUAL", "IIKO_SYNC", "PROMOTION", "SYSTEM"]).notNull(),
  changeReason: text("change_reason"),
  operatorId: int("operator_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("price_log_org_idx").on(table.orgId),
  productIdx: index("price_log_product_idx").on(table.productId),
}));

// ============================================================================
// 第五章：AI 超级中心 (AI Center)
// ============================================================================

/**
 * 数据流水线表
 */
export const dataPipelines = mysqlTable("data_pipelines", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  pipelineCode: varchar("pipeline_code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  pipelineType: mysqlEnum("pipeline_type", ["ETL", "REPORT", "ANALYSIS", "TRANSLATION"]).notNull(),
  schedule: varchar("schedule", { length: 50 }), // cron 表达式
  config: json("config"), // 流水线配置
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: mysqlEnum("last_run_status", ["SUCCESS", "FAILED", "RUNNING"]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("pipeline_org_idx").on(table.orgId),
}));

/**
 * AI 报告表
 */
export const aiReports = mysqlTable("ai_reports", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id"),
  reportType: mysqlEnum("report_type", ["DAILY_SUMMARY", "WEEKLY_REVIEW", "MONTHLY_ANALYSIS", "CUSTOM"]).notNull(),
  reportDate: varchar("report_date", { length: 10 }).notNull(),
  titleZh: varchar("title_zh", { length: 255 }), // 中文标题（给老板看）
  contentZh: text("content_zh"), // 中文内容
  titleRu: varchar("title_ru", { length: 255 }),
  contentRu: text("content_ru"),
  insights: json("insights"), // AI 洞察
  recommendations: json("recommendations"), // AI 建议
  dataSnapshot: json("data_snapshot"), // 数据快照
  generatedBy: varchar("generated_by", { length: 50 }).default("AI"),
  status: mysqlEnum("status", ["DRAFT", "PUBLISHED"]).default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("ai_report_org_idx").on(table.orgId),
  dateIdx: index("ai_report_date_idx").on(table.reportDate),
}));

/**
 * 翻译审核表 - A+B 审核流
 */
export const translationReviews = mysqlTable("translation_reviews", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // review, feedback, chat
  sourceId: int("source_id").notNull(),
  originalText: text("original_text").notNull(), // 原文
  originalLang: varchar("original_lang", { length: 10 }).notNull(), // ru/zh/en
  translatedText: text("translated_text"), // AI 翻译结果
  targetLang: varchar("target_lang", { length: 10 }).notNull(),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // AI 置信度
  reviewStatus: mysqlEnum("review_status", ["PENDING", "AI_APPROVED", "HUMAN_REVIEW", "APPROVED", "REJECTED"]).default("PENDING"),
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  finalText: text("final_text"), // 最终文本
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("trans_review_org_idx").on(table.orgId),
  statusIdx: index("trans_review_status_idx").on(table.reviewStatus),
}));

/**
 * AI 建议表
 */
export const aiSuggestions = mysqlTable("ai_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id"),
  suggestionType: mysqlEnum("suggestion_type", ["PRICING", "INVENTORY", "MARKETING", "OPERATION"]).notNull(),
  title: json("title").notNull(), // 多语言标题
  content: json("content").notNull(), // 多语言内容
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: mysqlEnum("status", ["NEW", "VIEWED", "ACCEPTED", "REJECTED", "IMPLEMENTED"]).default("NEW"),
  actionedBy: int("actioned_by"),
  actionedAt: timestamp("actioned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("suggestion_org_idx").on(table.orgId),
  statusIdx: index("suggestion_status_idx").on(table.status),
}));

/**
 * 向量嵌入表 - Vector DB
 */
export const vectorEmbeddings = mysqlTable("vector_embeddings", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // product, faq, review
  sourceId: int("source_id").notNull(),
  content: text("content").notNull(),
  embedding: json("embedding"), // 向量数据（实际应使用专门的向量数据库）
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("vector_org_idx").on(table.orgId),
  sourceIdx: index("vector_source_idx").on(table.sourceType, table.sourceId),
}));

/**
 * LLM 调用日志表
 */
export const llmCallLogs = mysqlTable("llm_call_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id"),
  callType: varchar("call_type", { length: 50 }).notNull(), // translation, chat, analysis
  model: varchar("model", { length: 50 }).notNull(),
  inputTokens: int("input_tokens"),
  outputTokens: int("output_tokens"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  latencyMs: int("latency_ms"),
  status: mysqlEnum("status", ["SUCCESS", "FAILED", "TIMEOUT"]).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("llm_org_idx").on(table.orgId),
  typeIdx: index("llm_type_idx").on(table.callType),
}));

// ============================================================================
// 第六章：运营模块 (Operations)
// ============================================================================

/**
 * 订单表
 */
export const orders = mysqlTable("orders", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id").notNull(),
  userId: int("user_id").notNull(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  orderType: mysqlEnum("order_type", ["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("TAKEAWAY"),
  status: mysqlEnum("status", ["PENDING", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REFUNDED"]).default("PENDING"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),
  deliveryFee: decimal("delivery_fee", { precision: 15, scale: 2 }).default("0.00"),
  finalAmount: decimal("final_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentStatus: mysqlEnum("payment_status", ["PENDING", "PAID", "REFUNDED", "FAILED"]).default("PENDING"),
  businessDate: varchar("business_date", { length: 10 }).notNull(), // 营业日
  timezone: varchar("timezone", { length: 50 }).notNull(),
  iikoOrderId: varchar("iiko_order_id", { length: 100 }),
  customerNote: text("customer_note"),
  internalNote: text("internal_note"),
  deliveryAddress: json("delivery_address"),
  estimatedReadyAt: timestamp("estimated_ready_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("order_org_idx").on(table.orgId),
  storeIdx: index("order_store_idx").on(table.storeId),
  userIdx: index("order_user_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.status),
  dateIdx: index("order_date_idx").on(table.businessDate),
}));

/**
 * 订单明细表
 */
export const orderItems = mysqlTable("order_items", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  productId: int("product_id").notNull(),
  productName: json("product_name").notNull(), // 快照
  skuAttributes: json("sku_attributes"), // SKU 属性快照
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("item_order_idx").on(table.orderId),
  productIdx: index("item_product_idx").on(table.productId),
}));

/**
 * 订单优惠记录表
 */
export const orderDiscounts = mysqlTable("order_discounts", {
  id: int("id").autoincrement().primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  discountType: mysqlEnum("discount_type", ["COUPON", "POINTS", "PROMOTION", "MANUAL"]).notNull(),
  discountId: int("discount_id"), // 关联优惠券/活动ID
  discountCode: varchar("discount_code", { length: 50 }),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).notNull(),
  description: json("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("discount_order_idx").on(table.orderId),
}));

/**
 * 评价表
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id").notNull(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  userId: int("user_id").notNull(),
  rating: int("rating").notNull(), // 1-5
  content: json("content"), // 多语言内容 {original, translated}
  originalLang: varchar("original_lang", { length: 10 }),
  tags: json("tags"), // 标签
  hasImages: boolean("has_images").default(false),
  replyContent: json("reply_content"), // 商家回复
  replyAt: timestamp("reply_at"),
  repliedBy: int("replied_by"),
  status: mysqlEnum("status", ["PENDING", "PUBLISHED", "HIDDEN"]).default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("review_org_idx").on(table.orgId),
  storeIdx: index("review_store_idx").on(table.storeId),
  orderIdx: index("review_order_idx").on(table.orderId),
}));

/**
 * 评价图片表
 */
export const reviewImages = mysqlTable("review_images", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reviewIdx: index("review_img_review_idx").on(table.reviewId),
}));

// ============================================================================
// 第七章：购物中心模块 (Mall)
// ============================================================================

/**
 * 购物中心商品表
 */
export const mallProducts = mysqlTable("mall_products", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  categoryId: int("category_id"),
  code: varchar("code", { length: 50 }).notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"),
  images: json("images"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 15, scale: 2 }), // 原价
  stock: int("stock").default(0),
  weight: decimal("weight", { precision: 10, scale: 2 }), // 重量（克）
  dimensions: json("dimensions"), // 尺寸
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("mall_product_org_idx").on(table.orgId),
}));

/**
 * 购物中心订单表
 */
export const mallOrders = mysqlTable("mall_orders", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  userId: int("user_id").notNull(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).default("PENDING"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  shippingFee: decimal("shipping_fee", { precision: 15, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),
  finalAmount: decimal("final_amount", { precision: 15, scale: 2 }).notNull(),
  shippingAddress: json("shipping_address").notNull(),
  shippingMethod: varchar("shipping_method", { length: 50 }), // CDEK/BOXBERRY
  trackingNumber: varchar("tracking_number", { length: 100 }),
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("mall_order_org_idx").on(table.orgId),
  userIdx: index("mall_order_user_idx").on(table.userId),
  statusIdx: index("mall_order_status_idx").on(table.status),
}));

/**
 * 购物中心订单明细表
 */
export const mallOrderItems = mysqlTable("mall_order_items", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  productId: int("product_id").notNull(),
  productName: json("product_name").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("mall_item_order_idx").on(table.orderId),
}));

/**
 * 购物中心库存表
 */
export const mallInventory = mysqlTable("mall_inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  warehouseId: int("warehouse_id"),
  quantity: int("quantity").default(0),
  reservedQuantity: int("reserved_quantity").default(0), // 预留数量
  lowStockThreshold: int("low_stock_threshold").default(10),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  productIdx: uniqueIndex("inventory_product_idx").on(table.productId, table.warehouseId),
}));

/**
 * 物流追踪表
 */
export const logisticsTracking = mysqlTable("logistics_tracking", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  carrier: varchar("carrier", { length: 50 }).notNull(), // CDEK/BOXBERRY
  trackingNumber: varchar("tracking_number", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }),
  statusDescription: json("status_description"), // 多语言状态描述
  location: varchar("location", { length: 255 }),
  eventTime: timestamp("event_time"),
  rawData: json("raw_data"), // 原始 API 响应
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("tracking_order_idx").on(table.orderId),
  trackingIdx: index("tracking_number_idx").on(table.trackingNumber),
}));

// ============================================================================
// 第八章：达人模块 (Influencer)
// ============================================================================

/**
 * 达人表
 */
export const influencers = mysqlTable("influencers", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  userId: int("user_id").notNull(), // 关联用户
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: json("name").notNull(), // 多语言名称
  phone: varchar("phone", { length: 20 }).notNull(),
  phoneVerified: boolean("phone_verified").default(false),
  email: varchar("email", { length: 255 }),
  socialLinks: json("social_links"), // 社交媒体链接
  followerCount: int("follower_count").default(0),
  level: mysqlEnum("level", ["BRONZE", "SILVER", "GOLD", "PLATINUM"]).default("BRONZE"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"), // 佣金比例
  totalEarnings: decimal("total_earnings", { precision: 15, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 15, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["PENDING", "ACTIVE", "SUSPENDED"]).default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("influencer_org_idx").on(table.orgId),
  userIdx: uniqueIndex("influencer_user_idx").on(table.userId),
}));

/**
 * 达人任务表
 */
export const influencerTasks = mysqlTable("influencer_tasks", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"),
  taskType: mysqlEnum("task_type", ["POST", "VIDEO", "REVIEW", "REFERRAL"]).notNull(),
  requirements: json("requirements"), // 任务要求
  reward: decimal("reward", { precision: 15, scale: 2 }).notNull(),
  maxParticipants: int("max_participants"),
  currentParticipants: int("current_participants").default(0),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: mysqlEnum("status", ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("task_org_idx").on(table.orgId),
  statusIdx: index("task_status_idx").on(table.status),
}));

/**
 * 任务提交表
 */
export const taskSubmissions = mysqlTable("task_submissions", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(),
  influencerId: int("influencer_id").notNull(),
  submissionUrl: varchar("submission_url", { length: 500 }),
  submissionContent: text("submission_content"),
  attachments: json("attachments"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  reviewNote: text("review_note"),
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  taskIdx: index("submission_task_idx").on(table.taskId),
  influencerIdx: index("submission_influencer_idx").on(table.influencerId),
}));

/**
 * 达人佣金表
 */
export const influencerCommissions = mysqlTable("influencer_commissions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  influencerId: int("influencer_id").notNull(),
  sourceType: mysqlEnum("source_type", ["ORDER", "TASK", "REFERRAL"]).notNull(),
  sourceId: bigint("source_id", { mode: "number" }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "CONFIRMED", "PAID", "CANCELLED"]).default("PENDING"),
  confirmedAt: timestamp("confirmed_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  influencerIdx: index("commission_influencer_idx").on(table.influencerId),
  statusIdx: index("commission_status_idx").on(table.status),
}));

/**
 * 提现申请表
 */
export const withdrawalRequests = mysqlTable("withdrawal_requests", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencer_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  bankInfo: json("bank_info"), // 银行信息（加密存储）
  status: mysqlEnum("status", ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"]).default("PENDING"),
  processedBy: int("processed_by"),
  processedAt: timestamp("processed_at"),
  rejectReason: text("reject_reason"),
  transactionId: varchar("transaction_id", { length: 100 }),
  voucherPdfUrl: varchar("voucher_pdf_url", { length: 500 }), // 财务凭证PDF链接
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  influencerIdx: index("withdrawal_influencer_idx").on(table.influencerId),
  statusIdx: index("withdrawal_status_idx").on(table.status),
}));

/**
 * 推荐链接表
 */
export const referralLinks = mysqlTable("referral_links", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencer_id").notNull(),
  linkCode: varchar("link_code", { length: 50 }).notNull().unique(),
  targetType: mysqlEnum("target_type", ["PRODUCT", "STORE", "CAMPAIGN"]).notNull(),
  targetId: int("target_id"),
  clickCount: int("click_count").default(0),
  conversionCount: int("conversion_count").default(0),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  influencerIdx: index("referral_influencer_idx").on(table.influencerId),
}));

// ============================================================================
// 第九章：AI 客服模块 (AI Customer Service)
// ============================================================================

/**
 * 聊天会话表
 */
export const chatSessions = mysqlTable("chat_sessions", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  userId: int("user_id"),
  sessionType: mysqlEnum("session_type", ["USER_SUPPORT", "STAFF_ASSISTANT", "SALES"]).notNull(),
  platform: mysqlEnum("platform", ["APP", "TELEGRAM", "WEB"]).notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  status: mysqlEnum("status", ["ACTIVE", "CLOSED", "TRANSFERRED"]).default("ACTIVE"),
  assignedTo: int("assigned_to"), // 转人工时分配的客服
  metadata: json("metadata"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("chat_org_idx").on(table.orgId),
  userIdx: index("chat_user_idx").on(table.userId),
  statusIdx: index("chat_status_idx").on(table.status),
}));

/**
 * 聊天消息表
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  sessionId: bigint("session_id", { mode: "number" }).notNull(),
  senderType: mysqlEnum("sender_type", ["USER", "AI", "STAFF"]).notNull(),
  senderId: int("sender_id"),
  content: text("content").notNull(),
  contentType: mysqlEnum("content_type", ["TEXT", "IMAGE", "AUDIO", "FILE"]).default("TEXT"),
  originalLang: varchar("original_lang", { length: 10 }),
  translatedContent: text("translated_content"), // AI 翻译后的内容
  aiIntent: varchar("ai_intent", { length: 100 }), // AI 识别的意图
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("msg_session_idx").on(table.sessionId),
  createdIdx: index("msg_created_idx").on(table.createdAt),
}));

/**
 * AI 意图表
 */
export const aiIntents = mysqlTable("ai_intents", {
  id: int("id").autoincrement().primaryKey(),
  intentCode: varchar("intent_code", { length: 50 }).notNull().unique(),
  name: json("name").notNull(), // 多语言名称
  description: json("description"),
  keywords: json("keywords"), // 关键词
  responseTemplate: json("response_template"), // 响应模板
  actionType: varchar("action_type", { length: 50 }), // 触发的动作
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * 快捷回复表
 */
export const quickReplies = mysqlTable("quick_replies", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  category: varchar("category", { length: 50 }),
  title: json("title").notNull(), // 多语言标题
  content: json("content").notNull(), // 多语言内容
  shortcut: varchar("shortcut", { length: 20 }),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("quick_reply_org_idx").on(table.orgId),
}));

/**
 * FAQ 表
 */
export const faqEntries = mysqlTable("faq_entries", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  category: varchar("category", { length: 50 }),
  question: json("question").notNull(), // 多语言问题
  answer: json("answer").notNull(), // 多语言答案
  keywords: json("keywords"),
  viewCount: int("view_count").default(0),
  helpfulCount: int("helpful_count").default(0),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("faq_org_idx").on(table.orgId),
}));

/**
 * Telegram Bot 配置表
 */
export const telegramBotConfig = mysqlTable("telegram_bot_config", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  botToken: varchar("bot_token", { length: 255 }), // 加密存储
  botUsername: varchar("bot_username", { length: 100 }),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  welcomeMessage: json("welcome_message"), // 多语言欢迎消息
  menuCommands: json("menu_commands"), // 菜单命令配置
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: uniqueIndex("tg_bot_org_idx").on(table.orgId),
}));

// ============================================================================
// 第十章：用户模块 (Users)
// ============================================================================

/**
 * 用户表（扩展原有表）
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: boolean("phone_verified").default(false),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 320 }),
  avatar: varchar("avatar", { length: 500 }),
  languagePref: varchar("language_pref", { length: 10 }).default("ru"),
  loginMethod: varchar("login_method", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  totalPoints: int("total_points").default(0),
  availablePoints: int("available_points").default(0),
  memberLevel: mysqlEnum("member_level", ["NORMAL", "SILVER", "GOLD", "PLATINUM"]).default("NORMAL"),
  // Telegram 绑定字段
  telegramId: varchar("telegram_id", { length: 50 }), // Telegram Chat ID
  telegramUsername: varchar("telegram_username", { length: 100 }), // Telegram @username
  telegramBoundAt: timestamp("telegram_bound_at"), // 绑定时间
  // 达人/提现相关字段
  isInfluencer: boolean("is_influencer").default(false), // 是否为达人
  withdrawableBalance: decimal("withdrawable_balance", { precision: 10, scale: 2 }).default("0.00"), // 可提现余额
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00"), // 累计提现
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "BANNED"]).default("ACTIVE"),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  phoneIdx: index("user_phone_idx").on(table.phone),
  telegramIdx: index("user_telegram_idx").on(table.telegramId),
}));

/**
 * 用户地址表
 */
export const userAddresses = mysqlTable("user_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  addressType: mysqlEnum("address_type", ["HOME", "WORK", "OTHER"]).default("HOME"),
  recipientName: varchar("recipient_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  country: varchar("country", { length: 50 }).default("Russia"),
  city: varchar("city", { length: 100 }),
  street: varchar("street", { length: 255 }),
  building: varchar("building", { length: 50 }),
  apartment: varchar("apartment", { length: 50 }),
  postalCode: varchar("postal_code", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("address_user_idx").on(table.userId),
}));

/**
 * 用户积分记录表
 */
export const userPoints = mysqlTable("user_points", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  pointType: mysqlEnum("point_type", ["EARN", "REDEEM", "EXPIRE", "ADJUST"]).notNull(),
  points: int("points").notNull(), // 正数为获得，负数为消耗
  balance: int("balance").notNull(), // 变动后余额
  sourceType: varchar("source_type", { length: 50 }), // ORDER, REVIEW, REFERRAL, ADMIN
  sourceId: bigint("source_id", { mode: "number" }),
  description: json("description"), // 多语言描述
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("points_user_idx").on(table.userId),
  typeIdx: index("points_type_idx").on(table.pointType),
}));

/**
 * 礼品卡表
 */
export const giftCards = mysqlTable("gift_cards", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  cardCode: varchar("card_code", { length: 50 }).notNull().unique(),
  initialValue: decimal("initial_value", { precision: 15, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("RUB"),
  purchasedBy: int("purchased_by"),
  redeemedBy: int("redeemed_by"),
  status: mysqlEnum("status", ["ACTIVE", "USED", "EXPIRED", "CANCELLED"]).default("ACTIVE"),
  expiresAt: timestamp("expires_at"),
  redeemedAt: timestamp("redeemed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orgIdx: index("gift_card_org_idx").on(table.orgId),
}));

// ============================================================================
// 第十四章：身份核验模块 (Identity Verification)
// ============================================================================

/**
 * SMS 服务商配置表
 */
export const smsProviders = mysqlTable("sms_providers", {
  id: int("id").autoincrement().primaryKey(),
  providerCode: varchar("provider_code", { length: 50 }).notNull().unique(), // SMS_RU, MTS, TWILIO
  name: json("name").notNull(), // 多语言名称
  apiEndpoint: varchar("api_endpoint", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 500 }), // 加密存储
  apiSecret: varchar("api_secret", { length: 500 }), // 加密存储
  region: json("region"), // 适用地区 ["RU", "CN", "INTL"]
  priority: int("priority").default(1),
  rateLimit: json("rate_limit"), // 频率限制配置
  config: json("config"), // 其他配置
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * SMS 验证码日志表
 */
export const smsVerificationLogs = mysqlTable("sms_verification_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  providerId: int("provider_id").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(), // 加密存储
  purpose: mysqlEnum("purpose", ["LOGIN", "REGISTER", "WITHDRAW", "SENSITIVE_ACTION", "ACTIVATION"]).notNull(),
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]).notNull(),
  userId: int("user_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  geoLocation: json("geo_location"), // {country, city, lat, lng}
  userAgent: text("user_agent"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  status: mysqlEnum("status", ["SENT", "VERIFIED", "EXPIRED", "FAILED"]).default("SENT"),
  failureReason: varchar("failure_reason", { length: 100 }),
  attempts: int("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  phoneIdx: index("sms_phone_idx").on(table.phone),
  statusIdx: index("sms_status_idx").on(table.status),
  createdIdx: index("sms_created_idx").on(table.createdAt),
}));

/**
 * 手机号绑定记录表
 */
export const phoneBindings = mysqlTable("phone_bindings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  phoneVerified: boolean("phone_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verificationMethod: mysqlEnum("verification_method", ["SMS", "TOKEN"]),
  bindingSource: mysqlEnum("binding_source", ["SELF", "HQ_CREATE", "FRANCHISEE_CREATE"]).default("SELF"),
  isPrimary: boolean("is_primary").default(true),
  status: mysqlEnum("status", ["ACTIVE", "DISABLED"]).default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("binding_user_idx").on(table.userId, table.userType),
  phoneIdx: index("binding_phone_idx").on(table.phone),
}));

/**
 * 敏感动作日志表
 */
export const sensitiveActionLogs = mysqlTable("sensitive_action_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  orgId: int("org_id").notNull(),
  storeId: int("store_id"),
  adminUserId: int("admin_user_id").notNull(),
  actionType: mysqlEnum("action_type", ["PRICE_CHANGE", "REFUND", "DEPOSIT_VIEW", "MARKETING_APPLY", "WITHDRAW", "OTHER"]).notNull(),
  actionDetail: json("action_detail"),
  verificationMethod: mysqlEnum("verification_method", ["SMS", "TOKEN"]).notNull(),
  verificationId: bigint("verification_id", { mode: "number" }), // 关联验证日志
  ipAddress: varchar("ip_address", { length: 45 }),
  geoLocation: json("geo_location"),
  result: mysqlEnum("result", ["SUCCESS", "FAILED", "BLOCKED"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("sensitive_org_idx").on(table.orgId),
  adminIdx: index("sensitive_admin_idx").on(table.adminUserId),
  actionIdx: index("sensitive_action_idx").on(table.actionType),
}));

/**
 * 安全令牌表
 */
export const securityTokens = mysqlTable("security_tokens", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("admin_user_id").notNull(),
  tokenType: mysqlEnum("token_type", ["TOTP", "HARDWARE"]).notNull(),
  secretKey: varchar("secret_key", { length: 255 }), // 加密存储
  deviceId: varchar("device_id", { length: 100 }),
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  adminIdx: index("token_admin_idx").on(table.adminUserId),
}));

/**
 * 核验规则配置表
 */
export const verificationRules = mysqlTable("verification_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull().unique(),
  name: json("name").notNull(), // 多语言名称
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  requireVerification: boolean("require_verification").default(true),
  verificationMethods: json("verification_methods"), // ["SMS", "TOKEN"]
  cooldownSeconds: int("cooldown_seconds").default(60),
  maxAttempts: int("max_attempts").default(3),
  blockDurationMinutes: int("block_duration_minutes").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userTypeIdx: index("rule_user_type_idx").on(table.userType),
  actionIdx: index("rule_action_idx").on(table.actionType),
}));

/**
 * 风控日志表
 */
export const riskControlLogs = mysqlTable("risk_control_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  eventType: mysqlEnum("event_type", ["SMS_FLOOD", "IP_BLOCK", "GEO_ANOMALY", "DEVICE_CHANGE", "SUSPICIOUS_BEHAVIOR"]).notNull(),
  userId: int("user_id"),
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]),
  phone: varchar("phone", { length: 20 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  geoLocation: json("geo_location"),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  riskScore: int("risk_score"), // 0-100
  riskFactors: json("risk_factors"),
  actionTaken: mysqlEnum("action_taken", ["NONE", "WARN", "BLOCK", "REQUIRE_EXTRA_VERIFY"]).default("NONE"),
  rawData: json("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("risk_event_idx").on(table.eventType),
  ipIdx: index("risk_ip_idx").on(table.ipAddress),
  createdIdx: index("risk_created_idx").on(table.createdAt),
}));

// ============================================================================
// 第十五章：安全中枢模块 (Security Gateway) - 腾讯云强制接入
// ============================================================================

/**
 * 验证码配置表
 */
export const captchaConfigs = mysqlTable("captcha_configs", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().default("TENCENT_CLOUD"),
  appId: varchar("app_id", { length: 100 }), // 加密存储
  appSecret: varchar("app_secret", { length: 255 }), // 加密存储
  captchaType: mysqlEnum("captcha_type", ["SLIDE", "CLICK", "SMART"]).default("SLIDE"),
  sceneConfigs: json("scene_configs"), // {scene: captcha_type}
  threshold: json("threshold"), // {evil_level_block, pass_threshold}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * 验证码校验日志表
 */
export const captchaVerifyLogs = mysqlTable("captcha_verify_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  configId: int("config_id").notNull(),
  ticket: varchar("ticket", { length: 500 }),
  randstr: varchar("randstr", { length: 100 }),
  userIp: varchar("user_ip", { length: 45 }),
  scene: varchar("scene", { length: 50 }), // SMS_SEND, REGISTER, LOGIN, ASSET_OP, SENSITIVE_ACTION
  userId: int("user_id"),
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]),
  requestPath: varchar("request_path", { length: 255 }),
  verifyResult: mysqlEnum("verify_result", ["PASS", "FAIL", "ERROR"]).notNull(),
  evilLevel: int("evil_level"), // 腾讯云返回的恶意等级
  errorCode: varchar("error_code", { length: 50 }),
  errorMsg: varchar("error_msg", { length: 255 }),
  responseTimeMs: int("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sceneIdx: index("captcha_scene_idx").on(table.scene),
  resultIdx: index("captcha_result_idx").on(table.verifyResult),
  createdIdx: index("captcha_created_idx").on(table.createdAt),
}));

/**
 * 安全规则配置表
 */
export const securityRules = mysqlTable("security_rules", {
  id: int("id").autoincrement().primaryKey(),
  ruleCode: varchar("rule_code", { length: 50 }).notNull().unique(),
  name: json("name").notNull(), // 多语言名称
  scene: varchar("scene", { length: 50 }).notNull(), // SMS_SEND, REGISTER, LOGIN, ASSET_OP, SENSITIVE_ACTION
  userTypes: json("user_types"), // ["FAN", "INFLUENCER", "STAFF", "ADMIN"]
  requireCaptcha: boolean("require_captcha").default(true),
  captchaType: mysqlEnum("captcha_type", ["SLIDE", "CLICK", "SMART"]).default("SLIDE"),
  requireSms: boolean("require_sms").default(false),
  smsCooldownSec: int("sms_cooldown_sec").default(60),
  maxAttempts: int("max_attempts").default(3),
  blockDurationMin: int("block_duration_min").default(30),
  priority: int("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sceneIdx: index("security_scene_idx").on(table.scene),
}));

/**
 * 安全审计日志表
 */
export const securityAuditLogs = mysqlTable("security_audit_logs", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  ruleId: int("rule_id"),
  userId: int("user_id"),
  userType: mysqlEnum("user_type", ["FAN", "INFLUENCER", "STAFF", "ADMIN"]),
  action: varchar("action", { length: 50 }).notNull(),
  requestPath: varchar("request_path", { length: 255 }),
  requestMethod: varchar("request_method", { length: 10 }),
  requestBody: json("request_body"), // 脱敏后
  ipAddress: varchar("ip_address", { length: 45 }),
  geoLocation: json("geo_location"),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  captchaVerifyId: bigint("captcha_verify_id", { mode: "number" }),
  smsVerifyId: bigint("sms_verify_id", { mode: "number" }),
  overallResult: mysqlEnum("overall_result", ["PASS", "CAPTCHA_FAIL", "SMS_FAIL", "BLOCKED"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_user_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  resultIdx: index("audit_result_idx").on(table.overallResult),
  createdIdx: index("audit_created_idx").on(table.createdAt),
}));

/**
 * 封禁记录表
 */
export const blockedEntities = mysqlTable("blocked_entities", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entity_type", ["IP", "PHONE", "DEVICE", "USER"]).notNull(),
  entityValue: varchar("entity_value", { length: 255 }).notNull(),
  reason: mysqlEnum("reason", ["CAPTCHA_FAIL", "SMS_FLOOD", "SUSPICIOUS_BEHAVIOR", "MANUAL_BLOCK"]).notNull(),
  blockedBy: int("blocked_by"), // 手动封禁时的操作者
  blockedAt: timestamp("blocked_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isPermanent: boolean("is_permanent").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("blocked_entity_idx").on(table.entityType, table.entityValue),
  expiresIdx: index("blocked_expires_idx").on(table.expiresAt),
}));

// ============================================================================
// 保留原有翻译表（兼容）
// ============================================================================

/**
 * 翻译管理表（保留原有结构）
 */
export const translations = mysqlTable("translations", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  textZh: text("text_zh").notNull(),
  textRu: text("text_ru"),
  textEn: text("text_en"),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  aiConfidence: int("ai_confidence"),
  isPublished: mysqlEnum("is_published", ["true", "false"]).notNull().default("false"),
  publishedBy: int("published_by"),
  publishedAt: timestamp("published_at"),
  reviewNote: text("review_note"),
  context: text("context"),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: int("entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * 翻译审核历史表（保留原有结构）
 */
export const translationAuditLog = mysqlTable("translation_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  translationId: int("translation_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  operatorId: int("operator_id").notNull(),
  operatorRole: varchar("operator_role", { length: 20 }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  note: text("note"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// 第十六章：离线补单模块 (Offline Redemption)
// ============================================================================

/**
 * 离线核销队列表 - iiko 断网时的券核销缓存与联网对齐
 */
export const offlineRedemptionQueue = mysqlTable("offline_redemption_queue", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  
  // 唯一标识（幂等键，防重复）
  idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull().unique(),
  
  // 核销信息
  userCouponId: int("user_coupon_id").notNull(),
  couponCode: varchar("coupon_code", { length: 50 }).notNull(),
  userId: int("user_id").notNull(),
  storeId: int("store_id").notNull(),
  orderId: bigint("order_id", { mode: "number" }),
  redemptionAmount: decimal("redemption_amount", { precision: 15, scale: 2 }).notNull(),
  
  // 离线时间戳（App 本地时间）
  localTimestamp: timestamp("local_timestamp").notNull(),
  localTimezone: varchar("local_timezone", { length: 50 }).notNull(),
  
  // 状态流转
  status: mysqlEnum("status", ["PENDING", "CACHED", "SYNCING", "CONFIRMED", "FAILED", "CONFLICT"]).default("PENDING"),
  
  // 同步信息
  syncAttempts: int("sync_attempts").default(0),
  lastSyncAt: timestamp("last_sync_at"),
  syncError: text("sync_error"),
  
  // iiko 确认
  iikoConfirmed: boolean("iiko_confirmed").default(false),
  iikoOrderId: varchar("iiko_order_id", { length: 100 }),
  iikoConfirmedAt: timestamp("iiko_confirmed_at"),
  
  // 冲突处理
  conflictType: mysqlEnum("conflict_type", ["DUPLICATE", "EXPIRED", "ALREADY_USED", "STORE_MISMATCH", "IIKO_UNREACHABLE"]),
  conflictResolution: mysqlEnum("conflict_resolution", ["AUTO_REJECT", "MANUAL_REVIEW", "FORCE_ACCEPT"]),
  resolvedBy: int("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  
  // 审计
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  appVersion: varchar("app_version", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("offline_status_idx").on(table.status),
  storeIdx: index("offline_store_idx").on(table.storeId),
  userCouponIdx: index("offline_user_coupon_idx").on(table.userCouponId),
  localTimestampIdx: index("offline_local_timestamp_idx").on(table.localTimestamp),
}));

// ============================================================================
// 第十七章：用户信任分模块 (User Trust Score)
// ============================================================================

/**
 * 用户信任分表 - 智能降级免验机制
 */
export const userTrustScores = mysqlTable("user_trust_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  
  // 信任分数
  trustScore: int("trust_score").default(0),
  trustLevel: mysqlEnum("trust_level", ["HIGH_RISK", "NORMAL", "TRUSTED", "VIP"]).default("NORMAL"),
  
  // 计算因子
  registrationDays: int("registration_days").default(0),
  totalOrders: int("total_orders").default(0),
  totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).default("0.00"),
  phoneVerified: boolean("phone_verified").default(false),
  reportCount: int("report_count").default(0),
  refundCount: int("refund_count").default(0),
  
  // 验证统计
  captchaPassCount: int("captcha_pass_count").default(0),
  captchaFailCount: int("captcha_fail_count").default(0),
  lastCaptchaAt: timestamp("last_captcha_at"),
  
  // 免验证配额
  dailySkipQuota: int("daily_skip_quota").default(0),
  dailySkipUsed: int("daily_skip_used").default(0),
  quotaResetAt: varchar("quota_reset_at", { length: 10 }), // YYYY-MM-DD
  
  // 时间戳
  scoreUpdatedAt: timestamp("score_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  trustLevelIdx: index("trust_level_idx").on(table.trustLevel),
  trustScoreIdx: index("trust_score_idx").on(table.trustScore),
}));

// ============================================================================
// 类型导出
// ============================================================================

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type SystemConfig = typeof systemConfigs.$inferSelect;
export type InsertSystemConfig = typeof systemConfigs.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

export type UserCoupon = typeof userCoupons.$inferSelect;
export type InsertUserCoupon = typeof userCoupons.$inferInsert;

export type CrossStoreLedger = typeof crossStoreLedger.$inferSelect;
export type InsertCrossStoreLedger = typeof crossStoreLedger.$inferInsert;

export type Influencer = typeof influencers.$inferSelect;
export type InsertInfluencer = typeof influencers.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

export type TranslationAuditLog = typeof translationAuditLog.$inferSelect;
export type InsertTranslationAuditLog = typeof translationAuditLog.$inferInsert;

export type VerificationRule = typeof verificationRules.$inferSelect;
export type InsertVerificationRule = typeof verificationRules.$inferInsert;

export type SecurityRule = typeof securityRules.$inferSelect;
export type InsertSecurityRule = typeof securityRules.$inferInsert;

export type CaptchaConfig = typeof captchaConfigs.$inferSelect;
export type InsertCaptchaConfig = typeof captchaConfigs.$inferInsert;


export type OfflineRedemptionQueue = typeof offlineRedemptionQueue.$inferSelect;
export type InsertOfflineRedemptionQueue = typeof offlineRedemptionQueue.$inferInsert;

export type UserTrustScore = typeof userTrustScores.$inferSelect;
export type InsertUserTrustScore = typeof userTrustScores.$inferInsert;
