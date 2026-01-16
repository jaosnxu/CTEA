/**
 * Order Utilities
 *
 * Utility functions for order management including:
 * - Order status labels and translations
 * - Order status colors for UI badges
 * - Order status validation
 */

import { OrderStatus } from "@prisma/client";

/**
 * Order status translations
 */
export const ORDER_STATUS_LABELS: Record<
  OrderStatus,
  { en: string; ru: string; zh: string }
> = {
  PENDING: {
    en: "Pending",
    ru: "В ожидании",
    zh: "待处理",
  },
  CONFIRMED: {
    en: "Confirmed",
    ru: "Подтверждено",
    zh: "已确认",
  },
  PREPARING: {
    en: "Preparing",
    ru: "Готовится",
    zh: "准备中",
  },
  READY: {
    en: "Ready",
    ru: "Готово",
    zh: "已就绪",
  },
  DELIVERING: {
    en: "Delivering",
    ru: "Доставляется",
    zh: "配送中",
  },
  COMPLETED: {
    en: "Completed",
    ru: "Завершено",
    zh: "已完成",
  },
  CANCELLED: {
    en: "Cancelled",
    ru: "Отменено",
    zh: "已取消",
  },
  REFUNDED: {
    en: "Refunded",
    ru: "Возвращено",
    zh: "已退款",
  },
};

/**
 * Order status colors for UI badges
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PREPARING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  READY: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  DELIVERING: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  REFUNDED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

/**
 * Get localized order status label
 */
export function getOrderStatusLabel(
  status: OrderStatus | string,
  locale: "en" | "ru" | "zh" = "en"
): string {
  const statusEnum = status as OrderStatus;
  return ORDER_STATUS_LABELS[statusEnum]?.[locale] || status;
}

/**
 * Get order status color class for badges
 */
export function getOrderStatusColor(status: OrderStatus | string): string {
  const statusEnum = status as OrderStatus;
  return ORDER_STATUS_COLORS[statusEnum] || "bg-gray-100 text-gray-800";
}

/**
 * Check if order status is final (cannot be changed)
 */
export function isOrderStatusFinal(status: OrderStatus | string): boolean {
  const finalStatuses: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];
  return finalStatuses.includes(status as OrderStatus);
}

/**
 * Get all available order statuses
 */
export function getAllOrderStatuses(): OrderStatus[] {
  return Object.values(OrderStatus);
}

/**
 * Get available next statuses for a given status
 */
export function getAvailableNextStatuses(
  currentStatus: OrderStatus
): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [
      OrderStatus.DELIVERING,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
  };

  return transitions[currentStatus] || [];
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string | null | undefined): string {
  return orderNumber || "N/A";
}

/**
 * Calculate order item subtotal
 */
export function calculateItemSubtotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number = 0
): number {
  return quantity * unitPrice - discountAmount;
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(
  subtotal: number,
  discountAmount: number = 0,
  taxAmount: number = 0,
  deliveryFee: number = 0
): number {
  return subtotal - discountAmount + taxAmount + deliveryFee;
}
