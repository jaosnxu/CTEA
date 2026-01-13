/**
 * CTEA Dashboard Router - Combined Statistics
 * 
 * Purpose: Aggregate data from both local SQLite and cloud PostgreSQL
 * - Reads local SQLite amounts for resilient local orders
 * - Reads cloud PostgreSQL amounts for synced orders
 * - Combines both sources for accurate dashboard display
 */

import { Router, Request, Response } from "express";
import { 
  getLocalOrdersTotal, 
  getLocalOrdersSummary,
  getUnsyncedOrders,
  isSqliteAvailable 
} from "../db/sqlite";
import { getPrismaClient } from "../db/prisma";

const router = Router();

// ============================================================================
// Dashboard Statistics
// ============================================================================

/**
 * GET /api/dashboard/stats
 * Get combined statistics from local SQLite and cloud PostgreSQL
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    // Get local SQLite statistics
    let localStats = { total: 0, count: 0 };
    let localSummary: Record<string, { total: number; count: number }> = {};
    let sqliteAvailable = false;

    try {
      sqliteAvailable = isSqliteAvailable();
      if (sqliteAvailable) {
        localStats = getLocalOrdersTotal();
        localSummary = getLocalOrdersSummary();
      }
    } catch (localError) {
      console.warn("[Dashboard] Local SQLite unavailable:", localError);
    }

    // Get cloud PostgreSQL statistics (with timeout to handle network issues)
    let cloudStats = { total: 0, count: 0 };
    let cloudAvailable = false;

    try {
      const prisma = getPrismaClient();
      
      // Add timeout to prevent hanging when cloud DB is unreachable
      const cloudPromise = prisma.orders.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          status: { notIn: ["cancelled", "refunded"] },
        },
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Cloud DB timeout")), 5000)
      );

      const cloudResult = await Promise.race([cloudPromise, timeoutPromise]) as Awaited<typeof cloudPromise>;

      cloudStats = {
        total: Number(cloudResult._sum.totalAmount || 0),
        count: cloudResult._count.id || 0,
      };
      cloudAvailable = true;
    } catch (cloudError) {
      console.warn("[Dashboard] Cloud PostgreSQL unavailable:", cloudError instanceof Error ? cloudError.message : cloudError);
    }

    // Calculate combined totals
    // Note: Local orders that are synced should not be double-counted
    // Only count unsynced local orders + all cloud orders
    const unsyncedOrders = sqliteAvailable ? getUnsyncedOrders() : [];
    const unsyncedTotal = unsyncedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const unsyncedCount = unsyncedOrders.length;

    const combinedStats = {
      total: cloudStats.total + unsyncedTotal,
      count: cloudStats.count + unsyncedCount,
    };

    res.json({
      success: true,
      data: {
        combined: combinedStats,
        local: {
          available: sqliteAvailable,
          stats: localStats,
          summary: localSummary,
          unsyncedCount,
          unsyncedTotal,
        },
        cloud: {
          available: cloudAvailable,
          stats: cloudStats,
        },
        currency: "RUB",
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Dashboard] Failed to get stats:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DASHBOARD_STATS_FAILED",
        message: error instanceof Error ? error.message : "Failed to get dashboard stats",
      },
    });
  }
});

/**
 * GET /api/dashboard/revenue
 * Get revenue breakdown by period
 */
router.get("/revenue", async (req: Request, res: Response) => {
  try {
    const { period = "today" } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get cloud revenue for period (with timeout)
    let cloudRevenue = 0;
    let cloudOrderCount = 0;

    try {
      const prisma = getPrismaClient();
      const cloudPromise = prisma.orders.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          createdAt: { gte: startDate },
          status: { notIn: ["cancelled", "refunded"] },
        },
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Cloud DB timeout")), 5000)
      );

      const cloudResult = await Promise.race([cloudPromise, timeoutPromise]) as Awaited<typeof cloudPromise>;

      cloudRevenue = Number(cloudResult._sum.totalAmount || 0);
      cloudOrderCount = cloudResult._count.id || 0;
    } catch (cloudError) {
      console.warn("[Dashboard] Cloud revenue query failed:", cloudError instanceof Error ? cloudError.message : cloudError);
    }

    // Get local revenue (all unsynced orders - we can't filter by date easily in SQLite)
    let localRevenue = 0;
    let localOrderCount = 0;

    try {
      if (isSqliteAvailable()) {
        const localStats = getLocalOrdersTotal();
        localRevenue = localStats.total;
        localOrderCount = localStats.count;
      }
    } catch (localError) {
      console.warn("[Dashboard] Local revenue query failed:", localError);
    }

    const totalRevenue = cloudRevenue + localRevenue;
    const totalOrders = cloudOrderCount + localOrderCount;

    res.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        revenue: {
          total: totalRevenue,
          cloud: cloudRevenue,
          local: localRevenue,
        },
        orders: {
          total: totalOrders,
          cloud: cloudOrderCount,
          local: localOrderCount,
        },
        currency: "RUB",
        formatted: {
          total: `₽ ${totalRevenue.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}`,
          cloud: `₽ ${cloudRevenue.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}`,
          local: `₽ ${localRevenue.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}`,
        },
      },
    });
  } catch (error) {
    console.error("[Dashboard] Failed to get revenue:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DASHBOARD_REVENUE_FAILED",
        message: error instanceof Error ? error.message : "Failed to get revenue data",
      },
    });
  }
});

/**
 * GET /api/dashboard/health
 * Check system health status
 */
router.get("/health", async (req: Request, res: Response) => {
  const health = {
    sqlite: false,
    postgresql: false,
    timestamp: new Date().toISOString(),
  };

  // Check SQLite
  try {
    health.sqlite = isSqliteAvailable();
  } catch {
    health.sqlite = false;
  }

  // Check PostgreSQL (with timeout)
  try {
    const prisma = getPrismaClient();
    const healthPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Cloud DB timeout")), 3000)
    );
    await Promise.race([healthPromise, timeoutPromise]);
    health.postgresql = true;
  } catch {
    health.postgresql = false;
  }

  const allHealthy = health.sqlite && health.postgresql;

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: health,
    message: allHealthy 
      ? "All systems operational" 
      : `Degraded: SQLite=${health.sqlite}, PostgreSQL=${health.postgresql}`,
  });
});

export default router;
