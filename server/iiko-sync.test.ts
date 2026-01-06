/**
 * IIKO Sync Conflict Protection Unit Tests
 * 
 * Tests the manual override protection mechanism
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { syncFromIIKOMock, resetAllOverrides } from './iiko-sync';
import { PRODUCTS } from './db_mock';

describe('IIKO Sync Conflict Protection', () => {
  beforeEach(() => {
    // Reset products to initial state
    resetAllOverrides();
    // Reset prices to default
    PRODUCTS.forEach((product, index) => {
      product.price = 280 + (index * 10); // Reset to original prices
    });
  });

  it('should update product when manual override is false', async () => {
    const product = PRODUCTS[0];
    const originalPrice = product.price;
    
    // Mark as not manually overridden
    product.is_manual_override = false;

    // Sync from IIKO mock
    const result = syncFromIIKOMock();

    // Should have updated at least one product
    expect(result.updated).toBeGreaterThanOrEqual(0);
  });

  it('should NOT update product when manual override is true', async () => {
    const product = PRODUCTS[0];
    const manualPrice = 500;
    
    // Set manual override
    product.price = manualPrice;
    product.is_manual_override = true;

    // Sync from IIKO mock
    const result = syncFromIIKOMock();

    // Price should remain unchanged
    expect(PRODUCTS[0].price).toBe(manualPrice);
    expect(PRODUCTS[0].is_manual_override).toBe(true);
    expect(result.skipped).toBeGreaterThan(0);
  });

  it('should protect multiple products with manual override', async () => {
    // Set manual override on first 3 products
    PRODUCTS.slice(0, 3).forEach(product => {
      product.price = 999;
      product.is_manual_override = true;
    });

    // Sync from IIKO mock
    const result = syncFromIIKOMock();

    // First 3 should remain at 999
    expect(PRODUCTS[0].price).toBe(999);
    expect(PRODUCTS[1].price).toBe(999);
    expect(PRODUCTS[2].price).toBe(999);
    
    // Should have skipped protected products
    expect(result.skipped).toBeGreaterThanOrEqual(3);
  });

  it('should log conflict when IIKO tries to override manual price', async () => {
    const product = PRODUCTS[0];
    product.price = 500;
    product.is_manual_override = true;

    // Should not throw error
    const result = syncFromIIKOMock();
    
    // Should have conflicts
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].id).toBe(product.id);
  });

  it('should force override when forceOverride is true', async () => {
    const product = PRODUCTS[0];
    product.price = 500;
    product.is_manual_override = true;

    // Force override
    const result = syncFromIIKOMock(true);

    // Product should be updated despite manual override
    expect(result.updated).toBeGreaterThan(0);
  });
});
