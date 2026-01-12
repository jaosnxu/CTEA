/**
 * CHUTEA 智慧中台 - Telegram Bot 全能通知中枢
 *
 * 功能：
 * 1. 根据事件类型向特定 TG 群组/频道发送通知
 * 2. 支持私聊推送（积分/优惠券变动）
 * 3. 支持用户绑定 TG 身份
 *
 * 通知场景：
 * - 达人/客户注册 → 注册监控群
 * - 提现请求 → 财务审批群
 * - 奶茶制作/订单 → 后厨通知群
 * - 积分/优惠券变动 → 私聊推送
 *
 * 配置解耦：所有配置从环境变量读取
 * - TELEGRAM_BOT_TOKEN: Bot Token
 * - TELEGRAM_CHAT_REGISTRATION: 注册监控群 Chat ID
 * - TELEGRAM_CHAT_FINANCE: 财务审批群 Chat ID
 * - TELEGRAM_CHAT_KITCHEN: 后厨通知群 Chat ID
 */

import crypto from "crypto";

// ==================== 类型定义 ====================

/** 通知类型 */
export type NotificationType =
  | "USER_REGISTERED" // 用户注册
  | "INFLUENCER_REGISTERED" // 达人注册
  | "WITHDRAW_REQUEST" // 提现请求
  | "ORDER_CREATED" // 订单创建
  | "ORDER_PAID" // 订单支付
  | "POINTS_CHANGED" // 积分变动
  | "COUPON_RECEIVED" // 优惠券领取
  | "COUPON_USED"; // 优惠券使用

/** 通知目标 */
export type NotificationTarget =
  | "REGISTRATION_GROUP" // 注册监控群
  | "FINANCE_GROUP" // 财务审批群
  | "KITCHEN_GROUP" // 后厨通知群
  | "PRIVATE_CHAT"; // 私聊

/** 通知请求 */
export interface NotificationRequest {
  type: NotificationType;
  data: Record<string, any>;
  userId?: number;
  telegramChatId?: string;
}

/** 通知响应 */
export interface NotificationResponse {
  success: boolean;
  messageId?: number;
  errorCode?: string;
  errorMessage?: string;
}

/** TG 绑定请求 */
export interface TelegramBindRequest {
  userId: number;
  bindToken: string;
}

/** TG 绑定响应 */
export interface TelegramBindResponse {
  success: boolean;
  telegramChatId?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ==================== 配置 ====================

/** 从环境变量读取配置 */
const getConfig = () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  registrationChatId: process.env.TELEGRAM_CHAT_REGISTRATION || "",
  financeChatId: process.env.TELEGRAM_CHAT_FINANCE || "",
  kitchenChatId: process.env.TELEGRAM_CHAT_KITCHEN || "",
  apiBaseUrl: "https://api.telegram.org",
});

/** 通知类型到目标群组的映射 */
const NOTIFICATION_ROUTING: Record<NotificationType, NotificationTarget> = {
  USER_REGISTERED: "REGISTRATION_GROUP",
  INFLUENCER_REGISTERED: "REGISTRATION_GROUP",
  WITHDRAW_REQUEST: "FINANCE_GROUP",
  ORDER_CREATED: "KITCHEN_GROUP",
  ORDER_PAID: "KITCHEN_GROUP",
  POINTS_CHANGED: "PRIVATE_CHAT",
  COUPON_RECEIVED: "PRIVATE_CHAT",
  COUPON_USED: "PRIVATE_CHAT",
};

// ==================== 俄语消息模板 ====================

/**
 * 生成俄语通知消息
 */
function generateMessage(
  type: NotificationType,
  data: Record<string, any>
): string {
  const timestamp = new Date().toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
  });

  switch (type) {
    case "USER_REGISTERED":
      return `
🎉 *Новый пользователь зарегистрирован!*

📱 *Телефон:* \`${data.phone || "Не указан"}\`
👤 *Тип:* ${data.userType === "INFLUENCER" ? "Инфлюенсер" : "Клиент"}
🌍 *Регион:* ${data.region || "Россия"}
📍 *IP:* \`${data.ipAddress || "Не определён"}\`

⏰ *Время:* ${timestamp}
━━━━━━━━━━━━━━━━━━━━
#регистрация #новый_пользователь
      `.trim();

    case "INFLUENCER_REGISTERED":
      return `
⭐ *Новый инфлюенсер присоединился!*

📱 *Телефон:* \`${data.phone || "Не указан"}\`
👤 *Имя:* ${data.name || "Не указано"}
📊 *Платформа:* ${data.platform || "Не указана"}
👥 *Подписчики:* ${data.followers ? data.followers.toLocaleString("ru-RU") : "Не указано"}

⏰ *Время:* ${timestamp}
━━━━━━━━━━━━━━━━━━━━
#инфлюенсер #новый_партнёр
      `.trim();

    case "WITHDRAW_REQUEST":
      return `
💰 *Новая заявка на вывод средств!*

👤 *Пользователь:* ${data.userName || "ID: " + data.userId}
📱 *Телефон:* \`${data.phone || "Не указан"}\`
💵 *Сумма:* *${data.amount?.toLocaleString("ru-RU")} ₽*
🏦 *Способ:* ${data.method || "Банковская карта"}
💳 *Реквизиты:* \`${data.accountNumber || "Не указаны"}\`

📊 *Баланс до:* ${data.balanceBefore?.toLocaleString("ru-RU")} ₽
📊 *Баланс после:* ${data.balanceAfter?.toLocaleString("ru-RU")} ₽

⏰ *Время:* ${timestamp}
━━━━━━━━━━━━━━━━━━━━
⚠️ *Требуется подтверждение!*
#вывод #финансы
      `.trim();

    case "ORDER_CREATED":
      return `
🧋 *Новый заказ!*

📋 *Номер:* \`#${data.orderId || "N/A"}\`
👤 *Клиент:* ${data.customerName || "Гость"}
📱 *Телефон:* \`${data.phone || "Не указан"}\`

🛒 *Состав заказа:*
${formatOrderItems(data.items)}

💵 *Итого:* *${data.total?.toLocaleString("ru-RU")} ₽*
🏪 *Точка:* ${data.storeName || "Основная"}
📍 *Тип:* ${data.orderType === "DELIVERY" ? "🚗 Доставка" : "🏃 Самовывоз"}

⏰ *Время:* ${timestamp}
━━━━━━━━━━━━━━━━━━━━
#заказ #кухня
      `.trim();

    case "ORDER_PAID":
      return `
✅ *Заказ оплачен!*

📋 *Номер:* \`#${data.orderId || "N/A"}\`
💵 *Сумма:* *${data.amount?.toLocaleString("ru-RU")} ₽*
💳 *Способ оплаты:* ${data.paymentMethod || "Карта"}

🧋 *Приступайте к приготовлению!*

⏰ *Время:* ${timestamp}
━━━━━━━━━━━━━━━━━━━━
#оплата #готовить
      `.trim();

    case "POINTS_CHANGED":
      return `
${data.change > 0 ? "🎁" : "💳"} *Изменение баллов*

${data.change > 0 ? "➕" : "➖"} *${Math.abs(data.change).toLocaleString("ru-RU")}* баллов
📊 *Текущий баланс:* *${data.newBalance?.toLocaleString("ru-RU")}* баллов

📝 *Причина:* ${data.reason || "Не указана"}

⏰ ${timestamp}
      `.trim();

    case "COUPON_RECEIVED":
      return `
🎟️ *Новый купон!*

🏷️ *Название:* ${data.couponName || "Скидка"}
💰 *Номинал:* ${data.discount}${data.discountType === "PERCENT" ? "%" : " ₽"}
📅 *Действует до:* ${data.expiresAt || "Бессрочно"}

✨ Используйте при оформлении заказа!
      `.trim();

    case "COUPON_USED":
      return `
✅ *Купон использован*

🏷️ *Купон:* ${data.couponName || "Скидка"}
💰 *Экономия:* ${data.savedAmount?.toLocaleString("ru-RU")} ₽
📋 *Заказ:* \`#${data.orderId || "N/A"}\`

Спасибо за покупку! 🧋
      `.trim();

    default:
      return `📢 Уведомление: ${JSON.stringify(data)}`;
  }
}

/**
 * 格式化订单商品列表
 */
function formatOrderItems(items: any[] | undefined): string {
  if (!items || items.length === 0) {
    return "• Нет данных";
  }

  return items
    .map((item, index) => {
      const specs = item.specs ? ` (${item.specs})` : "";
      return `${index + 1}. ${item.name}${specs} × ${item.quantity}`;
    })
    .join("\n");
}

// ==================== TelegramBotService 核心类 ====================

export class TelegramBotService {
  private static instance: TelegramBotService;
  private bindTokens: Map<string, { userId: number; expiresAt: Date }> =
    new Map();

  private constructor() {
    // 清理过期的绑定 Token
    setInterval(() => this.cleanupExpiredTokens(), 60000);
  }

  public static getInstance(): TelegramBotService {
    if (!TelegramBotService.instance) {
      TelegramBotService.instance = new TelegramBotService();
    }
    return TelegramBotService.instance;
  }

  /**
   * 发送通知
   */
  async sendNotification(
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    const config = getConfig();

    console.log("\n" + "=".repeat(60));
    console.log("[TelegramBot] 📤 SEND NOTIFICATION");
    console.log("=".repeat(60));
    console.log(`Type: ${request.type}`);
    console.log(`Time: ${new Date().toISOString()}`);

    // 检查配置
    if (!config.botToken) {
      console.log("❌ Bot Token 未配置");
      return {
        success: false,
        errorCode: "BOT_TOKEN_MISSING",
        errorMessage: "Telegram Bot Token not configured",
      };
    }

    // 确定目标 Chat ID
    const target = NOTIFICATION_ROUTING[request.type];
    let chatId: string;

    switch (target) {
      case "REGISTRATION_GROUP":
        chatId = config.registrationChatId;
        break;
      case "FINANCE_GROUP":
        chatId = config.financeChatId;
        break;
      case "KITCHEN_GROUP":
        chatId = config.kitchenChatId;
        break;
      case "PRIVATE_CHAT":
        chatId = request.telegramChatId || "";
        break;
      default:
        chatId = "";
    }

    if (!chatId) {
      console.log(`❌ Chat ID 未配置: target=${target}`);
      return {
        success: false,
        errorCode: "CHAT_ID_MISSING",
        errorMessage: `Chat ID for ${target} not configured`,
      };
    }

    // 生成消息
    const message = generateMessage(request.type, request.data);
    console.log(`Message preview: ${message.substring(0, 100)}...`);

    // 发送消息
    try {
      const url = `${config.apiBaseUrl}/bot${config.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        console.log(`✅ 消息发送成功: message_id=${result.result.message_id}`);
        console.log("=".repeat(60) + "\n");
        return {
          success: true,
          messageId: result.result.message_id,
        };
      } else {
        console.log(`❌ 消息发送失败: ${result.description}`);
        console.log("=".repeat(60) + "\n");
        return {
          success: false,
          errorCode: result.error_code?.toString() || "SEND_FAILED",
          errorMessage: result.description || "Failed to send message",
        };
      }
    } catch (error) {
      console.error("[TelegramBot] API 调用异常:", error);
      console.log("=".repeat(60) + "\n");
      return {
        success: false,
        errorCode: "API_ERROR",
        errorMessage: String(error),
      };
    }
  }

  /**
   * 生成绑定 Token
   */
  generateBindToken(userId: number): string {
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟有效

    this.bindTokens.set(token, { userId, expiresAt });

    console.log(
      `[TelegramBot] 生成绑定 Token: userId=${userId}, token=${token.substring(0, 8)}...`
    );

    return token;
  }

  /**
   * 验证绑定 Token
   */
  validateBindToken(token: string): { valid: boolean; userId?: number } {
    const data = this.bindTokens.get(token);

    if (!data) {
      return { valid: false };
    }

    if (data.expiresAt < new Date()) {
      this.bindTokens.delete(token);
      return { valid: false };
    }

    return { valid: true, userId: data.userId };
  }

  /**
   * 完成绑定（从 Bot 回调）
   */
  async completeBind(
    token: string,
    telegramChatId: string
  ): Promise<TelegramBindResponse> {
    const validation = this.validateBindToken(token);

    if (!validation.valid || !validation.userId) {
      return {
        success: false,
        errorCode: "INVALID_TOKEN",
        errorMessage: "Bind token is invalid or expired",
      };
    }

    // 删除已使用的 Token
    this.bindTokens.delete(token);

    // TODO: 保存绑定关系到数据库
    // await this.saveBinding(validation.userId, telegramChatId);

    console.log(
      `[TelegramBot] 绑定成功: userId=${validation.userId}, chatId=${telegramChatId}`
    );

    return {
      success: true,
      telegramChatId,
    };
  }

  /**
   * 获取 Bot 信息
   */
  async getBotInfo(): Promise<{ username?: string; firstName?: string }> {
    const config = getConfig();

    if (!config.botToken) {
      return {};
    }

    try {
      const url = `${config.apiBaseUrl}/bot${config.botToken}/getMe`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.ok) {
        return {
          username: result.result.username,
          firstName: result.result.first_name,
        };
      }
    } catch (error) {
      console.error("[TelegramBot] 获取 Bot 信息失败:", error);
    }

    return {};
  }

  /**
   * 生成绑定链接
   */
  async generateBindLink(userId: number): Promise<string> {
    const token = this.generateBindToken(userId);
    const botInfo = await this.getBotInfo();

    if (botInfo.username) {
      return `https://t.me/${botInfo.username}?start=bind_${token}`;
    }

    // 如果无法获取 Bot 用户名，返回 Token 让用户手动输入
    return token;
  }

  /**
   * 清理过期的绑定 Token
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleaned = 0;

    const entries = Array.from(this.bindTokens.entries());
    for (const [token, data] of entries) {
      if (data.expiresAt < now) {
        this.bindTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TelegramBot] 清理过期 Token: ${cleaned} 个`);
    }
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    const config = getConfig();
    return !!config.botToken;
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<{
    available: boolean;
    botUsername?: string;
    registrationGroupConfigured: boolean;
    financeGroupConfigured: boolean;
    kitchenGroupConfigured: boolean;
  }> {
    const config = getConfig();
    const botInfo = await this.getBotInfo();

    return {
      available: !!config.botToken,
      botUsername: botInfo.username,
      registrationGroupConfigured: !!config.registrationChatId,
      financeGroupConfigured: !!config.financeChatId,
      kitchenGroupConfigured: !!config.kitchenChatId,
    };
  }
}

// ==================== 导出 ====================

export function getTelegramBotService(): TelegramBotService {
  return TelegramBotService.getInstance();
}

export default TelegramBotService;
