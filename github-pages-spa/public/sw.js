const CACHE = "alert-tradie-pro-v69-static-only";
const BASE = "/AlertConstruction/";
const SHELL = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  // Never cache API, Supabase, customer files, authentication, or any cross-origin response.
  if (url.origin !== self.location.origin || url.pathname.includes("/api/") || url.pathname.includes("/functions/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match(`${BASE}index.html`)));
    return;
  }

  if (!/\.(?:js|css|webp|png|jpg|jpeg|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
