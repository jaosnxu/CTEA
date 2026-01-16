/**
 * CHUTEA tRPC Router - Banner Management
 *
 * Banner 轮播图管理模块
 * - Banner CRUD 操作
 * - 时间控制自动上下架
 * - 多语言支持
 */

import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
  createPermissionProcedure,
} from "../trpc";
import { TRPCError } from "@trpc/server";
import { getAuditService } from "../../services/audit-service";
import { mapRoleToOperatorType } from "../../utils/role-mapper";

/**
 * Banner Router
 */
export const bannerRouter = router({
  /**
   * 获取活跃的 Banner 列表（公开接口）
   * 自动过滤：isActive=true 且在有效时间范围内
   */
  getActive: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        storeId: z.string().optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, limit } = input;
      const now = new Date();

      const banners = await ctx.prisma.banner.findMany({
        where: {
          orgId,
          isActive: true,
          OR: [{ storeId: null }, { storeId: storeId || null }],
          AND: [
            {
              OR: [{ startTime: null }, { startTime: { lte: now } }],
            },
            {
              OR: [{ endTime: null }, { endTime: { gte: now } }],
            },
          ],
        },
        orderBy: { displayOrder: "asc" },
        take: limit,
      });

      return { banners };
    }),

  /**
   * 获取所有 Banner 列表（管理后台）
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        storeId: z.string().optional(),
        isActive: z.boolean().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, isActive, page, pageSize } = input;

      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (storeId !== undefined) where.storeId = storeId;
      if (isActive !== undefined) where.isActive = isActive;

      const [banners, total] = await Promise.all([
        ctx.prisma.banner.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        }),
        ctx.prisma.banner.count({ where }),
      ]);

      return {
        banners,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 获取 Banner 详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const banner = await ctx.prisma.banner.findUnique({
        where: { id: input.id },
      });

      if (!banner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Banner not found",
        });
      }

      return banner;
    }),

  /**
   * 创建 Banner
   */
  create: createPermissionProcedure(["marketing:create"])
    .input(
      z.object({
        orgId: z.string(),
        storeId: z.string().optional(),
        title: z.record(z.string(), z.string()), // {ru, zh, en}
        mediaType: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
        mediaUrl: z.string().url(),
        linkUrl: z.string().url().optional(),
        linkType: z.string().optional(),
        linkTarget: z.string().optional(),
        displayOrder: z.number().default(0),
        isActive: z.boolean().default(true),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { startTime, endTime, ...data } = input;

      const banner = await ctx.prisma.$transaction(async tx => {
        const newBanner = await tx.banner.create({
          data: {
            ...data,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            createdBy: ctx.userSession!.userId,
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "banners",
          recordId: newBanner.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: input.orgId,
        });

        return newBanner;
      });

      return { success: true, banner };
    }),

  /**
   * 更新 Banner
   */
  update: createPermissionProcedure(["marketing:update"])
    .input(
      z.object({
        id: z.string(),
        title: z.record(z.string(), z.string()).optional(),
        mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
        mediaUrl: z.string().url().optional(),
        linkUrl: z.string().url().optional(),
        linkType: z.string().optional(),
        linkTarget: z.string().optional(),
        displayOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        startTime: z.string().datetime().optional().nullable(),
        endTime: z.string().datetime().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, startTime, endTime, ...data } = input;

      const existing = await ctx.prisma.banner.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Banner not found",
        });
      }

      const updateData: any = { ...data, updatedBy: ctx.userSession!.userId };
      if (startTime !== undefined) {
        updateData.startTime = startTime ? new Date(startTime) : null;
      }
      if (endTime !== undefined) {
        updateData.endTime = endTime ? new Date(endTime) : null;
      }

      const banner = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.banner.update({
          where: { id },
          data: updateData,
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "banners",
          recordId: id,
          action: "UPDATE",
          changes: { before: existing, after: updated },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: existing.orgId,
        });

        return updated;
      });

      return { success: true, banner };
    }),

  /**
   * 删除 Banner
   */
  delete: createPermissionProcedure(["marketing:delete"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const existing = await ctx.prisma.banner.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Banner not found",
        });
      }

      await ctx.prisma.$transaction(async tx => {
        await tx.banner.delete({ where: { id } });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "banners",
          recordId: id,
          action: "DELETE",
          changes: existing,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: existing.orgId,
        });
      });

      return { success: true };
    }),

  /**
   * 批量更新排序
   */
  updateOrder: createPermissionProcedure(["marketing:update"])
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            displayOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.items.map(item =>
          ctx.prisma.banner.update({
            where: { id: item.id },
            data: {
              displayOrder: item.displayOrder,
              updatedBy: ctx.userSession!.userId,
            },
          })
        )
      );

      return { success: true };
    }),
});
