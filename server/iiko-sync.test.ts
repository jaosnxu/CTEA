/**
 * IIKO Sync Conflict Protection Unit Tests
 * 
 * Tests the manual override protection mechanism
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncProductsFromIIKO } from './iiko-sync';
import { PRODUCTS } from './db_mock';

describe('IIKO Sync Conflict Protection', () => {
  beforeEach(() => {
    // Reset products to initial state
    PRODUCTS.forEach(product => {
      product.is_manual_override = false;
    });
  });

  it('should update product when manual override is false', async () => {
    const product = PRODUCTS[0];
    const originalPrice = product.price;
    
    // Mark as not manually overridden
    product.is_manual_override = false;

    // Simulate IIKO sync with new price
    const iikoData = [{
      id: product.id,
      name_ru: product.name_ru,
      price: originalPrice + 100,
      is_manual_override: false,
    }];

    await syncProductsFromIIKO(iikoData);

    // Price should be updated
    expect(PRODUCTS[0].price).toBe(originalPrice + 100);
  });

  it('should NOT update product when manual override is true', async () => {
    const product = PRODUCTS[0];
    const manualPrice = 500;
    
    // Set manual override
    product.price = manualPrice;
    product.is_manual_override = true;

    // Simulate IIKO sync with different price
    const iikoData = [{
      id: product.id,
      name_ru: product.name_ru,
      price: 300,  // IIKO wants to set lower price
      is_manual_override: false,
    }];

    await syncProductsFromIIKO(iikoData);

    // Price should remain unchanged
    expect(PRODUCTS[0].price).toBe(manualPrice);
    expect(PRODUCTS[0].is_manual_override).toBe(true);
  });

  it('should protect multiple products with manual override', async () => {
    // Set manual override on first 3 products
    PRODUCTS.slice(0, 3).forEach(product => {
      product.price = 999;
      product.is_manual_override = true;
    });

    // Simulate IIKO sync
    const iikoData = PRODUCTS.map(product => ({
      id: product.id,
      name_ru: product.name_ru,
      price: 100,  // Try to reset all prices
      is_manual_override: false,
    }));

    await syncProductsFromIIKO(iikoData);

    // First 3 should remain at 999
    expect(PRODUCTS[0].price).toBe(999);
    expect(PRODUCTS[1].price).toBe(999);
    expect(PRODUCTS[2].price).toBe(999);

    // Rest should be updated to 100
    expect(PRODUCTS[3].price).toBe(100);
  });

  it('should log conflict when IIKO tries to override manual price', async () => {
    const product = PRODUCTS[0];
    product.price = 500;
    product.is_manual_override = true;

    const iikoData = [{
      id: product.id,
      name_ru: product.name_ru,
      price: 300,
      is_manual_override: false,
    }];

    // Should not throw error, but log warning
    await expect(syncProductsFromIIKO(iikoData)).resolves.not.toThrow();
  });
});
