import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { translationRouter } from "./translationRouter";
import { storeRouter } from "./src/trpc/routers/store.router";
import { auditRouter } from "./src/trpc/routers/audit.router";
import { rbacRouter } from "./src/trpc/routers/rbac.router";
import { memberRouter } from "./src/trpc/routers/member.router";
import { orderRouter } from "./src/trpc/routers/order.router";
import { getPrismaClient } from "./src/db/prisma";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 翻译管理路由（系统负责人中心化模式）
  translation: translationRouter,

  // 新增的管理后台路由（M3.4-GLOBAL-COMP-002A-PH5-ADMIN-DEV-B-FULL）
  store: storeRouter,
  audit: auditRouter,
  rbac: rbacRouter,
  member: memberRouter,
  order: orderRouter,

  // Dashboard router - defined inline to use same tRPC instance
  dashboard: router({
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
  }),
});

export type AppRouter = typeof appRouter;
