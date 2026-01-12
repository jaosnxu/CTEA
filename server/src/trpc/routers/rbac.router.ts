/**
 * CHUTEA tRPC Router - RBAC Management
 *
 * 权限矩阵与角色校验模块
 * - 角色管理
 * - 权限规则管理
 * - 用户权限查询
 */

import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getAuditService } from "../../services/audit-service";
import { mapRoleToOperatorType } from "../../utils/role-mapper";

/**
 * RBAC Router
 */
export const rbacRouter = router({
  /**
   * 获取所有角色
   */
  getRoles: protectedProcedure.query(async ({ ctx }) => {
    // 定义 6 级 RBAC 角色
    const roles = [
      {
        id: "super_admin",
        name: "Super Admin",
        description: "System super administrator with full access",
        level: 1,
      },
      {
        id: "org_admin",
        name: "Organization Admin",
        description: "Organization administrator",
        level: 2,
      },
      {
        id: "region_admin",
        name: "Region Admin",
        description: "Regional administrator",
        level: 3,
      },
      {
        id: "store_admin",
        name: "Store Admin",
        description: "Store administrator",
        level: 4,
      },
      {
        id: "store_staff",
        name: "Store Staff",
        description: "Store staff member",
        level: 5,
      },
      {
        id: "user",
        name: "User",
        description: "Regular user",
        level: 6,
      },
    ];

    return roles;
  }),

  /**
   * 获取权限规则列表
   */
  getPermissionRules: createPermissionProcedure(["rbac:view"])
    .input(
      z.object({
        role: z.string().optional(),
        resource: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { role, resource, page, pageSize } = input;

      // 构建查询条件
      const where: any = {};
      if (role) where.role = role;
      if (resource) where.resource = { contains: resource };

      // 查询权限规则
      const [rules, total] = await Promise.all([
        ctx.prisma.permissionRule.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.permissionRule.count({ where }),
      ]);

      return {
        rules,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 创建权限规则
   */
  createPermissionRule: createPermissionProcedure(["rbac:manage"])
    .input(
      z.object({
        role: z.string(),
        resource: z.string(),
        action: z.string(),
        effect: z.enum(["allow", "deny"]),
        conditions: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 创建权限规则（事务）
      const rule = await ctx.prisma.$transaction(async tx => {
        // 创建权限规则
        const newRule = await tx.permissionRule.create({
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
          tableName: "permission_rules",
          recordId: newRule.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: null,
        });

        return newRule;
      });

      return {
        success: true,
        rule,
      };
    }),

  /**
   * 更新权限规则
   */
  updatePermissionRule: createPermissionProcedure(["rbac:manage"])
    .input(
      z.object({
        id: z.string(),
        effect: z.enum(["allow", "deny"]).optional(),
        conditions: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 查询权限规则
      const rule = await ctx.prisma.permissionRule.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission rule not found",
        });
      }

      // 更新权限规则（事务）
      const updatedRule = await ctx.prisma.$transaction(async tx => {
        // 更新权限规则
        const updated = await tx.permissionRule.update({
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
          tableName: "permission_rules",
          recordId: id,
          action: "UPDATE",
          changes: data,
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
        rule: updatedRule,
      };
    }),

  /**
   * 删除权限规则
   */
  deletePermissionRule: createPermissionProcedure(["rbac:manage"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // 查询权限规则
      const rule = await ctx.prisma.permissionRule.findUnique({
        where: { id },
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission rule not found",
        });
      }

      // 删除权限规则（事务）
      await ctx.prisma.$transaction(async tx => {
        // 删除权限规则
        await tx.permissionRule.delete({
          where: { id },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "permission_rules",
          recordId: id,
          action: "DELETE",
          changes: { deleted: true },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: null,
        });
      });

      return {
        success: true,
      };
    }),

  /**
   * 获取用户权限
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.userSession!.userId;

      // RBAC 权限检查（只能查看自己的权限，除非是管理员）
      if (
        userId !== ctx.userSession!.userId &&
        ctx.userSession!.role !== "super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view other users permissions",
        });
      }

      // 查询用户信息
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // 查询用户角色的权限规则
      const rules = await ctx.prisma.permissionRule.findMany({
        where: {
          role: user.role,
          effect: "allow",
        },
      });

      // 提取权限列表
      const permissions = rules.map(rule => `${rule.resource}:${rule.action}`);

      return {
        userId: user.id,
        role: user.role,
        permissions,
        rules,
      };
    }),

  /**
   * 检查用户权限
   */
  checkPermission: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        permission: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.userSession!.userId;
      const { permission } = input;

      // 解析权限
      const [resource, action] = permission.split(":");

      // 查询用户信息
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Super admin 拥有所有权限
      if (user.role === "super_admin") {
        return {
          hasPermission: true,
          reason: "Super admin has all permissions",
        };
      }

      // 查询权限规则
      const rule = await ctx.prisma.permissionRule.findFirst({
        where: {
          role: user.role,
          resource,
          action,
        },
      });

      if (!rule) {
        return {
          hasPermission: false,
          reason: "No permission rule found",
        };
      }

      return {
        hasPermission: rule.effect === "allow",
        reason:
          rule.effect === "allow" ? "Permission granted" : "Permission denied",
        rule,
      };
    }),

  /**
   * 获取 RBAC 矩阵
   */
  getMatrix: createPermissionProcedure(["rbac:view"]).query(async ({ ctx }) => {
    // 查询所有权限规则
    const rules = await ctx.prisma.permissionRule.findMany({
      orderBy: [{ role: "asc" }, { resource: "asc" }, { action: "asc" }],
    });

    // 按角色分组
    const matrix: Record<string, any[]> = {};
    for (const rule of rules) {
      if (!matrix[rule.role]) {
        matrix[rule.role] = [];
      }
      matrix[rule.role].push({
        resource: rule.resource,
        action: rule.action,
        effect: rule.effect,
        conditions: rule.conditions,
      });
    }

    return {
      matrix,
      roles: [
        "super_admin",
        "org_admin",
        "region_admin",
        "store_admin",
        "store_staff",
        "user",
      ],
    };
  }),
});
