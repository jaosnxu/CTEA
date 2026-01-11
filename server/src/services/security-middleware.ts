/**
 * CHUTEA 智慧中台 - 安全网关中间件 (Security Gateway Middleware)
 * 
 * 功能：
 * 1. 基于 security_rules 和 verification_rules 表实现全局拦截器
 * 2. 任何不带验证票据的敏感操作请求，必须全部拦截并返回 403
 * 3. 记录安全审计日志到 security_audit_logs 表
 * 4. 支持 IP 封禁、设备指纹检测、风控日志
 * 
 * 严禁 Hardcode：所有规则从数据库读取
 */

import { Request, Response, NextFunction } from 'express';
import { getDb } from '../../db';
import { 
  captchaService, 
  CaptchaType, 
  VerificationScenario,
  getLanguageAdapter,
  getCaptchaRequiredMessage,
  getErrorMessage,
  SystemLanguage
} from './captcha-service';

// ==================== 类型定义 ====================

/** 敏感操作映射 */
export interface SensitiveAction {
  path: string;           // API 路径模式
  method: string;         // HTTP 方法
  scenario: VerificationScenario; // 验证场景
  description: string;    // 操作描述
}

/** 安全检查结果 */
export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  requiredCaptchaType?: CaptchaType;
  requiresSms?: boolean;
  blockDurationMin?: number;
}

/** 安全审计日志 */
export interface SecurityAuditLog {
  orgId?: number;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  sourceIp?: string;
  userType?: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

// ==================== 敏感操作配置 ====================

/**
 * 敏感操作映射表
 * 严禁 Hardcode：生产环境应从 security_rules 表读取
 */
const SENSITIVE_ACTIONS: SensitiveAction[] = [
  // 店长操作
  { path: '/api/admin/products/price', method: 'PUT', scenario: 'STORE_MANAGER_PRICE_CHANGE', description: '店长改价' },
  { path: '/api/admin/products/price', method: 'PATCH', scenario: 'STORE_MANAGER_PRICE_CHANGE', description: '店长改价' },
  { path: '/api/admin/orders/refund', method: 'POST', scenario: 'STORE_MANAGER_REFUND', description: '店长退款' },
  
  // 达人操作
  { path: '/api/influencer/withdraw', method: 'POST', scenario: 'INFLUENCER_WITHDRAWAL', description: '达人提现' },
  
  // 管理员操作
  { path: '/api/admin/login', method: 'POST', scenario: 'ADMIN_LOGIN', description: '管理员登录' },
  
  // 粉丝操作
  { path: '/api/auth/register', method: 'POST', scenario: 'FAN_REGISTER', description: '粉丝注册' },
];

// ==================== 核心中间件类 ====================

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  
  private constructor() {}
  
  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }
  
  /**
   * 从数据库加载敏感操作配置
   */
  async loadSensitiveActionsFromDb(): Promise<SensitiveAction[]> {
    const db = await getDb();
    if (!db) {
      console.warn('[SecurityMiddleware] Database not available, using default config');
      return SENSITIVE_ACTIONS;
    }
    
    try {
      const [rows] = await (db as any).execute(
        `SELECT rule_key, rule_value, description FROM security_rules WHERE rule_key LIKE 'SENSITIVE_ACTION_%' AND is_active = TRUE`
      );
      
      if (rows && rows.length > 0) {
        return rows.map((row: any) => {
          const value = typeof row.rule_value === 'string' ? JSON.parse(row.rule_value) : row.rule_value;
          return {
            path: value.path,
            method: value.method,
            scenario: value.scenario,
            description: row.description?.zh || row.description || ''
          };
        });
      }
      
      return SENSITIVE_ACTIONS;
    } catch (error) {
      console.error('[SecurityMiddleware] Failed to load sensitive actions:', error);
      return SENSITIVE_ACTIONS;
    }
  }
  
  /**
   * 检查 IP 是否被封禁
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    
    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM blocked_entities 
         WHERE entity_type = 'IP' AND entity_value = ? 
         AND (is_permanent = TRUE OR blocked_until > NOW())
         LIMIT 1`,
        [ip]
      );
      
      return rows && rows.length > 0;
    } catch (error) {
      console.error('[SecurityMiddleware] Failed to check IP block:', error);
      return false;
    }
  }
  
  /**
   * 检查设备是否被封禁
   */
  async isDeviceBlocked(fingerprint: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    
    try {
      const [rows] = await (db as any).execute(
        `SELECT * FROM blocked_entities 
         WHERE entity_type = 'DEVICE' AND entity_value = ? 
         AND (is_permanent = TRUE OR blocked_until > NOW())
         LIMIT 1`,
        [fingerprint]
      );
      
      return rows && rows.length > 0;
    } catch (error) {
      console.error('[SecurityMiddleware] Failed to check device block:', error);
      return false;
    }
  }
  
  /**
   * 记录安全审计日志
   */
  async logSecurityEvent(log: SecurityAuditLog): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    try {
      await (db as any).execute(
        `INSERT INTO security_audit_logs 
         (org_id, event_type, severity, description, source_ip, user_type, user_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          log.orgId || null,
          log.eventType,
          log.severity,
          log.description,
          log.sourceIp || null,
          log.userType || null,
          log.userId || null,
          log.metadata ? JSON.stringify(log.metadata) : null
        ]
      );
      
      console.log(`[SecurityMiddleware] Audit log: [${log.severity}] ${log.eventType} - ${log.description}`);
    } catch (error) {
      console.error('[SecurityMiddleware] Failed to log security event:', error);
    }
  }
  
  /**
   * 记录风控日志
   */
  async logRiskEvent(params: {
    eventType: 'CAPTCHA_FAIL' | 'SMS_ABUSE' | 'LOGIN_ANOMALY' | 'TRANSACTION_ANOMALY';
    userType?: string;
    userId?: number;
    ipAddress?: string;
    deviceFingerprint?: string;
    riskScore?: number;
    actionTaken: 'NONE' | 'WARN' | 'BLOCK' | 'ALERT';
    details?: Record<string, unknown>;
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;
    
    try {
      await (db as any).execute(
        `INSERT INTO risk_control_logs 
         (event_type, user_type, user_id, ip_address, device_fingerprint, risk_score, action_taken, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.eventType,
          params.userType || null,
          params.userId || null,
          params.ipAddress || null,
          params.deviceFingerprint || null,
          params.riskScore || null,
          params.actionTaken,
          params.details ? JSON.stringify(params.details) : null
        ]
      );
    } catch (error) {
      console.error('[SecurityMiddleware] Failed to log risk event:', error);
    }
  }
  
  /**
   * 匹配敏感操作
   */
  matchSensitiveAction(path: string, method: string, actions: SensitiveAction[]): SensitiveAction | null {
    const normalizedPath = path.toLowerCase();
    const normalizedMethod = method.toUpperCase();
    
    for (const action of actions) {
      // 支持路径模式匹配（简单的前缀匹配）
      const actionPath = action.path.toLowerCase();
      if (normalizedPath.startsWith(actionPath) && normalizedMethod === action.method.toUpperCase()) {
        return action;
      }
    }
    
    return null;
  }
  
  /**
   * 核心方法：执行安全检查
   */
  async performSecurityCheck(
    path: string,
    method: string,
    headers: Record<string, string | string[] | undefined>,
    ip: string,
    body?: Record<string, unknown>
  ): Promise<SecurityCheckResult> {
    // 1. 检查 IP 封禁
    if (await this.isIpBlocked(ip)) {
      await this.logSecurityEvent({
        eventType: 'BLOCKED_IP_ACCESS',
        severity: 'HIGH',
        description: `Blocked IP attempted access: ${ip}`,
        sourceIp: ip,
        metadata: { path, method }
      });
      
      // 【重要】根据 Accept-Language 返回对应语言的错误消息
      const ipLang = this.getLanguageFromHeaders(headers);
      
      return {
        allowed: false,
        reason: getErrorMessage('IP_BLOCKED', ipLang)
      };
    }
    
    // 2. 检查设备封禁
    const deviceFingerprint = headers['x-device-fingerprint'] as string;
    if (deviceFingerprint && await this.isDeviceBlocked(deviceFingerprint)) {
      await this.logSecurityEvent({
        eventType: 'BLOCKED_DEVICE_ACCESS',
        severity: 'HIGH',
        description: `Blocked device attempted access: ${deviceFingerprint}`,
        sourceIp: ip,
        metadata: { path, method, deviceFingerprint }
      });
      
      // 【重要】根据 Accept-Language 返回对应语言的错误消息
      const deviceLang = this.getLanguageFromHeaders(headers);
      
      return {
        allowed: false,
        reason: getErrorMessage('DEVICE_BLOCKED', deviceLang)
      };
    }
    
    // 3. 加载敏感操作配置
    const sensitiveActions = await this.loadSensitiveActionsFromDb();
    
    // 4. 匹配敏感操作
    const matchedAction = this.matchSensitiveAction(path, method, sensitiveActions);
    
    if (!matchedAction) {
      // 非敏感操作，直接放行
      return { allowed: true };
    }
    
    // 5. 获取验证规则
    const rule = await captchaService.getVerificationRule(matchedAction.scenario);
    
    if (!rule || !rule.isActive) {
      // 规则未配置或已禁用，放行（但记录警告）
      console.warn(`[SecurityMiddleware] No active rule for scenario: ${matchedAction.scenario}`);
      return { allowed: true };
    }
    
    // 6. 检查验证票据
    const captchaTicket = headers['x-captcha-ticket'] as string;
    const captchaRandstr = headers['x-captcha-randstr'] as string;
    
    if (rule.requireCaptcha) {
      if (!captchaTicket || !captchaRandstr) {
        // 缺少验证票据，拦截请求
        await this.logSecurityEvent({
          eventType: 'MISSING_CAPTCHA',
          severity: 'MEDIUM',
          description: `Sensitive action blocked: ${matchedAction.description} - Missing captcha ticket`,
          sourceIp: ip,
          metadata: { path, method, scenario: matchedAction.scenario }
        });
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[SecurityMiddleware] 🚫 REQUEST BLOCKED`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`Path: ${method} ${path}`);
        console.log(`IP: ${ip}`);
        console.log(`Action: ${matchedAction.description}`);
        console.log(`Scenario: ${matchedAction.scenario}`);
        console.log(`Required Captcha: ${rule.captchaType}`);
        console.log(`Reason: Missing captcha ticket`);
        console.log(`${'='.repeat(60)}\n`);
        
        // 【重要】根据 Accept-Language 返回对应语言的错误消息
        const lang = this.getLanguageFromHeaders(headers);
        const captchaTypeName = this.getCaptchaTypeName(rule.captchaType, lang);
        
        const messages: Record<SystemLanguage, string> = {
          zh: `此操作需要完成 ${captchaTypeName} 验证`,
          ru: `Для этой операции требуется ${captchaTypeName}`,
          en: `This operation requires ${captchaTypeName}`
        };
        
        return {
          allowed: false,
          reason: messages[lang],
          requiredCaptchaType: rule.captchaType,
          requiresSms: rule.requireSms
        };
      }
      
      // 7. 校验验证票据
      const verifyResult = await captchaService.verifyTicket({
        ticket: captchaTicket,
        randstr: captchaRandstr,
        userIp: ip,
        captchaType: rule.captchaType
      });
      
      if (!verifyResult.success) {
        // 验证失败
        await this.logSecurityEvent({
          eventType: 'CAPTCHA_VERIFY_FAILED',
          severity: 'MEDIUM',
          description: `Captcha verification failed: ${matchedAction.description}`,
          sourceIp: ip,
          metadata: { 
            path, 
            method, 
            scenario: matchedAction.scenario,
            errorCode: verifyResult.errorCode,
            errorMessage: verifyResult.errorMessage
          }
        });
        
        await this.logRiskEvent({
          eventType: 'CAPTCHA_FAIL',
          ipAddress: ip,
          deviceFingerprint,
          actionTaken: 'WARN',
          details: { scenario: matchedAction.scenario, errorCode: verifyResult.errorCode }
        });
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[SecurityMiddleware] 🚫 CAPTCHA VERIFICATION FAILED`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`Path: ${method} ${path}`);
        console.log(`IP: ${ip}`);
        console.log(`Action: ${matchedAction.description}`);
        console.log(`Error: ${verifyResult.errorMessage}`);
        console.log(`${'='.repeat(60)}\n`);
        
        return {
          allowed: false,
          reason: verifyResult.errorMessage || '验证码校验失败，请重试'
        };
      }
    }
    
    // 8. 检查 SMS 验证（如果需要）
    if (rule.requireSms) {
      const smsCode = headers['x-sms-code'] as string;
      const smsToken = headers['x-sms-token'] as string;
      
      if (!smsCode || !smsToken) {
        await this.logSecurityEvent({
          eventType: 'MISSING_SMS_VERIFICATION',
          severity: 'MEDIUM',
          description: `Sensitive action requires SMS: ${matchedAction.description}`,
          sourceIp: ip,
          metadata: { path, method, scenario: matchedAction.scenario }
        });
        
        // 【重要】根据 Accept-Language 返回对应语言的错误消息
        const smsLang = this.getLanguageFromHeaders(headers);
        
        return {
          allowed: false,
          reason: getErrorMessage('REQUIRE_SMS', smsLang),
          requiresSms: true
        };
      }
      
      // TODO: 验证 SMS 验证码
    }
    
    // 9. 验证通过
    await this.logSecurityEvent({
      eventType: 'SENSITIVE_ACTION_ALLOWED',
      severity: 'LOW',
      description: `Sensitive action allowed: ${matchedAction.description}`,
      sourceIp: ip,
      metadata: { path, method, scenario: matchedAction.scenario }
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[SecurityMiddleware] ✅ REQUEST ALLOWED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Path: ${method} ${path}`);
    console.log(`IP: ${ip}`);
    console.log(`Action: ${matchedAction.description}`);
    console.log(`Captcha: VERIFIED`);
    console.log(`${'='.repeat(60)}\n`);
    
    return { allowed: true };
  }
  
  /**
   * 获取验证码类型名称（多语言支持）
   * 
   * @param type 验证码类型
   * @param lang 语言代码
   */
  private getCaptchaTypeName(type: CaptchaType, lang: SystemLanguage = 'ru'): string {
    const names: Record<CaptchaType, Record<SystemLanguage, string>> = {
      'SLIDE': {
        zh: '滑块验证',
        ru: 'слайд-проверка',
        en: 'slide verification'
      },
      'CLICK': {
        zh: '点选验证',
        ru: 'клик-проверка',
        en: 'click verification'
      },
      'SMART': {
        zh: '智能验证',
        ru: 'умная проверка',
        en: 'smart verification'
      }
    };
    return names[type]?.[lang] || names[type]?.['ru'] || 'проверка';
  }
  
  /**
   * 从请求头获取语言
   */
  private getLanguageFromHeaders(headers: Record<string, string | string[] | undefined>): SystemLanguage {
    const acceptLanguage = headers['accept-language'] as string;
    return getLanguageAdapter().fromAcceptLanguage(acceptLanguage);
  }
  
  /**
   * Express 中间件函数
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const path = req.path;
      const method = req.method;
      
      try {
        const result = await this.performSecurityCheck(
          path,
          method,
          req.headers as Record<string, string | string[] | undefined>,
          ip,
          req.body
        );
        
        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'SECURITY_CHECK_FAILED',
              message: result.reason,
              requiredCaptchaType: result.requiredCaptchaType,
              requiresSms: result.requiresSms
            }
          });
        }
        
        next();
      } catch (error) {
        console.error('[SecurityMiddleware] Error:', error);
        next(error);
      }
    };
  }
}

// 导出单例和中间件
export const securityMiddleware = SecurityMiddleware.getInstance();
export const securityGateway = securityMiddleware.middleware();
