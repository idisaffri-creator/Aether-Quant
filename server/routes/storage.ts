/**
 * Object storage routes — KYC documents, exports, strategy backups.
 * Uses MinIO (S3-compatible) when configured, otherwise returns 503.
 */
import { Router, type Request } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";
import { BUCKETS, isS3Configured, uploadObject, getSignedDownloadUrl, deleteObject, listObjects } from "../services/storage/s3";
import { db, schema } from "../db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { nanoid } from "nanoid";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

/**
 * POST /api/storage/kyc/upload
 * Upload a KYC document (passport, license, etc.)
 */
router.post("/kyc/upload", authMiddleware, upload.single("file"), async (req: any, res) => {
  if (!isS3Configured()) {
    res.status(503).json({ code: "NOT_CONFIGURED", message: "Object storage not configured (S3_SECRET_KEY missing)" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ code: "VALIDATION", message: "file required", status: 400 });
    return;
  }
  const docType = req.body.docType || "passport";
  const key = `users/${req.user!.userId}/${docType}/${Date.now()}-${req.file.originalname}`;
  const result = await uploadObject(BUCKETS.kyc, key, req.file.buffer, req.file.mimetype);
  if (!result) {
    res.status(500).json({ code: "INTERNAL", message: "Upload failed" });
    return;
  }
  logger.info({ userId: req.user!.userId, key, size: req.file.size }, "KYC document uploaded");
  res.json({
    key,
    location: result.location,
    size: req.file.size,
    contentType: req.file.mimetype,
  });
});

/**
 * GET /api/storage/kyc/list
 * List user's KYC documents
 */
router.get("/kyc/list", authMiddleware, async (req, res) => {
  if (!isS3Configured()) {
    res.json({ objects: [], configured: false });
    return;
  }
  const objects = await listObjects(BUCKETS.kyc, `users/${req.user!.userId}/`);
  res.json({
    objects: objects.filter(o => o.key.startsWith(`users/${req.user!.userId}/`)),
    configured: true,
  });
});

/**
 * GET /api/storage/kyc/download-url
 * Get a signed download URL for a KYC document
 */
router.get("/kyc/download-url", authMiddleware, async (req, res) => {
  if (!isS3Configured()) {
    res.status(503).json({ code: "NOT_CONFIGURED" });
    return;
  }
  const key = String(req.query.key || "");
  if (!key.startsWith(`users/${req.user!.userId}/`)) {
    res.status(403).json({ code: "FORBIDDEN", message: "Cannot access other users' files", status: 403 });
    return;
  }
  const url = await getSignedDownloadUrl(BUCKETS.kyc, key, 3600);
  if (!url) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to generate URL" });
    return;
  }
  res.json({ url, expiresIn: 3600 });
});

/**
 * DELETE /api/storage/kyc
 * Delete a KYC document
 */
router.delete("/kyc", authMiddleware, async (req, res) => {
  if (!isS3Configured()) {
    res.status(503).json({ code: "NOT_CONFIGURED" });
    return;
  }
  const key = String(req.body?.key || "");
  if (!key.startsWith(`users/${req.user!.userId}/`)) {
    res.status(403).json({ code: "FORBIDDEN" });
    return;
  }
  const ok = await deleteObject(BUCKETS.kyc, key);
  res.json({ ok });
});

/**
 * POST /api/storage/exports/upload
 * Upload an export (CSV, PDF, etc.) — for internal use
 */
router.post("/exports/upload", authMiddleware, async (req, res) => {
  if (!isS3Configured()) {
    res.status(503).json({ code: "NOT_CONFIGURED" });
    return;
  }
  const { filename, contentType, data } = req.body as { filename: string; contentType: string; data: string };
  if (!filename || !data) {
    res.status(400).json({ code: "VALIDATION", message: "filename and data required", status: 400 });
    return;
  }
  const key = `users/${req.user!.userId}/${Date.now()}-${filename}`;
  const buffer = Buffer.from(data, "base64");
  const result = await uploadObject(BUCKETS.exports, key, buffer, contentType);
  if (!result) {
    res.status(500).json({ code: "INTERNAL" });
    return;
  }
  res.json({ key, location: result.location, size: buffer.length });
});

router.get("/status", authMiddleware, (_req, res) => {
  res.json({ configured: isS3Configured(), buckets: Object.values(BUCKETS) });
});

export default router;
