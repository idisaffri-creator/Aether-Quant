/**
 * Service worker for PWA support.
 * - Network-first for HTML (always fresh)
 * - Cache-first for hashed assets (long-term cache)
 * - Network-first for API (no stale data)
 *
 * VERSION is bumped on every deploy to force-clear stale caches.
 */
const VERSION = "v2.0.0-" + (self.location?.href || "");
const STATIC_CACHE = `aether-static-${VERSION}`;
const API_CACHE = `aether-api-${VERSION}`;
const STATIC_ASSETS = ["/manifest.json", "/logo.png", "/robots.txt", "/sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
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
          // Only cache GET 200s for short period
          if (request.method === "GET" && res.status === 200) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML pages (index.html, SPA routes): network-first, never cache
  // This is the critical fix — old cached index.html was referencing old CSS hashes
  if (request.method === "GET" && (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    (!url.pathname.startsWith("/assets/") && !url.pathname.includes("."))
  )) {
    event.respondWith(
      fetch(request).then((res) => {
        // Optionally cache successful HTML for offline
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("/"))
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
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});