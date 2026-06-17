import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { requireAdmin } from "../middleware/adminAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin2FA } from "../middleware/requireAdmin2FA.js";
import { generateToken } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireAdmin, requireAdmin2FA);

interface ManagedUser {
  id: string;
  email: string;
  username: string;
  tier: "free" | "professional" | "enterprise" | "admin";
  role: "user" | "admin";
  status: "active" | "suspended" | "pending";
  walletAddress?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  emailVerified: boolean;
  resetTokens: { token: string; expiresAt: number; createdAt: string }[];
}

// In-memory user pool (mirrors DB-ish). For the demo we keep it warm so the
// admin user-management UI has something to show even when Postgres is offline.
const managedUsers = new Map<string, ManagedUser>();

function seedUsers() {
  const now = new Date().toISOString();
  const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

  const seedData: ManagedUser[] = [
    { id: "admin-user-id", email: "admin@aether-energy.ai", username: "AetherAdmin", tier: "admin", role: "admin", status: "active", createdAt: ago(60 * 24 * 365), lastLoginAt: ago(45), emailVerified: true, resetTokens: [] },
    { id: "demo-user-id", email: "demo@aether-energy.ai", username: "AetherDemo", tier: "enterprise", role: "user", status: "active", createdAt: ago(60 * 24 * 90), lastLoginAt: ago(15), emailVerified: true, resetTokens: [] },
    { id: "u-james", email: "james.whitfield@vantagecommodities.com", username: "jwhitfield", tier: "enterprise", role: "user", status: "active", createdAt: ago(60 * 24 * 7), lastLoginAt: ago(60 * 2), emailVerified: true, resetTokens: [] },
    { id: "u-priya", email: "priya.r@hedgeworks.io", username: "pramaswamy", tier: "professional", role: "user", status: "active", createdAt: ago(60 * 24 * 5), lastLoginAt: ago(60 * 6), emailVerified: true, resetTokens: [] },
    { id: "u-yuki", email: "y.tanaka@sakura-energy.jp", username: "ytanaka", tier: "enterprise", role: "user", status: "active", createdAt: ago(60 * 24 * 14), lastLoginAt: ago(60 * 24), emailVerified: true, resetTokens: [] },
    { id: "u-marcus", email: "marcus@pinnacle.energy", username: "mwilliams", tier: "enterprise", role: "user", status: "active", createdAt: ago(60 * 24 * 90), lastLoginAt: ago(60 * 12), emailVerified: true, resetTokens: [] },
    { id: "u-emily", email: "emily.carter@nextgen-cap.com", username: "ecarter", tier: "enterprise", role: "user", status: "pending", createdAt: ago(60 * 24 * 2), lastLoginAt: null, emailVerified: false, resetTokens: [] },
    { id: "u-olu", email: "olu.adeyemi@lagoscommodities.ng", username: "oadeyemi", tier: "free", role: "user", status: "active", createdAt: ago(60 * 4), lastLoginAt: null, emailVerified: false, resetTokens: [] },
    { id: "u-anna", email: "anna.koehler@blackforest-cap.de", username: "akoehler", tier: "professional", role: "user", status: "suspended", createdAt: ago(60 * 24 * 21), lastLoginAt: ago(60 * 24 * 14), emailVerified: true, resetTokens: [] },
    { id: "u-tomas", email: "t.reyes@andes-energy.cl", username: "treyes", tier: "free", role: "user", status: "pending", createdAt: ago(60 * 8), lastLoginAt: null, emailVerified: false, resetTokens: [] },
    { id: "u-lina", email: "l.petrov@transcaspian-trading.az", username: "lpetrov", tier: "professional", role: "user", status: "active", createdAt: ago(60 * 24 * 30), lastLoginAt: ago(60 * 24 * 3), emailVerified: true, resetTokens: [] },
  ];
  seedData.forEach(u => managedUsers.set(u.id, u));
}

seedUsers();

// In-memory password store (for demo). In prod this lives only in the users table.
const passwordStore = new Map<string, string>(); // userId -> bcrypt hash
passwordStore.set("admin-user-id", bcrypt.hashSync("admin123", 10));
passwordStore.set("demo-user-id", bcrypt.hashSync("demo123", 10));

// List users
router.get("/users", (req, res) => {
  const search = (req.query.search as string | undefined)?.toLowerCase();
  const tier = req.query.tier as ManagedUser["tier"] | undefined;
  const status = req.query.status as ManagedUser["status"] | undefined;
  const role = req.query.role as ManagedUser["role"] | undefined;

  let list = Array.from(managedUsers.values());
  if (search) {
    list = list.filter(u =>
      u.email.toLowerCase().includes(search) ||
      u.username.toLowerCase().includes(search) ||
      u.id.toLowerCase().includes(search)
    );
  }
  if (tier) list = list.filter(u => u.tier === tier);
  if (status) list = list.filter(u => u.status === status);
  if (role) list = list.filter(u => u.role === role);

  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // strip reset tokens from public response
  const safe = list.map(({ resetTokens, ...rest }) => rest);
  res.json({ users: safe, total: safe.length });
});

// Get single user
router.get("/users/:id", (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  const { resetTokens, ...safe } = u;
  res.json({ user: safe });
});

// Add new user / create email
router.post("/users", async (req, res) => {
  const { email, username, password, tier, role } = req.body as {
    email: string; username: string; password: string;
    tier?: ManagedUser["tier"]; role?: ManagedUser["role"];
  };
  if (!email || !username || !password) {
    res.status(400).json({ code: "VALIDATION", message: "email, username, password required", status: 400 });
    return;
  }
  // Dedup
  for (const u of managedUsers.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      res.status(409).json({ code: "CONFLICT", message: "Email already in use", status: 409, existingId: u.id });
      return;
    }
  }
  const id = `u-${nanoid(8)}`;
  const now = new Date().toISOString();
  const u: ManagedUser = {
    id, email, username,
    tier: tier || "free",
    role: role || "user",
    status: "active",
    createdAt: now, lastLoginAt: null,
    emailVerified: false, resetTokens: [],
  };
  managedUsers.set(id, u);
  passwordStore.set(id, await bcrypt.hash(password, 12));

  // Mirror to DB if available
  try {
    await db.insert(schema.users).values({
      id, email, username,
      passwordHash: passwordStore.get(id) || "",
      tier: u.tier,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).execute();
  } catch (e) {
    // ignore DB errors in demo
  }

  const { resetTokens, ...safe } = u;
  res.status(201).json({ user: safe, temporaryPassword: password });
});

// Update user
router.put("/users/:id", async (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  const { username, tier, role, status, email, walletAddress } = req.body as Partial<ManagedUser>;
  if (username) u.username = username;
  if (tier) u.tier = tier;
  if (role) u.role = role;
  if (status) u.status = status;
  if (email) u.email = email;
  if (walletAddress !== undefined) u.walletAddress = walletAddress;
  managedUsers.set(u.id, u);
  const { resetTokens, ...safe } = u;
  res.json({ user: safe });
});

// Admin reset a user's password
router.post("/users/:id/reset-password", async (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  const { newPassword, generateTemp } = req.body as { newPassword?: string; generateTemp?: boolean };
  let pw = newPassword;
  if (!pw || generateTemp) {
    pw = nanoid(12);
  }
  if (pw.length < 8) {
    res.status(400).json({ code: "VALIDATION", message: "Password must be at least 8 characters", status: 400 });
    return;
  }
  passwordStore.set(u.id, await bcrypt.hash(pw, 12));
  // mirror to DB
  try {
    await db.update(schema.users).set({ passwordHash: passwordStore.get(u.id) || "", updatedAt: new Date() }).where(eq(schema.users.id, u.id)).execute();
  } catch (e) { /* ignore */ }
  res.json({
    message: "Password reset successfully",
    userId: u.id,
    email: u.email,
    temporaryPassword: pw,
    generatedTemp: !!generateTemp || !newPassword,
  });
});

// Suspend / reactivate a user
router.post("/users/:id/suspend", (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  u.status = "suspended";
  managedUsers.set(u.id, u);
  res.json({ message: "User suspended", user: u });
});

router.post("/users/:id/activate", (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  u.status = "active";
  managedUsers.set(u.id, u);
  res.json({ message: "User activated", user: u });
});

// Delete user
router.delete("/users/:id", (req, res) => {
  const u = managedUsers.get(req.params.id);
  if (!u) {
    res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
    return;
  }
  if (u.id === "admin-user-id") {
    res.status(403).json({ code: "FORBIDDEN", message: "Cannot delete primary admin account", status: 403 });
    return;
  }
  managedUsers.delete(req.params.id);
  passwordStore.delete(req.params.id);
  res.json({ message: "User deleted", id: req.params.id });
});

// Stats
router.get("/stats", (_req, res) => {
  const users = Array.from(managedUsers.values());
  res.json({
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    suspended: users.filter(u => u.status === "suspended").length,
    pending: users.filter(u => u.status === "pending").length,
    admins: users.filter(u => u.role === "admin").length,
    byTier: {
      free: users.filter(u => u.tier === "free").length,
      professional: users.filter(u => u.tier === "professional").length,
      enterprise: users.filter(u => u.tier === "enterprise").length,
      admin: users.filter(u => u.tier === "admin").length,
    },
  });
});

export default router;
