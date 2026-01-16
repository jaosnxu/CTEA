/**
 * CHUTEA 智慧中台 - JWT 认证中间件
 *
 * 功能：
 * 1. 从请求头提取 JWT Token
 * 2. 校验 Token 有效性
 * 3. 将用户信息注入请求对象
 *
 * 使用方式：
 * - requireAuth: 强制认证，未登录返回 401
 * - optionalAuth: 可选认证，未登录继续执行
 */

import { Request, Response, NextFunction } from "express";
import { getAuthService, JwtPayload, User } from "../services/auth-service";

// ==================== 类型扩展 ====================

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      jwtPayload?: JwtPayload;
    }
  }
}

// ==================== 工具函数 ====================

/**
 * 从请求头提取 Token
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 也支持从 cookie 中读取
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * 获取本地化错误消息
 */
function getAuthErrorMessage(key: string, lang: string): string {
  const messages: Record<string, Record<string, string>> = {
    token_required: {
      ru: "Требуется авторизация.",
      zh: "需要登录",
      en: "Authentication required.",
    },
    token_invalid: {
      ru: "Недействительный токен.",
      zh: "Token 无效",
      en: "Invalid token.",
    },
    token_expired: {
      ru: "Токен истёк. Войдите снова.",
      zh: "Token 已过期，请重新登录",
      en: "Token expired. Please login again.",
    },
    user_not_found: {
      ru: "Пользователь не найден.",
      zh: "用户不存在",
      en: "User not found.",
    },
    user_disabled: {
      ru: "Аккаунт заблокирован.",
      zh: "账户已被禁用",
      en: "Account disabled.",
    },
  };

  return (
    messages[key]?.[lang] || messages[key]?.["ru"] || "Ошибка авторизации."
  );
}

/**
 * 获取请求语言
 */
function getRequestLanguage(req: Request): string {
  const acceptLanguage = req.headers["accept-language"] || "";
  if (acceptLanguage.includes("ru")) return "ru";
  if (acceptLanguage.includes("zh")) return "zh";
  return "ru"; // 默认俄语
}

// ==================== 中间件 ====================

/**
 * 强制认证中间件
 *
 * 未登录或 Token 无效时返回 401
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const language = getRequestLanguage(req);
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_REQUIRED",
        message: getAuthErrorMessage("token_required", language),
      },
    });
    return;
  }

  const authService = getAuthService();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_INVALID",
        message: getAuthErrorMessage("token_invalid", language),
      },
    });
    return;
  }

  // 检查 Token 是否过期
  if (payload.exp * 1000 < Date.now()) {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: getAuthErrorMessage("token_expired", language),
      },
    });
    return;
  }

  // 注入用户信息到请求对象
  req.userId = payload.userId;
  req.jwtPayload = payload;

  next();
}

/**
 * 可选认证中间件
 *
 * 有 Token 则解析，无 Token 则继续执行
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (token) {
    const authService = getAuthService();
    const payload = authService.verifyToken(token);

    if (payload && payload.exp * 1000 >= Date.now()) {
      req.userId = payload.userId;
      req.jwtPayload = payload;
    }
  }

  next();
}

/**
 * 加载完整用户信息中间件
 *
 * 必须在 requireAuth 或 optionalAuth 之后使用
 * 从数据库加载完整的用户信息
 */
export async function loadUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    next();
    return;
  }

  const authService = getAuthService();
  const user = await authService.getUserById(req.userId);

  if (user) {
    req.user = user;
  }

  next();
}

/**
 * 组合中间件：强制认证 + 加载用户
 */
export function requireAuthWithUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, async () => {
    await loadUser(req, res, next);
  });
}

export default {
  requireAuth,
  optionalAuth,
  loadUser,
  requireAuthWithUser,
};
