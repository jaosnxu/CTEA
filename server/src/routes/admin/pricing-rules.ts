import { Router } from 'express';
import { pricingEngine } from '../../engines/pricing-engine';

const router = Router();

// 获取所有定价规则
router.get('/', async (req, res) => {
  try {
    const filters = {
      productId: req.query.productId as string,
      isActive: req.query.isActive === 'true',
    };

    const rules = await pricingEngine.getAllRules(filters);

    res.json({
      success: true,
      data: rules,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[PricingRules] Error fetching rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing rules',
      error: error.message,
    });
  }
});

export default router;
