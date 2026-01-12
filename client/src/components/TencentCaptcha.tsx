/**
 * CHUTEA 智慧中台 - 腾讯云验证码前端组件
 *
 * 功能：
 * 1. 集成腾讯云验证码 SDK
 * 2. 动态语言适配（ru/zh/en）
 * 3. 验证成功后回调，传递 Ticket 和 Randstr
 *
 * 俄语适配：当系统语言为俄语时，验证码界面显示俄文
 */

import { useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// ==================== 类型定义 ====================

/** 验证码回调参数 */
export interface CaptchaCallbackResult {
  ticket: string;
  randstr: string;
}

/** 组件属性 */
export interface TencentCaptchaProps {
  /** 验证成功回调 */
  onSuccess: (result: CaptchaCallbackResult) => void;
  /** 验证失败/取消回调 */
  onError?: (error: string) => void;
  /** 自定义触发按钮 */
  children: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 腾讯云验证码 SDK 实例类型 */
interface TencentCaptchaInstance {
  show: () => void;
  destroy: () => void;
}

/** 腾讯云验证码 SDK 构造函数类型 */
interface TencentCaptchaSDK {
  new (
    appId: string,
    callback: (res: {
      ret: number;
      ticket: string;
      randstr: string;
      errorCode?: number;
      errorMessage?: string;
    }) => void,
    options?: {
      lang?: string;
      type?: string;
      needFeedBack?: boolean;
    }
  ): TencentCaptchaInstance;
}

declare global {
  interface Window {
    TencentCaptcha: TencentCaptchaSDK;
  }
}

// ==================== 配置 ====================

/** 新验证应用 AppId（Boss 确认） */
const CAPTCHA_APP_ID = "191003647";

/** 语言映射：系统语言 → 腾讯云 SDK 语言代码 */
const LANGUAGE_MAP: Record<string, string> = {
  ru: "ru", // 俄语
  zh: "zh-cn", // 简体中文
  en: "en", // 英语
};

/** 验证码错误提示（多语言） */
export const CAPTCHA_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  // 验证码过期
  expired: {
    ru: "Срок действия проверки истёк. Пожалуйста, попробуйте ещё раз.",
    zh: "验证码已过期，请重新验证",
    en: "Verification expired. Please try again.",
  },
  // 验证失败
  failed: {
    ru: "Проверка не пройдена. Пожалуйста, попробуйте ещё раз.",
    zh: "验证失败，请重试",
    en: "Verification failed. Please try again.",
  },
  // 操作频繁
  frequent: {
    ru: "Слишком много попыток. Пожалуйста, подождите немного.",
    zh: "操作过于频繁，请稍后再试",
    en: "Too many attempts. Please wait a moment.",
  },
  // 网络错误
  network: {
    ru: "Ошибка сети. Пожалуйста, проверьте подключение.",
    zh: "网络错误，请检查网络连接",
    en: "Network error. Please check your connection.",
  },
  // 用户取消
  cancelled: {
    ru: "Проверка отменена.",
    zh: "验证已取消",
    en: "Verification cancelled.",
  },
};

// ==================== 组件 ====================

/**
 * 腾讯云验证码组件
 *
 * 使用示例：
 * ```tsx
 * <TencentCaptcha
 *   onSuccess={({ ticket, randstr }) => {
 *     // 发送到后端校验
 *     api.verifyCaptcha({ ticket, randstr });
 *   }}
 *   onError={(error) => {
 *     toast.error(error);
 *   }}
 * >
 *   <Button>点击验证</Button>
 * </TencentCaptcha>
 * ```
 */
export function TencentCaptcha({
  onSuccess,
  onError,
  children,
  disabled = false,
}: TencentCaptchaProps) {
  const { language } = useLanguage();
  const captchaRef = useRef<TencentCaptchaInstance | null>(null);
  const sdkLoadedRef = useRef(false);

  // 获取腾讯云 SDK 语言代码
  const getSdkLanguage = useCallback(() => {
    return LANGUAGE_MAP[language] || "ru"; // 默认俄语
  }, [language]);

  // 获取本地化错误消息
  const getLocalizedError = useCallback(
    (key: string) => {
      const messages = CAPTCHA_ERROR_MESSAGES[key];
      if (messages) {
        return messages[language] || messages["ru"];
      }
      return (
        CAPTCHA_ERROR_MESSAGES["failed"][language] ||
        CAPTCHA_ERROR_MESSAGES["failed"]["ru"]
      );
    },
    [language]
  );

  // 加载腾讯云验证码 SDK
  useEffect(() => {
    if (sdkLoadedRef.current) return;

    const script = document.createElement("script");
    script.src = "https://ssl.captcha.qq.com/TCaptcha.js";
    script.async = true;
    script.onload = () => {
      sdkLoadedRef.current = true;
      console.log("[TencentCaptcha] SDK loaded successfully");
    };
    script.onerror = () => {
      console.error("[TencentCaptcha] Failed to load SDK");
    };
    document.head.appendChild(script);

    return () => {
      // 清理
      if (captchaRef.current) {
        captchaRef.current.destroy();
      }
    };
  }, []);

  // 触发验证码
  const handleClick = useCallback(() => {
    if (disabled) return;

    if (!window.TencentCaptcha) {
      console.error("[TencentCaptcha] SDK not loaded");
      onError?.(getLocalizedError("network"));
      return;
    }

    const sdkLang = getSdkLanguage();
    console.log(`[TencentCaptcha] Initializing with lang: ${sdkLang}`);

    // 创建验证码实例
    captchaRef.current = new window.TencentCaptcha(
      CAPTCHA_APP_ID,
      res => {
        console.log("[TencentCaptcha] Callback result:", res);

        if (res.ret === 0) {
          // 验证成功
          onSuccess({
            ticket: res.ticket,
            randstr: res.randstr,
          });
        } else if (res.ret === 2) {
          // 用户取消
          onError?.(getLocalizedError("cancelled"));
        } else {
          // 验证失败
          const errorKey =
            res.errorCode === 6
              ? "expired"
              : res.errorCode === 21
                ? "frequent"
                : "failed";
          onError?.(getLocalizedError(errorKey));
        }
      },
      {
        lang: sdkLang, // 🔥 关键：动态传入语言参数
        needFeedBack: false,
      }
    );

    // 显示验证码
    captchaRef.current.show();
  }, [disabled, getSdkLanguage, getLocalizedError, onSuccess, onError]);

  return (
    <div
      onClick={handleClick}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </div>
  );
}

// ==================== 导出工具函数 ====================

/**
 * 获取验证码语言代码
 * 用于后端 CaptchaService 的语言适配
 */
export function getCaptchaLanguageCode(systemLang: string): string {
  return LANGUAGE_MAP[systemLang] || "ru";
}

/**
 * 获取本地化错误消息
 * 用于后端返回错误时的前端显示
 */
export function getCaptchaErrorMessage(errorKey: string, lang: string): string {
  const messages = CAPTCHA_ERROR_MESSAGES[errorKey];
  if (messages) {
    return messages[lang] || messages["ru"];
  }
  return (
    CAPTCHA_ERROR_MESSAGES["failed"][lang] ||
    CAPTCHA_ERROR_MESSAGES["failed"]["ru"]
  );
}

export default TencentCaptcha;
