const CACHE = "hackerx-static-v2";
const CORE = ["/manifest.webmanifest", "/h-mark.svg"];
const STATIC_ASSET = /\.(?:js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|ico|webmanifest)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Bump: every older cache, including ones that stored copied post
  // content, is deleted here.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML and JSON are network-first and are never written to the cache:
  // they carry site content and must not go stale. Only static assets
  // (JS, CSS, fonts, icons) are cached.
  const isDocument = event.request.mode === "navigate" || (event.request.headers.get("accept") || "").includes("text/html");
  const isJson = url.pathname.endsWith(".json") || (event.request.headers.get("accept") || "").includes("application/json");
  if (isDocument || isJson) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // Static assets (JS, CSS, fonts, icons) are cache-first.
  if (STATIC_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          }),
      ),
    );
  }
});
