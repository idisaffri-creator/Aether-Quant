/**
 * KYC (Know Your Customer) routes — required for live trading.
 *
 * Demo: stub form for KYC info. In production, integrate with Persona,
 * Onfido, Alloy, or similar for actual ID verification + sanctions screening.
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { logger } from "../lib/logger";

const router = Router();

const submitSchema = z.object({
  legalName: z.string().min(2).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  country: z.string().min(2).max(80),
  address: z.string().min(5).max(500),
  idDocumentType: z.enum(["passport", "drivers_license", "national_id"]),
  idDocumentNumber: z.string().min(3).max(40),
  idDocumentCountry: z.string().min(2).max(80),
  taxIdLast4: z.string().regex(/^\d{4}$/, "Last 4 digits of tax ID"),
  riskAcknowledged: z.boolean(),
});

/**
 * POST /api/kyc/submit
 * Submit KYC information. In demo, this is auto-approved unless ALLOW_KYC_BYPASS is set.
 */
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid KYC data", status: 400 });
      return;
    }
    if (!parsed.data.riskAcknowledged) {
      res.status(400).json({ code: "RISK_NOT_ACK", message: "You must acknowledge trading risks", status: 400 });
      return;
    }
    const id = nanoid();
    // For demo: auto-approve. In production, status="pending" + manual review or KYC provider.
    const status = process.env.AUTO_APPROVE_KYC === "false" ? "pending" : "approved";
    const reviewedAt = status === "approved" ? new Date() : null;
    await db.insert(schema.kycSubmissions).values({
      id,
      userId: req.user!.userId,
      status,
      legalName: parsed.data.legalName,
      dateOfBirth: parsed.data.dateOfBirth,
      country: parsed.data.country,
      address: parsed.data.address,
      idDocumentType: parsed.data.idDocumentType,
      idDocumentNumber: parsed.data.idDocumentNumber,
      idDocumentCountry: parsed.data.idDocumentCountry,
      taxIdLast4: parsed.data.taxIdLast4,
      riskAcknowledged: "true",
      reviewedAt,
    }).execute();
    logger.info({ userId, status }, "KYC submitted");
    res.json({ message: "KYC submitted", status, id });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "KYC submit failed");
    res.status(500).json({ code: "INTERNAL", message: "KYC submit failed", status: 500 });
  }
});

/**
 * GET /api/kyc/status
 * Returns the user's current KYC status.
 */
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(schema.kycSubmissions)
      .where(eq(schema.kycSubmissions.userId, req.user!.userId))
      .orderBy(desc(schema.kycSubmissions.submittedAt))
      .limit(1)
      .execute();
    if (rows.length === 0) {
      res.json({ submitted: false });
      return;
    }
    const k = rows[0];
    res.json({
      submitted: true,
      id: k.id,
      status: k.status,
      legalName: k.legalName,
      country: k.country,
      submittedAt: k.submittedAt,
      reviewedAt: k.reviewedAt,
    });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "KYC status failed" });
  }
});

/**
 * GET /api/admin/kyc (admin only)
 * List all KYC submissions for review.
 */
router.get("/admin/list", authMiddleware, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(schema.kycSubmissions)
    .orderBy(desc(schema.kycSubmissions.submittedAt))
    .limit(100)
    .execute();
  res.json({ submissions: rows });
});

/**
 * POST /api/admin/kyc/:id/approve (admin only)
 */
router.post("/admin/:id/approve", authMiddleware, requireAdmin, async (req, res) => {
  await db.update(schema.kycSubmissions)
    .set({ status: "approved", reviewedAt: new Date(), reviewedBy: req.user!.userId })
    .where(eq(schema.kycSubmissions.id, req.params.id))
    .execute();
  res.json({ message: "KYC approved" });
});

/**
 * POST /api/admin/kyc/:id/reject (admin only)
 */
router.post("/admin/:id/reject", authMiddleware, requireAdmin, async (req, res) => {
  const { notes } = req.body as { notes?: string };
  await db.update(schema.kycSubmissions)
    .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: req.user!.userId, reviewNotes: notes || null })
    .where(eq(schema.kycSubmissions.id, req.params.id))
    .execute();
  res.json({ message: "KYC rejected" });
});

export default router;
