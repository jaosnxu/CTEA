/**
 * CHUTEA 智慧中台 - 腾讯云 SMS Provider 实现
 * 
 * 实现 ISmsProvider 接口
 * 对接腾讯云短信服务 API
 * 
 * 配置解耦：所有密钥从环境变量读取
 * - TENCENT_SMS_SECRET_ID
 * - TENCENT_SMS_SECRET_KEY
 * - TENCENT_SMS_APP_ID
 * - TENCENT_SMS_SIGN_NAME
 * - TENCENT_SMS_TEMPLATE_ID_VERIFICATION
 */

import crypto from 'crypto';
import {
  ISmsProvider,
  SmsProviderConfig,
  SmsSendRequest,
  SmsSendResponse,
  VerificationCodeRequest,
  VerificationCodeResponse,
  generateVerificationCode,
  validatePhoneNumber,
  getLocalizedError,
} from './sms-provider.interface';

// ==================== 配置 ====================

/** 从环境变量读取配置（禁止硬编码） */
const getConfig = () => ({
  secretId: process.env.TENCENT_SMS_SECRET_ID || process.env.TENCENT_SECRET_ID || '',
  secretKey: process.env.TENCENT_SMS_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '',
  appId: process.env.TENCENT_SMS_APP_ID || '',
  signName: process.env.TENCENT_SMS_SIGN_NAME || 'CHUTEA',
  templateIdVerification: process.env.TENCENT_SMS_TEMPLATE_ID_VERIFICATION || '',
  templateIdNotification: process.env.TENCENT_SMS_TEMPLATE_ID_NOTIFICATION || '',
  region: process.env.TENCENT_SMS_REGION || 'ap-guangzhou',
  endpoint: 'sms.tencentcloudapi.com',
});

/** 验证码有效期（秒） */
const CODE_EXPIRY_SECONDS = 300; // 5 分钟

// ==================== 腾讯云 API 签名 ====================

/**
 * 生成腾讯云 API v3 签名
 */
function generateTencentCloudSignature(
  secretId: string,
  secretKey: string,
  service: string,
  payload: string,
  timestamp: number,
  endpoint: string
): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const algorithm = 'TC3-HMAC-SHA256';
  
  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${endpoint}\n`;
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
  
  // 2. 拼接待签名字符串
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
  
  // 3. 计算签名
  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');
  
  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// ==================== TencentSmsProvider 实现 ====================

export class TencentSmsProvider implements ISmsProvider {
  readonly name = 'TENCENT';
  readonly config: SmsProviderConfig;
  
  constructor() {
    this.config = {
      name: 'TENCENT',
      enabled: true,
      priority: 1,
      regions: ['CN', 'RU', 'INTERNATIONAL'],
    };
  }
  
  /**
   * 发送短信
   */
  async sendSms(request: SmsSendRequest): Promise<SmsSendResponse> {
    const { phone, type, templateParams, language = 'ru' } = request;
    const config = getConfig();
    
    console.log(`[TencentSmsProvider] 发送短信: phone=${phone.substring(0, 5)}***, type=${type}`);
    
    // 验证配置
    if (!config.secretId || !config.secretKey || !config.appId) {
      console.error('[TencentSmsProvider] 配置缺失！请检查环境变量');
      return {
        success: false,
        provider: this.name,
        errorCode: 'CONFIG_MISSING',
        errorMessage: getLocalizedError('provider_unavailable', language),
      };
    }
    
    // 验证手机号
    if (!validatePhoneNumber(phone)) {
      return {
        success: false,
        provider: this.name,
        errorCode: 'INVALID_PHONE',
        errorMessage: getLocalizedError('invalid_phone', language),
      };
    }
    
    // 选择模板 ID
    const templateId = type === 'VERIFICATION' 
      ? config.templateIdVerification 
      : config.templateIdNotification;
    
    if (!templateId) {
      console.error(`[TencentSmsProvider] 模板 ID 未配置: type=${type}`);
      return {
        success: false,
        provider: this.name,
        errorCode: 'TEMPLATE_MISSING',
        errorMessage: getLocalizedError('provider_unavailable', language),
      };
    }
    
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 构建请求体
      const payload = JSON.stringify({
        PhoneNumberSet: [phone],
        SmsSdkAppId: config.appId,
        SignName: config.signName,
        TemplateId: templateId,
        TemplateParamSet: templateParams ? Object.values(templateParams) : [],
      });
      
      const authorization = generateTencentCloudSignature(
        config.secretId,
        config.secretKey,
        'sms',
        payload,
        timestamp,
        config.endpoint
      );
      
      const response = await fetch(`https://${config.endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Host': config.endpoint,
          'X-TC-Action': 'SendSms',
          'X-TC-Version': '2021-01-11',
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Region': config.region,
          'Authorization': authorization,
        },
        body: payload,
      });
      
      const result = await response.json();
      
      console.log('[TencentSmsProvider] API 响应:', JSON.stringify(result, null, 2));
      
      // 解析响应
      if (result.Response?.SendStatusSet?.[0]?.Code === 'Ok') {
        const sendStatus = result.Response.SendStatusSet[0];
        return {
          success: true,
          provider: this.name,
          messageId: sendStatus.SerialNo,
          requestId: result.Response.RequestId,
        };
      }
      
      // 处理错误
      const errorCode = result.Response?.SendStatusSet?.[0]?.Code || result.Response?.Error?.Code || 'UNKNOWN';
      const errorMessage = result.Response?.SendStatusSet?.[0]?.Message || result.Response?.Error?.Message || 'Unknown error';
      
      console.error(`[TencentSmsProvider] 发送失败: ${errorCode} - ${errorMessage}`);
      
      return {
        success: false,
        provider: this.name,
        errorCode,
        errorMessage: getLocalizedError('send_failed', language),
        requestId: result.Response?.RequestId,
      };
      
    } catch (error) {
      console.error('[TencentSmsProvider] API 调用异常:', error);
      return {
        success: false,
        provider: this.name,
        errorCode: 'API_ERROR',
        errorMessage: getLocalizedError('send_failed', language),
      };
    }
  }
  
  /**
   * 发送验证码
   */
  async sendVerificationCode(request: VerificationCodeRequest): Promise<VerificationCodeResponse> {
    const { phone, code: providedCode, language = 'ru', expireSeconds = CODE_EXPIRY_SECONDS } = request;
    
    // 生成或使用提供的验证码
    const code = providedCode || generateVerificationCode();
    const expiresAt = new Date(Date.now() + expireSeconds * 1000);
    
    console.log(`[TencentSmsProvider] 发送验证码: phone=${phone.substring(0, 5)}***, code=${code}`);
    
    // 调用发送短信
    const result = await this.sendSms({
      phone,
      type: 'VERIFICATION',
      templateParams: {
        code,
        expireMinutes: String(Math.floor(expireSeconds / 60)),
      },
      language,
    });
    
    return {
      ...result,
      code: result.success ? code : undefined,
      expiresAt: result.success ? expiresAt : undefined,
    };
  }
  
  /**
   * 检查供应商是否可用
   */
  async isAvailable(): Promise<boolean> {
    const config = getConfig();
    return !!(config.secretId && config.secretKey && config.appId);
  }
  
  /**
   * 获取供应商状态
   */
  async getStatus(): Promise<{
    available: boolean;
    balance?: number;
    quota?: number;
    lastError?: string;
  }> {
    const available = await this.isAvailable();
    
    return {
      available,
      // 腾讯云 SMS 余额查询需要额外 API，暂不实现
      balance: undefined,
      quota: undefined,
      lastError: available ? undefined : '配置缺失',
    };
  }
}

// ==================== 导出单例 ====================

let instance: TencentSmsProvider | null = null;

export function getTencentSmsProvider(): TencentSmsProvider {
  if (!instance) {
    instance = new TencentSmsProvider();
  }
  return instance;
}

export default TencentSmsProvider;
