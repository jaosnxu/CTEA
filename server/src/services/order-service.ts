/**
 * Order Service - Order Management with CRUD and Status Transitions
 *
 * Provides comprehensive order management including:
 * - List orders with filtering and pagination
 * - Get order details with items
 * - Create new orders
 * - Update order information
 * - Change order status with validation
 * - Soft delete orders
 */

import { PrismaClient, OrderStatus, Prisma } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { TRPCError } from "@trpc/server";

export interface OrderListFilter {
  storeId?: string;
  userId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface OrderCreateInput {
  orderNumber?: string;
  storeId: string;
  userId?: string;
  status?: OrderStatus;
  items: OrderItemInput[];
  deliveryAddress?: Record<string, unknown>;
  notes?: string;
  paymentMethod?: string;
  deliveryFee?: number;
}

export interface OrderItemInput {
  productId: number;
  productName: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  specifications?: Record<string, unknown>;
  notes?: string;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  notes?: string;
  deliveryAddress?: Record<string, unknown>;
  paymentMethod?: string;
  paymentStatus?: string;
}

export class OrderService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * List orders with filtering and pagination
   */
  async list(filter: OrderListFilter) {
    const {
      storeId,
      userId,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      includeDeleted = false,
    } = filter;

    // Build where clause
    const where: Prisma.OrdersWhereInput = {};

    if (storeId) {
      where.storeId = storeId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Filter out soft deleted orders by default
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Execute query with pagination
    const [orders, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          user: {
            select: {
              id: true,
              phone: true,
              nickname: true,
            },
          },
          orderItems: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
            },
          },
        },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get order detail by ID
   */
  async detail(orderId: bigint | string | number) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            avatar: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    return order;
  }

  /**
   * Create a new order
   */
  async create(input: OrderCreateInput, operatorId?: string) {
    // Validate items
    if (!input.items || input.items.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Order must have at least one item",
      });
    }

    // Calculate totals
    let subtotalAmount = 0;
    let discountAmount = 0;

    const items = input.items.map(item => {
      const itemSubtotal = item.quantity * Number(item.unitPrice);
      const itemDiscount = Number(item.discountAmount || 0);
      subtotalAmount += itemSubtotal;
      discountAmount += itemDiscount;

      return {
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal - itemDiscount,
        discountAmount: itemDiscount,
        specifications: item.specifications,
        notes: item.notes,
        createdBy: operatorId,
        updatedBy: operatorId,
      };
    });

    const deliveryFee = input.deliveryFee || 0;
    const totalAmount = subtotalAmount - discountAmount + deliveryFee;

    // Generate order number if not provided
    const orderNumber =
      input.orderNumber || this.generateOrderNumber(input.storeId);

    // Create order with items in transaction
    const order = await this.prisma.$transaction(async tx => {
      const newOrder = await tx.orders.create({
        data: {
          orderNumber,
          storeId: input.storeId,
          userId: input.userId,
          status: input.status || OrderStatus.PENDING,
          subtotalAmount,
          discountAmount,
          deliveryFee,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
          createdBy: operatorId,
          updatedBy: operatorId,
          orderItems: {
            create: items,
          },
        },
        include: {
          orderItems: true,
        },
      });

      return newOrder;
    });

    return order;
  }

  /**
   * Update order information
   */
  async update(
    orderId: bigint | string | number,
    input: OrderUpdateInput,
    operatorId?: string
  ) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    // Check if order exists
    const existingOrder = await this.prisma.orders.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (existingOrder.deletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot update deleted order",
      });
    }

    // Update order
    const updatedOrder = await this.prisma.orders.update({
      where: { id },
      data: {
        ...input,
        updatedBy: operatorId,
        updatedAt: new Date(),
      },
      include: {
        orderItems: true,
      },
    });

    return updatedOrder;
  }

  /**
   * Change order status with validation
   */
  async changeStatus(
    orderId: bigint | string | number,
    newStatus: OrderStatus,
    reason?: string,
    operatorId?: string
  ) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    // Get current order
    const order = await this.prisma.orders.findUnique({
      where: { id },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.deletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change status of deleted order",
      });
    }

    // Validate status transition
    this.validateStatusTransition(order.status, newStatus);

    // Update status
    const updatedOrder = await this.prisma.orders.update({
      where: { id },
      data: {
        status: newStatus,
        updatedBy: operatorId,
        updatedAt: new Date(),
      },
    });

    return {
      order: updatedOrder,
      previousStatus: order.status,
      newStatus,
      reason,
    };
  }

  /**
   * Soft delete order
   */
  async remove(orderId: bigint | string | number, operatorId?: string) {
    const id = typeof orderId === "bigint" ? orderId : BigInt(orderId);

    // Check if order exists
    const order = await this.prisma.orders.findUnique({
      where: { id },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.deletedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Order already deleted",
      });
    }

    // Soft delete
    const deletedOrder = await this.prisma.orders.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: operatorId,
        updatedAt: new Date(),
      },
    });

    return deletedOrder;
  }

  /**
   * Get order statistics
   */
  async getStatistics(filter: {
    storeId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Prisma.OrdersWhereInput = {
      deletedAt: null,
    };

    if (filter.storeId) {
      where.storeId = filter.storeId;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const [total, byStatus, revenue] = await Promise.all([
      this.prisma.orders.count({ where }),
      this.prisma.orders.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      this.prisma.orders.aggregate({
        where: {
          ...where,
          status: { in: [OrderStatus.COMPLETED] },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      revenue: revenue._sum.totalAmount || 0,
    };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): void {
    // Define valid transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
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

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      });
    }
  }

  /**
   * Generate order number
   */
  private generateOrderNumber(storeId: string): string {
    const timestamp = Date.now();
    const storeCode =
      storeId.length >= 4
        ? storeId.slice(-4).toUpperCase()
        : storeId.padEnd(4, "0").toUpperCase();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `ORD-${storeCode}-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const orderService = new OrderService();

// Export for dependency injection
export function getOrderService(prisma?: PrismaClient): OrderService {
  return prisma ? new OrderService(prisma) : orderService;
}
