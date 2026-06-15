import type { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";

export interface AuditEntry {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

const auditBuffer: AuditEntry[] = [];
const MAX_BUFFER = 1000;

function flushAuditLog() {
  if (auditBuffer.length === 0) return;
  const batch = auditBuffer.splice(0, auditBuffer.length);
  for (const entry of batch) {
    console.log(JSON.stringify({ type: "audit", ...entry }));
  }
}

setInterval(flushAuditLog, 60000);

export function auditLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = nanoid(12);
  const start = Date.now();

  res.on("finish", () => {
    const entry: AuditEntry = {
      requestId,
      method: req.method,
      path: req.path,
      userId: (req as any).user?.userId,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };

    auditBuffer.push(entry);
    if (auditBuffer.length >= MAX_BUFFER) {
      flushAuditLog();
    }
  });

  next();
}
