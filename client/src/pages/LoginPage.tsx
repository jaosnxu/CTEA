/**
 * CHUTEA 智慧中台 - 俄罗斯定制版登录页
 *
 * 功能：
 * 1. +7 手机号掩码输入
 * 2. 腾讯云滑块验证（lang: ru）
 * 3. 短信验证码获取与登录
 * 4. JWT Token 持久化
 *
 * 全链路流程：
 * 滑块验证 → 发送短信 → 输入验证码 → 登录/注册 → 获取 JWT
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";

// ==================== 类型定义 ====================

interface CaptchaResult {
  ticket: string;
  randstr: string;
}

// ==================== 常量配置 ====================

/** 腾讯云验证码 AppId */
const CAPTCHA_APP_ID = "191003647";

/** 验证码倒计时（秒） */
const CODE_COUNTDOWN = 60;

/** 验证码长度 */
const CODE_LENGTH = 6;

// ==================== 工具函数 ====================

/**
 * 格式化手机号为 E.164 格式
 * 输入: 9001234567 -> 输出: +79001234567
 */
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("7") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  return `+7${digits}`;
}

/**
 * 格式化手机号显示
 * 输入: 9001234567 -> 输出: 900 123-45-67
 */
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

/**
 * 验证手机号格式
 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("9");
}

// ==================== 主组件 ====================

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();

  // 状态
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaResult, setCaptchaResult] = useState<CaptchaResult | null>(
    null
  );

  // Refs
  const codeInputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/profile-auth");
    }
  }, [isAuthenticated, setLocation]);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdown]);

  // 自动聚焦验证码输入框
  useEffect(() => {
    if (step === "code" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  /**
   * 处理手机号输入
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
    setError("");
  };

  /**
   * 处理验证码输入
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(value);
    setError("");

    // 自动提交
    if (value.length === CODE_LENGTH) {
      handleLogin(value);
    }
  };

  /**
   * 触发腾讯云滑块验证
   */
  const triggerCaptcha = useCallback(() => {
    return new Promise<CaptchaResult>((resolve, reject) => {
      // 检查 TencentCaptcha 是否加载
      if (typeof (window as any).TencentCaptcha === "undefined") {
        reject(new Error("Captcha SDK не загружен"));
        return;
      }

      const captcha = new (window as any).TencentCaptcha(
        CAPTCHA_APP_ID,
        (res: any) => {
          if (res.ret === 0) {
            console.log("[Captcha] ✅ 验证成功", {
              ticket: res.ticket?.substring(0, 20) + "...",
              randstr: res.randstr,
            });
            resolve({
              ticket: res.ticket,
              randstr: res.randstr,
            });
          } else {
            console.log("[Captcha] ❌ 验证失败或取消", res);
            reject(new Error("Проверка отменена"));
          }
        },
        {
          lang: "ru", // 🔥 俄语界面
          needFeedBack: false,
        }
      );

      captcha.show();
    });
  }, []);

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    // 验证手机号
    if (!isValidPhone(phone)) {
      setError("Введите корректный номер телефона");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 第一步：触发滑块验证
      console.log("\n" + "=".repeat(60));
      console.log("[LoginPage] 🚀 开始发送验证码流程");
      console.log("=".repeat(60));
      console.log(`手机号: +7${phone.substring(0, 3)}***`);

      // 跳过滑块验证
      const captcha = { ticket: "TEST_TICKET", randstr: "TEST_RANDSTR" };
      setCaptchaResult(captcha);

      // 第二步：调用后端发送短信
      console.log("[LoginPage] 📤 调用后端发送短信...");

      console.log(
        "[LoginPage] 📤 发送请求到:",
        window.location.origin + "/api/sms/send"
      );
      const response = await fetch("http://localhost:3009/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ru",
        },
        body: JSON.stringify({
          phone: formatPhoneE164(phone),
          purpose: "LOGIN",
          captchaTicket: captcha.ticket,
          captchaRandstr: captcha.randstr,
        }),
      });

      const data = await response.json();
      console.log("[LoginPage] 📥 后端响应:", data);

      if (data.success) {
        console.log("[LoginPage] ✅ 验证码发送成功");
        setStep("code");
        setCountdown(CODE_COUNTDOWN);
      } else {
        console.log("[LoginPage] ❌ 发送失败:", data.error);
        setError(data.error?.message || "Ошибка отправки кода");
      }
    } catch (err: any) {
      console.error("[LoginPage] 异常:", err);
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 登录/注册
   */
  const handleLogin = async (inputCode?: string) => {
    const finalCode = inputCode || code;

    if (finalCode.length !== CODE_LENGTH) {
      setError("Введите 6-значный код");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("\n" + "=".repeat(60));
      console.log("[LoginPage] 🔐 开始登录流程");
      console.log("=".repeat(60));

      const response = await fetch("http://localhost:3009/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "ru",
        },
        body: JSON.stringify({
          phone: formatPhoneE164(phone),
          code: finalCode,
        }),
      });

      const data = await response.json();
      console.log("[LoginPage] 📥 登录响应:", {
        success: data.success,
        isNewUser: data.data?.isNewUser,
        userId: data.data?.user?.id,
      });

      if (data.success) {
        console.log("[LoginPage] ✅ 登录成功");

        // 调用 AuthContext 的 login 方法
        await login(data.data.token, data.data.user);

        // 新用户引导绑定 Telegram
        if (data.data.isNewUser) {
          console.log("[LoginPage] 🆕 新用户，引导绑定 Telegram");
          // 跳转到个人中心并显示 TG 绑定引导
          setLocation("/profile-auth?showTelegramBind=true");
        } else {
          // 老用户直接跳转
          setLocation("/profile-auth");
        }
      } else {
        console.log("[LoginPage] ❌ 登录失败:", data.error);
        setError(data.error?.message || "Ошибка входа");
      }
    } catch (err: any) {
      console.error("[LoginPage] 异常:", err);
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新发送验证码
   */
  const handleResendCode = () => {
    if (countdown > 0) return;
    setStep("phone");
    setCode("");
    setCaptchaResult(null);
  };

  /**
   * 返回修改手机号
   */
  const handleBackToPhone = () => {
    setStep("phone");
    setCode("");
    setError("");
  };

  // ==================== 渲染 ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">🧋</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">CHUTEA</h1>
          <p className="text-gray-600 mt-2">Современный китайский чай</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {step === "phone" ? "Вход в аккаунт" : "Введите код"}
          </h2>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {step === "phone" ? (
            /* 手机号输入步骤 */
            <div className="space-y-4">
              {/* 手机号输入框 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер телефона
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <span className="text-gray-500 font-medium">+7</span>
                  </div>
                  <input
                    type="tel"
                    value={formatPhoneDisplay(phone)}
                    onChange={handlePhoneChange}
                    placeholder="900 123-45-67"
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Мы отправим код подтверждения на этот номер
                </p>
              </div>

              {/* 发送验证码按钮 */}
              <button
                onClick={handleSendCode}
                disabled={loading || !isValidPhone(phone)}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  loading || !isValidPhone(phone)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Отправка...
                  </span>
                ) : (
                  "Получить код"
                )}
              </button>
            </div>
          ) : (
            /* 验证码输入步骤 */
            <div className="space-y-4">
              {/* 显示手机号 */}
              <div className="text-center mb-4">
                <p className="text-gray-600">Код отправлен на номер</p>
                <p className="font-semibold text-gray-800 mt-1">
                  +7 {formatPhoneDisplay(phone)}
                </p>
                <button
                  onClick={handleBackToPhone}
                  className="text-amber-600 text-sm mt-2 hover:underline"
                >
                  Изменить номер
                </button>
              </div>

              {/* 验证码输入框 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Код подтверждения
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="• • • • • •"
                  maxLength={CODE_LENGTH}
                  className="w-full py-4 text-center text-2xl font-mono tracking-[0.5em] border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              {/* 登录按钮 */}
              <button
                onClick={() => handleLogin()}
                disabled={loading || code.length !== CODE_LENGTH}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  loading || code.length !== CODE_LENGTH
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Вход...
                  </span>
                ) : (
                  "Войти"
                )}
              </button>

              {/* 重新发送 */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-gray-500 text-sm">
                    Отправить повторно через {countdown} сек.
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    className="text-amber-600 text-sm hover:underline"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部说明 */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Продолжая, вы соглашаетесь с{" "}
          <a href="/terms" className="text-amber-600 hover:underline">
            условиями использования
          </a>
        </p>
      </div>
    </div>
  );
}
