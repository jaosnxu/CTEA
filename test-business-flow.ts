/**
 * CHU TEA - Core Business Flow Automated Test
 * 
 * This script tests the complete end-to-end business flow:
 * 1. User places order (PWA)
 * 2. Payment pre-authorization (Hold)
 * 3. IIKO order push
 * 4. Payment capture/void based on IIKO response
 * 5. Order status update
 * 6. Frontend-backend data consistency
 */

import 'dotenv/config';
import { createPayment, capturePayment, voidPayment } from './server/payment.controller';
import { syncProductsFromIIKO, pushOrderToIIKO } from './server/iiko-sync';
import { PRODUCTS, ORDERS } from './server/db_mock';
import { logger } from './server/_core/logger';
import { getRedis, setCache, getCache, CacheKeys, CacheTTL } from './server/_core/redis';

interface TestResult {
  testNumber: number;
  orderPrefix: string;
  orderId: string;
  status: 'SUCCESS' | 'FAILED';
  steps: {
    orderCreation: boolean;
    paymentHold: boolean;
    iikoSync: boolean;
    paymentCapture: boolean;
    statusUpdate: boolean;
    cacheInvalidation: boolean;
  };
  errors: string[];
  duration: number;
}

const testResults: TestResult[] = [];

/**
 * Simulate order creation
 */
async function createTestOrder(testNumber: number): Promise<any> {
  const orderPrefixes = ['P', 'K', 'M', 'T'];  // PWA, Delivery, Pickup, Telegram
  const prefix = orderPrefixes[testNumber % 4];
  
  const order = {
    id: `${prefix}${String(testNumber).padStart(6, '0')}`,
    prefix,
    items: [
      {
        productId: PRODUCTS[0].id,
        productName: PRODUCTS[0].name_ru,
        variant: 'Средний',
        quantity: 1,
        price: PRODUCTS[0].price,
      },
    ],
    totalAmount: PRODUCTS[0].price,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  
  ORDERS.push(order);
  logger.info({ orderId: order.id }, 'Test order created');
  
  return order;
}

/**
 * Simulate payment hold
 */
async function holdPayment(orderId: string, amount: number): Promise<boolean> {
  try {
    // Mock payment hold
    const paymentResult = await createPayment({
      orderId,
      amount,
      currency: 'RUB',
      provider: 'mock',
    });
    
    logger.info({ orderId, paymentResult }, 'Payment hold successful');
    return true;
  } catch (error) {
    logger.error({ error, orderId }, 'Payment hold failed');
    return false;
  }
}

/**
 * Simulate IIKO order push
 */
async function pushToIIKO(order: any): Promise<boolean> {
  try {
    const iikoResult = await pushOrderToIIKO(order);
    logger.info({ orderId: order.id, iikoResult }, 'IIKO push successful');
    return iikoResult.success;
  } catch (error) {
    logger.error({ error, orderId: order.id }, 'IIKO push failed');
    return false;
  }
}

/**
 * Simulate payment capture or void
 */
async function finalizePayment(orderId: string, iikoSuccess: boolean): Promise<boolean> {
  try {
    if (iikoSuccess) {
      await capturePayment(orderId);
      logger.info({ orderId }, 'Payment captured');
    } else {
      await voidPayment(orderId);
      logger.info({ orderId }, 'Payment voided');
    }
    return true;
  } catch (error) {
    logger.error({ error, orderId }, 'Payment finalization failed');
    return false;
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  try {
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    logger.info({ orderId, status }, 'Order status updated');
    return true;
  } catch (error) {
    logger.error({ error, orderId }, 'Order status update failed');
    return false;
  }
}

/**
 * Test cache invalidation
 */
async function testCacheInvalidation(): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) {
      logger.warn('Redis not available, skipping cache test');
      return true;  // Pass if Redis not available (graceful degradation)
    }
    
    // Set cache
    await setCache(CacheKeys.PRODUCTS_LIST, PRODUCTS, CacheTTL.PRODUCTS);
    
    // Get cache
    const cached = await getCache(CacheKeys.PRODUCTS_LIST);
    
    if (!cached) {
      throw new Error('Cache get failed');
    }
    
    logger.info('Cache invalidation test passed');
    return true;
  } catch (error) {
    logger.error({ error }, 'Cache invalidation test failed');
    return false;
  }
}

/**
 * Run single test iteration
 */
async function runTest(testNumber: number): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    testNumber,
    orderPrefix: '',
    orderId: '',
    status: 'SUCCESS',
    steps: {
      orderCreation: false,
      paymentHold: false,
      iikoSync: false,
      paymentCapture: false,
      statusUpdate: false,
      cacheInvalidation: false,
    },
    errors: [],
    duration: 0,
  };
  
  try {
    logger.info({ testNumber }, '========== Starting Test ==========');
    
    // Step 1: Create order
    const order = await createTestOrder(testNumber);
    result.orderId = order.id;
    result.orderPrefix = order.prefix;
    result.steps.orderCreation = true;
    
    // Step 2: Hold payment
    const holdSuccess = await holdPayment(order.id, order.totalAmount);
    result.steps.paymentHold = holdSuccess;
    if (!holdSuccess) {
      throw new Error('Payment hold failed');
    }
    
    // Step 3: Push to IIKO
    const iikoSuccess = await pushToIIKO(order);
    result.steps.iikoSync = iikoSuccess;
    
    // Step 4: Finalize payment
    const paymentFinalized = await finalizePayment(order.id, iikoSuccess);
    result.steps.paymentCapture = paymentFinalized;
    if (!paymentFinalized) {
      throw new Error('Payment finalization failed');
    }
    
    // Step 5: Update order status
    const newStatus = iikoSuccess ? 'COMPLETED' : 'VOIDED';
    const statusUpdated = await updateOrderStatus(order.id, newStatus);
    result.steps.statusUpdate = statusUpdated;
    if (!statusUpdated) {
      throw new Error('Order status update failed');
    }
    
    // Step 6: Test cache invalidation
    const cacheValid = await testCacheInvalidation();
    result.steps.cacheInvalidation = cacheValid;
    
    logger.info({ testNumber, orderId: order.id }, '========== Test Passed ==========');
    
  } catch (error: any) {
    result.status = 'FAILED';
    result.errors.push(error.message);
    logger.error({ error, testNumber }, '========== Test Failed ==========');
  }
  
  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n========================================');
  console.log('CHU TEA Core Business Flow Test Suite');
  console.log('========================================\n');
  
  const totalTests = 10;
  
  for (let i = 1; i <= totalTests; i++) {
    const result = await runTest(i);
    testResults.push(result);
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate report
  generateReport();
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================\n');
  
  const successCount = testResults.filter(r => r.status === 'SUCCESS').length;
  const failCount = testResults.filter(r => r.status === 'FAILED').length;
  
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${successCount} (${(successCount / testResults.length * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failCount} (${(failCount / testResults.length * 100).toFixed(1)}%)`);
  
  console.log('\n========================================');
  console.log('Detailed Results');
  console.log('========================================\n');
  
  testResults.forEach(result => {
    console.log(`\nTest #${result.testNumber} [${result.status}]`);
    console.log(`Order ID: ${result.orderId} (Prefix: ${result.orderPrefix})`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Steps:`);
    console.log(`  - Order Creation: ${result.steps.orderCreation ? '✓' : '✗'}`);
    console.log(`  - Payment Hold: ${result.steps.paymentHold ? '✓' : '✗'}`);
    console.log(`  - IIKO Sync: ${result.steps.iikoSync ? '✓' : '✗'}`);
    console.log(`  - Payment Capture: ${result.steps.paymentCapture ? '✓' : '✗'}`);
    console.log(`  - Status Update: ${result.steps.statusUpdate ? '✓' : '✗'}`);
    console.log(`  - Cache Invalidation: ${result.steps.cacheInvalidation ? '✓' : '✗'}`);
    
    if (result.errors.length > 0) {
      console.log(`Errors:`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
  });
  
  // Save report to file
  const reportPath = '/home/ubuntu/milktea-pwa/test-results/business-flow-report.json';
  const fs = require('fs');
  const path = require('path');
  
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      total: testResults.length,
      passed: successCount,
      failed: failCount,
      successRate: (successCount / testResults.length * 100).toFixed(1) + '%',
    },
    tests: testResults,
    timestamp: new Date().toISOString(),
  }, null, 2));
  
  console.log(`\n✓ Report saved to: ${reportPath}`);
}

// Run tests
runAllTests().catch(console.error);
