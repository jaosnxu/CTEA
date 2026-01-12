/**
 * CHUTEA 智慧中台 - SMS 短信服务 (SMS Service)
 *
 * 功能：
 * 1. 多服务商路由：Sms.ru（主）→ MTS（备）→ Twilio（国际）
 * 2. 短信限流与自动切换逻辑
 * 3. 验证码生成、发送、校验
 * 4. 记录日志到 sms_verification_logs 表
 *
 * 严禁 Hardcode：所有配置从数据库 sms_providers 表读取
 */

import crypto from "crypto";
import { getDb } from "../../db";

// ==================== 类型定义 ====================

/** SMS 服务商类型 */
export type SmsProvider = "SMS_RU" | "MTS" | "TWILIO";

/** 验证码用途 */
export type VerificationPurpose =
  | "REGISTER"
  | "LOGIN"
  | "RESET_PASSWORD"
  | "SENSITIVE_ACTION"
  | "WITHDRAWAL";

/** 验证码状态 */
export type VerificationStatus = "SENT" | "VERIFIED" | "EXPIRED" | "FAILED";

/** SMS 发送请求 */
export interface SmsSendRequest {
  phone: string; // 手机号（含国际区号，如 +7...）
  purpose: VerificationPurpose; // 用途
  userId?: number; // 用户 ID（可选）
  userType?: string; // 用户类型（可选）
  ipAddress?: string; // IP 地址
  userAgent?: string; // User-Agent
}

/** SMS 发送响应 */
export interface SmsSendResponse {
  success: boolean;
  messageId?: string; // 消息 ID
  provider?: SmsProvider; // 使用的服务商
  expiresAt?: Date; // 过期时间
  errorCode?: string;
  errorMessage?: string;
  cooldownRemaining?: number; // 剩余冷却时间（秒）
}

/** SMS 验证请求 */
export interface SmsVerifyRequest {
  phone: string;
  code: string;
  purpose: VerificationPurpose;
}

/** SMS 验证响应 */
export interface SmsVerifyResponse {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  attemptsRemaining?: number;
}

/** 服务商配置 */
export interface ProviderConfig {
  providerName: SmsProvider;
  region: string;
  priority: number;
  apiConfig: Record<string, string>;
  isActive: boolean;
}

/** 限流状态 */
export interface RateLimitStatus {
  isLimited: boolean;
  cooldownRemaining: number;
  dailyCount: number;
  dailyLimit: number;
}

// ==================== 常量配置 ====================

/** 验证码有效期（秒） */
const CODE_EXPIRY_SECONDS = 300; // 5分钟

/** 验证码长度 */
const CODE_LENGTH = 6;

/** 每日发送限制 */
const DAILY_LIMIT_PER_PHONE = 10;

/** 发送冷却时间（秒） */
const COOLDOWN_SECONDS = 60;

/** 最大验证尝试次数 */
const MAX_VERIFY_ATTEMPTS = 5;

// ==================== 服务商 API 实现 ====================

/**
 * Sms.ru API 实现
 * 文档：https://sms.ru/api
 */
async function sendViaSmsRu(
  phone: string,
  message: string,
  config: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = config.api_key || process.env.SMS_RU_API_KEY;

  if (!apiKey) {
    return { success: false, error: "SMS_RU_API_KEY not configured" };
  }

  try {
    // Sms.ru API 格式
    const url = new URL("https://sms.ru/sms/send");
    url.searchParams.append("api_id", apiKey);
    url.searchParams.append("to", phone.replace("+", ""));
    url.searchParams.append("msg", message);
    url.searchParams.append("json", "1");

    // 支持测试模式
    if (
      config.test_mode === "true" ||
      process.env.SMS_RU_TEST_MODE === "true"
    ) {
      url.searchParams.append("test", "1");
      console.log("[SmsService] SMS.ru 测试模式已启用");
    }

    const response = await fetch(url.toString());
    const result = await response.json();

    // Sms.ru 返回格式：{ status: "OK", sms: { "79001234567": { status: "OK", sms_id: "..." } } }
    if (result.status === "OK") {
      const phoneKey = phone.replace("+", "");
      const smsResult = result.sms?.[phoneKey];
      if (smsResult?.status === "OK") {
        return { success: true, messageId: smsResult.sms_id };
      }
    }

    return { success: false, error: result.status_text || "Unknown error" };
  } catch (error) {
    console.error("[SmsService] Sms.ru API error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * MTS API 实现
 * 文档：https://www.mts.ru/business/api
 */
async function sendViaMts(
  phone: string,
  message: string,
  config: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = config.api_key || process.env.MTS_API_KEY;
  const apiSecret = config.api_secret || process.env.MTS_API_SECRET;

  if (!apiKey || !apiSecret) {
    return { success: false, error: "MTS credentials not configured" };
  }

  try {
    // MTS API 格式（简化实现）
    const response = await fetch("https://api.mts.ru/sms/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-Secret": apiSecret,
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        sender: "CHUTEA",
      }),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, messageId: result.message_id };
    }

    return { success: false, error: result.error || "Unknown error" };
  } catch (error) {
    console.error("[SmsService] MTS API error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Twilio API 实现
 * 文档：https://www.twilio.com/docs/sms
 */
async function sendViaTwilio(
  phone: string,
  message: string,
  config: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accountSid = config.account_sid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = config.auth_token || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = config.phone_number || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      }),
    });

    const result = await response.json();

    if (result.sid) {
      return { success: true, messageId: result.sid };
    }

    return { success: false, error: result.message || "Unknown error" };
  } catch (error) {
    console.error("[SmsService] Twilio API error:", error);
    return { success: false, error: String(error) };
  }
}

// ==================== 核心服务类 ====================

export class SmsService {
  private static instance: SmsService;

  private constructor() {}

  public static getInstance(): SmsService {
    if (!SmsService.instance) {
      SmsService.instance = new SmsService();
    }
    return SmsService.instance;
  }

  /**
   * 生成验证码
   */
  generateCode(): string {
    // 生成 6 位数字验证码
    const code = crypto.randomInt(100000, 999999).toString();
    return code;
  }

  /**
   * 从数据库获取服务商配置
   * 按优先级排序，支持自动切换
   */
  async getProviderConfigs(region: string = "RU"): Promise<ProviderConfig[]> {
    const db = await getDb();
    if (!db) {
      console.warn("[SmsService] Database not available, using default config");
      return this.getDefaultProviderConfigs(region);
    }

    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM sms_providers WHERE region = ? AND is_active = TRUE ORDER BY priority ASC`,
        [region]
      );

      if (rows && rows.length > 0) {
        return rows.map((row: any) => ({
          providerName: row.provider_name,
          region: row.region,
          priority: row.priority,
          apiConfig:
            typeof row.api_config === "string"
              ? JSON.parse(row.api_config)
              : row.api_config,
          isActive: row.is_active,
        }));
      }

      return this.getDefaultProviderConfigs(region);
    } catch (error) {
      console.error("[SmsService] Failed to get provider configs:", error);
      return this.getDefaultProviderConfigs(region);
    }
  }

  /**
   * 默认服务商配置
   */
  private getDefaultProviderConfigs(region: string): ProviderConfig[] {
    if (region === "RU" || region === "RUSSIA") {
      return [
        {
          providerName: "SMS_RU",
          region: "RU",
          priority: 1,
          apiConfig: {},
          isActive: true,
        },
        {
          providerName: "MTS",
          region: "RU",
          priority: 2,
          apiConfig: {},
          isActive: true,
        },
      ];
    }

    // 国际/中国
    return [
      {
        providerName: "TWILIO",
        region: "INTERNATIONAL",
        priority: 1,
        apiConfig: {},
        isActive: true,
      },
    ];
  }

  /**
   * 检查限流状态
   */
  async checkRateLimit(phone: string): Promise<RateLimitStatus> {
    const db = await getDb();
    if (!db) {
      return {
        isLimited: false,
        cooldownRemaining: 0,
        dailyCount: 0,
        dailyLimit: DAILY_LIMIT_PER_PHONE,
      };
    }

    try {
      // 检查最近一条发送记录（冷却时间）
      const [recentRows] = await (db as any).execute(
        `SELECT created_at FROM sms_verification_logs 
         WHERE phone = ? AND status = 'SENT' 
         ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );

      let cooldownRemaining = 0;
      if (recentRows && recentRows.length > 0) {
        const lastSentAt = new Date(recentRows[0].created_at);
        const elapsed = (Date.now() - lastSentAt.getTime()) / 1000;
        cooldownRemaining = Math.max(0, COOLDOWN_SECONDS - elapsed);
      }

      // 检查今日发送次数
      const [dailyRows] = await (db as any).execute(
        `SELECT COUNT(*) as count FROM sms_verification_logs 
         WHERE phone = ? AND DATE(created_at) = CURDATE()`,
        [phone]
      );

      const dailyCount = dailyRows?.[0]?.count || 0;

      return {
        isLimited: cooldownRemaining > 0 || dailyCount >= DAILY_LIMIT_PER_PHONE,
        cooldownRemaining: Math.ceil(cooldownRemaining),
        dailyCount,
        dailyLimit: DAILY_LIMIT_PER_PHONE,
      };
    } catch (error) {
      console.error("[SmsService] Failed to check rate limit:", error);
      return {
        isLimited: false,
        cooldownRemaining: 0,
        dailyCount: 0,
        dailyLimit: DAILY_LIMIT_PER_PHONE,
      };
    }
  }

  /**
   * 判断手机号所属地区
   */
  getRegionByPhone(phone: string): string {
    // 俄罗斯：+7
    if (phone.startsWith("+7") || phone.startsWith("7")) {
      return "RU";
    }
    // 中国：+86
    if (phone.startsWith("+86") || phone.startsWith("86")) {
      return "CN";
    }
    // 其他
    return "INTERNATIONAL";
  }

  /**
   * 核心方法：发送验证码
   */
  async sendVerificationCode(
    request: SmsSendRequest
  ): Promise<SmsSendResponse> {
    const { phone, purpose, userId, userType, ipAddress, userAgent } = request;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[SmsService] 📱 SEND VERIFICATION CODE`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Phone: ${phone}`);
    console.log(`Purpose: ${purpose}`);

    // 1. 检查限流
    const rateLimit = await this.checkRateLimit(phone);
    if (rateLimit.isLimited) {
      console.log(`Status: ⚠️ RATE LIMITED`);
      console.log(`Cooldown: ${rateLimit.cooldownRemaining}s`);
      console.log(
        `Daily Count: ${rateLimit.dailyCount}/${rateLimit.dailyLimit}`
      );
      console.log(`${"=".repeat(60)}\n`);

      if (rateLimit.cooldownRemaining > 0) {
        return {
          success: false,
          errorCode: "RATE_LIMITED",
          errorMessage: `请等待 ${rateLimit.cooldownRemaining} 秒后重试`,
          cooldownRemaining: rateLimit.cooldownRemaining,
        };
      }

      return {
        success: false,
        errorCode: "DAILY_LIMIT_EXCEEDED",
        errorMessage: `今日发送次数已达上限（${rateLimit.dailyLimit}次）`,
      };
    }

    // 2. 生成验证码
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_SECONDS * 1000);

    // 3. 构建短信内容
    const message = this.buildSmsMessage(code, purpose);

    // 4. 获取服务商配置（按优先级排序）
    const region = this.getRegionByPhone(phone);
    const providers = await this.getProviderConfigs(region);

    console.log(`Region: ${region}`);
    console.log(`Providers: ${providers.map(p => p.providerName).join(" → ")}`);

    // 5. 依次尝试发送（自动切换逻辑）
    let lastError = "";
    for (const provider of providers) {
      console.log(`\nTrying provider: ${provider.providerName}...`);

      const result = await this.sendViaProvider(provider, phone, message);

      if (result.success) {
        // 6. 记录日志
        await this.logSmsVerification({
          phone,
          code,
          purpose,
          provider: provider.providerName,
          status: "SENT",
          ipAddress,
          userAgent,
          expiresAt,
        });

        console.log(`Status: ✅ SENT`);
        console.log(`Provider: ${provider.providerName}`);
        console.log(`Message ID: ${result.messageId}`);
        console.log(`Expires: ${expiresAt.toISOString()}`);
        console.log(`${"=".repeat(60)}\n`);

        return {
          success: true,
          messageId: result.messageId,
          provider: provider.providerName,
          expiresAt,
        };
      }

      lastError = result.error || "Unknown error";
      console.log(`Failed: ${lastError}`);

      // 记录失败日志
      await this.logSmsVerification({
        phone,
        code,
        purpose,
        provider: provider.providerName,
        status: "FAILED",
        ipAddress,
        userAgent,
        expiresAt,
      });
    }

    // 所有服务商都失败
    console.log(`Status: ❌ ALL PROVIDERS FAILED`);
    console.log(`Last Error: ${lastError}`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      success: false,
      errorCode: "SEND_FAILED",
      errorMessage: "短信发送失败，请稍后重试",
    };
  }

  /**
   * 通过指定服务商发送
   */
  private async sendViaProvider(
    provider: ProviderConfig,
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (provider.providerName) {
      case "SMS_RU":
        return sendViaSmsRu(phone, message, provider.apiConfig);
      case "MTS":
        return sendViaMts(phone, message, provider.apiConfig);
      case "TWILIO":
        return sendViaTwilio(phone, message, provider.apiConfig);
      default:
        return {
          success: false,
          error: `Unknown provider: ${provider.providerName}`,
        };
    }
  }

  /**
   * 构建短信内容
   */
  private buildSmsMessage(code: string, purpose: VerificationPurpose): string {
    const purposeTexts: Record<VerificationPurpose, string> = {
      REGISTER: "注册",
      LOGIN: "登录",
      RESET_PASSWORD: "重置密码",
      SENSITIVE_ACTION: "敏感操作",
      WITHDRAWAL: "提现",
    };

    const purposeText = purposeTexts[purpose] || "验证";

    // 俄语 + 中文双语
    return `【CHUTEA】Ваш код подтверждения: ${code}. Действителен 5 минут. 您的${purposeText}验证码：${code}，5分钟内有效。`;
  }

  /**
   * 验证验证码
   */
  async verifyCode(request: SmsVerifyRequest): Promise<SmsVerifyResponse> {
    const { phone, code, purpose } = request;

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        errorCode: "DB_ERROR",
        errorMessage: "服务暂时不可用",
      };
    }

    try {
      // 查找最近的有效验证码
      const [rows] = await (db as any).execute(
        `SELECT * FROM sms_verification_logs 
         WHERE phone = ? AND purpose = ? AND status = 'SENT' AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [phone, purpose]
      );

      if (!rows || rows.length === 0) {
        return {
          success: false,
          errorCode: "CODE_NOT_FOUND",
          errorMessage: "验证码不存在或已过期",
        };
      }

      const record = rows[0];

      // 检查尝试次数
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        return {
          success: false,
          errorCode: "MAX_ATTEMPTS",
          errorMessage: "验证次数过多，请重新获取验证码",
          attemptsRemaining: 0,
        };
      }

      // 更新尝试次数
      await (db as any).execute(
        `UPDATE sms_verification_logs SET attempts = attempts + 1 WHERE id = ?`,
        [record.id]
      );

      // 验证码比对
      if (record.verification_code !== code) {
        const attemptsRemaining = MAX_VERIFY_ATTEMPTS - record.attempts - 1;
        return {
          success: false,
          errorCode: "CODE_MISMATCH",
          errorMessage: `验证码错误，还剩 ${attemptsRemaining} 次机会`,
          attemptsRemaining,
        };
      }

      // 验证成功，更新状态
      await (db as any).execute(
        `UPDATE sms_verification_logs SET status = 'VERIFIED', verified_at = NOW() WHERE id = ?`,
        [record.id]
      );

      console.log(`[SmsService] ✅ Code verified for ${phone}`);

      return { success: true };
    } catch (error) {
      console.error("[SmsService] Verify error:", error);
      return {
        success: false,
        errorCode: "VERIFY_ERROR",
        errorMessage: "验证失败，请稍后重试",
      };
    }
  }

  /**
   * 记录短信日志
   */
  private async logSmsVerification(params: {
    phone: string;
    code: string;
    purpose: VerificationPurpose;
    provider: SmsProvider;
    status: VerificationStatus;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
    geoCountry?: string;
    geoCity?: string;
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `INSERT INTO sms_verification_logs 
         (phone, verification_code, purpose, provider, status, ip_address, user_agent, expires_at, geo_country, geo_city, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.phone,
          params.code,
          params.purpose,
          params.provider,
          params.status,
          params.ipAddress || null,
          params.userAgent || null,
          params.expiresAt,
          params.geoCountry || null,
          params.geoCity || null,
        ]
      );
    } catch (error) {
      console.error("[SmsService] Failed to log SMS verification:", error);
    }
  }

  /**
   * 检查验证码是否已验证（用于敏感操作前置检查）
   */
  async isCodeVerified(
    phone: string,
    purpose: VerificationPurpose,
    withinMinutes: number = 10
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM sms_verification_logs 
         WHERE phone = ? AND purpose = ? AND status = 'VERIFIED' 
         AND verified_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
         ORDER BY verified_at DESC LIMIT 1`,
        [phone, purpose, withinMinutes]
      );

      return rows && rows.length > 0;
    } catch (error) {
      console.error("[SmsService] Check verified error:", error);
      return false;
    }
  }
}

// 导出单例
export const smsService = SmsService.getInstance();
