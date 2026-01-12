/**
 * Audit Service
 *
 * Provides standardized audit logging functionality with SHA-256 hash chain
 */

import { getPrismaClient } from "../db/prisma";
import {
  OperatorType as PrismaOperatorType,
  AuditAction as PrismaAuditAction,
} from "@prisma/client";
import crypto from "crypto";

export type OperatorType = PrismaOperatorType;
export type AuditAction = PrismaAuditAction;

export interface AuditLogParams {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changes?: any;
  diffBefore?: any;
  diffAfter?: any;
  operatorId?: string | null;
  operatorType?: OperatorType | null;
  operatorName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  orgId?: string | null;
  requestId?: string;
}

export interface LogActionParams {
  tableName: string;
  recordId: string;
  action: AuditAction;
  changes?: any;
  operatorId?: string | null;
  operatorType?: OperatorType | null;
  operatorName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  orgId?: string | null;
}

class AuditService {
  private prisma = getPrismaClient();

  /**
   * Create audit log with SHA-256 hash chain
   */
  async createAuditLog(params: AuditLogParams): Promise<void> {
    try {
      const {
        tableName,
        recordId,
        action,
        changes,
        diffBefore,
        diffAfter,
        operatorId,
        operatorType,
        operatorName,
        ipAddress,
        userAgent,
        orgId,
        requestId,
      } = params;

      // Get the last audit log to link the chain
      const lastLog = await this.prisma.auditLog.findFirst({
        orderBy: { id: "desc" },
        select: { sha256Hash: true },
      });

      const previousHash = lastLog?.sha256Hash || null;

      // Generate event ID
      const eventId =
        requestId ||
        `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate SHA-256 hash
      const hashInput = JSON.stringify({
        eventId,
        tableName,
        recordId,
        action,
        previousHash,
        timestamp: new Date().toISOString(),
      });
      const sha256Hash = crypto
        .createHash("sha256")
        .update(hashInput)
        .digest("hex");

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          eventId,
          tableName,
          recordId,
          action,
          diffBefore: diffBefore || changes || null,
          diffAfter: diffAfter || changes || null,
          operatorId,
          operatorType,
          operatorName,
          ipAddress,
          userAgent,
          orgId,
          previousHash,
          sha256Hash,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid blocking the main operation
      console.error("[AuditService] Failed to create audit log:", error);
    }
  }

  /**
   * Compatibility method for logAction calls
   * Maps to createAuditLog with appropriate parameters
   */
  async logAction(params: LogActionParams): Promise<void> {
    return this.createAuditLog({
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      changes: params.changes,
      operatorId: params.operatorId,
      operatorType: params.operatorType,
      operatorName: params.operatorName,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      orgId: params.orgId,
    });
  }

  /**
   * Verify audit chain integrity
   */
  async verifyChain(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    valid: boolean;
    totalRecords: number;
    brokenLinks: Array<{ id: bigint; eventId: string; reason: string }>;
  }> {
    const where: any = {};
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        eventId: true,
        tableName: true,
        recordId: true,
        action: true,
        previousHash: true,
        sha256Hash: true,
        createdAt: true,
      },
    });

    const brokenLinks: Array<{ id: bigint; eventId: string; reason: string }> =
      [];
    let previousHash: string | null = null;

    for (const log of logs) {
      // Check if previousHash matches
      if (log.previousHash !== previousHash) {
                brokenLinks.push({
                  id: log.id,
                  eventId: log.eventId ?? "",
                  reason: `Previous hash mismatch. Expected: ${previousHash}, Got: ${log.previousHash}`,
                });
      }

            // Verify SHA-256 hash
            const hashInput: string = JSON.stringify({
              eventId: log.eventId,
              tableName: log.tableName,
              recordId: log.recordId,
              action: log.action,
              previousHash: log.previousHash,
              timestamp: log.createdAt.toISOString(),
            });
            const expectedHash: string = crypto
              .createHash("sha256")
              .update(hashInput)
              .digest("hex");

            if (log.sha256Hash !== expectedHash) {
              brokenLinks.push({
                id: log.id,
                eventId: log.eventId ?? "",
                reason: `Hash verification failed. Expected: ${expectedHash}, Got: ${log.sha256Hash}`,
              });
            }

            previousHash = log.sha256Hash ?? null;
    }

    return {
      valid: brokenLinks.length === 0,
      totalRecords: logs.length,
      brokenLinks,
    };
  }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

// Alias for compatibility
export const getAuditLogService = getAuditService;

export default AuditService;
