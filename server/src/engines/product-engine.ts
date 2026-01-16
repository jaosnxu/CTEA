/**
 * Product Engine - Product CRUD, Statistics, and Batch Operations
 *
 * Responsibilities:
 * - Product management (CRUD operations)
 * - Product statistics
 * - Batch operations
 */

import { getPrismaClient } from "../db/prisma";
import type { PrismaClient } from "@prisma/client";

export interface ProductFilters {
  category?: string;
  search?: string;
  status?: string;
}

export interface ProductData {
  name?: string;
  nameMultiLang?: Record<string, string>;
  price?: number;
  stock?: number;
  status?: string;
  category?: string;
  orgId?: number;
  categoryId?: number;
  code?: string;
  createdBy?: string;
  updatedBy?: string;
  pricingRuleIds?: string[]; // Pricing rule IDs associated with this product
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  categories: number;
  orders: number;
  totalRevenue: number;
}

/**
 * Product Engine - Singleton Pattern
 */
class ProductEngine {
  private static instance: ProductEngine;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProductEngine {
    if (!ProductEngine.instance) {
      ProductEngine.instance = new ProductEngine();
    }
    return ProductEngine.instance;
  }

  /**
   * Get products with filters
   */
  async getProducts(filters?: ProductFilters) {
    try {
      const where: any = {};

      if (filters?.category) {
        where.code = filters.category;
      }

      if (filters?.search) {
        where.name = {
          contains: filters.search,
        };
      }

      if (filters?.status) {
        // Note: Products table doesn't have status field in schema
        // This is a placeholder for future enhancement
      }

      const products = await this.prisma.products.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
      });

      return products;
    } catch (error) {
      console.error("[ProductEngine] Error getting products:", error);
      throw new Error("Failed to get products");
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string) {
    try {
      const product = await this.prisma.products.findUnique({
        where: { id },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    } catch (error) {
      console.error("[ProductEngine] Error getting product:", error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(data: ProductData) {
    try {
      const product = await this.prisma.products.create({
        data: {
          name: data.name || "",
          orgId: data.orgId || 1,
          categoryId: data.categoryId || 1,
          code: data.code || `PROD_${Date.now()}`,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        },
      });

      // Handle pricing rule associations if provided
      if (data.pricingRuleIds && data.pricingRuleIds.length > 0) {
        await this.updateProductPricingRules(
          parseInt(product.id),
          data.pricingRuleIds
        );
      }

      return product;
    } catch (error) {
      console.error("[ProductEngine] Error creating product:", error);
      throw new Error("Failed to create product");
    }
  }

  /**
   * Update a product
   */
  async updateProduct(id: string, updates: ProductData) {
    try {
      const product = await this.prisma.products.update({
        where: { id },
        data: {
          name: updates.name,
          code: updates.code,
          updatedBy: updates.updatedBy,
          updatedAt: new Date(),
        },
      });

      // Handle pricing rule associations if provided
      if (updates.pricingRuleIds !== undefined) {
        await this.updateProductPricingRules(
          parseInt(id),
          updates.pricingRuleIds
        );
      }

      return product;
    } catch (error) {
      console.error("[ProductEngine] Error updating product:", error);
      throw new Error("Failed to update product");
    }
  }

  /**
   * Update product pricing rule associations
   */
  async updateProductPricingRules(productId: number, ruleIds: string[]) {
    try {
      const { getDb } = await import("../../db");
      const { productPricingRules } = await import("../../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) {
        console.warn(
          "[ProductEngine] Database not available for pricing rules update"
        );
        return;
      }

      // Remove all existing associations
      await db
        .delete(productPricingRules)
        .where(eq(productPricingRules.productId, productId));

      // Add new associations
      if (ruleIds.length > 0) {
        const values = ruleIds.map(ruleId => ({
          productId,
          ruleId,
        }));

        await db.insert(productPricingRules).values(values);
      }
    } catch (error) {
      console.error("[ProductEngine] Error updating pricing rules:", error);
      // Don't throw - pricing rules are optional
    }
  }

  /**
   * Get pricing rules for a product
   */
  async getProductPricingRules(productId: number): Promise<string[]> {
    try {
      const { getDb } = await import("../../db");
      const { productPricingRules } = await import("../../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) {
        return [];
      }

      const links = await db
        .select()
        .from(productPricingRules)
        .where(eq(productPricingRules.productId, productId));

      return links.map(link => link.ruleId);
    } catch (error) {
      console.error("[ProductEngine] Error getting pricing rules:", error);
      return [];
    }
  }

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(id: string) {
    try {
      // Since there's no soft delete field in schema, we'll do hard delete
      // In production, you should add a 'deletedAt' field
      await this.prisma.products.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      console.error("[ProductEngine] Error deleting product:", error);
      throw new Error("Failed to delete product");
    }
  }

  /**
   * Batch update products
   */
  async batchUpdateProducts(ids: string[], updates: ProductData) {
    try {
      const result = await this.prisma.products.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          name: updates.name,
          code: updates.code,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        updated: result.count,
      };
    } catch (error) {
      console.error("[ProductEngine] Error batch updating products:", error);
      throw new Error("Failed to batch update products");
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ProductStats> {
    try {
      // Get total products count
      const totalProducts = await this.prisma.products.count();

      // Active products (all products since no status field)
      const activeProducts = totalProducts;

      // Get categories count
      const categories = await this.prisma.categories.count();

      // Get orders count
      const orders = await this.prisma.orders.count();

      // Get total revenue
      const ordersWithTotal = await this.prisma.orders.aggregate({
        _sum: {
          totalAmount: true,
        },
      });

      const totalRevenue = ordersWithTotal._sum.totalAmount
        ? Number(ordersWithTotal._sum.totalAmount)
        : 0;

      return {
        totalProducts,
        activeProducts,
        categories,
        orders,
        totalRevenue,
      };
    } catch (error) {
      console.error("[ProductEngine] Error getting product stats:", error);
      throw new Error("Failed to get product stats");
    }
  }
}

/**
 * Export singleton instance
 */
export const productEngine = ProductEngine.getInstance();
