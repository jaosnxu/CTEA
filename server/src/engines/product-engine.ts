/**
 * 🔥 产品引擎 - 产品 CRUD + 统计
 */

import { getPrismaClient } from '../db/prisma';

const prisma = getPrismaClient();

export interface ProductFilters {
  category?: string;
  search?: string;
  status?: string;
}

export class ProductEngine {
  private static instance: ProductEngine;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ProductEngine();
    }
    return this.instance;
  }

  /**
   * 获取产品列表
   */
  async getProducts(filters: ProductFilters = {}) {
    try {
      const where: any = {};

      if (filters.category) {
        where.categoryId = parseInt(filters.category);
      }

      if (filters.status) {
        // Convert status string to isActive boolean
        where.isActive = filters.status === 'ACTIVE';
      }

      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search } },
        ];
      }

      const products = await prisma.products.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return products;
    } catch (error) {
      console.error('[ProductEngine] getProducts error:', error);
      throw error;
    }
  }

  /**
   * 获取产品详情
   */
  async getProductById(id: string) {
    try {
      const product = await prisma.products.findUnique({
        where: { id: parseInt(id) },
      });

      return product;
    } catch (error) {
      console.error('[ProductEngine] getProductById error:', error);
      throw error;
    }
  }

  /**
   * 创建产品
   */
  async createProduct(data: any) {
    try {
      const product = await prisma.products.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return product;
    } catch (error) {
      console.error('[ProductEngine] createProduct error:', error);
      throw error;
    }
  }

  /**
   * 更新产品
   */
  async updateProduct(id: string, updates: any) {
    try {
      const product = await prisma.products.update({
        where: { id: parseInt(id) },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      return product;
    } catch (error) {
      console.error('[ProductEngine] updateProduct error:', error);
      throw error;
    }
  }

  /**
   * 删除产品（软删除）
   */
  async deleteProduct(id: string) {
    try {
      const product = await prisma.products.update({
        where: { id: parseInt(id) },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return product;
    } catch (error) {
      console.error('[ProductEngine] deleteProduct error:', error);
      throw error;
    }
  }

  /**
   * 批量更新产品
   */
  async batchUpdateProducts(ids: string[], updates: any) {
    try {
      const result = await prisma.products.updateMany({
        where: {
          id: { in: ids.map(id => parseInt(id)) },
        },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      console.error('[ProductEngine] batchUpdateProducts error:', error);
      throw error;
    }
  }

  /**
   * 获取产品统计
   */
  async getProductStats() {
    try {
      const [
        totalProducts,
        activeProducts,
        totalCategories,
        totalOrders,
        revenueResult,
      ] = await Promise.all([
        prisma.products.count(),
        prisma.products.count({ where: { isActive: true } }),
        prisma.categories.count().catch(() => 0),
        prisma.orders.count().catch(() => 0),
        prisma.orders.aggregate({
          _sum: { totalAmount: true },
        }).catch(() => ({ _sum: { totalAmount: 0 } })),
      ]);

      const totalRevenue = revenueResult._sum.totalAmount
        ? parseFloat(revenueResult._sum.totalAmount.toString())
        : 0;

      return {
        totalProducts,
        activeProducts,
        categories: totalCategories,
        orders: totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      };
    } catch (error) {
      console.error('[ProductEngine] getProductStats error:', error);
      throw error;
    }
  }
}

export const productEngine = ProductEngine.getInstance();
