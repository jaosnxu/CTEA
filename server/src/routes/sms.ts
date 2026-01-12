/**
 * CHUTEA 智慧中台 - SMS API 路由
 *
 * API 端点：
 * - POST /api/sms/send - 发送验证码（整合 Captcha 校验）
 * - POST /api/sms/verify - 校验验证码
 * - GET /api/sms/status - 获取服务状态
 *
 * 安全逻辑：
 * - 发送前必须通过 Captcha 校验
 * - 验证码 5 分钟有效
 * - 最多尝试 5 次
 * - 验证成功后立即作废
 */

import { Router, Request, Response } from "express";
import {
  getSmsVerificationService,
  VerificationPurpose,
} from "../services/sms-verification-service";
import { getSmsManager } from "../services/sms";
import {
  validatePhoneNumber,
  getLocalizedError,
} from "../services/sms/sms-provider.interface";

const router = Router();

// ==================== 类型定义 ====================

interface SendCodeRequestBody {
  phone: string;
  purpose?: VerificationPurpose;
  ticket: string;
  randstr: string;
  language?: string;
}

interface VerifyCodeRequestBody {
  phone: string;
  code: string;
  purpose?: VerificationPurpose;
}

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

// ==================== API 路由 ====================

/**
 * POST /api/sms/send
 *
 * 发送验证码短信
 *
 * 请求体：
 * {
 *   phone: string,      // 手机号（必填）
 *   purpose?: string,   // 用途：LOGIN/REGISTER/RESET_PASSWORD（默认 LOGIN）
 *   ticket: string,     // Captcha 票据（必填）
 *   randstr: string,    // Captcha 随机串（必填）
 *   language?: string   // 语言：ru/zh/en（默认 ru）
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   data?: { expiresAt: string },
 *   error?: { code: string, message: string, cooldownRemaining?: number }
 * }
 */
router.post("/send", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userIp = getClientIp(req);
  const language = req.body.language || getRequestLanguage(req);

  console.log("\n" + "=".repeat(60));
  console.log("[SMS API] POST /api/sms/send");
  console.log("=".repeat(60));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`IP: ${userIp}`);

  try {
    const {
      phone,
      purpose = "LOGIN",
      ticket,
      randstr,
    } = req.body as SendCodeRequestBody;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PHONE",
          message: getLocalizedError("invalid_phone", language),
        },
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PHONE",
          message: getLocalizedError("invalid_phone", language),
        },
      });
    }

    // 🔥 安全铁律：必须提供 Captcha 票据
    if (!ticket || !randstr) {
      console.log("❌ 缺少 Captcha 票据，拒绝请求！");
      return res.status(403).json({
        success: false,
        error: {
          code: "CAPTCHA_REQUIRED",
          message: getLocalizedError("captcha_required", language),
        },
      });
    }

    console.log(`Phone: ${phone.substring(0, 5)}***`);
    console.log(`Purpose: ${purpose}`);

    // 调用验证码服务
    const verificationService = getSmsVerificationService();
    const result = await verificationService.sendCode({
      phone,
      purpose: purpose as VerificationPurpose,
      ticket,
      randstr,
      userIp,
      language,
    });

    const duration = Date.now() - startTime;
    console.log(`Duration: ${duration}ms`);
    console.log(`Result: ${result.success ? "✅ 成功" : "❌ 失败"}`);
    console.log("=".repeat(60) + "\n");

    if (result.success) {
      return res.json({
        success: true,
        data: {
          expiresAt: result.expiresAt?.toISOString(),
        },
      });
    } else {
      // 根据错误码返回不同的 HTTP 状态码
      const statusCode =
        result.errorCode === "CAPTCHA_FAILED" ||
        result.errorCode === "CAPTCHA_REQUIRED"
          ? 403
          : result.errorCode === "RATE_LIMITED"
            ? 429
            : result.errorCode === "INVALID_PHONE"
              ? 400
              : 500;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.errorCode,
          message: result.errorMessage,
          cooldownRemaining: result.cooldownRemaining,
        },
      });
    }
  } catch (error) {
    console.error("[SMS API] 异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: getLocalizedError("send_failed", language),
      },
    });
  }
});

/**
 * POST /api/sms/verify
 *
 * 校验验证码
 *
 * 请求体：
 * {
 *   phone: string,    // 手机号（必填）
 *   code: string,     // 6位验证码（必填）
 *   purpose?: string  // 用途：LOGIN/REGISTER/RESET_PASSWORD（默认 LOGIN）
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   data?: { verified: true },
 *   error?: { code: string, message: string, attemptsRemaining?: number }
 * }
 *
 * 安全逻辑：
 * - 验证码 5 分钟有效
 * - 最多尝试 5 次
 * - 验证成功后立即作废，不能二次使用
 */
router.post("/verify", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userIp = getClientIp(req);
  const language = getRequestLanguage(req);

  console.log("\n" + "=".repeat(60));
  console.log("[SMS API] POST /api/sms/verify");
  console.log("=".repeat(60));
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`IP: ${userIp}`);

  try {
    const {
      phone,
      code,
      purpose = "LOGIN",
    } = req.body as VerifyCodeRequestBody;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PHONE",
          message: getLocalizedError("invalid_phone", language),
        },
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CODE",
          message:
            language === "ru" ? "Введите код подтверждения." : "请输入验证码",
        },
      });
    }

    // 验证码格式检查（6位数字）
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CODE_FORMAT",
          message:
            language === "ru"
              ? "Код должен состоять из 6 цифр."
              : "验证码必须是6位数字",
        },
      });
    }

    console.log(`Phone: ${phone.substring(0, 5)}***`);
    console.log(`Code: ${code}`);
    console.log(`Purpose: ${purpose}`);

    // 调用验证码服务
    const verificationService = getSmsVerificationService();
    const result = await verificationService.verifyCode({
      phone,
      code,
      purpose: purpose as VerificationPurpose,
      userIp,
    });

    const duration = Date.now() - startTime;
    console.log(`Duration: ${duration}ms`);
    console.log(`Result: ${result.success ? "✅ 验证成功" : "❌ 验证失败"}`);
    console.log("=".repeat(60) + "\n");

    if (result.success) {
      return res.json({
        success: true,
        data: {
          verified: true,
        },
      });
    } else {
      // 根据错误码返回不同的 HTTP 状态码
      const statusCode =
        result.errorCode === "CODE_NOT_FOUND" ||
        result.errorCode === "CODE_EXPIRED"
          ? 404
          : result.errorCode === "CODE_MISMATCH"
            ? 401
            : result.errorCode === "MAX_ATTEMPTS_EXCEEDED"
              ? 429
              : 400;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.errorCode,
          message: result.errorMessage,
          attemptsRemaining: result.attemptsRemaining,
        },
      });
    }
  } catch (error) {
    console.error("[SMS API] 异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: getLocalizedError("send_failed", language),
      },
    });
  }
});

/**
 * GET /api/sms/status
 *
 * 获取 SMS 服务状态
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const smsManager = getSmsManager();
    const status = await smsManager.getProvidersStatus();

    return res.json({
      success: true,
      data: {
        providers: status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[SMS API] 获取状态失败:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get SMS status",
      },
    });
  }
});

export default router;
