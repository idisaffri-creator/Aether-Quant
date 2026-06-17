/**
 * Sentry initialization (browser).
 * Disabled if VITE_SENTRY_DSN is not set.
 * Enhanced with session replay, user context, and error filtering.
 */
import * as Sentry from "@sentry/react";

declare global {
  interface Window {
    Sentry?: typeof Sentry;
  }
}

let initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip cookies/tokens before sending
      if (event.request?.cookies) event.request.cookies = "[REDACTED]";
      if (event.user) {
        delete (event.user as any).email;
        delete (event.user as any).ip_address;
      }
      // Drop 4xx noise
      if (event.exception?.values?.[0]?.value?.includes("401")) return null;
      if (event.exception?.values?.[0]?.value?.includes("403")) return null;
      return event;
    },
  });
  initialized = true;
  // Expose for ErrorBoundary
  if (typeof window !== "undefined") {
    (window as any).Sentry = Sentry;
  }
}

export function identifySentryUser(user: { id: string; email?: string; tier?: string } | null): void {
  if (!initialized) return;
  if (user) {
    Sentry.setUser({
      id: user.id,
      // email intentionally omitted (PII)
      tier: user.tier,
    });
  } else {
    Sentry.setUser(null);
  }
}

export function captureException(err: Error, context?: Record<string, any>): void {
  if (!initialized) {
    console.error("[uncaught]", err, context);
    return;
  }
  Sentry.captureException(err, { extra: context });
}

export function captureMessage(msg: string, level: "info" | "warning" | "error" = "info"): void {
  if (!initialized) return;
  Sentry.captureMessage(msg, level);
}

export { Sentry };