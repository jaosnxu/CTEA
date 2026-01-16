/**
 * Admin Products API Routes
 *
 * Endpoints:
 * - GET /api/admin/products - Get products list
 * - GET /api/admin/products/:id - Get product details
 * - POST /api/admin/products - Create product
 * - PUT /api/admin/products/:id - Update product
 * - DELETE /api/admin/products/:id - Delete product
 * - GET /api/admin/products/stats/summary - Get statistics
 * - POST /api/admin/products/batch-update - Batch update
 */

import { Router } from "express";
import { productEngine } from "../../engines/product-engine";

const router = Router();

/**
 * GET /api/admin/products/stats/summary
 * Get product statistics
 */
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await productEngine.getProductStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error getting stats:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get statistics",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/products
 * Get products list with filters
 */
router.get("/", async (req, res) => {
  try {
    const { category, search, status } = req.query;

    const filters = {
      category: category as string,
      search: search as string,
      status: status as string,
    };

    const products = await productEngine.getProducts(filters);

    res.json({
      success: true,
      data: products,
      count: products.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error getting products:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get products",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/products/:id
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
    console.error("[Admin Products] Error getting product:", error);
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Product not found",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/products
 * Create new product
 */
router.post("/", async (req, res) => {
  try {
    const productData = req.body;
    const product = await productEngine.createProduct(productData);

    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error creating product:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create product",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await productEngine.updateProduct(id, updates);

    res.json({
      success: true,
      data: product,
      message: "Product updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error updating product:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update product",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await productEngine.deleteProduct(id);

    res.json({
      success: true,
      message: "Product deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error deleting product:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete product",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/products/batch-update
 * Batch update products
 */
router.post("/batch-update", async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product IDs",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await productEngine.batchUpdateProducts(ids, updates);

    res.json({
      success: true,
      data: result,
      message: `Successfully updated ${result.updated} products`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error batch updating products:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to batch update products",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/products/:id/pricing-rules
 * Get pricing rules associated with a product
 */
router.get("/:id/pricing-rules", async (req, res) => {
  try {
    const { id } = req.params;
    const ruleIds = await productEngine.getProductPricingRules(parseInt(id));

    res.json({
      success: true,
      data: ruleIds,
      count: ruleIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error getting pricing rules:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get pricing rules",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/admin/products/:id/pricing-rules
 * Update pricing rules for a product
 */
router.put("/:id/pricing-rules", async (req, res) => {
  try {
    const { id } = req.params;
    const { ruleIds } = req.body;

    if (!Array.isArray(ruleIds)) {
      return res.status(400).json({
        success: false,
        message: "ruleIds must be an array",
        timestamp: new Date().toISOString(),
      });
    }

    await productEngine.updateProductPricingRules(parseInt(id), ruleIds);

    res.json({
      success: true,
      message: "Pricing rules updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Products] Error updating pricing rules:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update pricing rules",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
