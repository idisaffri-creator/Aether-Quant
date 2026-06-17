/**
 * CSV export routes — for orders, positions, backtests, audit log.
 * Format: RFC 4180 compliant.
 */
import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { db, schema } from "../db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n");
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get("/trading/orders/export.csv", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.orders)
      .where(eq(schema.orders.userId, req.user!.userId))
      .orderBy(desc(schema.orders.createdAt))
      .limit(10_000)
      .execute();
    const csv = toCsv(rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      side: r.side,
      type: r.type,
      quantity: r.quantity,
      limitPrice: r.limitPrice,
      stopPrice: r.stopPrice,
      status: r.status,
      filledQty: r.filledQty,
      avgFillPrice: r.avgFillPrice,
      strategyId: r.strategyId,
      createdAt: r.createdAt?.toISOString(),
      filledAt: r.filledAt?.toISOString() || "",
      cancelledAt: r.cancelledAt?.toISOString() || "",
    })));
    sendCsv(res, `aether-orders-${new Date().toISOString().split("T")[0]}.csv`, csv);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "orders CSV export failed");
    res.status(500).json({ code: "INTERNAL", message: "Export failed" });
  }
});

router.get("/trading/positions/export.csv", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.positions)
      .where(eq(schema.positions.userId, req.user!.userId))
      .execute();
    const csv = toCsv(rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      quantity: r.quantity,
      avgEntryPrice: r.avgEntryPrice,
      realizedPnl: r.realizedPnl,
      updatedAt: r.updatedAt?.toISOString(),
    })));
    sendCsv(res, `aether-positions-${new Date().toISOString().split("T")[0]}.csv`, csv);
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Export failed" });
  }
});

router.get("/backtest/:id/export.csv", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.backtests)
      .where(and(eq(schema.backtests.id, req.params.id), eq(schema.backtests.userId, req.user!.userId)))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Backtest not found" });
      return;
    }
    const row = rows[0];
    const result = row.result ? JSON.parse(row.result) : null;
    const trades = result?.trades || [];
    const csv = toCsv(trades.map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      entryTime: new Date(t.entryTime).toISOString(),
      exitTime: t.exitTime ? new Date(t.exitTime).toISOString() : "",
      side: t.side,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice || "",
      quantity: t.quantity,
      pnl: t.pnl?.toFixed(2) || "",
      pnlPct: t.pnlPct ? (t.pnlPct * 100).toFixed(2) + "%" : "",
      reason: t.reason,
    })));
    sendCsv(res, `aether-backtest-${req.params.id}.csv`, csv);
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Export failed" });
  }
});

router.get("/audit/export.csv", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(schema.auditLog)
      .where(eq(schema.auditLog.userId, req.user!.userId))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(10_000)
      .execute();
    const csv = toCsv(rows.map(r => ({
      id: r.id,
      action: r.action,
      ip: r.ip,
      userAgent: r.userAgent?.slice(0, 100),
      createdAt: r.createdAt?.toISOString(),
    })));
    sendCsv(res, `aether-audit-${new Date().toISOString().split("T")[0]}.csv`, csv);
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Export failed" });
  }
});

export default router;
