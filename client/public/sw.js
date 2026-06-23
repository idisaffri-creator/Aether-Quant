/**
 * Service worker for PWA support.
 * VERSION is bumped on every deploy to force-clear stale caches.
 */
const VERSION = "v4.0.0";
const STATIC_CACHE = `aether-static-${VERSION}`;
const API_CACHE = `aether-api-${VERSION}`;
const STATIC_ASSETS = ["/manifest.json", "/logo.png", "/robots.txt", "/sw.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith("aether-") && k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Skip cross-origin requests entirely — let the browser handle them
  if (url.origin !== self.location.origin) return;

  // API: network-first, never cache errors
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((c) =>
            c || new Response(JSON.stringify({ error: "offline" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          )
        )
    );
    return;
  }

  // HTML pages: network-first, never cache
  if (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    (!url.pathname.startsWith("/assets/") && !url.pathname.includes("."))
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match("/").then((c) =>
            c || new Response("Offline", { status: 503 })
          )
        )
    );
    return;
  }

  // Hashed assets: cache-first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        }).catch(() => new Response("Offline", { status: 503 }));
      })
    );
    return;
  }

  // Other same-origin assets: cache, then network
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).catch(() => new Response("Offline", { status: 503 }))
    )
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});
