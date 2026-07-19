/**
 * Knowledge Graph (v1) — a curated, filterable timeline of market-moving
 * events (OPEC statements, refinery outages, weather disruptions, shipping
 * bottlenecks, inventory data) plus a heuristic "similar historical
 * periods" lookup.
 *
 * GET /api/knowledge-graph/events  (public) - filterable by type/symbol
 * GET /api/knowledge-graph/similar (public) - heuristic comparable periods for a symbol
 */
import { Router } from "express";
import { and, desc, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { logger } from "../lib/logger";

const router = Router();

const MOCK_EVENTS = [
  {
    id: "mock-kg-1",
    type: "opec",
    title: "OPEC+ holds output quotas steady",
    description: "OPEC+ ministers agreed to maintain current production quotas, citing balanced supply-demand conditions.",
    symbolsAffected: "WTI,BRENT",
    impact: "bearish",
    occurredAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    sourceUrl: null,
  },
  {
    id: "mock-kg-2",
    type: "inventory",
    title: "EIA reports larger-than-expected crude draw",
    description: "EIA weekly data showed a crude inventory draw well above analyst expectations.",
    symbolsAffected: "WTI",
    impact: "bullish",
    occurredAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    sourceUrl: null,
  },
];

router.get("/events", async (req, res) => {
  try {
    const { type, symbol } = req.query;
    const filters: any[] = [];
    if (type && typeof type === "string") {
      filters.push(sql`${schema.kgEvents.type} = ${type}`);
    }
    if (symbol && typeof symbol === "string") {
      filters.push(sql`${schema.kgEvents.symbolsAffected} ILIKE ${"%" + symbol.toUpperCase() + "%"}`);
    }
    const rows = await db.select().from(schema.kgEvents)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(schema.kgEvents.occurredAt))
      .limit(200)
      .execute();
    res.json({ events: rows });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "knowledge graph events failed, returning mock fallback");
    res.json({ events: MOCK_EVENTS });
  }
});

/**
 * GET /api/knowledge-graph/similar?symbol=WTI
 *
 * "Comparable historical periods" heuristic: this is NOT a real
 * graph-similarity engine (no embeddings, no clustering) — it's a simple
 * heuristic that returns past events tagged with the requested symbol,
 * most recent first, framed as periods worth comparing against. A real
 * similarity engine (e.g. embedding-based event matching) is out of scope
 * for v1.
 */
router.get("/similar", async (req, res) => {
  const symbol = typeof req.query.symbol === "string" ? req.query.symbol.toUpperCase() : "";
  if (!symbol) {
    res.status(400).json({ code: "VALIDATION", message: "symbol query param is required", status: 400 });
    return;
  }
  try {
    const rows = await db.select().from(schema.kgEvents)
      .where(sql`${schema.kgEvents.symbolsAffected} ILIKE ${"%" + symbol + "%"}`)
      .orderBy(desc(schema.kgEvents.occurredAt))
      .limit(10)
      .execute();
    res.json({
      symbol,
      method: "heuristic-tag-match",
      note: "Comparable periods matched by symbol tag on past events — not a graph-similarity model.",
      periods: rows,
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "knowledge graph similar failed, returning mock fallback");
    res.json({
      symbol,
      method: "heuristic-tag-match",
      note: "Comparable periods matched by symbol tag on past events — not a graph-similarity model.",
      periods: MOCK_EVENTS.filter((e) => e.symbolsAffected.includes(symbol)),
    });
  }
});

export default router;
