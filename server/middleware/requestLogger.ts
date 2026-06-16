import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { httpRequests, httpDuration } from "../lib/metrics";

/**
 * Logs every request with method, path, status, duration, requestId, userId.
 * Emits Prometheus metrics.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const durationMs = Date.now() - req.startTime;
    const userId = (req as any).user?.userId;
    const route = req.route?.path || req.path;

    const log = logger.child({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      route,
      status: res.statusCode,
      durationMs,
      userId,
      ip: req.ip,
      ua: req.headers["user-agent"]?.slice(0, 100),
    });

    if (res.statusCode >= 500) log.error("request failed");
    else if (res.statusCode >= 400) log.warn("request rejected");
    else log.info("request");

    // Metrics
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    httpDuration.observe(labels, durationMs / 1000);
  });
  next();
}
