/**
 * CHUTEA 智慧中台 - 腾讯云验证码服务 (Captcha Service)
 *
 * 功能：
 * 1. 对接腾讯云验证码 API，完成后端票据（Ticket）校验
 * 2. 支持 SLIDE（滑块）、CLICK（点选）、SMART（无感）三种验证类型
 * 3. 记录校验日志到 captcha_verify_logs 表
 * 4. 集成用户信任分智能降级逻辑
 *
 * 严禁 Hardcode：所有配置从数据库 captcha_configs 表读取
 */

import crypto from "crypto";
import { getDb } from "../../db";

// ==================== 类型定义 ====================

/** 验证码类型 */
export type CaptchaType = "SLIDE" | "CLICK" | "SMART";

/** 验证场景 */
export type VerificationScenario =
  | "FAN_REGISTER"
  | "INFLUENCER_WITHDRAWAL"
  | "STORE_MANAGER_PRICE_CHANGE"
  | "STORE_MANAGER_REFUND"
  | "ADMIN_LOGIN";

/** 腾讯云验证码校验请求参数 */
export interface CaptchaVerifyRequest {
  ticket: string; // 前端获取的验证票据
  randstr: string; // 前端获取的随机字符串
  userIp: string; // 用户 IP 地址
  captchaType?: CaptchaType; // 验证码类型
  orgId?: number; // 组织 ID（用于获取配置）
}

/** 腾讯云验证码校验响应 */
export interface CaptchaVerifyResponse {
  success: boolean; // 校验是否成功
  errorCode?: string; // 错误码
  errorMessage?: string; // 错误信息
  captchaCode?: number; // 腾讯云返回的验证码结果码
  evilLevel?: number; // 恶意等级（0-100）
  requestId?: string; // 请求 ID
}

/** 验证码配置 */
export interface CaptchaConfig {
  captchaAppId: string;
  captchaAppSecret: string;
  captchaType: CaptchaType;
  isActive: boolean;
}

/** 验证规则 */
export interface VerificationRule {
  scenario: VerificationScenario;
  requireCaptcha: boolean;
  captchaType: CaptchaType;
  requireSms: boolean;
  smsCooldownSec: number;
  maxAttempts: number;
  blockDurationMin: number;
  isActive: boolean;
}

/** 用户信任分 */
export interface UserTrustScore {
  userId: number;
  trustScore: number;
  trustLevel: "HIGH_RISK" | "NORMAL" | "TRUSTED" | "VIP";
  dailySkipQuota: number;
  dailySkipUsed: number;
}

// ==================== 腾讯云 API 签名 ====================

/**
 * 生成腾讯云 API v3 签名
 * @param secretId 密钥 ID
 * @param secretKey 密钥 Key
 * @param service 服务名称
 * @param payload 请求体
 * @param timestamp 时间戳
 */
function generateTencentCloudSignature(
  secretId: string,
  secretKey: string,
  service: string,
  payload: string,
  timestamp: number
): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const algorithm = "TC3-HMAC-SHA256";

  // 1. 拼接规范请求串
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:captcha.tencentcloudapi.com\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  // 2. 拼接待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  // 3. 计算签名
  const secretDate = crypto
    .createHmac("sha256", `TC3${secretKey}`)
    .update(date)
    .digest();
  const secretService = crypto
    .createHmac("sha256", secretDate)
    .update(service)
    .digest();
  const secretSigning = crypto
    .createHmac("sha256", secretService)
    .update("tc3_request")
    .digest();
  const signature = crypto
    .createHmac("sha256", secretSigning)
    .update(stringToSign)
    .digest("hex");

  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// ==================== 核心服务类 ====================

export class CaptchaService {
  private static instance: CaptchaService;

  private constructor() {}

  public static getInstance(): CaptchaService {
    if (!CaptchaService.instance) {
      CaptchaService.instance = new CaptchaService();
    }
    return CaptchaService.instance;
  }

  /**
   * 从数据库获取验证码配置
   * 严禁 Hardcode：配置必须从 captcha_configs 表读取
   */
  async getCaptchaConfig(orgId?: number): Promise<CaptchaConfig | null> {
    const db = await getDb();
    if (!db) {
      console.error("[CaptchaService] Database not available");
      return null;
    }

    try {
      // 优先获取组织级配置，否则获取全局配置
      const query = orgId
        ? `SELECT * FROM captcha_configs WHERE org_id = ? AND is_active = TRUE LIMIT 1`
        : `SELECT * FROM captcha_configs WHERE org_id IS NULL AND is_active = TRUE LIMIT 1`;

      const [rows] = await (db as any).execute(query, orgId ? [orgId] : []);

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          captchaAppId: row.captcha_app_id,
          captchaAppSecret: row.captcha_app_secret,
          captchaType: row.captcha_type,
          isActive: row.is_active,
        };
      }

      // 如果没有配置，返回默认测试配置（仅开发环境）
      if (process.env.NODE_ENV === "development") {
        console.warn("[CaptchaService] Using development fallback config");
        return {
          captchaAppId: process.env.TENCENT_CAPTCHA_APP_ID || "TEST_APP_ID",
          captchaAppSecret:
            process.env.TENCENT_CAPTCHA_APP_SECRET || "TEST_APP_SECRET",
          captchaType: "SLIDE",
          isActive: true,
        };
      }

      return null;
    } catch (error) {
      console.error("[CaptchaService] Failed to get captcha config:", error);
      return null;
    }
  }

  /**
   * 从数据库获取验证规则
   * 严禁 Hardcode：规则必须从 verification_rules 表读取
   */
  async getVerificationRule(
    scenario: VerificationScenario
  ): Promise<VerificationRule | null> {
    const db = await getDb();
    if (!db) {
      console.error("[CaptchaService] Database not available");
      return null;
    }

    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM verification_rules WHERE scenario = ? AND is_active = TRUE LIMIT 1`,
        [scenario]
      );

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          scenario: row.scenario,
          requireCaptcha: row.require_captcha,
          captchaType: row.captcha_type,
          requireSms: row.require_sms,
          smsCooldownSec: row.sms_cooldown_sec,
          maxAttempts: row.max_attempts,
          blockDurationMin: row.block_duration_min,
          isActive: row.is_active,
        };
      }

      return null;
    } catch (error) {
      console.error("[CaptchaService] Failed to get verification rule:", error);
      return null;
    }
  }

  /**
   * 获取用户信任分
   */
  async getUserTrustScore(userId: number): Promise<UserTrustScore | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM user_trust_scores WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          userId: row.user_id,
          trustScore: row.trust_score,
          trustLevel: row.trust_level,
          dailySkipQuota: row.daily_skip_quota,
          dailySkipUsed: row.daily_skip_used,
        };
      }

      return null;
    } catch (error) {
      console.error("[CaptchaService] Failed to get user trust score:", error);
      return null;
    }
  }

  /**
   * 检查用户是否可以跳过验证（智能降级）
   * 基于信任分和每日配额
   */
  async canSkipVerification(
    userId: number,
    scenario: VerificationScenario
  ): Promise<boolean> {
    // 永不降级的红线场景
    const neverSkipScenarios: VerificationScenario[] = [
      "FAN_REGISTER",
      "INFLUENCER_WITHDRAWAL",
      "STORE_MANAGER_PRICE_CHANGE",
      "STORE_MANAGER_REFUND",
      "ADMIN_LOGIN",
    ];

    if (neverSkipScenarios.includes(scenario)) {
      return false;
    }

    const trustScore = await this.getUserTrustScore(userId);
    if (!trustScore) return false;

    // VIP 用户可以跳过
    if (trustScore.trustLevel === "VIP") {
      return true;
    }

    // TRUSTED 用户检查每日配额
    if (trustScore.trustLevel === "TRUSTED") {
      return trustScore.dailySkipUsed < trustScore.dailySkipQuota;
    }

    return false;
  }

  /**
   * 核心方法：校验腾讯云验证码票据
   *
   * @param request 校验请求参数
   * @returns 校验结果
   */
  async verifyTicket(
    request: CaptchaVerifyRequest
  ): Promise<CaptchaVerifyResponse> {
    const { ticket, randstr, userIp, captchaType, orgId } = request;

    // 1. 获取配置
    const config = await this.getCaptchaConfig(orgId);
    if (!config) {
      return {
        success: false,
        errorCode: "CONFIG_NOT_FOUND",
        errorMessage: "验证码配置未找到，请联系管理员",
      };
    }

    // 2. 开发环境模拟校验
    if (process.env.NODE_ENV === "development" && ticket === "TEST_TICKET") {
      console.log("[CaptchaService] Development mode: accepting test ticket");
      await this.logVerifyResult({
        orgId,
        captchaType: captchaType || config.captchaType,
        ticket,
        randstr,
        verifyResult: true,
        ipAddress: userIp,
      });
      return {
        success: true,
        captchaCode: 1,
        evilLevel: 0,
        requestId: `DEV_${Date.now()}`,
      };
    }

    // 3. 调用腾讯云 API
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({
        CaptchaType: 9, // 固定值：9 表示验证码
        Ticket: ticket,
        UserIp: userIp,
        Randstr: randstr,
        CaptchaAppId: parseInt(config.captchaAppId),
        AppSecretKey: config.captchaAppSecret,
      });

      const authorization = generateTencentCloudSignature(
        process.env.TENCENT_SECRET_ID || "",
        process.env.TENCENT_SECRET_KEY || "",
        "captcha",
        payload,
        timestamp
      );

      const response = await fetch("https://captcha.tencentcloudapi.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Host: "captcha.tencentcloudapi.com",
          "X-TC-Action": "DescribeCaptchaResult",
          "X-TC-Version": "2019-07-22",
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Region": "ap-guangzhou",
          Authorization: authorization,
        },
        body: payload,
      });

      const result = await response.json();

      // 4. 解析响应
      const captchaCode = result.Response?.CaptchaCode;
      const evilLevel = result.Response?.EvilLevel || 0;
      const requestId = result.Response?.RequestId;

      const success = captchaCode === 1; // 1 表示验证通过

      // 5. 记录日志
      await this.logVerifyResult({
        orgId,
        captchaType: captchaType || config.captchaType,
        ticket,
        randstr,
        verifyResult: success,
        errorCode: success ? undefined : String(captchaCode),
        ipAddress: userIp,
      });

      return {
        success,
        captchaCode,
        evilLevel,
        requestId,
        errorCode: success ? undefined : `CAPTCHA_${captchaCode}`,
        errorMessage: success
          ? undefined
          : this.getCaptchaErrorMessage(captchaCode),
      };
    } catch (error) {
      console.error("[CaptchaService] API call failed:", error);

      // 记录失败日志
      await this.logVerifyResult({
        orgId,
        captchaType: captchaType || config.captchaType,
        ticket,
        randstr,
        verifyResult: false,
        errorCode: "API_ERROR",
        ipAddress: userIp,
      });

      return {
        success: false,
        errorCode: "API_ERROR",
        errorMessage: "验证码服务暂时不可用，请稍后重试",
      };
    }
  }

  /**
   * 记录验证码校验日志
   */
  private async logVerifyResult(params: {
    orgId?: number;
    userType?: string;
    userId?: number;
    captchaType: CaptchaType;
    ticket: string;
    randstr?: string;
    verifyResult: boolean;
    errorCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await (db as any).execute(
        `INSERT INTO captcha_verify_logs 
         (org_id, user_type, user_id, captcha_type, ticket, randstr, verify_result, error_code, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.orgId || null,
          params.userType || null,
          params.userId || null,
          params.captchaType,
          params.ticket,
          params.randstr || null,
          params.verifyResult,
          params.errorCode || null,
          params.ipAddress || null,
          params.userAgent || null,
        ]
      );

      console.log(
        `[CaptchaService] Verify log recorded: ${params.verifyResult ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      console.error("[CaptchaService] Failed to log verify result:", error);
    }
  }

  /**
   * 获取验证码错误信息
   */
  private getCaptchaErrorMessage(code: number): string {
    const errorMessages: Record<number, string> = {
      1: "验证通过",
      7: "验证码已过期，请重新获取",
      8: "验证码不正确",
      9: "验证码已使用",
      15: "验证码签名错误",
      16: "验证码参数错误",
      21: "验证码票据已过期",
      100: "验证码 AppId 错误",
    };

    return errorMessages[code] || `验证失败（错误码：${code}）`;
  }

  /**
   * 检查场景是否需要验证码
   */
  async requiresCaptcha(
    scenario: VerificationScenario,
    userId?: number
  ): Promise<{
    required: boolean;
    captchaType?: CaptchaType;
    canSkip?: boolean;
  }> {
    const rule = await this.getVerificationRule(scenario);

    if (!rule || !rule.requireCaptcha) {
      return { required: false };
    }

    // 检查是否可以跳过（智能降级）
    if (userId) {
      const canSkip = await this.canSkipVerification(userId, scenario);
      if (canSkip) {
        return { required: true, captchaType: rule.captchaType, canSkip: true };
      }
    }

    return { required: true, captchaType: rule.captchaType, canSkip: false };
  }
}

// ==================== 语言适配器 ====================

/** 系统支持的语言 */
export type SystemLanguage = "zh" | "ru" | "en";

/** 腾讯云验证码支持的语言代码 */
export type TencentCaptchaLanguage = "zh-cn" | "ru" | "en";

/**
 * 语言适配器
 *
 * 映射规则：
 * - 系统语言 'zh' → 腾讯云 'zh-cn'（简体中文）
 * - 系统语言 'ru' → 腾讯云 'ru'（俄语）
 * - 系统语言 'en' → 腾讯云 'en'（英语）
 */
export function getLanguageAdapter() {
  return {
    /** 系统语言 → 腾讯云语言代码映射 */
    LANGUAGE_MAP: {
      zh: "zh-cn",
      ru: "ru",
      en: "en",
    } as Record<SystemLanguage, TencentCaptchaLanguage>,

    /** 支持的系统语言列表 */
    SUPPORTED_LANGUAGES: ["zh", "ru", "en"] as const,

    /**
     * 系统语言转腾讯云语言代码
     */
    toTencentCaptcha(lang: SystemLanguage): TencentCaptchaLanguage {
      const map: Record<SystemLanguage, TencentCaptchaLanguage> = {
        zh: "zh-cn",
        ru: "ru",
        en: "en",
      };
      return map[lang] || "ru";
    },

    /**
     * 从 Accept-Language 请求头解析系统语言
     */
    fromAcceptLanguage(acceptLanguage: string | undefined): SystemLanguage {
      if (!acceptLanguage) return "ru";

      const lang = acceptLanguage.toLowerCase();
      if (lang.startsWith("zh")) return "zh";
      if (lang.startsWith("ru")) return "ru";
      if (lang.startsWith("en")) return "en";

      return "ru"; // 默认俄语（俄罗斯市场）
    },

    /**
     * 验证语言代码是否有效
     */
    isValidLanguage(lang: string): lang is SystemLanguage {
      return ["zh", "ru", "en"].includes(lang);
    },
  };
}

/**
 * 多语言错误消息
 *
 * 用于 SecurityMiddleware 返回 403 拦截响应时的多语言支持
 */
export const ErrorMessages = {
  /** 缺少验证票据 */
  MISSING_CAPTCHA: {
    zh: "此操作需要完成验证",
    ru: "Для этой операции требуется проверка",
    en: "This operation requires verification",
  },

  /** 验证票据无效 */
  INVALID_CAPTCHA: {
    zh: "验证票据无效，请重新验证",
    ru: "Недействительный тикет проверки, пожалуйста, повторите",
    en: "Invalid verification ticket, please try again",
  },

  /** 需要滑块验证 */
  REQUIRE_SLIDE: {
    zh: "此操作需要完成 滑块验证",
    ru: "Для этой операции требуется слайд-проверка",
    en: "This operation requires slide verification",
  },

  /** 需要点选验证 */
  REQUIRE_CLICK: {
    zh: "此操作需要完成 点选验证",
    ru: "Для этой операции требуется клик-проверка",
    en: "This operation requires click verification",
  },

  /** 需要无感验证 */
  REQUIRE_SMART: {
    zh: "此操作需要完成 智能验证",
    ru: "Для этой операции требуется умная проверка",
    en: "This operation requires smart verification",
  },

  /** IP 已被封禁 */
  IP_BLOCKED: {
    zh: "您的 IP 已被临时封禁，请稍后重试",
    ru: "Ваш IP временно заблокирован, повторите попытку позже",
    en: "Your IP has been temporarily blocked, please try again later",
  },

  /** 设备已被封禁 */
  DEVICE_BLOCKED: {
    zh: "您的设备已被临时封禁，请稍后重试",
    ru: "Ваше устройство временно заблокировано, повторите попытку позже",
    en: "Your device has been temporarily blocked, please try again later",
  },

  /** 需要短信验证 */
  REQUIRE_SMS: {
    zh: "此操作需要短信验证",
    ru: "Для этой операции требуется SMS-подтверждение",
    en: "This operation requires SMS verification",
  },
};

/**
 * 根据语言获取错误消息
 */
export function getErrorMessage(
  key: keyof typeof ErrorMessages,
  lang: SystemLanguage = "ru"
): string {
  return ErrorMessages[key][lang] || ErrorMessages[key]["ru"];
}

/**
 * 根据验证码类型获取错误消息
 */
export function getCaptchaRequiredMessage(
  captchaType: CaptchaType,
  lang: SystemLanguage = "ru"
): string {
  const typeMap: Record<CaptchaType, keyof typeof ErrorMessages> = {
    SLIDE: "REQUIRE_SLIDE",
    CLICK: "REQUIRE_CLICK",
    SMART: "REQUIRE_SMART",
  };

  return getErrorMessage(typeMap[captchaType], lang);
}

// 导出单例
export const captchaService = CaptchaService.getInstance();
