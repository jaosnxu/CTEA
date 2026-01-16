/**
 * Admin Pricing Rules API Routes
 * 
 * Endpoints:
 * - GET /api/admin/pricing-rules - Get pricing rules list
 * - GET /api/admin/pricing-rules/:id - Get pricing rule details
 * - POST /api/admin/pricing-rules - Create pricing rule
 * - PUT /api/admin/pricing-rules/:id - Update pricing rule
 * - DELETE /api/admin/pricing-rules/:id - Delete pricing rule
 */

import { Router } from 'express';
import { pricingEngine } from '../../engines/pricing-engine';

const router = Router();

/**
 * GET /api/admin/pricing-rules
 * Get all pricing rules
 */
router.get('/', async (req, res) => {
  try {
    const { productId } = req.query;
    const rules = await pricingEngine.getPricingRules(productId as string);

    res.json({
      success: true,
      data: rules,
      count: rules.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin Pricing Rules] Error getting rules:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get pricing rules',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/pricing-rules/:id
 * Get single pricing rule details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rules = await pricingEngine.getPricingRules();
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: rule,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin Pricing Rules] Error getting rule:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get pricing rule',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/pricing-rules
 * Create new pricing rule
 */
router.post('/', async (req, res) => {
  try {
    const ruleData = req.body;
    const rule = await pricingEngine.createPricingRule(ruleData);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Pricing rule created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin Pricing Rules] Error creating rule:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create pricing rule',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/pricing-rules/:id
 * Update pricing rule
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const rule = await pricingEngine.updatePricingRule(id, updates);

    res.json({
      success: true,
      data: rule,
      message: 'Pricing rule updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin Pricing Rules] Error updating rule:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update pricing rule',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/admin/pricing-rules/:id
 * Delete pricing rule
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pricingEngine.deletePricingRule(id);

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Admin Pricing Rules] Error deleting rule:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete pricing rule',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
