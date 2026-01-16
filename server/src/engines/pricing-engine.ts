/**
 * 💰 定价引擎 - 规则驱动的动态定价
 */

import { getPrismaClient } from '../db/prisma';

const prisma = getPrismaClient();

const DEFAULT_PRICING_RULES = [
  {
    id: 'rule_001',
    name: '欢乐时光',
    description: '下午2-5点享8折',
    condition: { hour: [14, 15, 16, 17] },
    action: { type: 'DISCOUNT_PERCENT', value: 20 },
    priority: 5,
    isActive: true,
  },
  {
    id: 'rule_002',
    name: '会员折扣 - 金卡',
    description: '金卡会员享95折',
    condition: { userLevel: 'Gold' },
    action: { type: 'DISCOUNT_PERCENT', value: 5 },
    priority: 10,
    isActive: true,
  },
];

export interface PricingParams {
  productId: string;
  userId?: string;
  storeId?: string;
  quantity?: number;
  timestamp?: Date;
}

export class PricingEngine {
  private static instance: PricingEngine;

  static getInstance() {
    if (!this.instance) {
      this.instance = new PricingEngine();
    }
    return this.instance;
  }

  /**
   * 计算最终价格
   */
  async calculatePrice(params: PricingParams) {
    try {
      const product = await prisma.products.findUnique({
        where: { id: parseInt(params.productId) },
        select: { basePrice: true, name: true },
      });

      if (!product || !product.basePrice) {
        throw new Error('Product not found');
      }

      let finalPrice = parseFloat(product.basePrice.toString());
      const appliedRules: any[] = [];

      const rules = await this.getPricingRules(params.productId);

      for (const rule of rules.sort((a: any, b: any) => b.priority - a.priority)) {
        if (await this.evaluateCondition(rule.condition, params)) {
          const adjustment = this.applyAction(rule.action, finalPrice, params);
          finalPrice = adjustment.newPrice;

          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            adjustmentType: rule.action.type,
            adjustmentValue: adjustment.amount,
          });
        }
      }

      return {
        productId: params.productId,
        productName: product.name,
        originalPrice: parseFloat(product.basePrice.toString()),
        finalPrice: Math.max(0, Math.round(finalPrice * 100) / 100),
        savedAmount: parseFloat(product.basePrice.toString()) - finalPrice,
        appliedRules,
      };
    } catch (error) {
      console.error('[Pricing] Error calculating price:', error);
      throw error;
    }
  }

  /**
   * 获取定价规则
   */
  private async getPricingRules(productId: string) {
    try {
      const dbRules = await prisma.pricingRules.findMany({
        where: {
          OR: [{ productId }, { productId: null }],
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      }).catch(() => []);

      if (dbRules.length === 0) {
        return DEFAULT_PRICING_RULES;
      }

      return dbRules.map((r: any) => ({
        id: r.id,
        name: r.name,
        condition: r.condition as any,
        action: r.action as any,
        priority: r.priority,
      }));
    } catch (error) {
      console.error('[Pricing] Error fetching rules, using defaults:', error);
      return DEFAULT_PRICING_RULES;
    }
  }

  /**
   * 评估规则条件
   */
  private async evaluateCondition(condition: any, params: PricingParams): Promise<boolean> {
    if (condition.userLevel && params.userId) {
      try {
        const user = await prisma.users.findUnique({
          where: { id: params.userId },
          select: { level: true },
        });
        if (user?.level !== condition.userLevel) return false;
      } catch {
        return false;
      }
    }

    if (condition.hour) {
      const hour = (params.timestamp || new Date()).getHours();
      if (!condition.hour.includes(hour)) return false;
    }

    return true;
  }

  /**
   * 应用定价动作
   */
  private applyAction(action: any, currentPrice: number, params: PricingParams) {
    switch (action.type) {
      case 'DISCOUNT_PERCENT': {
        const discountAmount = currentPrice * (action.value / 100);
        return {
          newPrice: currentPrice - discountAmount,
          amount: -discountAmount,
        };
      }
      case 'DISCOUNT_FIXED': {
        return {
          newPrice: currentPrice - action.value,
          amount: -action.value,
        };
      }
      default:
        return { newPrice: currentPrice, amount: 0 };
    }
  }

  /**
   * 获取所有规则
   */
  async getAllRules(filters?: { productId?: string; isActive?: boolean }) {
    try {
      const where: any = {};

      if (filters?.productId) {
        where.productId = filters.productId;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const dbRules = await prisma.pricingRules.findMany({
        where,
        orderBy: { priority: 'desc' },
      }).catch(() => []);

      if (dbRules.length === 0) {
        return DEFAULT_PRICING_RULES;
      }

      return dbRules;
    } catch (error) {
      console.error('[Pricing] Error fetching all rules, using defaults:', error);
      return DEFAULT_PRICING_RULES;
    }
  }
}

export const pricingEngine = PricingEngine.getInstance();
