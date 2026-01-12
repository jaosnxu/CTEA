/**
 * CHUTEA tRPC Router - Dashboard Statistics
 *
 * Real-time dashboard data from database
 * - Financial statistics (withdrawals, balances)
 * - Order statistics
 * - Product statistics
 * - Store statistics
 */

import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Dashboard Router - Provides real statistics for admin dashboard
 */
export const dashboardRouter = router({
  /**
   * Get financial module statistics
   */
  getFinanceStats: publicProcedure.query(async ({ ctx }) => {
    // Get withdrawal requests
    const [withdrawalRequests, totalWithdrawalAmount] = await Promise.all([
      ctx.prisma.withdrawalrequests.count(),
      ctx.prisma.withdrawalrequests.aggregate({
        _sum: { amount: true },
      }),
    ]);

    // Get total orders revenue (as proxy for balance)
    const totalRevenue = await ctx.prisma.orders.aggregate({
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
  getOrderStats: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, ordersByStatus] = await Promise.all([
      ctx.prisma.orders.count(),
      ctx.prisma.orders.count({
        where: { createdAt: { gte: today } },
      }),
      ctx.prisma.orders.groupBy({
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
  getProductStats: publicProcedure.query(async ({ ctx }) => {
    const [totalProducts, totalCategories] = await Promise.all([
      ctx.prisma.products.count(),
      ctx.prisma.categories.count(),
    ]);

    // Get low stock products (inventory < 10)
    const lowStockCount = await ctx.prisma.mallinventory.count({
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
  getStoreStats: publicProcedure.query(async ({ ctx }) => {
    const [totalStores, activeStores] = await Promise.all([
      ctx.prisma.store.count(),
      ctx.prisma.store.count({ where: { status: "ACTIVE" } }),
    ]);

    return {
      totalStores,
      activeStores,
    };
  }),

  /**
   * Get all dashboard statistics in one call
   */
  getAllStats: publicProcedure.query(async ({ ctx }) => {
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
      ctx.prisma.withdrawalrequests.count(),
      ctx.prisma.withdrawalrequests.aggregate({
        _sum: { amount: true },
      }),
      ctx.prisma.orders.aggregate({
        where: { status: "COMPLETED" },
        _sum: { totalAmount: true },
      }),
      ctx.prisma.orders.count(),
      ctx.prisma.orders.count({
        where: { createdAt: { gte: today } },
      }),
      ctx.prisma.products.count(),
      ctx.prisma.categories.count(),
      ctx.prisma.mallinventory.count({
        where: { quantity: { lt: 10 } },
      }),
      ctx.prisma.store.count(),
      ctx.prisma.store.count({ where: { status: "ACTIVE" } }),
      ctx.prisma.users.count(),
      ctx.prisma.auditLog.count({
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
