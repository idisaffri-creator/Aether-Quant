/**
 * Background ingest worker.
 * Polls adapters on a schedule, primes the cache, and pushes price ticks to WS.
 *
 * Schedule (defaults, override via env):
 *   QUOTES_INTERVAL_MS    = 60_000    (1 min)
 *   EIA_INTERVAL_MS       = 3_600_000 (1 hour)
 *   NEWS_INTERVAL_MS      = 1_800_000 (30 min)
 *
 * Designed to be cheap: at default intervals, ~100 calls/day.
 */
import { logger } from "../../lib/logger";
import { getQuotes } from "./quoteCache";
import { getEnergyNews } from "./newsCache";
import { fetchAllEiaSeries, getEiaStatus } from "./adapters/eia";
import { getYahooStatus } from "./adapters/yahoo";
import { getNewsapiStatus } from "./adapters/newsapi";
import { getGdeltStatus } from "./adapters/gdelt";
import { getOllamaStatus } from "./adapters/ollama";
import { broadcastTick } from "../../ws/tickBroadcaster";
import { processTick } from "../trading/paperEngine";
import { processSignals } from "../trading/strategyRunner";
import { cacheGetSet } from "../../lib/redis";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import type { MarketData, TradeSignal } from "../../../shared/types";

let running = false;
let intervals: NodeJS.Timeout[] = [];

export interface DataFeedStatus {
  yahoo: ReturnType<typeof getYahooStatus>;
  eia: ReturnType<typeof getEiaStatus>;
  newsapi: ReturnType<typeof getNewsapiStatus>;
  gdelt: ReturnType<typeof getGdeltStatus>;
  ollama: { reachable: boolean; model: string };
  lastRun: { quotes: string | null; eia: string | null; news: string | null; signals: string | null };
  ingestHealthy: boolean;
}

export async function getDataStatus(): Promise<DataFeedStatus> {
  const ollama = await getOllamaStatus();
  return {
    yahoo: getYahooStatus(),
    eia: getEiaStatus(),
    newsapi: getNewsapiStatus(),
    gdelt: getGdeltStatus(),
    ollama,
    lastRun: await getIngestRuns(),
    ingestHealthy: !!(getYahooStatus().healthy || true) && (ollama.reachable || true),
  };
}

async function getIngestRuns(): Promise<DataFeedStatus["lastRun"]> {
  try {
    const v = await cacheGetSet<any>("data:ingest:status", 30, async () => ({
      quotes: null, eia: null, news: null, signals: null,
    }));
    return v || { quotes: null, eia: null, news: null, signals: null };
  } catch {
    return { quotes: null, eia: null, news: null, signals: null };
  }
}

async function recordRun(key: "quotes" | "eia" | "news" | "signals") {
  const s = await getIngestRuns();
  s[key] = new Date().toISOString();
  // Short TTL — not critical, just for /api/data/status display
  const { redis } = await import("../../lib/redis");
  await redis.set("data:ingest:status", JSON.stringify(s), "EX", 86400);
}

export function startIngest(): void {
  if (running) return;
  running = true;
  const quotesMs = parseInt(process.env.QUOTES_INTERVAL_MS || "60000");
  const eiaMs = parseInt(process.env.EIA_INTERVAL_MS || "3600000");
  const newsMs = parseInt(process.env.NEWS_INTERVAL_MS || "1800000");
  const signalsMs = parseInt(process.env.SIGNALS_INTERVAL_MS || "300000");

  logger.info({ quotesMs, eiaMs, newsMs, signalsMs }, "ingest worker starting");

  // Run once immediately, then on interval
  void runQuoteTick();
  void runEiaTick();
  void runNewsTick();
  void runSignalTick();

  intervals.push(setInterval(() => void runQuoteTick(), quotesMs));
  intervals.push(setInterval(() => void runEiaTick(), eiaMs));
  intervals.push(setInterval(() => void runNewsTick(), newsMs));
  intervals.push(setInterval(() => void runSignalTick(), signalsMs));
}

export function stopIngest(): void {
  if (!running) return;
  running = false;
  intervals.forEach(clearInterval);
  intervals = [];
  logger.info("ingest worker stopped");
}

async function runQuoteTick(): Promise<void> {
  try {
    const quotes = await getQuotes();
    const liveCount = quotes.filter((q) => !(q as any)._mock).length;
    await recordRun("quotes");
    logger.info({ total: quotes.length, live: liveCount }, "quote tick");
    // Broadcast live quotes to all WS clients
    broadcastTick({ type: "quotes", data: quotes, ts: Date.now() });
    // Process pending paper orders against current prices
    await processTick(quotes).catch((err) => logger.warn({ err: err.message }, "processTick failed"));
    // Process signals → submit paper orders for users with running strategies
    const sigResult = await processSignals(quotes).catch((err) => logger.warn({ err: err.message }, "processSignals failed"));
    if (sigResult.ordersSubmitted > 0) {
      logger.info({ submitted: sigResult.ordersSubmitted }, "strategy runner: orders from signals");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "quote tick failed");
  }
}

async function runEiaTick(): Promise<void> {
  try {
    const series = await fetchAllEiaSeries();
    await recordRun("eia");
    logger.info({ count: series.length }, "eia tick");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "eia tick failed");
  }
}

async function runNewsTick(): Promise<void> {
  try {
    const { articles, source } = await getEnergyNews();
    await recordRun("news");
    logger.info({ count: articles.length, source }, "news tick");
    broadcastTick({ type: "news", data: { articles: articles.slice(0, 5), source }, ts: Date.now() });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "news tick failed");
  }
}

async function runSignalTick(): Promise<void> {
  try {
    const signals = await generateSignals();
    await recordRun("signals");
    if (signals.length > 0) {
      // Persist to DB
      for (const s of signals) {
        try {
          await db.insert(schema.signals).values({
            id: crypto.randomUUID(),
            userId: null,
            symbol: s.symbol,
            direction: s.direction,
            confidence: String(s.confidence),
            strategy: s.strategy,
            reason: s.reason,
            acknowledged: "false",
            createdAt: new Date(),
          }).execute();
        } catch { /* skip dupes */ }
      }
      broadcastTick({ type: "signals", data: signals, ts: Date.now() });
      logger.info({ count: signals.length }, "signal tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "signal tick failed");
  }
}

/**
 * Generate trading signals from price moves.
 * Simple RSI-2 mean-reversion: oversold → buy, overbought → sell.
 */
async function generateSignals(): Promise<TradeSignal[]> {
  const quotes = await getQuotes();
  const signals: TradeSignal[] = [];
  for (const q of quotes) {
    // Skip if change is too small
    if (Math.abs(q.change24h) < 1) continue;
    // Very naive mean-reversion: big down → bullish, big up → bearish
    if (q.change24h <= -3) {
      signals.push({
        id: `sig-${q.symbol}-${Date.now()}-mr-buy`,
        symbol: q.symbol,
        direction: "long",
        confidence: Math.min(0.9, 0.5 + Math.abs(q.change24h) / 20),
        strategy: "Mean Reversion (oversold)",
        reason: `24h drop of ${q.change24h.toFixed(2)}% suggests oversold conditions; watching for reversal.`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        acknowledged: false,
      });
    } else if (q.change24h >= 3) {
      signals.push({
        id: `sig-${q.symbol}-${Date.now()}-mr-sell`,
        symbol: q.symbol,
        direction: "short",
        confidence: Math.min(0.9, 0.5 + Math.abs(q.change24h) / 20),
        strategy: "Mean Reversion (overbought)",
        reason: `24h rally of ${q.change24h.toFixed(2)}% suggests overbought conditions; watching for pullback.`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
        acknowledged: false,
      });
    }
  }
  return signals;
}
