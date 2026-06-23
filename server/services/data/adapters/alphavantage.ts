/**
 * Alpha Vantage adapter — free tier: 25 API calls/day.
 * Provides: technical indicators (RSI, MACD, SMA, BBANDS), fundamentals, earnings, sentiment.
 *
 * Env: ALPHA_VANTAGE_API_KEY (get free key at https://www.alphavantage.co/support/#api-key)
 */
import { logger } from "../../../lib/logger";
import type { MarketData, Candle } from "../../../../shared/types";

const BASE = "https://www.alphavantage.co/query";
const TIMEOUT_MS = 10000;

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

let lastFetch: string | null = null;
let lastError: string | null = null;
let dailyCallCount = 0;
let dailyCallReset = 0;

export function getAlphaVantageStatus() {
  return {
    healthy: lastError === null && !!API_KEY,
    configured: !!API_KEY,
    dailyCallsRemaining: API_KEY ? Math.max(0, 25 - dailyCallCount) : 0,
    lastFetch,
    error: lastError || undefined,
  };
}

function trackCall() {
  const now = Date.now();
  if (now - dailyCallReset > 86_400_000) {
    dailyCallCount = 0;
    dailyCallReset = now;
  }
  dailyCallCount++;
}

async function avFetch(params: Record<string, string>): Promise<any | null> {
  if (!API_KEY) return null;
  if (dailyCallCount >= 25) {
    logger.debug("alpha vantage daily limit reached");
    return null;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({ ...params, apikey: API_KEY }).toString();
    const r = await fetch(`${BASE}?${qs}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`AV HTTP ${r.status}`);
    trackCall();
    const data = await r.json();
    if (data["Note"] || data["Information"]) {
      logger.debug({ note: data["Note"] || data["Information"] }, "alpha vantage rate limit");
      return null;
    }
    return data;
  } catch (err) {
    lastError = (err as Error).message;
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ─── Technical Indicators ──────────────────────────────────────────────

export interface TechnicalResult {
  indicator: string;
  values: Array<{ timestamp: string; value: number }>;
}

/**
 * Fetch RSI (Relative Strength Index) for a symbol.
 * @param interval "daily", "weekly", "monthly"
 * @param timePeriod 14 (default)
 */
export async function fetchRSI(
  symbol: string,
  interval: "daily" | "weekly" | "monthly" = "daily",
  timePeriod = 14
): Promise<TechnicalResult | null> {
  const data = await avFetch({
    function: "RSI",
    symbol,
    interval,
    time_period: String(timePeriod),
    series_type: "close",
  });
  if (!data?.["Technical Analysis: RSI"]) return null;
  const raw = data["Technical Analysis: RSI"];
  const values = Object.entries(raw)
    .slice(0, 30)
    .map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any).RSI) }));
  return { indicator: "RSI", values };
}

/**
 * Fetch MACD for a symbol.
 */
export async function fetchMACD(
  symbol: string,
  interval: "daily" | "weekly" | "monthly" = "daily"
): Promise<TechnicalResult | null> {
  const data = await avFetch({
    function: "MACD",
    symbol,
    interval,
    series_type: "close",
  });
  if (!data?.["Technical Analysis: MACD"]) return null;
  const raw = data["Technical Analysis: MACD"];
  const values = Object.entries(raw)
    .slice(0, 30)
    .map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any).MACD) }));
  return { indicator: "MACD", values };
}

/**
 * Fetch SMA (Simple Moving Average) for a symbol.
 */
export async function fetchSMA(
  symbol: string,
  interval: "daily" | "weekly" | "monthly" = "daily",
  timePeriod = 20
): Promise<TechnicalResult | null> {
  const data = await avFetch({
    function: "SMA",
    symbol,
    interval,
    time_period: String(timePeriod),
    series_type: "close",
  });
  if (!data?.["Technical Analysis: SMA"]) return null;
  const raw = data["Technical Analysis: SMA"];
  const values = Object.entries(raw)
    .slice(0, 30)
    .map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any).SMA) }));
  return { indicator: "SMA", values };
}

/**
 * Fetch Bollinger Bands for a symbol.
 */
export async function fetchBBANDS(
  symbol: string,
  interval: "daily" | "weekly" | "monthly" = "daily",
  timePeriod = 20
): Promise<{ upper: TechnicalResult; middle: TechnicalResult; lower: TechnicalResult } | null> {
  const data = await avFetch({
    function: "BBANDS",
    symbol,
    interval,
    time_period: String(timePeriod),
    series_type: "close",
  });
  if (!data?.["Technical Analysis: BBANDS"]) return null;
  const raw = data["Technical Analysis: BBANDS"];
  const entries = Object.entries(raw).slice(0, 30);
  return {
    upper: {
      indicator: "BBANDS_upper",
      values: entries.map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any)["Real Upper Band"]) })),
    },
    middle: {
      indicator: "BBANDS_middle",
      values: entries.map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any)["Real Middle Band"]) })),
    },
    lower: {
      indicator: "BBANDS_lower",
      values: entries.map(([ts, v]) => ({ timestamp: ts, value: parseFloat((v as any)["Real Lower Band"]) })),
    },
  };
}

// ─── Quote / Intraday ─────────────────────────────────────────────────

/**
 * Fetch global quote (latest price snapshot).
 */
export async function fetchGlobalQuote(symbol: string): Promise<MarketData | null> {
  const data = await avFetch({ function: "GLOBAL_QUOTE", symbol });
  const gq = data?.["Global Quote"];
  if (!gq || !gq["05. price"]) return null;
  return {
    symbol,
    price: parseFloat(gq["05. price"]),
    change24h: parseFloat(gq["09. change"] || "0"),
    volume24h: parseInt(gq["06. volume"] || "0"),
    high24h: parseFloat(gq["03. high"] || gq["05. price"]),
    low24h: parseFloat(gq["04. low"] || gq["05. price"]),
    bid: parseFloat(gq["05. price"]) * 0.9995,
    ask: parseFloat(gq["05. price"]) * 1.0005,
    spread: parseFloat(gq["05. price"]) * 0.001,
    timestamp: Date.now(),
  };
}

/**
 * Fetch intraday OHLCV candles.
 */
export async function fetchIntraday(
  symbol: string,
  interval: "1min" | "5min" | "15min" | "30min" | "60min" = "5min"
): Promise<Candle[] | null> {
  const data = await avFetch({
    function: "TIME_SERIES_INTRADAY",
    symbol,
    interval,
    outputsize: "compact",
  });
  const tsKey = `Time Series (${interval})`;
  if (!data?.[tsKey]) return null;
  const raw = data[tsKey];
  return Object.entries(raw)
    .slice(0, 100)
    .map(([ts, v]: [string, any]) => ({
      timestamp: new Date(ts).getTime(),
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"]),
    }))
    .reverse();
}

// ─── Fundamentals ─────────────────────────────────────────────────────

export interface CompanyOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  eps: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

/**
 * Fetch company overview / fundamentals.
 */
export async function fetchCompanyOverview(symbol: string): Promise<CompanyOverview | null> {
  const data = await avFetch({ function: "OVERVIEW", symbol });
  if (!data?.Symbol) return null;
  return {
    symbol: data.Symbol,
    name: data.Name || "",
    description: data.Description || "",
    sector: data.Sector || "",
    industry: data.Industry || "",
    marketCap: parseFloat(data.MarketCapitalization || "0"),
    peRatio: parseFloat(data.PERatio || "0"),
    eps: parseFloat(data.EPS || "0"),
    dividendYield: parseFloat(data.DividendYield || "0"),
    fiftyTwoWeekHigh: parseFloat(data["52WeekHigh"] || "0"),
    fiftyTwoWeekLow: parseFloat(data["52WeekLow"] || "0"),
  };
}

/**
 * Fetch earnings data.
 */
export async function fetchEarnings(symbol: string): Promise<any | null> {
  const data = await avFetch({ function: "EARNINGS", symbol });
  if (!data?.annualEarnings) return null;
  return {
    annual: data.annualEarnings.slice(0, 4),
    quarterly: data.quarterlyEarnings?.slice(0, 4),
  };
}

// ─── News Sentiment ───────────────────────────────────────────────────

export interface AVNewsSentiment {
  title: string;
  url: string;
  summary: string;
  source: string;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  tickerSentiment: Array<{
    ticker: string;
    relevanceScore: number;
    tickerSentimentScore: number;
    tickerSentimentLabel: string;
  }>;
}

/**
 * Fetch news with sentiment analysis.
 */
export async function fetchNewsSentiment(tickers?: string[]): Promise<AVNewsSentiment[]> {
  const params: Record<string, string> = {
    function: "NEWS_SENTIMENT",
    sort: "LATEST",
    limit: "20",
  };
  if (tickers && tickers.length > 0) {
    params.tickers = tickers.join(",");
  }
  const data = await avFetch(params);
  if (!data?.feed) return [];
  return data.feed.map((item: any) => ({
    title: item.title,
    url: item.url,
    summary: item.summary,
    source: item.source,
    overallSentimentScore: parseFloat(item.overall_sentiment_score || "0"),
    overallSentimentLabel: item.overall_sentiment_label || "Neutral",
    tickerSentiment: (item.ticker_sentiment || []).map((t: any) => ({
      ticker: t.ticker,
      relevanceScore: parseFloat(t.relevance_score || "0"),
      tickerSentimentScore: parseFloat(t.ticker_sentiment_score || "0"),
      tickerSentimentLabel: t.ticker_sentiment_label || "Neutral",
    })),
  }));
}

// ─── Top Gainers / Losers ─────────────────────────────────────────────

export interface TopMover {
  ticker: string;
  price: number;
  changeAmount: number;
  changePercentage: number;
  volume: number;
}

export async function fetchTopGainersLosers(): Promise<{ topGainers: TopMover[]; topLosers: TopMover[] } | null> {
  const data = await avFetch({ function: "TOP_GAINERS_LOSERS" });
  if (!data?.top_gainers) return null;
  const map = (arr: any[]): TopMover[] =>
    arr.map((m: any) => ({
      ticker: m.ticker,
      price: parseFloat(m.price),
      changeAmount: parseFloat(m.change_amount),
      changePercentage: parseFloat(m.change_percentage),
      volume: parseInt(m.volume),
    }));
  return {
    topGainers: map(data.top_gainers),
    topLosers: map(data.top_losers),
  };
}

lastFetch = new Date().toISOString();
