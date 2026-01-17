/**
 * Order Lifecycle Log Service
 *
 * Provides audit logging for order operations with SHA-256 hash chain integrity.
 * Each log entry is linked to the previous entry via prevHash, creating an
 * immutable audit trail that can be verified for tampering.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import crypto from "crypto";

export interface OrderLifecycleLogInput {
  orderId: bigint;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  operatorId?: string | null;
  operatorType?: string | null;
  operatorName?: string | null;
  changes?: Prisma.InputJsonValue | null;
  notes?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class OrderLifecycleLogService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Create an order lifecycle log entry with SHA-256 hash chain
   */
  async createLog(input: OrderLifecycleLogInput): Promise<void> {
    try {
      // Get the last log entry for this order to link the chain
      const lastLog = await this.prisma.orderLifecycleLogs.findFirst({
        where: { orderId: input.orderId },
        orderBy: { id: "desc" },
        select: { sha256Hash: true },
      });

      const prevHash = lastLog?.sha256Hash || null;

      // Calculate SHA-256 hash for this entry
      const hashInput = JSON.stringify({
        orderId: input.orderId.toString(),
        action: input.action,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        operatorId: input.operatorId,
        changes: input.changes,
        prevHash: prevHash || "GENESIS",
        timestamp: new Date().toISOString(),
      });

      const sha256Hash = crypto
        .createHash("sha256")
        .update(hashInput)
        .digest("hex");

      // Create the log entry
      await this.prisma.orderLifecycleLogs.create({
        data: {
          orderId: input.orderId,
          action: input.action,
          previousStatus: input.previousStatus,
          newStatus: input.newStatus,
          operatorId: input.operatorId,
          operatorType: input.operatorType,
          operatorName: input.operatorName,
          changes: input.changes ?? Prisma.DbNull,
          notes: input.notes,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          prevHash,
          sha256Hash,
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid blocking the main operation
      console.error("Failed to create order lifecycle log:", error);
    }
  }

  /**
   * Log order creation
   */
  async logOrderCreation(
    orderId: bigint,
    orderData: Prisma.InputJsonValue,
    operatorId?: string,
    operatorType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      orderId,
      action: "CREATE",
      newStatus: "PENDING",
      operatorId,
      operatorType,
      changes: orderData,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log order status change
   */
  async logStatusChange(
    orderId: bigint,
    previousStatus: string,
    newStatus: string,
    reason?: string,
    operatorId?: string,
    operatorType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      orderId,
      action: "STATUS_CHANGE",
      previousStatus,
      newStatus,
      operatorId,
      operatorType,
      changes: { reason },
      notes: reason,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log order update
   */
  async logOrderUpdate(
    orderId: bigint,
    changes: Prisma.InputJsonValue,
    operatorId?: string,
    operatorType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      orderId,
      action: "UPDATE",
      operatorId,
      operatorType,
      changes,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log order deletion (soft delete)
   */
  async logOrderDeletion(
    orderId: bigint,
    reason?: string,
    operatorId?: string,
    operatorType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createLog({
      orderId,
      action: "DELETE",
      operatorId,
      operatorType,
      changes: { reason, deletedAt: new Date().toISOString() },
      notes: reason,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Verify the audit chain integrity for an order
   */
  async verifyOrderAuditChain(orderId: bigint): Promise<{
    valid: boolean;
    totalRecords: number;
    brokenLinks: Array<{ id: bigint; error: string }>;
  }> {
    const logs = await this.prisma.orderLifecycleLogs.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
    });

    const brokenLinks: Array<{ id: bigint; error: string }> = [];
    let expectedPrevHash: string | null = null;

    for (const log of logs) {
      // Check if prevHash matches expected
      if (log.prevHash !== expectedPrevHash) {
        brokenLinks.push({
          id: log.id,
          error: `Previous hash mismatch. Expected: ${expectedPrevHash}, Got: ${log.prevHash}`,
        });
      }

      // Verify SHA-256 hash
      const verifyHashInput: string = JSON.stringify({
        orderId: log.orderId.toString(),
        action: log.action,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        operatorId: log.operatorId,
        changes: log.changes,
        prevHash: log.prevHash || "GENESIS",
        timestamp: log.createdAt.toISOString(),
      });

      const expectedHash: string = crypto
        .createHash("sha256")
        .update(verifyHashInput)
        .digest("hex");

      if (log.sha256Hash !== expectedHash) {
        brokenLinks.push({
          id: log.id,
          error: `Hash verification failed. Expected: ${expectedHash}, Got: ${log.sha256Hash}`,
        });
      }

      expectedPrevHash = log.sha256Hash;
    }

    return {
      valid: brokenLinks.length === 0,
      totalRecords: logs.length,
      brokenLinks,
    };
  }
}

// Singleton instance
let orderLifecycleLogServiceInstance: OrderLifecycleLogService | null = null;

export function getOrderLifecycleLogService(
  prisma?: PrismaClient
): OrderLifecycleLogService {
  if (prisma) {
    return new OrderLifecycleLogService(prisma);
  }
  if (!orderLifecycleLogServiceInstance) {
    orderLifecycleLogServiceInstance = new OrderLifecycleLogService();
  }
  return orderLifecycleLogServiceInstance;
}

export default OrderLifecycleLogService;
