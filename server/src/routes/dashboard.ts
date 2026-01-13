/**
 * Dashboard REST API Route
 *
 * Provides real-time dashboard statistics from the database
 * Uses dynamic Prisma import to avoid ESM/CommonJS compatibility issues
 */

import { Router } from "express";

const router = Router();

/**
 * GET /api/dashboard/stats
 * Returns all dashboard statistics
 */
router.get("/stats", async (_req, res) => {
  try {
    // Dynamic import to avoid ESM/CommonJS issues at startup
    const { getPrismaClient } = await import("../db/prisma");
    const prisma = getPrismaClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      withdrawalRequests,
      totalWithdrawalAmount,
      totalRevenue,
      totalOrders,
      todayOrders,
      totalProducts,
      totalCategories,
      lowStockCount,
      totalStores,
      activeStores,
      totalUsers,
      auditLogsToday,
    ] = await Promise.all([
      prisma.withdrawalrequests.count(),
      prisma.withdrawalrequests.aggregate({
        _sum: { amount: true },
      }),
      prisma.orders.aggregate({
        where: { status: "COMPLETED" },
        _sum: { totalAmount: true },
      }),
      prisma.orders.count(),
      prisma.orders.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.products.count(),
      prisma.categories.count(),
      prisma.mallinventory.count({
        where: { quantity: { lt: 10 } },
      }),
      prisma.store.count(),
      prisma.store.count({ where: { status: "ACTIVE" } }),
      prisma.users.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    const stats = {
      finance: {
        totalBalance: totalRevenue._sum.totalAmount || 0,
        pendingWithdrawals: totalWithdrawalAmount._sum.amount || 0,
        withdrawalRequestCount: withdrawalRequests,
      },
      orders: {
        totalOrders,
        todayOrders,
      },
      products: {
        totalProducts,
        totalCategories,
        lowStockCount,
      },
      stores: {
        totalStores,
        activeStores,
      },
      system: {
        totalUsers,
        auditLogsToday,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("[Dashboard] Error fetching stats:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
