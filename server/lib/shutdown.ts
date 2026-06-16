import { logger } from "./logger";
import { redis } from "./redis";
import { db } from "../db";

let shuttingDown = false;

/**
 * Wire SIGTERM/SIGINT to gracefully close:
 * 1. Stop accepting new HTTP connections
 * 2. Drain in-flight requests
 * 3. Close WS server
 * 4. Close DB pool
 * 5. Close Redis
 * 6. Exit
 *
 * Typical cloud-platform grace window: 30s. We aim for 15s.
 */
export function installShutdown(server: { close: (cb?: () => void) => void; closeAllConnections?: () => void }, wss?: { close: (cb?: () => void) => void }) {
  const handler = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutdown initiated");

    const timeout = setTimeout(() => {
      logger.error("shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, 15_000);
    timeout.unref();

    let step = 0;
    const next = () => {
      step++;
      if (step === 1) {
        if (wss) {
          logger.info("closing WebSocket server");
          wss.close(() => next());
        } else {
          next();
        }
      } else if (step === 2) {
        logger.info("closing HTTP server");
        server.close(() => next());
      } else if (step === 3) {
        logger.info("closing Redis");
        redis.quit().catch(() => {}).finally(next);
      } else if (step === 4) {
        logger.info("closing DB pool");
        // postgres-js pool closes when process exits; nothing to do
        next();
      } else {
        logger.info("shutdown complete");
        process.exit(0);
      }
    };
    next();
  };
  process.on("SIGTERM", () => handler("SIGTERM"));
  process.on("SIGINT", () => handler("SIGINT"));
  process.on("uncaughtException", (err) => {
    logger.fatal({ err: err.message, stack: err.stack }, "uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason: String(reason) }, "unhandledRejection");
  });
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Middleware that returns 503 once shutdown started. */
export function shutdownMiddleware(_req: any, res: any, next: any) {
  if (shuttingDown) {
    res.status(503).json({ code: "SHUTTING_DOWN", message: "Server is shutting down, retry shortly" });
    return;
  }
  next();
}
