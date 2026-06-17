/**
 * Enforce 2FA for admin users on sensitive actions.
 * Other users are not required to have 2FA (recommended, not enforced).
 */
import type { Request, Response, NextFunction } from "express";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

const ADMIN_PROTECTED_PATHS = [
  "/api/admin/users",
  "/api/admin/mail",
  "/api/kyc/admin",
];

/**
 * Middleware: if user is admin/tier-admin, require 2FA to be enabled.
 * Returns 403 with code=NEED_2FA if admin without 2FA hits a protected path.
 */
export async function requireAdmin2FA(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const isAdminPath = ADMIN_PROTECTED_PATHS.some((p) => req.path.startsWith(p));
  if (!isAdminPath) return next();

  // Check admin status
  const isAdmin = req.user.role === "admin";
  // We need to check tier too — get from DB
  const userRows = await db.select({ tier: schema.users.tier })
    .from(schema.users).where(eq(schema.users.id, req.user.userId)).execute();
  const tier = userRows[0]?.tier;
  const isAdminTier = tier === "admin";
  if (!isAdmin && !isAdminTier) return next();

  // Check 2FA status
  const prefs = (userRows[0] as any)?.preferences;
  if (!prefs || !prefs.twoFactor || !prefs.twoFactor.enabled) {
    res.status(403).json({
      code: "NEED_2FA",
      message: "Admin access requires 2FA enabled. Visit /dashboard/settings to enable TOTP.",
      status: 403,
    });
    return;
  }
  next();
}
