import { createRoot } from "react-dom/client";
import App from "./App";
import { initSentry } from "./lib/sentry";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

initSentry();

// Aggressive cache-bust for users on stale SW/HTML cache
// If the URL has ?_cb=N or we detect a stale bundle, force-clear everything
const STALE_BUNDLES = [
  "index-BES0djud", "index-nYnPn3Bh",  // the offending hashes from the report
];
const currentBundle = Array.from(document.scripts)
  .map((s) => s.src || "")
  .find((s) => s.includes("/assets/index-"));
const isStale = currentBundle && STALE_BUNDLES.some((h) => currentBundle.includes(h));

if (isStale) {
  // Force-clear service worker + all caches, then reload fresh
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
    window.location.reload();
  })();
} else {
  // Normal SW registration (with cache buster)
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`).then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        reg.addEventListener("updatefound", () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener("statechange", () => {
            if (newSw.state === "installed" && navigator.serviceWorker.controller) {
              newSw.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          });
        });
      }).catch((err) => {
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