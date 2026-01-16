import { Router } from 'express';
import { productEngine } from '../../engines/product-engine';

const router = Router();

// 获取产品统计
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await productEngine.getProductStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Admin Products] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

// 获取产品列表
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      status: req.query.status as string,
    };

    const products = await productEngine.getProducts(filters);

    res.json({
      success: true,
      data: products,
      count: products.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Admin Products] Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
});

// 获取单个产品
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
    console.error('[Admin Products] Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
});

// 创建产品
router.post('/', async (req, res) => {
  try {
    const product = await productEngine.createProduct(req.body);

    res.json({
      success: true,
      data: product,
      message: 'Product created successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Admin Products] Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
});

// 更新产品
router.put('/:id', async (req, res) => {
  try {
    const product = await productEngine.updateProduct(req.params.id, req.body);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Admin Products] Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
});

// 删除产品
router.delete('/:id', async (req, res) => {
  try {
    await productEngine.deleteProduct(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Admin Products] Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
});

export default router;
