/**
 * Service worker for PWA support.
 * - Caches static assets (app shell)
 * - Network-first for API requests
 * - Offline fallback for the landing page
 */
const VERSION = "v1.0.0";
const STATIC_CACHE = `aether-static-${VERSION}`;
const API_CACHE = `aether-api-${VERSION}`;
const STATIC_ASSETS = ["/", "/login", "/register", "/manifest.json", "/logo.png", "/robots.txt"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only cache GET 200s
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

  // Static assets: cache-first
  if (request.method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".json"))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        }).catch(() => caches.match("/"));
      })
    );
    return;
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});