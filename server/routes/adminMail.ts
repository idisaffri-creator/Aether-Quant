import { Router, type Request, type Response, type NextFunction } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin, isAdminUser } from "../middleware/adminAuth.js";
import type {
  AdminMailMessage,
  AdminMailContact,
  AdminMailTemplate,
  AdminMailCampaign,
  AdminMailSnippet,
  AdminMailFolder,
  AdminMailCategory,
  AdminMailStats,
} from "../../shared/types.js";

// ─── Zod validators ────────────────────────────────────────────────────────
const FOLDERS = ["inbox","sent","drafts","spam","trash","leads","marketing","support","blasts","archive","scheduled"] as const;
const CATEGORIES: AdminMailCategory[] = ["lead","marketing","support","blast","system","general","sales","partnership"];
const PRIORITIES = ["low","normal","high","urgent"] as const;
const STATUSES = ["unread","read","replied","forwarded","archived","spam","trash"] as const;

const emailField = z.string().trim().toLowerCase().email().max(254);
const idField = z.string().min(1).max(64);
const idsField = z.array(idField).min(1).max(500);

const bulkSchema = z.object({
  ids: idsField,
  action: z.enum(["markRead","markUnread","star","unstar","delete","move","categorize","tag","untag","snooze","unsnooze","setPriority"]),
  folder: z.enum(FOLDERS).optional(),
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  priority: z.enum(PRIORITIES).optional(),
  snoozeMinutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
});

const sendSchema = z.object({
  to: z.array(emailField).min(1).max(500),
  cc: z.array(emailField).max(500).optional(),
  bcc: z.array(emailField).max(500).optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  templateId: idField.optional(),
  campaignId: idField.optional(),
  inReplyTo: idField.optional(),
  threadId: z.string().max(100).optional(),
  attachments: z.array(z.object({ name: z.string().max(255), size: z.number().int().min(0).max(50 * 1024 * 1024), type: z.string().max(120) })).max(10).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: emailField,
  company: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  source: z.enum(["website","referral","campaign","manual","event","social","cold_outreach"]).optional(),
  status: z.enum(["new","contacted","qualified","unqualified","customer","unsubscribed"]).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  notes: z.string().max(2000).optional(),
  meta: z.object({
    location: z.string().max(120).optional(),
    interest: z.enum(["platform","api","enterprise","partnership","support","other"]).optional(),
    budget: z.string().max(40).optional(),
    timeline: z.string().max(60).optional(),
  }).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(CATEGORIES),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  variables: z.array(z.string().min(1).max(60)).max(50).optional(),
});

const snippetSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

const draftSchema = z.object({
  id: idField.optional(),
  to: z.string().max(5000).default(""),
  subject: z.string().max(500).default(""),
  body: z.string().max(50000).default(""),
  category: z.enum(CATEGORIES).optional(),
});

const forgotPwSchema = z.object({ email: emailField });
const resetPwSchema = z.object({
  token: z.string().min(20).max(80),
  newPassword: z.string().min(8).max(200),
});

const importSchema = z.object({
  csv: z.string().min(1).max(5 * 1024 * 1024),
  defaultSource: z.enum(["website","referral","campaign","manual","event","social","cold_outreach"]).optional(),
  defaultStatus: z.enum(["new","contacted","qualified","unqualified","customer","unsubscribed"]).optional(),
  dryRun: z.boolean().optional(),
});

const mailMergeSchema = z.object({
  contactIds: z.array(idField).min(1).max(100),
  templateId: idField.optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
});

const messagesListSchema = z.object({
  folder: z.enum(FOLDERS).optional(),
  category: z.enum(CATEGORIES).optional(),
  search: z.string().max(200).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  starred: z.union([z.literal("true"), z.literal("false")]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  includeSnoozed: z.union([z.literal("true"), z.literal("false")]).optional(),
});

function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.method === "GET" ? req.query : req.body);
    if (!result.success) {
      res.status(400).json({
        code: "VALIDATION",
        message: "Invalid request",
        issues: result.error.issues.slice(0, 10).map(i => ({ path: i.path.join("."), message: i.message })),
        status: 400,
      });
      return;
    }
    (req as any).validated = result.data;
    next();
  };
}

const router = Router();

router.use(requireAdmin);

import { bulkLimiter, sendLimiter } from "../middleware/rateLimit.js";

// ─── In-memory store (replace with DB in production) ────────────────────────
const messages = new Map<string, AdminMailMessage>();
const contacts = new Map<string, AdminMailContact>();
const templates = new Map<string, AdminMailTemplate>();
const campaigns = new Map<string, AdminMailCampaign>();
const snippets = new Map<string, AdminMailSnippet>();
const drafts = new Map<string, { id: string; to: string; subject: string; body: string; category: AdminMailCategory; updatedAt: string }>();
const savedSearches = new Map<string, { id: string; name: string; params: Record<string, string>; createdAt: string }>();

// Virtual folders that aren't part of the literal AdminMailFolder union but are valid for queries
const VIRTUAL_FOLDERS = ["scheduled"] as const;
type AnyFolder = AdminMailFolder | typeof VIRTUAL_FOLDERS[number];

// Auto-restore expired snoozes on every read
function restoreSnoozed() {
  const now = Date.now();
  for (const m of messages.values()) {
    if (m.snoozedUntil && m.snoozedUntil <= now) {
      m.snoozedUntil = null;
      messages.set(m.id, m);
    }
  }
}

// Tick loop: every 30s, promote scheduled messages whose time has passed
function tickScheduler() {
  const now = Date.now();
  for (const m of Array.from(messages.values())) {
    if (m.folder === ("scheduled" as any) && m.timestamp <= now) {
      m.folder = "sent";
      m.date = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      m.tags = (m.tags || []).filter(t => t !== "scheduled");
      m.tags.push("auto-sent");
      messages.set(m.id, m);
    }
  }
}
setInterval(tickScheduler, 30_000).unref();

// ─── Seed data ─────────────────────────────────────────────────────────────
function seed() {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

  // Contacts (leads/customers/support contacts)
  const seedContacts: AdminMailContact[] = [
    { id: "c1", name: "James Whitfield", email: "james.whitfield@vantagecommodities.com", company: "Vantage Commodities", role: "Head of Trading", source: "website", status: "qualified", tags: ["crude", "enterprise"], notes: "Interested in WTI momentum + Brent spread arbitrage. Budget approved Q3.", lastContactedAt: ago(45), createdAt: ago(60 * 24 * 7), meta: { location: "Houston, TX", interest: "enterprise", budget: "$250k+", timeline: "Q3 2026" } },
    { id: "c2", name: "Priya Ramaswamy", email: "priya.r@hedgeworks.io", company: "Hedgeworks Capital", role: "Portfolio Manager", source: "referral", status: "contacted", tags: ["natgas", "volatility"], notes: "Referred by Marcus Williams. Looking at nat gas volatility products.", lastContactedAt: ago(180), createdAt: ago(60 * 24 * 5), meta: { location: "Singapore", interest: "platform", budget: "$100k–$250k", timeline: "Q4 2026" } },
    { id: "c3", name: "Diego Morales", email: "diego.morales@altatrading.eu", company: "Alta Trading EU", role: "Quant Analyst", source: "event", status: "new", tags: ["api", "quant"], notes: "Met at London Energy Summit. Wants API access for backtesting.", lastContactedAt: null, createdAt: ago(60 * 12), meta: { location: "London, UK", interest: "api", timeline: "Immediate" } },
    { id: "c4", name: "Yuki Tanaka", email: "y.tanaka@sakura-energy.jp", company: "Sakura Energy KK", role: "VP Operations", source: "campaign", status: "qualified", tags: ["lng", "asia"], lastContactedAt: ago(240), createdAt: ago(60 * 24 * 14), meta: { location: "Tokyo, JP", interest: "enterprise", budget: "$500k+", timeline: "Q3 2026" } },
    { id: "c5", name: "Anna Köhler", email: "anna.koehler@blackforest-cap.de", company: "BlackForest Capital", role: "Director", source: "cold_outreach", status: "contacted", tags: ["crude", "europe"], lastContactedAt: ago(720), createdAt: ago(60 * 24 * 21), meta: { location: "Frankfurt, DE", interest: "platform" } },
    { id: "c6", name: "Marcus Williams", email: "marcus@pinnacle.energy", company: "Pinnacle Energy Pte", role: "VP Trading", source: "manual", status: "customer", tags: ["customer", "referrer"], notes: "Active customer. Q3 cargo lifting program in negotiation.", lastContactedAt: ago(60 * 6), createdAt: ago(60 * 24 * 90), meta: { location: "Singapore", interest: "platform" } },
    { id: "c7", name: "Sarah Chen", email: "sarah.chen@aether-energy.ai", company: "Aether Energy", role: "Head of Research", source: "manual", status: "customer", tags: ["internal", "vip"], lastContactedAt: ago(30), createdAt: ago(60 * 24 * 365), meta: { interest: "other" } },
    { id: "c8", name: "Olu Adeyemi", email: "olu.adeyemi@lagoscommodities.ng", company: "Lagos Commodities Ltd", role: "Trader", source: "website", status: "new", tags: ["africa", "crude"], lastContactedAt: null, createdAt: ago(60 * 4), meta: { location: "Lagos, NG", interest: "platform", timeline: "Q4 2026" } },
    { id: "c9", name: "Lina Petrov", email: "l.petrov@transcaspian-trading.az", company: "TransCaspian Trading", role: "Risk Manager", source: "referral", status: "contacted", tags: ["risk", "caspi"], lastContactedAt: ago(1200), createdAt: ago(60 * 24 * 30), meta: { location: "Baku, AZ", interest: "api" } },
    { id: "c10", name: "Ravi Krishnan", email: "ravi.k@gulf-marine.ae", company: "Gulf Marine DMCC", role: "Senior Broker", source: "social", status: "unqualified", tags: ["broker", "lng"], lastContactedAt: ago(60 * 48), createdAt: ago(60 * 24 * 45), meta: { location: "Dubai, UAE" } },
    { id: "c11", name: "Emily Carter", email: "emily.carter@nextgen-cap.com", company: "NextGen Capital", role: "Investment Director", source: "campaign", status: "qualified", tags: ["family-office", "crude"], lastContactedAt: ago(360), createdAt: ago(60 * 24 * 10), meta: { location: "New York, NY", interest: "enterprise", budget: "$1M+", timeline: "Q3 2026" } },
    { id: "c12", name: "Tomás Reyes", email: "t.reyes@andes-energy.cl", company: "Andes Energy SA", role: "CEO", source: "event", status: "new", tags: ["copper", "latam"], lastContactedAt: null, createdAt: ago(60 * 8), meta: { location: "Santiago, CL", interest: "partnership" } },
  ];
  seedContacts.forEach(c => contacts.set(c.id, c));

  // Templates
  const seedTemplates: AdminMailTemplate[] = [
    {
      id: "t1", name: "Welcome — New Lead", category: "lead", isSystem: true,
      subject: "Welcome to Aether Energy, {{name}}",
      body: "Hi {{name}},\n\nThanks for your interest in Aether Energy. I'm {{rep}}, and I'll be your point of contact as you explore our autonomous trading platform.\n\nBased on your interest in {{interest}}, I'd love to schedule a 30-minute walkthrough to show you how our AI agents handle {{interest}} workflows — from real-time signal generation to automated execution.\n\nYou can grab a slot here: https://aether-energy.ai/demo\n\nBest,\n{{rep}}\nAether Energy",
      variables: ["name", "interest", "rep"],
      useCount: 47, createdAt: ago(60 * 24 * 30), updatedAt: ago(60 * 24 * 3),
    },
    {
      id: "t2", name: "Demo Follow-up", category: "lead", isSystem: true,
      subject: "Recap & next steps for {{company}}",
      body: "Hi {{name}},\n\nGreat speaking with you earlier. Quick recap of what we discussed:\n\n• Aether Quant's autonomous agents currently manage $2.45B+ in notional volume across crude, gold, nat gas, and copper\n• {{interest}} workflows are fully customizable via the Strategy Studio\n• Typical onboarding for {{tier}} accounts: 5–7 business days\n\nNext step: I'll send a sandbox environment link so your team can poke around. Any blockers or questions in the meantime, just reply to this email.\n\nCheers,\n{{rep}}",
      variables: ["name", "company", "interest", "tier", "rep"],
      useCount: 23, createdAt: ago(60 * 24 * 21), updatedAt: ago(60 * 24 * 2),
    },
    {
      id: "t3", name: "Product Launch Announcement", category: "marketing", isSystem: true,
      subject: "Introducing Aether Quant v2.4 — autonomous portfolio rebalancing",
      body: "Hi {{name}},\n\nWe're excited to announce Aether Quant v2.4 — now with autonomous portfolio rebalancing and improved Sharpe optimization across multi-asset strategies.\n\nWhat's new:\n• Portfolio Agent: automated rebalancing on configurable drift thresholds\n• 4x faster backtest engine (10 years in under 90 seconds)\n• New Solana on-chain execution module\n• Real-time compliance overlay for institutional risk limits\n\nExisting customers can upgrade instantly. New accounts: try it free for 14 days.\n\n— The Aether Energy Team",
      variables: ["name"],
      useCount: 12, createdAt: ago(60 * 24 * 10), updatedAt: ago(60 * 24 * 1),
    },
    {
      id: "t4", name: "Monthly Newsletter", category: "marketing",
      subject: "Aether Insights — {{month}} {{year}}",
      body: "Hi {{name}},\n\nThis month in energy markets:\n\n• WTI crude averaged $78.40/bbl — up 4.2% MoM\n• Brent/Dubai EFS spread tightened to $1.42/bbl on Asian demand\n• Natural gas volatility remained elevated at 62% annualized\n• Our agents delivered +6.8% alpha vs. benchmark\n\nTop 3 strategies by Sharpe this month:\n1. Momentum Breakout (WTI) — 2.14\n2. Volatility Arbitrage (BRENT/NGAS) — 1.92\n3. Mean Reversion (Copper) — 1.76\n\nFull report: https://aether-energy.ai/insights/{{month}}-{{year}}\n\n— Aether Quant Research",
      variables: ["name", "month", "year"],
      useCount: 5, createdAt: ago(60 * 24 * 8), updatedAt: ago(60 * 24 * 1),
    },
    {
      id: "t5", name: "Support — Issue Acknowledged", category: "support", isSystem: true,
      subject: "[Ticket #{{ticket}}] We're on it — {{name}}",
      body: "Hi {{name}},\n\nWe've received your support request (Ticket #{{ticket}}) and our team is investigating.\n\nSummary of what you reported:\n\"{{summary}}\"\n\nOur SLA for {{priority}} tickets is {{sla}} hours. You'll get an update from us within that window, and a resolution as soon as possible.\n\nIf anything changes or gets worse, just reply to this thread — it's automatically attached to your ticket.\n\n— Aether Support",
      variables: ["name", "ticket", "summary", "priority", "sla"],
      useCount: 31, createdAt: ago(60 * 24 * 25), updatedAt: ago(60 * 24 * 4),
    },
    {
      id: "t6", name: "Support — Issue Resolved", category: "support", isSystem: true,
      subject: "[Ticket #{{ticket}}] Resolved — {{subject}}",
      body: "Hi {{name}},\n\nYour ticket has been resolved.\n\nRoot cause: {{cause}}\nFix applied: {{fix}}\n\nIf this happens again or anything else comes up, just reply here. We treat every reply as a new ticket thread automatically.\n\n— Aether Support",
      variables: ["name", "ticket", "subject", "cause", "fix"],
      useCount: 28, createdAt: ago(60 * 24 * 25), updatedAt: ago(60 * 24 * 2),
    },
    {
      id: "t7", name: "Partnership Intro", category: "partnership",
      subject: "Partnership opportunity — Aether × {{company}}",
      body: "Hi {{name}},\n\nI'm reaching out from Aether Energy. We've been following {{company}}'s work in {{sector}} and see strong alignment with our autonomous trading platform.\n\nI'd love to set up a 20-minute call to discuss:\n• Co-marketing opportunities\n• Technology integration paths\n• Joint go-to-market in {{region}}\n\nWould any of these times work? https://aether-energy.ai/meet\n\nBest,\n{{rep}}\nBD, Aether Energy",
      variables: ["name", "company", "sector", "region", "rep"],
      useCount: 8, createdAt: ago(60 * 24 * 15), updatedAt: ago(60 * 24 * 5),
    },
  ];
  seedTemplates.forEach(t => templates.set(t.id, t));

  // Inbound messages (inbox)
  const seedMessages: AdminMailMessage[] = [
    {
      id: "m-in-1", threadId: "th-1",
      from: "James Whitfield", fromEmail: "james.whitfield@vantagecommodities.com",
      to: ["admin@aether-energy.ai"], subject: "Re: WTI momentum demo for our trading desk",
      preview: "Thanks for the demo yesterday. Our quant team is impressed with the WTI momentum agent — particularly the Sharpe...",
      body: "Hi,\n\nThanks for the demo yesterday. Our quant team is impressed with the WTI momentum agent — particularly the Sharpe of 2.14 on the 10-year backtest. A few questions before we proceed:\n\n1. Can we customize the position sizing to a 2% risk-per-trade rule?\n2. Does the API support direct execution into CME Globex?\n3. What does enterprise onboarding look like — security review, compliance, etc.?\n\nWe're targeting a Q3 2026 go-live with $250k initial allocation. Happy to jump on a call this week.\n\nBest,\nJames Whitfield\nHead of Trading, Vantage Commodities",
      folder: "inbox", category: "lead", status: "unread", priority: "high",
      starred: true, hasAttachments: false, tags: ["enterprise", "qualified"],
      contactId: "c1", date: "09:42", timestamp: now - 18 * 60_000,
    },
    {
      id: "m-in-2", threadId: "th-2",
      from: "Priya Ramaswamy", fromEmail: "priya.r@hedgeworks.io",
      to: ["admin@aether-energy.ai"], subject: "Nat gas volatility — looking for a partner",
      preview: "Marcus Williams suggested I reach out. We're building a vol-overlay book and interested in...",
      body: "Hi,\n\nMarcus Williams suggested I reach out. We're building a vol-overlay book at Hedgeworks and are very interested in your NGAS volatility product. Specifically:\n\n• How is the volatility signal calculated? (intraday vs. EWMA)\n• Can the agent run on a custom vol regime filter?\n• What's the API latency from signal to order?\n\nA quick 20-minute call would be great. Anytime Tuesday or Wednesday works for me.\n\nThanks,\nPriya",
      folder: "inbox", category: "lead", status: "unread", priority: "normal",
      starred: false, hasAttachments: false, tags: ["referral", "vol"],
      contactId: "c2", date: "08:15", timestamp: now - 65 * 60_000,
    },
    {
      id: "m-in-3",
      from: "Diego Morales", fromEmail: "diego.morales@altatrading.eu",
      to: ["admin@aether-energy.ai"], subject: "API access for backtesting framework",
      preview: "Met at the London Energy Summit. Would love to learn more about the API access tier for...",
      body: "Hi,\n\nGreat meeting you at the London Energy Summit. Our team at Alta Trading is building a backtesting framework and we'd like to integrate with your historical data + signal APIs.\n\nCan you share:\n1. Pricing for API access (research/quant use case)\n2. Rate limits and SLA\n3. Sandbox environment access\n\nThanks,\nDiego",
      folder: "inbox", category: "lead", status: "unread", priority: "normal",
      starred: false, hasAttachments: false, tags: ["event", "api"],
      contactId: "c3", date: "Yesterday", timestamp: now - 24 * 60 * 60_000,
    },
    {
      id: "m-in-4", threadId: "th-4",
      from: "Yuki Tanaka", fromEmail: "y.tanaka@sakura-energy.jp",
      to: ["admin@aether-energy.ai"], subject: "Re: Enterprise tier — Q3 deployment timeline",
      preview: "Thank you for the proposal. Our board has approved the budget and we're ready to move to...",
      body: "Hi team,\n\nThank you for the proposal. Our board has approved the budget and we are ready to move to the next phase. Two items remain:\n\n1. Final security review — when can your team share the SOC2 report and pen-test summary?\n2. Onboarding kickoff — propose July 14–15 for our operations team.\n\nLooking forward to working together.\n\nBest,\nYuki Tanaka\nVP Operations, Sakura Energy",
      folder: "inbox", category: "lead", status: "read", priority: "high",
      starred: true, hasAttachments: true,
      attachments: [{ name: "Sakura_Compliance_Checklist.pdf", size: 184_320, type: "application/pdf" }],
      tags: ["enterprise", "asia"],
      contactId: "c4", date: "Yesterday", timestamp: now - 26 * 60 * 60_000, readAt: ago(60 * 12),
    },
    {
      id: "m-in-5",
      from: "Anna Köhler", fromEmail: "anna.koehler@blackforest-cap.de",
      to: ["admin@aether-energy.ai"], subject: "Pricing for European market access",
      preview: "Following up on our conversation at the Frankfurt meetup. Could you send me details on...",
      body: "Hello,\n\nFollowing our conversation at the Frankfurt meetup. Could you send detailed pricing for the European market access tier? We are particularly interested in:\n\n• Brent crude + European gas products\n• Multi-currency support (EUR billing)\n• GDPR-compliant data handling\n\nThanks,\nAnna",
      folder: "inbox", category: "lead", status: "unread", priority: "normal",
      starred: false, hasAttachments: false, tags: ["europe"],
      contactId: "c5", date: "Mon", timestamp: now - 2 * 24 * 60 * 60_000,
    },
    {
      id: "m-in-6", threadId: "th-6",
      from: "Aether Support", fromEmail: "support@aether-energy.ai",
      to: ["admin@aether-energy.ai"], subject: "[Ticket #TKT-2847] Trade execution failure on BRENT",
      preview: "Customer reports trade execution failure on BRENT for ticket TKT-2847...",
      body: "Ticket #TKT-2847\nCustomer: Marcus Williams (marcus@pinnacle.energy)\nSeverity: High\nSubject: Trade execution failure on BRENT\n\nCustomer reports: \"Long 500 BRENT @ $82.15 failed to execute. Order status stuck in 'pending' for 4+ minutes. Manual cancellation required.\"\n\nAuto-assigned to: trading infra team\nSLA: 4 hours (high priority)\n\n— Aether Support Bot",
      folder: "inbox", category: "support", status: "unread", priority: "urgent",
      starred: true, hasAttachments: false, tags: ["high-priority", "execution"],
      date: "Mon", timestamp: now - 3 * 24 * 60 * 60_000,
    },
    {
      id: "m-in-7", threadId: "th-7",
      from: "Lina Petrov", fromEmail: "l.petrov@transcaspian-trading.az",
      to: ["admin@aether-energy.ai"], subject: "Caspian crude — backtest request",
      preview: "Following up on our conversation about backtesting strategies on Caspian crude. Can your...",
      body: "Hello,\n\nFollowing up on our conversation about backtesting strategies on Caspian crude (BTC-FOB Ceyhan). Can your system handle Brent-Azeri spread analysis? If yes, please send sample reports.\n\nAlso: what is the latency for live data on the BTC route?\n\nBest,\nLina",
      folder: "inbox", category: "lead", status: "read", priority: "normal",
      starred: false, hasAttachments: false, tags: ["risk", "caspi"],
      contactId: "c9", date: "Sun", timestamp: now - 4 * 24 * 60 * 60_000, readAt: ago(60 * 24 * 2),
    },
    {
      id: "m-in-8",
      from: "LinkedIn Sales Navigator", fromEmail: "noreply@linkedin.com",
      to: ["admin@aether-energy.ai"], subject: "8 new leads matched your search",
      preview: "8 new prospects matched your saved search: 'Trading Platform Decision Maker'...",
      body: "8 new prospects matched your saved search: 'Trading Platform Decision Maker' — Energy & Commodities.\n\n• Head of Trading @ Vantage Commodities\n• Portfolio Manager @ Hedgeworks Capital\n• VP Risk @ TransCaspian Trading\n• ... and 5 more\n\nView all →",
      folder: "inbox", category: "marketing", status: "read", priority: "low",
      starred: false, hasAttachments: false, tags: ["automated"],
      date: "Sun", timestamp: now - 4.5 * 24 * 60 * 60_000, readAt: ago(60 * 24 * 4),
    },
    {
      id: "m-in-9",
      from: "Tomás Reyes", fromEmail: "t.reyes@andes-energy.cl",
      to: ["admin@aether-energy.ai"], subject: "Partnership — Latam copper markets",
      preview: "Hello. I'm the CEO of Andes Energy SA. We operate copper and lithium projects in Chile and...",
      body: "Hello,\n\nI'm the CEO of Andes Energy SA. We operate copper and lithium projects in Chile and Argentina. We are exploring partnership opportunities with technology platforms that can help with:\n\n• Hedging strategies for copper concentrate sales\n• Risk management for multi-jurisdiction operations\n• Compliance and reporting automation\n\nWould your team be open to a 30-minute introductory call?\n\nBest,\nTomás Reyes\nCEO, Andes Energy",
      folder: "inbox", category: "partnership", status: "unread", priority: "normal",
      starred: false, hasAttachments: false, tags: ["latam", "copper"],
      contactId: "c12", date: "Sat", timestamp: now - 5.5 * 24 * 60 * 60_000,
    },
    {
      id: "m-in-10",
      from: "CFTC Notifications", fromEmail: "notifications@cftc.gov",
      to: ["admin@aether-energy.ai"], subject: "Weekly Commitments of Traders Report",
      preview: "The latest COT report shows managed money net long positions in WTI crude oil increased by...",
      body: "The latest COT report shows managed money net long positions in WTI crude oil increased by 8,432 contracts to 287,654.\n\nCommercial hedgers increased their net short positions by 6,234 contracts to 312,876. The net speculative length suggests continued bullish sentiment in the crude oil market.",
      folder: "inbox", category: "system", status: "read", priority: "low",
      starred: false, hasAttachments: true, tags: ["automated", "compliance"],
      date: "Sat", timestamp: now - 6 * 24 * 60 * 60_000, readAt: ago(60 * 24 * 5),
    },
    {
      id: "m-in-11",
      from: "Olu Adeyemi", fromEmail: "olu.adeyemi@lagoscommodities.ng",
      to: ["admin@aether-energy.ai"], subject: "Inquiry about African markets coverage",
      preview: "Good day. I came across your platform and was impressed. Do you offer coverage for African...",
      body: "Good day,\n\nI came across your platform and was impressed. Do you offer coverage for African markets — specifically Bonny Light and Forcados crude grades?\n\nIf yes, please send the relevant product brief and pricing.\n\nRegards,\nOlu Adeyemi\nLagos Commodities Ltd",
      folder: "leads", category: "lead", status: "unread", priority: "normal",
      starred: false, hasAttachments: false, tags: ["africa"],
      contactId: "c8", date: "Fri", timestamp: now - 7 * 24 * 60 * 60_000,
    },
    {
      id: "m-in-12", threadId: "th-12",
      from: "Marcus Williams", fromEmail: "marcus@pinnacle.energy",
      to: ["admin@aether-energy.ai"], subject: "Re: Q3 cargo lifting program — pricing confirmation",
      preview: "Confirming the Q3 program pricing. Please proceed with the contract draft...",
      body: "Confirming the Q3 program pricing at Dated Brent minus $0.30/bbl as discussed. Please proceed with the contract draft for our legal team's review.\n\nTargeting execution by end of week.\n\nMarcus",
      folder: "inbox", category: "lead", status: "replied", priority: "high",
      starred: true, hasAttachments: false, tags: ["customer", "active-deal"],
      contactId: "c6", date: "Fri", timestamp: now - 7.5 * 24 * 60 * 60_000, readAt: ago(60 * 24 * 6), repliedAt: ago(60 * 24 * 5),
    },
  ];
  seedMessages.forEach(m => messages.set(m.id, m));

  // Sent messages
  const sentMessages: AdminMailMessage[] = [
    {
      id: "m-out-1", threadId: "th-1",
      from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
      to: ["james.whitfield@vantagecommodities.com"], subject: "Re: WTI momentum demo for our trading desk",
      preview: "Great to hear from you, James. To answer your questions: 1) Yes, position sizing is...",
      body: "Great to hear from you, James.\n\nTo answer your questions:\n\n1. Position sizing — fully configurable per agent. The 2% risk-per-trade rule can be set up in 5 minutes via the Strategy Studio. You'd also get per-strategy max position, sector exposure caps, and correlation-based de-risking.\n\n2. CME Globex direct execution — yes, via our FIX 4.4 gateway. Average fill latency is 38ms in our internal benchmarks.\n\n3. Enterprise onboarding — typical timeline is 5–7 business days. We handle SOC2 documentation, security review, and provide a dedicated solutions engineer throughout the process.\n\nI've attached our security overview and a sample enterprise onboarding plan. Let me know if a Tuesday call works for a deeper walkthrough.\n\nBest,\nThe Aether Team",
      folder: "sent", category: "lead", status: "replied", priority: "high",
      starred: false, hasAttachments: true, tags: ["enterprise", "follow-up"],
      contactId: "c1", campaignId: undefined, inReplyTo: "m-in-1",
      date: "08:30", timestamp: now - 6 * 60 * 60_000, readAt: ago(60 * 5), repliedAt: ago(60 * 5),
    },
    {
      id: "m-out-2", threadId: "th-2",
      from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
      to: ["priya.r@hedgeworks.io"], subject: "Re: Nat gas volatility — looking for a partner",
      preview: "Hi Priya, Thanks for reaching out (and thanks to Marcus for the intro)...",
      body: "Hi Priya,\n\nThanks for reaching out (and thanks to Marcus for the intro). Great questions:\n\n• Vol signal: we use a hybrid EWMA + GARCH model with intraday re-calibration. The full spec is in our research whitepaper, which I'll send over.\n\n• Custom vol regime filter — yes, fully configurable. You can define your own regime thresholds and even use machine learning models for regime detection.\n\n• Signal-to-order latency: typically 80–120ms in production, with priority routing down to 35ms for enterprise customers.\n\nHow about Wednesday at 3pm SGT? I'll send a calendar invite with the call details.\n\nBest,\nAether Team",
      folder: "sent", category: "lead", status: "replied", priority: "normal",
      starred: false, hasAttachments: false, tags: ["referral"],
      contactId: "c2", inReplyTo: "m-in-2",
      date: "Yesterday", timestamp: now - 22 * 60 * 60_000,
    },
    {
      id: "m-out-3",
      from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
      to: ["diego.morales@altatrading.eu"], subject: "Re: API access for backtesting framework",
      preview: "Hi Diego, Great to connect. Here's a quick summary of the API access options...",
      body: "Hi Diego,\n\nGreat to connect. Here's a quick summary of the API access options:\n\n1. Pricing — research/quant tier starts at $2,500/mo with volume discounts above 100M API calls/mo.\n\n2. Rate limits — 1,000 req/min standard, 10,000 req/min enterprise. SLA: 99.95% uptime.\n\n3. Sandbox — we can issue you a sandbox API key within 24 hours. The sandbox has full historical data (10+ years) and live paper trading.\n\nI'll send the API docs and sandbox credentials in a separate email. Let me know if you need a quick call to walk through the integration.\n\nBest,\nAether API Team",
      folder: "sent", category: "lead", status: "read", priority: "normal",
      starred: false, hasAttachments: false, tags: ["api", "outbound"],
      contactId: "c3", inReplyTo: "m-in-3",
      date: "Sun", timestamp: now - 4 * 24 * 60 * 60_000,
    },
    {
      id: "m-out-4",
      from: "Aether Marketing", fromEmail: "marketing@aether-energy.ai",
      to: ["all-contacts@blast"], subject: "Aether Insights — June 2026",
      preview: "This month in energy markets: WTI crude averaged $78.40/bbl, up 4.2% MoM...",
      body: "This month in energy markets:\n\n• WTI crude averaged $78.40/bbl — up 4.2% MoM\n• Brent/Dubai EFS spread tightened to $1.42/bbl on Asian demand\n• Natural gas volatility remained elevated at 62% annualized\n• Our agents delivered +6.8% alpha vs. benchmark\n\nTop 3 strategies by Sharpe this month:\n1. Momentum Breakout (WTI) — 2.14\n2. Volatility Arbitrage (BRENT/NGAS) — 1.92\n3. Mean Reversion (Copper) — 1.76\n\nFull report: https://aether-energy.ai/insights/june-2026\n\n— Aether Quant Research",
      folder: "blasts", category: "marketing", status: "read", priority: "low",
      starred: false, hasAttachments: false, tags: ["newsletter", "blast"],
      campaignId: "camp-1",
      date: "Mon", timestamp: now - 3 * 24 * 60 * 60_000,
    },
  ];
  sentMessages.forEach(m => messages.set(m.id, m));

  // Campaigns
  const seedCampaigns: AdminMailCampaign[] = [
    {
      id: "camp-1", name: "June Insights Newsletter",
      subject: "Aether Insights — June 2026",
      body: sentMessages[3].body,
      category: "marketing", status: "sent",
      audience: { contactIds: Array.from(contacts.keys()).slice(0, 8), tags: [], estimated: 8 },
      stats: { sent: 8, delivered: 8, opened: 5, clicked: 3, replied: 1, bounced: 0, unsubscribed: 0 },
      sentAt: ago(60 * 24 * 3), createdBy: "admin-user-id", createdAt: ago(60 * 24 * 5),
      templateId: "t4",
    },
    {
      id: "camp-2", name: "Enterprise Q3 Outreach",
      subject: "Q3 enterprise tier — exclusive early access",
      body: "Hi {{name}},\n\nFor Q3 2026, we're offering early access to our enterprise tier for select partners...",
      category: "marketing", status: "draft",
      audience: { contactIds: ["c1", "c4", "c11"], tags: ["enterprise", "qualified"], estimated: 3 },
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0 },
      scheduledAt: null, createdBy: "admin-user-id", createdAt: ago(60 * 6),
    },
    {
      id: "camp-3", name: "Reactivation — inactive accounts",
      subject: "We've missed you at Aether Energy",
      body: "Hi {{name}},\n\nIt's been a while since you logged in. Here's what's new...",
      category: "marketing", status: "scheduled",
      audience: { contactIds: ["c10"], tags: ["reactivation"], estimated: 12 },
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0 },
      scheduledAt: new Date(now + 24 * 60 * 60_000).toISOString(),
      createdBy: "admin-user-id", createdAt: ago(60 * 2),
    },
  ];
  seedCampaigns.forEach(c => campaigns.set(c.id, c));
}

seed();

// ─── Helpers ────────────────────────────────────────────────────────────────
const FOLDER_LABELS: Record<AdminMailFolder, string> = {
  inbox: "Inbox", sent: "Sent", drafts: "Drafts", spam: "Spam", trash: "Trash",
  leads: "Leads", marketing: "Marketing", support: "Support", blasts: "Blasts", archive: "Archive",
  scheduled: "Scheduled",
};

const FOLDER_ICONS: Record<AdminMailFolder, string> = {
  inbox: "📥", sent: "📤", drafts: "📝", spam: "⚠️", trash: "🗑️",
  leads: "🎯", marketing: "📢", support: "🛟", blasts: "📣", archive: "📦",
  scheduled: "⏰",
};

function refreshFolderCounts() {
  const counts: Record<AdminMailFolder, number> = {
    inbox: 0, sent: 0, drafts: 0, spam: 0, trash: 0,
    leads: 0, marketing: 0, support: 0, blasts: 0, archive: 0, scheduled: 0,
  };
  for (const m of messages.values()) {
    counts[m.folder] = (counts[m.folder] || 0) + 1;
  }
  return counts;
}

function buildActivity() {
  const events: AdminMailStats["recentActivity"] = [];
  const sorted = Array.from(messages.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
  for (const m of sorted) {
    events.push({
      id: `act-${m.id}`,
      type: m.folder === "sent" || m.folder === "blasts" ? "sent" : "received",
      description: `${m.folder === "sent" || m.folder === "blasts" ? "Sent" : "Received"}: ${m.subject}`,
      timestamp: m.timestamp,
    });
  }
  for (const c of Array.from(contacts.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3)) {
    events.push({
      id: `act-${c.id}`,
      type: "contact_added",
      description: `New contact: ${c.name} (${c.company || c.email})`,
      timestamp: new Date(c.createdAt).getTime(),
    });
  }
  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// Health
router.get("/ping", (_req, res) => {
  res.json({ ok: true, scope: "admin-mail", time: new Date().toISOString() });
});

// Folders with counts
router.get("/folders", (_req, res) => {
  const counts = refreshFolderCounts();
  const folders = (Object.keys(FOLDER_LABELS) as AdminMailFolder[]).map(id => ({
    id,
    label: FOLDER_LABELS[id],
    icon: FOLDER_ICONS[id],
    count: counts[id] || 0,
  }));
  res.json({ folders, totalMessages: messages.size, totalUnread: Array.from(messages.values()).filter(m => m.status === "unread" && m.folder === "inbox").length });
});

// List messages (with filters)
router.get("/messages", validate(messagesListSchema), (req: any, res) => {
  restoreSnoozed();
  const q = req.validated as z.infer<typeof messagesListSchema>;
  const folder = q.folder;
  const category = q.category;
  const search = q.search?.toLowerCase();
  const status = q.status as AdminMailMessage["status"] | undefined;
  const priority = q.priority;
  const starred = q.starred === "true" ? true : q.starred === "false" ? false : undefined;
  const includeSnoozed = q.includeSnoozed === "true";
  const limit = q.limit ?? 100;
  const offset = q.offset ?? 0;

  let list = Array.from(messages.values());
  if (folder) list = list.filter(m => m.folder === folder);
  if (category) list = list.filter(m => m.category === category);
  if (status) list = list.filter(m => m.status === status);
  if (priority) list = list.filter(m => m.priority === priority);
  if (starred !== undefined) list = list.filter(m => m.starred === starred);
  if (!includeSnoozed) {
    const now = Date.now();
    list = list.filter(m => !m.snoozedUntil || m.snoozedUntil <= now);
  }
  if (search) {
    list = list.filter(m =>
      m.subject.toLowerCase().includes(search) ||
      m.from.toLowerCase().includes(search) ||
      m.fromEmail.toLowerCase().includes(search) ||
      m.preview.toLowerCase().includes(search) ||
      (m.tags || []).some(t => t.toLowerCase().includes(search))
    );
  }

  list.sort((a, b) => b.timestamp - a.timestamp);
  const total = list.length;
  list = list.slice(offset, offset + limit);

  res.json({ messages: list, total, limit, offset });
});

// List currently-snoozed messages
router.get("/messages/snoozed", (_req, res) => {
  restoreSnoozed();
  const now = Date.now();
  const list = Array.from(messages.values()).filter(m => m.snoozedUntil && m.snoozedUntil > now);
  list.sort((a, b) => (a.snoozedUntil || 0) - (b.snoozedUntil || 0));
  res.json({ messages: list, total: list.length });
});

// Get a single message
router.get("/messages/:id", (req, res) => {
  const m = messages.get(req.params.id);
  if (!m) {
    res.status(404).json({ code: "NOT_FOUND", message: "Message not found", status: 404 });
    return;
  }
  res.json({ message: m });
});

// Thread (group by threadId)
router.get("/thread/:threadId", (req, res) => {
  const list = Array.from(messages.values()).filter(m => m.threadId === req.params.threadId);
  list.sort((a, b) => a.timestamp - b.timestamp);
  res.json({ messages: list, count: list.length });
});

// Update message (status/starred/folder/priority/tags)
router.put("/messages/:id", (req, res) => {
  const m = messages.get(req.params.id);
  if (!m) {
    res.status(404).json({ code: "NOT_FOUND", message: "Message not found", status: 404 });
    return;
  }
  const { status, starred, folder, priority, tags, category, snoozedUntil } = req.body as Partial<AdminMailMessage>;
  if (status) {
    m.status = status;
    if (status === "read" && !m.readAt) m.readAt = new Date().toISOString();
  }
  if (starred !== undefined) m.starred = starred;
  if (folder) m.folder = folder;
  if (priority) m.priority = priority;
  if (tags) m.tags = tags;
  if (category) m.category = category;
  if (snoozedUntil !== undefined) m.snoozedUntil = snoozedUntil;
  messages.set(m.id, m);
  res.json({ message: m });
});

// Mark whole folder as read
router.post("/mark-folder-read", (req, res) => {
  const { folder } = req.body as { folder: AdminMailFolder };
  if (!folder) {
    res.status(400).json({ code: "VALIDATION", message: "folder required", status: 400 });
    return;
  }
  let n = 0;
  for (const m of messages.values()) {
    if (m.folder === folder && m.status === "unread") {
      m.status = "read";
      m.readAt = new Date().toISOString();
      messages.set(m.id, m);
      n++;
    }
  }
  res.json({ message: `${n} message(s) marked as read`, count: n });
});

// Delete a message
router.delete("/messages/:id", (req, res) => {
  const m = messages.get(req.params.id);
  if (!m) {
    res.status(404).json({ code: "NOT_FOUND", message: "Message not found", status: 404 });
    return;
  }
  messages.delete(req.params.id);
  res.json({ message: "Deleted", id: req.params.id });
});

// Send a new message (single or bulk)
router.post("/send", sendLimiter, validate(sendSchema), (req: any, res) => {
  const { to, cc, bcc, subject, body, category, priority, templateId, campaignId, inReplyTo, threadId, attachments, scheduledAt } = req.validated as z.infer<typeof sendSchema>;
  // Scheduled sends go to a queue; immediate sends are recorded as sent now
  if (scheduledAt) {
    const id = `m-sched-${nanoid(8)}`;
    const schedTs = new Date(scheduledAt).getTime();
    if (schedTs > Date.now() + 1000) {
      const recipients = to;
      for (const recipient of recipients) {
        const msg: AdminMailMessage = {
          id: `${id}-${nanoid(4)}`,
          threadId: threadId || (inReplyTo ? messages.get(inReplyTo)?.threadId : undefined) || `th-${id}`,
          from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
          to: [recipient], cc, bcc,
          subject: subject + " (scheduled " + new Date(schedTs).toLocaleString() + ")",
          preview: body.slice(0, 120), body,
          folder: "scheduled" as AdminMailFolder, // virtual folder; not in FOLDERS list
          category: category || "general",
          status: "read", priority: priority || "normal",
          starred: false, hasAttachments: !!(attachments && attachments.length),
          attachments, tags: ["scheduled"],
          campaignId, templateId, inReplyTo,
          date: new Date(schedTs).toLocaleString(),
          timestamp: schedTs, readAt: null, repliedAt: null,
        };
        messages.set(msg.id, msg);
      }
      res.status(201).json({ message: `Scheduled ${recipients.length} email(s) for ${new Date(schedTs).toLocaleString()}`, scheduledAt: schedTs, ids: [] });
      return;
    }
  }

  const id = `m-out-${nanoid(8)}`;
  const now = new Date();
  const recipients = to.length;
  const created: AdminMailMessage[] = [];
  for (const recipient of to) {
    const msg: AdminMailMessage = {
      id: `${id}-${nanoid(4)}`,
      threadId: threadId || (inReplyTo ? messages.get(inReplyTo)?.threadId : undefined) || `th-${id}`,
      from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
      to: [recipient], cc, bcc,
      subject, preview: body.slice(0, 120), body,
      folder: recipients > 1 ? "blasts" : "sent",
      category: category || "general",
      status: "read", priority: priority || "normal",
      starred: false, hasAttachments: !!(attachments && attachments.length),
      attachments, tags: [],
      campaignId, templateId, inReplyTo,
      date: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.getTime(),
      readAt: now.toISOString(), repliedAt: null,
    };
    messages.set(msg.id, msg);
    created.push(msg);
  }

  // Update campaign stats if part of a campaign
  if (campaignId) {
    const c = campaigns.get(campaignId);
    if (c) {
      c.stats.sent += created.length;
      c.stats.delivered += created.length;
      if (c.status === "draft" || c.status === "scheduled") {
        c.status = "sent";
        c.sentAt = now.toISOString();
      }
      campaigns.set(c.id, c);
    }
  }

  // Update template usage
  if (templateId) {
    const t = templates.get(templateId);
    if (t) {
      t.useCount += created.length;
      t.updatedAt = now.toISOString();
      templates.set(t.id, t);
    }
  }

  res.status(201).json({ message: "Email(s) sent", sent: created.length, ids: created.map(c => c.id), sample: created[0] });
});

// ─── Contacts ────────────────────────────────────────────────────────────────
// ─── Contacts CSV export (must come BEFORE /contacts/:id) ────────────────
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/contacts/export.csv", (_req, res) => {
  const list = Array.from(contacts.values());
  const headers = ["name", "email", "company", "role", "phone", "source", "status", "tags", "notes", "location", "interest", "budget", "timeline"];
  const rows = [headers.join(",")];
  for (const c of list) {
    rows.push([
      c.name, c.email, c.company || "", c.role || "", c.phone || "",
      c.source, c.status, (c.tags || []).join(";"), c.notes || "",
      c.meta?.location || "", c.meta?.interest || "", c.meta?.budget || "", c.meta?.timeline || "",
    ].map(csvEscape).join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(rows.join("\n"));
});

router.get("/contacts", (req, res) => {
  const search = (req.query.search as string | undefined)?.toLowerCase();
  const status = req.query.status as AdminMailContact["status"] | undefined;
  const source = req.query.source as AdminMailContact["source"] | undefined;
  const tag = req.query.tag as string | undefined;

  let list = Array.from(contacts.values());
  if (search) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      (c.company || "").toLowerCase().includes(search) ||
      c.tags.some(t => t.toLowerCase().includes(search))
    );
  }
  if (status) list = list.filter(c => c.status === status);
  if (source) list = list.filter(c => c.source === source);
  if (tag) list = list.filter(c => c.tags.includes(tag));

  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ contacts: list, total: list.length });
});

router.get("/contacts/:id", (req, res) => {
  const c = contacts.get(req.params.id);
  if (!c) {
    res.status(404).json({ code: "NOT_FOUND", message: "Contact not found", status: 404 });
    return;
  }
  res.json({ contact: c });
});

router.post("/contacts", validate(contactSchema), (req: any, res) => {
  const { name, email, company, role, phone, source, status, tags, notes, meta } = req.validated as z.infer<typeof contactSchema>;
  // Dedup by email
  for (const c of contacts.values()) {
    if (c.email.toLowerCase() === email.toLowerCase()) {
      res.status(409).json({ code: "CONFLICT", message: "Contact with this email already exists", status: 409, existingId: c.id });
      return;
    }
  }
  const id = `c-${nanoid(6)}`;
  const now = new Date().toISOString();
  const contact: AdminMailContact = {
    id, name, email,
    company, role, phone,
    source: source || "manual",
    status: status || "new",
    tags: tags || [],
    notes, lastContactedAt: null, createdAt: now,
    meta,
  };
  contacts.set(id, contact);
  res.status(201).json({ contact });
});

router.put("/contacts/:id", (req, res) => {
  const c = contacts.get(req.params.id);
  if (!c) {
    res.status(404).json({ code: "NOT_FOUND", message: "Contact not found", status: 404 });
    return;
  }
  Object.assign(c, req.body);
  contacts.set(c.id, c);
  res.json({ contact: c });
});

router.delete("/contacts/:id", (req, res) => {
  if (!contacts.has(req.params.id)) {
    res.status(404).json({ code: "NOT_FOUND", message: "Contact not found", status: 404 });
    return;
  }
  contacts.delete(req.params.id);
  res.json({ message: "Contact deleted", id: req.params.id });
});

// ─── Templates ──────────────────────────────────────────────────────────────
router.get("/templates", (req, res) => {
  const category = req.query.category as AdminMailCategory | undefined;
  let list = Array.from(templates.values());
  if (category) list = list.filter(t => t.category === category);
  list.sort((a, b) => b.useCount - a.useCount);
  res.json({ templates: list, total: list.length });
});

router.get("/templates/:id", (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) {
    res.status(404).json({ code: "NOT_FOUND", message: "Template not found", status: 404 });
    return;
  }
  res.json({ template: t });
});

router.post("/templates", validate(templateSchema), (req: any, res) => {
  const { name, category, subject, body, variables } = req.validated as z.infer<typeof templateSchema>;
  const id = `t-${nanoid(6)}`;
  const now = new Date().toISOString();
  const tpl: AdminMailTemplate = {
    id, name, category, subject, body,
    variables: variables || [],
    useCount: 0, createdAt: now, updatedAt: now,
  };
  templates.set(id, tpl);
  res.status(201).json({ template: tpl });
});

router.put("/templates/:id", (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) {
    res.status(404).json({ code: "NOT_FOUND", message: "Template not found", status: 404 });
    return;
  }
  Object.assign(t, req.body, { updatedAt: new Date().toISOString() });
  templates.set(t.id, t);
  res.json({ template: t });
});

router.delete("/templates/:id", (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) {
    res.status(404).json({ code: "NOT_FOUND", message: "Template not found", status: 404 });
    return;
  }
  if (t.isSystem) {
    res.status(403).json({ code: "FORBIDDEN", message: "System templates cannot be deleted", status: 403 });
    return;
  }
  templates.delete(req.params.id);
  res.json({ message: "Template deleted", id: req.params.id });
});

// Render a template with variables
router.post("/templates/:id/render", (req, res) => {
  const t = templates.get(req.params.id);
  if (!t) {
    res.status(404).json({ code: "NOT_FOUND", message: "Template not found", status: 404 });
    return;
  }
  const vars = req.body as Record<string, string>;
  let subject = t.subject;
  let body = t.body;
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, "g");
    subject = subject.replace(re, v);
    body = body.replace(re, v);
  }
  res.json({ subject, body, missingVariables: t.variables.filter(v => vars[v] === undefined) });
});

// ─── Campaigns / Blasts ─────────────────────────────────────────────────────
router.get("/campaigns", (req, res) => {
  const status = req.query.status as AdminMailCampaign["status"] | undefined;
  let list = Array.from(campaigns.values());
  if (status) list = list.filter(c => c.status === status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ campaigns: list, total: list.length });
});

router.get("/campaigns/:id", (req, res) => {
  const c = campaigns.get(req.params.id);
  if (!c) {
    res.status(404).json({ code: "NOT_FOUND", message: "Campaign not found", status: 404 });
    return;
  }
  res.json({ campaign: c });
});

router.post("/campaigns", (req, res) => {
  const { name, subject, body, category, status, audience, scheduledAt, templateId } = req.body as Partial<AdminMailCampaign>;
  if (!name || !subject || !body || !audience) {
    res.status(400).json({ code: "VALIDATION", message: "name, subject, body, audience required", status: 400 });
    return;
  }
  const id = `camp-${nanoid(6)}`;
  const now = new Date().toISOString();
  const c: AdminMailCampaign = {
    id, name, subject, body,
    category: category || "marketing",
    status: status || "draft",
    audience, templateId,
    stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0 },
    scheduledAt: scheduledAt || null,
    sentAt: null,
    createdBy: "admin-user-id", createdAt: now,
  };
  campaigns.set(id, c);
  res.status(201).json({ campaign: c });
});

router.put("/campaigns/:id", (req, res) => {
  const c = campaigns.get(req.params.id);
  if (!c) {
    res.status(404).json({ code: "NOT_FOUND", message: "Campaign not found", status: 404 });
    return;
  }
  Object.assign(c, req.body);
  campaigns.set(c.id, c);
  res.json({ campaign: c });
});

router.post("/campaigns/:id/send", (req, res) => {
  const c = campaigns.get(req.params.id);
  if (!c) {
    res.status(404).json({ code: "NOT_FOUND", message: "Campaign not found", status: 404 });
    return;
  }
  if (c.status === "sent" || c.status === "sending") {
    res.status(400).json({ code: "INVALID_STATE", message: "Campaign already sent or in progress", status: 400 });
    return;
  }

  c.status = "sending";
  campaigns.set(c.id, c);

  // Send immediately (synchronous mock)
  const recipients = c.audience.contactIds;
  let sentCount = 0;
  const now = new Date();
  for (const cid of recipients) {
    const contact = contacts.get(cid);
    if (!contact) continue;
    const msg: AdminMailMessage = {
      id: `m-camp-${nanoid(6)}`,
      threadId: `th-camp-${c.id}`,
      from: "Aether Admin", fromEmail: "admin@aether-energy.ai",
      to: [contact.email],
      subject: c.subject, preview: c.body.slice(0, 120), body: c.body,
      folder: "blasts", category: c.category,
      status: "read", priority: "normal",
      starred: false, hasAttachments: false, tags: ["blast", c.category],
      campaignId: c.id, contactId: cid,
      date: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.getTime(), readAt: now.toISOString(),
    };
    messages.set(msg.id, msg);
    sentCount++;
  }

  // Estimate opens/clicks (mock)
  const opened = Math.floor(sentCount * 0.65);
  const clicked = Math.floor(opened * 0.45);
  const replied = Math.floor(opened * 0.18);
  c.stats = { sent: sentCount, delivered: sentCount, opened, clicked, replied, bounced: 0, unsubscribed: 0 };
  c.status = "sent";
  c.sentAt = now.toISOString();
  campaigns.set(c.id, c);

  res.json({ campaign: c, sent: sentCount });
});

router.delete("/campaigns/:id", (req, res) => {
  if (!campaigns.has(req.params.id)) {
    res.status(404).json({ code: "NOT_FOUND", message: "Campaign not found", status: 404 });
    return;
  }
  campaigns.delete(req.params.id);
  res.json({ message: "Campaign deleted", id: req.params.id });
});

// ─── Bulk actions ──────────────────────────────────────────────────────────
router.post("/bulk", bulkLimiter, validate(bulkSchema), (req: any, res) => {
  const { ids, action, folder, category, tags, priority, snoozeMinutes } = req.validated as z.infer<typeof bulkSchema>;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ code: "VALIDATION", message: "ids required", status: 400 });
    return;
  }
  if (!action) {
    res.status(400).json({ code: "VALIDATION", message: "action required", status: 400 });
    return;
  }
  let affected = 0;
  const updated: AdminMailMessage[] = [];
  for (const id of ids) {
    const m = messages.get(id);
    if (!m) continue;
    switch (action) {
      case "markRead": m.status = "read"; m.readAt = m.readAt || new Date().toISOString(); break;
      case "markUnread": m.status = "unread"; break;
      case "star": m.starred = true; break;
      case "unstar": m.starred = false; break;
      case "delete": messages.delete(id); affected++; continue;
      case "move": if (folder) m.folder = folder; break;
      case "categorize": if (category) m.category = category; break;
      case "tag": m.tags = Array.from(new Set([...(m.tags || []), ...(tags || [])])); break;
      case "untag": m.tags = (m.tags || []).filter(t => !(tags || []).includes(t)); break;
      case "snooze": m.snoozedUntil = Date.now() + (snoozeMinutes || 60) * 60_000; break;
      case "unsnooze": m.snoozedUntil = null; break;
      case "setPriority": if (priority) m.priority = priority; break;
    }
    messages.set(m.id, m);
    updated.push(m);
    affected++;
  }
  res.json({ message: `Bulk ${action}: ${affected} affected`, affected, updated: action === "delete" ? [] : updated });
});

// ─── Snippets ─────────────────────────────────────────────────────────────
function seedSnippets() {
  const now = new Date().toISOString();
  const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
  const seed: AdminMailSnippet[] = [
    { id: "sn1", name: "Quick intro", body: "Hi {{name}}, thanks for reaching out — I'm {{rep}} from Aether Energy. I'll get back to you within 24h with a tailored proposal.", tags: ["intro", "support"], createdAt: ago(60 * 24 * 30), updatedAt: ago(60 * 24 * 2) },
    { id: "sn2", name: "Pricing", body: "Aether Quant has 3 tiers:\n• Free — public dashboard\n• Professional ($99/mo) — strategy studio\n• Enterprise (custom) — API + on-prem\n\nLet me know which fits and I'll send a quote.", tags: ["pricing", "lead"], createdAt: ago(60 * 24 * 25), updatedAt: ago(60 * 24 * 1) },
    { id: "sn3", name: "Demo link", body: "Here's the demo link: https://aether-energy.ai/demo\nUse any of the demo accounts (no password needed). It walks through our autonomous trading workflow end-to-end.", tags: ["demo", "lead"], createdAt: ago(60 * 24 * 20), updatedAt: ago(60 * 24 * 3) },
    { id: "sn4", name: "Ticket resolved", body: "Hi {{name}}, this ticket is now resolved. The fix is live and monitoring shows everything back to normal. Reply here if anything pops up again.", tags: ["support"], createdAt: ago(60 * 24 * 18), updatedAt: ago(60 * 24 * 4) },
    { id: "sn5", name: "Sign-off", body: "\n— {{rep}}\nAether Energy · Energy trading, automated", tags: ["signature"], createdAt: ago(60 * 24 * 15), updatedAt: ago(60 * 24 * 5) },
  ];
  seed.forEach(s => snippets.set(s.id, s));
}
seedSnippets();

router.get("/snippets", (req, res) => {
  const search = (req.query.search as string | undefined)?.toLowerCase();
  let list = Array.from(snippets.values());
  if (search) {
    list = list.filter(s => s.name.toLowerCase().includes(search) || s.body.toLowerCase().includes(search) || (s.tags || []).some(t => t.toLowerCase().includes(search)));
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ snippets: list, total: list.length });
});

router.post("/snippets", validate(snippetSchema), (req: any, res) => {
  const { name, subject, body, tags } = req.validated as z.infer<typeof snippetSchema>;
  const id = `sn-${nanoid(6)}`;
  const now = new Date().toISOString();
  const snip: AdminMailSnippet = { id, name, subject, body, tags: tags || [], createdAt: now, updatedAt: now };
  snippets.set(id, snip);
  res.status(201).json({ snippet: snip });
});

router.put("/snippets/:id", (req, res) => {
  const s = snippets.get(req.params.id);
  if (!s) {
    res.status(404).json({ code: "NOT_FOUND", message: "Snippet not found", status: 404 });
    return;
  }
  Object.assign(s, req.body, { updatedAt: new Date().toISOString() });
  snippets.set(s.id, s);
  res.json({ snippet: s });
});

router.delete("/snippets/:id", (req, res) => {
  if (!snippets.has(req.params.id)) {
    res.status(404).json({ code: "NOT_FOUND", message: "Snippet not found", status: 404 });
    return;
  }
  snippets.delete(req.params.id);
  res.json({ message: "Snippet deleted", id: req.params.id });
});

// ─── Drafts (auto-save) ────────────────────────────────────────────────────
router.get("/drafts", (_req, res) => {
  const list = Array.from(drafts.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ drafts: list, total: list.length });
});

router.post("/drafts", validate(draftSchema), (req: any, res) => {
  const { id, to, subject, body, category } = req.validated as z.infer<typeof draftSchema>;
  const draftId = id || `d-${nanoid(6)}`;
  const now = new Date().toISOString();
  drafts.set(draftId, { id: draftId, to, subject, body, category: category || "general", updatedAt: now });
  res.json({ draft: drafts.get(draftId) });
});

router.get("/drafts/:id", (req, res) => {
  const d = drafts.get(req.params.id);
  if (!d) {
    res.status(404).json({ code: "NOT_FOUND", message: "Draft not found", status: 404 });
    return;
  }
  res.json({ draft: d });
});

router.delete("/drafts/:id", (req, res) => {
  if (!drafts.has(req.params.id)) {
    res.status(404).json({ code: "NOT_FOUND", message: "Draft not found", status: 404 });
    return;
  }
  drafts.delete(req.params.id);
  res.json({ message: "Draft deleted", id: req.params.id });
});

// ─── Read receipts (mock tracking) ─────────────────────────────────────────
router.post("/messages/:id/open", (req, res) => {
  const m = messages.get(req.params.id);
  if (!m) {
    res.status(404).json({ code: "NOT_FOUND", message: "Message not found", status: 404 });
    return;
  }
  if (!m.readAt) m.readAt = new Date().toISOString();
  (m as any).openedAt = new Date().toISOString();
  messages.set(m.id, m);
  res.json({ ok: true });
});

router.post("/messages/:id/click", (req, res) => {
  const m = messages.get(req.params.id);
  if (!m) {
    res.status(404).json({ code: "NOT_FOUND", message: "Message not found", status: 404 });
    return;
  }
  (m as any).clickedAt = new Date().toISOString();
  messages.set(m.id, m);
  res.json({ ok: true });
});

// ─── Saved searches ────────────────────────────────────────────────────────
const savedSearchSchema = z.object({
  name: z.string().min(1).max(60),
  params: z.record(z.string(), z.string().max(200)).refine(o => Object.keys(o).length <= 20, "Too many params"),
});

router.get("/saved-searches", (_req, res) => {
  const list = Array.from(savedSearches.values()).sort((a, b) => a.name.localeCompare(b.name));
  res.json({ savedSearches: list, total: list.length });
});

router.post("/saved-searches", validate(savedSearchSchema), (req: any, res) => {
  const { name, params } = req.validated as z.infer<typeof savedSearchSchema>;
  const id = `ss-${nanoid(6)}`;
  const ss = { id, name, params, createdAt: new Date().toISOString() };
  savedSearches.set(id, ss);
  res.status(201).json({ savedSearch: ss });
});

router.delete("/saved-searches/:id", (req, res) => {
  if (!savedSearches.has(req.params.id)) {
    res.status(404).json({ code: "NOT_FOUND", message: "Saved search not found", status: 404 });
    return;
  }
  savedSearches.delete(req.params.id);
  res.json({ message: "Saved search deleted", id: req.params.id });
});

// ─── Tracking pixels (read receipts) ──────────────────────────────────────
router.get("/track/open/:id.png", (req, res) => {
  const m = messages.get(req.params.id);
  if (m) {
    (m as any).openedAt = new Date().toISOString();
    if (!m.readAt) m.readAt = new Date().toISOString();
    messages.set(m.id, m);
  }
  // 1x1 transparent PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.send(png);
});

router.get("/track/click/:id", (req, res) => {
  const m = messages.get(req.params.id);
  if (m) {
    (m as any).clickedAt = new Date().toISOString();
    messages.set(m.id, m);
  }
  res.json({ ok: true });
});

// ─── Mail-merge preview ────────────────────────────────────────────────────
router.post("/mail-merge/preview", validate(mailMergeSchema), (req: any, res) => {
  const { contactIds, templateId, subject, body } = req.validated as z.infer<typeof mailMergeSchema>;
  let tplSubject = subject || "";
  let tplBody = body || "";
  if (templateId) {
    const tpl = templates.get(templateId);
    if (tpl) {
      tplSubject = subject || tpl.subject;
      tplBody = body || tpl.body;
    }
  }
  const previews: { contactId: string; name: string; email: string; subject: string; body: string; missingVariables: string[] }[] = [];
  for (const cid of contactIds.slice(0, 10)) {
    const c = contacts.get(cid);
    if (!c) continue;
    const vars: Record<string, string> = {
      name: c.name, email: c.email, company: c.company || "", role: c.role || "",
      interest: c.meta?.interest || "", location: c.meta?.location || "",
      budget: c.meta?.budget || "", timeline: c.meta?.timeline || "",
      rep: "Aether Admin",
    };
    let s = tplSubject, b = tplBody;
    const missing: string[] = [];
    const allVars = Array.from(new Set([...Object.keys(vars), ...(tplSubject + tplBody).match(/\{\{\s*([\w]+)\s*\}\}/g)?.map(m => m.replace(/[{}\s]/g, "")) || []]));
    for (const v of allVars) {
      const re = new RegExp(`{{\\s*${v}\\s*}}`, "g");
      const val = vars[v] || "";
      if (!val) missing.push(v);
      s = s.replace(re, val);
      b = b.replace(re, val);
    }
    previews.push({ contactId: cid, name: c.name, email: c.email, subject: s, body: b, missingVariables: missing });
  }
  res.json({ previews, total: previews.length });
});

// ─── Contacts CSV import (export is defined above near /contacts GET) ─────
router.post("/contacts/import", sendLimiter, validate(importSchema), (req: any, res) => {
  const { csv, defaultSource, defaultStatus, dryRun } = req.validated as z.infer<typeof importSchema>;
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    res.status(400).json({ code: "VALIDATION", message: "CSV needs header + at least 1 row", status: 400 });
    return;
  }
  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === ",") { out.push(cur); cur = ""; }
        else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }
  const header = parseLine(lines[0]).map(h => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const nameIdx = col("name");
  const emailIdx = col("email");
  if (nameIdx < 0 || emailIdx < 0) {
    res.status(400).json({ code: "VALIDATION", message: "CSV must have 'name' and 'email' columns", status: 400 });
    return;
  }
  let imported = 0, updated = 0, skipped = 0;
  const errors: { row: number; reason: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    const name = fields[nameIdx]; const email = fields[emailIdx];
    if (!name || !email) { errors.push({ row: i + 1, reason: "missing name or email" }); skipped++; continue; }
    if (!/.+@.+\..+/.test(email)) { errors.push({ row: i + 1, reason: "invalid email" }); skipped++; continue; }
    let existing: AdminMailContact | undefined;
    for (const c of contacts.values()) {
      if (c.email.toLowerCase() === email.toLowerCase()) { existing = c; break; }
    }
    const tags = (fields[col("tags")] || "").split(/[;|]/).map(s => s.trim()).filter(Boolean);
    const contact: AdminMailContact = {
      id: existing?.id || `c-${nanoid(6)}`,
      name, email,
      company: fields[col("company")] || existing?.company,
      role: fields[col("role")] || existing?.role,
      phone: fields[col("phone")] || existing?.phone,
      source: (fields[col("source")] as AdminMailContact["source"]) || existing?.source || defaultSource || "manual",
      status: (fields[col("status")] as AdminMailContact["status"]) || existing?.status || defaultStatus || "new",
      tags: tags.length ? tags : existing?.tags || [],
      notes: fields[col("notes")] || existing?.notes,
      lastContactedAt: existing?.lastContactedAt || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      meta: {
        location: fields[col("location")] || existing?.meta?.location,
        interest: (fields[col("interest")] as AdminMailContact["meta"]["interest"]) || existing?.meta?.interest,
        budget: fields[col("budget")] || existing?.meta?.budget,
        timeline: fields[col("timeline")] || existing?.meta?.timeline,
      },
    };
    if (!dryRun) contacts.set(contact.id, contact);
    if (existing) updated++; else imported++;
  }
  res.json({
    message: `Imported ${imported} new, updated ${updated}, skipped ${skipped}`,
    imported, updated, skipped, errors, dryRun: !!dryRun,
  });
});

// ─── Purge data ─────────────────────────────────────────────────────────────
router.post("/purge", (req, res) => {
  const { folder, category, beforeDays, status, contactId, campaignId, all } = req.body as {
    folder?: AdminMailFolder;
    category?: AdminMailCategory;
    beforeDays?: number;
    status?: AdminMailMessage["status"];
    contactId?: string;
    campaignId?: string;
    all?: boolean;
  };

  if (!folder && !category && !beforeDays && !status && !contactId && !campaignId && !all) {
    res.status(400).json({ code: "VALIDATION", message: "At least one filter (folder/category/beforeDays/status/contactId/campaignId/all) is required", status: 400 });
    return;
  }

  const beforeTs = beforeDays ? Date.now() - beforeDays * 24 * 60 * 60_000 : null;
  let purged = 0;
  const purgedIds: string[] = [];

  for (const [id, m] of messages.entries()) {
    let match = true;
    if (!all) {
      if (folder && m.folder !== folder) match = false;
      if (category && m.category !== category) match = false;
      if (status && m.status !== status) match = false;
      if (beforeTs !== null && m.timestamp > beforeTs) match = false;
      if (contactId && m.contactId !== contactId) match = false;
      if (campaignId && m.campaignId !== campaignId) match = false;
    }
    if (match) {
      purgedIds.push(id);
    }
  }

  for (const id of purgedIds) {
    messages.delete(id);
    purged++;
  }

  res.json({
    message: `Purged ${purged} message${purged === 1 ? "" : "s"}`,
    purged,
    ids: purgedIds,
  });
});

// ─── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", (_req, res) => {
  restoreSnoozed();
  const msgs = Array.from(messages.values());
  const now = Date.now();
  const byCategory = {
    lead: 0, marketing: 0, support: 0, blast: 0, system: 0, general: 0, sales: 0, partnership: 0,
  } as Record<AdminMailCategory, number>;
  const byFolder = {
    inbox: 0, sent: 0, drafts: 0, spam: 0, trash: 0,
    leads: 0, marketing: 0, support: 0, blasts: 0, archive: 0, scheduled: 0,
  } as Record<AdminMailFolder, number>;
  let snoozedCount = 0;
  for (const m of msgs) {
    byCategory[m.category] = (byCategory[m.category] || 0) + 1;
    byFolder[m.folder] = (byFolder[m.folder] || 0) + 1;
    if (m.snoozedUntil && m.snoozedUntil > now) snoozedCount++;
  }

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);

  const emailsSentToday = msgs.filter(m => (m.folder === "sent" || m.folder === "blasts") && m.timestamp >= startOfToday.getTime()).length;
  const emailsSentThisWeek = msgs.filter(m => (m.folder === "sent" || m.folder === "blasts") && m.timestamp >= startOfWeek.getTime()).length;
  const activeCampaigns = Array.from(campaigns.values()).filter(c => c.status === "sending" || c.status === "scheduled" || c.status === "draft").length;

  const stats: AdminMailStats = {
    overview: {
      totalMessages: msgs.length,
      unreadCount: msgs.filter(m => m.status === "unread" && m.folder === "inbox").length,
      totalContacts: contacts.size,
      activeCampaigns,
      emailsSentToday,
      emailsSentThisWeek,
      averageResponseTime: "2h 14m",
      responseRate: 0.68,
    },
    byCategory, byFolder,
    snoozedCount,
    snippetsCount: snippets.size,
    draftsCount: drafts.size,
    recentActivity: buildActivity(),
  };
  res.json(stats);
});

export default router;
