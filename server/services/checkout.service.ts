/**
 * Checkout Service
 * 
 * Handles order creation with:
 * - Points/Coupon mutual exclusion validation
 * - Real-time price calculation
 * - Backend price verification
 * 
 * All database writes delegated to OrderRepository and other repositories.
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { 
  product,
  productOptionItem,
  optionItem,
  storeProduct,
} from "../../drizzle/schema";
import { pointsService } from "./points.service";
import { CouponRepository } from "../repositories/coupon.repository";
import { orderRepository } from "../repositories/order.repository";

export interface OrderItemInput {
  productId: number;
  quantity: number;
  selectedOptions: Array<{
    groupCode: string;
    groupName: string;
    itemCode: string;
    itemName: string;
    itemId: number;
  }>;
}

export interface CheckoutInput {
  memberId: number;
  storeId: number;
  orderType: 'DELIVERY' | 'PICKUP';
  orderPrefix: 'T' | 'P' | 'K' | 'M';
  items: OrderItemInput[];
  usePoints?: number;
  couponInstanceId?: number;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNote?: string;
  scheduledAt?: Date;
  campaignCodeId?: number;
}

export interface QuoteResult {
  subtotal: number;
  optionsTotal: number;
  discountAmount: number;
  pointsDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  totalAmount: number;
  earnedPoints: number;
  items: Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    optionsPrice: number;
    totalPrice: number;
    isSpecialPrice: boolean;
  }>;
}

export class CheckoutService {
  private couponRepo = new CouponRepository();

  /**
   * Calculate order quote (real-time price calculation)
   * This is called from frontend for instant price updates
   */
  async calculateQuote(input: CheckoutInput): Promise<QuoteResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // CRITICAL: Validate mutual exclusion
    if (input.usePoints && input.usePoints > 0 && input.couponInstanceId) {
      throw new Error("积分与优惠券不可同时使用 / Points and coupons cannot be used together");
    }

    // Calculate item prices
    const itemResults = await this.calculateItemPrices(input.storeId, input.items);
    
    const subtotal = itemResults.reduce((sum, item) => sum + item.totalPrice, 0);
    const optionsTotal = itemResults.reduce((sum, item) => sum + item.optionsPrice * item.quantity, 0);

    // Calculate points discount
    let pointsDiscount = 0;
    if (input.usePoints && input.usePoints > 0) {
      // Validate member has enough points
      const balance = await pointsService.getBalance(input.memberId);
      if (balance.available < input.usePoints) {
        throw new Error(`积分不足，无法使用积分支付。可用积分: ${balance.available} / Insufficient points. Available: ${balance.available}`);
      }
      // 1 point = 1 RUB (configurable)
      pointsDiscount = input.usePoints;
    }

    // Calculate coupon discount
    let couponDiscount = 0;
    if (input.couponInstanceId) {
      couponDiscount = await this.calculateCouponDiscount(
        input.couponInstanceId, 
        input.memberId,
        subtotal,
        itemResults
      );
    }

    // Calculate delivery fee
    const deliveryFee = input.orderType === 'DELIVERY' ? 200 : 0; // Configurable

    // Calculate total
    const discountAmount = pointsDiscount + couponDiscount;
    const totalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);

    // Calculate earned points (special price items excluded)
    const earnedPoints = pointsService.calculateOrderPoints(
      itemResults.map(item => ({
        totalPrice: item.totalPrice,
        isSpecialPrice: item.isSpecialPrice,
      }))
    );

    return {
      subtotal,
      optionsTotal,
      discountAmount,
      pointsDiscount,
      couponDiscount,
      deliveryFee,
      totalAmount,
      earnedPoints,
      items: itemResults,
    };
  }

  /**
   * Submit order with backend validation
   * Re-calculates all prices to prevent frontend manipulation
   */
  async submitOrder(input: CheckoutInput): Promise<{ orderId: number; orderNumber: string }> {
    // CRITICAL: Backend re-validation of mutual exclusion
    if (input.usePoints && input.usePoints > 0 && input.couponInstanceId) {
      throw new Error("积分与优惠券不可同时使用 / Points and coupons cannot be used together");
    }

    // Re-calculate quote on backend (never trust frontend prices)
    const quote = await this.calculateQuote(input);

    // Generate order number
    const orderNumber = await orderRepository.generateOrderNumber(input.orderPrefix);

    // Create order using repository
    const { orderId } = await orderRepository.createOrder({
      orderNumber,
      memberId: input.memberId,
      storeId: input.storeId,
      orderType: input.orderType,
      orderPrefix: input.orderPrefix,
      subtotal: quote.subtotal.toString(),
      discountAmount: quote.discountAmount.toString(),
      deliveryFee: quote.deliveryFee.toString(),
      totalAmount: quote.totalAmount.toString(),
      usedPoints: input.usePoints || 0,
      pointsDiscountAmount: quote.pointsDiscount.toString(),
      couponInstanceId: input.couponInstanceId,
      couponDiscountAmount: quote.couponDiscount.toString(),
      earnedPoints: quote.earnedPoints,
      deliveryAddress: input.deliveryAddress,
      deliveryLatitude: input.deliveryLatitude?.toString(),
      deliveryLongitude: input.deliveryLongitude?.toString(),
      deliveryNote: input.deliveryNote,
      scheduledAt: input.scheduledAt,
      campaignCodeId: input.campaignCodeId,
    });

    // Create order items
    for (const item of quote.items) {
      const { orderItemId } = await orderRepository.createOrderItem({
        orderId,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        totalPrice: item.totalPrice.toString(),
        isSpecialPrice: item.isSpecialPrice,
        optionsPrice: item.optionsPrice.toString(),
      });

      // Create order item options
      const inputItem = input.items.find(i => i.productId === item.productId);
      if (inputItem) {
        for (const opt of inputItem.selectedOptions) {
          // Get price delta for this option
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [optionInfo] = await db.select({
            priceDelta: optionItem.priceDelta,
          })
            .from(optionItem)
            .where(eq(optionItem.id, opt.itemId));

          await orderRepository.createOrderItemOption({
            orderItemId,
            optionGroupCode: opt.groupCode,
            optionGroupName: opt.groupName,
            optionItemCode: opt.itemCode,
            optionItemName: opt.itemName,
            priceDelta: optionInfo?.priceDelta || '0',
          });
        }
      }
    }

    // Deduct points if used
    if (input.usePoints && input.usePoints > 0) {
      await pointsService.deductPoints({
        memberId: input.memberId,
        points: input.usePoints,
        reason: 'ORDER_REDEEM',
        description: `Order ${orderNumber} points redemption`,
        orderId,
        idempotencyKey: `order_redeem:${orderId}`,
      });
    }

    // Mark coupon as used (atomic update)
    if (input.couponInstanceId) {
      const updated = await this.couponRepo.markAsUsedAtomic(
        input.couponInstanceId,
        orderId
      );
      if (!updated) {
        throw new Error("优惠券已被使用或已过期 / Coupon already used or expired");
      }
    }

    return {
      orderId,
      orderNumber,
    };
  }

  /**
   * Calculate prices for order items including options
   */
  private async calculateItemPrices(storeId: number, items: OrderItemInput[]): Promise<Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    optionsPrice: number;
    totalPrice: number;
    isSpecialPrice: boolean;
  }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results = [];

    for (const item of items) {
      // Get product info
      const [productInfo] = await db.select({
        id: product.id,
        name: product.name,
        basePrice: product.basePrice,
        isSpecialPrice: product.isSpecialPrice,
      })
        .from(product)
        .where(eq(product.id, item.productId));

      if (!productInfo) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Check for store-specific price override
      const [storeProductInfo] = await db.select({
        priceOverride: storeProduct.priceOverride,
      })
        .from(storeProduct)
        .where(and(
          eq(storeProduct.storeId, storeId),
          eq(storeProduct.productId, item.productId)
        ));

      const unitPrice = storeProductInfo?.priceOverride 
        ? Number(storeProductInfo.priceOverride)
        : Number(productInfo.basePrice);

      // Calculate options price
      let optionsPrice = 0;
      for (const opt of item.selectedOptions) {
        // Check for product-specific price override
        const [optOverride] = await db.select({
          priceDeltaOverride: productOptionItem.priceDeltaOverride,
        })
          .from(productOptionItem)
          .where(and(
            eq(productOptionItem.productId, item.productId),
            eq(productOptionItem.itemId, opt.itemId)
          ));

        if (optOverride?.priceDeltaOverride !== null) {
          optionsPrice += Number(optOverride.priceDeltaOverride);
        } else {
          // Use default price delta from option_item
          const [optionInfo] = await db.select({
            priceDelta: optionItem.priceDelta,
          })
            .from(optionItem)
            .where(eq(optionItem.id, opt.itemId));

          if (optionInfo?.priceDelta) {
            optionsPrice += Number(optionInfo.priceDelta);
          }
        }
      }

      const totalPrice = (unitPrice + optionsPrice) * item.quantity;

      results.push({
        productId: item.productId,
        productName: productInfo.name,
        unitPrice,
        quantity: item.quantity,
        optionsPrice,
        totalPrice,
        isSpecialPrice: productInfo.isSpecialPrice,
      });
    }

    return results;
  }

  /**
   * Calculate coupon discount
   */
  private async calculateCouponDiscount(
    couponInstanceId: number,
    memberId: number,
    subtotal: number,
    items: Array<{ productId: number; totalPrice: number }>
  ): Promise<number> {
    // Coupon validation and discount calculation logic
    // (Simplified for brevity - full implementation would check coupon rules)
    return 0; // Placeholder
  }
}

export const checkoutService = new CheckoutService();
