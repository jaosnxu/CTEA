import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStandardOAuthRoutes } from "./auth";
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
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "chutea-backend",
      version: "1.0.0"
    });
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback (Manus OAuth)
  registerOAuthRoutes(app);
  
  // Standard OAuth 2.0 / OIDC routes under /oauth/callback
  registerStandardOAuthRoutes(app);

  // 业务 API 路由
  app.use("/api/withdrawals", withdrawalsRouter);
  app.use("/api/telegram", telegramRouter);
  app.use("/api/system-settings", systemSettingsRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/sdui", sduiRouter);
  app.use("/api/operations", operationsRouter);
  app.use("/api/brain", brainRouter);
  app.use("/api/tenant", tenantRouter);

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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

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
