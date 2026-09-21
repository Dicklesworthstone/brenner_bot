/* BrennerBot offline service worker */
const CACHE_NAME = "brennerbot-offline-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/corpus",
  "/distillations",
  "/glossary",
  "/method",
  "/operators",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function cacheIfOk(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return;
  }
  const copy = response.clone();
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, copy);
}

async function handleNavigate(request) {
  try {
    const response = await fetch(request);
    await cacheIfOk(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      (await caches.match(OFFLINE_URL)) ||
      new Response("Offline", { status: 504, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await cacheIfOk(request, response);
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  event.respondWith(handleAsset(request));
});
