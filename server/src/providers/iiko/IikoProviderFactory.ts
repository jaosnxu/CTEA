/**
 * IikoProviderFactory - iiko 提供者工厂
 * 
 * 核心功能：根据配置文件切换 Mock 或 Real 实现
 * 
 * 使用方式：
 * ```typescript
 * const iikoProvider = IikoProviderFactory.create();
 * const menu = await iikoProvider.getMenu(storeId);
 * ```
 * 
 * 切换方式：
 * 在 .env 文件中设置：
 * - IIKO_PROVIDER=mock  // 使用模拟实现（内测版）
 * - IIKO_PROVIDER=real  // 使用真实实现（生产环境）
 */

import { IikoProvider } from './IikoProvider.interface';
import { MockIikoService } from './MockIikoService';
// import { RealIikoService } from './RealIikoService';  // 生产环境实现（待开发）

/**
 * iiko 提供者类型
 */
export type IikoProviderType = 'mock' | 'real';

/**
 * iiko 配置
 */
export interface IikoConfig {
  provider: IikoProviderType;
  apiUrl?: string;              // iiko API URL（生产环境）
  apiKey?: string;              // iiko API Key（生产环境）
  organizationId?: string;      // iiko 组织 ID（生产环境）
}

/**
 * IikoProviderFactory - 工厂类
 */
export class IikoProviderFactory {
  private static instance: IikoProvider | null = null;

  /**
   * 创建 IikoProvider 实例（单例模式）
   */
  public static create(config?: IikoConfig): IikoProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = config?.provider || this.getProviderTypeFromEnv();

    switch (providerType) {
      case 'mock':
        console.log('[IikoProviderFactory] 使用 Mock 实现（内测模式）');
        this.instance = new MockIikoService();
        break;

      case 'real':
        console.log('[IikoProviderFactory] 使用 Real 实现（生产模式）');
        // this.instance = new RealIikoService(config);
        throw new Error('RealIikoService 尚未实现，请先完成 iiko 集成开发');

      default:
        throw new Error(`未知的 IikoProvider 类型: ${providerType}`);
    }

    return this.instance;
  }

  /**
   * 从环境变量读取 Provider 类型
   */
  private static getProviderTypeFromEnv(): IikoProviderType {
    const envProvider = process.env.IIKO_PROVIDER?.toLowerCase();
    
    if (envProvider === 'real') {
      return 'real';
    }

    // 默认使用 mock（内测模式）
    return 'mock';
  }

  /**
   * 重置单例（用于测试）
   */
  public static reset(): void {
    this.instance = null;
  }

  /**
   * 获取当前 Provider 类型
   */
  public static getCurrentProviderType(): IikoProviderType {
    return this.getProviderTypeFromEnv();
  }
}

/**
 * 导出单例获取函数（便捷方法）
 */
export function getIikoProvider(): IikoProvider {
  return IikoProviderFactory.create();
}
