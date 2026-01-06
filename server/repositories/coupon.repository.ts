/**
 * CouponRepository - Atomic coupon operations with real schema
 * 
 * Demonstrates how to use BaseRepository's conditional update capability
 * to prevent concurrency issues in coupon usage.
 */

import { BaseRepository } from './base.repository';
import { and, eq } from 'drizzle-orm';
import { couponInstance } from '../../drizzle/schema';
import { getDb } from '../db';

interface CouponInstance {
  id: number;
  status: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
  usedAt?: Date;
  usedOrderId?: number;
  updatedAt: Date;
}

export class CouponRepository extends BaseRepository<CouponInstance> {
  /**
   * Atomic update: Mark coupon as used
   * 
   * Uses WHERE status='UNUSED' condition to ensure only unused coupons can be marked.
   * Returns empty array if coupon is already used or doesn't exist.
   * 
   * @param couponId - Coupon instance ID
   * @param orderId - Order ID
   * @returns Updated coupon record
   * @throws Error if coupon is not available or already used
   * 
   * @example
   * try {
   *   const coupon = await couponRepo.markAsUsedAtomic(123, 456);
   *   console.log('Coupon marked as used:', coupon);
   * } catch (error) {
   *   console.error('Coupon not available:', error.message);
   * }
   */
  async markAsUsedAtomic(
    couponId: number,
    orderId: number
  ): Promise<CouponInstance> {
    // Conditional update: only update if status='UNUSED'
    const results = await this.updateWithTouchWhere(
      couponInstance as any,
      and(
        eq(couponInstance.id, couponId),
        eq(couponInstance.status, 'UNUSED')  // Critical: atomic condition
      )!,
      {
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: orderId
      } as Partial<CouponInstance>
    );
    
    // Empty array means condition not satisfied (coupon already used or doesn't exist)
    if (results.length === 0) {
      throw new Error(`Coupon ${couponId} is not available or already used`);
    }
    
    return results[0];
  }
  
  /**
   * Batch freeze coupons (same timestamp)
   * 
   * @param couponIds - List of coupon IDs
   * @returns List of frozen coupons
   */
  async batchFreeze(couponIds: number[]): Promise<CouponInstance[]> {
    const updates = couponIds.map(id => ({
      where: and(
        eq(couponInstance.id, id),
        eq(couponInstance.status, 'UNUSED')  // Only freeze unused coupons
      )!,
      data: {
        status: 'FROZEN'
      } as Partial<CouponInstance>
    }));
    
    return await this.batchUpdateWithTouch(couponInstance as any, updates);
  }
  
  /**
   * Get coupon by ID
   * 
   * @param couponId - Coupon instance ID
   * @returns Coupon record or null
   */
  async getById(couponId: number): Promise<CouponInstance | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.select()
      .from(couponInstance)
      .where(eq(couponInstance.id, couponId))
      .limit(1);
    
    return results.length > 0 ? results[0] as CouponInstance : null;
  }
  
  /**
   * Get all unused coupons for a member
   * 
   * @param memberId - Member ID
   * @returns List of unused coupons
   */
  async getUnusedByMember(memberId: number): Promise<CouponInstance[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const results = await db.select()
      .from(couponInstance)
      .where(
        and(
          eq(couponInstance.memberId, memberId),
          eq(couponInstance.status, 'UNUSED')
        )
      );
    
    return results as CouponInstance[];
  }
}

export const couponRepository = new CouponRepository();
