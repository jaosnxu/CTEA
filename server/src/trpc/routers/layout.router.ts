/**
 * CHUTEA tRPC Router - Layout Management
 *
 * SDUI 布局配置管理模块
 * - 布局配置列表
 * - 获取指定页面布局
 * - 保存/版本化布局配置
 * - 版本历史管理
 */

import { z } from "zod";
import { router, adminProcedure } from "../../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { layoutConfigs } from "../../../../drizzle/schema";
import {
  DEFAULT_HOME_LAYOUT,
  DEFAULT_ORDER_LAYOUT,
  DEFAULT_MALL_LAYOUT,
  PageType,
} from "@shared/types/layout";
import { getDb } from "../../../db";

/**
 * 获取默认布局配置
 */
function getDefaultLayout(page: PageType) {
  switch (page) {
    case "home":
      return DEFAULT_HOME_LAYOUT;
    case "order":
      return DEFAULT_ORDER_LAYOUT;
    case "mall":
      return DEFAULT_MALL_LAYOUT;
    default:
      return null;
  }
}

/**
 * Layout Router
 */
export const layoutRouter = router({
  /**
   * 获取所有布局配置列表
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    // 获取每个页面的最新激活配置
    const configs = await db
      .select()
      .from(layoutConfigs)
      .where(eq(layoutConfigs.isActive, true))
      .orderBy(desc(layoutConfigs.updatedAt));

    return {
      layouts: configs,
    };
  }),

  /**
   * 获取指定页面的布局配置
   */
  get: adminProcedure
    .input(
      z.object({
        page: z.enum(["home", "order", "mall"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 获取当前激活的配置
      const [activeConfig] = await db
        .select()
        .from(layoutConfigs)
        .where(
          and(
            eq(layoutConfigs.page, input.page),
            eq(layoutConfigs.isActive, true)
          )
        )
        .limit(1);

      // 如果没有配置，返回默认配置
      if (!activeConfig) {
        const defaultLayout = getDefaultLayout(input.page);
        if (!defaultLayout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No layout found for page: ${input.page}`,
          });
        }
        return {
          layout: {
            id: 0,
            page: input.page,
            config: defaultLayout,
            version: 0,
            isActive: true,
            createdBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }

      return {
        layout: activeConfig,
      };
    }),

  /**
   * 获取指定页面的版本历史
   */
  history: adminProcedure
    .input(
      z.object({
        page: z.enum(["home", "order", "mall"]),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const versions = await db
        .select()
        .from(layoutConfigs)
        .where(eq(layoutConfigs.page, input.page))
        .orderBy(desc(layoutConfigs.version))
        .limit(input.limit);

      return {
        versions,
      };
    }),

  /**
   * 保存/更新布局配置
   */
  save: adminProcedure
    .input(
      z.object({
        page: z.enum(["home", "order", "mall"]),
        config: z.any(), // PageLayoutConfig JSON
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 获取当前最大版本号
      const [latestVersion] = await db
        .select()
        .from(layoutConfigs)
        .where(eq(layoutConfigs.page, input.page))
        .orderBy(desc(layoutConfigs.version))
        .limit(1);

      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      // 将所有旧版本设为非激活
      await db
        .update(layoutConfigs)
        .set({ isActive: false })
        .where(eq(layoutConfigs.page, input.page));

      // 插入新版本
      const [newConfig] = await db
        .insert(layoutConfigs)
        .values({
          page: input.page,
          config: input.config,
          version: nextVersion,
          isActive: true,
          createdBy: ctx.user?.name || ctx.user?.openId || "system",
        })
        .$returningId();

      // 获取插入的完整记录
      const [savedConfig] = await db
        .select()
        .from(layoutConfigs)
        .where(eq(layoutConfigs.id, newConfig.id))
        .limit(1);

      return {
        layout: savedConfig,
        message: "Layout saved successfully",
      };
    }),

  /**
   * 还原到指定版本
   */
  restore: adminProcedure
    .input(
      z.object({
        page: z.enum(["home", "order", "mall"]),
        version: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 查找指定版本
      const [targetVersion] = await db
        .select()
        .from(layoutConfigs)
        .where(
          and(
            eq(layoutConfigs.page, input.page),
            eq(layoutConfigs.version, input.version)
          )
        )
        .limit(1);

      if (!targetVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Version ${input.version} not found for page ${input.page}`,
        });
      }

      // 将所有旧版本设为非激活
      await db
        .update(layoutConfigs)
        .set({ isActive: false })
        .where(eq(layoutConfigs.page, input.page));

      // 获取当前最大版本号
      const [latestVersion] = await db
        .select()
        .from(layoutConfigs)
        .where(eq(layoutConfigs.page, input.page))
        .orderBy(desc(layoutConfigs.version))
        .limit(1);

      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      // 创建新版本（基于目标版本的配置）
      const [restoredConfig] = await db
        .insert(layoutConfigs)
        .values({
          page: input.page,
          config: targetVersion.config,
          version: nextVersion,
          isActive: true,
          createdBy: ctx.user?.name || ctx.user?.openId || "system",
        })
        .$returningId();

      // 获取插入的完整记录
      const [savedConfig] = await db
        .select()
        .from(layoutConfigs)
        .where(eq(layoutConfigs.id, restoredConfig.id))
        .limit(1);

      return {
        layout: savedConfig,
        message: `Restored to version ${input.version}`,
      };
    }),
});
