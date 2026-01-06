/**
 * CHU TEA - Payment Settings (Admin Controlled)
 * 
 * This module stores payment gateway configuration that can be
 * modified through the admin panel.
 */

import type { PaymentProvider } from './payment-gateway';

export interface PaymentSettings {
  // Provider selection
  provider: PaymentProvider;
  enabled: boolean;
  testMode: boolean;
  
  // Tinkoff credentials
  tinkoffTerminalKey: string;
  tinkoffSecretKey: string;
  
  // YooKassa credentials
  yookassaShopId: string;
  yookassaSecretKey: string;
  
  // Feature flags
  enablePreAuth: boolean;  // Pre-authorization (Hold-Capture)
  autoVoidOnFailure: boolean;  // Auto-void if IIKO fails
  
  // Metadata
  updatedAt: string;
  updatedBy: string;
}

// Default settings (Mock provider for demo)
export const PAYMENT_SETTINGS: PaymentSettings = {
  provider: 'mock',
  enabled: true,
  testMode: true,
  
  tinkoffTerminalKey: '',
  tinkoffSecretKey: '',
  
  yookassaShopId: '',
  yookassaSecretKey: '',
  
  enablePreAuth: true,
  autoVoidOnFailure: true,
  
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

/**
 * Get current payment settings
 */
export function getPaymentSettings(): PaymentSettings {
  return { ...PAYMENT_SETTINGS };
}

/**
 * Update payment settings (admin only)
 */
export function updatePaymentSettings(updates: Partial<PaymentSettings>, adminName: string): PaymentSettings {
  Object.assign(PAYMENT_SETTINGS, updates);
  PAYMENT_SETTINGS.updatedAt = new Date().toISOString();
  PAYMENT_SETTINGS.updatedBy = adminName;
  
  console.log(`[Admin] Payment settings updated by ${adminName}:`, updates);
  return { ...PAYMENT_SETTINGS };
}

/**
 * Validate payment settings before saving
 */
export function validatePaymentSettings(settings: Partial<PaymentSettings>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (settings.provider === 'tinkoff') {
    if (!settings.tinkoffTerminalKey) {
      errors.push('Tinkoff Terminal Key is required');
    }
    if (!settings.tinkoffSecretKey) {
      errors.push('Tinkoff Secret Key is required');
    }
  }
  
  if (settings.provider === 'yookassa') {
    if (!settings.yookassaShopId) {
      errors.push('YooKassa Shop ID is required');
    }
    if (!settings.yookassaSecretKey) {
      errors.push('YooKassa Secret Key is required');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
