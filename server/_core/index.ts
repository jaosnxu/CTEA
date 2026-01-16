import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { adminAppRouter } from "../src/trpc/admin-app-router";
import { createContext as createAdminContext } from "../src/trpc/context";
import { serveStatic, setupVite } from "./vite";

// 业务 API 路由
import withdrawalsRouter from "../src/routes/withdrawals";
import telegramRouter from "../src/routes/telegram";
import systemSettingsRouter from "../src/routes/system-settings";
import financeRouter from "../src/routes/finance";
import sduiRouter from "../src/routes/sdui";
import operationsRouter from "../src/routes/operations";
import brainRouter from "../src/routes/brain";
import tenantRouter from "../src/routes/tenant";
import authRouter from "../src/routes/auth";
import smsRouter from "../src/routes/sms";

// 🆕 新增的产品和布局 API 路由
import adminProductsRouter from "../src/routes/admin/products";
import adminPricingRulesRouter from "../src/routes/admin/pricing-rules";
import clientProductsRouter from "../src/routes/client/products";
import clientLayoutsRouter from "../src/routes/client/layouts";

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
  
  // CORS 配置 - 允许前端跨域访问
  app.use(cors({
    origin: "http://localhost:5173", // 前端开发服务器地址
    methods: ["GET", "POST", "PUT", "DELETE"], // 允许的 HTTP 方法
    credentials: true // 允许携带 Cookies 和认证信息
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  
  // 全局请求日志
  app.use((req, res, next) => {
    console.log(`[Global Request] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/test", (req, res) => {
    console.log("[Test Route] Hit!");
    res.json({ success: true, message: "API is working" });
  });


  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // 业务 API 路由
  app.use("/api/withdrawals", withdrawalsRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/api/system-settings", systemSettingsRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/sdui", sduiRouter);
  app.use("/api/operations", operationsRouter);
  app.use("/api/brain", brainRouter);
  app.use("/api/tenant", tenantRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/sms", smsRouter);

  // 🆕 新增的产品和布局 API 路由
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
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'CTEA backend is running',
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // development mode uses Vite, production mode uses static files
  

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
