/**
 * Points Repository
 * 
 * Handles all points-related database operations with transaction support.
 * Services layer should call these methods instead of direct db writes.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { 
  member, 
  memberPointsHistory, 
  idempotencyKey 
} from "../../drizzle/schema";
import { BaseRepository } from "./base.repository";

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

export class PointsRepository extends BaseRepository<any> {
  /**
   * Add points to member account (transaction-safe)
   */
  async addPoints(params: AddPointsParams): Promise<{
    success: boolean;
    newBalance: number;
    historyId: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { memberId, points, reason, description, orderId, idempotencyKey: idempKey } = params;

    return await db.transaction(async (tx) => {
      // Check idempotency if key provided
      if (idempKey) {
        const [existing] = await tx.select()
          .from(idempotencyKey)
          .where(eq(idempotencyKey.key, idempKey));
        
        if (existing) {
          throw new Error(`Idempotency key already used: ${idempKey}`);
        }
      }

      // Get current balance with FOR UPDATE lock
      const [currentMember] = await tx.select({
        id: member.id,
        availablePointsBalance: member.availablePointsBalance,
        totalPointsEarned: member.totalPointsEarned,
      })
        .from(member)
        .where(eq(member.id, memberId))
        .for('update');

      if (!currentMember) {
        throw new Error(`Member ${memberId} not found`);
      }

      const oldBalance = currentMember.availablePointsBalance;
      const newBalance = oldBalance + points;
      const newTotalEarned = currentMember.totalPointsEarned + points;

      // Update member balance
      await tx.update(member)
        .set({
          availablePointsBalance: newBalance,
          totalPointsEarned: newTotalEarned,
          updatedAt: new Date(),
        })
        .where(eq(member.id, memberId));

      // Insert history record
      const [history] = await tx.insert(memberPointsHistory)
        .values({
          memberId,
          delta: points,
          balanceAfter: newBalance,
          reason,
          description,
          orderId,
          idempotencyKey: idempKey,
        })
        .returning({ id: memberPointsHistory.id });

      // Insert idempotency key if provided
      if (idempKey) {
        await tx.insert(idempotencyKey)
          .values({
            key: idempKey,
            result: { type: 'POINTS_ADD', resourceId: history.id },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          });
      }

      return {
        success: true,
        newBalance,
        historyId: history.id,
      };
    });
  }

  /**
   * Deduct points from member account (transaction-safe)
   */
  async deductPoints(params: DeductPointsParams): Promise<{
    success: boolean;
    newBalance: number;
    historyId: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { memberId, points, reason, description, orderId, idempotencyKey: idempKey } = params;

    return await db.transaction(async (tx) => {
      // Check idempotency if key provided
      if (idempKey) {
        const [existing] = await tx.select()
          .from(idempotencyKey)
          .where(eq(idempotencyKey.key, idempKey));
        
        if (existing) {
          throw new Error(`Idempotency key already used: ${idempKey}`);
        }
      }

      // Get current balance with FOR UPDATE lock
      const [currentMember] = await tx.select({
        id: member.id,
        availablePointsBalance: member.availablePointsBalance,
      })
        .from(member)
        .where(eq(member.id, memberId))
        .for('update');

      if (!currentMember) {
        throw new Error(`Member ${memberId} not found`);
      }

      const oldBalance = currentMember.availablePointsBalance;
      
      if (oldBalance < points) {
        throw new Error(`Insufficient points. Available: ${oldBalance}, Required: ${points}`);
      }

      const newBalance = oldBalance - points;

      // Update member balance
      await tx.update(member)
        .set({
          availablePointsBalance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(member.id, memberId));

      // Insert history record (negative delta)
      const [history] = await tx.insert(memberPointsHistory)
        .values({
          memberId,
          delta: -points,
          balanceAfter: newBalance,
          reason,
          description,
          orderId,
          idempotencyKey: idempKey,
        })
        .returning({ id: memberPointsHistory.id });

      // Insert idempotency key if provided
      if (idempKey) {
        await tx.insert(idempotencyKey)
          .values({
            key: idempKey,
            result: { type: 'POINTS_DEDUCT', resourceId: history.id },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          });
      }

      return {
        success: true,
        newBalance,
        historyId: history.id,
      };
    });
  }

  /**
   * Get member points balance
   */
  async getBalance(memberId: number): Promise<{
    available: number;
    totalEarned: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.select({
      available: member.availablePointsBalance,
      totalEarned: member.totalPointsEarned,
    })
      .from(member)
      .where(eq(member.id, memberId));

    if (!result) {
      throw new Error(`Member ${memberId} not found`);
    }

    return {
      available: result.available,
      totalEarned: result.totalEarned,
    };
  }

  /**
   * Get points history for a member
   */
  async getHistory(memberId: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select()
      .from(memberPointsHistory)
      .where(eq(memberPointsHistory.memberId, memberId))
      .orderBy(desc(memberPointsHistory.createdAt))
      .limit(limit);
  }
}

export const pointsRepository = new PointsRepository();
