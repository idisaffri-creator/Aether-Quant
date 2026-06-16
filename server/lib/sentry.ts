import * as Sentry from "@sentry/node";
import { logger } from "./logger";

/**
 * Sentry initialization (server side).
 * Disabled if SENTRY_DSN is not set.
 *
 * - Errors: 100% sampled
 * - Performance: SENTRY_TRACES_SAMPLE_RATE (default 10%)
 * - Profiling: SENTRY_PROFILES_SAMPLE_RATE (default 10%)
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry disabled (SENTRY_DSN not set)");
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.GIT_COMMIT || "unknown",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || "0.1"),
    // Don't send PII by default
    sendDefaultPii: false,
    // Scrub sensitive data
    beforeSend(event) {
      if (event.request?.cookies) event.request.cookies = "[REDACTED]";
      if (event.user) {
        delete (event.user as any).email;
        delete (event.user as any).ip_address;
      }
      return event;
    },
  });
  logger.info("Sentry initialized");
}

export { Sentry };
