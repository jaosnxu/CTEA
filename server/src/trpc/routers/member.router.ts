/**
 * CHUTEA tRPC Router - Member Management
 *
 * 用户与组织管理模块
 * - 用户管理
 * - 组织管理
 * - 用户角色分配
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
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { mapRoleToOperatorType } from "../../utils/role-mapper";

const JWT_SECRET = process.env.JWT_SECRET || "chutea-secret-key-2024";

/**
 * Member Router
 */
export const memberRouter = router({
  /**
   * 用户登录
   */
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { username, password } = input;

      // 查询用户
      const user = await ctx.prisma.adminUser.findFirst({
        where: {
          OR: [{ username }, { email: username }],
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // 验证密码
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // 检查用户状态
      if (user.status !== "ACTIVE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User account is not active",
        });
      }

      // 生成 JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          orgId: user.orgId,
          storeId: user.storeId,
          permissions: [], // TODO: 从权限规则中获取
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // 记录审计日志
      const auditService = getAuditService();
      await auditService.logAction({
        tableName: "admin_users",
        recordId: user.id,
        action: "UPDATE",
        changes: { lastLogin: new Date() },
        operatorId: user.id,
        operatorType: mapRoleToOperatorType(user.role),
        operatorName: user.username,
        ipAddress: ctx.auditTrail.ipAddress,
        userAgent: ctx.auditTrail.userAgent,
        orgId: user.orgId,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organization: user.organization,
          store: user.store,
        },
      };
    }),

  /**
   * 获取当前用户信息
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.adminUser.findUnique({
      where: { id: ctx.userSession!.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      organization: user.organization,
      store: user.store,
      status: user.status,
    };
  }),

  /**
   * 获取用户列表
   */
  listUsers: createPermissionProcedure(["user:view"])
    .input(
      z.object({
        orgId: z.string().optional(),
        storeId: z.string().optional(),
        role: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, role, status, page, pageSize } = input;

      // 构建查询条件
      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (storeId) where.storeId = storeId;
      if (role) where.role = role;
      if (status) where.status = status;

      // RBAC 权限检查
      if (ctx.userSession?.role !== "super_admin" && ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }

      // 查询用户列表
      const [users, total] = await Promise.all([
        ctx.prisma.adminUser.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            status: true,
            organization: true,
            store: true,
            createdAt: true,
          },
        }),
        ctx.prisma.adminUser.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 创建用户
   */
  createUser: createPermissionProcedure(["user:create"])
    .input(
      z.object({
        username: z.string().min(3).max(50),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum([
          "super_admin",
          "org_admin",
          "region_admin",
          "store_admin",
          "store_staff",
          "user",
        ]),
        orgId: z.string().optional(),
        storeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { username, email, password, role, orgId, storeId } = input;

      // 检查用户名是否已存在
      const existingUser = await ctx.prisma.adminUser.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username or email already exists",
        });
      }

      // RBAC 权限检查
      if (orgId && !ctx.rbacScope.canAccessOrg(orgId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to create users in this organization",
        });
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 创建用户（事务）
      const user = await ctx.prisma.$transaction(async tx => {
        // 创建用户
        const newUser = await tx.adminUser.create({
          data: {
            username,
            email,
            passwordHash,
            role,
            orgId: orgId || null,
            storeId: storeId || null,
            status: "active",
            createdAt: new Date(),
            createdBy: ctx.userSession!.userId,
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "admin_users",
          recordId: newUser.id,
          action: "INSERT",
          changes: { username, email, role, orgId, storeId },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: orgId || null,
        });

        return newUser;
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * 更新用户
   */
  updateUser: createPermissionProcedure(["user:update"])
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        role: z
          .enum([
            "super_admin",
            "org_admin",
            "region_admin",
            "store_admin",
            "store_staff",
            "user",
          ])
          .optional(),
        status: z.enum(["active", "inactive"]).optional(),
        orgId: z.string().optional(),
        storeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // 查询用户
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.role !== "super_admin" &&
        user.orgId !== ctx.userSession?.orgId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this user",
        });
      }

      // 更新用户（事务）
      const updatedUser = await ctx.prisma.$transaction(async tx => {
        // 更新用户
        const updated = await tx.adminUser.update({
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
          tableName: "admin_users",
          recordId: id,
          action: "UPDATE",
          changes: data,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: user.orgId,
        });

        return updated;
      });

      return {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
        },
      };
    }),

  /**
   * 删除用户（软删除）
   */
  deleteUser: createPermissionProcedure(["user:delete"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // 查询用户
      const user = await ctx.prisma.adminUser.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.role !== "super_admin" &&
        user.orgId !== ctx.userSession?.orgId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this user",
        });
      }

      // 软删除用户（事务）
      await ctx.prisma.$transaction(async tx => {
        // 更新状态为 inactive
        await tx.adminUser.update({
          where: { id },
          data: {
            status: "inactive",
            updatedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        // 记录审计日志
        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "admin_users",
          recordId: id,
          action: "DELETE",
          changes: { status: "inactive" },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: user.orgId,
        });
      });

      return {
        success: true,
      };
    }),

  /**
   * 获取组织列表
   */
  listOrganizations: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      // 构建查询条件
      const where: any = {};

      // RBAC 权限检查
      if (ctx.userSession?.role !== "super_admin" && ctx.userSession?.orgId) {
        where.id = ctx.userSession.orgId;
      }

      // 查询组织列表
      const [organizations, total] = await Promise.all([
        ctx.prisma.organization.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.organization.count({ where }),
      ]);

      return {
        organizations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 创建组织
   */
  createOrganization: createPermissionProcedure(["org:create"])
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 创建组织（事务）
      const organization = await ctx.prisma.$transaction(async tx => {
        // 创建组织
        const newOrg = await tx.organization.create({
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
          tableName: "organizations",
          recordId: newOrg.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: newOrg.id,
        });

        return newOrg;
      });

      return {
        success: true,
        organization,
      };
    }),
});
