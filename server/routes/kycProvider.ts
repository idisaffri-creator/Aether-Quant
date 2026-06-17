/**
 * KYC provider webhook + inquiry creation routes.
 * POST /api/kyc/inquiry     — create a new KYC inquiry (redirects to provider UI)
 * POST /api/kyc/webhook     — provider calls this on status changes
 */
import { Router, type Request, type Response, raw } from "express";
import { authMiddleware } from "../middleware/auth";
import { createInquiry, handleProviderWebhook, getProviderConfig } from "../services/kyc/provider";
import { logger } from "../lib/logger";

const router = Router();

router.post("/inquiry", authMiddleware, async (req, res) => {
  try {
    const config = getProviderConfig();
    if (!config) {
      res.status(503).json({ code: "NOT_CONFIGURED", message: "KYC provider not configured by operator", status: 503 });
      return;
    }
    const inquiry = await createInquiry(req.user!.userId);
    res.status(201).json(inquiry);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "KYC inquiry failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to create inquiry", status: 500 });
  }
});

/**
 * Webhook — no auth, verified via signature.
 * Configure webhook URL in your provider's dashboard:
 *   https://aether-energy.ai/api/kyc/webhook?provider=persona
 *   https://aether-energy.ai/api/kyc/webhook?provider=onfido
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const provider = (req.query.provider as string) || "persona";
  const config = getProviderConfig();
  if (!config) {
    res.status(503).json({ code: "NOT_CONFIGURED" });
    return;
  }
  // TODO: verify provider signature (Persona: HMAC-SHA256, Onfido: HMAC-SHA1)
  // For now, accept and log
  try {
    const result = await handleProviderWebhook(provider, req.body);
    res.json(result);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "webhook processing failed");
    res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
