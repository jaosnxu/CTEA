/**
 * CHUTEA 智慧中台 - SMS 模块导出
 * 
 * Provider 模式架构：
 * - ISmsProvider: 抽象接口
 * - TencentSmsProvider: 腾讯云实现
 * - SmsManager: 统一管理器
 */

// 接口和类型
export * from './sms-provider.interface';

// Provider 实现
export { TencentSmsProvider, getTencentSmsProvider } from './tencent-sms-provider';

// 管理器
export { SmsManager, getSmsManager } from './sms-manager';
export type { SecureSmsSendRequest, SecureVerificationCodeRequest } from './sms-manager';
