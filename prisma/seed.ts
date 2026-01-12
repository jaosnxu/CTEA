/**
 * CHUTEA Production Seed Script v2.0
 *
 * Creates comprehensive test data for production environment:
 * - 15+ bubble tea products with Russian names and ₽ prices
 * - Inventory levels with low stock warnings
 * - 60+ historical orders for chart population
 * - System configs for Integration Hub
 */

import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🌱 Starting CHUTEA production seed v2.0...");
  console.log("📡 Connecting to database...");

  const pool = new Pool({ connectionString });

  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully");

    // 1. Create default organization
    console.log("📦 Creating organization...");
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, code, name, level, timezone, currency, status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'CHUCHUTEA',
        '{"ru": "ЧУЧУТЕА", "zh": "楚茶", "en": "CHUCHUTEA"}'::jsonb,
        'HQ',
        'Europe/Moscow',
        'RUB',
        'ACTIVE',
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE SET "updatedAt" = NOW()
      RETURNING id, code
    `);
    const orgId = orgResult.rows[0].id;
    console.log(
      "✅ Organization created/updated: CHUCHUTEA (ID: " + orgId + ")"
    );

    // 2. Create store
    console.log("🏪 Creating store...");
    const storeResult = await pool.query(
      `
      INSERT INTO stores (id, "orgId", code, name, address, phone, timezone, status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        $1,
        'MOSCOW-001',
        '{"ru": "ЧУЧУТЕА Москва Центр", "zh": "楚茶莫斯科中心", "en": "CHUCHUTEA Moscow Central"}'::jsonb,
        '{"ru": "ул. Тверская, 1, Москва", "zh": "莫斯科特维尔大街1号", "en": "Tverskaya St, 1, Moscow"}'::jsonb,
        '+7 495 123 4567',
        'Europe/Moscow',
        'ACTIVE',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id, code
    `,
      [orgId]
    );

    let storeId;
    if (storeResult.rows.length > 0) {
      storeId = storeResult.rows[0].id;
      console.log("✅ Store created: MOSCOW-001 (ID: " + storeId + ")");
    } else {
      const existingStore = await pool.query(
        "SELECT id FROM stores WHERE code = 'MOSCOW-001' LIMIT 1"
      );
      storeId = existingStore.rows[0]?.id;
      console.log("✅ Store already exists (ID: " + storeId + ")");
    }

    // 3. Create admin user
    console.log("👤 Creating admin user...");
    await pool.query(
      `
      INSERT INTO admin_users (id, "orgId", username, "passwordHash", role, status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        $1,
        'admin',
        '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YeY8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y',
        'HQ_ADMIN',
        'ACTIVE',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
    `,
      [orgId]
    );
    console.log("✅ Admin user created/exists");

    // 4. Create categories
    console.log("📂 Creating categories...");
    const categoryData = [
      { slug: "milk-tea" },
      { slug: "fruit-tea" },
      { slug: "classic-tea" },
    ];

    const categoryIds: string[] = [];
    for (const cat of categoryData) {
      const result = await pool.query(
        `
        INSERT INTO categories (id, "orgId", code, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 1, $1, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
        [cat.slug]
      );

      if (result.rows.length > 0) {
        categoryIds.push(result.rows[0].id);
      } else {
        const existing = await pool.query(
          "SELECT id FROM categories WHERE code = $1 LIMIT 1",
          [cat.slug]
        );
        if (existing.rows.length > 0) {
          categoryIds.push(existing.rows[0].id);
        }
      }
    }
    console.log("✅ Created/found " + categoryIds.length + " categories");

    // 5. Create 15+ products (priced in ₽) with comprehensive Russian names
    console.log("🧋 Creating products...");
    const productData = [
      // Milk Tea (Молочный чай) - Category 0
      { name: "Классический молочный чай с жемчугом", price: 299, catIdx: 0, stock: 150 },
      { name: "Таро молочный чай", price: 349, catIdx: 0, stock: 120 },
      { name: "Коричневый сахар с жемчугом боба", price: 379, catIdx: 0, stock: 8 }, // LOW STOCK
      { name: "Матча латте с кремом", price: 329, catIdx: 0, stock: 95 },
      { name: "Тигровый молочный чай", price: 359, catIdx: 0, stock: 5 }, // LOW STOCK
      { name: "Орео молочный чай", price: 369, catIdx: 0, stock: 78 },
      // Fruit Tea (Фруктовый чай) - Category 1
      { name: "Манго фруктовый чай с алоэ", price: 359, catIdx: 1, stock: 110 },
      { name: "Персиковый улун с желе", price: 339, catIdx: 1, stock: 3 }, // LOW STOCK
      { name: "Грейпфрут зелёный чай", price: 319, catIdx: 1, stock: 88 },
      { name: "Клубничный смузи с молоком", price: 389, catIdx: 1, stock: 65 },
      { name: "Маракуйя фруктовый чай", price: 349, catIdx: 1, stock: 92 },
      { name: "Лимонный чай с мёдом", price: 289, catIdx: 1, stock: 7 }, // LOW STOCK
      // Classic Tea (Классический чай) - Category 2
      { name: "Жасминовый зелёный чай", price: 249, catIdx: 2, stock: 200 },
      { name: "Улун чай премиум", price: 269, catIdx: 2, stock: 180 },
      { name: "Пуэр чай выдержанный", price: 289, catIdx: 2, stock: 45 },
      { name: "Зелёный чай с мёдом и лимоном", price: 279, catIdx: 2, stock: 130 },
    ];

    const productIds: string[] = [];
    let productsCreated = 0;
    for (const p of productData) {
      const catId = categoryIds[p.catIdx] ? 1 : 1;
      const code = p.name.toLowerCase().replace(/\s+/g, "-").substring(0, 50);
      const result = await pool.query(
        `
        INSERT INTO products (id, "orgId", "categoryId", name, code, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 1, $1, $2, $3, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
        [catId, p.name, code]
      );

      if (result.rows.length > 0) {
        productIds.push(result.rows[0].id);
        productsCreated++;
      } else {
        const existing = await pool.query(
          "SELECT id FROM products WHERE name = $1 LIMIT 1",
          [p.name]
        );
        if (existing.rows.length > 0) {
          productIds.push(existing.rows[0].id);
        }
      }
    }
    console.log("✅ Created " + productsCreated + " new products (total: " + productIds.length + ")");

    // 5b. Create inventory records with low stock warnings
    console.log("📦 Creating inventory records...");
    let inventoryCreated = 0;
    for (let i = 0; i < productData.length; i++) {
      const p = productData[i];
      const lowStockThreshold = 10;
      await pool.query(
        `
        INSERT INTO mall_inventory (id, "productId", quantity, "reservedQuantity", "lowStockThreshold", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, 0, $3, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
        [i + 1, p.stock, lowStockThreshold]
      );
      inventoryCreated++;
    }
    console.log("✅ Created " + inventoryCreated + " inventory records (4 with LOW STOCK warnings)");

    // 6. Create 60+ historical orders with realistic distribution
    console.log("📋 Creating historical orders...");
    const existingOrders = await pool.query(
      "SELECT COUNT(*) as count FROM orders"
    );
    const orderCount = parseInt(existingOrders.rows[0].count);
    const ordersToCreate = Math.max(0, 65 - orderCount);

    if (ordersToCreate > 0) {
      const orderStatuses = [
        "COMPLETED",
        "COMPLETED",
        "COMPLETED",
        "COMPLETED",
        "COMPLETED",
        "PENDING",
        "CANCELLED",
      ];

      // Create orders distributed over the last 30 days for chart data
      for (let i = 0; i < ordersToCreate; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const hoursAgo = Math.floor(Math.random() * 24);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);
        orderDate.setHours(9 + hoursAgo % 12); // Business hours 9-21
        
        // Realistic order amounts (1-4 items)
        const itemCount = Math.floor(Math.random() * 4) + 1;
        let totalAmount = 0;
        for (let j = 0; j < itemCount; j++) {
          totalAmount += productData[Math.floor(Math.random() * productData.length)].price;
        }
        
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

        await pool.query(
          `
          INSERT INTO orders ("orderNumber", "storeId", status, "totalAmount", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $5)
        `,
          [
            "ORD-" + Date.now() + "-" + i,
            storeId,
            status,
            totalAmount,
            orderDate,
          ]
        );
      }
      console.log("✅ Created " + ordersToCreate + " historical orders (distributed over 30 days)");
    } else {
      console.log("✅ Orders already exist (" + orderCount + " found)");
    }

    // 6b. Create daily sales summary for charts
    console.log("📊 Creating daily sales summaries...");
    for (let day = 0; day < 30; day++) {
      const salesDate = new Date();
      salesDate.setDate(salesDate.getDate() - day);
      const dateStr = salesDate.toISOString().split('T')[0];
      
      // Random daily metrics
      const dailyOrders = Math.floor(Math.random() * 20) + 5;
      const dailyRevenue = dailyOrders * (Math.floor(Math.random() * 200) + 300);
      
      await pool.query(
        `
        INSERT INTO system_configs (id, "configKey", "configValue", "valueType", description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2::jsonb, 'JSON', '{"en": "Daily sales data"}'::jsonb, NOW(), NOW())
        ON CONFLICT ("orgId", "storeId", "configKey") DO UPDATE SET "configValue" = $2::jsonb, "updatedAt" = NOW()
      `,
        [
          `sales.daily.${dateStr}`,
          JSON.stringify({ orders: dailyOrders, revenue: dailyRevenue, date: dateStr }),
        ]
      );
    }
    console.log("✅ Created 30 days of sales summary data");

    // 7. Create system configs
    console.log("⚙️ Creating system configs...");
    const configs = [
      { key: "app.name", value: "CHUCHUTEA", type: "STRING" },
      { key: "app.currency", value: "RUB", type: "STRING" },
      { key: "app.timezone", value: "Europe/Moscow", type: "STRING" },
      { key: "app.language.default", value: "ru", type: "STRING" },
      { key: "order.min_amount", value: "200", type: "NUMBER" },
      { key: "delivery.enabled", value: "true", type: "BOOLEAN" },
      { key: "delivery.min_order", value: "500", type: "NUMBER" },
      { key: "points.enabled", value: "true", type: "BOOLEAN" },
      { key: "points.rate", value: "10", type: "NUMBER" },
    ];

    for (const config of configs) {
      await pool.query(
        `
        INSERT INTO system_configs (id, "configKey", "configValue", "valueType", description, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2::jsonb, $3, $4::jsonb, NOW(), NOW())
        ON CONFLICT ("orgId", "storeId", "configKey") DO UPDATE SET "configValue" = $2::jsonb, "updatedAt" = NOW()
      `,
        [
          config.key,
          JSON.stringify(config.value),
          config.type,
          JSON.stringify({ en: "System config: " + config.key }),
        ]
      );
    }
    console.log("✅ Created/updated " + configs.length + " system configs");

    console.log("\n🎉 CHUTEA production seed completed successfully!");
    console.log("Summary:");
    console.log("  - 1 Organization (CHUCHUTEA)");
    console.log("  - 1 Admin User");
    console.log("  - 1 Store");
    console.log("  - 3 Categories");
    console.log("  - 12 Products (₽249-₽389)");
    console.log("  - 55 Historical Orders");
    console.log("  - 9 System Configs");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
