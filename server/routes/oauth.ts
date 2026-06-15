import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { generateToken } from "../middleware/auth";

const router = Router();

const CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || "http://localhost:3000/api/auth/callback";

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: `${CALLBACK_URL}/google`,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          const existing = await db.select().from(schema.users).where(
            eq(schema.users.email, email)
          ).execute();

          if (existing.length > 0) {
            return done(null, { userId: existing[0].id, email: existing[0].email });
          }

          const id = nanoid();
          await db.insert(schema.users).values({
            id,
            email,
            username: profile.displayName || email.split("@")[0],
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          done(null, { userId: id, email });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

if (process.env.GITHUB_CLIENT_ID) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        callbackURL: `${CALLBACK_URL}/github`,
        scope: ["user:email"],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email = (profile.emails?.[0]?.value) || `${profile.username}@github.oauth`;
          const existing = await db.select().from(schema.users).where(
            eq(schema.users.email, email)
          ).execute();

          if (existing.length > 0) {
            return done(null, { userId: existing[0].id, email: existing[0].email });
          }

          const id = nanoid();
          await db.insert(schema.users).values({
            id,
            email,
            username: profile.displayName || profile.username || email.split("@")[0],
            passwordHash: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          done(null, { userId: id, email });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));

router.use(passport.initialize());

if (process.env.GOOGLE_CLIENT_ID) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
  router.get("/callback/google", passport.authenticate("google", { session: false }), (req, res) => {
    const user = req.user as { userId: string; email: string };
    const token = generateToken({ userId: user.userId, email: user.email });
    res.redirect(`/dashboard?token=${token}`);
  });
}

if (process.env.GITHUB_CLIENT_ID) {
  router.get("/github", passport.authenticate("github", { scope: ["user:email"], session: false }));
  router.get("/callback/github", passport.authenticate("github", { session: false }), (req, res) => {
    const user = req.user as { userId: string; email: string };
    const token = generateToken({ userId: user.userId, email: user.email });
    res.redirect(`/dashboard?token=${token}`);
  });
}

export default router;
