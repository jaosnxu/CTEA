/**
 * CHUTEA 门店表 Schema
 *
 * 核心功能：
 * - 支持 200 家门店的多时区管理
 * - iiko 集成（external_id + organization_id）
 * - IANA 时区配置（Europe/Moscow, Asia/Vladivostok 等）
 * - 管理软件同步状态追踪
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  time,
  index,
} from "drizzle-orm/pg-core";

export const stores = pgTable(
  "stores",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    phone: varchar("phone", { length: 50 }),

    // ===== iiko 集成字段 =====
    iikoExternalId: varchar("iiko_external_id", { length: 255 })
      .notNull()
      .unique(),
    iikoOrganizationId: varchar("iiko_organization_id", {
      length: 255,
    }).notNull(),

    // ===== 时区字段（IANA 时区 ID）=====
    // 示例：Europe/Moscow (UTC+3), Asia/Vladivostok (UTC+10)
    storeTimezone: varchar("store_timezone", { length: 100 })
      .notNull()
      .default("Europe/Moscow"),
    utcOffset: integer("utc_offset").notNull().default(3), // 小时偏移量

    // ===== 营业时间 =====
    openingTime: time("opening_time"),
    closingTime: time("closing_time"),
    is24Hours: boolean("is_24_hours").default(false),

    // ===== 状态 =====
    isActive: boolean("is_active").default(true),
    managementSyncStatus: varchar("management_sync_status", {
      length: 50,
    }).default("pending"),

    // ===== 时间戳 =====
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  table => ({
    // 索引：iiko 外部 ID（用于快速查找门店）
    iikoExternalIdIdx: index("idx_stores_iiko_external_id").on(
      table.iikoExternalId
    ),
    // 索引：时区（用于批量查询同一时区的门店）
    timezoneIdx: index("idx_stores_timezone").on(table.storeTimezone),
  })
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
