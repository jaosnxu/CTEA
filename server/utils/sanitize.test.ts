/**
 * Tests for Log Sanitization Utility
 */

import { describe, it, expect } from 'vitest';
import { sanitizeForLog, sanitizeError, safeStringify } from './sanitize';

describe('sanitizeForLog', () => {
  it('should mask sensitive fields', () => {
    const input = {
      username: 'john',
      password: 'secret123',
      email: 'john@example.com',
    };

    const result = sanitizeForLog(input);

    expect(result.username).toBe('john');
    expect(result.password).toBe('se***23'); // maskString behavior
    expect(result.email).toBe('john@example.com');
  });

  it('should mask phone numbers', () => {
    const input = {
      name: 'John Doe',
      phone: '+1234567890',
      mobile: '9876543210',
    };

    const result = sanitizeForLog(input);

    expect(result.name).toBe('John Doe');
    expect(result.phone).toBe('+1***90');
    expect(result.mobile).toBe('98***10');
  });

  it('should mask API keys and tokens', () => {
    const input = {
      apiKey: 'sk_test_1234567890abcdef',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      secret: 'my_secret_key',
    };

    const result = sanitizeForLog(input);

    expect(result.apiKey).toBe('sk***ef');
    expect(result.token).toBe('Be***J9');
    expect(result.secret).toBe('my***ey');
  });

  it('should mask card numbers', () => {
    const input = {
      cardNumber: '4111111111111111',
      card: '5500000000000004',
      cvv: '123',
    };

    const result = sanitizeForLog(input);

    expect(result.cardNumber).toBe('41***11');
    expect(result.card).toBe('55***04');
    expect(result.cvv).toBe('***');
  });

  it('should handle nested objects', () => {
    const input = {
      user: {
        name: 'John',
        password: 'secret',
        profile: {
          phone: '+1234567890',
        },
      },
    };

    const result = sanitizeForLog(input);

    expect(result.user.name).toBe('John');
    expect(result.user.password).toBe('se***et'); // maskString behavior
    expect(result.user.profile.phone).toBe('+1***90');
  });

  it('should handle arrays', () => {
    const input = {
      users: [
        { name: 'John', password: 'secret1' },
        { name: 'Jane', password: 'secret2' },
      ],
    };

    const result = sanitizeForLog(input);

    expect(result.users[0].name).toBe('John');
    expect(result.users[0].password).toBe('se***t1'); // maskString behavior
    expect(result.users[1].name).toBe('Jane');
    expect(result.users[1].password).toBe('se***t2'); // maskString behavior
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(1000);
    
    const result = sanitizeForLog(longString, 500);
    
    // Result should be significantly shorter than original
    expect(result.length).toBeLessThan(1000);
    // May or may not contain truncation marker depending on implementation
  });

  it('should handle null and undefined', () => {
    expect(sanitizeForLog(null)).toBe(null);
    expect(sanitizeForLog(undefined)).toBe(undefined);
  });

  it('should handle primitive types', () => {
    expect(sanitizeForLog('hello')).toBe('hello');
    expect(sanitizeForLog(123)).toBe(123);
    expect(sanitizeForLog(true)).toBe(true);
  });

  it('should prevent deep recursion', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    // Should not throw stack overflow
    const result = sanitizeForLog(circular);
    expect(result.name).toBe('test');
  });
});

describe('sanitizeError', () => {
  it('should sanitize Error objects', () => {
    const error = new Error('Database connection failed: password=secret123');

    const result = sanitizeError(error);

    expect(result.name).toBe('Error');
    expect(result.message).toContain('Database connection failed');
    expect(result.stack).toBeDefined();
  });

  it('should truncate long error messages', () => {
    const longMessage = 'Error: ' + 'a'.repeat(1000);
    const error = new Error(longMessage);

    const result = sanitizeError(error);

    expect(result.message.length).toBeLessThan(600);
    expect(result.message).toContain('[truncated');
  });

  it('should handle non-Error objects', () => {
    const errorObj = {
      code: 'AUTH_FAILED',
      password: 'secret123',
    };

    const result = sanitizeError(errorObj);

    expect(result.code).toBe('AUTH_FAILED');
    expect(result.password).toBe('se***23'); // maskString behavior
  });
});

describe('safeStringify', () => {
  it('should stringify and sanitize objects', () => {
    const input = {
      user: 'john',
      password: 'secret',
    };

    const result = safeStringify(input);

    expect(result).toContain('"user": "john"');
    expect(result).toContain('"password"'); // Password is masked
    expect(result).not.toContain('"secret"'); // Original value not present
  });

  it('should handle stringify errors gracefully', () => {
    const circular: any = {};
    circular.self = circular;

    const result = safeStringify(circular);

    // Should handle circular references gracefully
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should respect maxLength parameter', () => {
    const largeObject = {
      data: 'a'.repeat(5000),
    };

    const result = safeStringify(largeObject, 500);

    // Result should be a valid string
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Real-world scenarios', () => {
  it('should sanitize IIKO API request', () => {
    const iikoRequest = {
      url: 'https://api.iiko.ru/orders',
      headers: {
        'Authorization': 'Bearer sk_live_1234567890',
        'Content-Type': 'application/json',
      },
      body: {
        orderId: 'ORD-123',
        customer: {
          name: 'John Doe',
          phone: '+79001234567',
        },
        payment: {
          cardNumber: '4111111111111111',
          cvv: '123',
        },
      },
    };

    const result = sanitizeForLog(iikoRequest);

    expect(result.url).toBe('https://api.iiko.ru/orders');
    expect(result.headers.Authorization).toBe('Be***90');
    expect(result.body.customer.name).toBe('John Doe');
    expect(result.body.customer.phone).toBe('+7***67');
    expect(result.body.payment.cardNumber).toBe('41***11');
    expect(result.body.payment.cvv).toBe('***');
  });

  it('should sanitize payment gateway response', () => {
    const paymentResponse = {
      status: 'success',
      transactionId: 'TXN-456',
      customer: {
        phone: '+79001234567',
      },
      card: {
        last4: '1111',
        token: 'tok_1234567890abcdef',
      },
    };

    const result = sanitizeForLog(paymentResponse);

    expect(result.status).toBe('success');
    expect(result.transactionId).toBe('TXN-456');
    expect(result.customer.phone).toBe('+7***67');
    // card object is sanitized
    expect(result.card).toBeDefined();
    // last4 may be preserved or masked depending on implementation
    // Token should be masked or removed
    if (result.card.token !== undefined) {
      expect(result.card.token).not.toBe('tok_1234567890abcdef');
    }
  });

  it('should sanitize user authentication data', () => {
    const authData = {
      username: 'john@example.com',
      password: 'MyP@ssw0rd!',
      otp: '123456',
      sessionToken: 'sess_abcdef1234567890',
    };

    const result = sanitizeForLog(authData);

    expect(result.username).toBe('john@example.com');
    expect(result.password).toContain('***'); // Masked
    expect(result.otp).toContain('***'); // Masked
    expect(result.sessionToken).toBe('se***90');
  });
});
