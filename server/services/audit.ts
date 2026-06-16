import { db, schema } from "../db";
import { logger } from "../lib/logger";
import { eq, and, gte, desc, sql } from "drizzle-orm";

export type AuditAction =
  | "auth.login" | "auth.login_failed" | "auth.logout"
  | "auth.register" | "auth.password_change" | "auth.password_reset"
  | "auth.2fa_enabled" | "auth.2fa_disabled"
  | "profile.update" | "account.delete" | "account.export"
  | "admin.user.create" | "admin.user.update" | "admin.user.suspend" | "admin.user.activate" | "admin.user.reset_password" | "admin.user.delete"
  | "admin.mail.send" | "admin.mail.purge" | "admin.mail.bulk"
  | "rate_limit.exceeded" | "idempotency.conflict"
  | "security.cors_violation" | "security.suspicious";

export interface AuditEntry {
  userId?: string;
  actorId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Best-effort audit write. Failures are logged but never throw —
 * we don't want audit-log outages to break user flows.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      id: crypto.randomUUID(),
      userId: entry.userId || entry.actorId,
      actorId: entry.actorId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ip: entry.ip,
      userAgent: entry.userAgent?.slice(0, 255),
      meta: entry.meta ? JSON.stringify(entry.meta) : null,
      requestId: entry.requestId,
      createdAt: new Date(),
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message, action: entry.action }, "audit write failed");
  }
}

/**
 * Query audit log. Admins see all; users see their own.
 */
export async function queryAudit(opts: {
  userId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];
  if (opts.userId) conditions.push(eq(schema.auditLog.userId, opts.userId));
  if (opts.action) conditions.push(eq(schema.auditLog.action, opts.action));
  if (opts.from) conditions.push(gte(schema.auditLog.createdAt, opts.from));

  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(Math.min(opts.limit || 100, 1000))
    .offset(opts.offset || 0);

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    actorId: r.actorId,
    action: r.action,
    resource: r.resource,
    resourceId: r.resourceId,
    ip: r.ip,
    userAgent: r.userAgent,
    meta: r.meta ? JSON.parse(r.meta) : null,
    requestId: r.requestId,
    createdAt: r.createdAt.toISOString(),
  }));
}
