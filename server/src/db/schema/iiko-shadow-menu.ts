/**
 * CHUTEA iiko 影子菜单表 Schema
 *
 * 核心功能：
 * - iiko 菜单同步暂存区（禁止直接写入 C 端展示表）
 * - 价格熔断机制（价格波动 > 30% 自动拦截）
 * - 同步状态追踪（pending/approved/rejected）
 *
 * 🔴 CTO 要求：
 * - 必须包含 previous_price 和 variance_percent 字段
 * - variance_percent > 30 时，后端逻辑必须拦截，不允许自动同步到 C 端
 */

import {
  pgTable,
  serial,
  varchar,
  decimal,
  boolean,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";

export const iikoShadowMenu = pgTable(
  "iiko_shadow_menu",
  {
    id: serial("id").primaryKey(),

    // ===== iiko 商品信息 =====
    iikoProductId: varchar("iiko_product_id", { length: 255 })
      .notNull()
      .unique(),
    iikoOrganizationId: varchar("iiko_organization_id", {
      length: 255,
    }).notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),
    productCategory: varchar("product_category", { length: 255 }),

    // ===== 价格信息 =====
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),

    // 🔴 CTO 要求：记录调价前的价格
    previousPrice: decimal("previous_price", { precision: 10, scale: 2 }),

    // 🔴 CTO 要求：自动计算波动百分比
    // 计算公式：variance_percent = ABS((price - previous_price) / previous_price * 100)
    variancePercent: decimal("variance_percent", { precision: 5, scale: 2 }),

    // ===== 价格熔断标志 =====
    // 🔴 当 variance_percent > 30 时，此字段自动设置为 true
    priceAlert: boolean("price_alert").default(false),
    priceAlertReason: text("price_alert_reason"),

    // ===== 商品状态 =====
    isAvailable: boolean("is_available").default(true),
    isHidden: boolean("is_hidden").default(false),

    // ===== 同步状态 =====
    // pending: 等待审核
    // approved: 已审核通过，可同步到 C 端
    // rejected: 已拒绝，不同步到 C 端
    syncStatus: varchar("sync_status", { length: 50 })
      .notNull()
      .default("pending"),
    syncError: text("sync_error"),
    approvedBy: varchar("approved_by", { length: 255 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    // ===== 时间戳 =====
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  table => ({
    // 索引：iiko 商品 ID（用于快速查找）
    iikoProductIdIdx: index("idx_iiko_shadow_menu_product_id").on(
      table.iikoProductId
    ),

    // 索引：同步状态（用于筛选待审核商品）
    syncStatusIdx: index("idx_iiko_shadow_menu_sync_status").on(
      table.syncStatus
    ),

    // 🔴 索引：价格警告（用于快速定位需要人工审核的商品）
    priceAlertIdx: index("idx_iiko_shadow_menu_price_alert").on(
      table.priceAlert
    ),
  })
);

export type IikoShadowMenu = typeof iikoShadowMenu.$inferSelect;
export type NewIikoShadowMenu = typeof iikoShadowMenu.$inferInsert;

/**
 * 同步状态枚举
 */
export const SyncStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

/**
 * 价格熔断阈值（百分比）
 * 🔴 CTO 要求：价格波动超过此阈值时，必须拦截
 */
export const PRICE_VARIANCE_THRESHOLD = 30;

/**
 * 计算价格波动百分比
 * @param currentPrice 当前价格
 * @param previousPrice 上次价格
 * @returns 波动百分比（绝对值）
 */
export function calculateVariancePercent(
  currentPrice: number,
  previousPrice: number | null
): number {
  if (!previousPrice || previousPrice === 0) {
    return 0;
  }

  return Math.abs(((currentPrice - previousPrice) / previousPrice) * 100);
}

/**
 * 检查是否触发价格熔断
 * @param variancePercent 价格波动百分比
 * @returns 是否触发熔断
 */
export function shouldTriggerPriceAlert(variancePercent: number): boolean {
  return variancePercent > PRICE_VARIANCE_THRESHOLD;
}
