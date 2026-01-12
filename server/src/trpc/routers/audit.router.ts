/**
 * CHUTEA tRPC Router - Audit Log Management
 *
 * 审计链与哈希验证模块
 * - 审计日志查询
 * - 审计链验证
 * - SHA-256 哈希校验
 */

import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { mapRoleToOperatorType } from "../../utils/role-mapper";

/**
 * Audit Router
 */
export const auditRouter = router({
  /**
   * 获取审计日志列表
   */
  list: createPermissionProcedure(["audit:view"])
    .input(
      z.object({
        tableName: z.string().optional(),
        recordId: z.string().optional(),
        action: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
        operatorId: z.string().optional(),
        orgId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        tableName,
        recordId,
        action,
        operatorId,
        orgId,
        startDate,
        endDate,
        page,
        pageSize,
      } = input;

      // 构建查询条件
      const where: any = {};
      if (tableName) where.tableName = tableName;
      if (recordId) where.recordId = recordId;
      if (action) where.action = action;
      if (operatorId) where.operatorId = operatorId;
      if (orgId) where.orgId = orgId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // RBAC 权限检查（只能查看自己组织的审计日志）
      if (ctx.userSession?.role !== "HQ_ADMIN" && ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }

      // 查询审计日志
      const [logs, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * 获取审计日志详情
   */
  getById: createPermissionProcedure(["audit:view"])
    .input(
      z.object({
        id: z
          .union([z.string(), z.number(), z.bigint()])
          .transform(v => BigInt(v)),
      })
    )
    .query(async ({ ctx, input }) => {
      const log = await ctx.prisma.auditLog.findUnique({
        where: { id: input.id },
      });

      if (!log) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit log not found",
        });
      }

      // RBAC 权限检查
      if (
        ctx.userSession?.role !== "HQ_ADMIN" &&
        log.orgId !== ctx.userSession?.orgId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this audit log",
        });
      }

      return log;
    }),

  /**
   * 验证审计链完整性
   */
  verifyChain: createPermissionProcedure(["audit:verify"])
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        orgId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, orgId } = input;

      // 构建查询条件
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (orgId) where.orgId = orgId;

      // RBAC 权限检查
      if (ctx.userSession?.role !== "HQ_ADMIN" && ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }

      // 查询审计日志（按创建时间排序）
      const logs = await ctx.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "asc" },
      });

      if (logs.length === 0) {
        return {
          valid: true,
          totalLogs: 0,
          validLogs: 0,
          invalidLogs: 0,
          errors: [],
        };
      }

      // 验证审计链
      const errors: any[] = [];
      let validLogs = 0;
      let invalidLogs = 0;

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const prevLog = i > 0 ? logs[i - 1] : null;

        // 验证 previousHash
        if (i === 0) {
          // Genesis record
          if (log.previousHash !== null) {
            errors.push({
              logId: log.id,
              eventId: log.eventId,
              error: "Genesis record should have previousHash = null",
            });
            invalidLogs++;
            continue;
          }
        } else {
          // 非 Genesis record
          if (log.previousHash !== prevLog!.sha256Hash) {
            errors.push({
              logId: log.id,
              eventId: log.eventId,
              error: `previousHash mismatch: expected ${prevLog!.sha256Hash}, got ${log.previousHash}`,
            });
            invalidLogs++;
            continue;
          }
        }

        // 验证 sha256Hash
        const calculatedHash = calculateHash(log);
        if (log.sha256Hash !== calculatedHash) {
          errors.push({
            logId: log.id,
            eventId: log.eventId,
            error: `sha256Hash mismatch: expected ${calculatedHash}, got ${log.sha256Hash}`,
          });
          invalidLogs++;
          continue;
        }

        validLogs++;
      }

      return {
        valid: errors.length === 0,
        totalLogs: logs.length,
        validLogs,
        invalidLogs,
        errors,
      };
    }),

  /**
   * 获取审计统计
   */
  getStatistics: createPermissionProcedure(["audit:view"])
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        orgId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, orgId } = input;

      // 构建查询条件
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (orgId) where.orgId = orgId;

      // RBAC 权限检查
      if (ctx.userSession?.role !== "HQ_ADMIN" && ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }

      // 统计审计日志
      const [total, byAction, byTable] = await Promise.all([
        ctx.prisma.auditLog.count({ where }),
        ctx.prisma.auditLog.groupBy({
          by: ["action"],
          where,
          _count: true,
        }),
        ctx.prisma.auditLog.groupBy({
          by: ["tableName"],
          where,
          _count: true,
        }),
      ]);

      return {
        total,
        byAction: byAction.map(item => ({
          action: item.action,
          count: item._count,
        })),
        byTable: byTable.map(item => ({
          tableName: item.tableName,
          count: item._count,
        })),
      };
    }),

  /**
   * 搜索审计日志
   */
  search: createPermissionProcedure(["audit:view"])
    .input(
      z.object({
        keyword: z.string().min(1),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { keyword, page, pageSize } = input;

      // 构建查询条件
      const where: any = {
        OR: [
          { eventId: { contains: keyword } },
          { tableName: { contains: keyword } },
          { recordId: { contains: keyword } },
          { operatorId: { contains: keyword } },
        ],
      };

      // RBAC 权限检查
      if (ctx.userSession?.role !== "HQ_ADMIN" && ctx.userSession?.orgId) {
        where.orgId = ctx.userSession.orgId;
      }

      // 查询审计日志
      const [logs, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});

/**
 * 计算审计日志的 SHA-256 哈希
 */
function calculateHash(log: any): string {
  const data = {
    eventId: log.eventId,
    tableName: log.tableName,
    recordId: log.recordId,
    action: log.action,
    changes: log.changes,
    operatorId: log.operatorId,
    operatorType: log.operatorType,
    operatorName: log.operatorName,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    orgId: log.orgId,
    previousHash: log.previousHash,
    createdAt: log.createdAt.toISOString(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
