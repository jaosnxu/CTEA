/**
 * CHUTEA tRPC Router - Order Management
 *
 * 订单与状态流转模块
 * - 订单列表查询
 * - 订单详情查询
 * - 订单状态更新
 * - 订单统计
 */

import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getAuditService } from "../../services/audit-service";
import { mapRoleToOperatorType } from "../../utils/role-mapper";
import { OrderStatus } from "@prisma/client";

/**
 * Order Router
 */
export const orderRouter = router({
  /**
   * 获取订单列表
   */
  list: protectedProcedure
    .input(
      z.object({
        storeId: z.string().optional(),
        status: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeId, status, startDate, endDate, page, pageSize } = input;

      // 构建查询条件
      const where: any = {};
      if (storeId) where.storeId = storeId;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // RBAC 权限检查
      if (ctx.userSession?.storeId) {
        where.storeId = ctx.userSession.storeId;
      } else if (
        ctx.userSession?.orgId &&
        ctx.userSession.role !== "HQ_ADMIN"
      ) {
        // 查询组织下的所有门店
        const stores = await ctx.prisma.store.findMany({
          where: { orgId: ctx.userSession.orgId },
          select: { id: true },
        });
        where.storeId = { in: stores.map(s => s.id) };
      }

      // 查询订单列表
      const [orders, total] = await Promise.all([
        ctx.prisma.orders.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                phone: true,
              },
            },
          },
        }),
        ctx.prisma.orders.count({ where }),
      ]);

      return {
        orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 获取订单详情
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform(v => BigInt(v)),
      })
    )
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.orders.findUnique({
        where: { id: input.id },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          user: {
            select: {
              id: true,
              phone: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.storeId &&
        order.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this order",
        });
      }

      return order;
    }),

  /**
   * 更新订单状态
   */
  updateStatus: createPermissionProcedure(["order:update"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform(v => BigInt(v)),
        status: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, reason } = input;

      // 查询订单
      const order = await ctx.prisma.orders.findUnique({
        where: { id },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.storeId &&
        order.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this order",
        });
      }

      // 记录旧状态
      const oldStatus = order.status;

      // 更新订单状态（事务）
      const updatedOrder = await ctx.prisma.$transaction(async tx => {
        // 更新订单状态
        const updated = await tx.orders.update({
          where: { id },
          data: {
            status: status as OrderStatus,
            updatedAt: new Date(),
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "orders",
          recordId: id.toString(),
          action: "UPDATE",
          changes: {
            status: { old: oldStatus, new: status },
            reason,
          },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: null,
        });

        return updated;
      });

      return {
        success: true,
        order: updatedOrder,
      };
    }),

  /**
   * 获取订单统计
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        storeId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeId, startDate, endDate } = input;

      // 构建查询条件
      const where: any = {};
      if (storeId) where.storeId = storeId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // RBAC 权限检查
      if (ctx.userSession?.storeId) {
        where.storeId = ctx.userSession.storeId;
      } else if (
        ctx.userSession?.orgId &&
        ctx.userSession.role !== "HQ_ADMIN"
      ) {
        // 查询组织下的所有门店
        const stores = await ctx.prisma.store.findMany({
          where: { orgId: ctx.userSession.orgId },
          select: { id: true },
        });
        where.storeId = { in: stores.map(s => s.id) };
      }

      // 统计订单
      const [total, byStatus, revenue] = await Promise.all([
        ctx.prisma.orders.count({ where }),
        ctx.prisma.orders.groupBy({
          by: ["status"],
          where,
          _count: true,
        }),
        ctx.prisma.orders.aggregate({
          where: {
            ...where,
            status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERING] },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.map(item => ({
          status: item.status,
          count: item._count,
        })),
        revenue: revenue._sum.totalAmount || 0,
      };
    }),

  /**
   * 取消订单
   */
  cancel: createPermissionProcedure(["order:cancel"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform(v => BigInt(v)),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, reason } = input;

      // 查询订单
      const order = await ctx.prisma.orders.findUnique({
        where: { id },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.storeId &&
        order.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to cancel this order",
        });
      }

      // 检查订单状态
      const nonCancellableStatuses: OrderStatus[] = [
        OrderStatus.COMPLETED,
        OrderStatus.DELIVERING,
        OrderStatus.CANCELLED,
      ];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order cannot be cancelled in current status",
        });
      }

      // 取消订单（事务）
      const updatedOrder = await ctx.prisma.$transaction(async tx => {
        // 更新订单状态
        const updated = await tx.orders.update({
          where: { id },
          data: {
            status: OrderStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "orders",
          recordId: id.toString(),
          action: "UPDATE",
          changes: {
            status: { old: order.status, new: "cancelled" },
            reason,
          },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: null,
        });

        return updated;
      });

      return {
        success: true,
        order: updatedOrder,
      };
    }),

  /**
   * 搜索订单
   */
  search: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { keyword, page, pageSize } = input;

      // 构建查询条件
      const where: any = {
        OR: [
          { id: { contains: keyword } },
          { orderNumber: { contains: keyword } },
        ],
      };

      // RBAC 权限检查
      if (ctx.userSession?.storeId) {
        where.storeId = ctx.userSession.storeId;
      } else if (
        ctx.userSession?.orgId &&
        ctx.userSession.role !== "HQ_ADMIN"
      ) {
        // 查询组织下的所有门店
        const stores = await ctx.prisma.store.findMany({
          where: { orgId: ctx.userSession.orgId },
          select: { id: true },
        });
        where.storeId = { in: stores.map(s => s.id) };
      }

      // 查询订单
      const [orders, total] = await Promise.all([
        ctx.prisma.orders.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                phone: true,
              },
            },
          },
        }),
        ctx.prisma.orders.count({ where }),
      ]);

      return {
        orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});
