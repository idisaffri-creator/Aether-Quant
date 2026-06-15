import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { generateToken, authMiddleware } from "../middleware/auth";
import type { AuthResponse, User } from "../../shared/types";

const router = Router();

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
    const user: User = { id, email, username, tier: "free", createdAt: now.toISOString() };

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

    const results = await db.select().from(schema.users).where(
      eq(schema.users.email, email)
    ).execute();

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
        tier: user.tier as User["tier"],
        createdAt: user.createdAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Login failed", status: 500 });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const results = await db.select().from(schema.users).where(
      eq(schema.users.id, req.user!.userId)
    ).execute();

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
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ code: "INTERNAL", message: "Failed to get user", status: 500 });
  }
});

export default router;
