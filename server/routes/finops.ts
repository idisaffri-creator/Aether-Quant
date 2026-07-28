/**
 * AI FinOps — cost accounting for agents (roster + domain), folded into the
 * "AI FinOps & Billing" page.
 *
 * NOTE: `agentCostEvents` is a simulated cost model (see
 * server/services/finops/costTracker.ts) — there is no real billing meter
 * wired up. Net ROI attribution is best-effort: we don't have a clean
 * agent-to-trade linkage anywhere in the schema (orders/positions aren't
 * tagged with an agentKey), so attributable P&L defaults to 0 and net ROI
 * is simply -cost. This is called out explicitly in the response so the UI
 * doesn't imply more precision than exists.
 *
 * GET /api/finops/summary (auth) - per-agent cost breakdown + portfolio totals
 */
import { Router } from "express";
import { eq, or, isNull, and } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

const ROSTER_AGENT_NAMES: Record<string, string> = {
  trading: "Trading Agent",
  risk: "Risk Agent",
  "market-intel": "Market Intelligence Agent",
  compliance: "Compliance Agent",
  portfolio: "Portfolio Agent",
  signals: "Signal Agent",
};

function mockSummary() {
  const agents = Object.entries(ROSTER_AGENT_NAMES).map(([agentKey, name]) => {
    const totalCost = Number((0.02 + Math.random() * 0.5).toFixed(4));
    return {
      agentKey,
      name,
      costByType: { ai_model: Number((totalCost * 0.7).toFixed(4)), data: Number((totalCost * 0.15).toFixed(4)), infra: Number((totalCost * 0.15).toFixed(4)) },
      totalCost,
      attributedPnl: 0,
      netRoi: -totalCost,
    };
  });
  const portfolioTotalCost = Number(agents.reduce((s, a) => s + a.totalCost, 0).toFixed(4));
  return { agents, portfolioTotalCost, portfolioNetRoi: -portfolioTotalCost, note: "Simulated cost model — no real billing meter configured (mock fallback, database unreachable)." };
}

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Domain agents the user has deployed (for display names).
    const deployments = await db.select().from(schema.domainAgentDeployments)
      .where(eq(schema.domainAgentDeployments.userId, userId))
      .execute();
    const deploymentNames = new Map(deployments.map((d) => [d.agentKey, d.name]));

    // Cost events either owned by this user (their domain agents) or
    // platform-wide (userId IS NULL — the shared roster agents).
    const events = await db.select().from(schema.agentCostEvents)
      .where(or(eq(schema.agentCostEvents.userId, userId), isNull(schema.agentCostEvents.userId)))
      .execute();

    const byAgent = new Map<string, { ai_model: number; data: number; infra: number }>();
    for (const e of events) {
      const bucket = byAgent.get(e.agentKey) || { ai_model: 0, data: 0, infra: 0 };
      bucket[e.costType as "ai_model" | "data" | "infra"] += Number(e.amountUsd);
      byAgent.set(e.agentKey, bucket);
    }

    // Make sure every roster agent and every deployed domain agent shows up
    // even with zero cost so far.
    for (const key of Object.keys(ROSTER_AGENT_NAMES)) {
      if (!byAgent.has(key)) byAgent.set(key, { ai_model: 0, data: 0, infra: 0 });
    }
    for (const d of deployments) {
      if (!byAgent.has(d.agentKey)) byAgent.set(d.agentKey, { ai_model: 0, data: 0, infra: 0 });
    }

    const agents = Array.from(byAgent.entries()).map(([agentKey, costByType]) => {
      const totalCost = Number((costByType.ai_model + costByType.data + costByType.infra).toFixed(6));
      // Best-effort P&L attribution: no clean agentKey<->order/position link
      // exists in the schema today, so attributed P&L defaults to 0.
      const attributedPnl = 0;
      return {
        agentKey,
        name: ROSTER_AGENT_NAMES[agentKey] || deploymentNames.get(agentKey) || agentKey,
        costByType: {
          ai_model: Number(costByType.ai_model.toFixed(6)),
          data: Number(costByType.data.toFixed(6)),
          infra: Number(costByType.infra.toFixed(6)),
        },
        totalCost,
        attributedPnl,
        netRoi: Number((attributedPnl - totalCost).toFixed(6)),
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const portfolioTotalCost = Number(agents.reduce((s, a) => s + a.totalCost, 0).toFixed(6));
    const portfolioAttributedPnl = Number(agents.reduce((s, a) => s + a.attributedPnl, 0).toFixed(6));

    res.json({
      agents,
      portfolioTotalCost,
      portfolioAttributedPnl,
      portfolioNetRoi: Number((portfolioAttributedPnl - portfolioTotalCost).toFixed(6)),
      note: "Simulated cost model — no real billing meter configured. Net ROI attribution is best-effort (0 P&L attributed where no clean agent-to-trade link exists).",
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "finops summary failed, returning mock fallback");
    res.json(mockSummary());
  }
});

export default router;
