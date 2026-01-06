import express from "express";
import { PRODUCTS, ORDERS, USER_PROFILE } from "./db_mock.js";
import { createPayment } from "./payment.controller.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // API Routes
  app.get("/api/products", (req, res) => {
    res.json(PRODUCTS);
  });

  app.get("/api/orders", (req, res) => {
    res.json(ORDERS);
  });

  app.get("/api/user/me", (req, res) => {
    res.json(USER_PROFILE);
  });

  app.post("/api/payment/create", createPayment);

  // Serve static files
  app.use(express.static(staticPath));

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = 5000;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
