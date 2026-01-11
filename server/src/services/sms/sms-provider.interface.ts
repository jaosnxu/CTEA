/**
 * CHUTEA 智慧中台 - SMS Provider 抽象接口
 * 
 * Provider 模式设计：
 * - 定义通用的短信发送接口
 * - 支持未来更换供应商（腾讯云 → Sms.ru → Twilio）
 * - 所有实现类必须遵循此接口
 * 
 * 当前实现：TencentSmsProvider
 * 预留实现：SmsRuProvider, TwilioProvider
 */

// ==================== 类型定义 ====================

/** 短信类型 */
export type SmsType = 'VERIFICATION' | 'NOTIFICATION' | 'MARKETING';

/** 短信发送请求 */
export interface SmsSendRequest {
  /** 手机号（含国际区号，如 +7...） */
  phone: string;
  
  /** 短信类型 */
  type: SmsType;
  
  /** 模板参数（用于模板短信） */
  templateParams?: Record<string, string>;
  
  /** 自定义内容（用于非模板短信） */
  content?: string;
  
  /** 语言（ru/zh/en） */
  language?: string;
}

/** 短信发送响应 */
export interface SmsSendResponse {
  /** 是否成功 */
  success: boolean;
  
  /** 消息 ID（供应商返回） */
  messageId?: string;
  
  /** 供应商名称 */
  provider?: string;
  
  /** 错误码 */
  errorCode?: string;
  
  /** 错误信息 */
  errorMessage?: string;
  
  /** 请求 ID（用于追踪） */
  requestId?: string;
}

/** 验证码发送请求 */
export interface VerificationCodeRequest {
  /** 手机号 */
  phone: string;
  
  /** 验证码（如果不传则自动生成） */
  code?: string;
  
  /** 语言 */
  language?: string;
  
  /** 有效期（秒） */
  expireSeconds?: number;
}

/** 验证码发送响应 */
export interface VerificationCodeResponse extends SmsSendResponse {
  /** 生成的验证码（仅内部使用，不返回给前端） */
  code?: string;
  
  /** 过期时间 */
  expiresAt?: Date;
}

/** Provider 配置 */
export interface SmsProviderConfig {
  /** 供应商名称 */
  name: string;
  
  /** 是否启用 */
  enabled: boolean;
  
  /** 优先级（数字越小优先级越高） */
  priority: number;
  
  /** 支持的地区 */
  regions: string[];
}

// ==================== 抽象接口 ====================

/**
 * SMS Provider 抽象接口
 * 
 * 所有短信供应商实现类必须实现此接口
 */
export interface ISmsProvider {
  /** 供应商名称 */
  readonly name: string;
  
  /** 供应商配置 */
  readonly config: SmsProviderConfig;
  
  /**
   * 发送短信
   * @param request 发送请求
   * @returns 发送响应
   */
  sendSms(request: SmsSendRequest): Promise<SmsSendResponse>;
  
  /**
   * 发送验证码
   * @param request 验证码请求
   * @returns 验证码响应
   */
  sendVerificationCode(request: VerificationCodeRequest): Promise<VerificationCodeResponse>;
  
  /**
   * 检查供应商是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * 获取供应商状态
   * @returns 状态信息
   */
  getStatus(): Promise<{
    available: boolean;
    balance?: number;
    quota?: number;
    lastError?: string;
  }>;
}

// ==================== 工具函数 ====================

/**
 * 生成 6 位数字验证码
 */
export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

/**
 * 验证手机号格式
 */
export function validatePhoneNumber(phone: string): boolean {
  // 支持国际格式：+7..., +86..., +1...
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * 获取手机号所属地区
 */
export function getPhoneRegion(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  
  if (cleaned.startsWith('+7') || cleaned.startsWith('7')) {
    return 'RU';
  }
  if (cleaned.startsWith('+86') || cleaned.startsWith('86')) {
    return 'CN';
  }
  if (cleaned.startsWith('+1')) {
    return 'US';
  }
  
  return 'INTERNATIONAL';
}

// ==================== 错误消息（多语言） ====================

export const SMS_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  'invalid_phone': {
    'ru': 'Неверный номер телефона.',
    'zh': '手机号格式错误',
    'en': 'Invalid phone number.',
  },
  'send_failed': {
    'ru': 'Не удалось отправить SMS. Попробуйте позже.',
    'zh': '短信发送失败，请稍后重试',
    'en': 'Failed to send SMS. Please try again later.',
  },
  'rate_limited': {
    'ru': 'Слишком много запросов. Пожалуйста, подождите.',
    'zh': '请求过于频繁，请稍后再试',
    'en': 'Too many requests. Please wait.',
  },
  'provider_unavailable': {
    'ru': 'Сервис временно недоступен.',
    'zh': '服务暂时不可用',
    'en': 'Service temporarily unavailable.',
  },
  'captcha_required': {
    'ru': 'Требуется проверка безопасности.',
    'zh': '需要安全验证',
    'en': 'Security verification required.',
  },
  'captcha_failed': {
    'ru': 'Проверка безопасности не пройдена.',
    'zh': '安全验证失败',
    'en': 'Security verification failed.',
  },
};

/**
 * 获取本地化错误消息
 */
export function getLocalizedError(key: string, lang: string = 'ru'): string {
  const messages = SMS_ERROR_MESSAGES[key];
  if (messages) {
    return messages[lang] || messages['ru'];
  }
  return SMS_ERROR_MESSAGES['send_failed'][lang] || SMS_ERROR_MESSAGES['send_failed']['ru'];
}
