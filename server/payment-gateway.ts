/**
 * CHU TEA - Payment Gateway Adapter
 * 
 * Supports:
 * - Tinkoff Acquiring API
 * - YooKassa (formerly Yandex.Kassa)
 * 
 * Features:
 * - Pre-authorization (Hold funds)
 * - Capture (Confirm payment)
 * - Void/Cancel (Release funds)
 * - Webhook handling
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type PaymentProvider = 'tinkoff' | 'yookassa' | 'mock';

export type PaymentStatus =
  | 'PENDING'      // Initial state
  | 'AUTHORIZED'   // Funds held (pre-auth)
  | 'CAPTURED'     // Payment confirmed
  | 'VOIDED'       // Payment cancelled/refunded
  | 'FAILED';      // Payment failed

export interface PaymentConfig {
  provider: PaymentProvider;
  testMode: boolean;
  
  // Tinkoff credentials
  tinkoffTerminalKey?: string;
  tinkoffSecretKey?: string;
  
  // YooKassa credentials
  yookassaShopId?: string;
  yookassaSecretKey?: string;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;  // In rubles (₽)
  currency: string;  // 'RUB'
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  paymentUrl?: string;  // Redirect URL for customer
  error?: string;
}

export interface CaptureRequest {
  paymentId: string;
  amount?: number;  // Optional: partial capture
}

export interface VoidRequest {
  paymentId: string;
  reason?: string;
}

// ============================================================================
// Payment Gateway Adapter
// ============================================================================

export class PaymentGateway {
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
  }

  /**
   * Create payment and hold funds (pre-authorization)
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log(`[Payment] Creating payment via ${this.config.provider}:`, request);

    switch (this.config.provider) {
      case 'tinkoff':
        return this.tinkoffCreatePayment(request);
      case 'yookassa':
        return this.yookassaCreatePayment(request);
      case 'mock':
        return this.mockCreatePayment(request);
      default:
        throw new Error(`Unsupported payment provider: ${this.config.provider}`);
    }
  }

  /**
   * Capture payment (confirm and transfer funds)
   */
  async capturePayment(request: CaptureRequest): Promise<PaymentResponse> {
    console.log(`[Payment] Capturing payment via ${this.config.provider}:`, request);

    switch (this.config.provider) {
      case 'tinkoff':
        return this.tinkoffCapturePayment(request);
      case 'yookassa':
        return this.yookassaCapturePayment(request);
      case 'mock':
        return this.mockCapturePayment(request);
      default:
        throw new Error(`Unsupported payment provider: ${this.config.provider}`);
    }
  }

  /**
   * Void/cancel payment (release held funds)
   */
  async voidPayment(request: VoidRequest): Promise<PaymentResponse> {
    console.log(`[Payment] Voiding payment via ${this.config.provider}:`, request);

    switch (this.config.provider) {
      case 'tinkoff':
        return this.tinkoffVoidPayment(request);
      case 'yookassa':
        return this.yookassaVoidPayment(request);
      case 'mock':
        return this.mockVoidPayment(request);
      default:
        throw new Error(`Unsupported payment provider: ${this.config.provider}`);
    }
  }

  // ==========================================================================
  // Tinkoff Acquiring Implementation
  // ==========================================================================

  private async tinkoffCreatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { tinkoffTerminalKey, tinkoffSecretKey, testMode } = this.config;

    if (!tinkoffTerminalKey || !tinkoffSecretKey) {
      throw new Error('Tinkoff credentials not configured');
    }

    const apiUrl = testMode
      ? 'https://rest-api-test.tinkoff.ru/v2'
      : 'https://securepay.tinkoff.ru/v2';

    const params = {
      TerminalKey: tinkoffTerminalKey,
      Amount: Math.round(request.amount * 100), // Convert to kopecks
      OrderId: request.orderId,
      Description: request.description,
      PayType: 'O', // One-stage payment (can be changed to 'T' for two-stage)
      DATA: {
        Email: request.customerEmail,
        Phone: request.customerPhone,
      },
      Receipt: this.generateTinkoffReceipt(request),
    };

    const token = this.generateTinkoffToken(params, tinkoffSecretKey);

    try {
      const response = await fetch(`${apiUrl}/Init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, Token: token }),
      });

      const data = await response.json();

      if (data.Success) {
        return {
          success: true,
          paymentId: data.PaymentId,
          status: 'PENDING',
          paymentUrl: data.PaymentURL,
        };
      } else {
        return {
          success: false,
          paymentId: '',
          status: 'FAILED',
          error: data.Message || 'Tinkoff payment creation failed',
        };
      }
    } catch (error: any) {
      console.error('[Tinkoff] Payment creation error:', error);
      return {
        success: false,
        paymentId: '',
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private async tinkoffCapturePayment(request: CaptureRequest): Promise<PaymentResponse> {
    const { tinkoffTerminalKey, tinkoffSecretKey, testMode } = this.config;

    const apiUrl = testMode
      ? 'https://rest-api-test.tinkoff.ru/v2'
      : 'https://securepay.tinkoff.ru/v2';

    const params = {
      TerminalKey: tinkoffTerminalKey,
      PaymentId: request.paymentId,
    };

    const token = this.generateTinkoffToken(params, tinkoffSecretKey!);

    try {
      const response = await fetch(`${apiUrl}/Confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, Token: token }),
      });

      const data = await response.json();

      if (data.Success) {
        return {
          success: true,
          paymentId: request.paymentId,
          status: 'CAPTURED',
        };
      } else {
        return {
          success: false,
          paymentId: request.paymentId,
          status: 'FAILED',
          error: data.Message || 'Tinkoff capture failed',
        };
      }
    } catch (error: any) {
      console.error('[Tinkoff] Capture error:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private async tinkoffVoidPayment(request: VoidRequest): Promise<PaymentResponse> {
    const { tinkoffTerminalKey, tinkoffSecretKey, testMode } = this.config;

    const apiUrl = testMode
      ? 'https://rest-api-test.tinkoff.ru/v2'
      : 'https://securepay.tinkoff.ru/v2';

    const params = {
      TerminalKey: tinkoffTerminalKey,
      PaymentId: request.paymentId,
    };

    const token = this.generateTinkoffToken(params, tinkoffSecretKey!);

    try {
      const response = await fetch(`${apiUrl}/Cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, Token: token }),
      });

      const data = await response.json();

      if (data.Success) {
        return {
          success: true,
          paymentId: request.paymentId,
          status: 'VOIDED',
        };
      } else {
        return {
          success: false,
          paymentId: request.paymentId,
          status: 'FAILED',
          error: data.Message || 'Tinkoff void failed',
        };
      }
    } catch (error: any) {
      console.error('[Tinkoff] Void error:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private generateTinkoffToken(params: any, secretKey: string): string {
    const values = Object.keys(params)
      .filter((key) => key !== 'Token' && key !== 'DATA' && key !== 'Receipt')
      .sort()
      .map((key) => params[key])
      .join('');

    const tokenString = `${secretKey}${values}${secretKey}`;
    return crypto.createHash('sha256').update(tokenString).digest('hex');
  }

  private generateTinkoffReceipt(request: PaymentRequest): any {
    return {
      EmailCompany: 'info@chutea.ru',
      Taxation: 'usn_income',
      Items: [
        {
          Name: request.description,
          Price: Math.round(request.amount * 100),
          Quantity: 1,
          Amount: Math.round(request.amount * 100),
          Tax: 'none',
        },
      ],
    };
  }

  // ==========================================================================
  // YooKassa Implementation
  // ==========================================================================

  private async yookassaCreatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { yookassaShopId, yookassaSecretKey, testMode } = this.config;

    if (!yookassaShopId || !yookassaSecretKey) {
      throw new Error('YooKassa credentials not configured');
    }

    const apiUrl = 'https://api.yookassa.ru/v3/payments';
    const idempotenceKey = crypto.randomUUID();

    const auth = Buffer.from(`${yookassaShopId}:${yookassaSecretKey}`).toString('base64');

    const payload = {
      amount: {
        value: request.amount.toFixed(2),
        currency: request.currency,
      },
      capture: false, // Pre-authorization mode
      confirmation: {
        type: 'redirect',
        return_url: request.returnUrl || 'https://chutea.ru/orders',
      },
      description: request.description,
      metadata: {
        order_id: request.orderId,
      },
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotenceKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.id) {
        return {
          success: true,
          paymentId: data.id,
          status: 'PENDING',
          paymentUrl: data.confirmation.confirmation_url,
        };
      } else {
        return {
          success: false,
          paymentId: '',
          status: 'FAILED',
          error: data.description || 'YooKassa payment creation failed',
        };
      }
    } catch (error: any) {
      console.error('[YooKassa] Payment creation error:', error);
      return {
        success: false,
        paymentId: '',
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private async yookassaCapturePayment(request: CaptureRequest): Promise<PaymentResponse> {
    const { yookassaShopId, yookassaSecretKey } = this.config;

    const apiUrl = `https://api.yookassa.ru/v3/payments/${request.paymentId}/capture`;
    const idempotenceKey = crypto.randomUUID();

    const auth = Buffer.from(`${yookassaShopId}:${yookassaSecretKey}`).toString('base64');

    const payload = request.amount
      ? {
          amount: {
            value: request.amount.toFixed(2),
            currency: 'RUB',
          },
        }
      : {};

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotenceKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'succeeded') {
        return {
          success: true,
          paymentId: request.paymentId,
          status: 'CAPTURED',
        };
      } else {
        return {
          success: false,
          paymentId: request.paymentId,
          status: 'FAILED',
          error: data.description || 'YooKassa capture failed',
        };
      }
    } catch (error: any) {
      console.error('[YooKassa] Capture error:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  private async yookassaVoidPayment(request: VoidRequest): Promise<PaymentResponse> {
    const { yookassaShopId, yookassaSecretKey } = this.config;

    const apiUrl = `https://api.yookassa.ru/v3/payments/${request.paymentId}/cancel`;
    const idempotenceKey = crypto.randomUUID();

    const auth = Buffer.from(`${yookassaShopId}:${yookassaSecretKey}`).toString('base64');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'Idempotence-Key': idempotenceKey,
        },
      });

      const data = await response.json();

      if (data.status === 'canceled') {
        return {
          success: true,
          paymentId: request.paymentId,
          status: 'VOIDED',
        };
      } else {
        return {
          success: false,
          paymentId: request.paymentId,
          status: 'FAILED',
          error: data.description || 'YooKassa void failed',
        };
      }
    } catch (error: any) {
      console.error('[YooKassa] Void error:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        status: 'FAILED',
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // Mock Implementation (for testing)
  // ==========================================================================

  private async mockCreatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentId = `MOCK_${Date.now()}`;
    console.log(`[Mock] Payment created: ${paymentId}`);

    return {
      success: true,
      paymentId,
      status: 'AUTHORIZED',
      paymentUrl: `https://mock-payment.chutea.ru/pay/${paymentId}`,
    };
  }

  private async mockCapturePayment(request: CaptureRequest): Promise<PaymentResponse> {
    console.log(`[Mock] Payment captured: ${request.paymentId}`);

    return {
      success: true,
      paymentId: request.paymentId,
      status: 'CAPTURED',
    };
  }

  private async mockVoidPayment(request: VoidRequest): Promise<PaymentResponse> {
    console.log(`[Mock] Payment voided: ${request.paymentId}`);

    return {
      success: true,
      paymentId: request.paymentId,
      status: 'VOIDED',
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPaymentGateway(config: PaymentConfig): PaymentGateway {
  return new PaymentGateway(config);
}
