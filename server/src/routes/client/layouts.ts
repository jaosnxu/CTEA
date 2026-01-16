import { Router } from 'express';
import { layoutEngine } from '../../engines/layout-engine';

const router = Router();

// 获取页面布局
router.get('/:pageName', async (req, res) => {
  try {
    const layout = await layoutEngine.getLayout(req.params.pageName);

    res.json({
      success: true,
      data: layout,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Layout] Error fetching layout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch layout',
      error: error.message,
    });
  }
});

export default router;
