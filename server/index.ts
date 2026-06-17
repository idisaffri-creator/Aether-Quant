import express from "express";
import "express-async-errors"; // patches Express 4 to await async middleware
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
import { requireAdmin2FA } from "./middleware/requireAdmin2FA";
import { installShutdown, shutdownMiddleware } from "./lib/shutdown";
import { logger } from "./lib/logger";
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler, sentryClose } from "./lib/sentry";
import { initOtel, shutdownOtel } from "./lib/otel";
import authRoutes from "./routes/auth";
import auth2faRoutes from "./routes/auth2fa";
import gdprRoutes from "./routes/gdpr";
import oauthRoutes from "./routes/oauth";
import marketRoutes from "./routes/market";
import dataRoutes from "./routes/data";
import newsRoutes from "./routes/news";
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
import tradingRoutes from "./routes/trading";
import openapiRoutes from "./routes/openapi";
import statusRoutes from "./routes/status";
import statusUIRoutes from "./routes/statusUI";
import kycRoutes from "./routes/kyc";
import kycProviderRoutes from "./routes/kycProvider";
import legalRoutes from "./routes/legal";
import alertRoutes from "./routes/alerts";
import backtestRoutes from "./routes/backtest";
import customStrategyRoutes from "./routes/customStrategies";
import strategyTemplateRoutes from "./routes/strategyTemplates";
import exportRoutes from "./routes/export";
import riskRoutes from "./routes/risk";
import calendarRoutes from "./routes/calendar";
import portfolioRoutes from "./routes/portfolio";
import aiRoutes from "./routes/ai";
import comparisonRoutes from "./routes/comparison";
import searchRoutes from "./routes/search";
import storageRoutes from "./routes/storage";
import { initS3 } from "./services/storage/s3";
import { ensureIndexes, reindexAllStrategies } from "./services/search/meilisearch";
import { setupWebSocket } from "./ws/index";
import { runMigrations } from "./db";
import { startIngest, stopIngest } from "./services/data/ingest";
import { registerClient } from "./ws/tickBroadcaster";
import { processTick } from "./services/trading/paperEngine";
import "./lib/redis"; // init redis client at startup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
const OPTIONAL_ENV = [
  "PORT", "CORS_ORIGIN", "LOG_LEVEL", "REDIS_URL", "TRUST_PROXY",
  "SENTRY_DSN", "ALLOW_REGISTRATION", "OTEL_EXPORTER_OTLP_ENDPOINT",
  "GIT_COMMIT",
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
  // Observability first (so even init errors get tracked)
  initOtel();
  initSentry();

  validateEnv();
  await runMigrations();
  const app = express();
  const server = createServer(app);
  // Trust first proxy hop (Traefik) so req.ip reflects the real client IP
  app.set("trust proxy", 1);

  // Sentry request + error handlers (must be before other middleware)
  app.use(sentryRequestHandler());
  app.use(sentryTracingHandler());

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
  app.use(requireAdmin2FA);

  // ─── Routes ──────────────────────────────────────────────────────────
  app.use("/", healthRoutes);
  app.use("/status", statusRoutes);
  app.use("/status", statusUIRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/auth/2fa", auth2faRoutes);
  app.use("/api/auth/me", gdprRoutes); // /export, DELETE /
  app.use("/api/auth", oauthRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api/data", dataRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/analysis", analysisRoutes);
  app.use("/api/benchmark", benchmarkRoutes);
  app.use("/api/optimize", optimizeRoutes);
  app.use("/api/mail", mailRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/audit", auditQueryRoutes);
  app.use("/api/admin/mail", adminMailRoutes);
  app.use("/api/admin", adminUsersRoutes);
  app.use("/api/trading", tradingRoutes);
  app.use("/api/kyc", kycRoutes);
  app.use("/api/kyc", kycProviderRoutes);
  app.use("/api/legal", legalRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/backtest", backtestRoutes);
  app.use("/api/strategies", customStrategyRoutes);
  app.use("/api/strategies", strategyTemplateRoutes);
  app.use("/api/risk", riskRoutes);
  app.use("/api/portfolio", portfolioRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/comparison", comparisonRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api", calendarRoutes);
  app.use("/api", exportRoutes);
  app.use("/api", openapiRoutes);

  // Init external services
  initS3().catch((err) => logger.warn({ err: err.message }, "S3 init failed"));
  ensureIndexes().then(() => reindexAllStrategies().catch(() => {})).catch(() => {});

  // CSP report collector
  app.post("/api/csp-report", (req, res) => {
    logger.warn({ csp: req.body }, "CSP violation reported");
    res.status(204).end();
  });

  // ─── WebSocket ───────────────────────────────────────────────────────
  const wss = setupWebSocket(server);
  // Register each new client with the tick broadcaster (public channel)
  wss.on("connection", (ws) => {
    registerClient(ws);
  });

  // ─── Ingest worker (real-time data pipeline) ────────────────────────
  startIngest();

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

  // Sentry error handler (must be after all routes)
  app.use(sentryErrorHandler());

  // ─── Graceful shutdown ───────────────────────────────────────────────
  installShutdown(server, wss);
  // Add OTel + Sentry flush to shutdown
  process.on("SIGTERM", () => {
    Promise.allSettled([shutdownOtel(), sentryClose(2000)]).then(() => {
      logger.info("observability flushed");
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    logger.info({ port, pid: process.pid, node: process.version }, "Aether Energy started");
  });
}

startServer().catch((err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "startup failed");
  process.exit(1);
});
