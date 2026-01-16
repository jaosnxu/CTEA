/**
 * CHUTEA Admin Backend - tRPC App Router
 *
 * 独立的管理后台 tRPC 路由
 * 路径: /api/admin-trpc
 *
 * 认证方式: JWT
 * 权限控制: 6 级 RBAC
 * 审计链: SHA-256 链式验证
 */

import { router } from "./trpc";
import { storeRouter } from "./routers/store.router";
import { auditRouter } from "./routers/audit.router";
import { rbacRouter } from "./routers/rbac.router";
import { memberRouter } from "./routers/member.router";
import { orderRouter } from "./routers/order.router";
import { dashboardRouter } from "./routers/dashboard.router";

/**
 * 管理后台主 Router
 */
export const adminAppRouter = router({
  store: storeRouter,
  audit: auditRouter,
  rbac: rbacRouter,
  member: memberRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
});

/**
 * 导出 Router 类型
 */
export type AdminAppRouter = typeof adminAppRouter;
