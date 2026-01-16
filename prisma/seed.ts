/**
 * CHUTEA Production Seed Script v2.0 (MySQL)
 *
 * Creates comprehensive test data for production environment:
 * - 15+ bubble tea products with Russian names and RUB prices
 * - Inventory levels with low stock warnings
 * - 60+ historical orders for chart population
 * - System configs for Integration Hub
 */

import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Starting CHUTEA production seed v2.0 (MySQL)...");
  console.log("Connecting to database...");

  // Parse MySQL connection string
  const url = new URL(connectionString);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  try {
    await connection.query("SELECT 1");
    console.log("Database connected successfully");

    // 1. Create default organization
    console.log("Creating organization...");
    const orgId = uuidv4();
    await connection.query(
      `
      INSERT INTO organizations (id, code, name, level, timezone, currency, status, createdAt, updatedAt)
      VALUES (?, 'CHUCHUTEA', ?, 'HQ', 'Europe/Moscow', 'RUB', 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE updatedAt = NOW()
    `,
      [orgId, JSON.stringify({ ru: "CHUCHUTEA", zh: "楚茶", en: "CHUCHUTEA" })]
    );

    // Get the actual org ID (in case it already existed)
    const [orgRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM organizations WHERE code = 'CHUCHUTEA' LIMIT 1"
    );
    const actualOrgId = (orgRows as mysql.RowDataPacket[])[0]?.id || orgId;
    console.log(
      "Organization created/updated: CHUCHUTEA (ID: " + actualOrgId + ")"
    );

    // 2. Create store
    console.log("Creating store...");
    const storeId = uuidv4();
    await connection.query(
      `
      INSERT IGNORE INTO stores (id, orgId, code, name, address, phone, timezone, status, createdAt, updatedAt)
      VALUES (?, ?, 'MOSCOW-001', ?, ?, '+7 495 123 4567', 'Europe/Moscow', 'ACTIVE', NOW(), NOW())
    `,
      [
        storeId,
        actualOrgId,
        JSON.stringify({
          ru: "CHUCHUTEA Москва Центр",
          zh: "楚茶莫斯科中心",
          en: "CHUCHUTEA Moscow Central",
        }),
        JSON.stringify({
          ru: "ул. Тверская, 1, Москва",
          zh: "莫斯科特维尔大街1号",
          en: "Tverskaya St, 1, Moscow",
        }),
      ]
    );

    // Get the actual store ID
    const [storeRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM stores WHERE code = 'MOSCOW-001' LIMIT 1"
    );
    const actualStoreId =
      (storeRows as mysql.RowDataPacket[])[0]?.id || storeId;
    console.log("Store created/exists: MOSCOW-001 (ID: " + actualStoreId + ")");

    // 3. Create admin user
    console.log("Creating admin user...");
    await connection.query(
      `
      INSERT IGNORE INTO admin_users (id, orgId, username, passwordHash, role, status, createdAt, updatedAt)
      VALUES (?, ?, 'admin', '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YeY8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y', 'HQ_ADMIN', 'ACTIVE', NOW(), NOW())
    `,
      [uuidv4(), actualOrgId]
    );
    console.log("Admin user created/exists");

    // 4. Create categories
    console.log("Creating categories...");
    const categoryData = [
      { slug: "milk-tea" },
      { slug: "fruit-tea" },
      { slug: "classic-tea" },
    ];

    const categoryIds: number[] = [];
    for (const cat of categoryData) {
      await connection.query(
        `
        INSERT IGNORE INTO categories (id, orgId, code, createdAt, updatedAt)
        VALUES (?, 1, ?, NOW(), NOW())
      `,
        [uuidv4(), cat.slug]
      );

      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id FROM categories WHERE code = ? LIMIT 1",
        [cat.slug]
      );
      if ((rows as mysql.RowDataPacket[]).length > 0) {
        categoryIds.push((rows as mysql.RowDataPacket[])[0].id);
      }
    }
    console.log("Created/found " + categoryIds.length + " categories");

    // 5. Create 15+ products (priced in RUB) with comprehensive Russian names
    console.log("Creating products...");
    const productData = [
      // Milk Tea - Category 0
      {
        name: "Классический молочный чай с жемчугом",
        price: 299,
        catIdx: 0,
        stock: 150,
      },
      { name: "Таро молочный чай", price: 349, catIdx: 0, stock: 120 },
      {
        name: "Коричневый сахар с жемчугом боба",
        price: 379,
        catIdx: 0,
        stock: 8,
      }, // LOW STOCK
      { name: "Матча латте с кремом", price: 329, catIdx: 0, stock: 95 },
      { name: "Тигровый молочный чай", price: 359, catIdx: 0, stock: 5 }, // LOW STOCK
      { name: "Орео молочный чай", price: 369, catIdx: 0, stock: 78 },
      // Fruit Tea - Category 1
      { name: "Манго фруктовый чай с алоэ", price: 359, catIdx: 1, stock: 110 },
      { name: "Персиковый улун с желе", price: 339, catIdx: 1, stock: 3 }, // LOW STOCK
      { name: "Грейпфрут зелёный чай", price: 319, catIdx: 1, stock: 88 },
      { name: "Клубничный смузи с молоком", price: 389, catIdx: 1, stock: 65 },
      { name: "Маракуйя фруктовый чай", price: 349, catIdx: 1, stock: 92 },
      { name: "Лимонный чай с мёдом", price: 289, catIdx: 1, stock: 7 }, // LOW STOCK
      // Classic Tea - Category 2
      { name: "Жасминовый зелёный чай", price: 249, catIdx: 2, stock: 200 },
      { name: "Улун чай премиум", price: 269, catIdx: 2, stock: 180 },
      { name: "Пуэр чай выдержанный", price: 289, catIdx: 2, stock: 45 },
      {
        name: "Зелёный чай с мёдом и лимоном",
        price: 279,
        catIdx: 2,
        stock: 130,
      },
    ];

    const productIds: string[] = [];
    let productsCreated = 0;
    for (const p of productData) {
      const catId = categoryIds[p.catIdx] || 1;
      const code = p.name.toLowerCase().replace(/\s+/g, "-").substring(0, 50);
      const productId = uuidv4();

      await connection.query(
        `
        INSERT IGNORE INTO products (id, orgId, categoryId, name, code, createdAt, updatedAt)
        VALUES (?, 1, ?, ?, ?, NOW(), NOW())
      `,
        [productId, catId, p.name, code]
      );

      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id FROM products WHERE name = ? LIMIT 1",
        [p.name]
      );
      if ((rows as mysql.RowDataPacket[]).length > 0) {
        productIds.push((rows as mysql.RowDataPacket[])[0].id);
        productsCreated++;
      }
    }
    console.log(
      "Created " +
        productsCreated +
        " new products (total: " +
        productIds.length +
        ")"
    );

    // 5b. Create inventory records with low stock warnings
    console.log("Creating inventory records...");
    let inventoryCreated = 0;
    for (let i = 0; i < productData.length; i++) {
      const p = productData[i];
      const lowStockThreshold = 10;
      await connection.query(
        `
        INSERT IGNORE INTO mall_inventory (id, productId, quantity, reservedQuantity, lowStockThreshold, createdAt, updatedAt)
        VALUES (?, ?, ?, 0, ?, NOW(), NOW())
      `,
        [uuidv4(), i + 1, p.stock, lowStockThreshold]
      );
      inventoryCreated++;
    }
    console.log(
      "Created " +
        inventoryCreated +
        " inventory records (4 with LOW STOCK warnings)"
    );

    // 6. Create 60+ historical orders with realistic distribution
    console.log("Creating historical orders...");
    const [orderCountRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM orders"
    );
    const orderCount = (orderCountRows as mysql.RowDataPacket[])[0].count;
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
        orderDate.setHours(9 + (hoursAgo % 12)); // Business hours 9-21

        // Realistic order amounts (1-4 items)
        const itemCount = Math.floor(Math.random() * 4) + 1;
        let totalAmount = 0;
        for (let j = 0; j < itemCount; j++) {
          totalAmount +=
            productData[Math.floor(Math.random() * productData.length)].price;
        }

        const status =
          orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

        await connection.query(
          `
          INSERT INTO orders (orderNumber, storeId, status, totalAmount, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            "ORD-" + Date.now() + "-" + i,
            actualStoreId,
            status,
            totalAmount,
            orderDate,
            orderDate,
          ]
        );
      }
      console.log(
        "Created " +
          ordersToCreate +
          " historical orders (distributed over 30 days)"
      );
    } else {
      console.log("Orders already exist (" + orderCount + " found)");
    }

    // 6b. Create daily sales summary for charts
    console.log("Creating daily sales summaries...");
    for (let day = 0; day < 30; day++) {
      const salesDate = new Date();
      salesDate.setDate(salesDate.getDate() - day);
      const dateStr = salesDate.toISOString().split("T")[0];

      // Random daily metrics
      const dailyOrders = Math.floor(Math.random() * 20) + 5;
      const dailyRevenue =
        dailyOrders * (Math.floor(Math.random() * 200) + 300);

      await connection.query(
        `
        INSERT INTO system_configs (id, configKey, configValue, valueType, description, createdAt, updatedAt)
        VALUES (?, ?, ?, 'JSON', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE configValue = VALUES(configValue), updatedAt = NOW()
      `,
        [
          uuidv4(),
          `sales.daily.${dateStr}`,
          JSON.stringify({
            orders: dailyOrders,
            revenue: dailyRevenue,
            date: dateStr,
          }),
          JSON.stringify({ en: "Daily sales data" }),
        ]
      );
    }
    console.log("Created 30 days of sales summary data");

    // 7. Create system configs
    console.log("Creating system configs...");
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
      await connection.query(
        `
        INSERT INTO system_configs (id, configKey, configValue, valueType, description, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE configValue = VALUES(configValue), updatedAt = NOW()
      `,
        [
          uuidv4(),
          config.key,
          JSON.stringify(config.value),
          config.type,
          JSON.stringify({ en: "System config: " + config.key }),
        ]
      );
    }
    console.log("Created/updated " + configs.length + " system configs");

    console.log("\nCHUTEA production seed completed successfully!");
    console.log("Summary:");
    console.log("  - 1 Organization (CHUCHUTEA)");
    console.log("  - 1 Admin User");
    console.log("  - 1 Store");
    console.log("  - 3 Categories");
    console.log("  - 16 Products (RUB 249-389)");
    console.log("  - 65 Historical Orders");
    console.log("  - 9 System Configs");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
