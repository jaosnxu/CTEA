/**
 * 🎨 SDUI 布局引擎
 */

import { getPrismaClient } from '../db/prisma';

const prisma = getPrismaClient();

const DEFAULT_LAYOUTS: Record<string, any> = {
  home: {
    page: 'home',
    sections: [
      { type: 'banner', imageUrl: '/banners/home.jpg', autoPlay: true, interval: 3000 },
      { type: 'categories', columns: 4, showIcon: true },
      { type: 'hotProducts', title: 'Популярное', limit: 6, algorithm: 'sales_rank' },
      { type: 'memberCard' },
      { type: 'couponSection', limit: 3 },
    ],
  },
  order: {
    page: 'order',
    sections: [
      { type: 'categoryTabs' },
      { type: 'productGrid', columns: 2 },
      { type: 'floatingCart' },
    ],
  },
  mall: {
    page: 'mall',
    sections: [
      { type: 'banner', imageUrl: '/banners/mall.jpg' },
      { type: 'productGrid', columns: 2, showFilters: true },
    ],
  },
};

export class LayoutEngine {
  private static instance: LayoutEngine;

  static getInstance() {
    if (!this.instance) {
      this.instance = new LayoutEngine();
    }
    return this.instance;
  }

  /**
   * 获取页面布局
   */
  async getLayout(pageName: string) {
    try {
      const layout = await prisma.sduilayouts.findFirst({
        where: { layoutCode: pageName },
      }).catch(() => null);

      if (layout && layout.layoutConfig) {
        try {
          const parsed = JSON.parse(layout.layoutConfig as string);
          return parsed;
        } catch (e) {
          console.warn(`[Layout] Failed to parse layout for ${pageName}, using default`);
        }
      }

      return DEFAULT_LAYOUTS[pageName] || { page: pageName, sections: [] };
    } catch (error) {
      console.error('[Layout] Error fetching layout:', error);
      return DEFAULT_LAYOUTS[pageName] || { page: pageName, sections: [] };
    }
  }

  /**
   * 保存布局配置
   */
  async saveLayout(pageName: string, layoutConfig: any) {
    try {
      const existingLayout = await prisma.sduilayouts.findFirst({
        where: { layoutCode: pageName },
      });

      const layoutData = {
        orgId: 1,
        layoutCode: pageName,
        layoutConfig: JSON.stringify(layoutConfig),
        updatedAt: new Date(),
      };

      if (existingLayout) {
        await prisma.sduilayouts.update({
          where: { id: existingLayout.id },
          data: layoutData,
        });
      } else {
        await prisma.sduilayouts.create({
          data: {
            ...layoutData,
            createdAt: new Date(),
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[Layout] Error saving layout:', error);
      throw error;
    }
  }
}

export const layoutEngine = LayoutEngine.getInstance();
