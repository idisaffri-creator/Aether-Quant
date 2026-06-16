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
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { idempotency } from "./middleware/idempotency";
import { installShutdown, shutdownMiddleware } from "./lib/shutdown";
import { logger } from "./lib/logger";
import authRoutes from "./routes/auth";
import auth2faRoutes from "./routes/auth2fa";
import gdprRoutes from "./routes/gdpr";
import oauthRoutes from "./routes/oauth";
import marketRoutes from "./routes/market";
import agentRoutes from "./routes/agents";
import analysisRoutes from "./routes/analysis";
import benchmarkRoutes from "./routes/benchmark";
import optimizeRoutes from "./routes/optimize";
import mailRoutes from "./routes/mail";
import notificationRoutes from "./routes/notifications";
import auditQueryRoutes from "./routes/auditQuery";
import healthRoutes from "./routes/health";
import adminMailRoutes from "./routes/adminMail";
import adminUsersRoutes from "./routes/adminUsers";
import { setupWebSocket } from "./ws/index";
import { runMigrations } from "./db";
import "./lib/redis"; // init redis client at startup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
const OPTIONAL_ENV = [
  "PORT", "CORS_ORIGIN", "LOG_LEVEL", "REDIS_URL", "TRUST_PROXY",
  "SENTRY_DSN", "ALLOW_REGISTRATION",
];

function parseCors(): string | string[] {
  const v = process.env.CORS_ORIGIN;
  if (!v || v === "*") return "*";
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.warn({ missing }, "Missing required env vars");
    if (missing.includes("JWT_SECRET")) {
      process.env.JWT_SECRET = "aether-dev-secret-change-in-production";
      logger.warn("Using fallback JWT_SECRET — set a real secret in production");
    }
  }
  logger.info({ env: process.env.NODE_ENV || "development" }, "env validated");
}

async function startServer() {
  validateEnv();
  await runMigrations();
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY) : 1);

  // ─── Observability first (so even errors get logged) ─────────────────
  app.use(requestId);
  app.use(requestLogger);
  app.use(shutdownMiddleware);

  // ─── Security headers (strict CSP, HSTS, COOP/COEP) ─────────────────
  const cspReportOnly = process.env.CSP_REPORT_ONLY === "true";
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-inline'"], // Vite injects inline
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "connect-src": ["'self'", "https://aether-energy.ai", "wss://aether-energy.ai", "https://api.aether-energy.ai"],
          "frame-ancestors": ["'none'"],
          "form-action": ["'self'"],
          "base-uri": ["'self'"],
          "report-uri": ["/api/csp-report"],
        },
        reportOnly: cspReportOnly,
      },
      hsts: {
        maxAge: 63072000, // 2 years (HSTS preload eligibility)
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: false, // we serve <img> cross-origin
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      permittedCrossDomainPolicies: false,
    })
  );
  app.use(securityHeaders);
  app.use(
    cors({
      origin: parseCors(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "Idempotency-Key"],
      exposedHeaders: ["X-Request-ID", "Idempotent-Replay"],
      maxAge: 600,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  // ─── Idempotency for all write endpoints ─────────────────────────────
  app.use(idempotency);

  // ─── Existing audit logger + rate limit ──────────────────────────────
  app.use(auditLogger);
  app.use(rateLimit);

  // ─── Routes ──────────────────────────────────────────────────────────
  app.use("/", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/auth/2fa", auth2faRoutes);
  app.use("/api/auth/me", gdprRoutes); // /export, DELETE /
  app.use("/api/auth", oauthRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/analysis", analysisRoutes);
  app.use("/api/benchmark", benchmarkRoutes);
  app.use("/api/optimize", optimizeRoutes);
  app.use("/api/mail", mailRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/audit", auditQueryRoutes);
  app.use("/api/admin/mail", adminMailRoutes);
  app.use("/api/admin", adminUsersRoutes);

  // CSP report collector
  app.post("/api/csp-report", (req, res) => {
    logger.warn({ csp: req.body }, "CSP violation reported");
    res.status(204).end();
  });

  // ─── WebSocket ───────────────────────────────────────────────────────
  const wss = setupWebSocket(server);

  // ─── Static files with proper cache headers ─────────────────────────
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

  // ─── Graceful shutdown ───────────────────────────────────────────────
  installShutdown(server, wss);

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    logger.info({ port, pid: process.pid, node: process.version }, "Aether Energy started");
  });
}

startServer().catch((err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "startup failed");
  process.exit(1);
});
