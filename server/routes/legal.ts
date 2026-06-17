/**
 * Terms of Service + Privacy Policy acceptance routes.
 *
 * Static markdown content with version tracking + consent log.
 * Before any user can use the platform, they must accept current versions.
 */
import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, schema } from "../db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

export const TOS_VERSION = "1.0.0";
export const PRIVACY_VERSION = "1.0.0";
export const RISK_DISCLOSURE_VERSION = "1.0.0";

const TOS_TEXT = `# Aether Energy — Terms of Service

**Version:** ${TOS_VERSION}  •  **Effective:** 2026-06-01

## 1. Acceptance of Terms

By accessing or using the Aether Energy platform (the "Service"), you agree to be bound by these Terms. If you do not agree, do not use the Service.

## 2. Service Description

Aether Energy provides algorithmic trading tools, market data, and backtesting for energy commodities. The Service is provided "as is" and may include simulated (paper) trading and, optionally, real-money trading via third-party brokers.

## 3. No Investment Advice

Aether Energy does NOT provide investment, financial, legal, or tax advice. All content is for informational and educational purposes only. You are solely responsible for your trading decisions and their outcomes.

## 4. Trading Risks

Trading energy commodities, derivatives, and other financial instruments involves substantial risk of loss. Past performance does not guarantee future results. You may lose all capital you deploy. **Only trade with capital you can afford to lose.**

## 5. Eligibility

You must be at least 18 years old (or the age of majority in your jurisdiction) and legally permitted to trade financial instruments in your country of residence.

## 6. KYC / AML

For real-money trading, you must complete Know Your Customer (KYC) verification. We may share your information with regulated third-party brokers and KYC service providers.

## 7. Fees

Paper trading is free. Real-money trading is subject to fees charged by the underlying broker (not Aether Energy directly). We do not currently charge platform fees.

## 8. Limitation of Liability

To the maximum extent permitted by law, Aether Energy, its officers, directors, employees, and affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.

## 9. Termination

We may suspend or terminate your access at any time, with or without cause, including for violation of these Terms.

## 10. Changes

We may update these Terms at any time. Material changes will be notified via the platform. Continued use after changes constitutes acceptance.

## 11. Governing Law

These Terms are governed by the laws of the jurisdiction in which Aether Energy operates.

---

**By clicking "I Accept", you confirm that you have read, understood, and agree to these Terms of Service.**
`;

const PRIVACY_TEXT = `# Aether Energy — Privacy Policy

**Version:** ${PRIVACY_VERSION}  •  **Effective:** 2026-06-01

## 1. Information We Collect

- **Account data:** email, username, hashed password
- **Trading data:** orders, positions, strategy configurations
- **Usage data:** IP address, user agent, session timestamps, audit log
- **Optional KYC data:** legal name, address, government ID (only if you opt into real-money trading)

## 2. How We Use Your Information

- To provide the Service (auth, trading, portfolio tracking)
- To comply with legal obligations (KYC/AML, tax reporting)
- To improve the Service (aggregated, anonymized analytics only)
- To send you service notifications (security alerts, trade fills)

## 3. What We Do NOT Do

- We do NOT sell your data to third parties
- We do NOT use your trading data for advertising
- We do NOT share KYC documents except with the regulated broker and KYC provider you opt into

## 4. Data Storage & Security

- Passwords: bcrypt (12 rounds)
- Sessions: JWT (7-day expiry, revocable on password change)
- At-rest encryption: provided by the database host
- In-transit: TLS 1.3 (HSTS preload-eligible)
- All endpoints rate-limited and audit-logged

## 5. Your Rights (GDPR / CCPA)

- **Access:** GET /api/auth/me/export returns all data we hold about you
- **Erasure:** DELETE /api/auth/me anonymizes your account
- **Portability:** the export above is in JSON
- **Rectification:** PUT /api/auth/profile

## 6. Cookies

We use only first-party session cookies (HttpOnly, SameSite=Strict). No third-party trackers.

## 7. Data Retention

- Account data: until you delete your account
- Trading history: 7 years (for tax/regulatory purposes)
- Audit log: 2 years
- Backups: 7 days rolling

## 8. Contact

privacy@aether-energy.ai

---

**By clicking "I Accept", you confirm that you have read and understood this Privacy Policy.**
`;

const RISK_DISCLOSURE = `# Risk Disclosure — Required Reading Before Real-Money Trading

**Version:** ${RISK_DISCLOSURE_VERSION}  •  **Effective:** 2026-06-01

## Volatility Risk

Energy commodities (crude oil, natural gas, gold, etc.) can experience extreme price volatility due to geopolitical events, weather, supply disruptions, and macroeconomic factors. Prices can move 5-10% in a single trading day.

## Leverage Risk

Trading on margin amplifies both gains AND losses. You can lose more than your initial deposit.

## Technology Risk

Software bugs, network failures, exchange outages, and data feed errors can cause unintended trades or missed stop losses. Aether Energy mitigates these but cannot eliminate them.

## Liquidity Risk

Some markets may have wide bid-ask spreads or no buyers at your limit price. Your limit orders may not fill.

## Regulatory Risk

Trading regulations vary by jurisdiction and change over time. You are responsible for compliance with laws in your country.

## Past Performance

Past performance of any strategy is NOT indicative of future results. Backtests may overfit to historical data.

## No Guarantee

There is no guarantee of profit. Many traders lose money.

## Recommendation

- Start with paper trading
- Only risk capital you can afford to lose
- Use stop losses
- Diversify
- Consult a licensed financial advisor

**By acknowledging this disclosure, you confirm you understand these risks.**
`;

router.get("/terms/text", (_req, res) => {
  res.type("text/markdown").send(TOS_TEXT);
});

router.get("/privacy/text", (_req, res) => {
  res.type("text/markdown").send(PRIVACY_TEXT);
});

router.get("/risk-disclosure/text", (_req, res) => {
  res.type("text/markdown").send(RISK_DISCLOSURE);
});

router.get("/versions", (_req, res) => {
  res.json({
    termsOfService: TOS_VERSION,
    privacy: PRIVACY_VERSION,
    riskDisclosure: RISK_DISCLOSURE_VERSION,
  });
});

const acceptSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(["termsOfService", "privacy", "riskDisclosure"]),
    version: z.string(),
  })).min(1),
});

/**
 * POST /api/legal/accept
 * Records user's acceptance of legal documents.
 */
router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: "documents array required", status: 400 });
      return;
    }
    for (const doc of parsed.data.documents) {
      await db.insert(schema.consentLog).values({
        id: nanoid(),
        userId: req.user!.userId,
        documentType: doc.type,
        documentVersion: doc.version,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]?.slice(0, 255) || null,
      }).execute();
    }
    logger.info({ userId: req.user!.userId, docs: parsed.data.documents.map(d => d.type) }, "legal accepted");
    res.json({ message: "Accepted" });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "legal accept failed");
    res.status(500).json({ code: "INTERNAL", message: "Failed to record acceptance" });
  }
});

/**
 * GET /api/legal/acceptances
 * Returns the user's acceptance history.
 */
router.get("/acceptances", authMiddleware, async (req, res) => {
  const rows = await db.select().from(schema.consentLog)
    .where(eq(schema.consentLog.userId, req.user!.userId))
    .execute();
  res.json({ acceptances: rows });
});

export default router;
