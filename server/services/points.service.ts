/**
 * Points Service
 * 
 * Business logic for points management.
 * All database writes delegated to PointsRepository.
 */

import { pointsRepository } from "../repositories/points.repository";

export interface AddPointsParams {
  memberId: number;
  points: number;
  reason: string;
  description?: string;
  orderId?: number;
  idempotencyKey?: string;
}

export interface DeductPointsParams {
  memberId: number;
  points: number;
  reason: string;
  description?: string;
  orderId?: number;
  idempotencyKey?: string;
}

export class PointsService {
  /**
   * Add points to member account
   */
  async addPoints(params: AddPointsParams) {
    return await pointsRepository.addPoints(params);
  }

  /**
   * Deduct points from member account
   */
  async deductPoints(params: DeductPointsParams) {
    return await pointsRepository.deductPoints(params);
  }

  /**
   * Get member points balance
   */
  async getBalance(memberId: number) {
    return await pointsRepository.getBalance(memberId);
  }

  /**
   * Get points history for a member
   */
  async getHistory(memberId: number, limit: number = 50) {
    return await pointsRepository.getHistory(memberId, limit);
  }

  /**
   * Calculate points earned from order
   * Special price items excluded from points calculation
   */
  calculateOrderPoints(items: Array<{ totalPrice: number; isSpecialPrice: boolean }>): number {
    const eligibleTotal = items
      .filter(item => !item.isSpecialPrice)
      .reduce((sum, item) => sum + item.totalPrice, 0);

    // 1 RUB = 1 point (configurable)
    const pointsRate = 1;
    return Math.floor(eligibleTotal * pointsRate);
  }
}

export const pointsService = new PointsService();
