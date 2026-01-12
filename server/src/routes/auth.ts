/**
 * CHUTEA 智慧中台 - Auth API 路由
 *
 * API 端点：
 * - POST /api/auth/login - 无感注册登录（手机号 + 验证码）
 * - POST /api/auth/refresh - 刷新 Token
 * - GET /api/auth/me - 获取当前用户信息
 * - PUT /api/auth/profile - 更新用户资料
 * - POST /api/auth/logout - 登出（客户端清除 Token）
 *
 * 安全逻辑：
 * - 登录必须先通过 SMS 验证码校验
 * - 需要认证的接口使用 requireAuth 中间件
 */

import { Router, Request, Response } from "express";
import { getAuthService } from "../services/auth-service";
import {
  requireAuth,
  requireAuthWithUser,
  optionalAuth,
  loadUser,
} from "../middleware/auth-middleware";
import { validatePhoneNumber } from "../services/sms/sms-provider.interface";

const router = Router();

// ==================== 工具函数 ====================

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
 * 获取请求语言
 */
function getRequestLanguage(req: Request): string {
  const acceptLanguage = req.headers["accept-language"] || "";
  if (acceptLanguage.includes("ru")) return "ru";
  if (acceptLanguage.includes("zh")) return "zh";
  return "ru"; // 默认俄语
}

/**
 * 获取本地化错误消息
 */
function getErrorMessage(key: string, lang: string): string {
  const messages: Record<string, Record<string, string>> = {
    missing_phone: {
      ru: "Введите номер телефона.",
      zh: "请输入手机号",
      en: "Please enter phone number.",
    },
    invalid_phone: {
      ru: "Неверный формат номера.",
      zh: "手机号格式错误",
      en: "Invalid phone format.",
    },
    missing_code: {
      ru: "Введите код подтверждения.",
      zh: "请输入验证码",
      en: "Please enter verification code.",
    },
    invalid_code: {
      ru: "Код должен состоять из 6 цифр.",
      zh: "验证码必须是6位数字",
      en: "Code must be 6 digits.",
    },
    login_success: {
      ru: "Вход выполнен успешно!",
      zh: "登录成功！",
      en: "Login successful!",
    },
    register_success: {
      ru: "Регистрация успешна! Добро пожаловать!",
      zh: "注册成功！欢迎加入！",
      en: "Registration successful! Welcome!",
    },
    logout_success: {
      ru: "Выход выполнен.",
      zh: "已退出登录",
      en: "Logged out.",
    },
    profile_updated: {
      ru: "Профиль обновлён.",
      zh: "资料已更新",
      en: "Profile updated.",
    },
  };

  return messages[key]?.[lang] || messages[key]?.["ru"] || "Ошибка.";
}

// ==================== API 路由 ====================

/**
 * POST /api/auth/login
 *
 * 无感注册登录
 *
 * 请求体：
 * {
 *   phone: string,  // 手机号（E.164 格式，如 +79XXXXXXXXX）
 *   code: string    // 6位验证码
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   data?: {
 *     isNewUser: boolean,
 *     user: { id, phone, nickname, avatar },
 *     token: string,
 *     expiresAt: string
 *   },
 *   error?: { code, message }
 * }
 */
router.post("/login", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userIp = getClientIp(req);
  const language = getRequestLanguage(req);

  console.log("\n" + "=".repeat(60));
  console.log("[Auth API] POST /api/auth/login");
  console.log("=".repeat(60));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`IP: ${userIp}`);

  try {
    const { phone, code } = req.body;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PHONE",
          message: getErrorMessage("missing_phone", language),
        },
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PHONE",
          message: getErrorMessage("invalid_phone", language),
        },
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CODE",
          message: getErrorMessage("missing_code", language),
        },
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CODE",
          message: getErrorMessage("invalid_code", language),
        },
      });
    }

    console.log(`Phone: ${phone.substring(0, 5)}***`);

    // 调用 AuthService
    const authService = getAuthService();
    const result = await authService.login({
      phone,
      code,
      userIp,
    });

    const duration = Date.now() - startTime;
    console.log(`Duration: ${duration}ms`);
    console.log(`Result: ${result.success ? "✅ 成功" : "❌ 失败"}`);
    console.log("=".repeat(60) + "\n");

    if (result.success) {
      return res.json({
        success: true,
        message: result.isNewUser
          ? getErrorMessage("register_success", language)
          : getErrorMessage("login_success", language),
        data: {
          isNewUser: result.isNewUser,
          user: result.user,
          token: result.token,
          expiresAt: result.expiresAt?.toISOString(),
        },
      });
    } else {
      // 根据错误码返回不同的 HTTP 状态码
      const statusCode =
        result.errorCode === "CODE_MISMATCH" ||
        result.errorCode === "CODE_EXPIRED"
          ? 401
          : result.errorCode === "MAX_ATTEMPTS_EXCEEDED"
            ? 429
            : result.errorCode === "CODE_NOT_FOUND"
              ? 404
              : 400;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.errorCode,
          message: result.errorMessage,
        },
      });
    }
  } catch (error) {
    console.error("[Auth API] 登录异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          language === "ru" ? "Внутренняя ошибка сервера." : "服务器内部错误",
      },
    });
  }
});

/**
 * POST /api/auth/refresh
 *
 * 刷新 Token
 *
 * 请求头：
 * Authorization: Bearer <token>
 *
 * 响应：
 * {
 *   success: boolean,
 *   data?: { token, expiresAt }
 * }
 */
router.post("/refresh", requireAuth, async (req: Request, res: Response) => {
  const language = getRequestLanguage(req);

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7) || "";

    const authService = getAuthService();
    const result = await authService.refreshToken(token);

    if (result) {
      return res.json({
        success: true,
        data: {
          token: result.token,
          expiresAt: result.expiresAt.toISOString(),
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        error: {
          code: "REFRESH_FAILED",
          message:
            language === "ru" ? "Не удалось обновить токен." : "Token 刷新失败",
        },
      });
    }
  } catch (error) {
    console.error("[Auth API] 刷新 Token 异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          language === "ru" ? "Внутренняя ошибка сервера." : "服务器内部错误",
      },
    });
  }
});

/**
 * GET /api/auth/me
 *
 * 获取当前用户信息
 *
 * 请求头：
 * Authorization: Bearer <token>
 *
 * 响应：
 * {
 *   success: boolean,
 *   data?: { user }
 * }
 */
router.get(
  "/me",
  requireAuth,
  loadUser,
  async (req: Request, res: Response) => {
    const language = getRequestLanguage(req);

    try {
      if (!req.user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message:
              language === "ru" ? "Пользователь не найден." : "用户不存在",
          },
        });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            phone: req.user.phone,
            nickname: req.user.nickname,
            avatar: req.user.avatar,
            loginCount: req.user.loginCount,
            lastLoginAt: req.user.lastLoginAt?.toISOString(),
            createdAt: req.user.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("[Auth API] 获取用户信息异常:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            language === "ru" ? "Внутренняя ошибка сервера." : "服务器内部错误",
        },
      });
    }
  }
);

/**
 * PUT /api/auth/profile
 *
 * 更新用户资料
 *
 * 请求头：
 * Authorization: Bearer <token>
 *
 * 请求体：
 * {
 *   nickname?: string,
 *   avatar?: string
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   message?: string
 * }
 */
router.put("/profile", requireAuth, async (req: Request, res: Response) => {
  const language = getRequestLanguage(req);

  try {
    const { nickname, avatar } = req.body;

    const authService = getAuthService();
    const success = await authService.updateUser(req.userId!, {
      nickname,
      avatar,
    });

    if (success) {
      return res.json({
        success: true,
        message: getErrorMessage("profile_updated", language),
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message:
            language === "ru" ? "Не удалось обновить профиль." : "更新失败",
        },
      });
    }
  } catch (error) {
    console.error("[Auth API] 更新资料异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          language === "ru" ? "Внутренняя ошибка сервера." : "服务器内部错误",
      },
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * 登出（客户端清除 Token）
 *
 * 响应：
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post("/logout", optionalAuth, async (req: Request, res: Response) => {
  const language = getRequestLanguage(req);

  // 服务端无状态，只需返回成功
  // 客户端负责清除本地存储的 Token
  return res.json({
    success: true,
    message: getErrorMessage("logout_success", language),
  });
});

export default router;
