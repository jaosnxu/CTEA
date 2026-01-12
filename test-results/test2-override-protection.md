# Test 2: Manual Override Protection Against IIKO Sync

**Date:** 2026-01-06 03:05:33  
**Objective:** Verify that products with `is_manual_override=true` are protected from IIKO sync overwrites

## Test Execution

### Initial State (Before Sync)

| Product ID | Name            | Local Price | Override Status    |
| ---------- | --------------- | ----------- | ------------------ |
| #1         | Клубничный Чиз  | ₽500        | Manual Override ✅ |
| #2         | Манго Чиз       | ₽310        | IIKO Managed       |
| #3         | Виноградный Чиз | ₽399        | Manual Override ✅ |

### IIKO Sync Simulation

**Action:** Clicked "Run IIKO Sync (Safe)"  
**Timestamp:** 03:05:33  
**Simulated IIKO Data:**

- Product #1: IIKO price = ₽300 (attempting to overwrite ₽500)
- Product #2: IIKO price = ₽310 (no change)
- Product #3: IIKO price = ₽290 (attempting to overwrite ₽399)

### Sync Result

**Summary Statistics:**

- ✅ **1 Updated:** Product #2 (IIKO Managed) synced successfully
- 🛡️ **2 Protected:** Products #1 and #3 (Manual Override) blocked from sync
- ⚠️ **2 Conflicts:** Logged for admin review

**Protected Products (Manual Override Active):**

#### Product #1: Клубничный Чиз

- **Manual override active**
- **Local Price:** ₽500 (preserved ✅)
- **IIKO Attempted Price:** ₽300 (blocked ❌)
- **Result:** Manual price **₽500 maintained**, IIKO sync rejected

#### Product #3: Виноградный Чиз

- **Manual override active**
- **Local Price:** ₽399 (preserved ✅)
- **IIKO Attempted Price:** ₽290 (blocked ❌)
- **Result:** Manual price **₽399 maintained**, IIKO sync rejected

### Final State (After Sync)

| Product ID | Name            | Local Price | Override Status    | Sync Result  |
| ---------- | --------------- | ----------- | ------------------ | ------------ |
| #1         | Клубничный Чиз  | ₽500        | Manual Override ✅ | 🛡️ Protected |
| #2         | Манго Чиз (ИКО) | ₽310        | IIKO Managed       | ✅ Synced    |
| #3         | Виноградный Чиз | ₽399        | Manual Override ✅ | 🛡️ Protected |

## Technical Details

**Protection Logic (server/iiko-sync.ts):**

```typescript
for (const iikoProduct of iikoData) {
  const localProduct = PRODUCTS.find(p => p.id === iikoProduct.id);

  if (localProduct?.is_manual_override) {
    // BLOCK: Manual override active, log conflict
    conflicts.push({
      productId: localProduct.id,
      localPrice: localProduct.price,
      iikoPrice: iikoProduct.price,
      reason: "Manual override active",
    });
    protectedCount++;
  } else {
    // ALLOW: Update from IIKO
    localProduct.price = iikoProduct.price;
    updatedCount++;
  }
}
```

**Conflict Logging:**
The system maintains an audit trail of all sync conflicts, allowing admins to:

1. Review which IIKO updates were blocked
2. Decide whether to keep manual prices or accept IIKO prices
3. Manually resolve conflicts via Admin Panel

## Business Value

This protection mechanism solves a critical problem in multi-channel F&B operations:

**Problem:** Marketing teams need to run flash sales or adjust prices for local market conditions, but POS systems (IIKO) periodically sync and overwrite these changes, causing:

- Lost promotional pricing
- Customer confusion (advertised price ≠ actual price)
- Revenue loss from incorrect pricing

**Solution:** The Shadow DB architecture with `is_manual_override` flag ensures that:

- Marketing teams can confidently set custom prices
- POS sync continues for non-modified products
- Conflicts are logged for review, not silently overwritten
- Business maintains control over pricing strategy

## Test Result: ✅ PASS

**Conclusion:** The manual override protection mechanism works perfectly. Products with `is_manual_override=true` successfully resist IIKO sync attempts, preserving admin-set prices while allowing other products to update normally. The system correctly logs conflicts for admin review.

**Evidence:** Sync result shows 2 protected products (₽500 and ₽399 maintained) and 2 logged conflicts, demonstrating the Shadow DB protection layer is functioning as designed.
