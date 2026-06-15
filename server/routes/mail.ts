import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import type { MailMessage, MailFolder } from "../../shared/types";

const router = Router();

const mockBodies: Record<string, string> = {
  "m1": "Hi Team,\n\nPlease find attached the Q3 crude oil demand forecast from the International Energy Agency. Key highlights:\n\n• Global demand expected to reach 103.5 mb/d in Q3\n• Non-OPEC supply growth of 1.4 mb/d year-over-year\n• OECD commercial inventories 28 million barrels below 5-year average\n\nWe should adjust our WTI positions ahead of the next OPEC+ meeting scheduled for July 5th.\n\nBest regards,\nDr. Sarah Chen\nHead of Research, Aether Energy",
  "m2": "Dear Aether Energy Team,\n\nFollowing our discussion at the Singapore Energy Summit, I'm pleased to confirm our partnership for the Q3 cargo lifting program.\n\nWe are prepared to commit to 500,000 barrels of Brent crude per month under the following terms:\n\n• Pricing: Dated Brent minus $0.30/bbl\n• Delivery: CIF Rotterdam\n• Term: July - September 2026\n• Payment: LC at sight\n\nPlease review and revert with any changes.\n\nWarm regards,\nMarcus Williams\nVP Trading, Pinnacle Energy Pte Ltd",
  "m3": "ALERT: Your trade execution report for WTI Crude is ready.\n\nExecuted: Long 1,000 barrels WTI @ $78.43\nFilled: 14:32:17 UTC\nCounterparty: CME Globex\nFees: $28.50\nStatus: COMPLETE\n\nView full execution details in the Trade dashboard.",
  "m4": "The OPEC Monthly Oil Market Report for June 2026 is now available.\n\nWorld oil demand growth for 2026 remains unchanged at 2.2 mb/d, with non-OECD countries accounting for the majority of growth. Supply from non-OPEC producers is expected to increase by 1.1 mb/d.\n\nOPEC-10 crude oil production averaged 24.8 mb/d in May, down 0.3 mb/d from the previous month.",
  "m5": "This is an automated compliance check for your current positions.\n\nAll positions are within acceptable risk parameters. No position exceeds 10% of portfolio value. Stop-losses are active on all open trades.\n\nNext review: June 22, 2026\nStatus: ALL CLEAR",
  "m6": "U.S. commercial crude oil inventories (excluding those in the Strategic Petroleum Reserve) decreased by 3.7 million barrels from the previous week.\n\nAt 459.7 million barrels, U.S. crude oil inventories are about 4% below the five-year average for this time of year.\n\nTotal products supplied over the last four-week period averaged 20.3 million barrels per day, down by 1.2% from the same period last year.",
  "m7": "We maintain our bullish stance on crude oil for H2 2026, targeting $85/bbl for Brent and $80/bbl for WTI.\n\nKey catalysts:\n1. OPEC+ supply discipline\n2. Strong refining margins in Asia\n3. Inventories below 5-year average\n4. Potential for supply disruptions\n\nRisks: Demand slowdown in China, potential recession in Europe.",
  "m8": "Scheduled maintenance for the Aether Energy trading platform will occur on June 20, 2026, from 02:00 UTC to 06:00 UTC.\n\nDuring this period, the platform may be intermittently unavailable. All active positions will be protected. Automated stop-losses will remain active.\n\nWe apologize for any inconvenience.",
  "m9": "The latest COT report shows managed money net long positions in WTI crude oil increased by 8,432 contracts to 287,654.\n\nCommercial hedgers increased their net short positions by 6,234 contracts to 312,876. The net speculative length suggests continued bullish sentiment in the crude oil market.",
  "m10": "The Brent/Dubai EFS spread has narrowed to $1.42/bbl, the tightest since March 2026.\n\nThis narrowing is driven by strong Asian demand for crude oil, with Chinese refinery runs at 82% of capacity. The tighter EFS typically supports Dated Brent and widens the incentive for arbitrage flows eastward.",
};

const mockEmails: MailMessage[] = [
  { id: "m1", from: "Dr. Sarah Chen", email: "sarah.chen@aether-energy.ai", subject: "Q3 Crude Oil Demand Forecast — IEA Report", preview: "Please find attached the Q3 crude oil demand forecast from the International Energy Agency...", body: mockBodies["m1"], date: "09:42", timestamp: Date.now() - 600000, unread: true, starred: true, hasAttachments: true, category: "inbox", folder: "inbox" },
  { id: "m2", from: "Marcus Williams", email: "marcus@pinnacle.energy", subject: "RE: Cargo Lifting Program — Q3 Commitment", preview: "Following our discussion at the Singapore Energy Summit, I'm pleased to confirm...", body: mockBodies["m2"], date: "Yesterday", timestamp: Date.now() - 86400000, unread: true, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m3", from: "Trade Execution Desk", email: "executions@aether-energy.ai", subject: "Trade Confirmation #2847 — WTI Long", preview: "Your trade execution report for WTI Crude is ready. Executed: Long 1,000 barrels WTI @ $78.43...", body: mockBodies["m3"], date: "Yesterday", timestamp: Date.now() - 172800000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m4", from: "OPEC Secretariat", email: "secretariat@opec.org", subject: "Monthly Oil Market Report — June 2026", preview: "The OPEC Monthly Oil Market Report for June 2026 is now available. World oil demand growth...", body: mockBodies["m4"], date: "Mon", timestamp: Date.now() - 259200000, unread: true, starred: true, hasAttachments: true, category: "inbox", folder: "inbox" },
  { id: "m5", from: "Aether Compliance", email: "compliance@aether-energy.ai", subject: "Weekly Position Limit Review", preview: "This is an automated compliance check...", body: mockBodies["m5"], date: "Mon", timestamp: Date.now() - 345600000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m6", from: "EIA Weekly Report", email: "reports@eia.gov", subject: "Weekly Petroleum Status Report", preview: "U.S. crude oil inventories decreased by 3.7 million barrels...", body: mockBodies["m6"], date: "Sun", timestamp: Date.now() - 432000000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m7", from: "J.P. Morgan Research", email: "research@jpmorgan.com", subject: "Energy Markets Outlook — H2 2026", preview: "We maintain our bullish stance on crude oil for H2 2026...", body: mockBodies["m7"], date: "Sun", timestamp: Date.now() - 518400000, unread: true, starred: false, hasAttachments: true, category: "inbox", folder: "inbox" },
  { id: "m8", from: "Aether Energy Ops", email: "ops@aether-energy.ai", subject: "Server Maintenance Notice — June 20", preview: "Scheduled maintenance for the Aether Energy trading platform...", body: mockBodies["m8"], date: "Sat", timestamp: Date.now() - 604800000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m9", from: "CFTC", email: "notifications@cftc.gov", subject: "Weekly Commitments of Traders Report", preview: "The latest COT report shows managed money net long positions...", body: mockBodies["m9"], date: "Sat", timestamp: Date.now() - 691200000, unread: false, starred: false, hasAttachments: true, category: "inbox", folder: "inbox" },
  { id: "m10", from: "Platts Market Wire", email: "marketwire@spglobal.com", subject: "Brent/Dubai Spread Narrows on Asian Demand", preview: "The Brent/Dubai EFS spread has narrowed to $1.42/bbl...", body: mockBodies["m10"], date: "Fri", timestamp: Date.now() - 777600000, unread: true, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m11", from: "Aether Energy", email: "noreply@aether-energy.ai", subject: "Welcome to Aether Energy — Your Account is Ready", preview: "Welcome to Aether Energy...", body: "Welcome to Aether Energy, the next-generation AI-powered energy trading platform.\n\nYour account has been successfully created. You can now access all features including real-time market data, algorithmic trading, portfolio management, and AI-powered market intelligence.\n\nGet started by connecting your wallet and setting up your first trading strategy.", date: "Tue", timestamp: Date.now() - 1209600000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
  { id: "m12", from: "ICE Futures", email: "notifications@theice.com", subject: "Margin Update — Brent Crude Futures", preview: "ICE Clear Europe has revised initial margin requirements...", body: "ICE Clear Europe has revised initial margin requirements for Brent Crude futures contracts.\n\nNew margin rates effective June 15, 2026:\n• Initial Margin: $4,500 per contract (up from $4,200)\n• Maintenance Margin: $4,050 per contract\n\nThe change reflects increased volatility in the crude oil market.", date: "Mon", timestamp: Date.now() - 1814400000, unread: false, starred: false, hasAttachments: false, category: "inbox", folder: "inbox" },
];

const sentEmails: MailMessage[] = [
  { id: "s1", from: "You", email: "trader@aether-energy.ai", subject: "RE: Q3 Cargo Lifting Program", preview: "Dear Marcus, Thank you for the proposal...", body: "Dear Marcus,\n\nThank you for the proposal. We have reviewed the terms and would like to proceed with the agreement as outlined. Please send the final contract for signature.\n\nWe look forward to a successful partnership.\n\nBest regards,\nAether Energy Trading Desk", date: "09:15", timestamp: Date.now() - 900000, unread: false, starred: false, hasAttachments: false, category: "sent", folder: "sent" },
  { id: "s2", from: "You", email: "trader@aether-energy.ai", subject: "Position Sizing Request — WTI Options", preview: "Hi Team, I'd like to increase our WTI options position...", body: "Hi Team,\n\nI'd like to increase our WTI options position by 500 contracts for the July expiry. Current market conditions are favorable with volatility at elevated levels.\n\nRequested:\n• Instrument: WTI Call Options (Jul 26)\n• Strike: $80/bbl\n• Quantity: 500 contracts\n• Premium: ~$2.45/bbl\n\nPlease advise on approval.", date: "Yesterday", timestamp: Date.now() - 1800000, unread: false, starred: false, hasAttachments: false, category: "sent", folder: "sent" },
];

const allEmails = [...mockEmails, ...sentEmails];

const folders: MailFolder[] = [
  { id: "inbox", label: "Inbox", count: mockEmails.filter((m) => m.unread).length },
  { id: "sent", label: "Sent", count: 0 },
  { id: "drafts", label: "Drafts", count: 3 },
  { id: "spam", label: "Spam", count: 5 },
  { id: "trash", label: "Trash", count: 0 },
];

router.get("/folders", authMiddleware, (_req, res) => {
  res.json({ folders });
});

router.get("/list/:folder", authMiddleware, (req, res) => {
  const { folder } = req.params;
  const emails = folder === "sent" ? sentEmails : mockEmails;
  res.json({ emails: emails.map(({ body: _b, ...rest }) => rest) });
});

router.get("/:id", authMiddleware, (req, res) => {
  const email = allEmails.find((m) => m.id === req.params.id);
  if (!email) {
    res.status(404).json({ code: "NOT_FOUND", message: "Email not found", status: 404 });
    return;
  }
  res.json({ email });
});

router.put("/:id/read", authMiddleware, (req, res) => {
  const email = allEmails.find((m) => m.id === req.params.id);
  if (!email) {
    res.status(404).json({ code: "NOT_FOUND", message: "Email not found", status: 404 });
    return;
  }
  email.unread = false;
  res.json({ email });
});

router.post("/send", authMiddleware, (req, res) => {
  const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
  if (!to || !subject || !body) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing required fields", status: 400 });
    return;
  }
  res.json({ message: "Email sent successfully", id: `sent-${Date.now()}` });
});

export default router;
