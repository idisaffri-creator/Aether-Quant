import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth.js";

const ADMIN_EMAILS = new Set([
  "admin@aether-energy.ai",
  "admin@aether.energy",
]);

const ADMIN_USER_IDS = new Set([
  "admin-user-id",
]);

export function isAdminUser(payload: { userId: string; email: string }): boolean {
  return ADMIN_USER_IDS.has(payload.userId) || ADMIN_EMAILS.has(payload.email.toLowerCase());
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "No token provided", status: 401 });
    return;
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid token", status: 401 });
    return;
  }

  if (!isAdminUser(payload)) {
    res.status(403).json({ code: "FORBIDDEN", message: "Admin access required", status: 403 });
    return;
  }

  req.user = payload;
  next();
}
