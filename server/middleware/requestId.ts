import type { Request, Response, NextFunction } from "express";
import { newRequestId } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

/**
 * Propagates X-Request-ID across services; generates one if missing.
 * Every log line for this request will include `requestId`.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  req.id = (typeof incoming === "string" && incoming.length < 200 ? incoming : newRequestId()) as string;
  req.startTime = Date.now();
  res.setHeader("X-Request-ID", req.id);
  next();
}
