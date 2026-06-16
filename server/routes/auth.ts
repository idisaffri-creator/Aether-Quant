import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { generateToken, authMiddleware } from "../middleware/auth";
import type { AuthResponse, User } from "../../shared/types";

const router = Router();

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
  for (const [t, r] of resetTokens.entries()) {
    if (r.used || r.expiresAt < now) resetTokens.delete(t);
  }
}

router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ code: "VALIDATION", message: "email, username, and password required", status: 400 });
      return;
    }

    const existing = await db.select().from(schema.users).where(
      eq(schema.users.email, email)
    ).execute();

    if (existing.length > 0) {
      res.status(409).json({ code: "CONFLICT", message: "Email already registered", status: 409 });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = nanoid();
    const now = new Date();

    await db.insert(schema.users).values({
      id,
      email,
      username,
      passwordHash,
      tier: "free",
      createdAt: now,
      updatedAt: now,
    });

    const token = generateToken({ userId: id, email });
    const user: User = { id, email, username, tier: "free", role: "user", createdAt: now.toISOString() };

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
      const token = generateToken({ userId: demoId, email });
      const response: AuthResponse = {
        token,
        user: {
          id: demoId,
          email,
          username: "AetherDemo",
          tier: "enterprise",
          role: "user",
          createdAt: new Date().toISOString(),
        },
      };
      res.json(response);
      return;
    }
    if (email === "admin@aether-energy.ai" && password === "admin123") {
      const adminId = "admin-user-id";
      const token = generateToken({ userId: adminId, email });
      const response: AuthResponse = {
        token,
        user: {
          id: adminId,
          email,
          username: "AetherAdmin",
          tier: "admin",
          role: "admin",
          createdAt: new Date().toISOString(),
        },
      };
      res.json(response);
      return;
    }
    // ──────────────────────────────────────────────────────────────────

    let results = [];
    try {
      results = await db.select().from(schema.users).where(
        eq(schema.users.email, email)
      ).execute();
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
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid credentials", status: 401 });
      return;
    }

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
        createdAt: user.createdAt.toISOString(),
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
      });
      return;
    }
    // ──────────────────────────────────────────────────────────────────

    let results = [];
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
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Failed to get user", status: 500 });
  }
});

export default router;
