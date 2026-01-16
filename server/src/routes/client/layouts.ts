/**
 * Client Layouts API Routes
 *
 * Endpoints:
 * - GET /api/client/layouts/:pageName - Get page layout configuration
 */

import { Router } from "express";
import { layoutEngine } from "../../engines/layout-engine";

const router = Router();

/**
 * GET /api/client/layouts/:pageName
 * Get layout configuration for a specific page
 * Supported pages: home, order, mall
 */
router.get("/:pageName", async (req, res) => {
  try {
    const { pageName } = req.params;

    // Validate page name
    const availablePages = layoutEngine.getAvailablePages();
    if (!availablePages.includes(pageName)) {
      return res.status(404).json({
        success: false,
        message: `Invalid page name. Available pages: ${availablePages.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    }

    const layout = await layoutEngine.getLayout(pageName);

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Layout not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: layout,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Client Layouts] Error getting layout:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get layout",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
