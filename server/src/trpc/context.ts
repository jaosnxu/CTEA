/**
 * CHUTEA tRPC Context
 *
 * 统一注入：
 * - request_id: 请求追踪ID
 * - user_session: 用户会话信息
 * - audit_trail: 审计追踪
 * - rbac_scope: RBAC 权限作用域
 */

import { Request, Response } from "express";
import { getPrismaClient } from "../db/prisma";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

// 获取全局 Prisma 客户端
export const prisma = getPrismaClient();

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || "chutea-secret-key-2024";

/**
 * 用户会话信息
 */
export interface UserSession {
  userId: string;
  orgId: string | null;
  storeId: string | null;
  role: string;
  permissions: string[];
}

/**
 * RBAC 权限作用域
 */
export interface RBACScope {
  canAccessOrg: (orgId: string) => boolean;
  canAccessStore: (storeId: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

/**
 * 审计追踪信息
 */
export interface AuditTrail {
  requestId: string;
  userId: string | null;
  userType: string | null;
  userName: string | null;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * tRPC Context
 */
export interface Context {
  req: Request;
  res: Response;
  prisma: ReturnType<typeof getPrismaClient>;
  requestId: string;
  userSession: UserSession | null;
  auditTrail: AuditTrail;
  rbacScope: RBACScope;
}

/**
 * 从请求中提取用户会话
 */
function extractUserSession(req: Request): UserSession | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return {
      userId: decoded.userId || decoded.id,
      orgId: decoded.orgId || null,
      storeId: decoded.storeId || null,
      role: decoded.role || "user",
      permissions: decoded.permissions || [],
    };
  } catch (error) {
    return null;
  }
}

/**
 * 创建 RBAC 权限作用域
 */
function createRBACScope(userSession: UserSession | null): RBACScope {
  return {
    canAccessOrg: (orgId: string) => {
      if (!userSession) return false;
      if (userSession.role === "super_admin") return true;
      return userSession.orgId === orgId;
    },
    canAccessStore: (storeId: string) => {
      if (!userSession) return false;
      if (
        userSession.role === "super_admin" ||
        userSession.role === "org_admin"
      )
        return true;
      return userSession.storeId === storeId;
    },
    hasPermission: (permission: string) => {
      if (!userSession) return false;
      if (userSession.role === "super_admin") return true;
      return userSession.permissions.includes(permission);
    },
    hasAnyPermission: (permissions: string[]) => {
      if (!userSession) return false;
      if (userSession.role === "super_admin") return true;
      return permissions.some(p => userSession.permissions.includes(p));
    },
    hasAllPermissions: (permissions: string[]) => {
      if (!userSession) return false;
      if (userSession.role === "super_admin") return true;
      return permissions.every(p => userSession.permissions.includes(p));
    },
  };
}

/**
 * 获取客户端 IP
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "0.0.0.0";
}

/**
 * 创建 tRPC Context
 */
export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  // 生成请求ID
  const requestId = `REQ-${Date.now()}-${uuidv4().substring(0, 8)}`;

  // 提取用户会话
  const userSession = extractUserSession(req);

  // 创建审计追踪
  const auditTrail: AuditTrail = {
    requestId,
    userId: userSession?.userId || null,
    userType: userSession?.role || null,
    userName: null, // 需要从数据库查询
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || "unknown",
    timestamp: new Date(),
  };

  // 创建 RBAC 权限作用域
  const rbacScope = createRBACScope(userSession);

  return {
    req,
    res,
    prisma,
    requestId,
    userSession,
    auditTrail,
    rbacScope,
  };
}

/**
 * Context 类型导出
 */
export type { Context as TRPCContext };
