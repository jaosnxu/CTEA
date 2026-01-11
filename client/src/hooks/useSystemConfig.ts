/**
 * CHUTEA 智慧中台 - 配置穿透 Hook
 * 
 * 功能：
 * 1. 实时获取系统配置
 * 2. 配置变更自动刷新
 * 3. 缓存优化
 */

import { useState, useEffect, useCallback } from 'react';

// ==================== 类型定义 ====================

interface SystemConfig {
  key: string;
  value: any;
  type: string;
  description?: { ru: string; zh: string };
  isDefault?: boolean;
}

interface UseSystemConfigResult {
  configs: Record<string, any>;
  loading: boolean;
  error: string | null;
  getConfig: (key: string, defaultValue?: any) => any;
  refreshConfigs: () => Promise<void>;
}

// ==================== 缓存 ====================

let configCache: Record<string, any> = {};
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30秒缓存

// ==================== Hook ====================

export function useSystemConfig(): UseSystemConfigResult {
  const [configs, setConfigs] = useState<Record<string, any>>(configCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchConfigs = useCallback(async (force = false) => {
    // 检查缓存
    const now = Date.now();
    if (!force && now - lastFetchTime < CACHE_TTL && Object.keys(configCache).length > 0) {
      setConfigs(configCache);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/system-settings');
      const data = await res.json();
      
      if (data.success) {
        const configMap: Record<string, any> = {};
        for (const config of data.data.configs) {
          configMap[config.key] = config.value;
        }
        
        configCache = configMap;
        lastFetchTime = now;
        setConfigs(configMap);
      } else {
        setError(data.error?.message || '加载配置失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);
  
  const getConfig = useCallback((key: string, defaultValue?: any) => {
    return configs[key] !== undefined ? configs[key] : defaultValue;
  }, [configs]);
  
  const refreshConfigs = useCallback(async () => {
    await fetchConfigs(true);
  }, [fetchConfigs]);
  
  return {
    configs,
    loading,
    error,
    getConfig,
    refreshConfigs,
  };
}

// ==================== 单独获取配置 ====================

export async function getSystemConfig(key: string, defaultValue?: any): Promise<any> {
  try {
    const res = await fetch(`/api/system-settings/${key}`);
    const data = await res.json();
    
    if (data.success) {
      return data.data.value;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

// ==================== 更新配置 ====================

export async function updateSystemConfig(key: string, value: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/system-settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const data = await res.json();
    
    if (data.success) {
      // 更新缓存
      configCache[key] = value;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ==================== 默认配置值 ====================

export const DEFAULT_CONFIGS = {
  // 提现配置
  withdraw_min_amount: 1000,
  withdraw_max_amount: 100000,
  withdraw_fee_percent: 0,
  withdraw_processing_days: 3,
  
  // 会员配置
  points_earn_rate: 1, // 每消费1卢布获得1积分
  points_redeem_rate: 100, // 100积分抵扣1卢布
  
  // Telegram 通知
  tg_notify_new_registration: true,
  tg_notify_withdraw_request: true,
  tg_notify_new_order: true,
  tg_notify_points_change: true,
};

export default useSystemConfig;
