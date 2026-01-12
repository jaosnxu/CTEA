/**
 * CHUTEA tRPC Router - Store Management
 * 
 * 门店状态管理模块
 * - 门店列表查询
 * - 门店状态更新（含事务与审计）
 * - 门店配置管理
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, createPermissionProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { getAuditService } from '../../services/audit-service';
import { mapRoleToOperatorType } from '../../utils/role-mapper';

/**
 * Store Router
 */
export const storeRouter = router({
  /**
   * 获取门店列表
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        status: z.enum(['active', 'inactive', 'maintenance']).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, status, page, pageSize } = input;

      // RBAC 权限检查
      if (orgId && !ctx.rbacScope.canAccessOrg(orgId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this organization',
        });
      }

      // 构建查询条件
      const where: any = {};
      if (orgId) {
        where.orgId = orgId;
      } else if (ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }
      if (status) {
        where.status = status;
      }

      // 查询门店列表
      const [stores, total] = await Promise.all([
        ctx.prisma.store.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.prisma.store.count({ where }),
      ]);

      return {
        stores,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 获取门店详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const store = await ctx.prisma.store.findUnique({
        where: { id: input.id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!store) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Store not found',
        });
      }

      // RBAC 权限检查
      if (!ctx.rbacScope.canAccessStore(store.id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this store',
        });
      }

      return store;
    }),

  /**
   * 更新门店状态（含事务与审计）
   */
  updateStatus: createPermissionProcedure(['store:update'])
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['active', 'inactive', 'maintenance']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, reason } = input;

      // 查询门店
      const store = await ctx.prisma.store.findUnique({
        where: { id },
      });

      if (!store) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Store not found',
        });
      }

      // RBAC 权限检查
      if (!ctx.rbacScope.canAccessStore(id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this store',
        });
      }

      // 记录旧状态
      const oldStatus = store.status;

      // 更新门店状态（事务）
      const updatedStore = await ctx.prisma.$transaction(async (tx) => {
        // 更新门店状态
        const updated = await tx.store.update({
          where: { id },
          data: {
            status,
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: 'stores',
          recordId: id,
          action: 'UPDATE',
          changes: {
            status: { old: oldStatus, new: status },
            reason,
          },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: store.orgId || null,
        });

        return updated;
      });

      return {
        success: true,
        store: updatedStore,
      };
    }),

  /**
   * 创建门店
   */
  create: createPermissionProcedure(['store:create'])
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).max(200),
        address: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // RBAC 权限检查
      if (!ctx.rbacScope.canAccessOrg(input.orgId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create stores in this organization',
        });
      }

      // 创建门店（事务）
      const store = await ctx.prisma.$transaction(async (tx) => {
        // 创建门店
        const newStore = await tx.store.create({
          data: {
            ...input,
            createdAt: new Date(),
            createdBy: ctx.userSession!.userId,
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: 'stores',
          recordId: newStore.id,
          action: 'INSERT',
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: input.orgId,
        });

        return newStore;
      });

      return {
        success: true,
        store,
      };
    }),

  /**
   * 更新门店信息
   */
  update: createPermissionProcedure(['store:update'])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 查询门店
      const store = await ctx.prisma.store.findUnique({
        where: { id },
      });

      if (!store) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Store not found',
        });
      }

      // RBAC 权限检查
      if (!ctx.rbacScope.canAccessStore(id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this store',
        });
      }

      // 更新门店信息（事务）
      const updatedStore = await ctx.prisma.$transaction(async (tx) => {
        // 更新门店
        const updated = await tx.store.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: 'stores',
          recordId: id,
          action: 'UPDATE',
          changes: data,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: store.orgId || null,
        });

        return updated;
      });

      return {
        success: true,
        store: updatedStore,
      };
    }),

  /**
   * 删除门店（软删除）
   */
  delete: createPermissionProcedure(['store:delete'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // 查询门店
      const store = await ctx.prisma.store.findUnique({
        where: { id },
      });

      if (!store) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Store not found',
        });
      }

      // RBAC 权限检查
      if (!ctx.rbacScope.canAccessStore(id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this store',
        });
      }

      // 软删除门店（事务）
      await ctx.prisma.$transaction(async (tx) => {
        // 更新状态为 inactive
        await tx.store.update({
          where: { id },
          data: {
            status: 'inactive',
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: 'stores',
          recordId: id,
          action: 'DELETE',
          changes: { status: 'inactive' },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: store.orgId || null,
        });
      });

      return {
        success: true,
      };
    }),
});
