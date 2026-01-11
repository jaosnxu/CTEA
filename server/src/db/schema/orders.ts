/**
 * CHUTEA 订单表 Schema
 * 
 * 核心功能：
 * - 提货码系统（T+4位线上，X+4位线下）
 * - 营业日逻辑（business_date + is_overnight）
 * - 多时区支持（UTC 存储 + 门店时区）
 * - iiko 订单集成
 * - 核销确认机制（POS 端"确认好餐"）
 * 
 * 🔴 CTO 要求：
 * - 必须对 (business_date, store_id) 建立复合索引
 * - 理由：200 家店同时跑月报时，防止全表扫描导致宕机
 */

import { pgTable, serial, varchar, integer, decimal, boolean, timestamp, date, text, index } from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { users } from './users';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  
  // ===== 提货码（T+4位线上，X+4位线下）=====
  pickupCode: varchar('pickup_code', { length: 10 }).notNull().unique(),
  pickupCodeType: varchar('pickup_code_type', { length: 10 }).notNull(), // 'online' 或 'offline'
  
  // ===== 用户信息 =====
  userId: integer('user_id').notNull().references(() => users.id),
  
  // ===== 门店信息 =====
  storeId: integer('store_id').notNull().references(() => stores.id),
  storeTimezone: varchar('store_timezone', { length: 100 }).notNull(),
  storeUtcOffset: integer('store_utc_offset').notNull(),
  
  // ===== 时间字段（UTC 存储）=====
  createdAtUtc: timestamp('created_at_utc', { withTimezone: true }).defaultNow(),
  businessDate: date('business_date').notNull(), // 营业日（本地日期，YYYY-MM-DD）
  isOvernight: boolean('is_overnight').default(false), // 是否跨天订单（凌晨订单归属前一营业日）
  
  // ===== iiko 集成 =====
  iikoOrderId: varchar('iiko_order_id', { length: 255 }).unique(),
  iikoExternalNumber: varchar('iiko_external_number', { length: 255 }),
  
  // ===== 订单状态 =====
  // pending: 待确认
  // confirmed: 已确认
  // preparing: 制作中
  // ready: 待取餐
  // completed: 已完成
  // cancelled: 已取消
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  
  // ===== 核销信息（POS 端"确认好餐"）=====
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }), // 核销时间
  confirmedBy: varchar('confirmed_by', { length: 255 }), // 收银员 ID
  
  // ===== 订单类型 =====
  orderType: varchar('order_type', { length: 50 }).notNull(), // 'drink' 或 'mall'
  deliveryMethod: varchar('delivery_method', { length: 50 }).notNull(), // 'pickup' 或 'delivery'
  
  // ===== 价格信息（卢布）=====
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  couponDiscount: decimal('coupon_discount', { precision: 10, scale: 2 }).default('0'),
  pointsDiscount: decimal('points_discount', { precision: 10, scale: 2 }).default('0'),
  giftCardAmount: decimal('gift_card_amount', { precision: 10, scale: 2 }).default('0'),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  
  // ===== 支付信息 =====
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  // ===== 备注 =====
  customerNote: text('customer_note'),
  internalNote: text('internal_note'),
  
  // ===== 时间戳 =====
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // 索引：用户 ID（查询用户订单列表）
  userIdIdx: index('idx_orders_user_id').on(table.userId),
  
  // 索引：门店 ID（查询门店订单列表）
  storeIdIdx: index('idx_orders_store_id').on(table.storeId),
  
  // 🔴 CTO 要求：复合索引（business_date, store_id）
  // 理由：200 家店同时跑月报时，防止全表扫描导致宕机
  // 用途：管理软件拉取汇总数据时，快速定位某门店某营业日的所有订单
  businessDateStoreIdx: index('idx_orders_business_date_store').on(table.businessDate, table.storeId),
  
  // 索引：提货码（快速查找订单）
  pickupCodeIdx: index('idx_orders_pickup_code').on(table.pickupCode),
  
  // 索引：订单状态（按状态筛选订单）
  statusIdx: index('idx_orders_status').on(table.status),
  
  // 索引：iiko 订单 ID（iiko 集成查询）
  iikoOrderIdIdx: index('idx_orders_iiko_order_id').on(table.iikoOrderId),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

/**
 * 订单状态枚举
 */
export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/**
 * 订单类型枚举
 */
export const OrderType = {
  DRINK: 'drink',
  MALL: 'mall',
} as const;

/**
 * 配送方式枚举
 */
export const DeliveryMethod = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
} as const;

/**
 * 提货码类型枚举
 */
export const PickupCodeType = {
  ONLINE: 'online',  // T+4位
  OFFLINE: 'offline', // X+4位
} as const;
