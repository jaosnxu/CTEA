# Migration Guide: PostgreSQL Deployment & Data Strategy

**Version**: 1.0  
**Date**: 2026-01-06  
**Status**: Production Ready

---

## Overview

This document outlines the data migration strategy, timezone handling, and constraint deployment approach for the CHU TEA platform.

---

## 1. Database Migration Strategy (MySQL → PostgreSQL)

### Current Status

**This is a greenfield PostgreSQL deployment.** No MySQL data migration is required.

### If Future Migration is Needed

If you need to migrate data from an existing MySQL database in the future, follow this template:

#### Step 1: Export MySQL Data

```bash
# Export each table as CSV
mysqldump --host=<mysql_host> \
  --user=<mysql_user> \
  --password=<mysql_password> \
  --tab=/tmp/export \
  --fields-terminated-by=',' \
  --fields-enclosed-by='"' \
  --lines-terminated-by='\n' \
  <database_name>
```

#### Step 2: Transform Data

Create a transformation script (`scripts/transform-mysql-to-pg.ts`):

```typescript
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

// Example: Convert MySQL DATETIME to PostgreSQL TIMESTAMPTZ
function transformTimestamp(mysqlDatetime: string): string {
  // MySQL stores local time without timezone
  // Assume all MySQL timestamps are in Moscow timezone (UTC+3)
  const date = new Date(mysqlDatetime + ' UTC+3');
  return date.toISOString(); // Convert to UTC
}

// Example: Convert MySQL DECIMAL to PostgreSQL NUMERIC
function transformDecimal(value: string): string {
  return parseFloat(value).toFixed(2);
}

// Read CSV, transform, write back
const input = fs.readFileSync('/tmp/export/orders.csv', 'utf-8');
const records = csv.parse(input, { columns: true });

const transformed = records.map(record => ({
  ...record,
  created_at: transformTimestamp(record.created_at),
  updated_at: transformTimestamp(record.updated_at),
  total_amount: transformDecimal(record.total_amount),
}));

fs.writeFileSync('/tmp/export/orders_transformed.csv', 
  csv.stringify(transformed, { header: true }));
```

#### Step 3: Import to PostgreSQL

```bash
# Import transformed CSV
psql $DATABASE_URL -c "\COPY \"order\" FROM '/tmp/export/orders_transformed.csv' WITH CSV HEADER"
```

#### Step 4: Verify Data Integrity

```sql
-- Check row counts
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL
SELECT 'order', COUNT(*) FROM "order"
UNION ALL
SELECT 'member', COUNT(*) FROM member;

-- Check timestamp ranges
SELECT 
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM "order";

-- Check for NULL violations
SELECT COUNT(*) FROM "order" WHERE total_amount IS NULL;
```

---

## 2. Timestamptz Conversion Approach

### Storage Strategy

**All timestamps are stored as UTC in PostgreSQL using `TIMESTAMPTZ` type.**

```sql
-- Schema definition
CREATE TABLE "order" (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### API Layer

**All API responses return ISO 8601 strings in UTC:**

```typescript
// server/routers.ts
export const appRouter = router({
  orders: router({
    list: publicProcedure.query(async () => {
      const orders = await orderRepository.getAll();
      return orders.map(order => ({
        ...order,
        createdAt: order.createdAt.toISOString(), // "2026-01-06T12:00:00.000Z"
        updatedAt: order.updatedAt.toISOString(),
      }));
    }),
  }),
});
```

### Frontend Conversion

**Frontend converts UTC to user's local timezone:**

```typescript
// client/src/utils/time.ts
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

/**
 * Convert UTC timestamp to store's local timezone
 * 
 * @param utcTimestamp - ISO 8601 string from API
 * @param storeTimezone - Store timezone (e.g., 'Europe/Moscow')
 * @returns Formatted local time
 */
export function formatStoreTime(
  utcTimestamp: string,
  storeTimezone: string = 'Europe/Moscow'
): string {
  const date = new Date(utcTimestamp);
  const zonedDate = utcToZonedTime(date, storeTimezone);
  return format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
}

// Usage in React component
function OrderList() {
  const { data: orders } = trpc.orders.list.useQuery();
  
  return (
    <div>
      {orders?.map(order => (
        <div key={order.id}>
          <p>Created: {formatStoreTime(order.createdAt, 'Europe/Moscow')}</p>
        </div>
      ))}
    </div>
  );
}
```

### Timezone Configuration

**Store timezone is configured per store:**

```sql
-- Add timezone column to store table
ALTER TABLE store ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow';

-- Update specific stores
UPDATE store SET timezone = 'Asia/Shanghai' WHERE id = 1;
UPDATE store SET timezone = 'Europe/Tallinn' WHERE id = 2;
```

### Migration from timestamp to timestamptz

If you have existing data in `timestamp` (without timezone):

```sql
-- Step 1: Add new column
ALTER TABLE old_table ADD COLUMN created_at_tz TIMESTAMPTZ;

-- Step 2: Convert assuming UTC
UPDATE old_table SET created_at_tz = created_at AT TIME ZONE 'UTC';

-- Step 3: Verify conversion
SELECT created_at, created_at_tz FROM old_table LIMIT 10;

-- Step 4: Drop old column and rename
ALTER TABLE old_table DROP COLUMN created_at;
ALTER TABLE old_table RENAME COLUMN created_at_tz TO created_at;
```

---

## 3. Data Cleanup Before Constraint Migration

### Pre-Migration Validation Script

Run this before applying constraints to identify violations:

```sql
-- drizzle/migrations/pre-migration-checks.sql

-- Check 1: Order points/coupon mutual exclusion
SELECT 
  id,
  points_used,
  coupon_instance_id,
  CASE 
    WHEN points_used > 0 AND coupon_instance_id IS NOT NULL THEN 'VIOLATION'
    ELSE 'OK'
  END AS status
FROM "order"
WHERE points_used > 0 AND coupon_instance_id IS NOT NULL;

-- Check 2: Coupon instance state consistency
SELECT 
  id,
  status,
  used_at,
  used_order_id,
  CASE
    WHEN status = 'USED' AND (used_at IS NULL OR used_order_id IS NULL) THEN 'VIOLATION'
    WHEN status != 'USED' AND (used_at IS NOT NULL OR used_order_id IS NOT NULL) THEN 'VIOLATION'
    ELSE 'OK'
  END AS status_check
FROM coupon_instance
WHERE status = 'USED' AND (used_at IS NULL OR used_order_id IS NULL)
   OR status != 'USED' AND (used_at IS NOT NULL OR used_order_id IS NOT NULL);

-- Check 3: Idempotency key duplicates
SELECT 
  idempotency_key,
  COUNT(*) AS duplicate_count
FROM member_points_history
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- Check 4: Offline scan log client_event_id duplicates
SELECT 
  client_event_id,
  COUNT(*) AS duplicate_count
FROM offline_scan_log
GROUP BY client_event_id
HAVING COUNT(*) > 1;
```

### Data Cleanup Script

```sql
-- Fix violations before applying constraints

-- Fix 1: Clear coupon_instance_id where points were used
UPDATE "order"
SET coupon_instance_id = NULL
WHERE points_used > 0 AND coupon_instance_id IS NOT NULL;

-- Fix 2: Set used_at and used_order_id for USED coupons
UPDATE coupon_instance
SET 
  used_at = COALESCE(used_at, updated_at),
  used_order_id = COALESCE(used_order_id, 0) -- Placeholder, manual review needed
WHERE status = 'USED' AND (used_at IS NULL OR used_order_id IS NULL);

-- Fix 3: Remove duplicate idempotency keys (keep first)
DELETE FROM member_points_history
WHERE id NOT IN (
  SELECT MIN(id)
  FROM member_points_history
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
);

-- Fix 4: Remove duplicate client_event_id (keep first, update dup_count)
WITH duplicates AS (
  SELECT 
    client_event_id,
    ARRAY_AGG(id ORDER BY scanned_at) AS ids,
    COUNT(*) - 1 AS dup_count
  FROM offline_scan_log
  GROUP BY client_event_id
  HAVING COUNT(*) > 1
)
UPDATE offline_scan_log
SET dup_count = d.dup_count
FROM duplicates d
WHERE offline_scan_log.id = d.ids[1];

DELETE FROM offline_scan_log
WHERE id IN (
  SELECT UNNEST(ids[2:])
  FROM duplicates
);
```

---

## 4. Constraint Migration Strategy

### Two-Phase Deployment

**Phase 1: Deploy without constraints (soft launch)**

```bash
# Deploy schema without CHECK constraints
pnpm db:push

# Monitor application logs for constraint violations
# Fix application logic if violations occur
```

**Phase 2: Add constraints (hardening)**

```bash
# Run pre-migration checks
psql $DATABASE_URL -f drizzle/migrations/pre-migration-checks.sql

# Run data cleanup
psql $DATABASE_URL -f drizzle/migrations/data-cleanup.sql

# Apply constraints
pnpm db:migrate
```

### Rollback Plan

If constraints cause issues in production:

```sql
-- Remove specific constraint
ALTER TABLE "order" DROP CONSTRAINT order_points_coupon_mutual_exclusion;

-- Remove partial unique index
DROP INDEX idx_coupon_instance_used_order_unique;
```

---

## 5. Performance Considerations

### Batch Update Optimization

BaseRepository already uses optimized batch updates:

```typescript
// server/repositories/base.repository.ts
async batchUpdateWithTouch<T>(
  table: any,
  updates: Array<{ where: SQL; data: Partial<T> }>
): Promise<T[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Single transaction + same timestamp for all updates
  return await db.transaction(async (tx) => {
    const now = new Date();
    const results: T[] = [];
    
    for (const { where, data } of updates) {
      const updated = await tx.update(table)
        .set({ ...data, updatedAt: now })
        .where(where)
        .returning();
      results.push(...updated);
    }
    
    return results;
  });
}
```

### Index Strategy

**Hot tables should have appropriate indexes:**

```sql
-- Order table (high read/write volume)
CREATE INDEX idx_order_member_id ON "order"(member_id);
CREATE INDEX idx_order_store_id ON "order"(store_id);
CREATE INDEX idx_order_created_at ON "order"(created_at DESC);
CREATE INDEX idx_order_status ON "order"(status) WHERE status != 'COMPLETED';

-- Coupon instance (high concurrency)
CREATE INDEX idx_coupon_instance_member_id ON coupon_instance(member_id);
CREATE INDEX idx_coupon_instance_status ON coupon_instance(status) WHERE status = 'UNUSED';
```

### Connection Pool Tuning

```typescript
// server/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## 6. Monitoring & Alerting

### Key Metrics to Monitor

1. **Constraint violations** (should be zero after deployment)
2. **Query performance** (slow queries > 1s)
3. **Connection pool exhaustion**
4. **Timestamp timezone mismatches** (user complaints about wrong times)

### Logging

All database operations should use sanitized logging:

```typescript
import { sanitizeForLog } from './utils/sanitize';

console.log('Order created:', sanitizeForLog(order));
// Output: { id: 123, customer: { phone: '+7***67' }, ... }
```

---

## 7. Deployment Checklist

- [ ] Run pre-migration checks
- [ ] Backup production database
- [ ] Run data cleanup scripts
- [ ] Deploy new schema with constraints
- [ ] Verify constraint enforcement
- [ ] Monitor application logs for 24 hours
- [ ] Update API documentation with timezone handling
- [ ] Train support team on timezone conversion

---

## Contact

For migration support, contact the platform team or refer to `CONTRIBUTING.md`.
