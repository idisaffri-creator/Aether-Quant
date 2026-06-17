/**
 * Enforce 2FA for admin users on sensitive actions.
 * Sync middleware — checks the JWT payload (no DB call).
 *
 * The JWT must include `role: "admin"` and `twoFactorEnabled: boolean`.
 * Both are set at login in routes/auth.ts.
 */
import type { Request, Response, NextFunction } from "express";

const ADMIN_PROTECTED_PATHS = [
  "/api/admin/users",
  "/api/admin/mail",
  "/api/kyc/admin",
];

export function requireAdmin2FA(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const isAdminPath = ADMIN_PROTECTED_PATHS.some((p) => req.path.startsWith(p) || req.originalUrl.includes(p));
  if (!isAdminPath) return next();
  if (req.user.role !== "admin") return next();
  if (req.user.twoFactorEnabled === true) return next();
  res.status(403).json({
    code: "NEED_2FA",
    message: "Admin access requires 2FA enabled. Visit /dashboard/settings to enable TOTP.",
    status: 403,
  });
}
