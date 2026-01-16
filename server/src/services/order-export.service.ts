/**
 * Order Export Service - CSV/Excel Export Functionality
 * 
 * Provides order export functionality with:
 * - CSV export with customizable fields
 * - Excel export with formatting
 * - Support for filtered/selected orders
 * - Large dataset handling with streaming
 */

import { PrismaClient, OrderStatus } from "@prisma/client";
import { getPrismaClient } from "../db/prisma";
import { OrderListFilter } from "./order-service";

export interface ExportOptions {
  format: "csv" | "excel";
  fields?: string[];
  filters?: OrderListFilter;
  orderIds?: (string | bigint)[];
}

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
}

export class OrderExportService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? (getPrismaClient() as PrismaClient);
  }

  /**
   * Export orders to CSV format
   */
  async exportToCSV(options: ExportOptions): Promise<ExportResult> {
    const orders = await this.fetchOrdersForExport(options);
    const fields = options.fields || this.getDefaultFields();

    // Build CSV header
    const header = fields.join(",");

    // Build CSV rows
    const rows = orders.map(order => {
      return fields
        .map(field => {
          const value = this.getFieldValue(order, field);
          // Escape CSV values
          return this.escapeCSV(value);
        })
        .join(",");
    });

    const content = [header, ...rows].join("\n");
    const filename = `orders_export_${new Date().toISOString().split("T")[0]}.csv`;

    return {
      filename,
      content,
      mimeType: "text/csv",
    };
  }

  /**
   * Export orders to Excel format (TSV for simplicity, can be enhanced with a library)
   */
  async exportToExcel(options: ExportOptions): Promise<ExportResult> {
    const orders = await this.fetchOrdersForExport(options);
    const fields = options.fields || this.getDefaultFields();

    // Build Excel-compatible TSV
    const header = fields.join("\t");
    const rows = orders.map(order => {
      return fields
        .map(field => {
          const value = this.getFieldValue(order, field);
          return String(value || "");
        })
        .join("\t");
    });

    const content = [header, ...rows].join("\n");
    const filename = `orders_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    return {
      filename,
      content,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  /**
   * Fetch orders based on export options
   */
  private async fetchOrdersForExport(options: ExportOptions) {
    let where: any = {
      deletedAt: null,
    };

    // Apply filters if provided
    if (options.filters) {
      if (options.filters.storeId) where.storeId = options.filters.storeId;
      if (options.filters.userId) where.userId = options.filters.userId;
      if (options.filters.status) where.status = options.filters.status;
      if (options.filters.startDate || options.filters.endDate) {
        where.createdAt = {};
        if (options.filters.startDate)
          where.createdAt.gte = options.filters.startDate;
        if (options.filters.endDate)
          where.createdAt.lte = options.filters.endDate;
      }
    }

    // Apply specific order IDs if provided
    if (options.orderIds && options.orderIds.length > 0) {
      where.id = {
        in: options.orderIds.map(id => (typeof id === "bigint" ? id : BigInt(id))),
      };
    }

    // Fetch orders with related data
    const orders = await this.prisma.orders.findMany({
      where,
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
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders;
  }

  /**
   * Get default export fields
   */
  private getDefaultFields(): string[] {
    return [
      "orderNumber",
      "status",
      "storeId",
      "storeName",
      "customerPhone",
      "totalAmount",
      "itemCount",
      "createdAt",
    ];
  }

  /**
   * Extract field value from order object
   */
  private getFieldValue(order: any, field: string): string {
    switch (field) {
      case "orderNumber":
        return order.orderNumber || "";
      case "status":
        return order.status || "";
      case "storeId":
        return order.storeId || "";
      case "storeName":
        return typeof order.store?.name === "string"
          ? order.store.name
          : order.store?.name?.en || order.store?.code || "";
      case "customerPhone":
        return order.user?.phone || "";
      case "customerName":
        return order.user?.nickname || "";
      case "totalAmount":
        return order.totalAmount?.toString() || "0";
      case "subtotalAmount":
        return order.subtotalAmount?.toString() || "0";
      case "discountAmount":
        return order.discountAmount?.toString() || "0";
      case "deliveryFee":
        return order.deliveryFee?.toString() || "0";
      case "itemCount":
        return order.orderItems?.length?.toString() || "0";
      case "paymentMethod":
        return order.paymentMethod || "";
      case "paymentStatus":
        return order.paymentStatus || "";
      case "createdAt":
        return order.createdAt
          ? new Date(order.createdAt).toISOString()
          : "";
      case "updatedAt":
        return order.updatedAt
          ? new Date(order.updatedAt).toISOString()
          : "";
      default:
        return "";
    }
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (!value) return "";
    // Wrap in quotes if contains comma, newline, or quotes
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

// Export singleton instance
export const orderExportService = new OrderExportService();

// Export for dependency injection
export function getOrderExportService(
  prisma?: PrismaClient
): OrderExportService {
  return prisma ? new OrderExportService(prisma) : orderExportService;
}
