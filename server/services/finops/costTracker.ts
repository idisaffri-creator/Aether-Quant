/**
 * AI FinOps — simulated cost-accounting for agents.
 *
 * NOTE: There is no real billing meter wired up anywhere in this system yet
 * (no per-token model accounting, no cloud cost API integration). This is a
 * synthetic cost model: every time an agent is deployed/stopped, or the
 * orchestrator runs an Observe→Think→Act→Check cycle, we record a small
 * plausible cost event so the AI FinOps & Billing page has something real
 * to aggregate. Treat `amountUsd` as illustrative, not actual spend.
 */
import { nanoid } from "nanoid";
import { db, schema } from "../../db";
import { logger } from "../../lib/logger";

export type CostType = "ai_model" | "data" | "infra";

export interface RecordCostEventOpts {
  userId?: string | null;
  agentKey: string;
  costType: CostType;
  amountUsd: number;
}

/**
 * Best-effort cost event write. Never throws — a missing/unreachable DB
 * should never break the caller's primary flow (agent deploy, orchestrator
 * cycle, etc).
 */
export async function recordCostEvent(opts: RecordCostEventOpts): Promise<void> {
  try {
    await db.insert(schema.agentCostEvents).values({
      id: nanoid(),
      userId: opts.userId ?? null,
      agentKey: opts.agentKey,
      costType: opts.costType,
      amountUsd: opts.amountUsd.toFixed(6),
      createdAt: new Date(),
    }).execute();
  } catch (err) {
    logger.warn({ err: (err as Error).message, agentKey: opts.agentKey }, "cost event write failed (best-effort, ignored)");
  }
}

/** Random cost amount within a plausible band for the given cost type. */
export function syntheticCost(costType: CostType): number {
  switch (costType) {
    case "ai_model":
      return 0.001 + Math.random() * 0.02; // small LLM call
    case "data":
      return 0.0005 + Math.random() * 0.005; // market/news data pull
    case "infra":
    default:
      return 0.002 + Math.random() * 0.03; // compute/orchestration overhead
  }
}
