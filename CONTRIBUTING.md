# Contributing Guidelines

## Database Write Operations - Hard Rules

### ✅ Allowed: Repository / Migration Only

**Direct database writes (`db.insert/update/delete`) are ONLY allowed in:**
- `server/repositories/**/*.ts` - Repository layer
- `server/db/migrations/**/*.ts` - Migration scripts

### ❌ Prohibited: Router / Service / Handler

**Direct database writes are STRICTLY FORBIDDEN in:**
- `server/routers/**/*.ts` - tRPC routers
- `server/services/**/*.ts` - Service layer
- `server/**/*.controller.ts` - Controllers
- `server/**/*.handler.ts` - Event handlers

### 📋 Required Practices

1. **All updates MUST use Repository methods**
   - Use `updateWithTouchById()` for simple ID-based updates
   - Use `updateWithTouchWhere()` for conditional updates (atomic operations)
   - Use `batchUpdateWithTouch()` for batch updates with consistent timestamps

2. **All updates MUST automatically inject `updatedAt`**
   - Repository methods handle this automatically
   - Never manually set `updatedAt` in business logic

3. **Concurrent-sensitive operations MUST use conditional updates**
   - Use `updateWithTouchWhere()` with `WHERE` conditions
   - Check `returning` result length (empty = condition not met)
   - Example: Coupon redemption, inventory deduction, seat booking

### 🔍 Code Review Checklist

Before approving any PR, verify:

- [ ] No `db.update/insert/delete` calls outside `repositories/` or `migrations/`
- [ ] No `tx.update/insert/delete` calls outside `repositories/` or `migrations/`
- [ ] All updates use Repository methods that inject `updatedAt`
- [ ] Concurrent-sensitive operations use conditional updates with `returning` checks
- [ ] No manual `updatedAt` assignments in business logic

### 🚨 CI Enforcement

The CI pipeline includes a mandatory check (`pnpm lint:db-writes`) that will **fail the build** if:
- Direct `db.*` or `tx.*` write operations are found outside `repositories/` or `migrations/`

### 📚 Examples

#### ✅ Correct: Using Repository

```typescript
// server/routers/coupon.router.ts
import { couponRepository } from '../repositories/coupon.repository';

export const couponRouter = router({
  redeem: protectedProcedure
    .input(z.object({ couponId: z.number(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      // ✅ Use repository method (automatic updatedAt + atomic update)
      const coupon = await couponRepository.markAsUsedAtomic(
        input.couponId,
        input.orderId
      );
      return coupon;
    }),
});
```

#### ❌ Incorrect: Direct DB Write

```typescript
// server/routers/coupon.router.ts
import { db } from '../db';
import { couponInstance } from '../../drizzle/schema';

export const couponRouter = router({
  redeem: protectedProcedure
    .input(z.object({ couponId: z.number(), orderId: z.number() }))
    .mutation(async ({ input }) => {
      // ❌ Direct db.update in router (CI will reject)
      await db.update(couponInstance)
        .set({ status: 'USED', usedOrderId: input.orderId })
        .where(eq(couponInstance.id, input.couponId));
    }),
});
```

#### ✅ Correct: Conditional Update in Repository

```typescript
// server/repositories/coupon.repository.ts
import { BaseRepository } from './base.repository';
import { and, eq } from 'drizzle-orm';
import { couponInstance } from '../../drizzle/schema';

export class CouponRepository extends BaseRepository<CouponInstance> {
  async markAsUsedAtomic(couponId: number, orderId: number) {
    // ✅ Conditional update with WHERE clause (prevents race conditions)
    const results = await this.updateWithTouchWhere(
      couponInstance,
      and(
        eq(couponInstance.id, couponId),
        eq(couponInstance.status, 'UNUSED')  // Atomic condition
      ),
      {
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: orderId
      }
    );
    
    // ✅ Check returning result (empty = already used)
    if (results.length === 0) {
      throw new Error('Coupon not available or already used');
    }
    
    return results[0];
  }
}
```

### 🛠️ BaseRepository API Reference

#### `updateWithTouchById(table, id, data)`
Simple ID-based update with automatic `updatedAt` injection.

**Use when:** Updating a single record by ID without concurrency concerns.

#### `updateWithTouchWhere(table, where, data)`
Conditional update with automatic `updatedAt` injection.

**Use when:** Need atomic updates with `WHERE` conditions (e.g., status checks, optimistic locking).

**Returns:** Array of updated records (empty if condition not met).

#### `batchUpdateWithTouch(table, updates, opts?)`
Batch update with consistent timestamp across all records.

**Use when:** Updating multiple records in a single transaction.

**Options:**
- `maxBatch`: Maximum batch size (default: 50)
- `tx`: Optional transaction object

### 🔗 Related Documentation

- [BaseRepository Implementation](./server/repositories/base.repository.ts)
- [CouponRepository Example](./server/repositories/coupon.repository.ts)
- [CI Lint Script](./scripts/lint-db-writes.sh)

---

**Violations of these rules will result in CI failures and PR rejections.**
