/**
 * GDELT 2.0 doc API — global events database, free + unlimited.
 * Used as fallback for NewsAPI when the key isn't set or is rate-limited.
 * Docs: https://blog.gdeltproject.org/gdelt-2-0-television-api-now-debuting-new-machine-translation-features/
 */
import { logger } from "../../../lib/logger";

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const TIMEOUT_MS = 8000;
const CACHE_TTL_S = 1800;

export interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  language: string;
  seendate: string;
  socialimage: string | null;
  tone: number | null; // GDELT tone score (-100 to +100)
}

export interface GdeltStatus {
  healthy: boolean;
  lastFetch: string | null;
  error?: string;
}

let lastFetch: string | null = null;
let lastError: string | null = null;

export function getGdeltStatus(): GdeltStatus {
  return { healthy: lastError === null, lastFetch, error: lastError || undefined };
}

interface GdeltResponse {
  articles?: Array<{
    title: string;
    url: string;
    domain: string;
    language: string;
    seendate: string;
    socialimage: string | null;
    tone?: { tone?: number } | number | null;
  }>;
}

export async function fetchGdeltNews(query: string, max = 20): Promise<GdeltArticle[] | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${GDELT_URL}?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${max}&format=json&sort=datedesc&timespan=24h`;
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`GDELT HTTP ${r.status}`);
    const json = (await r.json()) as GdeltResponse;
    const articles: GdeltArticle[] = (json.articles || []).map((a) => {
      let tone: number | null = null;
      if (typeof a.tone === "number") tone = a.tone;
      else if (a.tone && typeof a.tone === "object" && typeof a.tone.tone === "number") tone = a.tone.tone;
      return {
        title: a.title,
        url: a.url,
        domain: a.domain,
        language: a.language,
        seendate: a.seendate,
        socialimage: a.socialimage,
        tone,
      };
    });
    lastFetch = new Date().toISOString();
    lastError = null;
    return articles;
  } catch (err) {
    lastError = (err as Error).message;
    logger.warn({ err: lastError }, "gdelt fetch failed");
    return null;
  }
}

export { CACHE_TTL_S as GDELT_CACHE_TTL_S };
