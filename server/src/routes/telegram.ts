/**
 * CHUTEA 智慧中台 - Telegram 通知 API 路由
 * 
 * API 端点：
 * - POST /api/telegram/notify - 发送通知（内部调用）
 * - POST /api/telegram/bind/generate - 生成绑定链接
 * - POST /api/telegram/bind/complete - 完成绑定（Bot 回调）
 * - GET /api/telegram/status - 获取服务状态
 */

import { Router, Request, Response } from 'express';
import { getTelegramBotService, NotificationType } from '../services/telegram-bot-service';

const router = Router();

// ==================== 类型定义 ====================

interface NotifyRequestBody {
  type: NotificationType;
  data: Record<string, any>;
  userId?: number;
  telegramChatId?: string;
}

interface GenerateBindRequestBody {
  userId: number;
}

interface CompleteBindRequestBody {
  token: string;
  telegramChatId: string;
}

// ==================== API 路由 ====================

/**
 * POST /api/telegram/notify
 * 
 * 发送 Telegram 通知
 * 
 * 请求体：
 * {
 *   type: NotificationType,  // 通知类型
 *   data: object,            // 通知数据
 *   userId?: number,         // 用户 ID（私聊时需要）
 *   telegramChatId?: string  // TG Chat ID（私聊时需要）
 * }
 */
router.post('/notify', async (req: Request, res: Response) => {
  console.log('\n' + '='.repeat(60));
  console.log('[Telegram API] POST /api/telegram/notify');
  console.log('='.repeat(60));
  
  try {
    const { type, data, userId, telegramChatId } = req.body as NotifyRequestBody;
    
    // 参数验证
    if (!type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TYPE',
          message: 'Notification type is required',
        },
      });
    }
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_DATA',
          message: 'Notification data is required',
        },
      });
    }
    
    console.log(`Type: ${type}`);
    console.log(`Data: ${JSON.stringify(data).substring(0, 100)}...`);
    
    // 发送通知
    const telegramService = getTelegramBotService();
    const result = await telegramService.sendNotification({
      type,
      data,
      userId,
      telegramChatId,
    });
    
    console.log(`Result: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log('='.repeat(60) + '\n');
    
    if (result.success) {
      return res.json({
        success: true,
        data: {
          messageId: result.messageId,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: result.errorCode,
          message: result.errorMessage,
        },
      });
    }
    
  } catch (error) {
    console.error('[Telegram API] 异常:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * POST /api/telegram/bind/generate
 * 
 * 生成 Telegram 绑定链接
 * 
 * 请求体：
 * {
 *   userId: number  // 用户 ID
 * }
 */
router.post('/bind/generate', async (req: Request, res: Response) => {
  console.log('\n' + '='.repeat(60));
  console.log('[Telegram API] POST /api/telegram/bind/generate');
  console.log('='.repeat(60));
  
  try {
    const { userId } = req.body as GenerateBindRequestBody;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
        },
      });
    }
    
    console.log(`UserId: ${userId}`);
    
    const telegramService = getTelegramBotService();
    const bindLink = await telegramService.generateBindLink(userId);
    
    console.log(`BindLink: ${bindLink.substring(0, 30)}...`);
    console.log('='.repeat(60) + '\n');
    
    return res.json({
      success: true,
      data: {
        bindLink,
      },
    });
    
  } catch (error) {
    console.error('[Telegram API] 异常:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * POST /api/telegram/bind/complete
 * 
 * 完成 Telegram 绑定（Bot 回调）
 * 
 * 请求体：
 * {
 *   token: string,         // 绑定 Token
 *   telegramChatId: string // TG Chat ID
 * }
 */
router.post('/bind/complete', async (req: Request, res: Response) => {
  console.log('\n' + '='.repeat(60));
  console.log('[Telegram API] POST /api/telegram/bind/complete');
  console.log('='.repeat(60));
  
  try {
    const { token, telegramChatId } = req.body as CompleteBindRequestBody;
    
    if (!token || !telegramChatId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Token and telegramChatId are required',
        },
      });
    }
    
    console.log(`Token: ${token.substring(0, 8)}...`);
    console.log(`ChatId: ${telegramChatId}`);
    
    const telegramService = getTelegramBotService();
    const result = await telegramService.completeBind(token, telegramChatId);
    
    console.log(`Result: ${result.success ? '✅ 绑定成功' : '❌ 绑定失败'}`);
    console.log('='.repeat(60) + '\n');
    
    if (result.success) {
      return res.json({
        success: true,
        data: {
          telegramChatId: result.telegramChatId,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: result.errorCode,
          message: result.errorMessage,
        },
      });
    }
    
  } catch (error) {
    console.error('[Telegram API] 异常:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * GET /api/telegram/status
 * 
 * 获取 Telegram 服务状态
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const telegramService = getTelegramBotService();
    const status = await telegramService.getStatus();
    
    return res.json({
      success: true,
      data: status,
    });
    
  } catch (error) {
    console.error('[Telegram API] 获取状态失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get Telegram status',
      },
    });
  }
});

export default router;
