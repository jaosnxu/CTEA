/**
 * CHU TEA - Membership System
 * 
 * Features:
 * - Points accumulation and redemption
 * - VIP tiers (Bronze, Silver, Gold, Platinum)
 * - Coupons and promotions
 * - Referral rewards
 */

export interface MembershipTier {
  id: string;
  name_zh: string;
  name_en: string;
  name_ru: string;
  minPoints: number;
  pointsMultiplier: number;  // e.g., 1.5x for Gold
  discount: number;  // percentage discount
  benefits: string[];
}

export interface UserMembership {
  userId: string;
  tier: string;
  points: number;
  totalSpent: number;
  referralCode: string;
  referredBy?: string;
  joinedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'POINTS_BONUS';
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'REFERRAL';
  orderId?: string;
  description: string;
  createdAt: string;
}

// ============================================================================
// Membership Tiers
// ============================================================================

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: 'bronze',
    name_zh: '青铜会员',
    name_en: 'Bronze Member',
    name_ru: 'Бронзовый',
    minPoints: 0,
    pointsMultiplier: 1.0,
    discount: 0,
    benefits: ['Earn 1 point per ₽10', 'Birthday gift'],
  },
  {
    id: 'silver',
    name_zh: '白银会员',
    name_en: 'Silver Member',
    name_ru: 'Серебряный',
    minPoints: 500,
    pointsMultiplier: 1.2,
    discount: 5,
    benefits: ['Earn 1.2x points', '5% discount', 'Free delivery'],
  },
  {
    id: 'gold',
    name_zh: '黄金会员',
    name_en: 'Gold Member',
    name_ru: 'Золотой',
    minPoints: 2000,
    pointsMultiplier: 1.5,
    discount: 10,
    benefits: ['Earn 1.5x points', '10% discount', 'Priority support'],
  },
  {
    id: 'platinum',
    name_zh: '铂金会员',
    name_en: 'Platinum Member',
    name_ru: 'Платиновый',
    minPoints: 5000,
    pointsMultiplier: 2.0,
    discount: 15,
    benefits: ['Earn 2x points', '15% discount', 'VIP events'],
  },
];

// ============================================================================
// Mock Data
// ============================================================================

export const USER_MEMBERSHIPS: UserMembership[] = [];
export const COUPONS: Coupon[] = [
  {
    id: 'WELCOME10',
    code: 'WELCOME10',
    type: 'DISCOUNT_PERCENT',
    value: 10,
    minOrderAmount: 0,
    maxUses: 1000,
    usedCount: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  },
];
export const POINTS_TRANSACTIONS: PointsTransaction[] = [];

// ============================================================================
// Functions
// ============================================================================

/**
 * Get user membership
 */
export function getUserMembership(userId: string): UserMembership {
  let membership = USER_MEMBERSHIPS.find((m) => m.userId === userId);

  if (!membership) {
    // Create new membership
    membership = {
      userId,
      tier: 'bronze',
      points: 0,
      totalSpent: 0,
      referralCode: `CHU${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      joinedAt: new Date().toISOString(),
    };
    USER_MEMBERSHIPS.push(membership);
  }

  return membership;
}

/**
 * Calculate tier based on points
 */
export function calculateTier(points: number): string {
  for (let i = MEMBERSHIP_TIERS.length - 1; i >= 0; i--) {
    if (points >= MEMBERSHIP_TIERS[i].minPoints) {
      return MEMBERSHIP_TIERS[i].id;
    }
  }
  return 'bronze';
}

/**
 * Add points to user
 */
export function addPoints(
  userId: string,
  amount: number,
  type: PointsTransaction['type'],
  description: string,
  orderId?: string
): PointsTransaction {
  const membership = getUserMembership(userId);
  const tier = MEMBERSHIP_TIERS.find((t) => t.id === membership.tier);
  const multiplier = tier?.pointsMultiplier || 1.0;

  const finalAmount = Math.floor(amount * multiplier);
  membership.points += finalAmount;
  membership.tier = calculateTier(membership.points);

  const transaction: PointsTransaction = {
    id: `PT${Date.now()}`,
    userId,
    amount: finalAmount,
    type,
    orderId,
    description,
    createdAt: new Date().toISOString(),
  };

  POINTS_TRANSACTIONS.push(transaction);
  console.log(`[Membership] User ${userId} earned ${finalAmount} points (${multiplier}x)`);

  return transaction;
}

/**
 * Redeem points
 */
export function redeemPoints(userId: string, amount: number, description: string): boolean {
  const membership = getUserMembership(userId);

  if (membership.points < amount) {
    console.log(`[Membership] User ${userId} has insufficient points`);
    return false;
  }

  membership.points -= amount;

  const transaction: PointsTransaction = {
    id: `PT${Date.now()}`,
    userId,
    amount: -amount,
    type: 'REDEEM',
    description,
    createdAt: new Date().toISOString(),
  };

  POINTS_TRANSACTIONS.push(transaction);
  console.log(`[Membership] User ${userId} redeemed ${amount} points`);

  return true;
}

/**
 * Validate coupon
 */
export function validateCoupon(code: string, orderAmount: number): Coupon | null {
  const coupon = COUPONS.find((c) => c.code === code && c.isActive);

  if (!coupon) {
    return null;
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return null;
  }

  if (new Date(coupon.expiresAt) < new Date()) {
    return null;
  }

  if (orderAmount < coupon.minOrderAmount) {
    return null;
  }

  return coupon;
}

/**
 * Apply coupon
 */
export function applyCoupon(code: string): boolean {
  const coupon = COUPONS.find((c) => c.code === code);

  if (!coupon) {
    return false;
  }

  coupon.usedCount++;
  console.log(`[Membership] Coupon ${code} used (${coupon.usedCount}/${coupon.maxUses})`);

  return true;
}

/**
 * Calculate discount
 */
export function calculateDiscount(
  userId: string,
  orderAmount: number,
  couponCode?: string
): { discount: number; finalAmount: number; breakdown: string[] } {
  const membership = getUserMembership(userId);
  const tier = MEMBERSHIP_TIERS.find((t) => t.id === membership.tier);
  const breakdown: string[] = [];

  let discount = 0;

  // Tier discount
  if (tier && tier.discount > 0) {
    const tierDiscount = (orderAmount * tier.discount) / 100;
    discount += tierDiscount;
    breakdown.push(`VIP ${tier.name_ru}: -₽${tierDiscount.toFixed(2)}`);
  }

  // Coupon discount
  if (couponCode) {
    const coupon = validateCoupon(couponCode, orderAmount);
    if (coupon) {
      if (coupon.type === 'DISCOUNT_PERCENT') {
        const couponDiscount = (orderAmount * coupon.value) / 100;
        discount += couponDiscount;
        breakdown.push(`Купон ${couponCode}: -₽${couponDiscount.toFixed(2)}`);
      } else if (coupon.type === 'DISCOUNT_FIXED') {
        discount += coupon.value;
        breakdown.push(`Купон ${couponCode}: -₽${coupon.value}`);
      }
    }
  }

  const finalAmount = Math.max(0, orderAmount - discount);

  return { discount, finalAmount, breakdown };
}


// ============================================================================
// Additional Functions for Testing
// ============================================================================

/**
 * Calculate points for a given amount and tier
 * @param amount - Order amount in RUB
 * @param tier - Membership tier (BRONZE, SILVER, GOLD, PLATINUM)
 * @returns Points earned
 */
export function calculatePoints(amount: number, tier: string): number {
  const basePoints = Math.floor(amount / 10); // 1 point per ₽10
  
  const multipliers: Record<string, number> = {
    'BRONZE': 1.0,
    'SILVER': 1.5,
    'GOLD': 2.0,
    'PLATINUM': 3.0,
  };
  
  const multiplier = multipliers[tier.toUpperCase()] || 1.0;
  return Math.floor(basePoints * multiplier);
}

/**
 * Apply membership discount to order amount
 * @param amount - Original order amount
 * @param tier - Membership tier
 * @returns Discounted amount
 */
export function applyMembershipDiscount(amount: number, tier: string): number {
  const discounts: Record<string, number> = {
    'BRONZE': 0,
    'SILVER': 5,
    'GOLD': 10,
    'PLATINUM': 15,
  };
  
  const discountPercent = discounts[tier.toUpperCase()] || 0;
  return Math.floor(amount * (100 - discountPercent) / 100);
}

/**
 * Get membership tier based on total points
 * @param points - Total accumulated points
 * @returns Tier name
 */
export function getMembershipTier(points: number): string {
  if (points >= 5000) return 'PLATINUM';
  if (points >= 1500) return 'GOLD';
  if (points >= 500) return 'SILVER';
  return 'BRONZE';
}
