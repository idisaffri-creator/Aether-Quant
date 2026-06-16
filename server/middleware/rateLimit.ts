import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000");
const max = parseInt(process.env.RATE_LIMIT_MAX || "100");

export const generalLimiter = rateLimit({
  windowMs,
  max,
  message: { code: "RATE_LIMITED", message: "Too many requests, please try again later", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: "RATE_LIMITED", message: "Too many auth attempts, please try again later", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { code: "RATE_LIMITED", message: "API rate limit exceeded", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bulk operations are heavier — cap at 10 per minute to prevent abuse
export const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `bulk:${req.user?.userId || ipKeyGenerator(req)}`,
  message: { code: "RATE_LIMITED", message: "Too many bulk operations, please wait a moment", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

// Send / import endpoints are heavier too
export const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => `send:${req.user?.userId || ipKeyGenerator(req)}`,
  message: { code: "RATE_LIMITED", message: "Too many send/import operations, please wait", status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});
