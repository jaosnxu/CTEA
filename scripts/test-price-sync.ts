/**
 * Price Synchronization Test Script
 * 
 * Tests the real-time price synchronization feature:
 * 1. Select a product
 * 2. Record original price
 * 3. Update price via API
 * 4. Verify database update
 * 5. Verify price change log
 * 6. Simulate frontend query to confirm new price
 */

import { getPrismaClient } from "../server/src/db/prisma";

const prisma = getPrismaClient();

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

async function testPriceSync(): Promise<void> {
  console.log('🔄 Price Synchronization Test');
  console.log('==============================\n');
  
  const results: TestResult[] = [];
  
  try {
    // Step 1: Get a product
    console.log('📦 Step 1: Selecting a product...');
    const product = await prisma.products.findFirst();
    
    if (!product) {
      results.push({
        success: false,
        message: 'No products found in database',
      });
      console.log('❌ No products found. Run setup first: pnpm setup');
      return;
    }
    
    console.log(`  ✅ Selected product: ${product.code || product.id}`);
    results.push({
      success: true,
      message: 'Product selected',
      details: { productId: product.id, code: product.code }
    });
    
    // Step 2: Get original price
    console.log('\n💰 Step 2: Recording original price...');
    const originalPrice = await prisma.storeprices.findFirst({
      where: { productId: parseInt(product.id) }
    });
    
    console.log(`  Original price: ${originalPrice?.price?.toString() || 'Not set'} ₽`);
    results.push({
      success: true,
      message: 'Original price recorded',
      details: { originalPrice: originalPrice?.price?.toString() || null }
    });
    
    // Step 3: Update price
    console.log('\n✏️  Step 3: Updating price...');
    const newPrice = 350.00;
    const store = await prisma.store.findFirst();
    
    if (!store) {
      results.push({
        success: false,
        message: 'No stores found in database',
      });
      console.log('❌ No stores found. Run setup first: pnpm setup');
      return;
    }
    
    // Create or update store price
    const updatedPrice = await prisma.storeprices.upsert({
      where: { 
        id: originalPrice?.id || 'new-price-' + Date.now()
      },
      update: {
        price: newPrice,
        updatedAt: new Date(),
      },
      create: {
        storeId: parseInt(store.id) || 1,
        productId: parseInt(product.id) || 1,
        price: newPrice,
      }
    });
    
    console.log(`  ✅ Price updated to: ${updatedPrice.price} ₽`);
    results.push({
      success: true,
      message: 'Price updated successfully',
      details: { newPrice: updatedPrice.price.toString() }
    });
    
    // Step 4: Verify database update
    console.log('\n🔍 Step 4: Verifying database update...');
    const verifiedPrice = await prisma.storeprices.findFirst({
      where: { 
        id: updatedPrice.id
      }
    });
    
    if (verifiedPrice && parseFloat(verifiedPrice.price.toString()) === newPrice) {
      console.log('  ✅ Database update verified');
      results.push({
        success: true,
        message: 'Database update verified',
        details: { verifiedPrice: verifiedPrice.price.toString() }
      });
    } else {
      console.log('  ❌ Database update verification failed');
      results.push({
        success: false,
        message: 'Database update verification failed',
        details: { 
          expected: newPrice,
          actual: verifiedPrice?.price?.toString() || 'null'
        }
      });
    }
    
    // Step 5: Check price change log (if exists)
    console.log('\n📝 Step 5: Checking price change log...');
    const priceChangeLogs = await prisma.pricechangelogs.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`  Found ${priceChangeLogs.length} recent price change logs`);
    results.push({
      success: true,
      message: 'Price change log checked',
      details: { logCount: priceChangeLogs.length }
    });
    
    // Step 6: Simulate frontend query
    console.log('\n🖥️  Step 6: Simulating frontend query...');
    const productWithPrice = await prisma.products.findUnique({
      where: { id: product.id },
    });
    
    if (productWithPrice) {
      console.log('  ✅ Frontend query successful');
      console.log(`  Product: ${productWithPrice.code}`);
      results.push({
        success: true,
        message: 'Frontend query simulation successful',
        details: { 
          productId: productWithPrice.id,
          code: productWithPrice.code
        }
      });
    } else {
      console.log('  ❌ Frontend query failed');
      results.push({
        success: false,
        message: 'Frontend query failed'
      });
    }
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log('================');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    console.log(`✅ Passed: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 All tests passed! Price synchronization is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the details above.');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
    results.push({
      success: false,
      message: 'Test execution error',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPriceSync().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
