/**
 * Payment Controller Unit Tests
 * 
 * Tests the payment pre-authorization flow (Hold -> Capture/Void)
 * Uses mock payment service for isolated testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock payment state for testing
interface PaymentState {
  id: string;
  orderId: string;
  amount: number;
  status: 'HELD' | 'CAPTURED' | 'VOIDED' | 'FAILED';
  createdAt: Date;
}

const paymentStore: Map<string, PaymentState> = new Map();

// Payment service functions (isolated from Express handlers)
const createPaymentHold = async (params: {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
}): Promise<PaymentState> => {
  const { orderId, amount, currency, provider } = params;
  
  if (amount <= 0) {
    throw new Error('Invalid amount');
  }
  
  const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const payment: PaymentState = {
    id: paymentId,
    orderId,
    amount,
    status: 'HELD',
    createdAt: new Date(),
  };
  
  paymentStore.set(orderId, payment);
  
  return payment;
};

const capturePaymentByOrderId = async (orderId: string): Promise<PaymentState> => {
  const payment = paymentStore.get(orderId);
  
  if (!payment) {
    throw new Error(`Payment not found for order ${orderId}`);
  }
  
  if (payment.status === 'CAPTURED') {
    throw new Error('Payment already captured');
  }
  
  if (payment.status === 'VOIDED') {
    throw new Error('Cannot capture voided payment');
  }
  
  payment.status = 'CAPTURED';
  return payment;
};

const voidPaymentByOrderId = async (orderId: string): Promise<PaymentState> => {
  const payment = paymentStore.get(orderId);
  
  if (!payment) {
    throw new Error(`Payment not found for order ${orderId}`);
  }
  
  if (payment.status === 'VOIDED') {
    throw new Error('Payment already voided');
  }
  
  if (payment.status === 'CAPTURED') {
    throw new Error('Cannot void captured payment');
  }
  
  payment.status = 'VOIDED';
  return payment;
};

describe('Payment Pre-Authorization', () => {
  beforeEach(() => {
    // Clear payment store before each test
    paymentStore.clear();
  });

  it('should create payment hold successfully', async () => {
    const orderId = 'P000001';
    const amount = 350;

    const result = await createPaymentHold({
      orderId,
      amount,
      currency: 'RUB',
      provider: 'mock',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('HELD');
    expect(result.amount).toBe(amount);
    expect(result.orderId).toBe(orderId);
  });

  it('should capture payment after successful IIKO sync', async () => {
    const orderId = 'P000002';
    
    // Create payment hold
    await createPaymentHold({
      orderId,
      amount: 500,
      currency: 'RUB',
      provider: 'mock',
    });

    // Capture payment
    const result = await capturePaymentByOrderId(orderId);

    expect(result).toBeDefined();
    expect(result.status).toBe('CAPTURED');
  });

  it('should void payment after failed IIKO sync', async () => {
    const orderId = 'P000003';
    
    // Create payment hold
    await createPaymentHold({
      orderId,
      amount: 400,
      currency: 'RUB',
      provider: 'mock',
    });

    // Void payment
    const result = await voidPaymentByOrderId(orderId);

    expect(result).toBeDefined();
    expect(result.status).toBe('VOIDED');
  });

  it('should reject invalid payment amount', async () => {
    const orderId = 'P000004';
    
    // Attempt to create payment with invalid amount
    await expect(async () => {
      await createPaymentHold({
        orderId,
        amount: -100,  // Invalid amount
        currency: 'RUB',
        provider: 'mock',
      });
    }).rejects.toThrow('Invalid amount');
  });

  it('should prevent double capture', async () => {
    const orderId = 'P000005';
    
    // Create and capture payment
    await createPaymentHold({
      orderId,
      amount: 300,
      currency: 'RUB',
      provider: 'mock',
    });
    await capturePaymentByOrderId(orderId);

    // Attempt second capture
    await expect(async () => {
      await capturePaymentByOrderId(orderId);
    }).rejects.toThrow('Payment already captured');
  });

  it('should prevent capture of voided payment', async () => {
    const orderId = 'P000006';
    
    // Create and void payment
    await createPaymentHold({
      orderId,
      amount: 200,
      currency: 'RUB',
      provider: 'mock',
    });
    await voidPaymentByOrderId(orderId);

    // Attempt to capture voided payment
    await expect(async () => {
      await capturePaymentByOrderId(orderId);
    }).rejects.toThrow('Cannot capture voided payment');
  });

  it('should prevent void of captured payment', async () => {
    const orderId = 'P000007';
    
    // Create and capture payment
    await createPaymentHold({
      orderId,
      amount: 250,
      currency: 'RUB',
      provider: 'mock',
    });
    await capturePaymentByOrderId(orderId);

    // Attempt to void captured payment
    await expect(async () => {
      await voidPaymentByOrderId(orderId);
    }).rejects.toThrow('Cannot void captured payment');
  });

  it('should throw error for non-existent payment', async () => {
    await expect(async () => {
      await capturePaymentByOrderId('NON_EXISTENT');
    }).rejects.toThrow('Payment not found');
  });
});
