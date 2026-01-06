/**
 * CHU TEA - Telegram Mini App Integration
 * 
 * Official Telegram Bot API: https://core.telegram.org/bots/api
 * Telegram Mini Apps: https://core.telegram.org/bots/webapps
 */

export interface TelegramBotConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  miniAppUrl?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramOrder {
  telegramUserId: number;
  orderId: string;
  items: any[];
  totalAmount: number;
}

/**
 * Telegram Bot Client
 */
export class TelegramBotClient {
  private config: TelegramBotConfig;
  private apiUrl: string;

  constructor(config: TelegramBotConfig) {
    this.config = config;
    this.apiUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Send message to user
   */
  async sendMessage(chatId: number, text: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[Telegram] Bot disabled, skipping message');
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('[Telegram] Send message error:', error);
      return false;
    }
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(chatId: number, order: TelegramOrder): Promise<boolean> {
    const message = `
🎉 <b>Заказ подтвержден!</b>

📦 Номер заказа: <code>${order.orderId}</code>
💰 Сумма: ₽${order.totalAmount}
📍 Статус: Готовится

Спасибо за заказ в CHU TEA! 🍵
    `.trim();

    return this.sendMessage(chatId, message);
  }

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(
    chatId: number,
    orderId: string,
    status: string
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      PAID: '✅ Оплачен',
      PREPARING: '👨‍🍳 Готовится',
      READY: '🎉 Готов к выдаче',
      COMPLETED: '✅ Завершен',
      VOIDED: '❌ Отменен',
    };

    const message = `
📦 <b>Обновление заказа ${orderId}</b>

Статус: ${statusMessages[status] || status}
    `.trim();

    return this.sendMessage(chatId, message);
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(url: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('[Telegram] Bot disabled, skipping webhook setup');
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('[Telegram] Set webhook error:', error);
      return false;
    }
  }

  /**
   * Test bot connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Telegram bot is disabled',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          message: `Connected to bot: @${data.result.username}`,
        };
      } else {
        return {
          success: false,
          message: 'Invalid bot token',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

/**
 * Factory function
 */
export function createTelegramBot(config: TelegramBotConfig): TelegramBotClient {
  return new TelegramBotClient(config);
}

/**
 * Mock Telegram Bot (for testing)
 */
export class MockTelegramBot {
  async sendMessage(chatId: number, text: string): Promise<boolean> {
    console.log(`[Mock Telegram] Sending message to ${chatId}:`, text);
    return true;
  }

  async sendOrderConfirmation(chatId: number, order: TelegramOrder): Promise<boolean> {
    console.log(`[Mock Telegram] Order confirmation sent to ${chatId}:`, order.orderId);
    return true;
  }

  async sendOrderStatusUpdate(
    chatId: number,
    orderId: string,
    status: string
  ): Promise<boolean> {
    console.log(`[Mock Telegram] Status update sent to ${chatId}: ${orderId} -> ${status}`);
    return true;
  }

  async setWebhook(url: string): Promise<boolean> {
    console.log(`[Mock Telegram] Webhook set to:`, url);
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Mock Telegram bot connection successful',
    };
  }
}
