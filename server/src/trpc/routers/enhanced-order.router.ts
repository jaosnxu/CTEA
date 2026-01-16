/**
 * Enhanced Order Router - Advanced Features
 * 
 * Provides comprehensive order management with:
 * - Advanced multi-criteria filtering
 * - Order export (CSV/Excel)
 * - Batch operations (bulk status update, bulk delete)
 * - Payment processing
 * - Refund management
 * - After-sales service
 * - Order lifecycle logs
 */

import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { OrderStatus, RefundStatus, Priority } from "@prisma/client";
import { getOrderExportService } from "../../services/order-export.service";
import { getOrderBatchService } from "../../services/order-batch.service";
import { getOrderPaymentService } from "../../services/order-payment.service";
import { getOrderRefundService } from "../../services/order-refund.service";
import { getOrderAfterSalesService } from "../../services/order-after-sales.service";

/**
 * Enhanced Order Router with Advanced Features
 */
export const enhancedOrderRouter = router({
  /**
   * Advanced order filtering with multi-criteria search
   */
  advancedSearch: protectedProcedure
    .input(
      z.object({
        // Search criteria
        orderNumber: z.string().optional(),
        customerPhone: z.string().optional(),
        customerName: z.string().optional(),
        storeId: z.string().optional(),
        status: z.nativeEnum(OrderStatus).optional(),
        paymentStatus: z.string().optional(),
        
        // Date range
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        
        // Amount range
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
        
        // Pagination
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        
        // Sorting
        sortBy: z.enum(["createdAt", "totalAmount", "status"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        deletedAt: null,
      };

      // Apply RBAC: Store staff can only see their store's orders
      if (ctx.userSession?.storeId) {
        where.storeId = ctx.userSession.storeId;
      } else if (input.storeId) {
        where.storeId = input.storeId;
      }

      // Order number search
      if (input.orderNumber) {
        where.orderNumber = { contains: input.orderNumber };
      }

      // Customer phone search
      if (input.customerPhone) {
        where.user = {
          phone: { contains: input.customerPhone },
        };
      }

      // Customer name search
      if (input.customerName) {
        where.user = {
          ...where.user,
          nickname: { contains: input.customerName },
        };
      }

      // Status filter
      if (input.status) {
        where.status = input.status;
      }

      // Payment status filter
      if (input.paymentStatus) {
        where.paymentStatus = input.paymentStatus;
      }

      // Date range filter
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) {
          where.createdAt.gte = new Date(input.startDate);
        }
        if (input.endDate) {
          where.createdAt.lte = new Date(input.endDate);
        }
      }

      // Amount range filter
      if (input.minAmount !== undefined || input.maxAmount !== undefined) {
        where.totalAmount = {};
        if (input.minAmount !== undefined) {
          where.totalAmount.gte = input.minAmount;
        }
        if (input.maxAmount !== undefined) {
          where.totalAmount.lte = input.maxAmount;
        }
      }

      // Build order by clause
      const orderBy: any = {};
      if (input.sortBy) {
        orderBy[input.sortBy] = input.sortOrder || "desc";
      } else {
        orderBy.createdAt = "desc";
      }

      // Execute query
      const [orders, total] = await Promise.all([
        ctx.prisma.orders.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy,
          include: {
            store: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            user: {
              select: {
                id: true,
                phone: true,
                nickname: true,
              },
            },
            orderItems: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                unitPrice: true,
                subtotal: true,
              },
            },
          },
        }),
        ctx.prisma.orders.count({ where }),
      ]);

      return {
        orders,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  /**
   * Export orders to CSV
   */
  exportCSV: createPermissionProcedure(["order:export"])
    .input(
      z.object({
        filters: z.object({
          storeId: z.string().optional(),
          status: z.nativeEnum(OrderStatus).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional(),
        orderIds: z.array(z.string()).optional(),
        fields: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exportService = getOrderExportService();

      // Apply RBAC
      const filters = input.filters || {};
      if (ctx.userSession?.storeId) {
        filters.storeId = ctx.userSession.storeId;
      }

      const result = await exportService.exportToCSV({
        format: "csv",
        filters: {
          ...filters,
          startDate: filters.startDate ? new Date(filters.startDate) : undefined,
          endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        },
        orderIds: input.orderIds?.map(id => BigInt(id)),
        fields: input.fields,
      });

      return result;
    }),

  /**
   * Export orders to Excel
   */
  exportExcel: createPermissionProcedure(["order:export"])
    .input(
      z.object({
        filters: z.object({
          storeId: z.string().optional(),
          status: z.nativeEnum(OrderStatus).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional(),
        orderIds: z.array(z.string()).optional(),
        fields: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exportService = getOrderExportService();

      // Apply RBAC
      const filters = input.filters || {};
      if (ctx.userSession?.storeId) {
        filters.storeId = ctx.userSession.storeId;
      }

      const result = await exportService.exportToExcel({
        format: "excel",
        filters: {
          ...filters,
          startDate: filters.startDate ? new Date(filters.startDate) : undefined,
          endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        },
        orderIds: input.orderIds?.map(id => BigInt(id)),
        fields: input.fields,
      });

      return result;
    }),

  /**
   * Batch update order status
   */
  batchUpdateStatus: createPermissionProcedure(["order:update"])
    .input(
      z.object({
        orderIds: z.array(z.string()).min(1),
        newStatus: z.nativeEnum(OrderStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const batchService = getOrderBatchService();

      const result = await batchService.batchUpdateStatus(
        {
          orderIds: input.orderIds.map(id => BigInt(id)),
          newStatus: input.newStatus,
          reason: input.reason,
          operatorId: ctx.userSession?.userId,
          operatorRole: ctx.userSession?.role,
        },
        {
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
        }
      );

      return result;
    }),

  /**
   * Batch soft delete orders
   */
  batchDelete: createPermissionProcedure(["order:delete"])
    .input(
      z.object({
        orderIds: z.array(z.string()).min(1),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const batchService = getOrderBatchService();

      const result = await batchService.batchDelete(
        {
          orderIds: input.orderIds.map(id => BigInt(id)),
          reason: input.reason,
          operatorId: ctx.userSession?.userId,
          operatorRole: ctx.userSession?.role,
        },
        {
          ipAddress: ctx.auditTrail.ipAddress,
          userAgent: ctx.auditTrail.userAgent,
        }
      );

      return result;
    }),

  /**
   * Get order lifecycle logs
   */
  getOrderLogs: protectedProcedure
    .input(
      z.object({
        orderId: z.string().transform(v => BigInt(v)),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const [logs, total] = await Promise.all([
        ctx.prisma.orderLifecycleLogs.findMany({
          where: { orderId: input.orderId },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.orderLifecycleLogs.count({
          where: { orderId: input.orderId },
        }),
      ]);

      return {
        logs,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  /**
   * Payment operations
   */
  payment: router({
    initiate: createPermissionProcedure(["order:payment"])
      .input(
        z.object({
          orderId: z.string(),
          paymentMethod: z.string(),
          paymentProvider: z.string().optional(),
          amount: z.number(),
          currency: z.string().optional(),
          metadata: z.record(z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const paymentService = getOrderPaymentService();
        return paymentService.initiatePayment(input, ctx.userSession?.userId);
      }),

    updateStatus: createPermissionProcedure(["order:payment"])
      .input(
        z.object({
          paymentId: z.string(),
          status: z.string(),
          transactionId: z.string().optional(),
          paidAt: z.string().optional(),
          failureReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const paymentService = getOrderPaymentService();
        return paymentService.updatePaymentStatus({
          paymentId: input.paymentId,
          status: input.status,
          transactionId: input.transactionId,
          paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
          failureReason: input.failureReason,
        });
      }),

    getHistory: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ ctx, input }) => {
        const paymentService = getOrderPaymentService();
        return paymentService.getPaymentHistory(input.orderId);
      }),
  }),

  /**
   * Refund operations
   */
  refund: router({
    create: createPermissionProcedure(["order:refund"])
      .input(
        z.object({
          orderId: z.string(),
          paymentId: z.string().optional(),
          refundAmount: z.number(),
          refundReason: z.string(),
          refundMethod: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const refundService = getOrderRefundService();
        return refundService.createRefundRequest({
          ...input,
          requestedBy: ctx.userSession?.userId,
        });
      }),

    approve: createPermissionProcedure(["order:refund:approve"])
      .input(
        z.object({
          refundId: z.string(),
          approved: z.boolean(),
          rejectionReason: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const refundService = getOrderRefundService();
        return refundService.approveRefund({
          ...input,
          approvedBy: ctx.userSession!.userId,
        });
      }),

    process: createPermissionProcedure(["order:refund:process"])
      .input(
        z.object({
          refundId: z.string(),
          transactionId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const refundService = getOrderRefundService();
        return refundService.processRefund({
          ...input,
          processedBy: ctx.userSession!.userId,
        });
      }),

    list: protectedProcedure
      .input(
        z.object({
          status: z.nativeEnum(RefundStatus).optional(),
          orderId: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const refundService = getOrderRefundService();
        return refundService.listRefunds({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),
  }),

  /**
   * After-sales operations
   */
  afterSales: router({
    create: protectedProcedure
      .input(
        z.object({
          orderId: z.string(),
          requestType: z.string(),
          description: z.string(),
          images: z.array(z.string()).optional(),
          priority: z.nativeEnum(Priority).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const afterSalesService = getOrderAfterSalesService();
        return afterSalesService.createRequest({
          ...input,
          createdBy: ctx.userSession?.userId,
        });
      }),

    update: createPermissionProcedure(["order:aftersales:update"])
      .input(
        z.object({
          id: z.string(),
          status: z.string().optional(),
          assignedTo: z.string().optional(),
          resolution: z.string().optional(),
          notes: z.string().optional(),
          customerSatisfaction: z.number().int().min(1).max(5).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const afterSalesService = getOrderAfterSalesService();
        return afterSalesService.updateRequest({
          ...input,
          updatedBy: ctx.userSession?.userId,
        });
      }),

    list: protectedProcedure
      .input(
        z.object({
          orderId: z.string().optional(),
          requestType: z.string().optional(),
          status: z.string().optional(),
          priority: z.nativeEnum(Priority).optional(),
          assignedTo: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const afterSalesService = getOrderAfterSalesService();
        return afterSalesService.listRequests({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const afterSalesService = getOrderAfterSalesService();
        return afterSalesService.getRequestById(input.id);
      }),

    getStatistics: protectedProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const afterSalesService = getOrderAfterSalesService();
        return afterSalesService.getStatistics({
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),
  }),
});
