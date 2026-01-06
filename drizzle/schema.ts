/**
 * Drizzle ORM Schema - PostgreSQL
 * 
 * Naming Convention:
 * - DB: snake_case (e.g., created_at, member_id)
 * - TS: camelCase with explicit mapping (e.g., createdAt: timestamp('created_at'))
 * 
 * Type Standards:
 * - All timestamp fields use timestamptz (with timezone) for UTC storage
 * - Monetary fields use numeric(12,2) for currency amounts (max 9,999,999,999.99)
 * - Points multipliers use numeric(3,2) for percentages (0.00-9.99x)
 * - Discount percentages use numeric(5,2) for percentage values (0.00-999.99%)
 * - Geographic coordinates use numeric(10,7) for lat/lng precision
 * 
 * Rationale:
 * - numeric(12,2): Supports up to 10 billion in currency with cent precision
 * - numeric(3,2): Points multipliers rarely exceed 10x (e.g., 2.5x, 5.0x)
 * - numeric(5,2): Discount percentages can exceed 100% (e.g., 200% bonus)
 * - numeric(10,7): Standard GPS precision (~1.1cm accuracy)
 */

import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  integer, 
  boolean, 
  timestamp, 
  numeric, 
  uuid,
  json,
  index,
  uniqueIndex,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================================
// 1. USERS (Base Auth Table)
// ============================================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// 2. MEMBER_GROUP (VIP Tiers) - Must be defined before member
// ============================================================================
export const memberGroup = pgTable("member_group", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  nameZh: varchar("name_zh", { length: 50 }),
  nameRu: varchar("name_ru", { length: 50 }),
  level: integer("level").notNull().default(0),
  pointsMultiplier: numeric("points_multiplier", { precision: 3, scale: 2 }).notNull().default("1.00"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  minPointsRequired: integer("min_points_required").notNull().default(0),
  benefits: json("benefits").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 3. MEMBER (Extended User Profile with Points)
// ============================================================================
export const member = pgTable("member", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Phone verification
  phone: varchar("phone", { length: 20 }).unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  
  // Membership
  groupId: integer("group_id").references(() => memberGroup.id),
  
  // Points - available_points_balance is the source of truth for deduction
  availablePointsBalance: integer("available_points_balance").notNull().default(0),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  
  // Profile
  nickname: varchar("nickname", { length: 100 }),
  avatarUrl: text("avatar_url"),
  birthday: timestamp("birthday", { withTimezone: true }),
  gender: varchar("gender", { length: 10 }),
  
  // Referral
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  referredBy: integer("referred_by"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_member_user_id").on(table.userId),
  index("idx_member_phone").on(table.phone),
  index("idx_member_group_id").on(table.groupId),
]);

export type Member = typeof member.$inferSelect;
export type InsertMember = typeof member.$inferInsert;

// ============================================================================
// 4. PHONE_VERIFICATION (SMS Codes)
// ============================================================================
export const phoneVerification = pgTable("phone_verification", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_phone_verification_phone").on(table.phone),
  index("idx_phone_verification_expires").on(table.expiresAt),
]);

// ============================================================================
// 5. IDEMPOTENCY_KEY (Prevent Duplicate Operations)
// ============================================================================
export const idempotencyKey = pgTable("idempotency_key", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  result: json("result"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_idempotency_key_expires").on(table.expiresAt),
]);

// ============================================================================
// 6. MEMBER_POINTS_HISTORY (Points Ledger)
// ============================================================================
export const memberPointsHistory = pgTable("member_points_history", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => member.id),
  
  // Transaction
  delta: integer("delta").notNull(), // positive = earn, negative = spend
  balanceAfter: integer("balance_after").notNull(), // snapshot after this transaction
  
  // Reason
  reason: varchar("reason", { length: 50 }).notNull(), // SIGNUP_BONUS, ORDER_EARN, ORDER_REDEEM, ADMIN_ADJUST, EXPIRED
  description: text("description"),
  
  // References
  orderId: integer("order_id"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  
  // Expiration (optional, for future use)
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_points_history_member").on(table.memberId),
  index("idx_points_history_order").on(table.orderId),
  index("idx_points_history_reason").on(table.reason),
  index("idx_points_history_expires").on(table.expiresAt),
  // Partial unique index: idempotency_key must be unique when not null
  uniqueIndex("idx_points_history_idempotency_unique")
    .on(table.idempotencyKey)
    .where(sql`idempotency_key IS NOT NULL`),
]);

// ============================================================================
// 7. STORE (Physical Locations)
// ============================================================================
export const store = pgTable("store", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  nameZh: varchar("name_zh", { length: 100 }),
  nameRu: varchar("name_ru", { length: 100 }),
  
  // Location
  address: text("address"),
  city: varchar("city", { length: 50 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  
  // Contact
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  
  // Operations
  isActive: boolean("is_active").notNull().default(true),
  openingHours: json("opening_hours").$type<Record<string, { open: string; close: string }>>(),
  
  // IIKO Integration
  iikoTerminalId: varchar("iiko_terminal_id", { length: 100 }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_store_city").on(table.city),
  index("idx_store_active").on(table.isActive),
]);

export type Store = typeof store.$inferSelect;
export type InsertStore = typeof store.$inferInsert;

// ============================================================================
// 8. PRODUCT (Menu Items)
// ============================================================================
export const product = pgTable("product", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  
  // Names (i18n)
  name: varchar("name", { length: 200 }).notNull(),
  nameZh: varchar("name_zh", { length: 200 }),
  nameRu: varchar("name_ru", { length: 200 }),
  
  // Descriptions (i18n)
  description: text("description"),
  descriptionZh: text("description_zh"),
  descriptionRu: text("description_ru"),
  
  // Pricing
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  
  // Category
  categoryId: integer("category_id"),
  
  // Media
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Default Options (per-product, not global)
  defaultTemperature: varchar("default_temperature", { length: 20 }),
  defaultIceLevel: varchar("default_ice_level", { length: 20 }),
  defaultSugarLevel: varchar("default_sugar_level", { length: 20 }),
  
  // Detail Page Content
  detailContent: json("detail_content").$type<{
    ingredients?: string[];
    nutritionFacts?: Record<string, string>;
    allergens?: string[];
  }>(),
  
  // Flags
  isActive: boolean("is_active").notNull().default(true),
  isSpecialPrice: boolean("is_special_price").notNull().default(false),
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  
  // IIKO Integration
  iikoProductId: varchar("iiko_product_id", { length: 100 }),
  iikoLastSyncAt: timestamp("iiko_last_sync_at", { withTimezone: true }),
  
  // Sort
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_product_category").on(table.categoryId),
  index("idx_product_active").on(table.isActive),
  index("idx_product_iiko").on(table.iikoProductId),
]);

export type Product = typeof product.$inferSelect;
export type InsertProduct = typeof product.$inferInsert;

// ============================================================================
// 9. OPTION_GROUP (Temperature, Ice, Sugar, Toppings)
// ============================================================================
export const optionGroup = pgTable("option_group", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(), // TEMPERATURE, ICE, SUGAR, TOPPING
  
  // Names (i18n)
  name: varchar("name", { length: 50 }).notNull(),
  nameZh: varchar("name_zh", { length: 50 }),
  nameRu: varchar("name_ru", { length: 50 }),
  
  // Business Rules
  groupType: varchar("group_type", { length: 20 }).notNull(), // TEMPERATURE, ICE, SUGAR, TOPPING
  isRequired: boolean("is_required").notNull().default(false),
  selectionType: varchar("selection_type", { length: 10 }).notNull().default("single"), // single, multi
  
  // Sort
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Business rule: TEMPERATURE/ICE/SUGAR must be required+single, TOPPING must be multi
  check("option_group_business_rule", sql`
    (group_type IN ('TEMPERATURE', 'ICE', 'SUGAR') AND is_required = true AND selection_type = 'single')
    OR
    (group_type = 'TOPPING' AND selection_type = 'multi')
  `),
]);

export type OptionGroup = typeof optionGroup.$inferSelect;
export type InsertOptionGroup = typeof optionGroup.$inferInsert;

// ============================================================================
// 10. OPTION_ITEM (Specific Options within Groups)
// ============================================================================
export const optionItem = pgTable("option_item", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => optionGroup.id),
  
  // Code (e.g., HOT, COLD, NO_ICE, LESS_ICE, NORMAL_ICE)
  code: varchar("code", { length: 30 }).notNull(),
  
  // Names (i18n)
  name: varchar("name", { length: 50 }).notNull(),
  nameZh: varchar("name_zh", { length: 50 }),
  nameRu: varchar("name_ru", { length: 50 }),
  
  // Pricing
  priceDelta: numeric("price_delta", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  // Availability
  isAvailable: boolean("is_available").notNull().default(true),
  
  // Sort
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_option_item_group").on(table.groupId),
  // Unique constraint for composite FK reference
  uniqueIndex("idx_option_item_group_id").on(table.groupId, table.id),
]);

export type OptionItem = typeof optionItem.$inferSelect;
export type InsertOptionItem = typeof optionItem.$inferInsert;

// ============================================================================
// 11. PRODUCT_OPTION_GROUP (Product-specific Option Group Config)
// ============================================================================
export const productOptionGroup = pgTable("product_option_group", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => product.id),
  groupId: integer("group_id").notNull().references(() => optionGroup.id),
  
  // Override group settings for this product
  isRequired: boolean("is_required"),
  selectionType: varchar("selection_type", { length: 10 }),
  
  // Default item for this product (must belong to the same group)
  defaultItemId: integer("default_item_id"),
  
  // Sort
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_product_option_group_unique").on(table.productId, table.groupId),
  index("idx_product_option_group_product").on(table.productId),
  // Note: Composite FK for default_item_id will be added via migration
]);

export type ProductOptionGroup = typeof productOptionGroup.$inferSelect;
export type InsertProductOptionGroup = typeof productOptionGroup.$inferInsert;

// ============================================================================
// 12. PRODUCT_OPTION_ITEM (Product-specific Option Item Override)
// ============================================================================
export const productOptionItem = pgTable("product_option_item", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => product.id),
  itemId: integer("item_id").notNull().references(() => optionItem.id),
  
  // Override item settings for this product
  priceDeltaOverride: numeric("price_delta_override", { precision: 12, scale: 2 }),
  isAvailableOverride: boolean("is_available_override"),
  isDefault: boolean("is_default").notNull().default(false),
  
  // Sort
  sortOrder: integer("sort_order").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_product_option_item_unique").on(table.productId, table.itemId),
  index("idx_product_option_item_product").on(table.productId),
]);

export type ProductOptionItem = typeof productOptionItem.$inferSelect;
export type InsertProductOptionItem = typeof productOptionItem.$inferInsert;

// ============================================================================
// 13. STORE_PRODUCT (Store-specific Product Config)
// ============================================================================
export const storeProduct = pgTable("store_product", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => store.id),
  productId: integer("product_id").notNull().references(() => product.id),
  
  // Override
  priceOverride: numeric("price_override", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  
  // Stock
  stockStatus: varchar("stock_status", { length: 20 }).notNull().default("IN_STOCK"), // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  stockQuantity: integer("stock_quantity"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_store_product_unique").on(table.storeId, table.productId),
  index("idx_store_product_store").on(table.storeId),
  index("idx_store_product_product").on(table.productId),
]);

export type StoreProduct = typeof storeProduct.$inferSelect;
export type InsertStoreProduct = typeof storeProduct.$inferInsert;

// ============================================================================
// 14. COUPON_TEMPLATE (Coupon Definitions)
// ============================================================================
export const couponTemplate = pgTable("coupon_template", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  
  // Names (i18n)
  name: varchar("name", { length: 100 }).notNull(),
  nameZh: varchar("name_zh", { length: 100 }),
  nameRu: varchar("name_ru", { length: 100 }),
  description: text("description"),
  
  // Type: SIMPLE_PERCENTAGE, SIMPLE_FIXED, BOGO, THRESHOLD_OFF, BUY_N_GET_M
  type: varchar("type", { length: 30 }).notNull(),
  
  // For SIMPLE_* types only
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }),
  
  // For complex types (BOGO, THRESHOLD_OFF, BUY_N_GET_M)
  ruleJson: json("rule_json").$type<{
    // BOGO: { buyProductIds: number[], getProductIds: number[], getQuantity: number }
    // THRESHOLD_OFF: { thresholds: Array<{ minAmount: number, discountAmount: number }> }
    // BUY_N_GET_M: { buyQuantity: number, getQuantity: number, productIds: number[] }
    [key: string]: any;
  }>(),
  
  // Scope
  scopeType: varchar("scope_type", { length: 20 }).notNull().default("ALL_STORES"), // ALL_STORES, STORES, CATEGORIES, PRODUCTS
  scopeStoreIds: json("scope_store_ids").$type<number[]>(),
  scopeCategoryIds: json("scope_category_ids").$type<number[]>(),
  scopeProductIds: json("scope_product_ids").$type<number[]>(),
  
  // Limits
  minOrderAmount: numeric("min_order_amount", { precision: 12, scale: 2 }),
  maxDiscountAmount: numeric("max_discount_amount", { precision: 12, scale: 2 }),
  maxUsagePerUser: integer("max_usage_per_user"),
  maxTotalUsage: integer("max_total_usage"),
  currentUsageCount: integer("current_usage_count").notNull().default(0),
  
  // Validity
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  
  // Flags
  isActive: boolean("is_active").notNull().default(true),
  stackable: boolean("stackable").notNull().default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_coupon_template_valid").on(table.validFrom, table.validUntil),
  index("idx_coupon_template_active").on(table.isActive),
  // Scope consistency check
  check("coupon_template_scope_consistency", sql`
    (scope_type = 'ALL_STORES' AND scope_store_ids IS NULL AND scope_category_ids IS NULL AND scope_product_ids IS NULL)
    OR (scope_type = 'STORES' AND scope_store_ids IS NOT NULL)
    OR (scope_type = 'CATEGORIES' AND scope_category_ids IS NOT NULL)
    OR (scope_type = 'PRODUCTS' AND scope_product_ids IS NOT NULL)
  `),
  // Rule JSON consistency check
  check("coupon_template_rule_json_consistency", sql`
    (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M') AND rule_json IS NOT NULL)
    OR (type IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND rule_json IS NULL)
  `),
  // Discount value consistency check
  check("coupon_template_discount_value_consistency", sql`
    (type IN ('SIMPLE_PERCENTAGE', 'SIMPLE_FIXED') AND discount_value IS NOT NULL)
    OR (type IN ('BOGO', 'THRESHOLD_OFF', 'BUY_N_GET_M'))
  `),
]);

export type CouponTemplate = typeof couponTemplate.$inferSelect;
export type InsertCouponTemplate = typeof couponTemplate.$inferInsert;

// ============================================================================
// 15. COUPON_INSTANCE (User's Coupons)
// ============================================================================
export const couponInstance = pgTable("coupon_instance", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => couponTemplate.id),
  memberId: integer("member_id").notNull().references(() => member.id),
  
  // Status: UNUSED, USED, EXPIRED, FROZEN, REVOKED
  status: varchar("status", { length: 20 }).notNull().default("UNUSED"),
  
  // Usage tracking
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedOrderId: integer("used_order_id"),
  
  // Source tracking
  sourceType: varchar("source_type", { length: 30 }).notNull(), // SIGNUP, PURCHASE, CAMPAIGN, ADMIN, REFERRAL
  sourceId: varchar("source_id", { length: 100 }),
  
  // Tags for filtering/audit
  tags: json("tags").$type<string[]>(),
  
  // Validity override
  adjustedValidUntil: timestamp("adjusted_valid_until", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_coupon_instance_member").on(table.memberId),
  index("idx_coupon_instance_template").on(table.templateId),
  index("idx_coupon_instance_status").on(table.status),
  // Note: JSON tags field should use GIN index for production, added via raw SQL migration
  // Partial unique index: each order can only use one coupon
  uniqueIndex("idx_coupon_instance_used_order_unique")
    .on(table.usedOrderId)
    .where(sql`used_order_id IS NOT NULL`),
  // State consistency check
  check("coupon_instance_state_consistency", sql`
    (status = 'USED' AND used_at IS NOT NULL AND used_order_id IS NOT NULL)
    OR (status != 'USED' AND used_at IS NULL AND used_order_id IS NULL)
  `),
]);

export type CouponInstance = typeof couponInstance.$inferSelect;
export type InsertCouponInstance = typeof couponInstance.$inferInsert;

// ============================================================================
// 16. COUPON_AUDIT_LOG (Coupon Changes Audit)
// ============================================================================
export const couponAuditLog = pgTable("coupon_audit_log", {
  id: serial("id").primaryKey(),
  couponInstanceId: integer("coupon_instance_id").notNull().references(() => couponInstance.id),
  
  // Action
  action: varchar("action", { length: 30 }).notNull(), // CREATED, USED, EXPIRED, FROZEN, REVOKED, ADJUSTED
  
  // Changes
  oldValue: json("old_value"),
  newValue: json("new_value"),
  
  // Actor
  actorId: integer("actor_id"),
  actorType: varchar("actor_type", { length: 20 }), // SYSTEM, ADMIN, USER
  
  // Reason
  reason: text("reason"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_coupon_audit_log_instance").on(table.couponInstanceId),
  index("idx_coupon_audit_log_action").on(table.action),
]);

// ============================================================================
// 17. CAMPAIGN (Marketing Campaigns) - Must be defined before campaign_code
// ============================================================================
export const campaign = pgTable("campaign", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  
  // Names (i18n)
  name: varchar("name", { length: 100 }).notNull(),
  nameZh: varchar("name_zh", { length: 100 }),
  nameRu: varchar("name_ru", { length: 100 }),
  description: text("description"),
  
  // Type
  type: varchar("type", { length: 30 }).notNull(), // INFLUENCER, PROMOTION, SEASONAL, PARTNERSHIP
  
  // Validity
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"), // DRAFT, ACTIVE, PAUSED, ENDED
  
  // Budget
  budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
  spentAmount: numeric("spent_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_campaign_status").on(table.status),
  index("idx_campaign_dates").on(table.startDate, table.endDate),
]);

export type Campaign = typeof campaign.$inferSelect;
export type InsertCampaign = typeof campaign.$inferInsert;

// ============================================================================
// 18. INFLUENCER (KOL/Affiliate)
// ============================================================================
export const influencer = pgTable("influencer", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  
  // Profile
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  
  // Social
  socialPlatform: varchar("social_platform", { length: 30 }),
  socialHandle: varchar("social_handle", { length: 100 }),
  followerCount: integer("follower_count"),
  
  // Commission
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE, INACTIVE, SUSPENDED
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_influencer_status").on(table.status),
]);

export type Influencer = typeof influencer.$inferSelect;
export type InsertInfluencer = typeof influencer.$inferInsert;

// ============================================================================
// 19. CAMPAIGN_CODE (Influencer Campaign Codes)
// ============================================================================
export const campaignCode = pgTable("campaign_code", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaign.id),
  influencerId: integer("influencer_id").notNull().references(() => influencer.id),
  
  // Code (globally unique, e.g., A1234)
  code: varchar("code", { length: 20 }).notNull().unique(),
  
  // Stats
  scanCount: integer("scan_count").notNull().default(0),
  orderCount: integer("order_count").notNull().default(0),
  totalGmv: numeric("total_gmv", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Each influencer can only have one code per campaign
  uniqueIndex("idx_campaign_code_campaign_influencer").on(table.campaignId, table.influencerId),
  index("idx_campaign_code_campaign").on(table.campaignId),
  index("idx_campaign_code_influencer").on(table.influencerId),
]);

export type CampaignCode = typeof campaignCode.$inferSelect;
export type InsertCampaignCode = typeof campaignCode.$inferInsert;

// ============================================================================
// 20. ORDER (Customer Orders) - Must be defined before order_item and offline_scan_log
// ============================================================================
export const order = pgTable("order", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  
  // Customer
  memberId: integer("member_id").references(() => member.id),
  storeId: integer("store_id").notNull().references(() => store.id),
  
  // Type: DELIVERY, PICKUP
  orderType: varchar("order_type", { length: 20 }).notNull(),
  
  // Prefix: T (Telegram), P (PWA), K (Delivery), M (Pickup)
  orderPrefix: varchar("order_prefix", { length: 5 }).notNull(),
  
  // Status: PENDING, CONFIRMED, PREPARING, READY, DELIVERING, COMPLETED, CANCELLED, VOIDED
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  
  // Amounts
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Points/Coupon (MUTUALLY EXCLUSIVE)
  usedPoints: integer("used_points").notNull().default(0),
  pointsDiscountAmount: numeric("points_discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  couponInstanceId: integer("coupon_instance_id").references(() => couponInstance.id),
  couponDiscountAmount: numeric("coupon_discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  // Points earned (special price items excluded)
  earnedPoints: integer("earned_points").notNull().default(0),
  
  // Delivery
  deliveryAddress: text("delivery_address"),
  deliveryLatitude: numeric("delivery_latitude", { precision: 10, scale: 7 }),
  deliveryLongitude: numeric("delivery_longitude", { precision: 10, scale: 7 }),
  deliveryNote: text("delivery_note"),
  
  // Timing
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  
  // Payment
  paymentMethod: varchar("payment_method", { length: 30 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("PENDING"), // PENDING, HELD, CAPTURED, VOIDED, REFUNDED
  paymentTransactionId: varchar("payment_transaction_id", { length: 100 }),
  
  // IIKO
  iikoOrderId: varchar("iiko_order_id", { length: 100 }),
  iikoSyncStatus: varchar("iiko_sync_status", { length: 20 }), // PENDING, SYNCED, FAILED
  
  // Campaign tracking
  campaignCodeId: integer("campaign_code_id"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_order_member").on(table.memberId),
  index("idx_order_store").on(table.storeId),
  index("idx_order_status").on(table.status),
  index("idx_order_created").on(table.createdAt),
  index("idx_order_payment_status").on(table.paymentStatus),
  // CRITICAL: Points and coupon are mutually exclusive
  check("order_points_coupon_mutual_exclusion", sql`
    NOT (used_points > 0 AND coupon_instance_id IS NOT NULL)
  `),
]);

export type Order = typeof order.$inferSelect;
export type InsertOrder = typeof order.$inferInsert;

// ============================================================================
// 21. ORDER_ITEM (Order Line Items)
// ============================================================================
export const orderItem = pgTable("order_item", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => order.id),
  productId: integer("product_id").notNull().references(() => product.id),
  
  // Snapshot at order time
  productName: varchar("product_name", { length: 200 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  
  // Special price flag (for points calculation)
  isSpecialPrice: boolean("is_special_price").notNull().default(false),
  
  // Options total
  optionsPrice: numeric("options_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_order_item_order").on(table.orderId),
  index("idx_order_item_product").on(table.productId),
]);

export type OrderItem = typeof orderItem.$inferSelect;
export type InsertOrderItem = typeof orderItem.$inferInsert;

// ============================================================================
// 22. ORDER_ITEM_OPTION (Order Item Options Snapshot)
// ============================================================================
export const orderItemOption = pgTable("order_item_option", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull().references(() => orderItem.id),
  
  // Snapshot
  optionGroupCode: varchar("option_group_code", { length: 30 }).notNull(),
  optionGroupName: varchar("option_group_name", { length: 50 }).notNull(),
  optionItemCode: varchar("option_item_code", { length: 30 }).notNull(),
  optionItemName: varchar("option_item_name", { length: 50 }).notNull(),
  priceDelta: numeric("price_delta", { precision: 12, scale: 2 }).notNull().default("0.00"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_order_item_option_item").on(table.orderItemId),
]);

// ============================================================================
// 23. OFFLINE_SCAN_LOG (Offline Code Scans)
// ============================================================================
export const offlineScanLog = pgTable("offline_scan_log", {
  id: serial("id").primaryKey(),
  
  // Idempotency key (UUID, client-generated)
  clientEventId: uuid("client_event_id").notNull().unique(),
  
  campaignCodeId: integer("campaign_code_id").notNull().references(() => campaignCode.id),
  storeId: integer("store_id").notNull().references(() => store.id),
  cashierId: integer("cashier_id").references(() => users.id),
  
  // Scan source
  scanSource: varchar("scan_source", { length: 20 }).notNull(), // POS, CASHIER_APP, ADMIN, QR
  
  // Order association (may be null at scan time)
  orderId: integer("order_id").references(() => order.id),
  orderAmount: numeric("order_amount", { precision: 12, scale: 2 }),
  
  // Scan time
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  
  // Match status
  matched: boolean("matched").notNull().default(false),
  matchedAt: timestamp("matched_at", { withTimezone: true }),
  matchMethod: varchar("match_method", { length: 20 }), // AUTO, MANUAL, IIKO
  
  // Duplicate tracking (same client_event_id increments dup_count)
  dupCount: integer("dup_count").notNull().default(0),
  lastDupAt: timestamp("last_dup_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_offline_scan_log_code").on(table.campaignCodeId),
  index("idx_offline_scan_log_store").on(table.storeId),
  index("idx_offline_scan_log_order").on(table.orderId),
  index("idx_offline_scan_log_matched").on(table.matched, table.scannedAt),
  index("idx_offline_scan_log_source").on(table.scanSource),
  index("idx_offline_scan_log_match_method").on(table.matchMethod),
  // Business unique key: one scan per campaign_code per order
  uniqueIndex("idx_offline_scan_log_code_order_unique")
    .on(table.campaignCodeId, table.orderId)
    .where(sql`order_id IS NOT NULL`),
  // Scan source validation
  check("offline_scan_log_source_check", sql`
    scan_source IN ('POS', 'CASHIER_APP', 'ADMIN', 'QR')
  `),
]);

export type OfflineScanLog = typeof offlineScanLog.$inferSelect;
export type InsertOfflineScanLog = typeof offlineScanLog.$inferInsert;

// ============================================================================
// 24. SPECIAL_PRICE_REQUEST (Price Approval Workflow)
// ============================================================================
export const specialPriceRequest = pgTable("special_price_request", {
  id: serial("id").primaryKey(),
  
  // Target
  storeId: integer("store_id").notNull().references(() => store.id),
  productId: integer("product_id").notNull().references(() => product.id),
  
  // Price
  originalPrice: numeric("original_price", { precision: 12, scale: 2 }).notNull(),
  requestedPrice: numeric("requested_price", { precision: 12, scale: 2 }).notNull(),
  
  // Validity
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  
  // Status: DRAFT, PENDING, APPROVED, REJECTED, ACTIVE, ENDED, CANCELLED
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"),
  
  // Requester
  requesterId: integer("requester_id").notNull().references(() => users.id),
  requestReason: text("request_reason"),
  
  // Approver
  approverId: integer("approver_id").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  
  // Activation
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_special_price_request_store").on(table.storeId),
  index("idx_special_price_request_product").on(table.productId),
  index("idx_special_price_request_status").on(table.status),
]);

// ============================================================================
// 25. SPECIAL_PRICE_AUDIT_LOG (Price Approval Audit)
// ============================================================================
export const specialPriceAuditLog = pgTable("special_price_audit_log", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => specialPriceRequest.id),
  
  // Action
  action: varchar("action", { length: 30 }).notNull(), // CREATED, SUBMITTED, APPROVED, REJECTED, ACTIVATED, ENDED, CANCELLED
  
  // Actor
  actorId: integer("actor_id").notNull().references(() => users.id),
  
  // Changes
  oldStatus: varchar("old_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }).notNull(),
  
  // Reason
  reason: text("reason"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_special_price_audit_log_request").on(table.requestId),
]);

// ============================================================================
// 26. IIKO_SYNC_JOB (IIKO Sync Queue)
// ============================================================================
export const iikoSyncJob = pgTable("iiko_sync_job", {
  id: serial("id").primaryKey(),
  
  // Resource
  resourceType: varchar("resource_type", { length: 30 }).notNull(), // PRODUCT, ORDER, STOCK
  resourceId: varchar("resource_id", { length: 100 }).notNull(),
  
  // Action
  action: varchar("action", { length: 20 }).notNull(), // PUSH, PULL
  
  // Status: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  
  // Retry
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  
  // Timing
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  
  // Error
  lastError: text("last_error"),
  
  // Priority
  priority: integer("priority").notNull().default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_iiko_sync_job_status").on(table.status),
  index("idx_iiko_sync_job_resource").on(table.resourceType, table.resourceId),
  index("idx_iiko_sync_job_retry").on(table.nextRetryAt),
  index("idx_iiko_sync_job_priority").on(table.priority),
  // Conflict protection: only one RUNNING job per resource at a time
  uniqueIndex("idx_iiko_sync_job_running_unique")
    .on(table.resourceType, table.resourceId)
    .where(sql`status = 'RUNNING'`),
]);

export type IikoSyncJob = typeof iikoSyncJob.$inferSelect;
export type InsertIikoSyncJob = typeof iikoSyncJob.$inferInsert;

// ============================================================================
// 27. IIKO_SYNC_LOG (IIKO Sync Audit Log)
// ============================================================================
export const iikoSyncLog = pgTable("iiko_sync_log", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => iikoSyncJob.id),
  
  // Attempt
  attemptNumber: integer("attempt_number").notNull(),
  
  // Request/Response (sanitized, max 5000 chars)
  requestSummary: text("request_summary"),
  responseSummary: text("response_summary"),
  
  // Status
  success: boolean("success").notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  
  // Timing
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  durationMs: integer("duration_ms"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_iiko_sync_log_job").on(table.jobId),
  // Unique: one log per job per attempt
  uniqueIndex("idx_iiko_sync_log_job_attempt_unique").on(table.jobId, table.attemptNumber),
]);

export type IikoSyncLog = typeof iikoSyncLog.$inferSelect;
export type InsertIikoSyncLog = typeof iikoSyncLog.$inferInsert;

// ============================================================================
// 28. PRODUCT_REVIEW (User Reviews)
// ============================================================================
export const productReview = pgTable("product_review", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => product.id),
  memberId: integer("member_id").notNull().references(() => member.id),
  orderId: integer("order_id").references(() => order.id),
  
  // Rating
  rating: integer("rating").notNull(), // 1-5
  
  // Content
  content: text("content"),
  
  // Media
  imageUrls: json("image_urls").$type<string[]>(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING, APPROVED, REJECTED, HIDDEN
  
  // Engagement
  likeCount: integer("like_count").notNull().default(0),
  
  // Admin
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_product_review_product").on(table.productId),
  index("idx_product_review_member").on(table.memberId),
  index("idx_product_review_status").on(table.status),
  // Rating range check
  check("product_review_rating_check", sql`rating >= 1 AND rating <= 5`),
]);

// ============================================================================
// 29. REVIEW_LIKE (Review Likes)
// ============================================================================
export const reviewLike = pgTable("review_like", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => productReview.id),
  memberId: integer("member_id").notNull().references(() => member.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_review_like_unique").on(table.reviewId, table.memberId),
]);
