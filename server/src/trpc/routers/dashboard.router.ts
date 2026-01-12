/**
 * CHUTEA tRPC Router - Dashboard Statistics
 *
 * Real-time dashboard data from database
 * - Financial statistics (withdrawals, balances)
 * - Order statistics
 * - Product statistics
 * - Store statistics
 */

import { router, publicProcedure } from "../trpc";
import { getPrismaClient } from "../../db/prisma";

/**
 * Dashboard Router - Provides real statistics for admin dashboard
 */
export const dashboardRouter = router({
  /**
   * Get financial module statistics
   */
  getFinanceStats: publicProcedure.query(async () => {
    const prisma = getPrismaClient();

    // Get withdrawal requests
    const [withdrawalRequests, totalWithdrawalAmount] = await Promise.all([
      prisma.withdrawalrequests.count(),
      prisma.withdrawalrequests.aggregate({
        _sum: { amount: true },
      }),
    ]);

    // Get total orders revenue (as proxy for balance)
    const totalRevenue = await prisma.orders.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalAmount: true },
    });

    return {
      totalBalance: totalRevenue._sum.totalAmount || 0,
      pendingWithdrawals: totalWithdrawalAmount._sum.amount || 0,
      withdrawalRequestCount: withdrawalRequests,
    };
  }),

  /**
   * Get order/operations statistics
   */
  getOrderStats: publicProcedure.query(async () => {
    const prisma = getPrismaClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, ordersByStatus] = await Promise.all([
      prisma.orders.count(),
      prisma.orders.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.orders.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    return {
      totalOrders,
      todayOrders,
      ordersByStatus: ordersByStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
    };
  }),

  /**
   * Get product statistics
   */
  getProductStats: publicProcedure.query(async () => {
    const prisma = getPrismaClient();

    const [totalProducts, totalCategories] = await Promise.all([
      prisma.products.count(),
      prisma.categories.count(),
    ]);

    // Get low stock products (inventory < 10)
    const lowStockCount = await prisma.mallinventory.count({
      where: { quantity: { lt: 10 } },
    });

    return {
      totalProducts,
      totalCategories,
      lowStockCount,
    };
  }),

  /**
   * Get store statistics
   */
  getStoreStats: publicProcedure.query(async () => {
    const prisma = getPrismaClient();

    const [totalStores, activeStores] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { status: "ACTIVE" } }),
    ]);

    return {
      totalStores,
      activeStores,
    };
  }),

  /**
   * Get all dashboard statistics in one call
   */
  getAllStats: publicProcedure.query(async () => {
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

    return {
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
  }),
});
