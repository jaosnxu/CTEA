/**
 * CHUTEA tRPC Router - Marketing Rules Engine
 *
 * 营销规则引擎模块
 * - 规则 CRUD 操作
 * - 审批工作流
 * - 时间控制自动上下架
 * - 支持: BOGO, 固定折扣, 生日券, 第二杯半价, 免费券, 满减
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
 * Marketing Rules Router
 */
export const marketingRouter = router({
  /**
   * 获取活跃的营销规则（公开接口）
   * 自动过滤：isActive=true, approvalStatus=ACTIVE, 且在有效时间范围内
   */
  getActiveRules: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        storeId: z.string().optional(),
        ruleType: z
          .enum([
            "BOGO",
            "FIXED_DISCOUNT",
            "BIRTHDAY_COUPON",
            "SECOND_HALF_PRICE",
            "FREE_VOUCHER",
            "PERCENTAGE_OFF",
            "SPEND_GET",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, ruleType } = input;
      const now = new Date();

      const where: any = {
        orgId,
        isActive: true,
        approvalStatus: "ACTIVE",
        AND: [
          {
            OR: [{ startTime: null }, { startTime: { lte: now } }],
          },
          {
            OR: [{ endTime: null }, { endTime: { gte: now } }],
          },
        ],
      };

      if (storeId) {
        where.OR = [{ storeId: null }, { storeId }];
      }
      if (ruleType) {
        where.ruleType = ruleType;
      }

      const rules = await ctx.prisma.marketingRule.findMany({
        where,
        orderBy: { priority: "desc" },
      });

      return { rules };
    }),

  /**
   * 获取所有营销规则列表（管理后台）
   */
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        storeId: z.string().optional(),
        ruleType: z
          .enum([
            "BOGO",
            "FIXED_DISCOUNT",
            "BIRTHDAY_COUPON",
            "SECOND_HALF_PRICE",
            "FREE_VOUCHER",
            "PERCENTAGE_OFF",
            "SPEND_GET",
          ])
          .optional(),
        approvalStatus: z
          .enum([
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "ACTIVE",
            "EXPIRED",
            "CANCELLED",
          ])
          .optional(),
        isActive: z.boolean().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, ruleType, approvalStatus, isActive, page, pageSize } =
        input;

      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (storeId !== undefined) where.storeId = storeId;
      if (ruleType) where.ruleType = ruleType;
      if (approvalStatus) where.approvalStatus = approvalStatus;
      if (isActive !== undefined) where.isActive = isActive;

      const [rules, total] = await Promise.all([
        ctx.prisma.marketingRule.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        }),
        ctx.prisma.marketingRule.count({ where }),
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
   * 获取营销规则详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rule = await ctx.prisma.marketingRule.findUnique({
        where: { id: input.id },
      });

      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      return rule;
    }),

  /**
   * 创建营销规则
   */
  create: createPermissionProcedure(["marketing:create"])
    .input(
      z.object({
        orgId: z.string(),
        storeId: z.string().optional(),
        name: z.record(z.string(), z.string()), // {ru, zh, en}
        description: z.record(z.string(), z.string()).optional(),
        ruleType: z.enum([
          "BOGO",
          "FIXED_DISCOUNT",
          "BIRTHDAY_COUPON",
          "SECOND_HALF_PRICE",
          "FREE_VOUCHER",
          "PERCENTAGE_OFF",
          "SPEND_GET",
        ]),
        ruleConfig: z.record(z.string(), z.any()), // 规则配置
        priority: z.number().default(0),
        isStackable: z.boolean().default(false),
        maxUsageTotal: z.number().optional(),
        maxUsagePerUser: z.number().optional(),
        applicableProducts: z.array(z.string()).optional(),
        applicableCategories: z.array(z.string()).optional(),
        excludedProducts: z.array(z.string()).optional(),
        minOrderAmount: z.number().optional(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        isActive: z.boolean().default(false), // 默认不激活，需要审批
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { startTime, endTime, ...data } = input;

      const rule = await ctx.prisma.$transaction(async tx => {
        const newRule = await tx.marketingRule.create({
          data: {
            ...data,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            approvalStatus: "DRAFT",
            createdBy: ctx.userSession!.userId,
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "marketing_rules",
          recordId: newRule.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: input.orgId,
        });

        return newRule;
      });

      return { success: true, rule };
    }),

  /**
   * 更新营销规则
   */
  update: createPermissionProcedure(["marketing:update"])
    .input(
      z.object({
        id: z.string(),
        name: z.record(z.string(), z.string()).optional(),
        description: z.record(z.string(), z.string()).optional(),
        ruleConfig: z.record(z.string(), z.any()).optional(),
        priority: z.number().optional(),
        isStackable: z.boolean().optional(),
        maxUsageTotal: z.number().optional(),
        maxUsagePerUser: z.number().optional(),
        applicableProducts: z.array(z.string()).optional(),
        applicableCategories: z.array(z.string()).optional(),
        excludedProducts: z.array(z.string()).optional(),
        minOrderAmount: z.number().optional(),
        startTime: z.string().datetime().optional().nullable(),
        endTime: z.string().datetime().optional().nullable(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, startTime, endTime, ...data } = input;

      const existing = await ctx.prisma.marketingRule.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      const updateData: any = { ...data, updatedBy: ctx.userSession!.userId };
      if (startTime !== undefined) {
        updateData.startTime = startTime ? new Date(startTime) : null;
      }
      if (endTime !== undefined) {
        updateData.endTime = endTime ? new Date(endTime) : null;
      }

      // 如果规则已激活，修改后需要重新审批
      if (existing.approvalStatus === "ACTIVE" && Object.keys(data).length > 0) {
        updateData.approvalStatus = "PENDING_APPROVAL";
      }

      const rule = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.marketingRule.update({
          where: { id },
          data: updateData,
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "marketing_rules",
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

      return { success: true, rule };
    }),

  /**
   * 提交审批
   */
  submitForApproval: createPermissionProcedure(["marketing:update"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const existing = await ctx.prisma.marketingRule.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      if (existing.approvalStatus !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft rules can be submitted for approval",
        });
      }

      const rule = await ctx.prisma.marketingRule.update({
        where: { id },
        data: {
          approvalStatus: "PENDING_APPROVAL",
          updatedBy: ctx.userSession!.userId,
        },
      });

      return { success: true, rule };
    }),

  /**
   * 审批通过
   */
  approve: createPermissionProcedure(["marketing:approve"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const existing = await ctx.prisma.marketingRule.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      if (existing.approvalStatus !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending rules can be approved",
        });
      }

      const rule = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.marketingRule.update({
          where: { id },
          data: {
            approvalStatus: "ACTIVE",
            isActive: true,
            approvedBy: ctx.userSession!.userId,
            approvedAt: new Date(),
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "marketing_rules",
          recordId: id,
          action: "UPDATE",
          changes: { action: "APPROVE", approvedBy: ctx.userSession!.userId },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: existing.orgId,
        });

        return updated;
      });

      return { success: true, rule };
    }),

  /**
   * 审批拒绝
   */
  reject: createPermissionProcedure(["marketing:approve"])
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, reason } = input;

      const existing = await ctx.prisma.marketingRule.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      if (existing.approvalStatus !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending rules can be rejected",
        });
      }

      const rule = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.marketingRule.update({
          where: { id },
          data: {
            approvalStatus: "REJECTED",
            rejectionReason: reason,
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "marketing_rules",
          recordId: id,
          action: "UPDATE",
          changes: { action: "REJECT", reason },
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: existing.orgId,
        });

        return updated;
      });

      return { success: true, rule };
    }),

  /**
   * 删除营销规则
   */
  delete: createPermissionProcedure(["marketing:delete"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const existing = await ctx.prisma.marketingRule.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing rule not found",
        });
      }

      await ctx.prisma.$transaction(async tx => {
        await tx.marketingRule.delete({ where: { id } });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "marketing_rules",
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
   * 计算订单可用的营销规则
   */
  calculateDiscount: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        storeId: z.string().optional(),
        userId: z.string().optional(),
        orderAmount: z.number(),
        productIds: z.array(z.string()),
        categoryIds: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, storeId, orderAmount, productIds, categoryIds } = input;
      const now = new Date();

      // 获取所有活跃规则
      const rules = await ctx.prisma.marketingRule.findMany({
        where: {
          orgId,
          isActive: true,
          approvalStatus: "ACTIVE",
          AND: [
            {
              OR: [{ startTime: null }, { startTime: { lte: now } }],
            },
            {
              OR: [{ endTime: null }, { endTime: { gte: now } }],
            },
            {
              OR: [{ minOrderAmount: null }, { minOrderAmount: { lte: orderAmount } }],
            },
          ],
        },
        orderBy: { priority: "desc" },
      });

      // 过滤适用的规则
      const applicableRules = rules.filter(rule => {
        // 检查门店限制
        if (rule.storeId && rule.storeId !== storeId) return false;

        // 检查产品限制
        const applicableProducts = rule.applicableProducts as string[] | null;
        const excludedProducts = rule.excludedProducts as string[] | null;
        const applicableCategories = rule.applicableCategories as string[] | null;

        if (applicableProducts && applicableProducts.length > 0) {
          if (!productIds.some(id => applicableProducts.includes(id))) return false;
        }

        if (excludedProducts && excludedProducts.length > 0) {
          if (productIds.some(id => excludedProducts.includes(id))) return false;
        }

        if (applicableCategories && applicableCategories.length > 0) {
          if (!categoryIds.some(id => applicableCategories.includes(id))) return false;
        }

        // 检查使用次数限制
        if (rule.maxUsageTotal && rule.currentUsage >= rule.maxUsageTotal) return false;

        return true;
      });

      return { applicableRules };
    }),
});
