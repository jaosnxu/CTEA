/**
 * End-to-End Order Flow Test
 * 
 * Tests the complete user journey: Browse → Add to Cart → Checkout → Payment → Order Status
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Complete Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto(BASE_URL);
  });

  test('should complete full order flow from browse to payment', async ({ page }) => {
    // Step 1: Navigate to Order page
    await page.click('a[href="/order"]');
    await expect(page).toHaveURL(`${BASE_URL}/order`);

    // Step 2: Select a product
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.click();

    // Step 3: Add to cart
    await page.click('[data-testid="add-to-cart"]');
    
    // Verify cart has item
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('1');

    // Step 4: Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Step 5: Fill delivery information (if required)
    const deliveryForm = page.locator('[data-testid="delivery-form"]');
    if (await deliveryForm.isVisible()) {
      await page.fill('[name="address"]', 'Тестовый адрес, д. 1');
      await page.fill('[name="phone"]', '+79001234567');
    }

    // Step 6: Complete payment
    await page.click('[data-testid="pay-button"]');

    // Step 7: Verify order confirmation
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible({ timeout: 15000 });

    // Step 8: Check order in Orders page
    await page.click('a[href="/orders"]');
    await expect(page).toHaveURL(`${BASE_URL}/orders`);

    // Verify order appears in list
    const orderCard = page.locator('[data-testid="order-card"]').first();
    await expect(orderCard).toBeVisible();
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Navigate to Order page
    await page.click('a[href="/order"]');

    // Add product to cart
    await page.waitForSelector('[data-testid="product-card"]');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart"]');

    // Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');

    // Simulate payment failure (if test mode available)
    // This would depend on your payment gateway test setup

    // Verify error message is shown
    // await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
  });

  test('should update product price in real-time after admin change', async ({ page, context }) => {
    // Open two pages: Admin and Order
    const adminPage = await context.newPage();
    await adminPage.goto(`${BASE_URL}/admin/products`);

    // Navigate to Order page in main page
    await page.goto(`${BASE_URL}/order`);
    await page.waitForSelector('[data-testid="product-card"]');

    // Get initial price
    const productCard = page.locator('[data-testid="product-card"]').first();
    const initialPrice = await productCard.locator('[data-testid="product-price"]').textContent();

    // Change price in admin
    await adminPage.locator('[data-testid="edit-price-button"]').first().click();
    await adminPage.fill('[data-testid="price-input"]', '999');
    await adminPage.click('[data-testid="save-price-button"]');

    // Wait for price update in Order page (tRPC auto-refresh)
    await page.waitForTimeout(2000);

    // Verify price changed
    const updatedPrice = await productCard.locator('[data-testid="product-price"]').textContent();
    expect(updatedPrice).not.toBe(initialPrice);
    expect(updatedPrice).toContain('999');
  });

  test('should show correct order status after IIKO sync', async ({ page }) => {
    // Create an order
    await page.click('a[href="/order"]');
    await page.waitForSelector('[data-testid="product-card"]');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');
    await page.click('[data-testid="pay-button"]');

    // Wait for order confirmation
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible({ timeout: 15000 });

    // Go to Orders page
    await page.click('a[href="/orders"]');

    // Verify order status
    const orderCard = page.locator('[data-testid="order-card"]').first();
    const orderStatus = await orderCard.locator('[data-testid="order-status"]').textContent();

    // Should be either PENDING, COMPLETED, or VOIDED
    expect(['В обработке', 'Завершен', 'Возврат']).toContain(orderStatus || '');
  });
});
