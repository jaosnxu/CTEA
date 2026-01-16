/**
 * Order Payment Service
 * 
 * Handles payment processing for orders:
 * - Payment initiation (placeholder for external integration)
 * - Payment status tracking
 * - Payment verification
 * - Payment history
 */

import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { TRPCError } from "@trpc/server";

export interface PaymentInitiateInput {
  orderId: string | bigint;
  paymentMethod: string;
  paymentProvider?: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentUpdateInput {
  paymentId: string | bigint;
  status: string;
  transactionId?: string;
  paidAt?: Date;
  failureReason?: string;
}

export class OrderPaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Initiate a payment (placeholder for external payment gateway integration)
   */
  async initiatePayment(
    input: PaymentInitiateInput,
    operatorId?: string
  ): Promise<any> {
    const orderId =
      typeof input.orderId === "bigint" ? input.orderId : BigInt(input.orderId);

    // Verify order exists
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.deletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot process payment for deleted order",
      });
    }

    // Validate amount matches order total
    const orderTotal = Number(order.totalAmount || 0);
    if (Math.abs(orderTotal - input.amount) > 0.01) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Payment amount does not match order total",
      });
    }

    // Create payment record
    const payment = await this.prisma.orderPayments.create({
      data: {
        orderId,
        paymentMethod: input.paymentMethod,
        paymentProvider: input.paymentProvider || "PLACEHOLDER",
        amount: input.amount,
        currency: input.currency || "RUB",
        status: "PENDING",
        metadata: input.metadata,
        createdBy: operatorId,
      },
    });

    // TODO: Integrate with actual payment gateway
    // This is a placeholder implementation
    // In production, you would:
    // 1. Call payment gateway API (Stripe, Alipay, WeChat Pay, etc.)
    // 2. Get transaction ID and redirect URL
    // 3. Return payment initiation data to client

    return {
      paymentId: payment.id,
      status: "PENDING",
      message: "Payment initiated (placeholder implementation)",
      // In real implementation, you would return:
      // redirectUrl, transactionId, qrCode, etc.
    };
  }

  /**
   * Update payment status (webhook callback handler)
   */
  async updatePaymentStatus(input: PaymentUpdateInput): Promise<any> {
    const paymentId =
      typeof input.paymentId === "bigint"
        ? input.paymentId
        : BigInt(input.paymentId);

    const payment = await this.prisma.orderPayments.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payment not found",
      });
    }

    // Update payment status
    const updatedPayment = await this.prisma.$transaction(async tx => {
      // Update payment
      const updated = await tx.orderPayments.update({
        where: { id: paymentId },
        data: {
          status: input.status,
          transactionId: input.transactionId,
          paidAt: input.paidAt,
          failureReason: input.failureReason,
          updatedAt: new Date(),
        },
      });

      // If payment completed, update order payment status
      if (input.status === "COMPLETED") {
        await tx.orders.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED", // Auto-confirm order on successful payment
            updatedAt: new Date(),
          },
        });
      } else if (input.status === "FAILED") {
        await tx.orders.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "FAILED",
            updatedAt: new Date(),
          },
        });
      }

      return updated;
    });

    return updatedPayment;
  }

  /**
   * Get payment history for an order
   */
  async getPaymentHistory(orderId: string | bigint) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    const payments = await this.prisma.orderPayments.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return payments;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string | bigint) {
    const id = typeof paymentId === "bigint" ? paymentId : BigInt(paymentId);

    const payment = await this.prisma.orderPayments.findUnique({
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

    if (!payment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payment not found",
      });
    }

    return payment;
  }

  /**
   * Cancel payment
   */
  async cancelPayment(
    paymentId: string | bigint,
    reason?: string
  ): Promise<any> {
    const id = typeof paymentId === "bigint" ? paymentId : BigInt(paymentId);

    const payment = await this.prisma.orderPayments.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Payment not found",
      });
    }

    if (["COMPLETED", "CANCELLED"].includes(payment.status)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot cancel payment in ${payment.status} status`,
      });
    }

    const updatedPayment = await this.prisma.orderPayments.update({
      where: { id },
      data: {
        status: "CANCELLED",
        failureReason: reason,
        updatedAt: new Date(),
      },
    });

    return updatedPayment;
  }
}

// Export singleton instance
export const orderPaymentService = new OrderPaymentService();

// Export for dependency injection
export function getOrderPaymentService(
  prisma?: PrismaClient
): OrderPaymentService {
  return prisma ? new OrderPaymentService(prisma) : orderPaymentService;
}
