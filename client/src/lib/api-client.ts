/**
 * API Client - Unified API communication layer
 *
 * Singleton pattern for consistent API calls across the application
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
  count?: number;
}

export interface Product {
  id: string;
  name: string;
  code?: string;
  orgId: number;
  categoryId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  categories: number;
  orders: number;
  totalRevenue: number;
}

export interface PricingResult {
  originalPrice: number;
  finalPrice: number;
  savedAmount: number;
  appliedRules: Array<{
    id: string;
    name: string;
    description: string;
    discount: number;
  }>;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  condition: any;
  action: any;
  priority: number;
  isActive?: boolean;
}

export interface LayoutConfig {
  page: string;
  sections: Array<{
    type: string;
    [key: string]: any;
  }>;
}

/**
 * API Client Class
 */
class ApiClient {
  private static instance: ApiClient;
  private baseURL: string;

  private constructor() {
    // Use relative URLs for same-origin requests
    this.baseURL = "";
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Generic fetch wrapper
   */
  private async fetch<T>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("[ApiClient] Fetch error:", error);
      throw error;
    }
  }

  // ============================================================
  // Product APIs
  // ============================================================

  /**
   * Get products list
   */
  async getProducts(filters?: {
    category?: string;
    search?: string;
  }): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = `/api/client/products${queryString ? `?${queryString}` : ""}`;

    return this.fetch<Product[]>(url);
  }

  /**
   * Get single product by ID
   */
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return this.fetch<Product>(`/api/client/products/${id}`);
  }

  /**
   * Calculate product price with dynamic rules
   */
  async calculatePrice(
    productId: string,
    params: {
      userId?: string;
      storeId?: string;
      quantity?: number;
      timestamp?: string;
    }
  ): Promise<ApiResponse<PricingResult>> {
    return this.fetch<PricingResult>(
      `/api/client/products/${productId}/calculate-price`,
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  }

  // ============================================================
  // Layout APIs
  // ============================================================

  /**
   * Get page layout configuration
   */
  async getLayout(pageName: string): Promise<ApiResponse<LayoutConfig>> {
    return this.fetch<LayoutConfig>(`/api/client/layouts/${pageName}`);
  }

  // ============================================================
  // Admin APIs
  // ============================================================

  /**
   * Get product statistics (Admin)
   */
  async getProductStats(): Promise<ApiResponse<ProductStats>> {
    return this.fetch<ProductStats>("/api/admin/products/stats/summary");
  }

  /**
   * Get admin products list
   */
  async getAdminProducts(filters?: {
    category?: string;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);

    const queryString = params.toString();
    const url = `/api/admin/products${queryString ? `?${queryString}` : ""}`;

    return this.fetch<Product[]>(url);
  }

  /**
   * Update product (Admin)
   */
  async updateProduct(
    id: string,
    updates: Partial<Product>
  ): Promise<ApiResponse<Product>> {
    return this.fetch<Product>(`/api/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete product (Admin)
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.fetch<void>(`/api/admin/products/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Get pricing rules (Admin)
   */
  async getPricingRules(): Promise<ApiResponse<PricingRule[]>> {
    return this.fetch<PricingRule[]>("/api/admin/pricing-rules");
  }

  /**
   * Create pricing rule (Admin)
   */
  async createPricingRule(
    rule: Omit<PricingRule, "id">
  ): Promise<ApiResponse<PricingRule>> {
    return this.fetch<PricingRule>("/api/admin/pricing-rules", {
      method: "POST",
      body: JSON.stringify(rule),
    });
  }

  /**
   * Update pricing rule (Admin)
   */
  async updatePricingRule(
    id: string,
    updates: Partial<PricingRule>
  ): Promise<ApiResponse<PricingRule>> {
    return this.fetch<PricingRule>(`/api/admin/pricing-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete pricing rule (Admin)
   */
  async deletePricingRule(id: string): Promise<ApiResponse<void>> {
    return this.fetch<void>(`/api/admin/pricing-rules/${id}`, {
      method: "DELETE",
    });
  }
}

/**
 * Export singleton instance
 */
export const apiClient = ApiClient.getInstance();
