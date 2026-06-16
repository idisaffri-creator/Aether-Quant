import pino from "pino";
import { randomUUID } from "crypto";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  base: {
    service: "aether-energy",
    env: process.env.NODE_ENV || "development",
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.secret",
      "*.newPassword",
      "*.currentPassword",
      "*.wallet.privateKey",
    ],
    censor: "[REDACTED]",
  },
  // Use pretty transport in dev
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
      },
});

export function newRequestId(): string {
  return randomUUID();
}
