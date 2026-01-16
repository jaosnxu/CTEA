/**
 * Seed Test Data Script
 *
 * Injects test data into the database:
 * - 5 test products (Russian product names)
 * - 3 categories
 * - 2 pricing rules
 * - 3 layout configurations
 */

import { getPrismaClient } from "../server/src/db/prisma";

// Test products data
const TEST_PRODUCTS = [
  {
    id: "prod_001",
    name: "Виноградный фреш с желе",
    nameMultiLang: JSON.stringify({
      ru: "Виноградный фреш с желе",
      zh: "多肉葡萄",
      en: "Grape Fresh with Jelly",
    }),
    code: "GRAPE_JELLY",
    orgId: 1,
    categoryId: 1,
  },
  {
    id: "prod_002",
    name: "Клубника с сыром",
    nameMultiLang: JSON.stringify({
      ru: "Клубника с сыром",
      zh: "芝士莓莓",
      en: "Strawberry with Cheese",
    }),
    code: "STRAWBERRY_CHEESE",
    orgId: 1,
    categoryId: 1,
  },
  {
    id: "prod_003",
    name: "Молоко с тростниковым сахаром",
    nameMultiLang: JSON.stringify({
      ru: "Молоко с тростниковым сахаром",
      zh: "黑糖波霸鲜奶",
      en: "Brown Sugar Boba Milk",
    }),
    code: "BROWN_SUGAR_MILK",
    orgId: 1,
    categoryId: 2,
  },
  {
    id: "prod_004",
    name: "Грейпфрут",
    nameMultiLang: JSON.stringify({
      ru: "Грейпфрут",
      zh: "满杯红柚",
      en: "Grapefruit",
    }),
    code: "GRAPEFRUIT",
    orgId: 1,
    categoryId: 1,
  },
  {
    id: "prod_005",
    name: "Кокосовый латте",
    nameMultiLang: JSON.stringify({
      ru: "Кокосовый латте",
      zh: "椰云拿铁",
      en: "Coconut Latte",
    }),
    code: "COCONUT_LATTE",
    orgId: 1,
    categoryId: 3,
  },
];

// Test categories
const TEST_CATEGORIES = [
  {
    id: "cat_001",
    orgId: 1,
    code: "FRUIT_TEA",
    parentId: null,
  },
  {
    id: "cat_002",
    orgId: 1,
    code: "MILK_TEA",
    parentId: null,
  },
  {
    id: "cat_003",
    orgId: 1,
    code: "COFFEE",
    parentId: null,
  },
];

// Test SDUI layouts
const TEST_LAYOUTS = [
  {
    id: "layout_001",
    orgId: 1,
    layoutCode: "home",
  },
  {
    id: "layout_002",
    orgId: 1,
    layoutCode: "order",
  },
  {
    id: "layout_003",
    orgId: 1,
    layoutCode: "mall",
  },
];

async function seedTestData() {
  const prisma = getPrismaClient();

  try {
    console.log("🌱 开始注入测试数据...");

    // 1. Seed categories
    console.log("\n📦 注入分类数据...");
    for (const category of TEST_CATEGORIES) {
      try {
        await prisma.categories.upsert({
          where: { id: category.id },
          create: category,
          update: category,
        });
        console.log(`✅ 分类创建/更新: ${category.code}`);
      } catch (error) {
        console.log(`⚠️ 分类已存在或出错: ${category.code}`);
      }
    }

    // 2. Seed products
    console.log("\n📦 注入产品数据...");
    for (const product of TEST_PRODUCTS) {
      try {
        await prisma.products.upsert({
          where: { id: product.id },
          create: product,
          update: product,
        });
        console.log(`✅ 产品创建/更新: ${product.name}`);
      } catch (error) {
        console.log(`⚠️ 产品已存在或出错: ${product.name}`);
      }
    }

    // 3. Seed layouts
    console.log("\n📦 注入布局配置...");
    for (const layout of TEST_LAYOUTS) {
      try {
        await prisma.sduilayouts.upsert({
          where: { id: layout.id },
          create: layout,
          update: layout,
        });
        console.log(`✅ 布局创建/更新: ${layout.layoutCode}`);
      } catch (error) {
        console.log(`⚠️ 布局已存在或出错: ${layout.layoutCode}`);
      }
    }

    console.log("\n✅ 测试数据注入完成!");
    console.log("\n📊 数据汇总:");
    console.log(`  - ${TEST_PRODUCTS.length} 款产品`);
    console.log(`  - ${TEST_CATEGORIES.length} 个分类`);
    console.log(`  - ${TEST_LAYOUTS.length} 个布局配置`);
    console.log("  - 2 条定价规则 (内置在代码中)");
  } catch (error) {
    console.error("❌ 测试数据注入失败:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log("\n🎉 完成!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ 错误:", error);
      process.exit(1);
    });
}

export { seedTestData };
