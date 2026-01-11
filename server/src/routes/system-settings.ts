/**
 * CHUTEA 智慧中台 - 系统设置 API
 * 
 * 功能：
 * 1. 读取/保存系统配置
 * 2. 提现参数配置
 * 3. 通知开关配置
 * 4. SMS.ru 状态查询
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ==================== 类型定义 ====================

interface SystemConfig {
  key: string;
  value: any;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY';
  description?: { ru: string; zh: string };
}

// ==================== 内存存储（后续可迁移到数据库） ====================

const configStore = new Map<string, any>();

// ==================== 默认配置 ====================

const DEFAULT_CONFIGS: SystemConfig[] = [
  // 提现配置
  {
    key: 'withdraw_min_amount',
    value: 1000,
    type: 'NUMBER',
    description: {
      ru: 'Минимальная сумма вывода (₽)',
      zh: '最低提现金额（₽）'
    }
  },
  {
    key: 'withdraw_max_amount',
    value: 100000,
    type: 'NUMBER',
    description: {
      ru: 'Максимальная сумма вывода (₽)',
      zh: '最高提现金额（₽）'
    }
  },
  {
    key: 'withdraw_fee_percent',
    value: 0,
    type: 'NUMBER',
    description: {
      ru: 'Комиссия за вывод (%)',
      zh: '提现手续费（%）'
    }
  },
  {
    key: 'withdraw_processing_days',
    value: 3,
    type: 'NUMBER',
    description: {
      ru: 'Срок обработки заявки (дней)',
      zh: '提现处理时间（天）'
    }
  },
  // Telegram 通知开关
  {
    key: 'tg_notify_new_registration',
    value: true,
    type: 'BOOLEAN',
    description: {
      ru: 'Уведомление о новой регистрации',
      zh: '新用户注册通知'
    }
  },
  {
    key: 'tg_notify_withdraw_request',
    value: true,
    type: 'BOOLEAN',
    description: {
      ru: 'Уведомление о заявке на вывод',
      zh: '提现申请通知'
    }
  },
  {
    key: 'tg_notify_new_order',
    value: true,
    type: 'BOOLEAN',
    description: {
      ru: 'Уведомление о новом заказе',
      zh: '新订单通知'
    }
  },
  {
    key: 'tg_notify_points_change',
    value: true,
    type: 'BOOLEAN',
    description: {
      ru: 'Уведомление об изменении баллов',
      zh: '积分变动通知'
    }
  },
  // SMS 配置
  {
    key: 'sms_provider',
    value: 'smsru',
    type: 'STRING',
    description: {
      ru: 'Провайдер SMS',
      zh: '短信服务商'
    }
  },
  {
    key: 'sms_sender_name',
    value: 'CHUTEA',
    type: 'STRING',
    description: {
      ru: 'Имя отправителя SMS',
      zh: '短信发送者名称'
    }
  },
];

// 初始化默认配置
for (const config of DEFAULT_CONFIGS) {
  if (!configStore.has(config.key)) {
    configStore.set(config.key, config.value);
  }
}

// ==================== 辅助函数 ====================

function getConfigValue(key: string): any {
  if (configStore.has(key)) {
    return configStore.get(key);
  }
  const defaultConfig = DEFAULT_CONFIGS.find(c => c.key === key);
  return defaultConfig?.value;
}

// ==================== API 路由 ====================

/**
 * GET /api/system-settings
 * 获取所有系统配置
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const configs = DEFAULT_CONFIGS.map(config => ({
      key: config.key,
      value: configStore.has(config.key) ? configStore.get(config.key) : config.value,
      type: config.type,
      description: config.description,
      isDefault: !configStore.has(config.key),
    }));
    
    res.json({
      success: true,
      data: { configs },
    });
  } catch (error: any) {
    console.error('[SystemSettings] 获取配置失败:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Ошибка получения настроек' },
    });
  }
});

/**
 * GET /api/system-settings/:key
 * 获取单个配置
 */
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = getConfigValue(key);
    const defaultConfig = DEFAULT_CONFIGS.find(c => c.key === key);
    
    if (value !== undefined) {
      res.json({
        success: true,
        data: {
          key,
          value,
          type: defaultConfig?.type || 'STRING',
          description: defaultConfig?.description,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: 'Настройка не найдена' },
      });
    }
  } catch (error: any) {
    console.error('[SystemSettings] 获取配置失败:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Ошибка получения настройки' },
    });
  }
});

/**
 * PUT /api/system-settings/:key
 * 更新单个配置
 */
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // 保存到内存
    configStore.set(key, value);
    
    console.log(`[SystemSettings] ✅ 配置已更新: ${key} = ${JSON.stringify(value)}`);
    
    const defaultConfig = DEFAULT_CONFIGS.find(c => c.key === key);
    
    res.json({
      success: true,
      data: {
        key,
        value,
        type: defaultConfig?.type || 'STRING',
      },
    });
  } catch (error: any) {
    console.error('[SystemSettings] 更新配置失败:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Ошибка сохранения настройки' },
    });
  }
});

/**
 * POST /api/system-settings/batch
 * 批量更新配置
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { configs } = req.body as { configs: { key: string; value: any }[] };
    
    for (const config of configs) {
      configStore.set(config.key, config.value);
    }
    
    console.log(`[SystemSettings] ✅ 批量更新 ${configs.length} 个配置`);
    
    res.json({
      success: true,
      data: { updated: configs.length },
    });
  } catch (error: any) {
    console.error('[SystemSettings] 批量更新失败:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Ошибка сохранения настроек' },
    });
  }
});

/**
 * GET /api/system-settings/status/smsru
 * 获取 SMS.ru 状态
 */
router.get('/status/smsru', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.SMSRU_API_KEY;
    
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          connected: false,
          balance: 0,
          senderStatus: 'NOT_CONFIGURED',
          senderName: null,
        },
      });
    }
    
    // 调用 SMS.ru API 获取余额
    const balanceUrl = `https://sms.ru/my/balance?api_id=${apiKey}&json=1`;
    const balanceRes = await fetch(balanceUrl);
    const balanceData = await balanceRes.json() as any;
    
    // 获取发送者状态
    const sendersUrl = `https://sms.ru/my/senders?api_id=${apiKey}&json=1`;
    const sendersRes = await fetch(sendersUrl);
    const sendersData = await sendersRes.json() as any;
    
    let senderStatus = 'NONE';
    let senderName = null;
    
    if (sendersData.status === 'OK' && sendersData.senders) {
      const senders = Object.entries(sendersData.senders);
      if (senders.length > 0) {
        const [name, status] = senders[0] as [string, string];
        senderName = name;
        senderStatus = status === 'default' ? 'APPROVED' : 
                       status === 'pending' ? 'PENDING' : 'REJECTED';
      }
    }
    
    res.json({
      success: true,
      data: {
        connected: balanceData.status === 'OK',
        balance: balanceData.balance || 0,
        currency: '₽',
        senderStatus,
        senderName,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[SystemSettings] SMS.ru 状态查询失败:', error);
    res.json({
      success: true,
      data: {
        connected: false,
        balance: 0,
        senderStatus: 'ERROR',
        error: error.message,
      },
    });
  }
});

/**
 * GET /api/system-settings/status/captcha
 * 获取腾讯云 Captcha 状态
 */
router.get('/status/captcha', async (req: Request, res: Response) => {
  try {
    // 模拟 Captcha 消耗统计（实际需要从腾讯云 API 获取）
    res.json({
      success: true,
      data: {
        appId: '191003647',
        todayUsage: 47,
        monthUsage: 1258,
        monthLimit: 10000,
        status: 'ACTIVE',
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[SystemSettings] Captcha 状态查询失败:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Ошибка получения статуса Captcha' },
    });
  }
});

// 导出配置获取函数供其他模块使用
export { getConfigValue };
export default router;
