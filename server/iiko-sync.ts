/**
 * CHU TEA - IIKO Sync Service
 * 
 * This module handles synchronization from IIKO POS system.
 */

import { PRODUCTS } from './db_mock';
import { createIIKOClient, MockIIKOClient } from './iiko-api';
import { getIIKOSettings, updateLastSyncTime } from './db_iiko_settings';

export interface SyncResult {
  success: boolean;
  message: string;
  updated: number;
  skipped: number;
  conflicts?: Array<{ id: number; name: string; reason: string }>;
}

/**
 * Sync products from IIKO (with real API integration)
 */
export async function syncFromIIKO(forceOverride: boolean = false): Promise<SyncResult> {
  const settings = getIIKOSettings();
  
  if (!settings.enabled) {
    console.log('[IIKO Sync] IIKO integration is disabled');
    return {
      success: false,
      message: 'IIKO integration is disabled',
      updated: 0,
      skipped: 0,
    };
  }
  
  // Use mock client for demo, real client when credentials are provided
  const client = settings.apiLogin && settings.organizationId
    ? createIIKOClient({
        apiUrl: settings.apiUrl,
        apiLogin: settings.apiLogin,
        organizationId: settings.organizationId,
        enabled: settings.enabled,
        syncInterval: settings.syncInterval,
      })
    : new MockIIKOClient({
        apiUrl: settings.apiUrl,
        apiLogin: settings.apiLogin,
        organizationId: settings.organizationId,
        enabled: settings.enabled,
        syncInterval: settings.syncInterval,
      });
  
  try {
    const iikoProducts = await client.getProducts();
    console.log(`[IIKO Sync] Fetched ${iikoProducts.length} products from IIKO`);
    
    let updated = 0;
    let skipped = 0;
    const conflicts: Array<{ id: number; name: string; reason: string }> = [];
    
    for (const iikoProduct of iikoProducts) {
      // Find product by IIKO ID or name
      const existingProduct = PRODUCTS.find(
        p => p.iiko_id === iikoProduct.id || p.name_ru === iikoProduct.name
      );
      
      if (!existingProduct) {
        console.log(`[IIKO Sync] Product "${iikoProduct.name}" not found in local DB, skipping`);
        skipped++;
        continue;
      }
      
      // Check manual override flag
      if (existingProduct.is_manual_override && !forceOverride && settings.respectManualOverride) {
        console.log(`[IIKO Sync] Skipping product ${existingProduct.id} (manual override active)`);
        conflicts.push({
          id: existingProduct.id,
          name: existingProduct.name_ru,
          reason: `Manual override active. Local=₽${existingProduct.price}, IIKO=₽${iikoProduct.price}`,
        });
        skipped++;
        continue;
      }
      
      // Update product
      const oldPrice = existingProduct.price;
      existingProduct.price = iikoProduct.price;
      existingProduct.name_ru = iikoProduct.name;
      existingProduct.description_ru = iikoProduct.description || existingProduct.description_ru;
      existingProduct.iiko_id = iikoProduct.id;
      existingProduct.is_manual_override = false;
      
      console.log(`[IIKO Sync] Updated product ${existingProduct.id}: ₽${oldPrice} → ₽${iikoProduct.price}`);
      updated++;
    }
    
    updateLastSyncTime();
    
    return {
      success: true,
      message: `Synced ${updated} products, skipped ${skipped} (manual override)`,
      updated,
      skipped,
      conflicts,
    };
  } catch (error: any) {
    console.error('[IIKO Sync] Error:', error);
    return {
      success: false,
      message: error.message,
      updated: 0,
      skipped: 0,
    };
  }
}

/**
 * Legacy mock sync function (for backward compatibility)
 */
export function syncFromIIKOMock(forceOverride: boolean = false): {
  updated: number;
  skipped: number;
  conflicts: Array<{ id: number; name: string; reason: string }>;
} {
  const MOCK_IIKO_PRODUCTS = [
    { id: 1, name_ru: "Клубничный Чиз (IIKO)", price: 300 },
    { id: 2, name_ru: "Манго Чиз (IIKO)", price: 310 },
    { id: 3, name_ru: "Виноградный Чиз (IIKO)", price: 290 },
  ];

  let updated = 0;
  let skipped = 0;
  const conflicts: Array<{ id: number; name: string; reason: string }> = [];

  console.log("\n========================================");
  console.log("🔄 [IIKO SYNC MOCK] Starting product sync...");
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
  console.log("📊 [IIKO SYNC MOCK] Summary");
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
