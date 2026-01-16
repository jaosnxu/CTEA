/**
 * useAdminProducts Hook
 * 
 * Hook for managing products in the admin panel
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type Product, type ProductStats } from '@/lib/api-client';

export interface UseAdminProductsResult {
  products: Product[];
  stats: ProductStats | null;
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
}

/**
 * Admin Products Hook
 */
export function useAdminProducts(): UseAdminProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch products and stats
   */
  const refreshProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch products and stats in parallel
      const [productsResponse, statsResponse] = await Promise.all([
        apiClient.getAdminProducts(),
        apiClient.getProductStats(),
      ]);

      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      console.error('[useAdminProducts] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a product
   */
  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>): Promise<boolean> => {
      try {
        const response = await apiClient.updateProduct(id, updates);

        if (response.success) {
          // Refresh products after update
          await refreshProducts();
          return true;
        }

        return false;
      } catch (err) {
        console.error('[useAdminProducts] Update error:', err);
        return false;
      }
    },
    [refreshProducts]
  );

  /**
   * Delete a product
   */
  const deleteProduct = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await apiClient.deleteProduct(id);

        if (response.success) {
          // Refresh products after delete
          await refreshProducts();
          return true;
        }

        return false;
      } catch (err) {
        console.error('[useAdminProducts] Delete error:', err);
        return false;
      }
    },
    [refreshProducts]
  );

  // Initial load
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  return {
    products,
    stats,
    isLoading,
    error,
    refreshProducts,
    updateProduct,
    deleteProduct,
  };
}
