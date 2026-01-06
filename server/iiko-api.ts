/**
 * CHU TEA - IIKO POS API Adapter
 * 
 * Official IIKO API Documentation:
 * https://api-ru.iiko.services/
 * 
 * Features:
 * - Authentication (login token)
 * - Product synchronization
 * - Order creation
 * - Stock/inventory updates
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface IIKOConfig {
  apiUrl: string;  // e.g., 'https://api-ru.iiko.services'
  apiLogin: string;
  organizationId: string;
  enabled: boolean;
  syncInterval: number;  // in minutes
}

export interface IIKOProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  stock?: number;
}

export interface IIKOOrder {
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  orderType: 'PICKUP' | 'DELIVERY';
}

export interface IIKOOrderResponse {
  success: boolean;
  iikoOrderId?: string;
  error?: string;
}

// ============================================================================
// IIKO API Client
// ============================================================================

export class IIKOClient {
  private config: IIKOConfig;
  private accessToken: string = '';
  private tokenExpiresAt: number = 0;

  constructor(config: IIKOConfig) {
    this.config = config;
  }

  /**
   * Authenticate and get access token
   */
  private async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.accessToken.length > 0 && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log('[IIKO] Authenticating...');

    try {
      const response = await fetch(`${this.config.apiUrl}/api/1/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiLogin: this.config.apiLogin,
        }),
      });

      const data = await response.json();

      if (data.token) {
        this.accessToken = data.token;
        // Token expires in 1 hour, refresh 5 minutes before expiry
        this.tokenExpiresAt = Date.now() + 55 * 60 * 1000;
        console.log('[IIKO] Authentication successful');
        return this.accessToken;
      } else {
        throw new Error('Failed to get IIKO access token');
      }
    } catch (error: any) {
      console.error('[IIKO] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Fetch products from IIKO
   */
  async getProducts(): Promise<IIKOProduct[]> {
    if (!this.config.enabled) {
      console.log('[IIKO] API disabled, returning empty product list');
      return [];
    }

    const token = await this.authenticate();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/1/nomenclature/${this.config.organizationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.products) {
        return data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.sizePrices?.[0]?.price?.currentPrice || 0,
          category: p.parentGroup || 'Uncategorized',
          imageUrl: p.images?.[0]?.imageUrl,
          isAvailable: !p.isDeleted && p.isIncludedInMenu,
          stock: p.stock || 0,
        }));
      } else {
        throw new Error('Invalid IIKO products response');
      }
    } catch (error: any) {
      console.error('[IIKO] Get products error:', error);
      throw error;
    }
  }

  /**
   * Create order in IIKO
   */
  async createOrder(order: IIKOOrder): Promise<IIKOOrderResponse> {
    if (!this.config.enabled) {
      console.log('[IIKO] API disabled, simulating order creation');
      return {
        success: true,
        iikoOrderId: `MOCK_IIKO_${Date.now()}`,
      };
    }

    const token = await this.authenticate();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/1/deliveries/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: this.config.organizationId,
            order: {
              externalNumber: order.orderId,
              orderTypeId: order.orderType === 'DELIVERY'
                ? 'delivery-order-type-id'  // Replace with actual ID
                : 'pickup-order-type-id',    // Replace with actual ID
              customer: {
                name: order.customerName,
                phone: order.customerPhone,
              },
              deliveryPoint: order.deliveryAddress
                ? {
                    address: {
                      street: {
                        name: order.deliveryAddress,
                      },
                    },
                  }
                : undefined,
              items: order.items.map((item) => ({
                productId: item.productId,
                amount: item.quantity,
                price: item.price,
              })),
            },
          }),
        }
      );

      const data = await response.json();

      if (data.orderId) {
        console.log(`[IIKO] Order ${order.orderId} created successfully: ${data.orderId}`);
        return {
          success: true,
          iikoOrderId: data.orderId,
        };
      } else {
        throw new Error(data.errorDescription || 'Failed to create IIKO order');
      }
    } catch (error: any) {
      console.error('[IIKO] Create order error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get order status from IIKO
   */
  async getOrderStatus(iikoOrderId: string): Promise<string> {
    if (!this.config.enabled) {
      return 'COMPLETED';
    }

    const token = await this.authenticate();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/1/deliveries/by_id?organizationId=${this.config.organizationId}&orderIds=${iikoOrderId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.orders && data.orders.length > 0) {
        return data.orders[0].status;
      } else {
        throw new Error('Order not found in IIKO');
      }
    } catch (error: any) {
      console.error('[IIKO] Get order status error:', error);
      throw error;
    }
  }

  /**
   * Test connection to IIKO API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();
      return {
        success: true,
        message: 'Successfully connected to IIKO API',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to IIKO API',
      };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createIIKOClient(config: IIKOConfig): IIKOClient {
  return new IIKOClient(config);
}

// ============================================================================
// Mock IIKO Client (for testing without real API)
// ============================================================================

export class MockIIKOClient {
  private config: IIKOConfig;

  constructor(config: IIKOConfig) {
    this.config = config;
  }

  async getProducts(): Promise<IIKOProduct[]> {
    console.log('[Mock IIKO] Returning mock products');
    
    return [
      {
        id: 'IIKO_001',
        name: 'Клубничный Чиз',
        description: 'Свежая клубника с сырной пеной',
        price: 350,
        category: 'Сырный чай',
        isAvailable: true,
        stock: 100,
      },
      {
        id: 'IIKO_002',
        name: 'Манго Чиз',
        description: 'Спелое манго с нежной сырной пеной',
        price: 310,
        category: 'Сырный чай',
        isAvailable: true,
        stock: 80,
      },
      {
        id: 'IIKO_003',
        name: 'Классический молочный чай',
        description: 'Черный чай с молоком и тапиокой',
        price: 280,
        category: 'Молочный чай',
        isAvailable: true,
        stock: 150,
      },
    ];
  }

  async createOrder(order: IIKOOrder): Promise<IIKOOrderResponse> {
    console.log('[Mock IIKO] Creating mock order:', order.orderId);
    
    // Simulate 50% success rate for demo
    const success = Math.random() > 0.5;
    
    if (success) {
      return {
        success: true,
        iikoOrderId: `MOCK_IIKO_${Date.now()}`,
      };
    } else {
      return {
        success: false,
        error: 'Mock IIKO timeout (simulated failure)',
      };
    }
  }

  async getOrderStatus(iikoOrderId: string): Promise<string> {
    console.log('[Mock IIKO] Getting mock order status:', iikoOrderId);
    return 'COMPLETED';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    console.log('[Mock IIKO] Testing mock connection');
    return {
      success: true,
      message: 'Mock IIKO connection successful',
    };
  }
}
