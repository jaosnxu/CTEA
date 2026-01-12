/**
 * CHUTEA 用户表 Schema
 *
 * 核心功能：
 * - 用户基本信息
 * - 会员等级系统（regular/silver/gold/black）
 * - 达人（Partner）系统
 * - 邀请码机制
 */

import {
  pgTable,
  serial,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    name: varchar("name", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),

    // ===== 会员等级 =====
    membershipLevel: varchar("membership_level", { length: 50 })
      .notNull()
      .default("regular"),
    totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default(
      "0"
    ),
    pointsBalance: integer("points_balance").default(0),

    // ===== 达人信息 =====
    isPartner: boolean("is_partner").default(false),
    partnerCode: varchar("partner_code", { length: 50 }).unique(),
    partnerLevel: varchar("partner_level", { length: 50 }), // bronze/silver/gold/platinum
    totalCommission: decimal("total_commission", {
      precision: 10,
      scale: 2,
    }).default("0"),

    // ===== 邀请信息 =====
    invitedBy: integer("invited_by").references((): any => users.id),
    inviteCode: varchar("invite_code", { length: 50 }).unique(),

    // ===== 状态 =====
    isActive: boolean("is_active").default(true),

    // ===== 时间戳 =====
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  table => ({
    // 索引：手机号（用于登录）
    phoneIdx: index("idx_users_phone").on(table.phone),

    // 索引：达人代码（用于推广链接）
    partnerCodeIdx: index("idx_users_partner_code").on(table.partnerCode),

    // 索引：邀请码（用于邀请链接）
    inviteCodeIdx: index("idx_users_invite_code").on(table.inviteCode),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * 会员等级枚举
 */
export const MembershipLevel = {
  REGULAR: "regular",
  SILVER: "silver",
  GOLD: "gold",
  BLACK: "black",
} as const;

/**
 * 达人等级枚举
 */
export const PartnerLevel = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
} as const;
