/**
 * CHUTEA tRPC Router - Health Check & System Connectivity
 *
 * 系统健康检查模块
 * - 全链路连通性验证
 * - 数据库实时查询
 * - 系统配置动态读取
 */

import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Health Check Router
 * 公开接口，用于验证系统连通性
 */
export const healthRouter = router({
  /**
   * 基础健康检查
   * GET /api/v1/health-check
   */
  check: publicProcedure.query(async ({ ctx }) => {
    const startTime = Date.now();

    try {
      // 1. 数据库连通性检查
      const dbCheck = await ctx.prisma.$queryRaw<
        { now: Date }[]
      >`SELECT NOW() as now`;

      // 2. 查询 system_check 表数据
      const systemChecks = await ctx.prisma.systemCheck.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      // 3. 查询系统配置
      const systemConfigs = await ctx.prisma.systemConfig.findMany({
        where: {
          orgId: null,
          storeId: null,
        },
        take: 10,
      });

      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        database: {
          connected: true,
          serverTime: dbCheck[0]?.now,
        },
        systemChecks: systemChecks.map(check => ({
          key: check.checkKey,
          value: check.checkValue,
          description: check.description,
          lastChecked: check.lastChecked,
          updatedAt: check.updatedAt,
        })),
        systemConfigs: systemConfigs.map(config => ({
          key: config.configKey,
          value: config.configValue,
          type: config.valueType,
          description: config.description,
        })),
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          databaseConfigured: !!process.env.DATABASE_URL,
          jwtConfigured: !!process.env.JWT_SECRET,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        systemChecks: [],
        systemConfigs: [],
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          databaseConfigured: !!process.env.DATABASE_URL,
          jwtConfigured: !!process.env.JWT_SECRET,
        },
      };
    }
  }),

  /**
   * 获取单个系统检查项
   */
  getCheckByKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const check = await ctx.prisma.systemCheck.findUnique({
        where: { checkKey: input.key },
      });

      if (!check) {
        return {
          found: false,
          key: input.key,
          value: null,
          message: `No system check found for key: ${input.key}`,
        };
      }

      return {
        found: true,
        key: check.checkKey,
        value: check.checkValue,
        description: check.description,
        lastChecked: check.lastChecked,
        updatedAt: check.updatedAt,
      };
    }),

  /**
   * 获取系统配置
   */
  getConfig: publicProcedure
    .input(
      z.object({
        key: z.string(),
        orgId: z.string().optional(),
        storeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const config = await ctx.prisma.systemConfig.findFirst({
        where: {
          configKey: input.key,
          orgId: input.orgId || null,
          storeId: input.storeId || null,
        },
      });

      if (!config) {
        return {
          found: false,
          key: input.key,
          value: null,
          message: `No config found for key: ${input.key}`,
        };
      }

      return {
        found: true,
        key: config.configKey,
        value: config.configValue,
        type: config.valueType,
        description: config.description,
        isEditable: config.isEditable,
      };
    }),

  /**
   * 获取所有全局配置
   */
  getAllConfigs: publicProcedure
    .input(
      z
        .object({
          orgId: z.string().optional(),
          storeId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const configs = await ctx.prisma.systemConfig.findMany({
        where: {
          orgId: input?.orgId || null,
          storeId: input?.storeId || null,
        },
        orderBy: { configKey: "asc" },
      });

      return {
        count: configs.length,
        configs: configs.map(config => ({
          key: config.configKey,
          value: config.configValue,
          type: config.valueType,
          description: config.description,
          isEditable: config.isEditable,
          updatedAt: config.updatedAt,
        })),
      };
    }),

  /**
   * 实时数据验证 - 用于演示配置驱动
   * 返回产品、分类、活动等动态数据
   */
  getDynamicData: publicProcedure.query(async ({ ctx }) => {
    const [categories, products, campaigns] = await Promise.all([
      ctx.prisma.categories.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      ctx.prisma.products.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      ctx.prisma.campaigns.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      categories: {
        count: categories.length,
        items: categories,
      },
      products: {
        count: products.length,
        items: products,
      },
      campaigns: {
        count: campaigns.length,
        items: campaigns,
      },
    };
  }),
});
