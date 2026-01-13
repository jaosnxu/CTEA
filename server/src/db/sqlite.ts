/**
 * CTEA Local SQLite Database Driver
 *
 * Purpose: Provides local-first data persistence using better-sqlite3
 * - Creates and manages prisma/local.db
 * - Enables resilient write operations when cloud DB is unavailable
 * - Supports async sync to cloud PostgreSQL
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database file path
const DB_PATH = path.resolve(process.cwd(), "prisma", "local.db");

// Singleton instance
let dbInstance: Database.Database | null = null;

/**
 * Initialize SQLite database with required tables
 */
function initializeTables(db: Database.Database): void {
  // Create local_orders table (mirrors cloud Orders table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT,
      store_id TEXT,
      user_id TEXT,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      synced_to_cloud INTEGER DEFAULT 0,
      cloud_order_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      updated_by TEXT
    )
  `);

  // Create local_order_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_order_id INTEGER,
      product_id TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (local_order_id) REFERENCES local_orders(id)
    )
  `);

  // Create sync_queue table for async cloud sync
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_local_orders_synced ON local_orders(synced_to_cloud);
    CREATE INDEX IF NOT EXISTS idx_local_orders_status ON local_orders(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  console.log("[SQLite] Tables initialized successfully");
}

/**
 * Get or create SQLite database instance
 */
export function getSqliteDb(): Database.Database {
  if (!dbInstance) {
    // Ensure prisma directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      dbInstance = new Database(DB_PATH, {
        verbose:
          process.env.NODE_ENV === "development" ? console.log : undefined,
      });

      // Enable WAL mode for better concurrent access
      dbInstance.pragma("journal_mode = WAL");
      dbInstance.pragma("synchronous = NORMAL");
      dbInstance.pragma("foreign_keys = ON");

      // Initialize tables
      initializeTables(dbInstance);

      console.log(`[SQLite] Database loaded successfully: ${DB_PATH}`);
    } catch (error) {
      console.error("[SQLite] Failed to initialize database:", error);
      throw error;
    }
  }

  return dbInstance;
}

/**
 * Close SQLite database connection
 */
export function closeSqliteDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log("[SQLite] Database connection closed");
  }
}

/**
 * Check if SQLite database is available
 */
export function isSqliteAvailable(): boolean {
  try {
    const db = getSqliteDb();
    const result = db.prepare("SELECT 1").get();
    return result !== undefined;
  } catch {
    return false;
  }
}

// ============================================================================
// Local Order Operations
// ============================================================================

export interface LocalOrder {
  id?: number;
  order_number: string;
  store_id?: string;
  user_id?: string;
  status: string;
  total_amount: number;
  synced_to_cloud: number;
  cloud_order_id?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface LocalOrderItem {
  id?: number;
  local_order_id: number;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new local order
 */
export function createLocalOrder(order: Omit<LocalOrder, "id">): number {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO local_orders (order_number, store_id, user_id, status, total_amount, synced_to_cloud, created_by)
    VALUES (@order_number, @store_id, @user_id, @status, @total_amount, @synced_to_cloud, @created_by)
  `);

  const result = stmt.run({
    order_number: order.order_number,
    store_id: order.store_id || null,
    user_id: order.user_id || null,
    status: order.status || "pending",
    total_amount: order.total_amount || 0,
    synced_to_cloud: 0,
    created_by: order.created_by || null,
  });

  // Add to sync queue
  addToSyncQueue("local_orders", Number(result.lastInsertRowid), "INSERT");

  return Number(result.lastInsertRowid);
}

/**
 * Get all unsynced local orders
 */
export function getUnsyncedOrders(): LocalOrder[] {
  const db = getSqliteDb();
  const stmt = db.prepare(
    "SELECT * FROM local_orders WHERE synced_to_cloud = 0"
  );
  return stmt.all() as LocalOrder[];
}

/**
 * Mark order as synced to cloud
 */
export function markOrderSynced(
  localOrderId: number,
  cloudOrderId: number
): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    UPDATE local_orders 
    SET synced_to_cloud = 1, cloud_order_id = @cloudOrderId, updated_at = datetime('now')
    WHERE id = @localOrderId
  `);
  stmt.run({ localOrderId, cloudOrderId });
}

/**
 * Get total amount from local orders (for dashboard)
 */
export function getLocalOrdersTotal(): { total: number; count: number } {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
    FROM local_orders 
    WHERE status NOT IN ('cancelled', 'refunded')
  `);
  const result = stmt.get() as { total: number; count: number };
  return result;
}

/**
 * Get local orders summary by status
 */
export function getLocalOrdersSummary(): Record<
  string,
  { total: number; count: number }
> {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    SELECT status, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
    FROM local_orders 
    GROUP BY status
  `);
  const rows = stmt.all() as Array<{
    status: string;
    total: number;
    count: number;
  }>;

  const summary: Record<string, { total: number; count: number }> = {};
  for (const row of rows) {
    summary[row.status] = { total: row.total, count: row.count };
  }
  return summary;
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: number;
  operation: string;
  payload?: string;
  retry_count: number;
  last_error?: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

/**
 * Add item to sync queue
 */
export function addToSyncQueue(
  tableName: string,
  recordId: number,
  operation: string,
  payload?: object
): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO sync_queue (table_name, record_id, operation, payload)
    VALUES (@tableName, @recordId, @operation, @payload)
  `);
  stmt.run({
    tableName,
    recordId,
    operation,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

/**
 * Get pending sync items
 */
export function getPendingSyncItems(limit: number = 100): SyncQueueItem[] {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    SELECT * FROM sync_queue 
    WHERE status = 'pending' AND retry_count < 5
    ORDER BY created_at ASC
    LIMIT @limit
  `);
  return stmt.all({ limit }) as SyncQueueItem[];
}

/**
 * Mark sync item as processed
 */
export function markSyncItemProcessed(id: number): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    UPDATE sync_queue 
    SET status = 'completed', processed_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ id });
}

/**
 * Mark sync item as failed
 */
export function markSyncItemFailed(id: number, error: string): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    UPDATE sync_queue 
    SET retry_count = retry_count + 1, last_error = @error, status = CASE WHEN retry_count >= 4 THEN 'failed' ELSE 'pending' END
    WHERE id = @id
  `);
  stmt.run({ id, error });
}

// Export default instance getter
export default {
  getSqliteDb,
  closeSqliteDb,
  isSqliteAvailable,
  createLocalOrder,
  getUnsyncedOrders,
  markOrderSynced,
  getLocalOrdersTotal,
  getLocalOrdersSummary,
  addToSyncQueue,
  getPendingSyncItems,
  markSyncItemProcessed,
  markSyncItemFailed,
};
