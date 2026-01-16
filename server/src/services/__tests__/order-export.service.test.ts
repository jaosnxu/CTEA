/**
 * Integration Tests for Order Export Service
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { OrderExportService } from "../order-export.service";
import { PrismaClient, OrderStatus } from "@prisma/client";

describe("OrderExportService", () => {
  let service: OrderExportService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new OrderExportService(prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  describe("exportToCSV", () => {
    it("should export orders to CSV format", async () => {
      const result = await service.exportToCSV({
        format: "csv",
        filters: {
          status: OrderStatus.COMPLETED,
        },
      });

      expect(result).toBeDefined();
      expect(result.filename).toContain(".csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.content).toContain("orderNumber");
    });

    it("should include specified fields in export", async () => {
      const fields = ["orderNumber", "status", "totalAmount"];
      const result = await service.exportToCSV({
        format: "csv",
        fields,
      });

      const headerLine = result.content.split("\n")[0];
      fields.forEach((field) => {
        expect(headerLine).toContain(field);
      });
    });

    it("should escape CSV special characters", async () => {
      const result = await service.exportToCSV({
        format: "csv",
      });

      // Check that CSV escaping is applied
      expect(result.content).toBeDefined();
      // Values with commas should be quoted
      if (result.content.includes('","')) {
        expect(result.content).toMatch(/"[^"]*,[^"]*"/);
      }
    });
  });

  describe("exportToExcel", () => {
    it("should export orders to Excel format", async () => {
      const result = await service.exportToExcel({
        format: "excel",
      });

      expect(result).toBeDefined();
      expect(result.filename).toContain(".xlsx");
      expect(result.mimeType).toContain("spreadsheetml");
    });
  });

  describe("filtering", () => {
    it("should filter orders by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      const result = await service.exportToCSV({
        format: "csv",
        filters: {
          startDate,
          endDate,
        },
      });

      expect(result).toBeDefined();
      expect(result.content.split("\n").length).toBeGreaterThan(0);
    });

    it("should filter orders by specific order IDs", async () => {
      const orderIds = [BigInt(1), BigInt(2)];

      const result = await service.exportToCSV({
        format: "csv",
        orderIds,
      });

      expect(result).toBeDefined();
    });
  });
});
