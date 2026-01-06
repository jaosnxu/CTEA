# P0/P1/P2 Comprehensive Fix Execution Plan

**Date**: 2026-01-06  
**Status**: In Progress

---

## ✅ Already Correct (No Action Needed)

### P0-1: Complete Schema Implementation
- **Status**: ✅ DONE
- **Evidence**: drizzle/schema.ts contains 29 tables
- **Tables**: users, memberGroup, member, memberPointsHistory, couponTemplate, couponInstance, order, orderItem, orderItemOption, store, storeProduct, product, optionGroup, optionItem, productOptionGroup, productOptionItem, offlineScanLog, campaign, campaignCode, idempotencyKey, iikoSyncJob, iikoSyncLog, influencer, phoneVerification, productReview, reviewLike, couponAuditLog, specialPriceRequest, specialPriceAuditLog

### P0-4: Critical Constraints (Partial)
- ✅ `order_points_coupon_mutual_exclusion` CHECK
- ✅ `coupon_instance_state_consistency` CHECK
- ✅ `idx_coupon_instance_used_order_unique` partial unique index
- ✅ `idx_points_history_idempotency_unique` partial unique index
- ✅ `idx_offline_scan_log_code_order_unique` partial unique index
- ✅ `offline_scan_log.client_event_id` UUID + UNIQUE
- ✅ Composite FK for `product_option_group.default_item_id` (in 0001 migration)

### P1-5: Timestamptz Standardization
- **Status**: ✅ DONE
- **Evidence**: All timestamp fields use `timestamp('field', { withTimezone: true })`

### P1-7: Naming Convention
- **Status**: ✅ DONE
- **Evidence**: DB uses snake_case, TS uses camelCase with explicit mapping

---

## ❌ Must Fix

### P0-2: Replace CouponRepository Mock with Real Schema
**Current Issue**:
```typescript
// server/repositories/coupon.repository.ts line 46-49
const couponInstance: any = {
  id: { name: 'id' },
  status: { name: 'status' }
};
```

**Fix**:
```typescript
import { couponInstance } from '../../drizzle/schema';
import { getDb } from '../db';
```

**Files to Modify**:
- `server/repositories/coupon.repository.ts`

---

### P0-3: Unify Migration File Location
**Current Issue**:
- Main migration: `drizzle/0000_serious_marauders.sql` (root)
- Secondary migration: `drizzle/migrations/0001_add_composite_fk.sql` (subdirectory)
- Drizzle-kit expects all migrations in `drizzle/migrations/`

**Fix**:
1. Move `drizzle/0000_serious_marauders.sql` → `drizzle/migrations/0000_serious_marauders.sql`
2. Update `drizzle.config.ts` to ensure `out: './drizzle/migrations'`
3. Regenerate migrations if needed

**Files to Modify**:
- Move migration file
- Verify `drizzle.config.ts`

---

### P1-6: Numeric Precision Inconsistency (Minor)
**Current Issue**:
- `pointsMultiplier`: numeric(3,2) - should be (12,2)?
- `discountPercent`: numeric(5,2) - should be (12,2)?
- Lat/Lng: numeric(10,7) - OK (geographic coordinates)

**Decision Needed**:
- Points multiplier (0.00-9.99) → (3,2) is reasonable
- Discount percent (0.00-999.99%) → (5,2) is reasonable
- **Action**: Document this as intentional deviation, not a bug

**Files to Modify**:
- Add comment in `drizzle/schema.ts` explaining precision choices

---

### P2-8: Fix CI Whitelist
**Current Issue**:
```bash
# scripts/lint-db-writes.sh
ALLOW_DIR_REGEX="server/repositories|server/db/migrations"
```

**Problems**:
1. `server/db/migrations` doesn't exist (should be `drizzle/migrations`)
2. Missing explicit handling of `server/_core/voiceTranscription.ts`

**Fix**:
```bash
ALLOW_DIR_REGEX="server/repositories|drizzle/migrations"
```

**Files to Modify**:
- `scripts/lint-db-writes.sh`

---

### P2-9: Implement Mandatory Log Sanitization
**Current Issue**:
- No enforced sanitization function
- IIKO logs may contain sensitive data (tokens, phone, payment info)

**Fix**:
1. Create `server/utils/sanitize.ts`:
```typescript
export function sanitizeForLog(obj: any, maxLength: number = 500): any {
  const sensitive = ['token', 'password', 'phone', 'card', 'secret', 'key'];
  // Implementation with field masking + length truncation
}
```

2. Add to logger wrapper in `server/_core/logger.ts`
3. Write test case in `server/utils/sanitize.test.ts`

**Files to Create/Modify**:
- `server/utils/sanitize.ts` (new)
- `server/utils/sanitize.test.ts` (new)
- `server/_core/logger.ts` (modify to use sanitization)

---

### P2-10: Implement offline_scan_log Idempotency with dup_count
**Current Issue**:
- Schema has `dup_count` field
- No implementation of `INSERT ... ON CONFLICT DO UPDATE`

**Fix**:
Create `server/repositories/offline-scan.repository.ts`:
```typescript
async upsertScan(data: InsertOfflineScanLog): Promise<OfflineScanLog> {
  const db = await getDb();
  const result = await db.insert(offlineScanLog)
    .values(data)
    .onConflictDoUpdate({
      target: offlineScanLog.clientEventId,
      set: {
        dupCount: sql`${offlineScanLog.dupCount} + 1`,
        lastDupAt: new Date(),
        updatedAt: new Date()
      }
    })
    .returning();
  return result[0];
}
```

**Files to Modify**:
- `server/repositories/offline-scan.repository.ts` (already exists, add upsert method)

---

## 📋 New Problem Prevention

### A. Data Migration Strategy (MySQL → PostgreSQL)
**Action**: Create `MIGRATION_GUIDE.md` documenting:
1. This is a greenfield PostgreSQL deployment
2. No MySQL data migration needed
3. If migration needed in future, provide script template

**Files to Create**:
- `MIGRATION_GUIDE.md`

---

### B. Timestamptz Conversion Approach
**Action**: Document in `MIGRATION_GUIDE.md`:
1. All timestamps stored as UTC in PostgreSQL
2. Frontend converts to user timezone
3. API always returns ISO 8601 strings

**Files to Modify**:
- `MIGRATION_GUIDE.md` (add section)

---

### C. Data Cleanup Before Constraint Migration
**Action**: Add pre-migration validation script:
```sql
-- Check for constraint violations before applying
SELECT * FROM "order" WHERE (points_used > 0 AND coupon_instance_id IS NOT NULL);
SELECT * FROM coupon_instance WHERE status='USED' AND used_order_id IS NULL;
```

**Files to Create**:
- `drizzle/migrations/pre-migration-checks.sql`

---

### D. BaseRepository Batch Update Performance
**Current Implementation**: Already uses single transaction + same timestamp
**Action**: Add performance notes in `server/repositories/base.repository.ts` comments

**Files to Modify**:
- `server/repositories/base.repository.ts` (add performance notes)

---

## 🎯 Execution Order

1. **P0-2**: Fix CouponRepository mock (5 min)
2. **P0-3**: Move migration file to correct directory (2 min)
3. **P2-8**: Fix CI whitelist (2 min)
4. **P2-10**: Implement offline_scan_log upsert (10 min)
5. **P2-9**: Implement log sanitization (15 min)
6. **P1-6**: Document numeric precision choices (5 min)
7. **A/B/C/D**: Create documentation files (10 min)
8. **Test**: Run full test suite (5 min)
9. **CI**: Verify CI passes (5 min)
10. **Package**: Create final delivery (10 min)

**Total Estimated Time**: ~70 minutes

---

## ✅ Success Criteria

1. All P0 items resolved
2. All P1 items resolved or documented
3. All P2 items implemented with tests
4. CI passes with zero violations
5. Complete documentation package delivered
