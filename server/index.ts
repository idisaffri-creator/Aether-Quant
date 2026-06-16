import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { generalLimiter as rateLimit } from "./middleware/rateLimit";
import { auditLogger } from "./middleware/auditLog";
import { securityHeaders } from "./middleware/security";
import authRoutes from "./routes/auth";
import oauthRoutes from "./routes/oauth";
import marketRoutes from "./routes/market";
import agentRoutes from "./routes/agents";
import analysisRoutes from "./routes/analysis";
import benchmarkRoutes from "./routes/benchmark";
import optimizeRoutes from "./routes/optimize";
import mailRoutes from "./routes/mail";
import notificationRoutes from "./routes/notifications";
import auditRoutes from "./routes/audit";
import adminMailRoutes from "./routes/adminMail";
import adminUsersRoutes from "./routes/adminUsers";
import { setupWebSocket } from "./ws/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
const OPTIONAL_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "PORT", "CORS_ORIGIN"];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Missing required env vars: ${missing.join(", ")}`);
    if (missing.includes("JWT_SECRET")) {
      process.env.JWT_SECRET = "aether-dev-secret-change-in-production";
      console.warn("Using fallback JWT_SECRET — set a real secret in production");
    }
  }
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
}

async function startServer() {
  validateEnv();
  const app = express();
  const server = createServer(app);

  // Security & parsing
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(securityHeaders);
  app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(auditLogger);
  app.use(rateLimit);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/auth", oauthRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/analysis", analysisRoutes);
  app.use("/api/benchmark", benchmarkRoutes);
  app.use("/api/optimize", optimizeRoutes);
  app.use("/api/mail", mailRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/admin/mail", adminMailRoutes);
  app.use("/api/admin", adminUsersRoutes);

  // WebSocket
  setupWebSocket(server);

  // Static files (production) with proper cache headers:
  //   index.html   -> no-cache (always fetch latest, so new chunk hashes are picked up)
  //   /assets/*    -> 1 year immutable (Vite hashes filenames, safe to cache forever)
  //   other files  -> 1 hour cache
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  if (fs.existsSync(staticPath)) {
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path === "/" || req.path === "/index.html" || !path.extname(req.path)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (req.path.startsWith("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
      next();
    });
    app.use(express.static(staticPath));
  }

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Aether Energy running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
