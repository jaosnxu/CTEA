import { Router } from 'express';
import { productEngine } from '../../engines/product-engine';
import { pricingEngine } from '../../engines/pricing-engine';

const router = Router();

// 获取产品列表
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      status: 'ACTIVE',
    };

    const products = await productEngine.getProducts(filters);

    res.json({
      success: true,
      data: products,
      count: products.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Client Products] Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});

// 获取产品详情
router.get('/:id', async (req, res) => {
  try {
    const product = await productEngine.getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Client Products] Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
});

// 计算产品价格
router.post('/:id/calculate-price', async (req, res) => {
  try {
    const result = await pricingEngine.calculatePrice({
      productId: req.params.id,
      ...req.body,
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Client Products] Error calculating price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate price',
      error: error.message,
    });
  }
});

export default router;
