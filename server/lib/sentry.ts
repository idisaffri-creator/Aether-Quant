import * as Sentry from "@sentry/node";
import { logger } from "./logger";

let initialized = false;

/**
 * Sentry initialization (server side).
 * Disabled if SENTRY_DSN is not set.
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
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.cookies) event.request.cookies = "[REDACTED]";
      if (event.user) {
        delete (event.user as any).email;
        delete (event.user as any).ip_address;
      }
      return event;
    },
  });
  initialized = true;
  logger.info("Sentry initialized");
}

export function sentryRequestHandler() {
  if (!initialized) return (_req: any, _res: any, next: any) => next();
  return Sentry.Handlers.requestHandler();
}

export function sentryTracingHandler() {
  if (!initialized) return (_req: any, _res: any, next: any) => next();
  return Sentry.Handlers.tracingHandler();
}

export function sentryErrorHandler() {
  if (!initialized) return (err: any, _req: any, _res: any, next: any) => next(err);
  return Sentry.Handlers.errorHandler();
}

export async function sentryClose(timeout = 2000) {
  if (!initialized) return;
  await Sentry.close(timeout);
}

