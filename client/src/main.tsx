import { createRoot } from "react-dom/client";
import App from "./App";
import { initSentry } from "./lib/sentry";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

initSentry();

// Aggressive cache-bust for users on stale SW/HTML cache
// If the URL has ?_cb=N or we detect a stale bundle, force-clear everything
const STALE_BUNDLES = [
  "index-BES0djud", "index-nYnPn3Bh",  // the offending hashes from the bug report
];
const currentBundle = Array.from(document.scripts)
  .map((s) => s.src || "")
  .find((s) => s.includes("/assets/index-"));
const isStale = currentBundle && STALE_BUNDLES.some((h) => currentBundle.includes(h));

if (isStale) {
  // One-shot self-heal: clear everything, then load the new SW normally.
  // No reload here — the new SW will take over on next natural page nav.
  (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    // Hard-redirect to ensure a clean state
    window.location.replace(window.location.pathname + window.location.search);
  })();
} else {
  // Normal SW registration
  // Use a STABLE build ID, NOT Date.now() — changing the URL every load
  // creates a new SW registration each time, which triggers updatefound
  // and reload loops.
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      // Build-time hash would be ideal, but for now use a fixed version.
      // The SW's own VERSION constant controls when its cache busts.
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[sw] registration failed:", err.message);
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);