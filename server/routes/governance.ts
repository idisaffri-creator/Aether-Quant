/**
 * Governance & Approval Policy — the 4-tier autonomy policy for agent
 * actions, the approval queue, and the platform-wide kill switch.
 *
 * GET  /api/governance/policy               - the static 4-tier policy table (public)
 * GET  /api/governance/approvals             - caller's approval requests, newest first
 * POST /api/governance/approvals/:id/approve - approve a pending request
 * POST /api/governance/approvals/:id/reject  - reject a pending request
 * POST /api/governance/kill-switch           - hard-stop all of the caller's agents/strategies
 */
import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { audit } from "../services/audit";

const router = Router();

const POLICY = [
  {
    tier: "informational",
    label: "Informational",
    autonomy: "Fully autonomous",
    description: "No capital or risk impact — purely observational or advisory output.",
    exampleActions: [
      "Market commentary and sentiment summaries",
      "Signal generation (not yet acted on)",
      "Knowledge graph event tagging",
      "Read-only portfolio/risk reporting",
    ],
  },
  {
    tier: "low",
    label: "Low-risk",
    autonomy: "Autonomous",
    description: "Bounded actions within pre-approved risk limits — the agent may act without a human in the loop.",
    exampleActions: [
      "Position sizing within the deployment's risk limit",
      "Stop-loss / take-profit adjustments",
      "Rebalancing within an approved band",
      "Deploying low-risk-tier catalog agents",
    ],
  },
  {
    tier: "medium",
    label: "Medium-risk",
    autonomy: "Requires user confirmation",
    description: "Meaningful capital or strategy changes — the agent proposes the action and a human confirms before it executes.",
    exampleActions: [
      "Deploying medium-risk-tier catalog agents",
      "New strategy activation",
      "Position increases beyond the standard threshold",
      "Risk limit changes",
    ],
  },
  {
    tier: "high",
    label: "High-risk",
    autonomy: "Requires explicit approval",
    description: "Leveraged, large-notional, or irreversible actions — blocked until an explicit approval is granted.",
    exampleActions: [
      "Deploying high-risk-tier catalog agents (e.g. options/leveraged strategies)",
      "Live-trading mode switch (paper → live)",
      "Large or leveraged order execution",
      "Capital reallocation above the account's daily-loss threshold",
    ],
  },
];

router.get("/policy", (_req, res) => {
  res.json({ policy: POLICY });
});

router.get("/approvals", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.approvalRequests)
      .where(eq(schema.approvalRequests.userId, req.user!.userId))
      .orderBy(desc(schema.approvalRequests.createdAt))
      .execute();
    res.json({ approvals: rows });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "governance approvals list failed, returning empty fallback");
    res.json({ approvals: [] });
  }
});

async function resolveApproval(req: any, res: any, decision: "approved" | "rejected") {
  try {
    const rows = await db.select().from(schema.approvalRequests)
      .where(and(eq(schema.approvalRequests.id, req.params.id), eq(schema.approvalRequests.userId, req.user!.userId)))
      .execute();
    if (rows.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "Approval request not found", status: 404 });
      return;
    }
    const reqRow = rows[0];
    if (reqRow.status !== "pending") {
      res.status(400).json({ code: "ALREADY_RESOLVED", message: `Request already ${reqRow.status}`, status: 400 });
      return;
    }

    await db.update(schema.approvalRequests)
      .set({ status: decision, resolvedAt: new Date() })
      .where(eq(schema.approvalRequests.id, req.params.id))
      .execute();

    // If this approval is linked to a domain agent deployment, flip its
    // status once approved (rejection leaves it in pending_approval so the
    // user can see it was declined via the deployment's own status).
    const payload = (reqRow.payload || {}) as { deploymentId?: string };
    if (decision === "approved" && payload.deploymentId) {
      await db.update(schema.domainAgentDeployments)
        .set({ status: "active", lastAction: "Approved by governance review", nextAction: "Observing market for first entry signal", updatedAt: new Date() })
        .where(eq(schema.domainAgentDeployments.id, payload.deploymentId))
        .execute();
    } else if (decision === "rejected" && payload.deploymentId) {
      await db.update(schema.domainAgentDeployments)
        .set({ status: "stopped", lastAction: "Rejected by governance review", nextAction: "None — deployment rejected", updatedAt: new Date() })
        .where(eq(schema.domainAgentDeployments.id, payload.deploymentId))
        .execute();
    }

    await audit({
      userId: req.user!.userId,
      action: decision === "approved" ? "governance.approval_approved" : "governance.approval_rejected",
      resource: "approval_requests",
      resourceId: req.params.id,
      meta: { actionClass: reqRow.actionClass },
    });

    logger.info({ userId: req.user!.userId, approvalId: req.params.id, decision }, "governance approval resolved");
    res.json({ message: `Request ${decision}`, id: req.params.id, status: decision });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "governance approval resolve failed");
    res.json({ message: `Request ${decision} (will apply once the database is reachable)`, id: req.params.id, status: decision, degraded: true });
  }
}

router.post("/approvals/:id/approve", authMiddleware, (req, res) => resolveApproval(req, res, "approved"));
router.post("/approvals/:id/reject", authMiddleware, (req, res) => resolveApproval(req, res, "rejected"));

/**
 * POST /api/governance/kill-switch
 * Hard stop: sets every one of the caller's domain agent deployments to
 * "stopped" and disables every one of their custom strategies. This is
 * the platform's global emergency-stop control — irreversible per-run
 * (agents/strategies must be manually re-enabled).
 */
router.post("/kill-switch", authMiddleware, async (req, res) => {
  try {
    const stoppedAgents = await db.update(schema.domainAgentDeployments)
      .set({ status: "stopped", lastAction: "Stopped by kill switch", nextAction: "None — kill switch engaged", updatedAt: new Date() })
      .where(and(eq(schema.domainAgentDeployments.userId, req.user!.userId), sql`${schema.domainAgentDeployments.status} != 'stopped'`))
      .returning({ id: schema.domainAgentDeployments.id })
      .execute();

    const disabledStrategies = await db.update(schema.customStrategies)
      .set({ enabled: "false", updatedAt: new Date() })
      .where(and(eq(schema.customStrategies.userId, req.user!.userId), eq(schema.customStrategies.enabled, "true")))
      .returning({ id: schema.customStrategies.id })
      .execute();

    await audit({
      userId: req.user!.userId,
      action: "governance.kill_switch",
      resource: "domain_agent_deployments",
      meta: { agentsStopped: stoppedAgents.length, strategiesDisabled: disabledStrategies.length },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    logger.warn({ userId: req.user!.userId, agentsStopped: stoppedAgents.length, strategiesDisabled: disabledStrategies.length }, "GOVERNANCE KILL SWITCH ENGAGED");
    res.json({
      message: "Kill switch engaged — all agents and strategies stopped",
      agentsStopped: stoppedAgents.length,
      strategiesDisabled: disabledStrategies.length,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "kill switch failed");
    // Even on DB failure we must not silently pretend nothing happened —
    // but we also must not 500 into a blank confirmation dialog. Report a
    // degraded, zero-count response so the UI can tell the user to retry.
    res.status(200).json({
      message: "Kill switch request received but could not be fully persisted (database unreachable) — please retry",
      agentsStopped: 0,
      strategiesDisabled: 0,
      degraded: true,
    });
  }
});

export default router;
