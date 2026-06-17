/**
 * NewsAPI.org adapter for energy + finance headlines.
 * Free tier: 100 requests/day. 80k+ sources.
 * Used for real-time news on energy markets.
 */
import { logger } from "../../../lib/logger";

const NEWSAPI_BASE = "https://newsapi.org/v2";
const TIMEOUT_MS = 5000;
const CACHE_TTL_S = 1800; // 30 min

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  author: string | null;
  publishedAt: string;
  urlToImage: string | null;
  content: string | null;
  tickers: string[]; // crude/ngas/gold/brent heuristics
  sentiment?: "bullish" | "bearish" | "neutral";
  sentimentScore?: number;
}

export interface NewsFeedStatus {
  healthy: boolean;
  configured: boolean;
  lastFetch: string | null;
  remaining: number | null;
  error?: string;
}

let lastFetch: string | null = null;
let lastError: string | null = null;
let remaining: number | null = null;

export function getNewsapiStatus(): NewsFeedStatus {
  return {
    healthy: lastError === null,
    configured: !!process.env.NEWSAPI_KEY,
    lastFetch,
    remaining,
    error: lastError || undefined,
  };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    title: string;
    description: string | null;
    url: string;
    source: { id: string | null; name: string };
    author: string | null;
    publishedAt: string;
    urlToImage: string | null;
    content: string | null;
  }>;
}

// Heuristics to tag articles with relevant tickers
const TICKER_PATTERNS: Array<{ pattern: RegExp; tickers: string[] }> = [
  { pattern: /\b(WTI|crude oil|west texas|opec|brent)\b/i, tickers: ["WTI", "BRENT"] },
  { pattern: /\b(natural gas|henry hub|NGAS|LNG)\b/i, tickers: ["NGAS"] },
  { pattern: /\b(gold|bullion|GC=F)\b/i, tickers: ["GOLD"] },
  { pattern: /\b(silver|SI=F)\b/i, tickers: ["SILVER"] },
  { pattern: /\b(copper|HG=F)\b/i, tickers: ["COPPER"] },
  { pattern: /\b(heating oil|HO=F)\b/i, tickers: ["HEATOIL"] },
  { pattern: /\b(gasoline|RBOB|retail gas)\b/i, tickers: ["GASOL"] },
  { pattern: /\b(EIA|inventory report|stockpile)\b/i, tickers: ["WTI", "NGAS", "GASOL"] },
  { pattern: /\b(sanction|embargo|export ban)\b/i, tickers: ["WTI", "BRENT"] },
];

function tagTickers(title: string, description: string | null): string[] {
  const text = `${title} ${description || ""}`;
  const tags = new Set<string>();
  for (const { pattern, tickers } of TICKER_PATTERNS) {
    if (pattern.test(text)) tickers.forEach((t) => tags.add(t));
  }
  return Array.from(tags);
}

export async function fetchEnergyNews(query = "energy OR oil OR gas OR gold", pageSize = 20): Promise<NewsArticle[] | null> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    lastError = "NEWSAPI_KEY not set";
    return null;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const q = encodeURIComponent(query);
    const url = `${NEWSAPI_BASE}/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=${pageSize}`;
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "X-Api-Key": key, Accept: "application/json" },
    });
    const hdrRemaining = r.headers.get("X-RateLimit-Remaining");
    if (hdrRemaining) remaining = parseInt(hdrRemaining, 10);
    if (!r.ok) throw new Error(`NewsAPI HTTP ${r.status}`);
    const json = (await r.json()) as NewsApiResponse;
    if (json.status !== "ok") throw new Error(`NewsAPI status: ${json.status}`);
    const articles: NewsArticle[] = (json.articles || []).map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source.name,
      author: a.author,
      publishedAt: a.publishedAt,
      urlToImage: a.urlToImage,
      content: a.content,
      tickers: tagTickers(a.title, a.description),
    }));
    lastFetch = new Date().toISOString();
    lastError = null;
    return articles;
  } catch (err) {
    lastError = (err as Error).message;
    logger.warn({ err: lastError }, "newsapi fetch failed");
    return null;
  }
}

export { CACHE_TTL_S as NEWSAPI_CACHE_TTL_S };
