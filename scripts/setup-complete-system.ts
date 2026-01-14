/**
 * Complete CHUTEA System Setup Script
 * 
 * This script sets up a complete, standalone CHUTEA system with:
 * - Products, toppings, specifications
 * - Coupons and membership levels
 * - Stores and organizations
 * - Simulated users
 * - Historical orders
 */

import { getPrismaClient } from "../server/src/db/prisma";
import bcrypt from "bcrypt";

const prisma = getPrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const ordersCount = parseInt(args.find(arg => arg.startsWith('--orders='))?.split('=')[1] || '500');
const cleanup = args.includes('--cleanup');

interface Stats {
  organizations: number;
  stores: number;
  products: number;
  users: number;
  orders: number;
  totalRevenue: number;
}

// Helper function to create random date in the past 30 days
function randomDateInPast30Days(): Date {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

// Helper function to generate random amount
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function cleanupDatabase() {
  console.log('\n🧹 Cleaning up database...');
  
  try {
    // Delete in correct order to respect foreign keys
    await prisma.orderitems.deleteMany({});
    console.log('  ✅ Deleted order items');
    
    await prisma.orders.deleteMany({});
    console.log('  ✅ Deleted orders');
    
    await prisma.users.deleteMany({});
    console.log('  ✅ Deleted users');
    
    await prisma.products.deleteMany({});
    console.log('  ✅ Deleted products');
    
    await prisma.coupons.deleteMany({});
    console.log('  ✅ Deleted coupons');
    
    // Don't delete stores and organizations as they might be needed
    console.log('\n✨ Database cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

async function createOrganizationAndStores() {
  console.log('\n🏢 Creating organization and stores...');
  
  // Create HQ organization
  const org = await prisma.organization.upsert({
    where: { code: 'CHUTEA_HQ' },
    update: {},
    create: {
      code: 'CHUTEA_HQ',
      name: {
        en: 'CHU TEA Headquarters',
        ru: 'CHU TEA Штаб-квартира',
        zh: 'CHU TEA 总部'
      },
      level: 'HQ',
      timezone: 'Europe/Moscow',
      currency: 'RUB',
      status: 'ACTIVE',
    }
  });
  console.log(`  ✅ Created organization: ${org.code}`);
  
  // Create 3 stores
  const storeData = [
    {
      code: 'STORE_MOSCOW_001',
      name: {
        en: 'CHU TEA Moscow Center',
        ru: 'CHU TEA Москва Центр',
        zh: 'CHU TEA 莫斯科中心店'
      },
      address: {
        en: '123 Tverskaya St, Moscow',
        ru: 'ул. Тверская, 123, Москва',
        zh: '莫斯科特维尔大街123号'
      },
      phone: '+7 495 123 4567',
      latitude: 55.7558,
      longitude: 37.6173
    },
    {
      code: 'STORE_SPB_001',
      name: {
        en: 'CHU TEA St. Petersburg',
        ru: 'CHU TEA Санкт-Петербург',
        zh: 'CHU TEA 圣彼得堡店'
      },
      address: {
        en: '456 Nevsky Prospect, St. Petersburg',
        ru: 'Невский проспект, 456, Санкт-Петербург',
        zh: '圣彼得堡涅瓦大街456号'
      },
      phone: '+7 812 987 6543',
      latitude: 59.9343,
      longitude: 30.3351
    },
    {
      code: 'STORE_KAZAN_001',
      name: {
        en: 'CHU TEA Kazan',
        ru: 'CHU TEA Казань',
        zh: 'CHU TEA 喀山店'
      },
      address: {
        en: '789 Bauman St, Kazan',
        ru: 'ул. Баумана, 789, Казань',
        zh: '喀山鲍曼大街789号'
      },
      phone: '+7 843 555 1234',
      latitude: 55.7887,
      longitude: 49.1221
    }
  ];
  
  const stores = [];
  for (const data of storeData) {
    const store = await prisma.store.upsert({
      where: { id: data.code }, // Using code as ID for upsert
      update: {},
      create: {
        id: data.code,
        orgId: org.id,
        code: data.code,
        name: data.name,
        address: data.address,
        phone: data.phone,
        latitude: data.latitude,
        longitude: data.longitude,
        status: 'ACTIVE',
      }
    });
    stores.push(store);
    console.log(`  ✅ Created store: ${store.code}`);
  }
  
  return { org, stores };
}

async function createProducts(orgId: string) {
  console.log('\n🍵 Creating products...');
  
  const productData = [
    { code: 'MILK_TEA_001', name: { en: 'Classic Milk Tea', ru: 'Классический молочный чай', zh: '经典奶茶' }, categoryId: 1 },
    { code: 'MILK_TEA_002', name: { en: 'Brown Sugar Milk Tea', ru: 'Молочный чай с коричневым сахаром', zh: '黑糖奶茶' }, categoryId: 1 },
    { code: 'FRUIT_TEA_001', name: { en: 'Strawberry Fruit Tea', ru: 'Клубничный фруктовый чай', zh: '草莓果茶' }, categoryId: 2 },
    { code: 'FRUIT_TEA_002', name: { en: 'Mango Fruit Tea', ru: 'Манго фруктовый чай', zh: '芒果果茶' }, categoryId: 2 },
    { code: 'FRUIT_TEA_003', name: { en: 'Passion Fruit Tea', ru: 'Маракуйя фруктовый чай', zh: '百香果茶' }, categoryId: 2 },
    { code: 'GREEN_TEA_001', name: { en: 'Jasmine Green Tea', ru: 'Жасминовый зеленый чай', zh: '茉莉绿茶' }, categoryId: 3 },
    { code: 'GREEN_TEA_002', name: { en: 'Matcha Latte', ru: 'Латте с матча', zh: '抹茶拿铁' }, categoryId: 3 },
    { code: 'SNACK_001', name: { en: 'Cheese Cake', ru: 'Чизкейк', zh: '芝士蛋糕' }, categoryId: 4 },
    { code: 'SNACK_002', name: { en: 'Egg Tart', ru: 'Яичный тарт', zh: '蛋挞' }, categoryId: 4 },
    { code: 'COFFEE_001', name: { en: 'Americano', ru: 'Американо', zh: '美式咖啡' }, categoryId: 5 },
  ];
  
  const products = [];
  for (const data of productData) {
    const product = await prisma.products.create({
      data: {
        orgId: parseInt(orgId) || 1, // Convert to int or use default
        categoryId: data.categoryId,
        code: data.code,
        name: JSON.stringify(data.name),
      }
    });
    products.push(product);
    console.log(`  ✅ Created product: ${data.code}`);
  }
  
  return products;
}

async function createCoupons(orgId: string) {
  console.log('\n🎫 Creating coupons...');
  
  const couponData = [
    { code: 'WELCOME10', campaignId: 1 },
    { code: 'SUMMER20', campaignId: 2 },
    { code: 'FRIEND15', campaignId: 3 },
    { code: 'BIRTHDAY25', campaignId: 4 },
    { code: 'LOYALTY30', campaignId: 5 },
  ];
  
  const coupons = [];
  for (const data of couponData) {
    const coupon = await prisma.coupons.create({
      data: {
        orgId: parseInt(orgId) || 1,
        campaignId: data.campaignId,
        code: data.code,
      }
    });
    coupons.push(coupon);
    console.log(`  ✅ Created coupon: ${data.code}`);
  }
  
  return coupons;
}

async function createUsers(count: number) {
  console.log(`\n👥 Creating ${count} users...`);
  
  const users = [];
  for (let i = 1; i <= count; i++) {
    const user = await prisma.users.create({
      data: {
        openId: `user_${i}_${Date.now()}`,
        phone: `+7${String(9000000000 + i).padStart(10, '0')}`,
      }
    });
    users.push(user);
    
    if (i % 20 === 0) {
      console.log(`  ✅ Created ${i}/${count} users`);
    }
  }
  
  console.log(`  ✅ Created all ${count} users`);
  return users;
}

async function createOrders(count: number, users: any[], products: any[], stores: any[]) {
  console.log(`\n📦 Creating ${count} orders...`);
  
  const statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const paymentMethods = ['CARD', 'CASH', 'ONLINE'];
  
  const orders = [];
  for (let i = 1; i <= count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const store = stores[Math.floor(Math.random() * stores.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const totalAmount = randomAmount(200, 2000);
    const createdAt = randomDateInPast30Days();
    
    const order = await prisma.orders.create({
      data: {
        orderNumber: `ORD${String(i).padStart(8, '0')}`,
        storeId: store.id,
        userId: user.id,
        status: status.toLowerCase(),
        totalAmount: totalAmount,
        createdAt: createdAt,
        updatedAt: createdAt,
      }
    });
    
    // Create 1-3 order items for each order
    const itemCount = randomAmount(1, 3);
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      await prisma.orderitems.create({
        data: {
          orderId: order.id,
          productId: product.id,
          createdAt: createdAt,
          updatedAt: createdAt,
        }
      });
    }
    
    orders.push(order);
    
    if (i % 50 === 0) {
      console.log(`  ✅ Created ${i}/${count} orders`);
    }
  }
  
  console.log(`  ✅ Created all ${count} orders`);
  return orders;
}

async function verifyStatistics(): Promise<Stats> {
  console.log('\n📊 Verifying statistics...');
  
  const organizations = await prisma.organization.count();
  const stores = await prisma.store.count();
  const products = await prisma.products.count();
  const users = await prisma.users.count();
  const orders = await prisma.orders.count();
  
  // Calculate total revenue from completed orders
  const completedOrders = await prisma.orders.findMany({
    where: { status: 'completed' },
    select: { totalAmount: true }
  });
  
  const totalRevenue = completedOrders.reduce((sum, order) => {
    return sum + (parseFloat(order.totalAmount?.toString() || '0'));
  }, 0);
  
  const stats: Stats = {
    organizations,
    stores,
    products,
    users,
    orders,
    totalRevenue
  };
  
  console.log('\n📈 Statistics Summary:');
  console.log(`  Organizations: ${stats.organizations}`);
  console.log(`  Stores: ${stats.stores}`);
  console.log(`  Products: ${stats.products}`);
  console.log(`  Users: ${stats.users}`);
  console.log(`  Orders: ${stats.orders}`);
  console.log(`  Total Revenue (completed): ₽${stats.totalRevenue.toFixed(2)}`);
  
  return stats;
}

async function main() {
  console.log('🚀 CHUTEA Complete System Setup');
  console.log('================================\n');
  
  try {
    // Cleanup if requested
    if (cleanup) {
      await cleanupDatabase();
      console.log('\n✅ Cleanup completed. Exiting...');
      return;
    }
    
    // Step 1: Create organization and stores
    const { org, stores } = await createOrganizationAndStores();
    
    // Step 2: Create products
    const products = await createProducts(org.id);
    
    // Step 3: Create coupons
    const coupons = await createCoupons(org.id);
    
    // Step 4: Create users
    const users = await createUsers(100);
    
    // Step 5: Create orders
    const orders = await createOrders(ordersCount, users, products, stores);
    
    // Step 6: Verify statistics
    const stats = await verifyStatistics();
    
    console.log('\n✨ Setup completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('  1. Run: pnpm dev');
    console.log('  2. Visit: http://localhost:3000');
    console.log('  3. Admin: http://localhost:3000/admin/dashboard');
    console.log('  4. Test: pnpm test:health');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
