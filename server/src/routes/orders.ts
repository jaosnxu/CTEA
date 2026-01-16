/**
 * CTEA Orders Router - Local-First Write with Async Cloud Sync
 *
 * Architecture:
 * 1. All orders are first written to local SQLite (resilient write)
 * 2. Background process syncs to cloud PostgreSQL asynchronously
 * 3. If cloud is unavailable, orders remain in local DB until sync succeeds
 */

import { Router, Request, Response } from "express";
import {
  createLocalOrder,
  getUnsyncedOrders,
  markOrderSynced,
  getLocalOrdersTotal,
  getLocalOrdersSummary,
  getPendingSyncItems,
  markSyncItemProcessed,
  markSyncItemFailed,
  isSqliteAvailable,
  LocalOrder,
} from "../db/sqlite";
import { getPrismaClient } from "../db/prisma";
import { requireAuth } from "../middleware/auth-middleware";

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// ============================================================================
// Order Creation - Local First Write
// ============================================================================

/**
 * POST /api/orders
 * Create a new order with local-first write strategy
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { storeId, userId, items, totalAmount } = req.body;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Step 1: Write to local SQLite first (resilient write)
    const localOrderId = createLocalOrder({
      order_number: orderNumber,
      store_id: storeId,
      user_id: userId,
      status: "pending",
      total_amount: totalAmount || 0,
      synced_to_cloud: 0,
      created_by: userId,
    });

    console.log(
      `[Orders] Local order created: ${localOrderId} (${orderNumber})`
    );

    // Step 2: Attempt async cloud sync (non-blocking)
    syncOrderToCloud(localOrderId).catch(err => {
      console.warn(
        `[Orders] Cloud sync deferred for order ${localOrderId}:`,
        err.message
      );
    });

    res.status(201).json({
      success: true,
      data: {
        localOrderId,
        orderNumber,
        status: "pending",
        syncStatus: "queued",
      },
      message: "Order created successfully (local-first)",
    });
  } catch (error) {
    console.error("[Orders] Failed to create order:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "ORDER_CREATE_FAILED",
        message:
          error instanceof Error ? error.message : "Failed to create order",
      },
    });
  }
});

/**
 * GET /api/orders/local
 * Get all local orders (for debugging/admin)
 */
router.get("/local", async (req: Request, res: Response) => {
  try {
    const unsyncedOrders = getUnsyncedOrders();
    const summary = getLocalOrdersSummary();
    const totals = getLocalOrdersTotal();

    res.json({
      success: true,
      data: {
        orders: unsyncedOrders,
        summary,
        totals,
        sqliteAvailable: isSqliteAvailable(),
      },
    });
  } catch (error) {
    console.error("[Orders] Failed to get local orders:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "LOCAL_ORDERS_FETCH_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch local orders",
      },
    });
  }
});

/**
 * GET /api/orders/sync-status
 * Get sync queue status
 */
router.get("/sync-status", async (req: Request, res: Response) => {
  try {
    const pendingItems = getPendingSyncItems(50);
    const unsyncedOrders = getUnsyncedOrders();

    res.json({
      success: true,
      data: {
        pendingSync: pendingItems.length,
        unsyncedOrders: unsyncedOrders.length,
        items: pendingItems,
      },
    });
  } catch (error) {
    console.error("[Orders] Failed to get sync status:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SYNC_STATUS_FAILED",
        message:
          error instanceof Error ? error.message : "Failed to get sync status",
      },
    });
  }
});

/**
 * POST /api/orders/sync-now
 * Manually trigger sync of pending orders to cloud
 */
router.post("/sync-now", async (req: Request, res: Response) => {
  try {
    const results = await syncAllPendingOrders();

    res.json({
      success: true,
      data: results,
      message: `Sync completed: ${results.synced} synced, ${results.failed} failed`,
    });
  } catch (error) {
    console.error("[Orders] Manual sync failed:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "MANUAL_SYNC_FAILED",
        message: error instanceof Error ? error.message : "Manual sync failed",
      },
    });
  }
});

// ============================================================================
// Cloud Sync Functions
// ============================================================================

/**
 * Sync a single local order to cloud PostgreSQL
 */
async function syncOrderToCloud(localOrderId: number): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const unsyncedOrders = getUnsyncedOrders();
    const localOrder = unsyncedOrders.find(o => o.id === localOrderId);

    if (!localOrder) {
      console.warn(
        `[Sync] Local order ${localOrderId} not found or already synced`
      );
      return false;
    }

    // Create order in cloud PostgreSQL
    const cloudOrder = await prisma.orders.create({
      data: {
        orderNumber: localOrder.order_number,
        storeId: localOrder.store_id || undefined,
        userId: localOrder.user_id || undefined,
        status: localOrder.status,
        totalAmount: localOrder.total_amount,
        createdBy: localOrder.created_by || undefined,
      },
    });

    // Mark local order as synced
    markOrderSynced(localOrderId, Number(cloudOrder.id));
    console.log(
      `[Sync] Order ${localOrderId} synced to cloud as ${cloudOrder.id}`
    );

    return true;
  } catch (error) {
    console.error(`[Sync] Failed to sync order ${localOrderId}:`, error);
    return false;
  }
}

/**
 * Sync all pending orders to cloud
 */
async function syncAllPendingOrders(): Promise<{
  synced: number;
  failed: number;
  total: number;
}> {
  const unsyncedOrders = getUnsyncedOrders();
  let synced = 0;
  let failed = 0;

  for (const order of unsyncedOrders) {
    if (order.id) {
      const success = await syncOrderToCloud(order.id);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }
  }

  return { synced, failed, total: unsyncedOrders.length };
}

/**
 * Process sync queue items
 */
async function processSyncQueue(): Promise<void> {
  const pendingItems = getPendingSyncItems(10);

  for (const item of pendingItems) {
    try {
      if (item.table_name === "local_orders") {
        const success = await syncOrderToCloud(item.record_id);
        if (success) {
          markSyncItemProcessed(item.id);
        } else {
          markSyncItemFailed(item.id, "Sync failed");
        }
      }
    } catch (error) {
      markSyncItemFailed(
        item.id,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}

// Start background sync process (every 30 seconds)
let syncInterval: NodeJS.Timeout | null = null;

export function startBackgroundSync(): void {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    try {
      await processSyncQueue();
      const result = await syncAllPendingOrders();
      if (result.synced > 0 || result.failed > 0) {
        console.log(
          `[BackgroundSync] Processed: ${result.synced} synced, ${result.failed} failed`
        );
      }
    } catch (error) {
      console.error("[BackgroundSync] Error:", error);
    }
  }, 30000);

  console.log("[BackgroundSync] Started (interval: 30s)");
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[BackgroundSync] Stopped");
  }
}

export default router;
