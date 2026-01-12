/**
 * Audit Log Service
 * 
 * Implements SHA-256 chain-based audit logging as per M3.4-GLOBAL-COMP-002
 * 
 * Features:
 * - SHA-256 chain validation
 * - Event ID generation
 * - Automatic previous hash linking
 * - Immutable append-only logging
 */

import { PrismaClient, AuditAction, OperatorType } from '@prisma/client';
import crypto from 'crypto';
import { getPrismaClient } from '../db/prisma';

export interface CreateAuditLogInput {
  orgId?: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  diffBefore?: object;
  diffAfter?: object;
  operatorId?: string;
  operatorType?: OperatorType;
  operatorName?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  requestId?: string;
}

export interface AuditChainValidationResult {
  isValid: boolean;
  totalRecords: number;
  errorRecords: Array<{
    id: bigint;
    eventId: string | null;
    error: string;
  }>;
}

export class AuditLogService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new audit log entry with SHA-256 chain
   */
  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    try {
      // Get the last audit log record to get previous hash
      const lastRecord = await this.prisma.auditLog.findFirst({
        orderBy: { id: 'desc' },
        select: { sha256Hash: true }
      });

      const previousHash = lastRecord?.sha256Hash || null;
      const eventId = this.generateEventId(input.requestId);
      const createdAt = new Date();

      // Calculate SHA-256 hash for current record
      const sha256Hash = this.calculateHash({
        eventId,
        tableName: input.tableName,
        recordId: input.recordId,
        action: input.action,
        diffAfter: input.diffAfter,
        previousHash,
        createdAt
      });

      // Insert audit log record
      await this.prisma.auditLog.create({
        data: {
          orgId: input.orgId,
          tableName: input.tableName,
          recordId: input.recordId,
          action: input.action,
          diffBefore: input.diffBefore as any,
          diffAfter: input.diffAfter as any,
          operatorId: input.operatorId,
          operatorType: input.operatorType,
          operatorName: input.operatorName,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          reason: input.reason,
          eventId,
          previousHash,
          sha256Hash,
          createdAt
        }
      });

      console.log(`✅ Audit log created: ${eventId} (table: ${input.tableName}, record: ${input.recordId})`);
    } catch (error) {
      console.error('❌ Failed to create audit log:', error);
      // Don't throw error to prevent breaking main business logic
      // Audit logging should be non-blocking
    }
  }

  /**
   * Generate unique event ID
   * Format: EVT-YYYYMMDD-NNNNNN or use provided request ID
   */
  private generateEventId(requestId?: string): string {
    if (requestId) {
      return `EVT-${requestId}`;
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `EVT-${date}-${sequence}`;
  }

  /**
   * Calculate SHA-256 hash for audit record
   */
  private calculateHash(data: {
    eventId: string;
    tableName: string;
    recordId: string;
    action: AuditAction;
    diffAfter?: object;
    previousHash: string | null;
    createdAt: Date;
  }): string {
    const hashInput = {
      eventId: data.eventId,
      tableName: data.tableName,
      recordId: data.recordId,
      action: data.action,
      diffAfter: data.diffAfter || null,
      previousHash: data.previousHash || 'GENESIS',
      createdAt: data.createdAt.toISOString()
    };

    const hashString = JSON.stringify(hashInput);
    const hash = crypto.createHash('sha256');
    hash.update(hashString);
    return hash.digest('hex');
  }

  /**
   * Validate entire audit chain
   */
  async validateAuditChain(options?: {
    fromDate?: Date;
    toDate?: Date;
    orgId?: string;
  }): Promise<AuditChainValidationResult> {
    const result: AuditChainValidationResult = {
      isValid: true,
      totalRecords: 0,
      errorRecords: []
    };

    try {
      // Build query conditions
      const where: any = {};
      if (options?.fromDate || options?.toDate) {
        where.createdAt = {};
        if (options.fromDate) {
          where.createdAt.gte = options.fromDate;
        }
        if (options.toDate) {
          where.createdAt.lte = options.toDate;
        }
      }
      if (options?.orgId) {
        where.orgId = options.orgId;
      }

      // Fetch all audit logs in order
      const records = await this.prisma.auditLog.findMany({
        where,
        orderBy: { id: 'asc' }
      });

      result.totalRecords = records.length;

      let previousHash: string | null = null;

      for (const record of records) {
        // Verify previous hash matches
        if (record.previousHash !== previousHash) {
          result.isValid = false;
          result.errorRecords.push({
            id: record.id,
            eventId: record.eventId,
            error: `Previous hash mismatch: expected ${previousHash}, got ${record.previousHash}`
          });
        }

        // Recalculate and verify current hash
        const calculatedHash = this.calculateHash({
          eventId: record.eventId || '',
          tableName: record.tableName,
          recordId: record.recordId,
          action: record.action,
          diffAfter: record.diffAfter as object,
          previousHash: record.previousHash,
          createdAt: record.createdAt
        });

        if (calculatedHash !== record.sha256Hash) {
          result.isValid = false;
          result.errorRecords.push({
            id: record.id,
            eventId: record.eventId,
            error: `Hash mismatch: expected ${calculatedHash}, got ${record.sha256Hash}`
          });
        }

        previousHash = record.sha256Hash;
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to validate audit chain:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific record
   */
  async getAuditLogsForRecord(tableName: string, recordId: string): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        tableName,
        recordId
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get audit logs for a specific organization
   */
  async getAuditLogsForOrg(orgId: string, options?: {
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<any[]> {
    const where: any = { orgId };
    
    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) {
        where.createdAt.gte = options.fromDate;
      }
      if (options.toDate) {
        where.createdAt.lte = options.toDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0
    });
  }

  /**
   * Register a special audit event (like M3.4-GLOBAL-COMP-002A-PH3-INIT)
   */
  async registerAuditEvent(eventId: string, data: {
    tableName: string;
    recordId: string;
    action: AuditAction;
    diffAfter?: object;
    operatorType?: OperatorType;
    operatorName?: string;
    reason?: string;
  }): Promise<void> {
    // Get the last audit log record
    const lastRecord = await this.prisma.auditLog.findFirst({
      orderBy: { id: 'desc' },
      select: { sha256Hash: true }
    });

    const previousHash = lastRecord?.sha256Hash || null;
    const createdAt = new Date();

    // Calculate SHA-256 hash
    const sha256Hash = this.calculateHash({
      eventId,
      tableName: data.tableName,
      recordId: data.recordId,
      action: data.action,
      diffAfter: data.diffAfter,
      previousHash,
      createdAt
    });

    // Insert audit log record
    await this.prisma.auditLog.create({
      data: {
        tableName: data.tableName,
        recordId: data.recordId,
        action: data.action,
        diffAfter: data.diffAfter as any,
        operatorType: data.operatorType || 'SYSTEM',
        operatorName: data.operatorName || 'TEA Internal Audit Team',
        reason: data.reason,
        eventId,
        previousHash,
        sha256Hash,
        createdAt
      }
    });

    console.log(`✅ Audit event registered: ${eventId}`);
  }
}

/**
 * Singleton instance
 */
let auditLogServiceInstance: AuditLogService | null = null;

/**
 * Get AuditLogService singleton
 */
export function getAuditLogService(): AuditLogService {
  if (!auditLogServiceInstance) {
    const prisma = getPrismaClient();
    auditLogServiceInstance = new AuditLogService(prisma);
  }
  return auditLogServiceInstance;
}
