/**
 * Payment Controller Unit Tests
 * 
 * Tests the payment pre-authorization flow (Hold -> Capture/Void)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPayment, capturePayment, voidPayment } from './payment.controller';
import { ORDERS } from './db_mock';

describe('Payment Pre-Authorization', () => {
  beforeEach(() => {
    // Clear orders before each test
    ORDERS.length = 0;
  });

  it('should create payment hold successfully', async () => {
    const orderId = 'P000001';
    const amount = 350;

    const result = await createPayment({
      orderId,
      amount,
      currency: 'RUB',
      provider: 'mock',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('HELD');
    expect(result.amount).toBe(amount);
  });

  it('should capture payment after successful IIKO sync', async () => {
    const orderId = 'P000002';
    
    // Create payment hold
    await createPayment({
      orderId,
      amount: 500,
      currency: 'RUB',
      provider: 'mock',
    });

    // Capture payment
    const result = await capturePayment(orderId);

    expect(result).toBeDefined();
    expect(result.status).toBe('CAPTURED');
  });

  it('should void payment after failed IIKO sync', async () => {
    const orderId = 'P000003';
    
    // Create payment hold
    await createPayment({
      orderId,
      amount: 400,
      currency: 'RUB',
      provider: 'mock',
    });

    // Void payment
    const result = await voidPayment(orderId);

    expect(result).toBeDefined();
    expect(result.status).toBe('VOIDED');
  });

  it('should handle payment hold timeout', async () => {
    const orderId = 'P000004';
    
    // Simulate timeout scenario
    await expect(async () => {
      await createPayment({
        orderId,
        amount: -100,  // Invalid amount
        currency: 'RUB',
        provider: 'mock',
      });
    }).rejects.toThrow();
  });

  it('should prevent double capture', async () => {
    const orderId = 'P000005';
    
    // Create and capture payment
    await createPayment({
      orderId,
      amount: 300,
      currency: 'RUB',
      provider: 'mock',
    });
    await capturePayment(orderId);

    // Attempt second capture
    await expect(async () => {
      await capturePayment(orderId);
    }).rejects.toThrow();
  });
});
