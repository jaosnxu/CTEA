/**
 * Order Refund Service
 * 
 * Handles refund processing:
 * - Refund request creation
 * - Refund approval workflow
 * - Refund processing
 * - Refund history
 */

import { PrismaClient, RefundStatus } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { TRPCError } from "@trpc/server";

export interface RefundRequestInput {
  orderId: string | bigint;
  paymentId?: string | bigint;
  refundAmount: number;
  refundReason: string;
  refundMethod?: string;
  requestedBy?: string;
}

export interface RefundApprovalInput {
  refundId: string | bigint;
  approved: boolean;
  approvedBy: string;
  rejectionReason?: string;
  notes?: string;
}

export interface RefundProcessInput {
  refundId: string | bigint;
  transactionId?: string;
  processedBy: string;
  notes?: string;
}

export class OrderRefundService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Create refund request
   */
  async createRefundRequest(input: RefundRequestInput): Promise<any> {
    const orderId =
      typeof input.orderId === "bigint" ? input.orderId : BigInt(input.orderId);

    // Verify order exists
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    // Validate refund amount
    const orderTotal = Number(order.totalAmount || 0);
    if (input.refundAmount > orderTotal) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Refund amount exceeds order total",
      });
    }

    // Check if there are completed payments
    if (!order.payments || order.payments.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No completed payments found for this order",
      });
    }

    // Create refund request
    const refund = await this.prisma.orderRefunds.create({
      data: {
        orderId,
        paymentId: input.paymentId
          ? typeof input.paymentId === "bigint"
            ? input.paymentId
            : BigInt(input.paymentId)
          : undefined,
        refundAmount: input.refundAmount,
        refundReason: input.refundReason,
        refundMethod: input.refundMethod || "ORIGINAL",
        status: RefundStatus.PENDING,
        requestedBy: input.requestedBy,
      },
    });

    return refund;
  }

  /**
   * Approve or reject refund
   */
  async approveRefund(input: RefundApprovalInput): Promise<any> {
    const refundId =
      typeof input.refundId === "bigint"
        ? input.refundId
        : BigInt(input.refundId);

    const refund = await this.prisma.orderRefunds.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Refund request not found",
      });
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot approve refund in ${refund.status} status`,
      });
    }

    const updatedRefund = await this.prisma.orderRefunds.update({
      where: { id: refundId },
      data: {
        status: input.approved ? RefundStatus.APPROVED : RefundStatus.REJECTED,
        approvedBy: input.approvedBy,
        approvedAt: new Date(),
        rejectionReason: input.rejectionReason,
        notes: input.notes,
      },
    });

    return updatedRefund;
  }

  /**
   * Process approved refund (placeholder for payment gateway integration)
   */
  async processRefund(input: RefundProcessInput): Promise<any> {
    const refundId =
      typeof input.refundId === "bigint"
        ? input.refundId
        : BigInt(input.refundId);

    const refund = await this.prisma.orderRefunds.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Refund request not found",
      });
    }

    if (refund.status !== RefundStatus.APPROVED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only approved refunds can be processed",
      });
    }

    // TODO: Integrate with actual payment gateway for refund processing
    // This is a placeholder implementation
    // Supported gateways: Stripe, Alipay, WeChat Pay, Bank Transfer
    // Requirements: Gateway-specific credentials, API integration, webhook handlers

    const DECIMAL_PRECISION = 0.01; // Threshold for amount comparison
    const updatedRefund = await this.prisma.$transaction(async tx => {
      // Update refund status
      const updated = await tx.orderRefunds.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.COMPLETED,
          processedBy: input.processedBy,
          processedAt: new Date(),
          completedAt: new Date(),
          transactionId: input.transactionId || `REF-${Date.now()}`,
          notes: input.notes,
        },
      });

      // Update order status to REFUNDED if full refund
      const orderTotal = Number(refund.order.totalAmount || 0);
      const refundAmount = Number(refund.refundAmount);

      if (Math.abs(orderTotal - refundAmount) < DECIMAL_PRECISION) {
        await tx.orders.update({
          where: { id: refund.orderId },
          data: {
            status: "REFUNDED",
            paymentStatus: "REFUNDED",
            updatedAt: new Date(),
          },
        });
      }

      return updated;
    });

    return updatedRefund;
  }

  /**
   * Get refund history for an order
   */
  async getRefundHistory(orderId: string | bigint) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    const refunds = await this.prisma.orderRefunds.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return refunds;
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId: string | bigint) {
    const id = typeof refundId === "bigint" ? refundId : BigInt(refundId);

    const refund = await this.prisma.orderRefunds.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    if (!refund) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Refund not found",
      });
    }

    return refund;
  }

  /**
   * List all refunds with filtering
   */
  async listRefunds(filter: {
    status?: RefundStatus;
    orderId?: string | bigint;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { status, orderId, startDate, endDate, page = 1, pageSize = 20 } = filter;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (orderId) {
      where.orderId = typeof orderId === "bigint" ? orderId : BigInt(orderId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [refunds, total] = await Promise.all([
      this.prisma.orderRefunds.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
            },
          },
        },
      }),
      this.prisma.orderRefunds.count({ where }),
    ]);

    return {
      refunds,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}

// Export singleton instance
export const orderRefundService = new OrderRefundService();

// Export for dependency injection
export function getOrderRefundService(
  prisma?: PrismaClient
): OrderRefundService {
  return prisma ? new OrderRefundService(prisma) : orderRefundService;
}
