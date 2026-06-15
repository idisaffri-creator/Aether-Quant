import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { benchmarkAgent } from "../agents/benchmark";

const router = Router();

router.get("/benchmark", authMiddleware, async (_req, res) => {
  const summaries = await benchmarkAgent.runAll();
  res.json({ summaries, history: benchmarkAgent.getHistory() });
});

router.get("/benchmark/:agentId", authMiddleware, async (req, res) => {
  const { agentId } = req.params;
  const summary = await benchmarkAgent.runBenchmark(agentId, agentId);
  res.json({ summary });
});

export default router;
