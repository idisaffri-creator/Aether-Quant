import * as Sentry from "@sentry/react";

/**
 * Sentry initialization (browser).
 * Disabled if VITE_SENTRY_DSN is not set.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
  });
}

export { Sentry };
