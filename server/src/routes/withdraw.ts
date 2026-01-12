/**
 * CHUTEA 智慧中台 - 提现 API 路由
 *
 * API 端点：
 * - POST /api/withdraw/request - 提交提现申请
 * - GET /api/withdraw/history - 获取提现历史
 * - GET /api/withdraw/status/:id - 获取提现状态
 *
 * 提现流程：
 * 1. 用户提交提现申请
 * 2. 系统验证余额和限额
 * 3. 发送 Telegram 通知到财务审批群
 * 4. 财务审核后处理
 */

import { Router, Request, Response } from "express";
import { getTelegramBotService } from "../services/telegram-bot-service";
import { getDb } from "../../db";

const router = Router();

// ==================== 类型定义 ====================

/** 提现方式 */
type WithdrawMethod = "BANK_CARD" | "SBERBANK" | "TINKOFF" | "QIWI" | "SBP";

/** 提现状态 */
type WithdrawStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "FAILED";

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
  BANK_CARD: "Банковская карта",
  SBERBANK: "Сбербанк",
  TINKOFF: "Тинькофф",
  QIWI: "QIWI Кошелёк",
  SBP: "СБП (Система быстрых платежей)",
};

// ==================== API 路由 ====================

/**
 * POST /api/withdraw/request
 *
 * 提交提现申请
 *
 * 请求体：
 * {
 *   amount: number,        // 提现金额
 *   method: WithdrawMethod, // 提现方式
 *   accountNumber: string, // 账户号码
 *   accountName?: string,  // 账户名称
 *   bankName?: string      // 银行名称
 * }
 */
router.post("/request", async (req: Request, res: Response) => {
  console.log("\n" + "=".repeat(60));
  console.log("[Withdraw API] POST /api/withdraw/request");
  console.log("=".repeat(60));

  try {
    const { amount, method, accountNumber, accountName, bankName } =
      req.body as WithdrawRequestBody;

    // 参数验证
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Укажите корректную сумму вывода",
        },
      });
    }

    if (amount < MIN_WITHDRAW_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: {
          code: "AMOUNT_TOO_LOW",
          message: `Минимальная сумма вывода: ${MIN_WITHDRAW_AMOUNT} ₽`,
        },
      });
    }

    if (amount > MAX_WITHDRAW_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: {
          code: "AMOUNT_TOO_HIGH",
          message: `Максимальная сумма вывода: ${MAX_WITHDRAW_AMOUNT} ₽`,
        },
      });
    }

    if (!method) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_METHOD",
          message: "Выберите способ вывода",
        },
      });
    }

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_ACCOUNT",
          message: "Укажите реквизиты для вывода",
        },
      });
    }

    console.log(`Amount: ${amount} ₽`);
    console.log(`Method: ${method}`);
    console.log(`Account: ${accountNumber.substring(0, 4)}****`);

    // TODO: 从 JWT 获取用户信息
    // 这里使用模拟数据
    const userId = 1;
    const userName = "Тестовый пользователь";
    const userPhone = "+7 (911) 629-6668";
    const userBalance = 5000; // 模拟余额

    // 检查余额
    if (amount > userBalance) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INSUFFICIENT_BALANCE",
          message: "Недостаточно средств на балансе",
        },
      });
    }

    // 生成提现单号
    const withdrawId = `WD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // TODO: 保存提现记录到数据库
    // await saveWithdrawRequest(...)

    // 发送 Telegram 通知到财务审批群
    const telegramService = getTelegramBotService();
    const notifyResult = await telegramService.sendNotification({
      type: "WITHDRAW_REQUEST",
      data: {
        withdrawId,
        userId,
        userName,
        phone: userPhone,
        amount,
        method: WITHDRAW_METHOD_NAMES[method] || method,
        accountNumber:
          accountNumber.substring(0, 4) + "****" + accountNumber.slice(-4),
        accountName: accountName || "Не указано",
        bankName: bankName || "Не указано",
        balanceBefore: userBalance,
        balanceAfter: userBalance - amount,
      },
    });

    if (notifyResult.success) {
      console.log("✅ Telegram 通知已发送");
    } else {
      console.log(`⚠️ Telegram 通知发送失败: ${notifyResult.errorCode}`);
    }

    console.log(`WithdrawId: ${withdrawId}`);
    console.log("=".repeat(60) + "\n");

    return res.json({
      success: true,
      data: {
        withdrawId,
        amount,
        method,
        status: "PENDING",
        message: "Заявка на вывод создана. Ожидайте подтверждения.",
        estimatedTime: "1-3 рабочих дня",
      },
    });
  } catch (error) {
    console.error("[Withdraw API] 异常:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Произошла ошибка. Попробуйте позже.",
      },
    });
  }
});

/**
 * GET /api/withdraw/history
 *
 * 获取提现历史
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    // TODO: 从数据库获取提现历史
    // 这里返回模拟数据
    const history = [
      {
        id: "WD1704960000001",
        amount: 1500,
        method: "SBERBANK",
        methodName: "Сбербанк",
        status: "COMPLETED",
        statusName: "Выполнено",
        createdAt: "2026-01-10T10:00:00Z",
        completedAt: "2026-01-10T15:30:00Z",
      },
      {
        id: "WD1704873600002",
        amount: 2000,
        method: "BANK_CARD",
        methodName: "Банковская карта",
        status: "PENDING",
        statusName: "В обработке",
        createdAt: "2026-01-09T10:00:00Z",
        completedAt: null,
      },
    ];

    return res.json({
      success: true,
      data: {
        history,
        total: history.length,
      },
    });
  } catch (error) {
    console.error("[Withdraw API] 获取历史失败:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get withdraw history",
      },
    });
  }
});

/**
 * GET /api/withdraw/status/:id
 *
 * 获取提现状态
 */
router.get("/status/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // TODO: 从数据库获取提现状态
    // 这里返回模拟数据
    const status = {
      id,
      amount: 1500,
      method: "SBERBANK",
      methodName: "Сбербанк",
      status: "PENDING",
      statusName: "В обработке",
      createdAt: "2026-01-11T10:00:00Z",
      estimatedTime: "1-3 рабочих дня",
    };

    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[Withdraw API] 获取状态失败:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get withdraw status",
      },
    });
  }
});

export default router;
