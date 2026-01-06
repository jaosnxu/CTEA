/**
 * Membership Points Calculation Unit Tests
 * 
 * Tests the membership tier system and points accumulation
 */

import { describe, it, expect } from 'vitest';
import { calculatePoints, applyMembershipDiscount, getMembershipTier } from './membership';

describe('Membership Points Calculation', () => {
  it('should calculate points for Bronze tier (1 point per ₽10)', () => {
    const amount = 500;
    const tier = 'BRONZE';

    const points = calculatePoints(amount, tier);

    expect(points).toBe(50);  // 500 / 10 = 50 points
  });

  it('should calculate points for Silver tier (1.5x multiplier)', () => {
    const amount = 500;
    const tier = 'SILVER';

    const points = calculatePoints(amount, tier);

    expect(points).toBe(75);  // (500 / 10) * 1.5 = 75 points
  });

  it('should calculate points for Gold tier (2x multiplier)', () => {
    const amount = 500;
    const tier = 'GOLD';

    const points = calculatePoints(amount, tier);

    expect(points).toBe(100);  // (500 / 10) * 2 = 100 points
  });

  it('should calculate points for Platinum tier (3x multiplier)', () => {
    const amount = 500;
    const tier = 'PLATINUM';

    const points = calculatePoints(amount, tier);

    expect(points).toBe(150);  // (500 / 10) * 3 = 150 points
  });

  it('should apply 5% discount for Silver tier', () => {
    const amount = 1000;
    const tier = 'SILVER';

    const discounted = applyMembershipDiscount(amount, tier);

    expect(discounted).toBe(950);  // 1000 * 0.95
  });

  it('should apply 10% discount for Gold tier', () => {
    const amount = 1000;
    const tier = 'GOLD';

    const discounted = applyMembershipDiscount(amount, tier);

    expect(discounted).toBe(900);  // 1000 * 0.90
  });

  it('should apply 15% discount for Platinum tier', () => {
    const amount = 1000;
    const tier = 'PLATINUM';

    const discounted = applyMembershipDiscount(amount, tier);

    expect(discounted).toBe(850);  // 1000 * 0.85
  });

  it('should determine tier based on total points', () => {
    expect(getMembershipTier(0)).toBe('BRONZE');
    expect(getMembershipTier(500)).toBe('SILVER');
    expect(getMembershipTier(1500)).toBe('GOLD');
    expect(getMembershipTier(5000)).toBe('PLATINUM');
  });

  it('should handle edge cases for points calculation', () => {
    // Zero amount
    expect(calculatePoints(0, 'BRONZE')).toBe(0);

    // Small amount
    expect(calculatePoints(5, 'BRONZE')).toBe(0);  // Less than ₽10

    // Large amount
    expect(calculatePoints(10000, 'PLATINUM')).toBe(3000);  // (10000 / 10) * 3
  });
});
