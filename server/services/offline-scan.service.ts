/**
 * Offline Scan Service
 * 
 * Business logic for offline campaign code scanning.
 * All database writes delegated to OfflineScanRepository.
 */

import { 
  offlineScanRepository, 
  type LogScanParams, 
  type MatchScanParams,
  type ScanSource,
  type MatchMethod,
} from "../repositories/offline-scan.repository";

export type { ScanSource, MatchMethod };

export class OfflineScanService {
  /**
   * Log a scan event with idempotency protection
   */
  async logScan(params: LogScanParams) {
    return await offlineScanRepository.logScan(params);
  }

  /**
   * Match a scan to an order (post-hoc matching)
   */
  async matchScanToOrder(params: MatchScanParams) {
    return await offlineScanRepository.matchScanToOrder(params);
  }

  /**
   * Get scan statistics for a campaign code
   */
  async getCodeStats(campaignCodeId: number) {
    return await offlineScanRepository.getCodeStats(campaignCodeId);
  }

  /**
   * Get unmatched scans for manual matching
   */
  async getUnmatchedScans(storeId?: number, limit: number = 50) {
    return await offlineScanRepository.getUnmatchedScans(storeId, limit);
  }
}

export const offlineScanService = new OfflineScanService();
