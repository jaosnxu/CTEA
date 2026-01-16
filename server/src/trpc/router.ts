/**
 * CHUTEA tRPC Main Router
 *
 * 合并所有子 routers
 */

import { router } from "./trpc";
import { storeRouter } from "./routers/store.router";
import { auditRouter } from "./routers/audit.router";
import { rbacRouter } from "./routers/rbac.router";
import { memberRouter } from "./routers/member.router";
import { orderRouter } from "./routers/order.router";
import { layoutRouter } from "./routers/layout.router";
import { authRouter } from "./routers/auth.router";

/**
 * 主 Router
 */
export const appRouter = router({
  store: storeRouter,
  audit: auditRouter,
  rbac: rbacRouter,
  member: memberRouter,
  order: orderRouter,
  layout: layoutRouter,
  auth: authRouter,
});

/**
 * 导出 Router 类型
 */
export type AppRouter = typeof appRouter;
