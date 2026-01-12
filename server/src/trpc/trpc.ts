/**
 * CHUTEA tRPC 初始化配置
 * 
 * 包含：
 * - tRPC 实例初始化
 * - 中间件（审计日志、RBAC 权限）
 * - Procedure 定义
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';
import { getAuditService } from '../services/audit-service';

/**
 * 初始化 tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * 审计日志中间件
 */
const auditMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const startTime = Date.now();

  try {
    // 执行请求
    const result = await next();

    // 记录审计日志（成功）
    const auditService = getAuditService();
    await auditService.createAuditLog({
      orgId: ctx.userSession?.orgId || undefined,
      tableName: 'api_calls',
      recordId: ctx.requestId,
      action: 'INSERT',
      diffAfter: {
        path: `/${path}`,
        method: type,
        status: 'success',
        duration: Date.now() - startTime,
      },
      operatorId: ctx.userSession?.userId,
      operatorType: ctx.userSession?.role as any || 'SYSTEM',
      ipAddress: ctx.auditTrail.ipAddress,
      userAgent: ctx.auditTrail.userAgent,
      requestId: ctx.requestId,
    });

    return result;
  } catch (error) {
    // 记录审计日志（失败）
    const auditService = getAuditService();
    await auditService.createAuditLog({
      orgId: ctx.userSession?.orgId || undefined,
      tableName: 'api_calls',
      recordId: ctx.requestId,
      action: 'INSERT',
      diffAfter: {
        path: `/${path}`,
        method: type,
        status: 'error',
        duration: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
      operatorId: ctx.userSession?.userId,
      operatorType: ctx.userSession?.role as any || 'SYSTEM',
      ipAddress: ctx.auditTrail.ipAddress,
      userAgent: ctx.auditTrail.userAgent,
      requestId: ctx.requestId,
    });

    throw error;
  }
});

/**
 * 认证中间件
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userSession) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userSession: ctx.userSession, // 确保类型正确
    },
  });
});

/**
 * RBAC 权限中间件工厂
 */
function createPermissionMiddleware(requiredPermissions: string[]) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.userSession) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!ctx.rbacScope.hasAllPermissions(requiredPermissions)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing required permissions: ${requiredPermissions.join(', ')}`,
      });
    }

    return next();
  });
}

/**
 * 导出 tRPC 工具
 */
export const router = t.router;
export const publicProcedure = t.procedure.use(auditMiddleware);
export const protectedProcedure = t.procedure.use(auditMiddleware).use(authMiddleware);
export const createPermissionProcedure = (permissions: string[]) =>
  t.procedure.use(auditMiddleware).use(authMiddleware).use(createPermissionMiddleware(permissions));

/**
 * 合并路由工具
 */
export const mergeRouters = t.mergeRouters;
