/**
 * Order-related TypeScript types for frontend
 */

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderStore {
  id: string;
  name: string | { en?: string; ru?: string; zh?: string };
  code?: string;
  address?: string | { en?: string; ru?: string; zh?: string };
  phone?: string;
}

export interface OrderUser {
  id: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
}

export interface OrderProduct {
  id: string;
  code?: string;
  name?: string | { en?: string; ru?: string; zh?: string };
}

export interface OrderItem {
  id: string | bigint;
  orderId?: string | bigint;
  productId?: string;
  product?: OrderProduct;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
  discountAmount?: number | string;
  specifications?: Record<string, unknown>;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Order {
  id: string | bigint;
  orderNumber?: string;
  storeId?: string;
  store?: OrderStore;
  userId?: string;
  user?: OrderUser;
  status: OrderStatus;
  totalAmount?: number | string;
  subtotalAmount?: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
  deliveryFee?: number | string;
  notes?: string;
  deliveryAddress?: Record<string, unknown> | string;
  paymentMethod?: string;
  paymentStatus?: string;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  orderItems?: OrderItem[];
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderStatistics {
  total: number;
  byStatus: Array<{
    status: OrderStatus;
    count: number;
  }>;
  revenue: number | string;
}
