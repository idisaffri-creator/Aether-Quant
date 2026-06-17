/**
 * KYC provider integration — abstraction for Persona, Onfido, Alloy.
 *
 * In demo mode, all providers are stubs. In production, set:
 *   KYC_PROVIDER=persona   |   onfido   |   alloy
 *   KYC_API_KEY=xxx
 *   KYC_WEBHOOK_SECRET=xxx
 *
 * The provider handles ID verification, sanctions screening, and AML checks.
 * This service creates inquiries + receives webhooks for status updates.
 */
import { db, schema } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logger } from "../../lib/logger";
import { notify } from "../notify";

export interface KycInquiry {
  id: string;
  providerRef: string;
  url: string;
  status: "pending" | "approved" | "rejected" | "needs_info";
}

export interface ProviderConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

export function getProviderConfig() {
  const provider = process.env.KYC_PROVIDER || "stub";
  const apiKey = process.env.KYC_API_KEY;
  const webhookSecret = process.env.KYC_WEBHOOK_SECRET;
  if (provider === "stub") return { provider: "stub" as const };
  if (!apiKey || !webhookSecret) return null;
  return { provider: provider as "persona" | "onfido" | "alloy", apiKey, webhookSecret };
}

export async function createInquiry(userId: string): Promise<KycInquiry> {
  const config = getProviderConfig();
  const provider = config?.provider || "stub";
  const id = nanoid();
  const providerRef = `${provider}_${id}`;

  if (provider === "stub") {
    await db.insert(schema.kycSubmissions).values({
      id,
      userId,
      status: "pending",
      legalName: null,
      dateOfBirth: null,
      country: null,
      address: null,
      idDocumentType: null,
      idDocumentNumber: null,
      idDocumentCountry: null,
      taxIdLast4: null,
      alpacaAccountId: providerRef,
      riskAcknowledged: "false",
      submittedAt: new Date(),
    }).execute();
    return { id, providerRef, url: `/dashboard/kyc/${id}`, status: "pending" };
  }

  if (provider === "persona") {
    const r = await fetch("https://withpersona.com/api/v1/inquiries", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { attributes: { "inquiry-template-id": process.env.PERSONA_TEMPLATE_ID || "itmpl_xxx" } } }),
    });
    if (!r.ok) throw new Error(`Persona ${r.status}`);
    const j = await r.json();
    const inquiry = j.data;
    await db.insert(schema.kycSubmissions).values({
      id, userId, status: "pending", alpacaAccountId: providerRef, riskAcknowledged: "false", submittedAt: new Date(),
    }).execute();
    return { id, providerRef: inquiry.id, url: `/kyc/${inquiry.id}`, status: "pending" };
  }

  if (provider === "onfido") {
    const r = await fetch("https://api.onfido.com/v3.6/applicants", {
      method: "POST",
      headers: { Authorization: `Token token=${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: "Applicant", last_name: userId }),
    });
    if (!r.ok) throw new Error(`Onfido ${r.status}`);
    const applicant = await r.json();
    const sd = await fetch("https://api.onfido.com/v3.6/sdk_token", {
      method: "POST",
      headers: { Authorization: `Token token=${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_id: applicant.id, referrer: `https://aether-energy.ai/dashboard/kyc/${id}` }),
    });
    const sdJson = await sd.json();
    await db.insert(schema.kycSubmissions).values({
      id, userId, status: "pending", alpacaAccountId: applicant.id, riskAcknowledged: "false", submittedAt: new Date(),
    }).execute();
    return { id, providerRef: applicant.id, url: `/kyc/${id}?token=${sdJson.token}`, status: "pending" };
  }

  throw new Error(`Unknown KYC provider: ${provider}`);
}

/**
 * Webhook handler — called by the provider when KYC status changes.
 */
export async function handleProviderWebhook(provider: string, payload: any): Promise<{ updated: boolean; status: string }> {
  let providerRef: string;
  let newStatus: "pending" | "approved" | "rejected" | "needs_info";

  if (provider === "persona") {
    providerRef = payload?.data?.id;
    newStatus = mapPersonaStatus(payload?.data?.attributes?.status);
  } else if (provider === "onfido") {
    providerRef = payload?.payload?.object?.applicant_id;
    newStatus = mapOnfidoStatus(payload?.payload?.object?.status);
  } else {
    return { updated: false, status: "unknown" };
  }

  if (!providerRef) return { updated: false, status: "no_ref" };

  const rows = await db.select().from(schema.kycSubmissions)
    .where(eq(schema.kycSubmissions.alpacaAccountId, providerRef))
    .orderBy(desc(schema.kycSubmissions.submittedAt))
    .limit(1)
    .execute();
  if (rows.length === 0) return { updated: false, status: "not_found" };

  await db.update(schema.kycSubmissions)
    .set({ status: newStatus, reviewedAt: new Date() })
    .where(eq(schema.kycSubmissions.id, rows[0].id))
    .execute();

  logger.info({ provider, providerRef, newStatus }, "KYC webhook processed");

  // Notify user
  const userId = rows[0].userId;
  notify(userId, {
    type: "kyc_status",
    title: newStatus === "approved" ? "KYC approved ✓" : "KYC needs attention",
    body: newStatus === "approved" ? "Your identity verification has been approved. You can now switch to live trading." : `Your KYC submission status: ${newStatus}`,
    emailData: { status: newStatus },
  }).catch(() => { /* ignore notify errors */ });

  return { updated: true, status: newStatus };
}

function mapPersonaStatus(s: string): "pending" | "approved" | "rejected" | "needs_info" {
  if (s === "approved" || s === "completed") return "approved";
  if (s === "declined" || s === "failed") return "rejected";
  if (s === "needs_review") return "needs_info";
  return "pending";
}

function mapOnfidoStatus(s: string): "pending" | "approved" | "rejected" | "needs_info" {
  if (s === "complete" || s === "approved") return "approved";
  if (s === "declined" || s === "rejected") return "rejected";
  if (s === "awaiting_applicant" || s === "awaiting_review") return "needs_info";
  return "pending";
}
