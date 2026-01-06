import { PRODUCTS, Product } from "./db_mock";

/**
 * IIKO Sync Simulator
 * 
 * Simulates product sync from IIKO POS system.
 * Respects `is_manual_override` flag to prevent overwriting admin changes.
 */

interface IIKOProduct {
  id: number;
  name_ru: string;
  price: number;
}

// Mock IIKO API response
const MOCK_IIKO_PRODUCTS: IIKOProduct[] = [
  { id: 1, name_ru: "Клубничный Чиз (IIKO)", price: 300 },
  { id: 2, name_ru: "Манго Чиз (IIKO)", price: 310 },
  { id: 3, name_ru: "Виноградный Чиз (IIKO)", price: 290 },
];

/**
 * Sync products from IIKO
 * @param forceOverride - If true, ignore manual override flags (dangerous!)
 */
export function syncFromIIKO(forceOverride: boolean = false): {
  updated: number;
  skipped: number;
  conflicts: Array<{ id: number; name: string; reason: string }>;
} {
  let updated = 0;
  let skipped = 0;
  const conflicts: Array<{ id: number; name: string; reason: string }> = [];

  console.log("\n========================================");
  console.log("🔄 [IIKO SYNC] Starting product sync...");
  console.log("========================================\n");

  MOCK_IIKO_PRODUCTS.forEach((iikoProduct) => {
    const localProduct = PRODUCTS.find((p) => p.id === iikoProduct.id);

    if (!localProduct) {
      console.log(`⚠️  [SKIP] Product ${iikoProduct.id} not found in local DB`);
      skipped++;
      return;
    }

    // Check manual override flag
    if (localProduct.is_manual_override && !forceOverride) {
      console.log(
        `🛡️  [PROTECTED] Product #${iikoProduct.id} "${localProduct.name_ru}"`
      );
      console.log(
        `   └─ Local: ₽${localProduct.price} (Manual Override Active)`
      );
      console.log(`   └─ IIKO:  ₽${iikoProduct.price} (BLOCKED)`);
      console.log(`   └─ Action: SKIP (Manual changes preserved)\n`);

      conflicts.push({
        id: iikoProduct.id,
        name: localProduct.name_ru,
        reason: `Manual override active. Local=₽${localProduct.price}, IIKO=₽${iikoProduct.price}`,
      });
      skipped++;
      return;
    }

    // Update product
    const oldPrice = localProduct.price;
    localProduct.price = iikoProduct.price;
    localProduct.name_ru = iikoProduct.name_ru;

    console.log(`✅ [UPDATED] Product #${iikoProduct.id}`);
    console.log(`   └─ Name: ${iikoProduct.name_ru}`);
    console.log(`   └─ Price: ₽${oldPrice} → ₽${iikoProduct.price}`);
    console.log(`   └─ Override: ${localProduct.is_manual_override ? "Yes" : "No"}\n`);

    updated++;
  });

  console.log("========================================");
  console.log("📊 [IIKO SYNC] Summary");
  console.log("========================================");
  console.log(`✅ Updated: ${updated}`);
  console.log(`🛡️  Protected: ${skipped}`);
  console.log(`⚠️  Conflicts: ${conflicts.length}`);
  console.log("========================================\n");

  return { updated, skipped, conflicts };
}

/**
 * Reset all manual override flags (for testing)
 */
export function resetAllOverrides(): void {
  PRODUCTS.forEach((p) => {
    p.is_manual_override = false;
  });
  console.log("🔄 [RESET] All manual override flags cleared");
}
