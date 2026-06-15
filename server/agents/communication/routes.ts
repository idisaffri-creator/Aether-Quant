import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { commBus } from "./index.js";

const router = Router();

router.get("/messages", authMiddleware, (req, res) => {
  const { from, to, type } = req.query;
  const history = commBus.getHistory({
    from: from as string | undefined,
    to: to as string | undefined,
    type: type as string | undefined,
  });
  res.json({ messages: history.slice(-50) });
});

router.get("/stats", authMiddleware, (_req, res) => {
  res.json(commBus.getStats());
});

router.post("/publish", authMiddleware, (req, res) => {
  const { to, type, payload, priority } = req.body as {
    to?: string;
    type?: string;
    payload?: unknown;
    priority?: string;
  };
  if (!type || !payload) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing required fields", status: 400 });
    return;
  }
  commBus.publish({
    from: "api",
    to: to || "broadcast",
    type: (type as any) || "data",
    payload,
    priority: (priority as any) || "medium",
  });
  res.json({ message: "Message published" });
});

export default router;
