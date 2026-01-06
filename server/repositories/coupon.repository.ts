/**
 * CouponRepository - 优惠券原子更新示例
 * 
 * 展示如何使用 BaseRepository 的条件更新能力防止并发问题
 */

import { BaseRepository } from './base.repository';
import { and, eq } from 'drizzle-orm';

// TODO: Import actual coupon schema when implemented
// import { couponInstance } from '../../drizzle/schema';

interface CouponInstance {
  id: number;
  status: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
  usedAt?: Date;
  usedOrderId?: number;
  updatedAt: Date;
}

export class CouponRepository extends BaseRepository<CouponInstance> {
  /**
   * 原子更新：标记优惠券为已使用
   * 
   * 使用 WHERE status='UNUSED' 条件确保只有未使用的券才能被标记
   * 如果返回空数组，说明券已被使用或不存在
   * 
   * @param couponId - 优惠券 ID
   * @param orderId - 订单 ID
   * @returns 更新后的优惠券记录
   * @throws Error 如果优惠券不可用或已被使用
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
    // TODO: Replace with actual couponInstance table
    const couponInstance: any = {
      id: { name: 'id' },
      status: { name: 'status' }
    };
    
    // 条件更新：只有 status='UNUSED' 时才更新
    const results = await this.updateWithTouchWhere(
      couponInstance as any,
      and(
        eq(couponInstance.id, couponId),
        eq(couponInstance.status, 'UNUSED')  // 关键：原子条件
      )!,  // Non-null assertion
      {
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: orderId
      } as Partial<CouponInstance>
    );
    
    // 如果返回空数组，说明条件不满足（券已被使用或不存在）
    if (results.length === 0) {
      throw new Error(`Coupon ${couponId} is not available or already used`);
    }
    
    return results[0];
  }
  
  /**
   * 批量冻结优惠券（同一时间戳）
   * 
   * @param couponIds - 优惠券 ID 列表
   * @returns 冻结后的优惠券列表
   */
  async batchFreeze(couponIds: number[]): Promise<CouponInstance[]> {
    // TODO: Replace with actual couponInstance table
    const couponInstance: any = {
      id: { name: 'id' },
      status: { name: 'status' }
    };
    
    const updates = couponIds.map(id => ({
      where: and(
        eq(couponInstance.id, id),
        eq(couponInstance.status, 'UNUSED')  // 只冻结未使用的券
      )!,  // Non-null assertion for type safety
      data: {
        status: 'FROZEN'
      } as Partial<CouponInstance>
    }));
    
    return await this.batchUpdateWithTouch(couponInstance as any, updates);
  }
}
