import express from "express";
import { PRODUCTS } from "./db_mock.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // API Routes - MUST be defined before static middleware
  app.get("/api/products", (req, res) => {
    console.log("API /api/products called");
    res.json(PRODUCTS);
  });

  // Serve static files
  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all other routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Use port 5000 for backend to avoid conflict with Vite (3000)
  const port = 5000;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
