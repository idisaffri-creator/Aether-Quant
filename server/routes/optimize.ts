import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

interface OptimizationRequest {
  params: Record<string, { min: number; max: number; step: number; current: number }>;
  mode: "grid" | "random" | "genetic";
  metric: string;
}

interface OptimizationResult {
  bestParams: Record<string, number>;
  metrics: Record<string, { before: number; after: number }>;
  history: { iteration: number; value: number }[];
}

function generateMockResult(req: OptimizationRequest): OptimizationResult {
  const bestParams: Record<string, number> = {};
  const metrics: Record<string, { before: number; after: number }> = {};
  const metricKeys = ["sharpe", "sortino", "winRate", "profitFactor", "calmar"];
  const baseValues = [1.42, 1.18, 58.3, 1.85, 0.92];
  const optValues = [2.14, 1.76, 71.2, 2.48, 1.45];

  for (const [key, def] of Object.entries(req.params)) {
    bestParams[key] = def.min + Math.round((def.max - def.min) / def.step / 2) * def.step;
  }

  metricKeys.forEach((k, i) => {
    metrics[k] = { before: baseValues[i], after: optValues[i] };
  });

  const metricIdx = metricKeys.indexOf(req.metric?.toLowerCase() || "sharpe");
  const startVal = baseValues[metricIdx] || 1.42;
  const endVal = optValues[metricIdx] || 2.14;

  const history = Array.from({ length: 20 }, (_, i) => ({
    iteration: i + 1,
    value: startVal + (endVal - startVal) * ((i + 1) / 20) + (Math.random() - 0.5) * 0.2,
  }));

  return { bestParams, metrics, history };
}

const historyStore: OptimizationResult[] = [];

router.post("/optimize", authMiddleware, (req, res) => {
  const result = generateMockResult(req.body as OptimizationRequest);
  historyStore.push(result);
  if (historyStore.length > 50) historyStore.shift();
  res.json(result);
});

router.get("/optimize/history", authMiddleware, (_req, res) => {
  res.json({ history: historyStore });
});

export default router;
