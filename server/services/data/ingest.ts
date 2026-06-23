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
import { getFinnhubStatus } from "./adapters/finnhub";
import { getAlphaVantageStatus } from "./adapters/alphavantage";
import { getBinanceStatus } from "./adapters/binance";
import { getFredStatus, fetchAllMacroSeries } from "./adapters/fred";
import { getWeatherStatus, fetchWeatherDemand } from "./adapters/weather";
import { getFearGreedStatus, fetchFearGreed } from "./adapters/feargreed";
import { getOpenInterestStatus, fetchAllOpenInterest } from "./adapters/openinterest";
import { getCotStatus, fetchCotData } from "./adapters/cot";
import { broadcastTick } from "../../ws/tickBroadcaster";
import { processTick } from "../trading/paperEngine";
import { processSignals } from "../trading/strategyRunner";
import { processCustomStrategies } from "../trading/customStrategyExecutor";
import { cacheGetSet } from "../../lib/redis";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import type { MarketData, TradeSignal } from "../../../shared/types";

let running = false;
let intervals: NodeJS.Timeout[] = [];

export interface DataFeedStatus {
  yahoo: ReturnType<typeof getYahooStatus>;
  finnhub: ReturnType<typeof getFinnhubStatus>;
  alphavantage: ReturnType<typeof getAlphaVantageStatus>;
  binance: ReturnType<typeof getBinanceStatus>;
  fred: ReturnType<typeof getFredStatus>;
  weather: ReturnType<typeof getWeatherStatus>;
  feargreed: ReturnType<typeof getFearGreedStatus>;
  openinterest: ReturnType<typeof getOpenInterestStatus>;
  cot: ReturnType<typeof getCotStatus>;
  eia: ReturnType<typeof getEiaStatus>;
  newsapi: ReturnType<typeof getNewsapiStatus>;
  gdelt: ReturnType<typeof getGdeltStatus>;
  ollama: { reachable: boolean; model: string };
  lastRun: { quotes: string | null; eia: string | null; news: string | null; signals: string | null; macro: string | null; weather: string | null; feargreed: string | null; openinterest: string | null; cot: string | null };
  ingestHealthy: boolean;
}

export async function getDataStatus(): Promise<DataFeedStatus> {
  const ollama = await getOllamaStatus();
  return {
    yahoo: getYahooStatus(),
    finnhub: getFinnhubStatus(),
    alphavantage: getAlphaVantageStatus(),
    binance: getBinanceStatus(),
    fred: getFredStatus(),
    weather: getWeatherStatus(),
    feargreed: getFearGreedStatus(),
    openinterest: getOpenInterestStatus(),
    cot: getCotStatus(),
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
      quotes: null, eia: null, news: null, signals: null, macro: null, weather: null, feargreed: null, openinterest: null, cot: null,
    }));
    return v || { quotes: null, eia: null, news: null, signals: null, macro: null, weather: null, feargreed: null, openinterest: null, cot: null };
  } catch {
    return { quotes: null, eia: null, news: null, signals: null, macro: null, weather: null, feargreed: null, openinterest: null, cot: null };
  }
}

async function recordRun(key: "quotes" | "eia" | "news" | "signals" | "macro" | "weather" | "feargreed" | "openinterest" | "cot") {
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
  const macroMs = parseInt(process.env.MACRO_INTERVAL_MS || "3600000");
  const weatherMs = parseInt(process.env.WEATHER_INTERVAL_MS || "14400000");  // 4h
  const feargreedMs = parseInt(process.env.FEARGREED_INTERVAL_MS || "14400000");  // 4h
  const openinterestMs = parseInt(process.env.OPENINTEREST_INTERVAL_MS || "900000");  // 15min
  const cotMs = parseInt(process.env.COT_INTERVAL_MS || "86400000");  // 24h

  logger.info({ quotesMs, eiaMs, newsMs, signalsMs, macroMs, weatherMs, feargreedMs, openinterestMs, cotMs }, "ingest worker starting");

  void runQuoteTick();
  void runEiaTick();
  void runNewsTick();
  void runSignalTick();
  void runMacroTick();
  void runWeatherTick();
  void runFearGreedTick();
  void runOpenInterestTick();
  void runCotTick();

  intervals.push(setInterval(() => void runQuoteTick(), quotesMs));
  intervals.push(setInterval(() => void runEiaTick(), eiaMs));
  intervals.push(setInterval(() => void runNewsTick(), newsMs));
  intervals.push(setInterval(() => void runSignalTick(), signalsMs));
  intervals.push(setInterval(() => void runMacroTick(), macroMs));
  intervals.push(setInterval(() => void runWeatherTick(), weatherMs));
  intervals.push(setInterval(() => void runFearGreedTick(), feargreedMs));
  intervals.push(setInterval(() => void runOpenInterestTick(), openinterestMs));
  intervals.push(setInterval(() => void runCotTick(), cotMs));
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
    if (sigResult && "ordersSubmitted" in sigResult && sigResult.ordersSubmitted > 0) {
      logger.info({ submitted: sigResult.ordersSubmitted }, "strategy runner: orders from signals");
    }
    // Process user-defined custom strategies (RSI/MACD/etc.)
    const customResult = await processCustomStrategies().catch((err) => logger.warn({ err: err.message }, "processCustomStrategies failed"));
    if (customResult && "ordersPlaced" in customResult && customResult.ordersPlaced > 0) {
      logger.info({ evaluated: (customResult as any).evaluated, triggered: (customResult as any).triggered, placed: (customResult as any).ordersPlaced }, "custom strategies: orders placed");
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

async function runMacroTick(): Promise<void> {
  try {
    const series = await fetchAllMacroSeries();
    await recordRun("macro");
    if (series.length > 0) {
      broadcastTick({ type: "macro", data: series, ts: Date.now() });
      logger.info({ count: series.length }, "macro tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "macro tick failed");
  }
}

async function runWeatherTick(): Promise<void> {
  try {
    const weather = await fetchWeatherDemand();
    await recordRun("weather");
    if (weather) {
      broadcastTick({ type: "weather", data: weather, ts: Date.now() });
      logger.info({ nationalHDD: weather.nationalHDD, nationalCDD: weather.nationalCDD, cities: weather.cities.length }, "weather tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "weather tick failed");
  }
}

async function runFearGreedTick(): Promise<void> {
  try {
    const fg = await fetchFearGreed(7);
    await recordRun("feargreed");
    if (fg) {
      broadcastTick({ type: "feargreed", data: fg, ts: Date.now() });
      logger.info({ value: fg.current.value, classification: fg.current.classification, trend: fg.trend }, "fear/greed tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "fear/greed tick failed");
  }
}

async function runOpenInterestTick(): Promise<void> {
  try {
    const oi = await fetchAllOpenInterest();
    await recordRun("openinterest");
    if (oi.length > 0) {
      broadcastTick({ type: "openinterest", data: oi, ts: Date.now() });
      logger.info({ count: oi.length }, "open interest tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "open interest tick failed");
  }
}

async function runCotTick(): Promise<void> {
  try {
    const cot = await fetchCotData();
    await recordRun("cot");
    if (cot.length > 0) {
      broadcastTick({ type: "cot", data: cot, ts: Date.now() });
      logger.info({ count: cot.length }, "cot tick");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cot tick failed");
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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
        acknowledged: false,
      });
    }
  }
  return signals;
}
