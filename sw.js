/* ============================================================================
   SERVICE WORKER - Offline support and caching strategy
   ============================================================================ */

const CACHE_NAME = "prepos-v1";
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "state-manager.js",
  "ui-components.js",
  "data-export.js",
  "manifest.json",
  "icon-192.svg",
  "icon-512.svg"
];

// ============ INSTALL EVENT ============
// Cache all essential assets when service worker is installed

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ============ ACTIVATE EVENT ============
// Clean up old caches when service worker is activated

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ============ FETCH EVENT ============
// Cache-first strategy: try cache first, fallback to network

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        console.log("[SW] Serving from cache:", event.request.url);
        return response;
      }

      // Otherwise, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Fallback for failed requests
          console.warn("[SW] Fetch failed for:", event.request.url);
          // Could return a offline page here if desired
          return new Response("Offline - Unable to load resource", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain"
            })
          });
        });
    })
  );
});
