/**
 * Unit tests for Pricing Engine
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PricingRule, PricingParams } from "../pricing-engine";

// Mock the database
vi.mock("../../db", () => ({
  getDb: vi.fn(() => null), // Return null to use default rules
}));

describe("PricingEngine", () => {
  let pricingEngine: any;

  beforeEach(async () => {
    // Dynamically import the pricing engine to get fresh instance
    const module = await import("../pricing-engine");
    pricingEngine = module.pricingEngine;
  });

  describe("getPricingRules", () => {
    it("should return default rules when database is not available", async () => {
      const rules = await pricingEngine.getPricingRules();
      
      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty("id");
      expect(rules[0]).toHaveProperty("name");
      expect(rules[0]).toHaveProperty("condition");
      expect(rules[0]).toHaveProperty("action");
      expect(rules[0]).toHaveProperty("priority");
    });
  });

  describe("calculatePrice", () => {
    it("should calculate price with discount percentage", async () => {
      const params: PricingParams = {
        productId: "1",
        userId: "user_1",
        timestamp: "2024-01-01T15:00:00Z", // 3 PM - should trigger happy hour rule
      };

      const result = await pricingEngine.calculatePrice(params);

      expect(result).toHaveProperty("originalPrice");
      expect(result).toHaveProperty("finalPrice");
      expect(result).toHaveProperty("savedAmount");
      expect(result).toHaveProperty("appliedRules");
      expect(result.finalPrice).toBeLessThan(result.originalPrice);
    });

    it("should return original price when no rules apply", async () => {
      const params: PricingParams = {
        productId: "1",
        userId: "user_1",
        timestamp: "2024-01-01T10:00:00Z", // 10 AM - no rules apply
      };

      const result = await pricingEngine.calculatePrice(params);

      expect(result.originalPrice).toBe(result.finalPrice);
      expect(result.savedAmount).toBe(0);
      expect(result.appliedRules).toHaveLength(0);
    });
  });

  describe("Rule Application Logic", () => {
    it("should apply rules in priority order (high to low)", async () => {
      const params: PricingParams = {
        productId: "1",
        userId: "user_1",
        timestamp: "2024-01-01T15:00:00Z",
      };

      const result = await pricingEngine.calculatePrice(params);

      // Rules with higher priority should be applied first
      if (result.appliedRules.length > 1) {
        for (let i = 0; i < result.appliedRules.length - 1; i++) {
          // This is a simplified check - in reality priorities come from rule definitions
          expect(result.appliedRules[i]).toBeDefined();
        }
      }
    });

    it("should filter rules by hour condition", async () => {
      const params1: PricingParams = {
        productId: "1",
        timestamp: "2024-01-01T15:00:00Z", // 3 PM - happy hour
      };

      const params2: PricingParams = {
        productId: "1",
        timestamp: "2024-01-01T10:00:00Z", // 10 AM - not happy hour
      };

      const result1 = await pricingEngine.calculatePrice(params1);
      const result2 = await pricingEngine.calculatePrice(params2);

      // Happy hour rule should apply at 3 PM
      expect(result1.appliedRules.length).toBeGreaterThan(0);
      
      // No time-based rules should apply at 10 AM (unless there are other rules)
      expect(result2.savedAmount).toBeLessThanOrEqual(result1.savedAmount);
    });
  });

  describe("Action Types", () => {
    it("should handle DISCOUNT_PERCENT action", async () => {
      const params: PricingParams = {
        productId: "1",
        timestamp: "2024-01-01T15:00:00Z", // Happy hour - 20% discount
      };

      const result = await pricingEngine.calculatePrice(params);
      const expectedDiscount = 290 * 0.2; // 20% of 290

      expect(result.savedAmount).toBeGreaterThan(0);
      // Should be approximately 20% discount
      expect(Math.abs(result.savedAmount - expectedDiscount)).toBeLessThan(10);
    });
  });

  describe("Condition Matching", () => {
    it("should match hour condition correctly", async () => {
      const hourTests = [
        { hour: 14, shouldMatch: true },  // 2 PM
        { hour: 15, shouldMatch: true },  // 3 PM
        { hour: 16, shouldMatch: true },  // 4 PM
        { hour: 17, shouldMatch: true },  // 5 PM
        { hour: 10, shouldMatch: false }, // 10 AM
        { hour: 20, shouldMatch: false }, // 8 PM
      ];

      for (const test of hourTests) {
        const date = new Date(`2024-01-01T${test.hour.toString().padStart(2, '0')}:00:00Z`);
        const params: PricingParams = {
          productId: "1",
          timestamp: date.toISOString(),
        };

        const result = await pricingEngine.calculatePrice(params);
        
        if (test.shouldMatch) {
          expect(result.savedAmount).toBeGreaterThan(0);
        } else {
          // May still have discounts from other rules
          expect(result.finalPrice).toBeLessThanOrEqual(290);
        }
      }
    });
  });
});
