/**
 * BI 数据分析 tRPC 路由
 *
 * 提供 DeepSeek AI 驱动的商业智能分析接口
 */

import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "../../db/prisma";
import {
  DeepSeekBIService,
  testDeepSeekConnection,
} from "../../services/deepseek-bi-service";

const biService = new DeepSeekBIService(prisma);

export const biRouter = router({
  // 测试 DeepSeek 连接
  testConnection: publicProcedure.query(async () => {
    return testDeepSeekConnection();
  }),

  // 销售异常检测
  detectSalesAnomalies: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const dateRange = {
        start: new Date(input.startDate),
        end: new Date(input.endDate),
      };
      return biService.detectSalesAnomalies(input.orgId, dateRange);
    }),

  // 达人 ROI 分析
  analyzeInfluencerROI: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const dateRange = {
        start: new Date(input.startDate),
        end: new Date(input.endDate),
      };
      return biService.analyzeInfluencerROI(input.orgId, dateRange);
    }),

  // 库存预测
  predictInventory: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        forecastDays: z.number().optional().default(7),
      })
    )
    .mutation(async ({ input }) => {
      return biService.predictInventoryNeeds(input.orgId, input.forecastDays);
    }),

  // 自然语言查询 (Text-to-SQL)
  naturalLanguageQuery: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(500),
        orgId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return biService.executeNaturalLanguageQuery(input.question, input.orgId);
    }),

  // 跨组织财务审计
  auditCrossOrg: publicProcedure
    .input(
      z.object({
        orgIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input }) => {
      return biService.auditCrossOrgFinancials(input.orgIds);
    }),

  // 获取 BI 仪表板概览数据
  getDashboardOverview: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 获取基础统计数据
        const [
          totalOrders,
          totalRevenue,
          totalProducts,
          totalInfluencers,
          recentOrders,
        ] = await Promise.all([
          prisma.order.count({
            where: { store: { orgId: input.orgId } },
          }),
          prisma.order.aggregate({
            where: { store: { orgId: input.orgId } },
            _sum: { totalAmount: true },
          }),
          prisma.product.count({
            where: { category: { orgId: input.orgId } },
          }),
          prisma.influencerProfile.count({
            where: { user: { orgId: input.orgId }, isActive: true },
          }),
          prisma.order.findMany({
            where: {
              store: { orgId: input.orgId },
              createdAt: { gte: thirtyDaysAgo },
            },
            select: {
              id: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        ]);

        // 按日期聚合订单数据
        const dailyStats: Record<string, { orders: number; revenue: number }> =
          {};
        for (const order of recentOrders) {
          const dateKey = order.createdAt.toISOString().split("T")[0];
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { orders: 0, revenue: 0 };
          }
          dailyStats[dateKey].orders++;
          dailyStats[dateKey].revenue += Number(order.totalAmount);
        }

        return {
          success: true,
          data: {
            totalOrders,
            totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
            totalProducts,
            totalInfluencers,
            dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
              date,
              ...stats,
            })),
          },
        };
      } catch (error) {
        console.error("[BI Router] Dashboard overview error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          data: null,
        };
      }
    }),

  // 获取 LLM 配置列表
  getLLMConfigs: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const configs = await prisma.lLMConfig.findMany({
          where: { orgId: input.orgId },
          select: {
            id: true,
            provider: true,
            name: true,
            modelName: true,
            isDefault: true,
            isActive: true,
            usageCount: true,
            lastUsedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return { success: true, configs };
      } catch (error) {
        console.error("[BI Router] Get LLM configs error:", error);
        return {
          success: false,
          configs: [],
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // 保存 LLM 配置
  saveLLMConfig: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        orgId: z.string(),
        provider: z.string(),
        name: z.string(),
        apiKey: z.string(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { id, ...data } = input;

        if (id) {
          // 更新现有配置
          const config = await prisma.lLMConfig.update({
            where: { id },
            data: {
              ...data,
              temperature: data.temperature
                ? String(data.temperature)
                : undefined,
            },
          });
          return { success: true, config };
        } else {
          // 创建新配置
          const config = await prisma.lLMConfig.create({
            data: {
              ...data,
              temperature: data.temperature
                ? String(data.temperature)
                : undefined,
            },
          });
          return { success: true, config };
        }
      } catch (error) {
        console.error("[BI Router] Save LLM config error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // 删除 LLM 配置
  deleteLLMConfig: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await prisma.lLMConfig.delete({ where: { id: input.id } });
        return { success: true };
      } catch (error) {
        console.error("[BI Router] Delete LLM config error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
