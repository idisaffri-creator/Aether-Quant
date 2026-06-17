import { createRoot } from "react-dom/client";
import App from "./App";
import { initSentry } from "./lib/sentry";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

initSentry();

// Register service worker for PWA
// Bumping ?v= forces browser to fetch new SW on each deploy
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`).then((reg) => {
      // Force the new SW to take over immediately
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      reg.addEventListener("updatefound", () => {
        const newSw = reg.installing;
        if (!newSw) return;
        newSw.addEventListener("statechange", () => {
          if (newSw.state === "installed" && navigator.serviceWorker.controller) {
            newSw.postMessage({ type: "SKIP_WAITING" });
            // Tell clients to reload to get fresh assets
            window.location.reload();
          }
        });
      });
    }).catch((err) => {
      console.warn("[sw] registration failed:", err.message);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);