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
import { adminOrderRouter } from "./src/trpc/routers/admin-order.router";
import { enhancedOrderRouter } from "./src/trpc/routers/enhanced-order.router";
import { layoutRouter } from "./src/trpc/routers/layout.router";

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
  adminOrder: adminOrderRouter,
  enhancedOrder: enhancedOrderRouter,
  layout: layoutRouter,
});

export type AppRouter = typeof appRouter;
