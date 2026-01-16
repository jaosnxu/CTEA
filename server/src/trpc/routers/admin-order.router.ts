/**
 * Admin Order Router - Complete Order Management
 *
 * Provides admin-level order management including:
 * - List orders with advanced filtering
 * - Get order details
 * - Create orders
 * - Update orders
 * - Change order status
 * - Soft delete orders
 * - Order statistics
 */

import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getOrderService } from "../../services/order-service";
import { getAuditService } from "../../services/audit-service";
import { mapRoleToOperatorType } from "../../utils/role-mapper";
import { OrderStatus } from "@prisma/client";

/**
 * Order Status Enum Schema
 */
const OrderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

/**
 * Order Item Schema
 */
const OrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productCode: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number(),
  discountAmount: z.number().optional(),
  specifications: z.any().optional(),
  notes: z.string().optional(),
});

/**
 * Admin Order Router
 */
export const adminOrderRouter = router({
  /**
   * List orders with filtering and pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        storeId: z.string().optional(),
        userId: z.string().optional(),
        status: OrderStatusSchema.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        includeDeleted: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderService = getOrderService();

      // Apply RBAC: Store staff can only see their store's orders
      let storeId = input.storeId;
      if (ctx.userSession?.storeId && !storeId) {
        storeId = ctx.userSession.storeId;
      } else if (ctx.userSession?.storeId && storeId !== ctx.userSession.storeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view orders from your assigned store",
        });
      }

      const result = await orderService.list({
        storeId,
        userId: input.userId,
        status: input.status as OrderStatus | undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        page: input.page,
        pageSize: input.pageSize,
        includeDeleted: input.includeDeleted,
      });

      return result;
    }),

  /**
   * Get order detail by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform((v) => BigInt(v)),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderService = getOrderService();
      const order = await orderService.detail(input.id);

      // RBAC: Check if user can access this order
      if (ctx.userSession?.storeId && order.storeId !== ctx.userSession.storeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this order",
        });
      }

      return order;
    }),

  /**
   * Create new order
   */
  create: createPermissionProcedure(["order:create"])
    .input(
      z.object({
        orderNumber: z.string().optional(),
        storeId: z.string(),
        userId: z.string().optional(),
        status: OrderStatusSchema.optional(),
        items: z.array(OrderItemSchema).min(1),
        deliveryAddress: z.any().optional(),
        notes: z.string().optional(),
        paymentMethod: z.string().optional(),
        deliveryFee: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderService = getOrderService();

      // RBAC: Store staff can only create orders for their store
      if (ctx.userSession?.storeId && input.storeId !== ctx.userSession.storeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create orders for your assigned store",
        });
      }

      const order = await orderService.create(
        {
          orderNumber: input.orderNumber,
          storeId: input.storeId,
          userId: input.userId,
          status: input.status as OrderStatus | undefined,
          items: input.items,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
          deliveryFee: input.deliveryFee,
        },
        ctx.userSession?.userId
      );

      // Log audit
      const auditService = getAuditService();
      await auditService.logAction({
        tableName: "orders",
        recordId: order.id.toString(),
        action: "INSERT",
        changes: { order },
        operatorId: ctx.userSession!.userId,
        operatorType: mapRoleToOperatorType(ctx.userSession!.role),
        operatorName: null,
        ipAddress: ctx.auditTrail.ipAddress,
        userAgent: ctx.auditTrail.userAgent,
        orgId: null,
      });

      return order;
    }),

  /**
   * Update order
   */
  update: createPermissionProcedure(["order:update"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform((v) => BigInt(v)),
        status: OrderStatusSchema.optional(),
        notes: z.string().optional(),
        deliveryAddress: z.any().optional(),
        paymentMethod: z.string().optional(),
        paymentStatus: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderService = getOrderService();

      // Check order exists and RBAC
      const existingOrder = await orderService.detail(input.id);
      if (
        ctx.userSession?.storeId &&
        existingOrder.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this order",
        });
      }

      const { id, ...updateData } = input;
      const updatedOrder = await orderService.update(
        id,
        {
          status: updateData.status as OrderStatus | undefined,
          notes: updateData.notes,
          deliveryAddress: updateData.deliveryAddress,
          paymentMethod: updateData.paymentMethod,
          paymentStatus: updateData.paymentStatus,
        },
        ctx.userSession?.userId
      );

      // Log audit
      const auditService = getAuditService();
      await auditService.logAction({
        tableName: "orders",
        recordId: id.toString(),
        action: "UPDATE",
        changes: {
          before: existingOrder,
          after: updatedOrder,
        },
        operatorId: ctx.userSession!.userId,
        operatorType: mapRoleToOperatorType(ctx.userSession!.role),
        operatorName: null,
        ipAddress: ctx.auditTrail.ipAddress,
        userAgent: ctx.auditTrail.userAgent,
        orgId: null,
      });

      return updatedOrder;
    }),

  /**
   * Change order status
   */
  changeStatus: createPermissionProcedure(["order:update"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform((v) => BigInt(v)),
        status: OrderStatusSchema,
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderService = getOrderService();

      // Check RBAC
      const existingOrder = await orderService.detail(input.id);
      if (
        ctx.userSession?.storeId &&
        existingOrder.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this order",
        });
      }

      const result = await orderService.changeStatus(
        input.id,
        input.status as OrderStatus,
        input.reason,
        ctx.userSession?.userId
      );

      // Log audit
      const auditService = getAuditService();
      await auditService.logAction({
        tableName: "orders",
        recordId: input.id.toString(),
        action: "UPDATE",
        changes: {
          status: {
            old: result.previousStatus,
            new: result.newStatus,
          },
          reason: input.reason,
        },
        operatorId: ctx.userSession!.userId,
        operatorType: mapRoleToOperatorType(ctx.userSession!.role),
        operatorName: null,
        ipAddress: ctx.auditTrail.ipAddress,
        userAgent: ctx.auditTrail.userAgent,
        orgId: null,
      });

      return result;
    }),

  /**
   * Soft delete order
   */
  remove: createPermissionProcedure(["order:delete"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform((v) => BigInt(v)),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderService = getOrderService();

      // Check RBAC
      const existingOrder = await orderService.detail(input.id);
      if (
        ctx.userSession?.storeId &&
        existingOrder.storeId !== ctx.userSession.storeId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this order",
        });
      }

      const deletedOrder = await orderService.remove(
        input.id,
        ctx.userSession?.userId
      );

      // Log audit
      const auditService = getAuditService();
      await auditService.logAction({
        tableName: "orders",
        recordId: input.id.toString(),
        action: "DELETE",
        changes: {
          deletedOrder,
          reason: input.reason,
        },
        operatorId: ctx.userSession!.userId,
        operatorType: mapRoleToOperatorType(ctx.userSession!.role),
        operatorName: null,
        ipAddress: ctx.auditTrail.ipAddress,
        userAgent: ctx.auditTrail.userAgent,
        orgId: null,
      });

      return deletedOrder;
    }),

  /**
   * Get order statistics
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
      const orderService = getOrderService();

      // Apply RBAC
      let storeId = input.storeId;
      if (ctx.userSession?.storeId && !storeId) {
        storeId = ctx.userSession.storeId;
      } else if (ctx.userSession?.storeId && storeId !== ctx.userSession.storeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view statistics from your assigned store",
        });
      }

      const stats = await orderService.getStatistics({
        storeId,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      });

      return stats;
    }),
});
