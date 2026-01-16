/**
 * Pricing Engine - Rule-Driven Dynamic Pricing System
 *
 * Responsibilities:
 * - Calculate product prices based on dynamic rules
 * - Manage pricing rules (CRUD operations)
 * - Apply priority-based rule stacking
 */

import { getDb } from "../../db";
import { pricingRules, productPricingRules } from "../../../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface PricingParams {
  productId: string;
  userId?: string;
  storeId?: string;
  quantity?: number;
  timestamp?: string;
}

export interface PricingResult {
  originalPrice: number;
  finalPrice: number;
  savedAmount: number;
  appliedRules: AppliedRule[];
}

export interface AppliedRule {
  id: string;
  name: string;
  description: string;
  discount: number;
}

export interface PricingRuleCondition {
  userLevel?: string;
  hour?: number[];
  dayOfWeek?: number[];
  storeId?: string;
  minQuantity?: number;
}

export interface PricingRuleAction {
  type: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED" | "MARKUP_PERCENT" | "SET_PRICE";
  value: number;
}

export interface PricingRule {
  id: string;
  name: string | { zh?: string; ru?: string; en?: string };
  description: string | { zh?: string; ru?: string; en?: string };
  condition: PricingRuleCondition;
  action: PricingRuleAction;
  priority: number;
  isActive?: boolean;
  orgId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Default pricing rules
 */
const DEFAULT_PRICING_RULES: PricingRule[] = [
  {
    id: "rule_001",
    name: "欢乐时光",
    description: "下午2-5点享8折",
    condition: { hour: [14, 15, 16, 17] },
    action: { type: "DISCOUNT_PERCENT", value: 20 },
    priority: 5,
    isActive: true,
  },
  {
    id: "rule_002",
    name: "会员折扣 - 金卡",
    description: "金卡会员享95折",
    condition: { userLevel: "Gold" },
    action: { type: "DISCOUNT_PERCENT", value: 5 },
    priority: 10,
    isActive: true,
  },
];

/**
 * Pricing Engine - Singleton Pattern
 */
class PricingEngine {
  private static instance: PricingEngine;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PricingEngine {
    if (!PricingEngine.instance) {
      PricingEngine.instance = new PricingEngine();
    }
    return PricingEngine.instance;
  }

  /**
   * Calculate final price based on rules
   */
  async calculatePrice(params: PricingParams): Promise<PricingResult> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // For now, use a default price since we need to implement proper product price lookup
      const originalPrice = 290; // Default price in rubles

      // Get applicable rules
      const rules = await this.getPricingRules(params.productId);

      // Filter and sort rules by priority
      const applicableRules = this.filterApplicableRules(rules, params);
      const sortedRules = applicableRules.sort(
        (a, b) => b.priority - a.priority
      );

      // Apply rules
      let finalPrice = originalPrice;
      const appliedRules: AppliedRule[] = [];

      for (const rule of sortedRules) {
        const { newPrice, discount } = this.applyRule(finalPrice, rule);
        finalPrice = newPrice;

        if (discount > 0) {
          const name =
            typeof rule.name === "string"
              ? rule.name
              : rule.name.ru || rule.name.zh || rule.name.en || "";
          const description =
            typeof rule.description === "string"
              ? rule.description
              : rule.description?.ru ||
                rule.description?.zh ||
                rule.description?.en ||
                "";

          appliedRules.push({
            id: rule.id,
            name,
            description,
            discount,
          });
        }
      }

      const savedAmount = originalPrice - finalPrice;

      return {
        originalPrice,
        finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
        savedAmount: Math.round(savedAmount * 100) / 100,
        appliedRules,
      };
    } catch (error) {
      console.error("[PricingEngine] Error calculating price:", error);
      throw error;
    }
  }

  /**
   * Get pricing rules
   */
  async getPricingRules(productId?: string): Promise<PricingRule[]> {
    try {
      const db = await getDb();
      if (!db) {
        console.warn(
          "[PricingEngine] Database not available, using default rules"
        );
        return DEFAULT_PRICING_RULES;
      }

      let query;

      if (productId) {
        // Get rules associated with a specific product
        const productRuleLinks = await db
          .select()
          .from(productPricingRules)
          .where(eq(productPricingRules.productId, parseInt(productId)));

        if (productRuleLinks.length === 0) {
          return [];
        }

        const ruleIds = productRuleLinks.map(link => link.ruleId);
        query = db
          .select()
          .from(pricingRules)
          .where(inArray(pricingRules.id, ruleIds));
      } else {
        // Get all active rules
        query = db
          .select()
          .from(pricingRules)
          .where(eq(pricingRules.isActive, true))
          .orderBy(desc(pricingRules.priority));
      }

      const dbRules = await query;

      // Transform database rules to PricingRule format
      return dbRules.map(rule => ({
        id: rule.id,
        name: rule.name as any,
        description: rule.description as any,
        condition: rule.condition as PricingRuleCondition,
        action: rule.action as PricingRuleAction,
        priority: rule.priority,
        isActive: rule.isActive ?? true,
        orgId: rule.orgId,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }));
    } catch (error) {
      console.error("[PricingEngine] Error getting pricing rules:", error);
      return DEFAULT_PRICING_RULES;
    }
  }

  /**
   * Create pricing rule
   */
  async createPricingRule(data: Omit<PricingRule, "id">): Promise<PricingRule> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const ruleId = `rule_${nanoid(10)}`;
      const orgId = data.orgId || 1; // Default to org 1 if not specified

      await db.insert(pricingRules).values({
        id: ruleId,
        orgId,
        name: data.name as any,
        description: data.description as any,
        condition: data.condition as any,
        action: data.action as any,
        priority: data.priority,
        isActive: data.isActive ?? true,
      });

      return {
        id: ruleId,
        ...data,
      };
    } catch (error) {
      console.error("[PricingEngine] Error creating pricing rule:", error);
      throw new Error("Failed to create pricing rule");
    }
  }

  /**
   * Update pricing rule
   */
  async updatePricingRule(
    id: string,
    updates: Partial<PricingRule>
  ): Promise<PricingRule> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Get existing rule first
      const existingRules = await db
        .select()
        .from(pricingRules)
        .where(eq(pricingRules.id, id))
        .limit(1);

      if (existingRules.length === 0) {
        throw new Error("Pricing rule not found");
      }

      const existingRule = existingRules[0];

      // Build update object
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.condition !== undefined)
        updateData.condition = updates.condition;
      if (updates.action !== undefined) updateData.action = updates.action;
      if (updates.priority !== undefined)
        updateData.priority = updates.priority;
      if (updates.isActive !== undefined)
        updateData.isActive = updates.isActive;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(pricingRules)
          .set(updateData)
          .where(eq(pricingRules.id, id));
      }

      // Return updated rule
      return {
        id,
        name: (updates.name ?? existingRule.name) as PricingRule["name"],
        description: (updates.description ??
          existingRule.description) as PricingRule["description"],
        condition: (updates.condition ??
          existingRule.condition) as PricingRuleCondition,
        action: (updates.action ?? existingRule.action) as PricingRuleAction,
        priority: updates.priority ?? existingRule.priority,
        isActive: updates.isActive ?? existingRule.isActive ?? true,
        orgId: existingRule.orgId,
      };
    } catch (error) {
      console.error("[PricingEngine] Error updating pricing rule:", error);
      throw error;
    }
  }

  /**
   * Delete pricing rule (soft delete - set isActive to false)
   */
  async deletePricingRule(id: string): Promise<{ success: boolean }> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Soft delete - set isActive to false
      await db
        .update(pricingRules)
        .set({ isActive: false })
        .where(eq(pricingRules.id, id));

      return { success: true };
    } catch (error) {
      console.error("[PricingEngine] Error deleting pricing rule:", error);
      throw new Error("Failed to delete pricing rule");
    }
  }

  /**
   * Associate pricing rule with a product
   */
  async addRuleToProduct(productId: number, ruleId: string): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db.insert(productPricingRules).values({
        productId,
        ruleId,
      });
    } catch (error) {
      console.error("[PricingEngine] Error adding rule to product:", error);
      throw error;
    }
  }

  /**
   * Remove pricing rule from a product
   */
  async removeRuleFromProduct(
    productId: number,
    ruleId: string
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .delete(productPricingRules)
        .where(
          and(
            eq(productPricingRules.productId, productId),
            eq(productPricingRules.ruleId, ruleId)
          )
        );
    } catch (error) {
      console.error("[PricingEngine] Error removing rule from product:", error);
      throw error;
    }
  }

  /**
   * Get products affected by a pricing rule
   */
  async getProductsByRule(ruleId: string): Promise<number[]> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const links = await db
        .select()
        .from(productPricingRules)
        .where(eq(productPricingRules.ruleId, ruleId));

      return links.map(link => link.productId);
    } catch (error) {
      console.error("[PricingEngine] Error getting products by rule:", error);
      return [];
    }
  }

  /**
   * Filter applicable rules based on conditions
   */
  private filterApplicableRules(
    rules: PricingRule[],
    params: PricingParams
  ): PricingRule[] {
    const timestamp = params.timestamp
      ? new Date(params.timestamp)
      : new Date();
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();

    return rules.filter(rule => {
      if (!rule.isActive) return false;

      const { condition } = rule;

      // Check hour condition
      if (condition.hour && !condition.hour.includes(hour)) {
        return false;
      }

      // Check day of week condition
      if (condition.dayOfWeek && !condition.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }

      // Check store condition
      if (condition.storeId && condition.storeId !== params.storeId) {
        return false;
      }

      // Check quantity condition
      if (
        condition.minQuantity &&
        (!params.quantity || params.quantity < condition.minQuantity)
      ) {
        return false;
      }

      // Check user level condition
      // If rule requires a specific user level, skip it since we don't have user data in params
      if (condition.userLevel) {
        return false;
      }

      return true;
    });
  }

  /**
   * Apply a single rule to a price
   */
  private applyRule(
    currentPrice: number,
    rule: PricingRule
  ): { newPrice: number; discount: number } {
    const { action } = rule;
    let newPrice = currentPrice;
    let discount = 0;

    switch (action.type) {
      case "DISCOUNT_PERCENT":
        discount = currentPrice * (action.value / 100);
        newPrice = currentPrice - discount;
        break;

      case "DISCOUNT_FIXED":
        discount = action.value;
        newPrice = currentPrice - action.value;
        break;

      case "MARKUP_PERCENT":
        newPrice = currentPrice * (1 + action.value / 100);
        discount = -(newPrice - currentPrice); // Negative discount for markup
        break;

      case "SET_PRICE":
        discount = currentPrice - action.value;
        newPrice = action.value;
        break;
    }

    // Ensure price doesn't go below 0
    newPrice = Math.max(0, newPrice);

    return { newPrice, discount };
  }
}

/**
 * Export singleton instance
 */
export const pricingEngine = PricingEngine.getInstance();
