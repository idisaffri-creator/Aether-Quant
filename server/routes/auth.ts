import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, ne } from "drizzle-orm";
import { db, schema } from "../db";
import { generateToken, authMiddleware } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import type { AuthResponse, User, UserPreferences } from "../../shared/types";

const router = Router();

// Apply rate limiter to all auth endpoints
router.use(authLimiter);

// ─── Validators ─────────────────────────────────────────────────────────
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const emailSchema = z.string().email().max(120).toLowerCase();
const usernameSchema = z.string().min(3).max(20).regex(usernameRegex, "Username must be 3-20 chars (letters, numbers, underscore)");
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .refine((v) => /[A-Z]/.test(v), "Must contain an uppercase letter")
  .refine((v) => /[a-z]/.test(v), "Must contain a lowercase letter")
  .refine((v) => /[0-9]/.test(v), "Must contain a number");
const walletSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address").optional().nullable();

const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

const profileUpdateSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  walletAddress: walletSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

const preferencesSchema = z.object({
  notifications: z.object({
    tradeExecutions: z.boolean().optional(),
    priceAlerts: z.boolean().optional(),
    strategySignals: z.boolean().optional(),
    portfolioUpdates: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
  }).optional(),
  appearance: z.object({
    theme: z.enum(["dark", "light", "system"]).optional(),
    density: z.enum(["comfortable", "compact"]).optional(),
  }).optional(),
  privacy: z.object({
    showProfile: z.boolean().optional(),
    showActivity: z.boolean().optional(),
  }).optional(),
  onboardingCompleted: z.boolean().optional(),
  paperBalance: z.number().min(0).max(100_000_000).optional(),
  tradingMode: z.enum(["paper", "live"]).optional(),
});

const DEFAULT_PREFS: Required<UserPreferences> = {
  notifications: {
    tradeExecutions: true,
    priceAlerts: true,
    strategySignals: true,
    portfolioUpdates: false,
    emailDigest: false,
    pushNotifications: true,
  },
  appearance: { theme: "dark", density: "comfortable" },
  privacy: { showProfile: true, showActivity: true },
};

function mergePrefs(existing: UserPreferences | null | undefined): UserPreferences & { onboardingCompleted?: boolean; paperBalance?: number; tradingMode?: "paper" | "live" } {
  const ex = (existing as any) || {};
  return {
    notifications: { ...DEFAULT_PREFS.notifications, ...(ex.notifications || {}) },
    appearance: { ...DEFAULT_PREFS.appearance, ...(ex.appearance || {}) },
    privacy: { ...DEFAULT_PREFS.privacy, ...(ex.privacy || {}) },
    onboardingCompleted: ex.onboardingCompleted,
    paperBalance: ex.paperBalance,
    tradingMode: ex.tradingMode,
  };
}

function parseUserAgent(ua: string | undefined): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";
  let os = "Unknown";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua) && !/Android/.test(ua)) os = "Linux";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  const device = /Mobile|Android|iPhone|iPad/.test(ua) ? "Mobile" : "Desktop";
  return { browser, os, device };
}

// In-memory password-reset tokens (demo). In prod this lives in a `password_resets` table.
interface ResetToken {
  token: string;
  email: string;
  userId: string;
  expiresAt: number;
  used: boolean;
  createdAt: string;
}
const resetTokens = new Map<string, ResetToken>();
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [t, r] of Array.from(resetTokens.entries())) {
    if (r.used || r.expiresAt < now) resetTokens.delete(t);
  }
}

function isDemoUser(id: string, email: string): boolean {
  return id === "demo-user-id" || id === "admin-user-id" || email === "demo@aether-energy.ai" || email === "admin@aether-energy.ai";
}

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    const { email, username, password } = parsed.data;

    let existing: any[] = [];
    try {
      existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).execute();
    } catch {
      // DB may be offline in demo
    }

    if (existing.length > 0) {
      res.status(409).json({ code: "CONFLICT", message: "Email already registered", status: 409 });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = nanoid();
    const now = new Date();

    try {
      await db.insert(schema.users).values({
        id,
        email,
        username,
        passwordHash,
        tier: "free",
        status: "active",
        emailVerified: "false",
        preferences: DEFAULT_PREFS,
        createdAt: now,
        updatedAt: now,
      });
    } catch (dbErr) {
      console.warn("DB insert failed, continuing in demo mode:", (dbErr as Error).message);
    }

    const token = generateToken({ userId: id, email });
    const user: User = { id, email, username, tier: "free", role: "user", status: "active", emailVerified: false, preferences: DEFAULT_PREFS, createdAt: now.toISOString() };

    const response: AuthResponse = { token, user };
    res.status(201).json(response);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Registration failed", status: 500 });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ code: "VALIDATION", message: "email and password required", status: 400 });
      return;
    }

    // ─── DEMO MODE BYPASS ─────────────────────────────────────────────
    if (email === "demo@aether-energy.ai" && password === "demo123") {
      const demoId = "demo-user-id";
      const token = generateToken({ userId: demoId, email, role: "user", twoFactorEnabled: false });
      const response: AuthResponse = {
        token,
        user: {
          id: demoId,
          email,
          username: "AetherDemo",
          tier: "enterprise",
          role: "user",
          status: "active",
          emailVerified: true,
          preferences: DEFAULT_PREFS,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
      res.json(response);
      return;
    }
    if (email === "admin@aether-energy.ai" && password === "admin123") {
      const adminId = "admin-user-id";
      const token = generateToken({ userId: adminId, email, role: "admin", twoFactorEnabled: false });
      const response: AuthResponse = {
        token,
        user: {
          id: adminId,
          email,
          username: "AetherAdmin",
          tier: "admin",
          role: "admin",
          status: "active",
          emailVerified: true,
          preferences: DEFAULT_PREFS,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
      res.json(response);
      return;
    }
    // ──────────────────────────────────────────────────────────────────

    let results: any[] = [];
    try {
      results = await db.select().from(schema.users).where(eq(schema.users.email, email)).execute();
    } catch (dbError) {
      console.error("Database connection failed during login:", dbError);
      res.status(500).json({ code: "DATABASE_UNAVAILABLE", message: "Authentication service currently unavailable", status: 500 });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid credentials", status: 401 });
      return;
    }

    const user = results[0];
    if (user.status === "suspended") {
      res.status(403).json({ code: "SUSPENDED", message: "Account suspended. Contact support.", status: 403 });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid credentials", status: 401 });
      return;
    }

    const now = new Date();
    try {
      await db.update(schema.users).set({ lastLoginAt: now, updatedAt: now }).where(eq(schema.users.id, user.id)).execute();
    } catch { /* ignore */ }

    const token = generateToken({ userId: user.id, email: user.email });
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress || undefined,
        tier: (user.tier as User["tier"]) || "free",
        role: (user.tier === "admin" ? "admin" : "user") as User["role"],
        status: (user.status as User["status"]) || "active",
        emailVerified: user.emailVerified === "true",
        preferences: mergePrefs(user.preferences as UserPreferences | null),
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: now.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Login failed", status: 500 });
  }
});

// ─── Password reset (self-service) ──────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  cleanupExpiredTokens();
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ code: "VALIDATION", message: "email required", status: 400 });
    return;
  }

  // We always return 200 to avoid leaking whether an email is registered
  // — but in dev/demo we also return the token so the UI can use it.
  let devToken: string | null = null;
  let userId: string | null = null;
  try {
    const found = await db.select().from(schema.users).where(eq(schema.users.email, email)).execute();
    if (found.length > 0) {
      userId = found[0].id;
    }
  } catch {
    // DB may be offline in demo
  }

  // For demo without DB, accept demo + admin emails
  if (!userId) {
    if (email === "demo@aether-energy.ai") userId = "demo-user-id";
    else if (email === "admin@aether-energy.ai") userId = "admin-user-id";
  }

  if (userId) {
    const token = nanoid(32);
    const now = Date.now();
    resetTokens.set(token, {
      token, email, userId,
      expiresAt: now + RESET_TOKEN_TTL_MS,
      used: false,
      createdAt: new Date(now).toISOString(),
    });
    devToken = token;
    console.log(`[auth] Password reset requested for ${email}. Token: ${token}`);
  }

  res.json({
    message: "If an account exists for this email, a reset link has been sent.",
    // In production this would only be sent via email. For dev/demo we return it.
    devToken,
    resetUrl: devToken ? `/reset-password?token=${devToken}` : null,
  });
});

router.post("/reset-password", async (req, res) => {
  cleanupExpiredTokens();
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) {
    res.status(400).json({ code: "VALIDATION", message: "token and newPassword required", status: 400 });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ code: "VALIDATION", message: "Password must be at least 8 characters", status: 400 });
    return;
  }
  const record = resetTokens.get(token);
  if (!record) {
    res.status(400).json({ code: "INVALID_TOKEN", message: "Reset token is invalid or expired", status: 400 });
    return;
  }
  if (record.used) {
    res.status(400).json({ code: "TOKEN_USED", message: "Reset token has already been used", status: 400 });
    return;
  }
  if (record.expiresAt < Date.now()) {
    resetTokens.delete(token);
    res.status(400).json({ code: "TOKEN_EXPIRED", message: "Reset token has expired", status: 400 });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Mirror to DB if available
  let dbUpdated = false;
  try {
    await db.update(schema.users).set({ passwordHash, updatedAt: new Date() }).where(eq(schema.users.id, record.userId)).execute();
    dbUpdated = true;
  } catch {
    // ignore in demo
  }

  record.used = true;
  resetTokens.set(token, record);

  res.json({
    message: "Password has been reset successfully",
    userId: record.userId,
    email: record.email,
    dbUpdated,
  });
});

// Validate a reset token (used by the front-end to show the form)
router.get("/reset-password/validate", (req, res) => {
  cleanupExpiredTokens();
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).json({ code: "VALIDATION", message: "token required", status: 400 });
    return;
  }
  const record = resetTokens.get(token);
  if (!record) {
    res.status(400).json({ valid: false, code: "INVALID_TOKEN", message: "Reset token is invalid or expired" });
    return;
  }
  if (record.used) {
    res.status(400).json({ valid: false, code: "TOKEN_USED", message: "Reset token has already been used" });
    return;
  }
  if (record.expiresAt < Date.now()) {
    resetTokens.delete(token);
    res.status(400).json({ valid: false, code: "TOKEN_EXPIRED", message: "Reset token has expired" });
    return;
  }
  res.json({
    valid: true,
    email: record.email,
    expiresAt: new Date(record.expiresAt).toISOString(),
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // ─── DEMO MODE BYPASS ─────────────────────────────────────────────
    if (userId === "demo-user-id") {
      res.json({
        id: "demo-user-id",
        email: "demo@aether-energy.ai",
        username: "AetherDemo",
        tier: "enterprise",
        role: "user",
        status: "active",
        emailVerified: true,
        preferences: DEFAULT_PREFS,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      });
      return;
    }
    if (userId === "admin-user-id") {
      res.json({
        id: "admin-user-id",
        email: "admin@aether-energy.ai",
        username: "AetherAdmin",
        tier: "admin",
        role: "admin",
        status: "active",
        emailVerified: true,
        preferences: DEFAULT_PREFS,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      });
      return;
    }
    // ──────────────────────────────────────────────────────────────────

    let results: any[] = [];
    try {
      results = await db.select().from(schema.users).where(
        eq(schema.users.id, userId)
      ).execute();
    } catch (dbError) {
      console.error("Database connection failed during /me check:", dbError);
      res.status(500).json({ code: "DATABASE_UNAVAILABLE", message: "Service temporarily unavailable", status: 500 });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }

    const user = results[0];
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      walletAddress: user.walletAddress || undefined,
      tier: user.tier,
      role: user.tier === "admin" ? "admin" : "user",
      status: user.status || "active",
      emailVerified: user.emailVerified === "true",
      preferences: mergePrefs(user.preferences as UserPreferences | null),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : undefined,
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Failed to get user", status: 500 });
  }
});

// ─── Profile update (self-service) ──────────────────────────────────────
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    const { email, username, walletAddress } = parsed.data;

    // Demo users are read-only
    if (isDemoUser(userId, req.user!.email)) {
      res.json({ message: "Demo profile is read-only", user: null });
      return;
    }

    // Check uniqueness conflicts before writing
    try {
      if (email && email !== req.user!.email) {
        const dupes = await db.select().from(schema.users).where(and(eq(schema.users.email, email), ne(schema.users.id, userId))).execute();
        if (dupes.length > 0) {
          res.status(409).json({ code: "CONFLICT", message: "Email already in use", status: 409 });
          return;
        }
      }
      if (username) {
        const dupes = await db.select().from(schema.users).where(and(eq(schema.users.username, username), ne(schema.users.id, userId))).execute();
        if (dupes.length > 0) {
          res.status(409).json({ code: "CONFLICT", message: "Username already taken", status: 409 });
          return;
        }
      }
    } catch {
      res.status(500).json({ code: "DATABASE_UNAVAILABLE", message: "Profile update temporarily unavailable", status: 500 });
      return;
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (email !== undefined) patch.email = email;
    if (username !== undefined) patch.username = username;
    if (walletAddress !== undefined) patch.walletAddress = walletAddress;

    try {
      await db.update(schema.users).set(patch).where(eq(schema.users.id, userId)).execute();
    } catch (err) {
      console.error("Profile update DB error:", err);
      res.status(500).json({ code: "DATABASE_UNAVAILABLE", message: "Profile update failed", status: 500 });
      return;
    }

    const results = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    const user = results[0];
    const updatedUser: User = {
      id: user.id,
      email: user.email,
      username: user.username,
      walletAddress: user.walletAddress || undefined,
      tier: user.tier as User["tier"],
      role: user.tier === "admin" ? "admin" : "user",
      status: (user.status as User["status"]) || "active",
      emailVerified: user.emailVerified === "true",
      preferences: mergePrefs(user.preferences as UserPreferences | null),
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : undefined,
    };

    // Re-issue token if email changed so future logins / other sessions match
    const newToken = email ? generateToken({ userId: user.id, email: user.email }) : null;
    res.json({ message: "Profile updated", user: updatedUser, token: newToken });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Profile update failed", status: 500 });
  }
});

// ─── Change password (self-service, requires current password) ──────────
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    const { currentPassword, newPassword } = parsed.data;

    if (isDemoUser(userId, req.user!.email)) {
      res.json({ message: "Demo accounts cannot change password" });
      return;
    }

    let results: any[] = [];
    try {
      results = await db.select().from(schema.users).where(eq(schema.users.id, userId)).execute();
    } catch {
      res.status(500).json({ code: "DATABASE_UNAVAILABLE", message: "Service unavailable", status: 500 });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    const user = results[0];
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ code: "WRONG_PASSWORD", message: "Current password is incorrect", status: 401 });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    try {
      await db.update(schema.users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();
    } catch (err) {
      console.error("Change-password DB error:", err);
      res.status(500).json({ code: "INTERNAL", message: "Could not update password", status: 500 });
      return;
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change-password error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Password change failed", status: 500 });
  }
});

// ─── User preferences (notification toggles, appearance, privacy) ──────
router.get("/preferences", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    if (isDemoUser(userId, req.user!.email)) {
      res.json({ preferences: DEFAULT_PREFS });
      return;
    }
    const results = await db.select({ preferences: schema.users.preferences }).from(schema.users).where(eq(schema.users.id, userId)).execute();
    if (results.length === 0) {
      res.status(404).json({ code: "NOT_FOUND", message: "User not found", status: 404 });
      return;
    }
    res.json({ preferences: mergePrefs(results[0].preferences as UserPreferences | null) });
  } catch (error) {
    console.error("Get prefs error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Failed to load preferences", status: 500 });
  }
});

router.put("/preferences", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION", message: parsed.error.issues[0]?.message || "Invalid input", status: 400 });
      return;
    }
    if (isDemoUser(userId, req.user!.email)) {
      res.json({ preferences: mergePrefs(parsed.data) });
      return;
    }

    // Merge with existing (so partial updates don't wipe fields)
    const existing = await db.select({ preferences: schema.users.preferences }).from(schema.users).where(eq(schema.users.id, userId)).execute();
    const base = mergePrefs(existing[0]?.preferences as UserPreferences | null);
    const merged: UserPreferences & { onboardingCompleted?: boolean; paperBalance?: number; tradingMode?: "paper" | "live" } = {
      notifications: { ...base.notifications, ...(parsed.data.notifications || {}) },
      appearance: { ...base.appearance, ...(parsed.data.appearance || {}) },
      privacy: { ...base.privacy, ...(parsed.data.privacy || {}) },
    };
    if (parsed.data.onboardingCompleted !== undefined) merged.onboardingCompleted = parsed.data.onboardingCompleted;
    if (parsed.data.paperBalance !== undefined) merged.paperBalance = parsed.data.paperBalance;
    if (parsed.data.tradingMode !== undefined) merged.tradingMode = parsed.data.tradingMode;
    await db.update(schema.users).set({ preferences: merged, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();
    res.json({ preferences: merged });
  } catch (error) {
    console.error("Save prefs error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Failed to save preferences", status: 500 });
  }
});

/**
 * POST /api/auth/onboarding/complete
 * Mark onboarding as complete in user preferences.
 */
router.post("/onboarding/complete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    if (isDemoUser(userId, req.user!.email)) {
      res.json({ preferences: { ...mergePrefs(null), onboardingCompleted: true } });
      return;
    }
    const existing = await db.select({ preferences: schema.users.preferences }).from(schema.users).where(eq(schema.users.id, userId)).execute();
    const base: any = mergePrefs(existing[0]?.preferences as UserPreferences | null);
    base.onboardingCompleted = true;
    await db.update(schema.users).set({ preferences: base, updatedAt: new Date() }).where(eq(schema.users.id, userId)).execute();
    res.json({ preferences: base });
  } catch (err) {
    res.status(500).json({ code: "INTERNAL", message: "Failed to complete onboarding" });
  }
});

// ─── Current session info (for "Active sessions" card) ──────────────────
router.get("/session", authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let issuedAt = 0;
  let expiresAt = 0;
  try {
    const decoded = jwt.decode(token) as { iat?: number; exp?: number } | null;
    if (decoded) {
      issuedAt = (decoded.iat || 0) * 1000;
      expiresAt = (decoded.exp || 0) * 1000;
    }
  } catch { /* ignore */ }

  const ua = parseUserAgent(req.headers["user-agent"]);
  res.json({
    sessionId: token ? token.slice(-12) : null,
    userId: req.user!.userId,
    email: req.user!.email,
    issuedAt: issuedAt ? new Date(issuedAt).toISOString() : null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    remainingMs: Math.max(0, expiresAt - Date.now()),
    ip: req.ip || req.socket?.remoteAddress || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    ...ua,
  });
});

export default router;
