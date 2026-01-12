/**
 * CHUTEA 智慧中台 - SMS 验证码核心服务
 *
 * 功能：
 * 1. 发送验证码（整合 Captcha 校验 + 短信下发）
 * 2. 校验验证码（5 次错误失效 + 成功后作废）
 * 3. 状态管理（防止二次使用）
 *
 * 安全逻辑：
 * - 验证码 5 分钟有效
 * - 同一验证码最多尝试 5 次
 * - 验证成功后立即作废
 * - 新验证码会使旧验证码失效
 */

import crypto from "crypto";
import { getDb } from "../../db";
import { CaptchaService } from "./captcha-service";
import { getSmsManager } from "./sms";
import {
  validatePhoneNumber,
  getLocalizedError,
} from "./sms/sms-provider.interface";

// ==================== 类型定义 ====================

/** 验证码用途 */
export type VerificationPurpose =
  | "LOGIN"
  | "REGISTER"
  | "RESET_PASSWORD"
  | "SENSITIVE_ACTION";

/** 发送验证码请求 */
export interface SendCodeRequest {
  phone: string;
  purpose: VerificationPurpose;
  ticket: string;
  randstr: string;
  userIp: string;
  language?: string;
}

/** 发送验证码响应 */
export interface SendCodeResponse {
  success: boolean;
  expiresAt?: Date;
  cooldownRemaining?: number;
  errorCode?: string;
  errorMessage?: string;
}

/** 校验验证码请求 */
export interface VerifyCodeRequest {
  phone: string;
  code: string;
  purpose: VerificationPurpose;
  userIp?: string;
}

/** 校验验证码响应 */
export interface VerifyCodeResponse {
  success: boolean;
  attemptsRemaining?: number;
  errorCode?: string;
  errorMessage?: string;
}

// ==================== 常量配置 ====================

/** 验证码有效期（秒） */
const CODE_EXPIRY_SECONDS = 300; // 5 分钟

/** 验证码长度 */
const CODE_LENGTH = 6;

/** 最大尝试次数 */
const MAX_ATTEMPTS = 5;

/** 发送冷却时间（秒） */
const COOLDOWN_SECONDS = 60;

// ==================== 核心服务类 ====================

export class SmsVerificationService {
  private static instance: SmsVerificationService;
  private captchaService: CaptchaService;
  private smsManager: ReturnType<typeof getSmsManager>;

  private constructor() {
    this.captchaService = CaptchaService.getInstance();
    this.smsManager = getSmsManager();
  }

  public static getInstance(): SmsVerificationService {
    if (!SmsVerificationService.instance) {
      SmsVerificationService.instance = new SmsVerificationService();
    }
    return SmsVerificationService.instance;
  }

  /**
   * 生成 6 位数字验证码
   */
  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * 🔥 发送验证码（整合 Captcha 校验 + 短信下发）
   *
   * 流程：
   * 1. 校验 Captcha 票据
   * 2. 检查发送冷却时间
   * 3. 使旧验证码失效
   * 4. 生成新验证码
   * 5. 存储到数据库
   * 6. 发送短信
   */
  async sendCode(request: SendCodeRequest): Promise<SendCodeResponse> {
    const {
      phone,
      purpose,
      ticket,
      randstr,
      userIp,
      language = "ru",
    } = request;

    console.log("\n" + "=".repeat(70));
    console.log("[SmsVerificationService] 📱 SEND VERIFICATION CODE");
    console.log("=".repeat(70));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Phone: ${phone.substring(0, 5)}***`);
    console.log(`Purpose: ${purpose}`);
    console.log(`IP: ${userIp}`);

    // ==================== 第一步：参数验证 ====================
    if (!validatePhoneNumber(phone)) {
      console.log("❌ 手机号格式错误");
      return {
        success: false,
        errorCode: "INVALID_PHONE",
        errorMessage: getLocalizedError("invalid_phone", language),
      };
    }

    // ==================== 第二步：Captcha 校验 ====================
    console.log("\n[Step 1] Captcha 校验...");

    if (!ticket || !randstr) {
      console.log("❌ 缺少验证码票据");
      return {
        success: false,
        errorCode: "CAPTCHA_REQUIRED",
        errorMessage: getLocalizedError("captcha_required", language),
      };
    }

    const captchaResult = await this.captchaService.verifyTicket({
      ticket,
      randstr,
      userIp,
    });

    if (!captchaResult.success) {
      console.log(`❌ Captcha 校验失败: ${captchaResult.errorCode}`);
      return {
        success: false,
        errorCode: "CAPTCHA_FAILED",
        errorMessage: getLocalizedError("captcha_failed", language),
      };
    }

    console.log("✅ Captcha 校验通过");

    // ==================== 第三步：检查冷却时间 ====================
    console.log("\n[Step 2] 检查冷却时间...");

    const cooldownResult = await this.checkCooldown(phone);
    if (cooldownResult.isLimited) {
      console.log(`❌ 冷却中，剩余 ${cooldownResult.remaining} 秒`);
      return {
        success: false,
        errorCode: "RATE_LIMITED",
        errorMessage: getLocalizedError("rate_limited", language),
        cooldownRemaining: cooldownResult.remaining,
      };
    }

    console.log("✅ 冷却检查通过");

    // ==================== 第四步：使旧验证码失效 ====================
    console.log("\n[Step 3] 使旧验证码失效...");
    await this.invalidateOldCodes(phone, purpose);
    console.log("✅ 旧验证码已失效");

    // ==================== 第五步：生成新验证码 ====================
    console.log("\n[Step 4] 生成新验证码...");
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_SECONDS * 1000);
    console.log(`✅ 验证码: ${code}（有效期至 ${expiresAt.toISOString()}）`);

    // ==================== 第六步：存储到数据库 ====================
    console.log("\n[Step 5] 存储到数据库...");
    const stored = await this.storeCode(
      phone,
      code,
      purpose,
      expiresAt,
      userIp
    );
    if (!stored) {
      console.log("❌ 存储失败");
      return {
        success: false,
        errorCode: "STORAGE_ERROR",
        errorMessage: getLocalizedError("send_failed", language),
      };
    }
    console.log("✅ 存储成功");

    // ==================== 第七步：发送短信 ====================
    console.log("\n[Step 6] 发送短信...");

    const smsResult = await this.smsManager.sendVerificationCodeSecure({
      phone,
      ticket,
      randstr,
      userIp,
      language,
      code, // 使用我们生成的验证码
    });

    if (!smsResult.success) {
      console.log(`❌ 短信发送失败: ${smsResult.errorCode}`);
      // 标记验证码为发送失败
      await this.markCodeFailed(phone, code);
      return {
        success: false,
        errorCode: smsResult.errorCode || "SEND_FAILED",
        errorMessage:
          smsResult.errorMessage || getLocalizedError("send_failed", language),
      };
    }

    console.log("✅ 短信发送成功");
    console.log("=".repeat(70) + "\n");

    return {
      success: true,
      expiresAt,
    };
  }

  /**
   * 🔥 校验验证码
   *
   * 安全逻辑：
   * 1. 查找有效的验证码
   * 2. 检查是否过期
   * 3. 检查尝试次数（最多 5 次）
   * 4. 验证码匹配检查
   * 5. 成功后立即作废
   */
  async verifyCode(request: VerifyCodeRequest): Promise<VerifyCodeResponse> {
    const { phone, code, purpose, userIp } = request;
    const language = "ru"; // 默认俄语

    console.log("\n" + "=".repeat(70));
    console.log("[SmsVerificationService] 🔐 VERIFY CODE");
    console.log("=".repeat(70));
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Phone: ${phone.substring(0, 5)}***`);
    console.log(`Code: ${code}`);
    console.log(`Purpose: ${purpose}`);

    const db = await getDb();
    if (!db) {
      console.log("❌ 数据库不可用");
      return {
        success: false,
        errorCode: "DATABASE_ERROR",
        errorMessage: getLocalizedError("send_failed", language),
      };
    }

    try {
      // ==================== 第一步：查找有效的验证码 ====================
      console.log("\n[Step 1] 查找有效验证码...");

      const [rows] = await (db as any).execute(
        `SELECT id, code, expires_at, is_verified, attempt_count 
         FROM sms_verification_codes 
         WHERE phone = ? AND purpose = ? AND is_verified = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [phone, purpose]
      );

      if (!rows || rows.length === 0) {
        console.log("❌ 未找到有效验证码");
        return {
          success: false,
          errorCode: "CODE_NOT_FOUND",
          errorMessage: this.getVerifyErrorMessage("not_found", language),
        };
      }

      const record = rows[0];
      console.log(`✅ 找到验证码记录 ID: ${record.id}`);

      // ==================== 第二步：检查是否过期 ====================
      console.log("\n[Step 2] 检查是否过期...");

      const expiresAt = new Date(record.expires_at);
      if (expiresAt < new Date()) {
        console.log("❌ 验证码已过期");
        return {
          success: false,
          errorCode: "CODE_EXPIRED",
          errorMessage: this.getVerifyErrorMessage("expired", language),
        };
      }

      console.log("✅ 验证码未过期");

      // ==================== 第三步：检查尝试次数 ====================
      console.log("\n[Step 3] 检查尝试次数...");

      const attemptCount = record.attempt_count || 0;
      if (attemptCount >= MAX_ATTEMPTS) {
        console.log(`❌ 尝试次数已达上限 (${attemptCount}/${MAX_ATTEMPTS})`);
        // 标记为已验证（失效）
        await this.markCodeVerified(record.id);
        return {
          success: false,
          errorCode: "MAX_ATTEMPTS_EXCEEDED",
          errorMessage: this.getVerifyErrorMessage("max_attempts", language),
          attemptsRemaining: 0,
        };
      }

      console.log(`✅ 尝试次数: ${attemptCount}/${MAX_ATTEMPTS}`);

      // ==================== 第四步：验证码匹配检查 ====================
      console.log("\n[Step 4] 验证码匹配检查...");

      if (record.code !== code) {
        // 增加尝试次数
        const newAttemptCount = attemptCount + 1;
        await this.incrementAttemptCount(record.id, newAttemptCount);

        const attemptsRemaining = MAX_ATTEMPTS - newAttemptCount;
        console.log(`❌ 验证码不匹配，剩余尝试次数: ${attemptsRemaining}`);

        // 如果达到最大尝试次数，立即失效
        if (newAttemptCount >= MAX_ATTEMPTS) {
          console.log("🔒 达到最大尝试次数，验证码已失效");
          await this.markCodeVerified(record.id);
        }

        return {
          success: false,
          errorCode: "CODE_MISMATCH",
          errorMessage: this.getVerifyErrorMessage("mismatch", language),
          attemptsRemaining,
        };
      }

      console.log("✅ 验证码匹配");

      // ==================== 第五步：成功后立即作废 ====================
      console.log("\n[Step 5] 标记验证码为已使用...");

      await this.markCodeVerified(record.id);

      console.log("✅ 验证码已作废，不能二次使用");
      console.log("=".repeat(70) + "\n");

      return {
        success: true,
      };
    } catch (error) {
      console.error("[SmsVerificationService] 校验异常:", error);
      return {
        success: false,
        errorCode: "VERIFY_ERROR",
        errorMessage: getLocalizedError("send_failed", language),
      };
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 检查发送冷却时间
   */
  private async checkCooldown(
    phone: string
  ): Promise<{ isLimited: boolean; remaining: number }> {
    const db = await getDb();
    if (!db) {
      return { isLimited: false, remaining: 0 };
    }

    try {
      const [rows] = await (db as any).execute(
        `SELECT created_at FROM sms_verification_codes 
         WHERE phone = ? ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );

      if (rows && rows.length > 0) {
        const lastCreatedAt = new Date(rows[0].created_at);
        const elapsed = (Date.now() - lastCreatedAt.getTime()) / 1000;
        const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed);

        if (remaining > 0) {
          return { isLimited: true, remaining: Math.ceil(remaining) };
        }
      }

      return { isLimited: false, remaining: 0 };
    } catch (error) {
      console.error("[SmsVerificationService] 检查冷却时间失败:", error);
      return { isLimited: false, remaining: 0 };
    }
  }

  /**
   * 使旧验证码失效
   */
  private async invalidateOldCodes(
    phone: string,
    purpose: VerificationPurpose
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `UPDATE sms_verification_codes 
         SET is_verified = TRUE 
         WHERE phone = ? AND purpose = ? AND is_verified = FALSE`,
        [phone, purpose]
      );
    } catch (error) {
      console.error("[SmsVerificationService] 使旧验证码失效失败:", error);
    }
  }

  /**
   * 存储验证码到数据库
   */
  private async storeCode(
    phone: string,
    code: string,
    purpose: VerificationPurpose,
    expiresAt: Date,
    ipAddress: string
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      await (db as any).execute(
        `INSERT INTO sms_verification_codes (phone, code, purpose, expires_at, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [phone, code, purpose, expiresAt, ipAddress]
      );
      return true;
    } catch (error) {
      console.error("[SmsVerificationService] 存储验证码失败:", error);
      return false;
    }
  }

  /**
   * 标记验证码发送失败
   */
  private async markCodeFailed(phone: string, code: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `UPDATE sms_verification_codes 
         SET is_verified = TRUE 
         WHERE phone = ? AND code = ?`,
        [phone, code]
      );
    } catch (error) {
      console.error("[SmsVerificationService] 标记失败:", error);
    }
  }

  /**
   * 标记验证码为已验证（作废）
   */
  private async markCodeVerified(id: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `UPDATE sms_verification_codes 
         SET is_verified = TRUE, verified_at = NOW() 
         WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error("[SmsVerificationService] 标记已验证失败:", error);
    }
  }

  /**
   * 增加尝试次数
   */
  private async incrementAttemptCount(
    id: number,
    newCount: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `UPDATE sms_verification_codes SET attempt_count = ? WHERE id = ?`,
        [newCount, id]
      );
    } catch (error) {
      console.error("[SmsVerificationService] 增加尝试次数失败:", error);
    }
  }

  /**
   * 获取校验错误消息（多语言）
   */
  private getVerifyErrorMessage(key: string, lang: string): string {
    const messages: Record<string, Record<string, string>> = {
      not_found: {
        ru: "Код не найден. Запросите новый код.",
        zh: "验证码不存在，请重新获取",
        en: "Code not found. Please request a new code.",
      },
      expired: {
        ru: "Код истёк. Запросите новый код.",
        zh: "验证码已过期，请重新获取",
        en: "Code expired. Please request a new code.",
      },
      mismatch: {
        ru: "Неверный код. Попробуйте снова.",
        zh: "验证码错误，请重试",
        en: "Invalid code. Please try again.",
      },
      max_attempts: {
        ru: "Слишком много попыток. Запросите новый код.",
        zh: "尝试次数过多，请重新获取验证码",
        en: "Too many attempts. Please request a new code.",
      },
    };

    return (
      messages[key]?.[lang] || messages[key]?.["ru"] || "Ошибка проверки кода."
    );
  }
}

// ==================== 导出 ====================

export function getSmsVerificationService(): SmsVerificationService {
  return SmsVerificationService.getInstance();
}

export default SmsVerificationService;
