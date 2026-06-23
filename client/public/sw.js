/**
 * Service worker for PWA support.
 * - Network-first for HTML (always fresh)
 * - Cache-first for hashed assets (long-term cache)
 * - Network-first for API (no stale data)
 *
 * VERSION is bumped on every deploy to force-clear stale caches.
 * We do NOT call skipWaiting() unconditionally — only when the user
 * explicitly requests it via the SKIP_WAITING message. This prevents
 * the new SW from interrupting an active session and avoids reload
 * loops.
 */
const VERSION = "v3.0.1";
const STATIC_CACHE = `aether-static-${VERSION}`;
const API_CACHE = `aether-api-${VERSION}`;
const STATIC_ASSETS = ["/manifest.json", "/logo.png", "/robots.txt", "/sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  // NOTE: do NOT call self.skipWaiting() here.
  // The new SW will wait for all clients to close before activating,
  // which means the user gets the new code on their NEXT navigation,
  // not in the middle of their current session.
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches regardless of name to ensure fresh deploy
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("aether-") && k !== STATIC_CACHE && k !== API_CACHE)
        .map((k) => caches.delete(k)))
        .then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API: network-first, never cache errors
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (request.method === "GET" && res.status === 200) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  // HTML pages (index.html, SPA routes): network-first, never cache
  if (request.method === "GET" && (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    (!url.pathname.startsWith("/assets/") && !url.pathname.includes("."))
  )) {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("/").then((c) => c || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Hashed assets: cache-first (safe because hash changes on each deploy)
  if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Other static assets: try cache, then network
  // Skip cross-origin requests (fonts, external APIs) — let browser handle them directly
  if (request.method === "GET" && request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response("Offline", { status: 503 })))
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});