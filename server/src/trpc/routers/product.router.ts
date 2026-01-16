/**
 * CHUTEA tRPC Router - Product Management (Enhanced)
 *
 * 产品管理模块（增强版）
 * - 产品 CRUD 操作
 * - 分类管理
 * - 产品选项组（单选/多选）
 * - 动态排序和显示控制
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
 * Product Router (Enhanced)
 */
export const productRouter = router({
  // ============================================================================
  // Category Management
  // ============================================================================

  /**
   * 获取活跃分类列表（公开接口）
   */
  getActiveCategories: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        parentId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, parentId } = input;
      const now = new Date();

      const categories = await ctx.prisma.categoryEnhanced.findMany({
        where: {
          orgId,
          parentId: parentId || null,
          isActive: true,
          isVisible: true,
          AND: [
            {
              OR: [
                { visibleStartTime: null },
                { visibleStartTime: { lte: now } },
              ],
            },
            {
              OR: [{ visibleEndTime: null }, { visibleEndTime: { gte: now } }],
            },
          ],
        },
        orderBy: { displayOrder: "asc" },
      });

      return { categories };
    }),

  /**
   * 获取所有分类列表（管理后台）
   */
  listCategories: protectedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        parentId: z.string().optional(),
        isActive: z.boolean().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, parentId, isActive, page, pageSize } = input;

      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (parentId !== undefined) where.parentId = parentId;
      if (isActive !== undefined) where.isActive = isActive;

      const [categories, total] = await Promise.all([
        ctx.prisma.categoryEnhanced.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { displayOrder: "asc" },
        }),
        ctx.prisma.categoryEnhanced.count({ where }),
      ]);

      return {
        categories,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 创建分类
   */
  createCategory: createPermissionProcedure(["product:create"])
    .input(
      z.object({
        orgId: z.string(),
        parentId: z.string().optional(),
        name: z.record(z.string(), z.string()), // {ru, zh, en}
        description: z.record(z.string(), z.string()).optional(),
        icon: z.string().optional(),
        imageUrl: z.string().url().optional(),
        displayOrder: z.number().default(0),
        isVisible: z.boolean().default(true),
        isActive: z.boolean().default(true),
        visibleStartTime: z.string().datetime().optional(),
        visibleEndTime: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { visibleStartTime, visibleEndTime, ...data } = input;

      const category = await ctx.prisma.$transaction(async tx => {
        const newCategory = await tx.categoryEnhanced.create({
          data: {
            ...data,
            visibleStartTime: visibleStartTime
              ? new Date(visibleStartTime)
              : null,
            visibleEndTime: visibleEndTime ? new Date(visibleEndTime) : null,
            createdBy: ctx.userSession!.userId,
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "categories_enhanced",
          recordId: newCategory.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: input.orgId,
        });

        return newCategory;
      });

      return { success: true, category };
    }),

  /**
   * 更新分类
   */
  updateCategory: createPermissionProcedure(["product:update"])
    .input(
      z.object({
        id: z.string(),
        name: z.record(z.string(), z.string()).optional(),
        description: z.record(z.string(), z.string()).optional(),
        icon: z.string().optional(),
        imageUrl: z.string().url().optional(),
        displayOrder: z.number().optional(),
        isVisible: z.boolean().optional(),
        isActive: z.boolean().optional(),
        visibleStartTime: z.string().datetime().optional().nullable(),
        visibleEndTime: z.string().datetime().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, visibleStartTime, visibleEndTime, ...data } = input;

      const existing = await ctx.prisma.categoryEnhanced.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const updateData: any = { ...data, updatedBy: ctx.userSession!.userId };
      if (visibleStartTime !== undefined) {
        updateData.visibleStartTime = visibleStartTime
          ? new Date(visibleStartTime)
          : null;
      }
      if (visibleEndTime !== undefined) {
        updateData.visibleEndTime = visibleEndTime
          ? new Date(visibleEndTime)
          : null;
      }

      const category = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.categoryEnhanced.update({
          where: { id },
          data: updateData,
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "categories_enhanced",
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

      return { success: true, category };
    }),

  /**
   * 批量更新分类排序
   */
  updateCategoryOrder: createPermissionProcedure(["product:update"])
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
          ctx.prisma.categoryEnhanced.update({
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

  // ============================================================================
  // Product Management
  // ============================================================================

  /**
   * 获取活跃产品列表（公开接口）
   */
  getActiveProducts: publicProcedure
    .input(
      z.object({
        orgId: z.string(),
        categoryId: z.string().optional(),
        isFeatured: z.boolean().optional(),
        isNew: z.boolean().optional(),
        sortBy: z
          .enum(["displayOrder", "basePrice", "createdAt"])
          .default("displayOrder"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        orgId,
        categoryId,
        isFeatured,
        isNew,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = input;
      const now = new Date();

      const where: any = {
        orgId,
        isActive: true,
        isVisible: true,
        AND: [
          {
            OR: [
              { availableStartTime: null },
              { availableStartTime: { lte: now } },
            ],
          },
          {
            OR: [
              { availableEndTime: null },
              { availableEndTime: { gte: now } },
            ],
          },
        ],
      };

      if (categoryId) where.categoryId = categoryId;
      if (isFeatured !== undefined) where.isFeatured = isFeatured;
      if (isNew !== undefined) where.isNew = isNew;

      const [products, total] = await Promise.all([
        ctx.prisma.productEnhanced.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.prisma.productEnhanced.count({ where }),
      ]);

      return { products, total };
    }),

  /**
   * 获取产品详情（公开接口）
   */
  getProductById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.productEnhanced.findUnique({
        where: { id: input.id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // 获取产品选项组
      const optionMappings = await ctx.prisma.productOptionMapping.findMany({
        where: { productId: product.id },
        include: {
          optionGroup: {
            include: {
              options: {
                where: { isActive: true },
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      return {
        product,
        optionGroups: optionMappings.map(m => ({
          ...m.optionGroup,
          isRequired: m.isRequired,
        })),
      };
    }),

  /**
   * 获取所有产品列表（管理后台）
   */
  listProducts: protectedProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        categoryId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, categoryId, isActive, search, page, pageSize } = input;

      const where: any = {};
      if (orgId) where.orgId = orgId;
      if (categoryId) where.categoryId = categoryId;
      if (isActive !== undefined) where.isActive = isActive;

      const [products, total] = await Promise.all([
        ctx.prisma.productEnhanced.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        ctx.prisma.productEnhanced.count({ where }),
      ]);

      return {
        products,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 创建产品
   */
  createProduct: createPermissionProcedure(["product:create"])
    .input(
      z.object({
        orgId: z.string(),
        categoryId: z.string(),
        code: z.string().min(1).max(50),
        name: z.record(z.string(), z.string()), // {ru, zh, en}
        description: z.record(z.string(), z.string()).optional(),
        basePrice: z.number().min(0),
        currency: z.string().default("RUB"),
        images: z.array(z.string().url()).optional(),
        thumbnailUrl: z.string().url().optional(),
        stockQuantity: z.number().optional(),
        lowStockThreshold: z.number().default(10),
        trackStock: z.boolean().default(false),
        displayOrder: z.number().default(0),
        isVisible: z.boolean().default(true),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        isNew: z.boolean().default(false),
        availableStartTime: z.string().datetime().optional(),
        availableEndTime: z.string().datetime().optional(),
        maxPerOrder: z.number().optional(),
        maxPerUser: z.number().optional(),
        tags: z.array(z.string()).optional(),
        iikoProductId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { availableStartTime, availableEndTime, ...data } = input;

      const product = await ctx.prisma.$transaction(async tx => {
        const newProduct = await tx.productEnhanced.create({
          data: {
            ...data,
            availableStartTime: availableStartTime
              ? new Date(availableStartTime)
              : null,
            availableEndTime: availableEndTime
              ? new Date(availableEndTime)
              : null,
            createdBy: ctx.userSession!.userId,
            updatedBy: ctx.userSession!.userId,
          },
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "products_enhanced",
          recordId: newProduct.id,
          action: "INSERT",
          changes: input,
          operatorId: ctx.userSession!.userId,
          operatorType: mapRoleToOperatorType(ctx.userSession!.role),
          operatorName: null,
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
          orgId: input.orgId,
        });

        return newProduct;
      });

      return { success: true, product };
    }),

  /**
   * 更新产品
   */
  updateProduct: createPermissionProcedure(["product:update"])
    .input(
      z.object({
        id: z.string(),
        categoryId: z.string().optional(),
        name: z.record(z.string(), z.string()).optional(),
        description: z.record(z.string(), z.string()).optional(),
        basePrice: z.number().min(0).optional(),
        currency: z.string().optional(),
        images: z.array(z.string().url()).optional(),
        thumbnailUrl: z.string().url().optional(),
        stockQuantity: z.number().optional(),
        lowStockThreshold: z.number().optional(),
        trackStock: z.boolean().optional(),
        displayOrder: z.number().optional(),
        isVisible: z.boolean().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        isNew: z.boolean().optional(),
        availableStartTime: z.string().datetime().optional().nullable(),
        availableEndTime: z.string().datetime().optional().nullable(),
        maxPerOrder: z.number().optional(),
        maxPerUser: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isManualOverride: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, availableStartTime, availableEndTime, ...data } = input;

      const existing = await ctx.prisma.productEnhanced.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const updateData: any = { ...data, updatedBy: ctx.userSession!.userId };
      if (availableStartTime !== undefined) {
        updateData.availableStartTime = availableStartTime
          ? new Date(availableStartTime)
          : null;
      }
      if (availableEndTime !== undefined) {
        updateData.availableEndTime = availableEndTime
          ? new Date(availableEndTime)
          : null;
      }

      const product = await ctx.prisma.$transaction(async tx => {
        const updated = await tx.productEnhanced.update({
          where: { id },
          data: updateData,
        });

        const auditService = getAuditService();
        await auditService.logAction({
          tableName: "products_enhanced",
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

      return { success: true, product };
    }),

  // ============================================================================
  // Product Option Groups
  // ============================================================================

  /**
   * 获取选项组列表
   */
  listOptionGroups: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        optionType: z.enum(["SINGLE_CHOICE", "MULTI_CHOICE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, optionType } = input;

      const where: any = { orgId };
      if (optionType) where.optionType = optionType;

      const groups = await ctx.prisma.productOptionGroup.findMany({
        where,
        include: {
          options: {
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { displayOrder: "asc" },
      });

      return { groups };
    }),

  /**
   * 创建选项组
   */
  createOptionGroup: createPermissionProcedure(["product:create"])
    .input(
      z.object({
        orgId: z.string(),
        name: z.record(z.string(), z.string()), // {ru, zh, en}
        code: z.string().min(1).max(50),
        optionType: z.enum(["SINGLE_CHOICE", "MULTI_CHOICE"]),
        isRequired: z.boolean().default(false),
        minSelect: z.number().default(0),
        maxSelect: z.number().default(1),
        displayOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.productOptionGroup.create({
        data: {
          ...input,
          createdBy: ctx.userSession!.userId,
          updatedBy: ctx.userSession!.userId,
        },
      });

      return { success: true, group };
    }),

  /**
   * 创建选项项
   */
  createOptionItem: createPermissionProcedure(["product:create"])
    .input(
      z.object({
        groupId: z.string(),
        name: z.record(z.string(), z.string()), // {ru, zh, en}
        code: z.string().min(1).max(50),
        priceAdjust: z.number().default(0),
        displayOrder: z.number().default(0),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.productOptionItem.create({
        data: {
          ...input,
          createdBy: ctx.userSession!.userId,
          updatedBy: ctx.userSession!.userId,
        },
      });

      return { success: true, item };
    }),

  /**
   * 关联产品和选项组
   */
  linkProductOption: createPermissionProcedure(["product:update"])
    .input(
      z.object({
        productId: z.string(),
        optionGroupId: z.string(),
        isRequired: z.boolean().default(false),
        displayOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.prisma.productOptionMapping.create({
        data: input,
      });

      return { success: true, mapping };
    }),

  /**
   * 取消产品和选项组的关联
   */
  unlinkProductOption: createPermissionProcedure(["product:update"])
    .input(
      z.object({
        productId: z.string(),
        optionGroupId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.productOptionMapping.deleteMany({
        where: {
          productId: input.productId,
          optionGroupId: input.optionGroupId,
        },
      });

      return { success: true };
    }),
});
