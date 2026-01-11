/**
 * CHUTEA 智慧中台 - 提现 API 路由
 * 
 * API 端点：
 * - POST /api/withdrawals - 提交提现申请
 * - GET /api/withdrawals - 获取提现历史
 * - GET /api/withdrawals/:id - 获取提现详情
 * 
 * 核心原则：
 * - 禁止短信：提现操作不触发短信
 * - TG 推送：提现申请实时推送到财务群
 */

import { Router, Request, Response } from 'express';
import { getTelegramBotService } from '../services/telegram-bot-service';

const router = Router();

// ==================== 类型定义 ====================

/** 提现方式 */
type WithdrawMethod = 'SBERBANK' | 'TINKOFF' | 'SBP' | 'BANK_CARD' | 'QIWI';

/** 提现状态 */
type WithdrawStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

interface WithdrawRequestBody {
  amount: number;
  method: WithdrawMethod;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
}

// ==================== 常量配置 ====================

/** 最小提现金额 */
const MIN_WITHDRAW_AMOUNT = 100;

/** 最大提现金额 */
const MAX_WITHDRAW_AMOUNT = 100000;

/** 提现方式名称（俄语） */
const WITHDRAW_METHOD_NAMES: Record<WithdrawMethod, string> = {
  'SBERBANK': 'Сбербанк',
  'TINKOFF': 'Тинькофф',
  'SBP': 'СБП (Система быстрых платежей)',
  'BANK_CARD': 'Банковская карта',
  'QIWI': 'QIWI Кошелёк',
};

// ==================== API 路由 ====================

/**
 * POST /api/withdrawals
 * 
 * 提交提现申请
 * 
 * 核心逻辑：
 * 1. 验证金额和方式
 * 2. 检查用户余额
 * 3. 创建提现记录
 * 4. 发送 TG 通知到财务群（禁止短信）
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('\n' + '═'.repeat(70));
  console.log('[Withdrawals API] 💰 POST /api/withdrawals');
  console.log('═'.repeat(70));
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    const { amount, method, accountNumber, accountName, bankName } = req.body as WithdrawRequestBody;
    
    // ==================== 参数验证 ====================
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Укажите корректную сумму вывода',
          messageRu: 'Укажите корректную сумму вывода',
        },
      });
    }
    
    if (amount < MIN_WITHDRAW_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AMOUNT_TOO_LOW',
          message: `Минимальная сумма вывода: ${MIN_WITHDRAW_AMOUNT} ₽`,
          messageRu: `Минимальная сумма вывода: ${MIN_WITHDRAW_AMOUNT} ₽`,
        },
      });
    }
    
    if (amount > MAX_WITHDRAW_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AMOUNT_TOO_HIGH',
          message: `Максимальная сумма вывода: ${MAX_WITHDRAW_AMOUNT} ₽`,
          messageRu: `Максимальная сумма вывода: ${MAX_WITHDRAW_AMOUNT} ₽`,
        },
      });
    }
    
    if (!method || !WITHDRAW_METHOD_NAMES[method]) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_METHOD',
          message: 'Выберите способ вывода',
          messageRu: 'Выберите способ вывода',
        },
      });
    }
    
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ACCOUNT',
          message: 'Укажите реквизиты для вывода',
          messageRu: 'Укажите реквизиты для вывода',
        },
      });
    }
    
    console.log(`Amount: ${amount} ₽`);
    console.log(`Method: ${method} (${WITHDRAW_METHOD_NAMES[method]})`);
    console.log(`Account: ${accountNumber.substring(0, 4)}****`);
    
    // ==================== 获取用户信息（从 JWT） ====================
    // TODO: 从 JWT 中解析用户信息
    // 这里使用模拟数据演示
    
    const userId = 1;
    const userName = 'Мария Иванова';
    const userPhone = '+7 (911) 629-6668';
    const telegramUsername = '@maria_tea';
    const isInfluencer = true;
    const currentBalance = 18500; // 模拟当前余额
    const totalWithdrawn = 45000; // 模拟累计提现
    
    // ==================== 检查余额 ====================
    
    if (amount > currentBalance) {
      console.log(`❌ 余额不足: ${currentBalance} < ${amount}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Недостаточно средств на балансе',
          messageRu: 'Недостаточно средств на балансе',
        },
      });
    }
    
    // ==================== 生成提现单号 ====================
    
    const withdrawId = `WD${Date.now()}`;
    const balanceAfter = currentBalance - amount;
    
    console.log(`WithdrawId: ${withdrawId}`);
    console.log(`Balance: ${currentBalance} → ${balanceAfter}`);
    
    // ==================== 发送 TG 通知到财务群 ====================
    // 核心原则：禁止短信，全部走 Telegram
    
    console.log('\n[TG Notification] 发送提现通知到财务群...');
    
    const telegramService = getTelegramBotService();
    const notifyResult = await telegramService.sendNotification({
      type: 'WITHDRAW_REQUEST',
      data: {
        withdrawId,
        userId,
        userName,
        phone: userPhone,
        telegramUsername,
        isInfluencer,
        amount,
        method: WITHDRAW_METHOD_NAMES[method],
        accountNumber: maskAccountNumber(accountNumber),
        accountName: accountName || 'Не указано',
        bankName: bankName || 'Не указано',
        balanceBefore: currentBalance,
        balanceAfter,
        totalWithdrawn: totalWithdrawn + amount,
      },
    });
    
    if (notifyResult.success) {
      console.log(`✅ TG 通知已发送 (MessageId: ${notifyResult.messageId})`);
    } else {
      console.log(`⚠️ TG 通知发送失败: ${notifyResult.errorCode}`);
      // 注意：TG 通知失败不影响提现申请的创建
    }
    
    // ==================== TODO: 保存提现记录到数据库 ====================
    // await db.insert(withdrawalRequests).values({...})
    
    console.log('═'.repeat(70) + '\n');
    
    return res.json({
      success: true,
      data: {
        withdrawId,
        amount,
        method,
        methodName: WITHDRAW_METHOD_NAMES[method],
        status: 'PENDING' as WithdrawStatus,
        statusName: 'В обработке',
        balanceAfter,
        message: 'Заявка на вывод создана. Ожидайте подтверждения.',
        estimatedTime: '1-3 рабочих дня',
        telegramNotified: notifyResult.success,
      },
    });
    
  } catch (error) {
    console.error('[Withdrawals API] 异常:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Произошла ошибка. Попробуйте позже.',
        messageRu: 'Произошла ошибка. Попробуйте позже.',
      },
    });
  }
});

/**
 * GET /api/withdrawals
 * 
 * 获取提现历史
 */
router.get('/', async (req: Request, res: Response) => {
  console.log('[Withdrawals API] GET /api/withdrawals');
  
  try {
    // TODO: 从数据库获取用户的提现历史
    // 这里返回模拟数据
    
    const history = [
      {
        id: 'WD1704960000001',
        amount: 15000,
        method: 'SBERBANK',
        methodName: 'Сбербанк',
        status: 'COMPLETED',
        statusName: 'Выполнено',
        createdAt: '2026-01-10T10:00:00Z',
        completedAt: '2026-01-10T15:30:00Z',
      },
      {
        id: 'WD1704873600002',
        amount: 8000,
        method: 'TINKOFF',
        methodName: 'Тинькофф',
        status: 'COMPLETED',
        statusName: 'Выполнено',
        createdAt: '2026-01-08T14:00:00Z',
        completedAt: '2026-01-09T09:00:00Z',
      },
      {
        id: 'WD1704787200003',
        amount: 22000,
        method: 'SBP',
        methodName: 'СБП',
        status: 'COMPLETED',
        statusName: 'Выполнено',
        createdAt: '2026-01-05T11:30:00Z',
        completedAt: '2026-01-05T12:00:00Z',
      },
    ];
    
    return res.json({
      success: true,
      data: {
        history,
        total: history.length,
        totalWithdrawn: 45000,
      },
    });
    
  } catch (error) {
    console.error('[Withdrawals API] 获取历史失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get withdrawal history',
      },
    });
  }
});

/**
 * GET /api/withdrawals/:id
 * 
 * 获取提现详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`[Withdrawals API] GET /api/withdrawals/${id}`);
  
  try {
    // TODO: 从数据库获取提现详情
    // 这里返回模拟数据
    
    const withdrawal = {
      id,
      amount: 15000,
      method: 'SBERBANK',
      methodName: 'Сбербанк',
      accountNumber: '4276 **** **** 1234',
      accountName: 'Иванова М.С.',
      status: 'PENDING',
      statusName: 'В обработке',
      createdAt: '2026-01-11T15:30:00Z',
      estimatedTime: '1-3 рабочих дня',
    };
    
    return res.json({
      success: true,
      data: withdrawal,
    });
    
  } catch (error) {
    console.error('[Withdrawals API] 获取详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get withdrawal details',
      },
    });
  }
});

// ==================== 辅助函数 ====================

/**
 * 掩码账户号码
 */
function maskAccountNumber(account: string): string {
  if (account.length <= 8) {
    return account.substring(0, 2) + '****' + account.slice(-2);
  }
  return account.substring(0, 4) + ' **** **** ' + account.slice(-4);
}

export default router;
