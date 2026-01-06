/**
 * Order Repository
 * 
 * Handles all order-related database operations with transaction support.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { 
  order, 
  orderItem, 
  orderItemOption,
} from "../../drizzle/schema";
import { BaseRepository } from "./base.repository";

export interface CreateOrderParams {
  orderNumber: string;
  memberId: number;
  storeId: number;
  orderType: 'DELIVERY' | 'PICKUP';
  orderPrefix: 'T' | 'P' | 'K' | 'M';
  subtotal: string;
  discountAmount: string;
  deliveryFee: string;
  totalAmount: string;
  usedPoints: number;
  pointsDiscountAmount: string;
  couponInstanceId?: number;
  couponDiscountAmount: string;
  earnedPoints: number;
  deliveryAddress?: string;
  deliveryLatitude?: string;
  deliveryLongitude?: string;
  deliveryNote?: string;
  scheduledAt?: Date;
  campaignCodeId?: number;
}

export interface CreateOrderItemParams {
  orderId: number;
  productId: number;
  productName: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  isSpecialPrice: boolean;
  optionsPrice: string;
}

export interface CreateOrderItemOptionParams {
  orderItemId: number;
  optionGroupCode: string;
  optionGroupName: string;
  optionItemCode: string;
  optionItemName: string;
  priceDelta: string;
}

export class OrderRepository extends BaseRepository<any> {
  /**
   * Create a new order (transaction-safe)
   */
  async createOrder(params: CreateOrderParams): Promise<{ orderId: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [newOrder] = await db.insert(order)
      .values({
        orderNumber: params.orderNumber,
        memberId: params.memberId,
        storeId: params.storeId,
        orderType: params.orderType,
        orderPrefix: params.orderPrefix,
        status: 'PENDING',
        subtotal: params.subtotal,
        discountAmount: params.discountAmount,
        deliveryFee: params.deliveryFee,
        totalAmount: params.totalAmount,
        usedPoints: params.usedPoints,
        pointsDiscountAmount: params.pointsDiscountAmount,
        couponInstanceId: params.couponInstanceId,
        couponDiscountAmount: params.couponDiscountAmount,
        earnedPoints: params.earnedPoints,
        deliveryAddress: params.deliveryAddress,
        deliveryLatitude: params.deliveryLatitude,
        deliveryLongitude: params.deliveryLongitude,
        deliveryNote: params.deliveryNote,
        scheduledAt: params.scheduledAt,
        campaignCodeId: params.campaignCodeId,
      })
      .returning({ id: order.id });

    return { orderId: newOrder.id };
  }

  /**
   * Create order item
   */
  async createOrderItem(params: CreateOrderItemParams): Promise<{ orderItemId: number }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [newItem] = await db.insert(orderItem)
      .values({
        orderId: params.orderId,
        productId: params.productId,
        productName: params.productName,
        unitPrice: params.unitPrice,
        quantity: params.quantity,
        totalPrice: params.totalPrice,
        isSpecialPrice: params.isSpecialPrice,
        optionsPrice: params.optionsPrice,
      })
      .returning({ id: orderItem.id });

    return { orderItemId: newItem.id };
  }

  /**
   * Create order item option
   */
  async createOrderItemOption(params: CreateOrderItemOptionParams): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(orderItemOption)
      .values({
        orderItemId: params.orderItemId,
        optionGroupCode: params.optionGroupCode,
        optionGroupName: params.optionGroupName,
        optionItemCode: params.optionItemCode,
        optionItemName: params.optionItemName,
        priceDelta: params.priceDelta,
      });
  }

  /**
   * Generate order number with prefix
   */
  async generateOrderNumber(prefix: 'T' | 'P' | 'K' | 'M'): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get today's date in YYYYMMDD format
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of orders with this prefix today
    const [result] = await db.select({
      count: sql<number>`COUNT(*)::int`,
    })
      .from(order)
      .where(and(
        eq(order.orderPrefix, prefix),
        sql`DATE(${order.createdAt}) = CURRENT_DATE`
      ));

    const sequence = (result?.count || 0) + 1;
    const paddedSequence = sequence.toString().padStart(4, '0');

    return `${prefix}${today}${paddedSequence}`;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.select()
      .from(order)
      .where(eq(order.id, orderId));

    return result;
  }

  /**
   * Get order items by order ID
   */
  async getOrderItems(orderId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select()
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId));
  }

  /**
   * Get order item options by order item ID
   */
  async getOrderItemOptions(orderItemId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select()
      .from(orderItemOption)
      .where(eq(orderItemOption.orderItemId, orderItemId));
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(order)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(order.id, orderId));
  }

  /**
   * Get orders by member ID
   */
  async getOrdersByMember(memberId: number, limit: number = 50) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db.select()
      .from(order)
      .where(eq(order.memberId, memberId))
      .orderBy(desc(order.createdAt))
      .limit(limit);
  }
}

export const orderRepository = new OrderRepository();
