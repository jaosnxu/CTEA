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
import { healthRouter } from "./routers/health.router";
import { bannerRouter } from "./routers/banner.router";
import { marketingRouter } from "./routers/marketing.router";
import { productRouter } from "./routers/product.router";
import { biRouter } from "./routers/bi.router";
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
  health: healthRouter,
  banner: bannerRouter,
  marketing: marketingRouter,
  product: productRouter,
  bi: biRouter,
  layout: layoutRouter,
  auth: authRouter,
});

/**
 * 导出 Router 类型
 */
export type AppRouter = typeof appRouter;
