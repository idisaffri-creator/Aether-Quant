/**
 * News cache — tries NewsAPI, falls back to GDELT, falls back to mock.
 * Returns articles with sentiment (if Ollama available) and ticker tags.
 */
import { cacheGetSet } from "../../lib/redis";
import { logger } from "../../lib/logger";
import { fetchEnergyNews, NEWSAPI_CACHE_TTL_S } from "./adapters/newsapi";
import { fetchGdeltNews, GDELT_CACHE_TTL_S } from "./adapters/gdelt";
import { scoreSentiment } from "./adapters/ollama";
import type { NewsArticle } from "./adapters/newsapi";

const NEWS_KEY = "data:news:energy";
const NEWS_TTL_S = 1800; // 30 min

export async function getEnergyNews(): Promise<{ articles: NewsArticle[]; source: "newsapi" | "gdelt" | "mock" }> {
  return cacheGetSet<{ articles: NewsArticle[]; source: "newsapi" | "gdelt" | "mock" }>(NEWS_KEY, NEWS_TTL_S, async () => {
    // Try NewsAPI first
    let articles = await fetchEnergyNews();
    let source: "newsapi" | "gdelt" | "mock" = "newsapi";
    if (!articles || articles.length === 0) {
      // Fallback to GDELT
      const gdelt = await fetchGdeltNews("(energy OR oil OR gas OR gold OR OPEC) AND lang:en", 20);
      if (gdelt && gdelt.length > 0) {
        articles = gdelt.map((g) => ({
          title: g.title,
          description: null,
          url: g.url,
          source: g.domain,
          author: null,
          publishedAt: g.seendate,
          urlToImage: g.socialimage,
          content: null,
          tickers: extractTickers(g.title),
          sentiment: g.tone !== null ? (g.tone > 5 ? "bullish" : g.tone < -5 ? "bearish" : "neutral") : undefined,
          sentimentScore: g.tone !== null ? g.tone / 100 : undefined,
        }));
        source = "gdelt";
      }
    }
    if (!articles || articles.length === 0) {
      logger.warn("no news sources available, using mock");
      return { articles: mockNews(), source: "mock" };
    }
    // Score sentiment via Ollama for the first N (slow)
    const scoreable = articles.slice(0, 10);
    await Promise.all(
      scoreable.map(async (a, i) => {
        const s = await scoreSentiment(`${a.title} ${a.description || ""}`.slice(0, 500));
        if (s) {
          articles[i].sentiment = s.label;
          articles[i].sentimentScore = s.score;
        }
      })
    );
    logger.info({ count: articles.length, source }, "news from feed");
    return { articles, source };
  });
}

function extractTickers(text: string): string[] {
  const tags: string[] = [];
  if (/\b(wti|crude|brent|opec)\b/i.test(text)) tags.push("WTI", "BRENT");
  if (/\b(natural gas|ngas|lng)\b/i.test(text)) tags.push("NGAS");
  if (/\b(gold|bullion)\b/i.test(text)) tags.push("GOLD");
  return Array.from(new Set(tags));
}

function mockNews(): NewsArticle[] {
  return [
    {
      title: "OPEC+ Extends Production Cuts Through Q3",
      description: "Saudi Arabia and Russia confirm continued supply discipline amid weak demand outlook.",
      url: "https://example.com/opec-cuts",
      source: "Demo",
      author: null,
      publishedAt: new Date().toISOString(),
      urlToImage: null,
      content: null,
      tickers: ["WTI", "BRENT"],
      sentiment: "bullish",
      sentimentScore: 0.4,
    },
    {
      title: "U.S. Natural Gas Storage Beats Expectations",
      description: "EIA reports larger-than-expected injection, weighing on Henry Hub prices.",
      url: "https://example.com/eia-gas",
      source: "Demo",
      author: null,
      publishedAt: new Date(Date.now() - 3600_000).toISOString(),
      urlToImage: null,
      content: null,
      tickers: ["NGAS"],
      sentiment: "bearish",
      sentimentScore: -0.3,
    },
    {
      title: "Gold Tests Key Resistance as Dollar Weakens",
      description: "Spot gold approaches $2,050 amid expectations of Fed pause.",
      url: "https://example.com/gold-resistance",
      source: "Demo",
      author: null,
      publishedAt: new Date(Date.now() - 7200_000).toISOString(),
      urlToImage: null,
      content: null,
      tickers: ["GOLD"],
      sentiment: "bullish",
      sentimentScore: 0.2,
    },
  ];
}

export { NEWSAPI_CACHE_TTL_S, GDELT_CACHE_TTL_S };
