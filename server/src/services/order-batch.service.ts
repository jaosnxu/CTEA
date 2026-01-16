/**
 * Order Batch Operations Service
 * 
 * Provides batch operations for order management:
 * - Bulk status updates
 * - Bulk soft delete
 * - Bulk restore
 * - Batch validation
 */

import { PrismaClient, OrderStatus } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { TRPCError } from "@trpc/server";
import { getAuditService } from "./audit-service";
import { mapRoleToOperatorType } from "../utils/role-mapper";

export interface BatchOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ orderId: string; error: string }>;
}

export interface BatchStatusUpdateInput {
  orderIds: (string | bigint)[];
  newStatus: OrderStatus;
  reason?: string;
  operatorId?: string;
  operatorRole?: string;
}

export interface BatchDeleteInput {
  orderIds: (string | bigint)[];
  reason?: string;
  operatorId?: string;
  operatorRole?: string;
}

export class OrderBatchService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Batch update order status
   */
  async batchUpdateStatus(
    input: BatchStatusUpdateInput,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const auditService = getAuditService();

    for (const orderId of input.orderIds) {
      try {
        const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

        // Check if order exists
        const order = await this.prisma.orders.findUnique({
          where: { id },
        });

        if (!order) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Order not found",
          });
          continue;
        }

        if (order.deletedAt) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Cannot update deleted order",
          });
          continue;
        }

        // Validate status transition
        if (!this.isValidStatusTransition(order.status, input.newStatus)) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: `Invalid status transition from ${order.status} to ${input.newStatus}`,
          });
          continue;
        }

        // Update status in transaction
        await this.prisma.$transaction(async tx => {
          // Update order
          await tx.orders.update({
            where: { id },
            data: {
              status: input.newStatus,
              updatedBy: input.operatorId,
              updatedAt: new Date(),
            },
          });

          // Log to audit
          await auditService.logAction({
            tableName: "orders",
            recordId: id.toString(),
            action: "UPDATE",
            changes: {
              status: {
                old: order.status,
                new: input.newStatus,
              },
              reason: input.reason,
              batchOperation: true,
            },
            operatorId: input.operatorId || "SYSTEM",
            operatorType: input.operatorRole
              ? mapRoleToOperatorType(input.operatorRole)
              : "SYSTEM",
            operatorName: null,
            ipAddress: auditContext?.ipAddress || null,
            userAgent: auditContext?.userAgent || null,
            orgId: null,
          });
        });

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          orderId: orderId.toString(),
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    return result;
  }

  /**
   * Batch soft delete orders
   */
  async batchDelete(
    input: BatchDeleteInput,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const auditService = getAuditService();

    for (const orderId of input.orderIds) {
      try {
        const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

        // Check if order exists
        const order = await this.prisma.orders.findUnique({
          where: { id },
        });

        if (!order) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Order not found",
          });
          continue;
        }

        if (order.deletedAt) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Order already deleted",
          });
          continue;
        }

        // Soft delete in transaction
        await this.prisma.$transaction(async tx => {
          await tx.orders.update({
            where: { id },
            data: {
              deletedAt: new Date(),
              updatedBy: input.operatorId,
              updatedAt: new Date(),
            },
          });

          // Log to audit
          await auditService.logAction({
            tableName: "orders",
            recordId: id.toString(),
            action: "DELETE",
            changes: {
              deletedAt: new Date(),
              reason: input.reason,
              batchOperation: true,
            },
            operatorId: input.operatorId || "SYSTEM",
            operatorType: input.operatorRole
              ? mapRoleToOperatorType(input.operatorRole)
              : "SYSTEM",
            operatorName: null,
            ipAddress: auditContext?.ipAddress || null,
            userAgent: auditContext?.userAgent || null,
            orgId: null,
          });
        });

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          orderId: orderId.toString(),
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    return result;
  }

  /**
   * Batch restore soft-deleted orders
   */
  async batchRestore(
    input: BatchDeleteInput,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    const auditService = getAuditService();

    for (const orderId of input.orderIds) {
      try {
        const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

        // Check if order exists
        const order = await this.prisma.orders.findUnique({
          where: { id },
        });

        if (!order) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Order not found",
          });
          continue;
        }

        if (!order.deletedAt) {
          result.failureCount++;
          result.errors.push({
            orderId: orderId.toString(),
            error: "Order is not deleted",
          });
          continue;
        }

        // Restore in transaction
        await this.prisma.$transaction(async tx => {
          await tx.orders.update({
            where: { id },
            data: {
              deletedAt: null,
              updatedBy: input.operatorId,
              updatedAt: new Date(),
            },
          });

          // Log to audit
          await auditService.logAction({
            tableName: "orders",
            recordId: id.toString(),
            action: "UPDATE",
            changes: {
              deletedAt: null,
              reason: "Restored",
              batchOperation: true,
            },
            operatorId: input.operatorId || "SYSTEM",
            operatorType: input.operatorRole
              ? mapRoleToOperatorType(input.operatorRole)
              : "SYSTEM",
            operatorName: null,
            ipAddress: auditContext?.ipAddress || null,
            userAgent: auditContext?.userAgent || null,
            orgId: null,
          });
        });

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          orderId: orderId.toString(),
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    return result;
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [
        OrderStatus.DELIVERING,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    return allowedStatuses.includes(newStatus);
  }
}

// Export singleton instance
export const orderBatchService = new OrderBatchService();

// Export for dependency injection
export function getOrderBatchService(
  prisma?: PrismaClient
): OrderBatchService {
  return prisma ? new OrderBatchService(prisma) : orderBatchService;
}
