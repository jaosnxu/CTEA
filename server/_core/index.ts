import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStandardOAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { adminAppRouter } from "../src/trpc/admin-app-router";
import { createContext as createAdminContext } from "../src/trpc/context";
import { serveStatic, setupVite } from "./vite";
import { createLogger } from "../src/utils/logger";
import {
  loggingMiddleware,
  errorLoggingMiddleware,
  requestIdMiddleware,
} from "../src/middleware/logging-middleware";

// Initialize logger
const logger = createLogger("Server");

// Node.js version compatibility check
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split(".")[0], 10);

if (majorVersion >= 24) {
  console.warn(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  WARNING: Node.js v${nodeVersion} detected                                          ║
║                                                                              ║
║  Node.js v24+ has known compatibility issues with esbuild/Vite that may     ║
║  cause "stream read error" during development server startup.               ║
║                                                                              ║
║  RECOMMENDED: Use Node.js v22 LTS for best compatibility.                   ║
║                                                                              ║
║  To switch Node.js version:                                                 ║
║    nvm install 22 && nvm use 22                                             ║
║    # or                                                                     ║
║    fnm install 22 && fnm use 22                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
}

// 业务 API 路由
import withdrawalsRouter from "../src/routes/withdrawals";
import telegramRouter from "../src/routes/telegram";
import systemSettingsRouter from "../src/routes/system-settings";
import financeRouter from "../src/routes/finance";
import sduiRouter from "../src/routes/sdui";
import operationsRouter from "../src/routes/operations";
import brainRouter from "../src/routes/brain";
import tenantRouter from "../src/routes/tenant";
import healthCheckRouter from "../src/routes/health-check";
import ordersRouter, { startBackgroundSync } from "../src/routes/orders";
import dashboardRouter from "../src/routes/dashboard";
import authRouter from "../src/routes/auth";
import smsRouter from "../src/routes/sms";

// 新增 API 路由 - Admin & Client
import adminProductsRouter from "../src/routes/admin/products";
import adminPricingRulesRouter from "../src/routes/admin/pricing-rules";
import clientProductsRouter from "../src/routes/client/products";
import clientLayoutsRouter from "../src/routes/client/layouts";

// Initialize SQLite database
import { getSqliteDb } from "../src/db/sqlite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Health check endpoint (for Docker and monitoring)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "chutea-backend",
      version: "1.0.0",
    });
  });

  // CORS 配置 - 允许前端跨域访问
  app.use(
    cors({
      origin: "http://localhost:5173", // 前端开发服务器地址
      methods: ["GET", "POST", "PUT", "DELETE"], // 允许的 HTTP 方法
      credentials: true, // 允许携带 Cookies 和认证信息
    })
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Request ID middleware (add request ID to all requests)
  app.use(requestIdMiddleware);

  // Logging middleware (replaces simple console.log)
  app.use(loggingMiddleware);

  app.get("/api/test", (req, res) => {
    logger.info("Test route accessed");
    res.json({ success: true, message: "API is working" });
  });

  // OAuth callback under /api/oauth/callback (Manus OAuth)
  registerOAuthRoutes(app);

  // Standard OAuth 2.0 / OIDC routes under /oauth/callback
  registerStandardOAuthRoutes(app);

  // Initialize SQLite database on startup
  try {
    getSqliteDb();
    console.log("[Server] SQLite database initialized");
  } catch (err) {
    console.warn(
      "[Server] SQLite initialization failed, continuing with cloud-only mode:",
      err
    );
  }

  // 业务 API 路由
  app.use("/api/withdrawals", withdrawalsRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/api/system-settings", systemSettingsRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/sdui", sduiRouter);
  app.use("/api/operations", operationsRouter);
  app.use("/api/brain", brainRouter);
  app.use("/api/tenant", tenantRouter);
  app.use("/api/v1/health-check", healthCheckRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/sms", smsRouter);

  // 新增 API 路由 - Admin & Client
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin/pricing-rules", adminPricingRulesRouter);
  app.use("/api/client/products", clientProductsRouter);
  app.use("/api/client/layouts", clientLayoutsRouter);

  // tRPC API (原系统)
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 管理后台 tRPC API (新系统)
  app.use(
    "/api/admin-trpc",
    createExpressMiddleware({
      router: adminAppRouter,
      createContext: createAdminContext,
    })
  );

  // ============================================================
  // REST 兼容端点（为验证脚本和监控系统提供支持）
  // ============================================================
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "CTEA backend is running",
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    try {
      await setupVite(app, server);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("stream") ||
        errorMessage.includes("esbuild") ||
        errorMessage.includes("EPERM")
      ) {
        console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  ERROR: Vite/esbuild initialization failed                                   ║
║                                                                              ║
║  This is likely due to Node.js v24+ compatibility issues with esbuild.      ║
║                                                                              ║
║  SOLUTION: Switch to Node.js v22 LTS:                                        ║
║    nvm install 22 && nvm use 22 && pnpm run dev                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `);
      }
      throw err;
    }
  } else {
    serveStatic(app);
  }

  // Error logging middleware (must be after all routes)
  app.use(errorLoggingMiddleware);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`, {
      preferredPort,
      actualPort: port,
    });
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`, {
      port,
      environment: process.env.NODE_ENV || "development",
    });

    // Start background sync for local orders
    startBackgroundSync();
  });
}

startServer().catch(error => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
