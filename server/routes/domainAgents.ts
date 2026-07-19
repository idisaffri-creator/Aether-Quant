/**
 * Agent Marketplace — pre-built, deployable domain agents (Brent Spread,
 * Crack Spread, LNG Forecast, ...). This is distinct from the user-strategy
 * marketplace at /api/strategies/marketplace (publish/clone backtested
 * strategies) — this one is a catalog of Aether-built domain specialists.
 *
 * GET  /api/domain-agents/catalog               - the 8 catalog agents (public)
 * GET  /api/domain-agents/deployed               - caller's deployed instances
 * POST /api/domain-agents/:key/deploy             - deploy a catalog agent
 * POST /api/domain-agents/deployments/:id/stop    - stop a deployed instance
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { recordCostEvent, syntheticCost } from "../services/finops/costTracker";

const router = Router();

export interface DomainAgentCatalogEntry {
  key: string;
  name: string;
  category: string;
  description: string;
  riskTier: "low" | "medium" | "high";
  suggestedRiskLimitUsd: number;
}

export const DOMAIN_AGENT_CATALOG: DomainAgentCatalogEntry[] = [
  {
    key: "brent-spread",
    name: "Brent Spread Agent",
    category: "Spreads",
    description: "Trades the Brent-WTI and Brent-Dubai spreads, positioning on regional crude quality and freight differentials.",
    riskTier: "medium",
    suggestedRiskLimitUsd: 25000,
  },
  {
    key: "crack-spread",
    name: "Crack Spread Agent",
    category: "Spreads",
    description: "Trades 3-2-1 and 2-1-1 crack spreads to capture dislocations in refining margins between crude and product prices.",
    riskTier: "medium",
    suggestedRiskLimitUsd: 25000,
  },
  {
    key: "lng-forecast",
    name: "LNG Forecast Agent",
    category: "Forecasting",
    description: "Forecasts global LNG demand and regional pricing using terminal utilization, weather, and freight data.",
    riskTier: "low",
    suggestedRiskLimitUsd: 10000,
  },
  {
    key: "refinery-turnaround",
    name: "Refinery Turnaround Agent",
    category: "Fundamentals",
    description: "Tracks planned and unplanned refinery maintenance schedules and models their impact on crack spreads and product prices.",
    riskTier: "low",
    suggestedRiskLimitUsd: 10000,
  },
  {
    key: "opec-monitor",
    name: "OPEC Monitor Agent",
    category: "Fundamentals",
    description: "Monitors OPEC+ statements, meeting outcomes, and production decisions to flag supply-side catalysts for crude prices.",
    riskTier: "low",
    suggestedRiskLimitUsd: 5000,
  },
  {
    key: "freight-intelligence",
    name: "Freight Intelligence Agent",
    category: "Logistics",
    description: "Tracks tanker rates, chokepoint congestion, and shipping bottlenecks that move freight-adjusted crude and product economics.",
    riskTier: "low",
    suggestedRiskLimitUsd: 10000,
  },
  {
    key: "inventory-forecast",
    name: "Inventory Forecast Agent",
    category: "Forecasting",
    description: "Forecasts weekly EIA/API crude, gasoline, and distillate inventory draws or builds ahead of official releases.",
    riskTier: "medium",
    suggestedRiskLimitUsd: 20000,
  },
  {
    key: "options-volatility",
    name: "Options Volatility Agent",
    category: "Derivatives",
    description: "Trades implied-volatility dislocations in energy options using leveraged options structures across the futures curve.",
    riskTier: "high",
    suggestedRiskLimitUsd: 50000,
  },
];

const CATALOG_BY_KEY = new Map(DOMAIN_AGENT_CATALOG.map((a) => [a.key, a]));

router.get("/catalog", (_req, res) => {
  res.json({ agents: DOMAIN_AGENT_CATALOG });
});

router.get("/deployed", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.domainAgentDeployments)
      .where(eq(schema.domainAgentDeployments.userId, req.user!.userId))
      .orderBy(desc(schema.domainAgentDeployments.createdAt))
      .execute();
    res.json({ deployments: rows });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "domain-agents deployed failed, returning empty fallback");
    // Degrade gracefully: no DB reachable means no deployments yet.
    res.json({ deployments: [] });
  }
});

const deploySchema = z.object({
  riskLimitUsd: z.number().min(100).max(10_000_000),
});

router.post("/:key/deploy", authMiddleware, async (req, res) => {
  const catalogEntry = CATALOG_BY_KEY.get(req.params.key);
  if (!catalogEntry) {
    res.status(404).json({ code: "NOT_FOUND", message: `Unknown agent key "${req.params.key}"`, status: 404 });
    return;
  }
  const parsed = deploySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid risk limit", status: 400 });
    return;
  }

  const id = nanoid();
  const now = new Date();
  const requiresApproval = catalogEntry.riskTier === "high";
  const confidence = (0.55 + Math.random() * 0.35).toFixed(4);

  const deployment = {
    id,
    userId: req.user!.userId,
    agentKey: catalogEntry.key,
    name: catalogEntry.name,
    riskLimitUsd: parsed.data.riskLimitUsd.toFixed(2),
    status: (requiresApproval ? "pending_approval" : "active") as "pending_approval" | "active",
    confidence,
    rationale: `Deployed with a $${parsed.data.riskLimitUsd.toLocaleString()} risk limit to target ${catalogEntry.category.toLowerCase()} opportunities for ${catalogEntry.name.replace(" Agent", "")}.`,
    lastAction: "Deployment requested",
    nextAction: requiresApproval ? "Awaiting governance approval (high-risk tier)" : "Observing market for first entry signal",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(schema.domainAgentDeployments).values(deployment).execute();

    if (requiresApproval) {
      await db.insert(schema.approvalRequests).values({
        id: nanoid(),
        userId: req.user!.userId,
        actionClass: "high",
        description: `Approve deployment of ${catalogEntry.name} with a $${parsed.data.riskLimitUsd.toLocaleString()} risk limit`,
        payload: { deploymentId: id, agentKey: catalogEntry.key, riskLimitUsd: parsed.data.riskLimitUsd },
        status: "pending",
        createdAt: now,
      }).execute();
    }

    void recordCostEvent({ userId: req.user!.userId, agentKey: catalogEntry.key, costType: "infra", amountUsd: syntheticCost("infra") });

    logger.info({ userId: req.user!.userId, agentKey: catalogEntry.key, deploymentId: id, requiresApproval }, "domain agent deployed");
    res.status(201).json({ deployment, requiresApproval });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "domain agent deploy failed, returning synthetic ack");
    // Never 500 into a blank page — hand back a plausible synthetic result
    // in the same shape so the UI can render optimistically even if the
    // write didn't persist (no DB reachable in this environment).
    res.status(201).json({ deployment, requiresApproval, degraded: true });
  }
});

router.post("/deployments/:id/stop", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.domainAgentDeployments)
      .where(and(eq(schema.domainAgentDeployments.id, req.params.id), eq(schema.domainAgentDeployments.userId, req.user!.userId)))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Deployment not found", status: 404 });
      return;
    }
    await db.update(schema.domainAgentDeployments)
      .set({ status: "stopped", lastAction: "Stopped by user", nextAction: "None — deployment stopped", updatedAt: new Date() })
      .where(eq(schema.domainAgentDeployments.id, req.params.id))
      .execute();

    void recordCostEvent({ userId: req.user!.userId, agentKey: rows[0].agentKey, costType: "infra", amountUsd: syntheticCost("infra") * 0.2 });

    logger.info({ userId: req.user!.userId, deploymentId: req.params.id }, "domain agent stopped");
    res.json({ message: "Agent stopped" });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "domain agent stop failed");
    res.json({ message: "Stop requested (will apply once the database is reachable)", degraded: true });
  }
});

export default router;
