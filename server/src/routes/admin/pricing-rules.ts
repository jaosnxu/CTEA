/**
 * Admin Pricing Rules API Routes
 *
 * Endpoints:
 * - GET /api/admin/pricing-rules - Get pricing rules list (with filtering, pagination, sorting)
 * - GET /api/admin/pricing-rules/:id - Get pricing rule details
 * - POST /api/admin/pricing-rules - Create pricing rule
 * - PUT /api/admin/pricing-rules/:id - Update pricing rule
 * - DELETE /api/admin/pricing-rules/:id - Delete pricing rule (soft delete)
 * - GET /api/admin/pricing-rules/:id/products - Get products affected by a rule
 */

import { Router } from "express";
import { pricingEngine } from "../../engines/pricing-engine";

const router = Router();

/**
 * GET /api/admin/pricing-rules
 * Get all pricing rules with filtering, pagination, and sorting
 * Query params:
 * - page: number (default: 1)
 * - perPage: number (default: 20, max: 100)
 * - sortBy: string (default: "priority")
 * - sortOrder: "asc" | "desc" (default: "desc")
 * - isActive: boolean (optional)
 * - search: string (optional - searches in name/description)
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      perPage = "20",
      sortBy = "priority",
      sortOrder = "desc",
      isActive,
      search,
    } = req.query;

    // Get all rules
    const allRules = await pricingEngine.getPricingRules();

    // Apply filters
    let filteredRules = allRules;

    // Filter by active status
    if (isActive !== undefined) {
      const activeFilter = isActive === "true";
      filteredRules = filteredRules.filter(
        rule => rule.isActive === activeFilter
      );
    }

    // Filter by search term
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      filteredRules = filteredRules.filter(rule => {
        const name = typeof rule.name === "string" ? rule.name : JSON.stringify(rule.name);
        const description = typeof rule.description === "string" ? rule.description : JSON.stringify(rule.description);
        return (
          name.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort rules
    const sortField = sortBy as string;
    const sortDir = sortOrder === "asc" ? 1 : -1;
    filteredRules.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal < bVal) return -1 * sortDir;
      if (aVal > bVal) return 1 * sortDir;
      return 0;
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(perPage as string)));
    const startIdx = (pageNum - 1) * pageSizeNum;
    const endIdx = startIdx + pageSizeNum;
    const paginatedRules = filteredRules.slice(startIdx, endIdx);

    res.json({
      success: true,
      data: paginatedRules,
      pagination: {
        page: pageNum,
        perPage: pageSizeNum,
        total: filteredRules.length,
        totalPages: Math.ceil(filteredRules.length / pageSizeNum),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error getting rules:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get pricing rules",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/pricing-rules/:id
 * Get single pricing rule details
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rules = await pricingEngine.getPricingRules();
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Pricing rule not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error getting rule:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to get pricing rule",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/pricing-rules
 * Create new pricing rule
 */
router.post("/", async (req, res) => {
  try {
    const ruleData = req.body;
    const rule = await pricingEngine.createPricingRule(ruleData);

    res.status(201).json({
      success: true,
      data: rule,
      message: "Pricing rule created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error creating rule:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create pricing rule",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /api/admin/pricing-rules/:id
 * Update pricing rule
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await pricingEngine.updatePricingRule(id, updates);

    res.json({
      success: true,
      data: rule,
      message: "Pricing rule updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error updating rule:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update pricing rule",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/admin/pricing-rules/:id
 * Delete pricing rule (soft delete - sets isActive to false)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pricingEngine.deletePricingRule(id);

    res.json({
      success: true,
      message: "Pricing rule deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error deleting rule:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete pricing rule",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/pricing-rules/:id/products
 * Get products affected by a pricing rule
 */
router.get("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    const productIds = await pricingEngine.getProductsByRule(id);

    res.json({
      success: true,
      data: productIds,
      count: productIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin Pricing Rules] Error getting products:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get products",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
