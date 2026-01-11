/**
 * 翻译管理表 Schema
 * 
 * 实现【系统负责人中心化模式】：
 * - AI 翻译内容默认 is_published = false，需管理员审核后发布
 * - 支持多语言翻译存储（zh/ru/en）
 * - 记录翻译来源（ai_generated/manual）
 * - 审核状态追踪
 */

import { pgTable, text, boolean, timestamp, uuid, varchar, jsonb, index } from "drizzle-orm/pg-core";

/**
 * 翻译条目表
 * 存储所有需要翻译的文本条目
 */
export const translations = pgTable("translations", {
  // 主键
  id: uuid("id").primaryKey().defaultRandom(),
  
  // 翻译键（唯一标识符，如 "menu.category.drinks"）
  key: varchar("key", { length: 255 }).notNull().unique(),
  
  // 翻译分类（menu/ui/notification/product 等）
  category: varchar("category", { length: 50 }).notNull().default("general"),
  
  // 原文（中文）
  textZh: text("text_zh").notNull(),
  
  // 俄语翻译
  textRu: text("text_ru"),
  
  // 英语翻译
  textEn: text("text_en"),
  
  // 翻译来源：ai_generated | manual | imported
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  
  // AI 翻译置信度（0-100）
  aiConfidence: varchar("ai_confidence", { length: 10 }),
  
  // 审核状态：是否已发布（核心字段）
  isPublished: boolean("is_published").notNull().default(false),
  
  // 审核人 ID（关联 users 表）
  publishedBy: uuid("published_by"),
  
  // 发布时间
  publishedAt: timestamp("published_at"),
  
  // 审核备注
  reviewNote: text("review_note"),
  
  // 上下文说明（帮助翻译理解语境）
  context: text("context"),
  
  // 关联实体（如产品ID、分类ID等）
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  
  // 元数据（存储额外信息）
  metadata: jsonb("metadata"),
  
  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // 索引优化查询
  categoryIdx: index("translations_category_idx").on(table.category),
  isPublishedIdx: index("translations_is_published_idx").on(table.isPublished),
  entityIdx: index("translations_entity_idx").on(table.entityType, table.entityId),
}));

/**
 * 翻译审核历史表
 * 记录每次审核操作
 */
export const translationAuditLog = pgTable("translation_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // 关联翻译条目
  translationId: uuid("translation_id").notNull().references(() => translations.id),
  
  // 操作类型：created | updated | published | unpublished | rejected
  action: varchar("action", { length: 20 }).notNull(),
  
  // 操作人 ID
  operatorId: uuid("operator_id").notNull(),
  
  // 操作人角色
  operatorRole: varchar("operator_role", { length: 20 }).notNull(),
  
  // 变更前的值
  previousValue: jsonb("previous_value"),
  
  // 变更后的值
  newValue: jsonb("new_value"),
  
  // 操作备注
  note: text("note"),
  
  // IP 地址
  ipAddress: varchar("ip_address", { length: 45 }),
  
  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  translationIdIdx: index("audit_translation_id_idx").on(table.translationId),
  operatorIdIdx: index("audit_operator_id_idx").on(table.operatorId),
}));

/**
 * 翻译分类枚举
 */
export const TRANSLATION_CATEGORIES = {
  MENU: "menu",           // 菜单相关
  PRODUCT: "product",     // 产品名称/描述
  UI: "ui",               // 界面文本
  NOTIFICATION: "notification", // 通知消息
  EMAIL: "email",         // 邮件模板
  ERROR: "error",         // 错误消息
  GENERAL: "general",     // 通用文本
} as const;

/**
 * 翻译来源枚举
 */
export const TRANSLATION_SOURCES = {
  AI_GENERATED: "ai_generated",  // AI 自动翻译
  MANUAL: "manual",              // 人工翻译
  IMPORTED: "imported",          // 批量导入
} as const;

/**
 * 审核操作枚举
 */
export const AUDIT_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  REJECTED: "rejected",
} as const;

// 类型导出
export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;
export type TranslationAuditLog = typeof translationAuditLog.$inferSelect;
export type NewTranslationAuditLog = typeof translationAuditLog.$inferInsert;
