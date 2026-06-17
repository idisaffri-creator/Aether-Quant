/**
 * Meilisearch service — fast full-text search.
 * Indexes: strategies (templates + custom), signals, news.
 *
 * Config:
 *   MEILI_URL  (default http://127.0.0.1:7700)
 *   MEILI_KEY  (master key, optional for dev)
 */
import { Meilisearch, type Index } from "meilisearch";
import { db, schema } from "../../db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

const MEILI_URL = process.env.MEILI_URL || "http://127.0.0.1:7700";
const MEILI_KEY = process.env.MEILI_KEY || undefined;

let meili: Meilisearch | null = null;

function getClient(): Meilisearch {
  if (!meili) {
    meili = new Meilisearch({ host: MEILI_URL, apiKey: MEILI_KEY });
  }
  return meili;
}

export const INDEXES = {
  strategies: "strategies",
  signals: "signals",
  news: "news",
} as const;

export async function isMeiliAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${MEILI_URL}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

export async function ensureIndexes(): Promise<void> {
  if (!(await isMeiliAvailable())) {
    logger.warn("Meilisearch not available — search disabled");
    return;
  }
  const client = getClient();
  for (const name of Object.values(INDEXES)) {
    try {
      await client.getIndex(name);
    } catch {
      await client.createIndex(name, { primaryKey: "id" });
    }
  }
  // Configure searchable + filterable
  const strategiesIdx = client.index(INDEXES.strategies);
  await strategiesIdx.updateSettings({
    searchableAttributes: ["name", "description", "category", "symbol"],
    filterableAttributes: ["category", "symbol", "riskLevel", "enabled"],
    sortableAttributes: ["createdAt", "name"],
  });
  const signalsIdx = client.index(INDEXES.signals);
  await signalsIdx.updateSettings({
    searchableAttributes: ["symbol", "type", "reason"],
    filterableAttributes: ["symbol", "type", "acknowledged"],
    sortableAttributes: ["createdAt"],
  });
  const newsIdx = client.index(INDEXES.news);
  await newsIdx.updateSettings({
    searchableAttributes: ["title", "description", "source", "symbols"],
    filterableAttributes: ["source", "sentiment"],
    sortableAttributes: ["publishedAt"],
  });
  logger.info("meilisearch indexes ready");
}

export async function indexStrategy(s: { id: string; name: string; description: string; symbol: string; category: string; riskLevel?: string; enabled?: boolean; createdAt: string }): Promise<void> {
  if (!(await isMeiliAvailable())) return;
  try {
    await getClient().index(INDEXES.strategies).addDocuments([s]);
  } catch (err) {
    logger.warn({ err: (err as Error).message, id: s.id }, "strategy index failed");
  }
}

export async function indexSignal(sig: { id: string; symbol: string; type: string; reason: string; acknowledged: boolean; createdAt: string }): Promise<void> {
  if (!(await isMeiliAvailable())) return;
  try {
    await getClient().index(INDEXES.signals).addDocuments([sig]);
  } catch (err) {
    logger.warn({ err: (err as Error).message, id: sig.id }, "signal index failed");
  }
}

export async function indexNews(article: { id: string; title: string; description: string; source: string; symbols: string[]; sentiment: string; publishedAt: string }): Promise<void> {
  if (!(await isMeiliAvailable())) return;
  try {
    await getClient().index(INDEXES.news).addDocuments([article]);
  } catch (err) {
    logger.warn({ err: (err as Error).message, id: article.id }, "news index failed");
  }
}

export async function search(index: keyof typeof INDEXES, query: string, filters?: string, limit = 20): Promise<any[]> {
  if (!(await isMeiliAvailable())) return [];
  try {
    const r = await getClient().index(INDEXES[index]).search(query, {
      limit,
      filter: filters,
    });
    return r.hits;
  } catch (err) {
    logger.warn({ err: (err as Error).message, index, query }, "search failed");
    return [];
  }
}

/**
 * Index all custom strategies on startup.
 */
export async function reindexAllStrategies(): Promise<number> {
  if (!(await isMeiliAvailable())) return 0;
  try {
    const rows = await db.select().from(schema.customStrategies)
      .orderBy(desc(schema.customStrategies.createdAt))
      .execute();
    if (rows.length === 0) return 0;
    const docs = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      symbol: r.symbol,
      category: "custom",
      enabled: r.enabled === "true",
      createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
    }));
    await getClient().index(INDEXES.strategies).addDocuments(docs);
    return docs.length;
  } catch (err) {
    logger.error({ err: (err as Error).message }, "reindex strategies failed");
    return 0;
  }
}
