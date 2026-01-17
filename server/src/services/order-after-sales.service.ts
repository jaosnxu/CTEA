/**
 * Order After-Sales Service
 * 
 * Handles after-sales service requests:
 * - Complaint handling
 * - Return requests
 * - Exchange requests
 * - Quality issues
 */

import { PrismaClient, Priority } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { TRPCError } from "@trpc/server";

export interface AfterSalesRequestInput {
  orderId: string | bigint;
  requestType: string;
  description: string;
  images?: string[];
  priority?: Priority;
  createdBy?: string;
}

export interface AfterSalesUpdateInput {
  id: string | bigint;
  status?: string;
  assignedTo?: string;
  resolution?: string;
  notes?: string;
  customerSatisfaction?: number;
  updatedBy?: string;
}

export class OrderAfterSalesService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Create after-sales request
   */
  async createRequest(input: AfterSalesRequestInput): Promise<any> {
    const orderId =
      typeof input.orderId === "bigint" ? input.orderId : BigInt(input.orderId);

    // Verify order exists
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    // Create after-sales request
    const request = await this.prisma.orderAfterSales.create({
      data: {
        orderId,
        requestType: input.requestType,
        description: input.description,
        images: input.images,
        priority: input.priority || Priority.MEDIUM,
        status: "PENDING",
        createdBy: input.createdBy,
      },
    });

    return request;
  }

  /**
   * Update after-sales request
   */
  async updateRequest(input: AfterSalesUpdateInput): Promise<any> {
    const id = typeof input.id === "bigint" ? input.id : BigInt(input.id);

    const request = await this.prisma.orderAfterSales.findUnique({
      where: { id },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "After-sales request not found",
      });
    }

    const updateData: any = {
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    };

    if (input.status) {
      updateData.status = input.status;

      if (input.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      } else if (input.status === "CLOSED") {
        updateData.closedAt = new Date();
      }
    }

    if (input.assignedTo !== undefined) {
      updateData.assignedTo = input.assignedTo;
    }

    if (input.resolution !== undefined) {
      updateData.resolution = input.resolution;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.customerSatisfaction !== undefined) {
      // Validate rating 1-5
      if (
        input.customerSatisfaction < 1 ||
        input.customerSatisfaction > 5
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Customer satisfaction must be between 1 and 5",
        });
      }
      updateData.customerSatisfaction = input.customerSatisfaction;
    }

    const updatedRequest = await this.prisma.orderAfterSales.update({
      where: { id },
      data: updateData,
    });

    return updatedRequest;
  }

  /**
   * Get after-sales request by ID
   */
  async getRequestById(id: string | bigint) {
    const requestId = typeof id === "bigint" ? id : BigInt(id);

    const request = await this.prisma.orderAfterSales.findUnique({
      where: { id: requestId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
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
          },
        },
      },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "After-sales request not found",
      });
    }

    return request;
  }

  /**
   * List after-sales requests with filtering
   */
  async listRequests(filter: {
    orderId?: string | bigint;
    requestType?: string;
    status?: string;
    priority?: Priority;
    assignedTo?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      orderId,
      requestType,
      status,
      priority,
      assignedTo,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = filter;

    const where: any = {};

    if (orderId) {
      where.orderId = typeof orderId === "bigint" ? orderId : BigInt(orderId);
    }

    if (requestType) {
      where.requestType = requestType;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [requests, total] = await Promise.all([
      this.prisma.orderAfterSales.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.orderAfterSales.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get statistics for after-sales requests
   */
  async getStatistics(filter?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    const [total, byStatus, byType, avgSatisfaction] = await Promise.all([
      this.prisma.orderAfterSales.count({ where }),
      this.prisma.orderAfterSales.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      this.prisma.orderAfterSales.groupBy({
        by: ["requestType"],
        where,
        _count: true,
      }),
      this.prisma.orderAfterSales.aggregate({
        where: {
          ...where,
          customerSatisfaction: { not: null },
        },
        _avg: {
          customerSatisfaction: true,
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      byType: byType.map(item => ({
        type: item.requestType,
        count: item._count,
      })),
      averageSatisfaction: avgSatisfaction._avg.customerSatisfaction || 0,
    };
  }

  /**
   * Assign request to staff
   */
  async assignRequest(
    id: string | bigint,
    assignedTo: string,
    updatedBy?: string
  ) {
    const requestId = typeof id === "bigint" ? id : BigInt(id);

    const request = await this.prisma.orderAfterSales.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "After-sales request not found",
      });
    }

    const updatedRequest = await this.prisma.orderAfterSales.update({
      where: { id: requestId },
      data: {
        assignedTo,
        status: request.status === "PENDING" ? "PROCESSING" : request.status,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    return updatedRequest;
  }
}

// Export singleton instance
export const orderAfterSalesService = new OrderAfterSalesService();

// Export for dependency injection
export function getOrderAfterSalesService(
  prisma?: PrismaClient
): OrderAfterSalesService {
  return prisma
    ? new OrderAfterSalesService(prisma)
    : orderAfterSalesService;
}
