
const CACHE_NAME = 'naxxivo-v2-premium';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install: Cache Core App Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate for ALL assets (including CDNs)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Strategy: Try Network first for API, Cache first for assets
  const url = new URL(event.request.url);
  
  // 1. API Requests (Supabase, etc) -> Network Only (don't cache sensitive data)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
      return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts) -> Stale-While-Revalidate
  // This downloads the file to the phone and updates it in the background
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Clone and store in cache if valid
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
           // If offline, just return whatever is cached, or nothing
           return cachedResponse;
        });

        // Return cached response immediately if we have it (Fast Loading!)
        // Otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
