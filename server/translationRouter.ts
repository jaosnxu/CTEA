/**
 * 翻译管理 API 路由
 * 
 * 实现【系统负责人中心化模式】：
 * - 仅管理员可以发布/取消发布翻译
 * - 普通用户只能读取已发布的翻译
 * - 完整的审核日志记录
 */

import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { translations, translationAuditLog } from "../drizzle/schema";
import { 
  translateText, 
  translateBatch, 
  checkDeepSeekAvailability,
  TEA_TERMINOLOGY 
} from "./src/services/deepseek-translation";

/**
 * 翻译分类枚举
 */
const TRANSLATION_CATEGORIES = {
  MENU: "menu",
  PRODUCT: "product",
  UI: "ui",
  NOTIFICATION: "notification",
  EMAIL: "email",
  ERROR: "error",
  GENERAL: "general",
} as const;

/**
 * 翻译来源枚举
 */
const TRANSLATION_SOURCES = {
  AI_GENERATED: "ai_generated",
  MANUAL: "manual",
  IMPORTED: "imported",
} as const;

/**
 * 审核操作枚举
 */
const AUDIT_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  REJECTED: "rejected",
} as const;

/**
 * 记录审核日志
 */
async function logAuditAction(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  params: {
    translationId: number;
    action: string;
    operatorId: number;
    operatorRole: string;
    previousValue?: object;
    newValue?: object;
    note?: string;
    ipAddress?: string;
  }
) {
  await db.insert(translationAuditLog).values({
    translationId: params.translationId,
    action: params.action,
    operatorId: params.operatorId,
    operatorRole: params.operatorRole,
    previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
    newValue: params.newValue ? JSON.stringify(params.newValue) : null,
    note: params.note ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}

export const translationRouter = router({
  /**
   * 获取已发布的翻译（公开接口）
   * 前端加载翻译字典时调用
   */
  getPublished: publicProcedure
    .input(z.object({
      language: z.enum(["zh", "ru", "en"]).optional(),
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { translations: {} };
      }

      const results = await db
        .select()
        .from(translations)
        .where(eq(translations.isPublished, "true"));

      // 转换为前端使用的字典格式
      const dict: Record<string, { zh: string; ru: string; en: string }> = {};
      for (const row of results) {
        dict[row.key] = {
          zh: row.textZh,
          ru: row.textRu || row.textZh,
          en: row.textEn || row.textZh,
        };
      }

      return { translations: dict };
    }),

  /**
   * 获取待审核翻译列表（仅管理员）
   */
  getPending: adminProcedure
    .input(z.object({
      category: z.string().optional(),
      source: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { items: [], total: 0 };
      }

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const offset = (page - 1) * pageSize;

      // 查询待审核翻译
      const items = await db
        .select()
        .from(translations)
        .where(eq(translations.isPublished, "false"))
        .orderBy(desc(translations.createdAt))
        .limit(pageSize)
        .offset(offset);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(translations)
        .where(eq(translations.isPublished, "false"));

      return {
        items,
        total: countResult[0]?.count || 0,
        page,
        pageSize,
      };
    }),

  /**
   * 获取所有翻译列表（仅管理员）
   */
  getAll: adminProcedure
    .input(z.object({
      category: z.string().optional(),
      isPublished: z.boolean().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { items: [], total: 0 };
      }

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const offset = (page - 1) * pageSize;

      // 构建查询条件
      const conditions = [];
      if (input?.isPublished !== undefined) {
        conditions.push(eq(translations.isPublished, input.isPublished ? "true" : "false"));
      }
      if (input?.category) {
        conditions.push(eq(translations.category, input.category));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(translations)
        .where(whereClause)
        .orderBy(desc(translations.updatedAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(translations)
        .where(whereClause);

      return {
        items,
        total: countResult[0]?.count || 0,
        page,
        pageSize,
      };
    }),

  /**
   * 创建翻译条目（仅管理员）
   */
  create: adminProcedure
    .input(z.object({
      key: z.string().min(1).max(255),
      category: z.string().default("general"),
      textZh: z.string().min(1),
      textRu: z.string().optional(),
      textEn: z.string().optional(),
      source: z.enum(["ai_generated", "manual", "imported"]).default("manual"),
      aiConfidence: z.number().min(0).max(100).optional(),
      context: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // AI 翻译默认不发布
      const isPublished = input.source === "ai_generated" ? "false" : "false";

      const result = await db.insert(translations).values({
        key: input.key,
        category: input.category,
        textZh: input.textZh,
        textRu: input.textRu ?? null,
        textEn: input.textEn ?? null,
        source: input.source,
        aiConfidence: input.aiConfidence ?? null,
        isPublished,
        context: input.context ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });

      const insertId = (result as any)[0]?.insertId;

      // 记录审核日志
      if (insertId) {
        await logAuditAction(db, {
          translationId: insertId,
          action: AUDIT_ACTIONS.CREATED,
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          newValue: input,
        });
      }

      return { success: true, id: insertId };
    }),

  /**
   * 更新翻译条目（仅管理员）
   */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      textZh: z.string().optional(),
      textRu: z.string().optional(),
      textEn: z.string().optional(),
      category: z.string().optional(),
      context: z.string().optional(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 获取原值
      const [original] = await db
        .select()
        .from(translations)
        .where(eq(translations.id, input.id))
        .limit(1);

      if (!original) {
        throw new Error("Translation not found");
      }

      // 更新
      const updateData: Record<string, unknown> = {};
      if (input.textZh !== undefined) updateData.textZh = input.textZh;
      if (input.textRu !== undefined) updateData.textRu = input.textRu;
      if (input.textEn !== undefined) updateData.textEn = input.textEn;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.context !== undefined) updateData.context = input.context;
      if (input.reviewNote !== undefined) updateData.reviewNote = input.reviewNote;

      await db
        .update(translations)
        .set(updateData)
        .where(eq(translations.id, input.id));

      // 记录审核日志
      await logAuditAction(db, {
        translationId: input.id,
        action: AUDIT_ACTIONS.UPDATED,
        operatorId: ctx.user.id,
        operatorRole: ctx.user.role,
        previousValue: original,
        newValue: { ...original, ...updateData },
      });

      return { success: true };
    }),

  /**
   * 发布翻译（仅管理员）
   * 核心审核功能
   */
  publish: adminProcedure
    .input(z.object({
      id: z.number(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 获取原值
      const [original] = await db
        .select()
        .from(translations)
        .where(eq(translations.id, input.id))
        .limit(1);

      if (!original) {
        throw new Error("Translation not found");
      }

      // 更新发布状态
      await db
        .update(translations)
        .set({
          isPublished: "true",
          publishedBy: ctx.user.id,
          publishedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(translations.id, input.id));

      // 记录审核日志
      await logAuditAction(db, {
        translationId: input.id,
        action: AUDIT_ACTIONS.PUBLISHED,
        operatorId: ctx.user.id,
        operatorRole: ctx.user.role,
        previousValue: { isPublished: original.isPublished },
        newValue: { isPublished: "true" },
        note: input.reviewNote,
      });

      return { success: true };
    }),

  /**
   * 批量发布翻译（仅管理员）
   */
  publishBatch: adminProcedure
    .input(z.object({
      ids: z.array(z.number()),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      for (const id of input.ids) {
        await db
          .update(translations)
          .set({
            isPublished: "true",
            publishedBy: ctx.user.id,
            publishedAt: new Date(),
            reviewNote: input.reviewNote ?? null,
          })
          .where(eq(translations.id, id));

        await logAuditAction(db, {
          translationId: id,
          action: AUDIT_ACTIONS.PUBLISHED,
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          newValue: { isPublished: "true" },
          note: input.reviewNote,
        });
      }

      return { success: true, count: input.ids.length };
    }),

  /**
   * 取消发布翻译（仅管理员）
   */
  unpublish: adminProcedure
    .input(z.object({
      id: z.number(),
      reviewNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(translations)
        .set({
          isPublished: "false",
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(translations.id, input.id));

      await logAuditAction(db, {
        translationId: input.id,
        action: AUDIT_ACTIONS.UNPUBLISHED,
        operatorId: ctx.user.id,
        operatorRole: ctx.user.role,
        newValue: { isPublished: "false" },
        note: input.reviewNote,
      });

      return { success: true };
    }),

  /**
   * 拒绝翻译（仅管理员）
   */
  reject: adminProcedure
    .input(z.object({
      id: z.number(),
      reviewNote: z.string().min(1, "拒绝原因不能为空"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(translations)
        .set({
          reviewNote: input.reviewNote,
        })
        .where(eq(translations.id, input.id));

      await logAuditAction(db, {
        translationId: input.id,
        action: AUDIT_ACTIONS.REJECTED,
        operatorId: ctx.user.id,
        operatorRole: ctx.user.role,
        note: input.reviewNote,
      });

      return { success: true };
    }),

  /**
   * 获取审核日志（仅管理员）
   */
  getAuditLog: adminProcedure
    .input(z.object({
      translationId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { items: [], total: 0 };
      }

      const page = input?.page || 1;
      const pageSize = input?.pageSize || 50;
      const offset = (page - 1) * pageSize;

      const whereClause = input?.translationId
        ? eq(translationAuditLog.translationId, input.translationId)
        : undefined;

      const items = await db
        .select()
        .from(translationAuditLog)
        .where(whereClause)
        .orderBy(desc(translationAuditLog.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(translationAuditLog)
        .where(whereClause);

      return {
        items,
        total: countResult[0]?.count || 0,
        page,
        pageSize,
      };
    }),

  /**
   * 获取翻译统计（仅管理员）
   */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        total: 0,
        published: 0,
        pending: 0,
        aiGenerated: 0,
        manual: 0,
      };
    }

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(translations);

    const [publishedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .where(eq(translations.isPublished, "true"));

    const [aiResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(translations)
      .where(eq(translations.source, "ai_generated"));

    return {
      total: totalResult?.count || 0,
      published: publishedResult?.count || 0,
      pending: (totalResult?.count || 0) - (publishedResult?.count || 0),
      aiGenerated: aiResult?.count || 0,
      manual: (totalResult?.count || 0) - (aiResult?.count || 0),
    };
  }),

  // ==================== DeepSeek AI 翻译引擎 ====================

  /**
   * 检查 DeepSeek API 可用性（仅管理员）
   */
  checkAIStatus: adminProcedure.query(async () => {
    const result = await checkDeepSeekAvailability();
    return result;
  }),

  /**
   * AI 翻译单条文本（仅管理员）
   * 输入中文，返回俄语和英语翻译
   */
  aiTranslate: adminProcedure
    .input(z.object({
      textZh: z.string().min(1, "中文原文不能为空"),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await translateText(input.textZh, input.context);
      return result;
    }),

  /**
   * AI 批量翻译（仅管理员）
   */
  aiTranslateBatch: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        key: z.string(),
        textZh: z.string(),
        context: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const result = await translateBatch(input.items);
      return result;
    }),

  /**
   * 创建翻译并自动 AI 翻译（仅管理员）
   * 输入中文，自动调用 DeepSeek 翻译后保存到数据库
   */
  createWithAI: adminProcedure
    .input(z.object({
      key: z.string().min(1).max(255),
      category: z.string().default("general"),
      textZh: z.string().min(1),
      context: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 调用 DeepSeek AI 翻译
      const translationResult = await translateText(input.textZh, input.context);

      if (!translationResult.success) {
        throw new Error(`AI 翻译失败: ${translationResult.error}`);
      }

      // 保存到数据库（AI 翻译默认不发布）
      const result = await db.insert(translations).values({
        key: input.key,
        category: input.category,
        textZh: input.textZh,
        textRu: translationResult.textRu ?? null,
        textEn: translationResult.textEn ?? null,
        source: "ai_generated",
        aiConfidence: translationResult.confidence ?? null,
        isPublished: "false", // AI 翻译默认不发布，需管理员审核
        context: input.context ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });

      const insertId = (result as any)[0]?.insertId;

      // 记录审核日志
      if (insertId) {
        await logAuditAction(db, {
          translationId: insertId,
          action: AUDIT_ACTIONS.CREATED,
          operatorId: ctx.user.id,
          operatorRole: ctx.user.role,
          newValue: {
            ...input,
            textRu: translationResult.textRu,
            textEn: translationResult.textEn,
            source: "ai_generated",
            aiConfidence: translationResult.confidence,
          },
          note: "AI 自动翻译",
        });
      }

      return {
        success: true,
        id: insertId,
        textRu: translationResult.textRu,
        textEn: translationResult.textEn,
        confidence: translationResult.confidence,
      };
    }),

  /**
   * 重新 AI 翻译已有条目（仅管理员）
   */
  retranslate: adminProcedure
    .input(z.object({
      id: z.number(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 获取原条目
      const [original] = await db
        .select()
        .from(translations)
        .where(eq(translations.id, input.id))
        .limit(1);

      if (!original) {
        throw new Error("翻译条目不存在");
      }

      // 重新翻译
      const translationResult = await translateText(
        original.textZh,
        input.context || original.context || undefined
      );

      if (!translationResult.success) {
        throw new Error(`AI 翻译失败: ${translationResult.error}`);
      }

      // 更新数据库
      await db
        .update(translations)
        .set({
          textRu: translationResult.textRu ?? null,
          textEn: translationResult.textEn ?? null,
          source: "ai_generated",
          aiConfidence: translationResult.confidence ?? null,
          isPublished: "false", // 重新翻译后需重新审核
          context: input.context ?? original.context,
        })
        .where(eq(translations.id, input.id));

      // 记录审核日志
      await logAuditAction(db, {
        translationId: input.id,
        action: AUDIT_ACTIONS.UPDATED,
        operatorId: ctx.user.id,
        operatorRole: ctx.user.role,
        previousValue: {
          textRu: original.textRu,
          textEn: original.textEn,
        },
        newValue: {
          textRu: translationResult.textRu,
          textEn: translationResult.textEn,
          aiConfidence: translationResult.confidence,
        },
        note: "AI 重新翻译",
      });

      return {
        success: true,
        textRu: translationResult.textRu,
        textEn: translationResult.textEn,
        confidence: translationResult.confidence,
      };
    }),

  /**
   * 获取茶饮专业术语表（公开接口）
   */
  getTerminology: publicProcedure.query(() => {
    return TEA_TERMINOLOGY;
  }),
});
