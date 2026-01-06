/**
 * CHU TEA - Telegram Bot Settings (Admin Controlled)
 */

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  webhookUrl: string;
  miniAppUrl: string;
  sendOrderConfirmations: boolean;
  sendStatusUpdates: boolean;
  updatedAt: string;
  updatedBy: string;
}

// Default settings
export const TELEGRAM_SETTINGS: TelegramSettings = {
  enabled: false,
  botToken: '',
  webhookUrl: '',
  miniAppUrl: '',
  sendOrderConfirmations: true,
  sendStatusUpdates: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export function getTelegramSettings(): TelegramSettings {
  return { ...TELEGRAM_SETTINGS };
}

export function updateTelegramSettings(
  updates: Partial<TelegramSettings>,
  adminName: string
): TelegramSettings {
  Object.assign(TELEGRAM_SETTINGS, updates);
  TELEGRAM_SETTINGS.updatedAt = new Date().toISOString();
  TELEGRAM_SETTINGS.updatedBy = adminName;

  console.log(`[Admin] Telegram settings updated by ${adminName}:`, updates);
  return { ...TELEGRAM_SETTINGS };
}
