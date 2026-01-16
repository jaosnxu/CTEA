/**
 * Client Products API Routes
 *
 * Endpoints:
 * - GET /api/client/products - Get products list
 * - GET /api/client/products/:id - Get product details
 * - POST /api/client/products/:id/calculate-price - Calculate price with rules
 */

import { Router } from "express";
import { productEngine } from "../../engines/product-engine";
import { pricingEngine } from "../../engines/pricing-engine";

const router = Router();

/**
 * GET /api/client/products
 * Get products list with filters
 */
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    const filters = {
      category: category as string,
      search: search as string,
    };

    const products = await productEngine.getProducts(filters);

    res.json({
      success: true,
      data: products,
      count: products.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Client Products] Error getting products:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get products",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/client/products/:id
 * Get single product details
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productEngine.getProductById(id);

    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Client Products] Error getting product:", error);
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Product not found",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/client/products/:id/calculate-price
 * Calculate product price with dynamic pricing rules
 */
router.post("/:id/calculate-price", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, storeId, quantity, timestamp } = req.body;

    // First, verify product exists
    await productEngine.getProductById(id);

    // Calculate price with rules
    const pricingResult = await pricingEngine.calculatePrice({
      productId: id,
      userId,
      storeId,
      quantity,
      timestamp,
    });

    res.json({
      success: true,
      data: pricingResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Client Products] Error calculating price:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to calculate price",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
