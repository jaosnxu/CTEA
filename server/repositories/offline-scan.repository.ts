/**
 * Offline Scan Repository
 * 
 * Handles all offline scan-related database operations with transaction support.
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { offlineScanLog, campaignCode } from "../../drizzle/schema";
import { BaseRepository } from "./base.repository";

export type ScanSource = 'POS' | 'CASHIER_APP' | 'ADMIN' | 'QR';
export type MatchMethod = 'AUTO' | 'MANUAL' | 'IIKO';

export interface LogScanParams {
  clientEventId: string; // UUID format required
  campaignCodeId: number;
  storeId: number;
  cashierId?: number;
  scanSource: ScanSource;
  orderId?: number;
  orderAmount?: number;
}

export interface MatchScanParams {
  scanId: number;
  orderId: number;
  orderAmount: number;
  matchMethod: MatchMethod;
}

export class OfflineScanRepository extends BaseRepository<any> {
  /**
   * Log a scan event with idempotency protection
   * If client_event_id already exists, increment dup_count instead of creating new record
   */
  async logScan(params: LogScanParams): Promise<{ 
    success: boolean; 
    scanId: number; 
    isDuplicate: boolean; 
    dupCount: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { clientEventId, campaignCodeId, storeId, cashierId, scanSource, orderId, orderAmount } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientEventId)) {
      throw new Error(`Invalid client_event_id format. Expected UUID, got: ${clientEventId}`);
    }

    return await db.transaction(async (tx) => {
      // Check if this event already exists
      const [existing] = await tx.select({
        id: offlineScanLog.id,
        dupCount: offlineScanLog.dupCount,
      })
        .from(offlineScanLog)
        .where(eq(offlineScanLog.clientEventId, clientEventId))
        .for('update');

      if (existing) {
        // Duplicate event - increment dup_count
        const newDupCount = existing.dupCount + 1;
        await tx.update(offlineScanLog)
          .set({
            dupCount: newDupCount,
            lastDupAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(offlineScanLog.id, existing.id));

        return {
          success: true,
          scanId: existing.id,
          isDuplicate: true,
          dupCount: newDupCount,
        };
      }

      // New event - create record
      const [newScan] = await tx.insert(offlineScanLog)
        .values({
          clientEventId,
          campaignCodeId,
          storeId,
          cashierId,
          scanSource,
          orderId,
          orderAmount: orderAmount?.toString(),
          scannedAt: new Date(),
          matched: orderId !== undefined,
          matchedAt: orderId !== undefined ? new Date() : undefined,
          matchMethod: orderId !== undefined ? 'AUTO' : undefined,
        })
        .returning({ id: offlineScanLog.id });

      // Update campaign code scan count
      await tx.update(campaignCode)
        .set({
          scanCount: sql`${campaignCode.scanCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(campaignCode.id, campaignCodeId));

      return {
        success: true,
        scanId: newScan.id,
        isDuplicate: false,
        dupCount: 0,
      };
    });
  }

  /**
   * Match a scan to an order (post-hoc matching)
   */
  async matchScanToOrder(params: MatchScanParams): Promise<{ success: boolean }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { scanId, orderId, orderAmount, matchMethod } = params;

    return await db.transaction(async (tx) => {
      // Get scan record
      const [scan] = await tx.select({
        id: offlineScanLog.id,
        campaignCodeId: offlineScanLog.campaignCodeId,
        matched: offlineScanLog.matched,
      })
        .from(offlineScanLog)
        .where(eq(offlineScanLog.id, scanId))
        .for('update');

      if (!scan) {
        throw new Error(`Scan ${scanId} not found`);
      }

      if (scan.matched) {
        throw new Error(`Scan ${scanId} is already matched`);
      }

      // Update scan with order info
      await tx.update(offlineScanLog)
        .set({
          orderId,
          orderAmount: orderAmount.toString(),
          matched: true,
          matchedAt: new Date(),
          matchMethod,
          updatedAt: new Date(),
        })
        .where(eq(offlineScanLog.id, scanId));

      // Update campaign code stats
      await tx.update(campaignCode)
        .set({
          orderCount: sql`${campaignCode.orderCount} + 1`,
          totalGmv: sql`${campaignCode.totalGmv} + ${orderAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(campaignCode.id, scan.campaignCodeId));

      return { success: true };
    });
  }

  /**
   * Get scan statistics for a campaign code
   */
  async getCodeStats(campaignCodeId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [stats] = await db.select({
      scanCount: campaignCode.scanCount,
      orderCount: campaignCode.orderCount,
      totalGmv: campaignCode.totalGmv,
    })
      .from(campaignCode)
      .where(eq(campaignCode.id, campaignCodeId));

    return stats;
  }

  /**
   * Get unmatched scans for manual matching
   */
  async getUnmatchedScans(storeId?: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let query = db.select()
      .from(offlineScanLog)
      .where(eq(offlineScanLog.matched, false))
      .orderBy(sql`${offlineScanLog.scannedAt} DESC`)
      .limit(limit);

    if (storeId) {
      query = db.select()
        .from(offlineScanLog)
        .where(and(
          eq(offlineScanLog.matched, false),
          eq(offlineScanLog.storeId, storeId)
        ))
        .orderBy(sql`${offlineScanLog.scannedAt} DESC`)
        .limit(limit);
    }

    return await query;
  }
}

export const offlineScanRepository = new OfflineScanRepository();
