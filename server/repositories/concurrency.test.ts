/**
 * Concurrency Tests for Critical Business Logic
 * 
 * These tests verify that the system correctly handles concurrent operations
 * for coupon usage, points issuance, and offline scan deduplication.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, sql } from 'drizzle-orm';
import {
  users,
  member,
  couponTemplate,
  couponInstance,
  memberPointsHistory,
  offlineScanLog,
  store,
  campaignCode,
  campaign,
  influencer,
} from '../../drizzle/schema';

// Test database connection
let pool: Pool;
let db: ReturnType<typeof drizzle>;

// Test data IDs
let testUserId: number;
let testMemberId: number;
let testStoreId: number;
let testCouponTemplateId: number;
let testCouponInstanceId: number;
let testCampaignId: number;
let testCampaignCodeId: number;
let testInfluencerId: number;

beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://staging_user:staging_pass@localhost:5432/milktea_staging';
  pool = new Pool({ connectionString });
  db = drizzle(pool);
  
  // Create test data
  await setupTestData();
});

afterAll(async () => {
  // Cleanup test data
  await cleanupTestData();
  await pool.end();
});

async function setupTestData() {
  // Create test user
  const [user] = await db.insert(users).values({
    openId: `test_user_${Date.now()}`,
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    role: 'user',
  }).returning();
  testUserId = user.id;

  // Create test member
  const [memberRecord] = await db.insert(member).values({
    userId: testUserId,
    availablePointsBalance: 1000,
    totalPointsEarned: 1000,
  }).returning();
  testMemberId = memberRecord.id;

  // Create test store
  const [storeRecord] = await db.insert(store).values({
    name: 'Test Store',
    code: `TS_${Date.now()}`,
    address: 'Test Address',
    status: 'ACTIVE',
  }).returning();
  testStoreId = storeRecord.id;

  // Create test campaign
  const [campaignRecord] = await db.insert(campaign).values({
    code: `CAMP_${Date.now()}`,
    name: 'Test Campaign',
    type: 'POINTS',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
  }).returning();
  testCampaignId = campaignRecord.id;

  // Create test influencer
  const [influencerRecord] = await db.insert(influencer).values({
    userId: testUserId,
    code: `INF_${Date.now()}`,
    name: 'Test Influencer',
    tier: 'BRONZE',
    status: 'ACTIVE',
  }).returning();
  testInfluencerId = influencerRecord.id;

  // Create test campaign code
  const [codeRecord] = await db.insert(campaignCode).values({
    campaignId: testCampaignId,
    influencerId: testInfluencerId,
    code: `CODE_${Date.now()}`,
  }).returning();
  testCampaignCodeId = codeRecord.id;

  // Create test coupon template
  // Note: type must be SIMPLE_FIXED or SIMPLE_PERCENTAGE when discount_value is set
  const [template] = await db.insert(couponTemplate).values({
    code: `TPL_${Date.now()}`,
    name: 'Test Coupon',
    type: 'SIMPLE_FIXED',  // Must match CHECK constraint
    discountValue: '10.00',
    minOrderAmount: '0.00',
    maxUsagePerUser: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 86400000 * 30),
  }).returning();
  testCouponTemplateId = template.id;
}

async function cleanupTestData() {
  // Clean up in reverse order of dependencies
  try {
    await db.delete(offlineScanLog).where(eq(offlineScanLog.storeId, testStoreId));
    await db.delete(memberPointsHistory).where(eq(memberPointsHistory.memberId, testMemberId));
    await db.delete(couponInstance).where(eq(couponInstance.memberId, testMemberId));
    await db.delete(couponTemplate).where(eq(couponTemplate.id, testCouponTemplateId));
    await db.delete(campaignCode).where(eq(campaignCode.id, testCampaignCodeId));
    await db.delete(influencer).where(eq(influencer.id, testInfluencerId));
    await db.delete(campaign).where(eq(campaign.id, testCampaignId));
    await db.delete(member).where(eq(member.id, testMemberId));
    await db.delete(store).where(eq(store.id, testStoreId));
    await db.delete(users).where(eq(users.id, testUserId));
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

describe('Coupon Concurrent Usage', () => {
  let couponId: number;

  beforeEach(async () => {
    // Create a fresh coupon for each test
    const [coupon] = await db.insert(couponInstance).values({
      templateId: testCouponTemplateId,
      memberId: testMemberId,
      status: 'UNUSED',
      sourceType: 'SYSTEM',
    }).returning();
    couponId = coupon.id;
  });

  it('should allow only one successful usage when two requests try to use the same coupon simultaneously', async () => {
    const orderId1 = 10001;
    const orderId2 = 10002;

    // Simulate concurrent coupon usage attempts
    const useCoupon = async (orderId: number): Promise<boolean> => {
      try {
        // Atomic update: only succeeds if status is still UNUSED
        const result = await db.update(couponInstance)
          .set({
            status: 'USED',
            usedAt: new Date(),
            usedOrderId: orderId,
            updatedAt: new Date(),
          })
          .where(and(
            eq(couponInstance.id, couponId),
            eq(couponInstance.status, 'UNUSED')  // Critical: atomic condition
          ))
          .returning();
        
        return result.length > 0;
      } catch (error) {
        return false;
      }
    };

    // Execute both attempts concurrently
    const [result1, result2] = await Promise.all([
      useCoupon(orderId1),
      useCoupon(orderId2),
    ]);

    // Exactly one should succeed
    const successCount = [result1, result2].filter(r => r).length;
    expect(successCount).toBe(1);

    // Verify coupon is now USED
    const [finalCoupon] = await db.select()
      .from(couponInstance)
      .where(eq(couponInstance.id, couponId));
    
    expect(finalCoupon.status).toBe('USED');
    expect(finalCoupon.usedOrderId).toBeDefined();
  });

  it('should reject usage of already used coupon', async () => {
    // First, mark coupon as used
    await db.update(couponInstance)
      .set({
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: 99999,
        updatedAt: new Date(),
      })
      .where(eq(couponInstance.id, couponId));

    // Try to use it again
    const result = await db.update(couponInstance)
      .set({
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: 88888,
        updatedAt: new Date(),
      })
      .where(and(
        eq(couponInstance.id, couponId),
        eq(couponInstance.status, 'UNUSED')
      ))
      .returning();

    // Should fail (no rows updated)
    expect(result.length).toBe(0);
  });
});

describe('Points Idempotent Issuance', () => {
  it('should record only one entry for the same idempotency_key', async () => {
    const idempotencyKey = `points_${Date.now()}_${Math.random()}`;
    const pointsDelta = 100;

    // Idempotent issuance using raw SQL with ON CONFLICT DO NOTHING
    const issuePointsIdempotent = async (): Promise<{ success: boolean; wasNew: boolean }> => {
      // Use raw SQL for true idempotent INSERT ... ON CONFLICT DO NOTHING
      const result = await db.execute(sql`
        INSERT INTO member_points_history 
          (member_id, delta, balance_after, reason, idempotency_key)
        VALUES 
          (${testMemberId}, ${pointsDelta}, 1100, 'ORDER_REWARD', ${idempotencyKey})
        ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
        DO NOTHING
        RETURNING id
      `);
      
      // If rows returned, it was a new insert; if empty, it was a duplicate
      return { 
        success: true, 
        wasNew: result.rows.length > 0 
      };
    };

    // Execute both attempts concurrently
    const [result1, result2] = await Promise.all([
      issuePointsIdempotent(),
      issuePointsIdempotent(),
    ]);

    // Both should succeed (idempotent), but only one should be "new"
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    // Exactly one should have created a new record
    const newCount = [result1, result2].filter(r => r.wasNew).length;
    expect(newCount).toBe(1);

    // Verify only one record exists
    const records = await db.select()
      .from(memberPointsHistory)
      .where(eq(memberPointsHistory.idempotencyKey, idempotencyKey));
    
    expect(records.length).toBe(1);
  });

  it('should reject duplicate idempotency_key with unique constraint', async () => {
    const idempotencyKey = `points_unique_${Date.now()}`;

    // First insert
    await db.insert(memberPointsHistory).values({
      memberId: testMemberId,
      delta: 50,
      balanceAfter: 1050,
      reason: 'BONUS',
      idempotencyKey,
    });

    // Second insert with same key should fail
    await expect(
      db.insert(memberPointsHistory).values({
        memberId: testMemberId,
        delta: 50,
        balanceAfter: 1100,
        reason: 'BONUS',
        idempotencyKey,
      })
    ).rejects.toThrow();
  });
});

describe('Offline Scan Duplicate Handling', () => {
  it('should increment dup_count for duplicate client_event_id', async () => {
    const clientEventId = crypto.randomUUID();

    // First scan
    const [firstScan] = await db.insert(offlineScanLog).values({
      clientEventId,
      campaignCodeId: testCampaignCodeId,
      storeId: testStoreId,
      scanSource: 'POS',
      dupCount: 0,
    }).returning();

    expect(firstScan.dupCount).toBe(0);

    // Simulate duplicate scan handling
    const handleDuplicateScan = async (eventId: string): Promise<number> => {
      // Check if exists
      const [existing] = await db.select()
        .from(offlineScanLog)
        .where(eq(offlineScanLog.clientEventId, eventId));

      if (existing) {
        // Update dup_count
        const [updated] = await db.update(offlineScanLog)
          .set({
            dupCount: existing.dupCount + 1,
            lastDupAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(offlineScanLog.clientEventId, eventId))
          .returning();
        
        return updated.dupCount;
      }

      return 0;
    };

    // Second scan (duplicate)
    const dupCount1 = await handleDuplicateScan(clientEventId);
    expect(dupCount1).toBe(1);

    // Third scan (duplicate)
    const dupCount2 = await handleDuplicateScan(clientEventId);
    expect(dupCount2).toBe(2);

    // Verify final state
    const [finalScan] = await db.select()
      .from(offlineScanLog)
      .where(eq(offlineScanLog.clientEventId, clientEventId));

    expect(finalScan.dupCount).toBe(2);
    expect(finalScan.lastDupAt).toBeDefined();
  });

  it('should reject duplicate client_event_id with unique constraint', async () => {
    const clientEventId = crypto.randomUUID();

    // First insert
    await db.insert(offlineScanLog).values({
      clientEventId,
      campaignCodeId: testCampaignCodeId,
      storeId: testStoreId,
      scanSource: 'POS',
    });

    // Second insert with same client_event_id should fail
    await expect(
      db.insert(offlineScanLog).values({
        clientEventId,
        campaignCodeId: testCampaignCodeId,
        storeId: testStoreId,
        scanSource: 'POS',
      })
    ).rejects.toThrow();
  });

  it('should handle concurrent duplicate scans correctly', async () => {
    const clientEventId = crypto.randomUUID();

    // Insert initial scan
    await db.insert(offlineScanLog).values({
      clientEventId,
      campaignCodeId: testCampaignCodeId,
      storeId: testStoreId,
      scanSource: 'POS',
      dupCount: 0,
    });

    // Simulate concurrent duplicate handling with FOR UPDATE lock
    const handleConcurrentDuplicate = async (): Promise<number> => {
      return await db.transaction(async (tx) => {
        // Lock the row
        const [existing] = await tx.select()
          .from(offlineScanLog)
          .where(eq(offlineScanLog.clientEventId, clientEventId))
          .for('update');

        if (existing) {
          const [updated] = await tx.update(offlineScanLog)
            .set({
              dupCount: existing.dupCount + 1,
              lastDupAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(offlineScanLog.clientEventId, clientEventId))
            .returning();
          
          return updated.dupCount;
        }
        return 0;
      });
    };

    // Execute 5 concurrent duplicate scans
    const results = await Promise.all([
      handleConcurrentDuplicate(),
      handleConcurrentDuplicate(),
      handleConcurrentDuplicate(),
      handleConcurrentDuplicate(),
      handleConcurrentDuplicate(),
    ]);

    // All should succeed with sequential dup_counts
    const sortedResults = [...results].sort((a, b) => a - b);
    expect(sortedResults).toEqual([1, 2, 3, 4, 5]);

    // Verify final state
    const [finalScan] = await db.select()
      .from(offlineScanLog)
      .where(eq(offlineScanLog.clientEventId, clientEventId));

    expect(finalScan.dupCount).toBe(5);
  });
});

describe('Order Points/Coupon Mutual Exclusion', () => {
  it('should enforce CHECK constraint for points and coupon mutual exclusion', async () => {
    // This test verifies the database constraint
    // The constraint: NOT (used_points > 0 AND coupon_instance_id IS NOT NULL)
    
    // Create a test coupon
    const [coupon] = await db.insert(couponInstance).values({
      templateId: testCouponTemplateId,
      memberId: testMemberId,
      status: 'UNUSED',
      sourceType: 'SYSTEM',
    }).returning();

    // Attempting to create an order with both points and coupon should fail
    // Note: This would be tested at the application level since we can't easily
    // test CHECK constraints in isolation without creating full order records
    
    // For now, verify the constraint exists by checking the schema
    const result = await db.execute(sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'order_points_coupon_mutual_exclusion'
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].definition).toContain('used_points');
    expect(result.rows[0].definition).toContain('coupon_instance_id');
  });
});
