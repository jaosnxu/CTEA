/**
 * CHUTEA Production Seed Script
 *
 * Creates initial data for production environment:
 * - 1 default organization (CHUCHUTEA)
 * - 1 admin user
 * - 10+ products (priced in ₽)
 * - 50+ historical orders
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Starting CHUTEA production seed...");

  try {
    // 1. Create default organization
    console.log("📦 Creating organization...");
    const org = await prisma.organizations.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "CHUCHUTEA",
        slug: "chuchutea",
        type: "FRANCHISE",
        status: "ACTIVE",
        settings: {
          currency: "RUB",
          timezone: "Europe/Moscow",
          language: "ru",
        },
      },
    });
    console.log(`✅ Organization created: ${org.name} (ID: ${org.id})`);

    // 2. Create admin user
    console.log("👤 Creating admin user...");
    const admin = await prisma.adminUsers.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        username: "admin",
        passwordHash:
          "$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8YeY8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y",
        role: "HQ_ADMIN",
        status: "ACTIVE",
        orgId: 1,
      },
    });
    console.log(`✅ Admin user created: ${admin.username} (ID: ${admin.id})`);

    // 3. Create store
    console.log("🏪 Creating store...");
    const store = await prisma.stores.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "CHUCHUTEA Moscow Central",
        nameRu: "ЧУЧУТЕА Москва Центр",
        address: "ул. Тверская, 1, Москва",
        phone: "+7 495 123 4567",
        status: "ACTIVE",
        orgId: 1,
        settings: {
          openTime: "09:00",
          closeTime: "22:00",
          deliveryRadius: 5,
        },
      },
    });
    console.log(`✅ Store created: ${store.name} (ID: ${store.id})`);

    // 4. Create categories
    console.log("📂 Creating categories...");
    const categories = [
      {
        name: "Молочный чай",
        nameRu: "Молочный чай",
        nameZh: "奶茶",
        slug: "milk-tea",
      },
      {
        name: "Фруктовый чай",
        nameRu: "Фруктовый чай",
        nameZh: "水果茶",
        slug: "fruit-tea",
      },
      {
        name: "Классический чай",
        nameRu: "Классический чай",
        nameZh: "经典茶",
        slug: "classic-tea",
      },
    ];

    for (let i = 0; i < categories.length; i++) {
      await prisma.categories.upsert({
        where: { id: i + 1 },
        update: {},
        create: {
          id: i + 1,
          ...categories[i],
          sortOrder: i + 1,
          isActive: true,
          orgId: 1,
        },
      });
    }
    console.log(`✅ Created ${categories.length} categories`);

    // 5. Create 12 products (priced in ₽)
    console.log("🧋 Creating products...");
    const products = [
      {
        name: "Классический молочный чай",
        nameRu: "Классический молочный чай",
        nameZh: "经典奶茶",
        price: 299,
        categoryId: 1,
      },
      {
        name: "Таро молочный чай",
        nameRu: "Таро молочный чай",
        nameZh: "芋头奶茶",
        price: 349,
        categoryId: 1,
      },
      {
        name: "Коричневый сахар с жемчугом",
        nameRu: "Коричневый сахар с жемчугом",
        nameZh: "黑糖珍珠奶茶",
        price: 379,
        categoryId: 1,
      },
      {
        name: "Матча латте",
        nameRu: "Матча латте",
        nameZh: "抹茶拿铁",
        price: 329,
        categoryId: 1,
      },
      {
        name: "Манго фруктовый чай",
        nameRu: "Манго фруктовый чай",
        nameZh: "芒果水果茶",
        price: 359,
        categoryId: 2,
      },
      {
        name: "Персиковый улун",
        nameRu: "Персиковый улун",
        nameZh: "蜜桃乌龙",
        price: 339,
        categoryId: 2,
      },
      {
        name: "Грейпфрут зелёный чай",
        nameRu: "Грейпфрут зелёный чай",
        nameZh: "葡萄柚绿茶",
        price: 319,
        categoryId: 2,
      },
      {
        name: "Клубничный смузи",
        nameRu: "Клубничный смузи",
        nameZh: "草莓冰沙",
        price: 389,
        categoryId: 2,
      },
      {
        name: "Жасминовый чай",
        nameRu: "Жасминовый чай",
        nameZh: "茉莉花茶",
        price: 249,
        categoryId: 3,
      },
      {
        name: "Улун чай",
        nameRu: "Улун чай",
        nameZh: "乌龙茶",
        price: 269,
        categoryId: 3,
      },
      {
        name: "Пуэр чай",
        nameRu: "Пуэр чай",
        nameZh: "普洱茶",
        price: 289,
        categoryId: 3,
      },
      {
        name: "Зелёный чай с мёдом",
        nameRu: "Зелёный чай с мёдом",
        nameZh: "蜂蜜绿茶",
        price: 279,
        categoryId: 3,
      },
    ];

    for (let i = 0; i < products.length; i++) {
      await prisma.products.upsert({
        where: { id: i + 1 },
        update: {},
        create: {
          id: i + 1,
          name: products[i].name,
          nameRu: products[i].nameRu,
          nameZh: products[i].nameZh,
          description: `Вкусный ${products[i].nameRu}`,
          descriptionRu: `Вкусный ${products[i].nameRu}`,
          descriptionZh: `美味的${products[i].nameZh}`,
          price: products[i].price,
          currency: "RUB",
          categoryId: products[i].categoryId,
          isActive: true,
          orgId: 1,
          storeId: 1,
        },
      });
    }
    console.log(`✅ Created ${products.length} products`);

    // 6. Create 55 historical orders
    console.log("📋 Creating historical orders...");
    const orderStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED"];
    const paymentMethods = ["CARD", "CASH", "ONLINE"];

    for (let i = 1; i <= 55; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      const productIndex = Math.floor(Math.random() * products.length);
      const quantity = Math.floor(Math.random() * 3) + 1;
      const totalAmount = products[productIndex].price * quantity;

      await prisma.orders.upsert({
        where: { id: i },
        update: {},
        create: {
          id: i,
          orderNumber: `ORD-${String(i).padStart(6, "0")}`,
          status: orderStatuses[
            Math.floor(Math.random() * orderStatuses.length)
          ] as any,
          totalAmount: totalAmount,
          currency: "RUB",
          paymentMethod:
            paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          paymentStatus: "PAID",
          storeId: 1,
          orgId: 1,
          createdAt: orderDate,
          updatedAt: orderDate,
        },
      });
    }
    console.log(`✅ Created 55 historical orders`);

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
      await prisma.systemConfig.upsert({
        where: {
          configKey_orgId_storeId: {
            configKey: config.key,
            orgId: null,
            storeId: null,
          },
        },
        update: { configValue: config.value },
        create: {
          configKey: config.key,
          configValue: config.value,
          valueType: config.type,
          description: `System config: ${config.key}`,
        },
      });
    }
    console.log(`✅ Created ${configs.length} system configs`);

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
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
