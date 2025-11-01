/// <reference lib="webworker" />

const CACHE_NAME = 'image-cache-v1';

// We will cache images from Firebase Storage and the placeholder service.
const IMAGE_URL_PATTERNS = [
  /^https:\/\/firebasestorage\.googleapis\.com/,
  /^https:\/\/picsum\.photos/,
];

/**
 * Activate event
 * This is the perfect time to clean up old caches.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            // If this cache name is not the current one, delete it.
            console.log('Service Worker: deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

/**
 * Fetch event
 * Intercepts network requests and applies the caching strategy.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Check if the request is for an image and matches our URL patterns.
  const isImageRequest = request.destination === 'image';
  const shouldCache = IMAGE_URL_PATTERNS.some(pattern => pattern.test(request.url));

  if (isImageRequest && shouldCache) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        // Stale-While-Revalidate Strategy
        const networkResponsePromise = fetch(request).then((networkResponse) => {
          // If we get a valid response, clone it, and update the cache.
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn(`Service Worker: Fetch failed for ${request.url};`, error);
          throw error;
        });

        // Try to get the response from the cache first.
        return cache.match(request).then((cachedResponse) => {
          // Return the cached response if found, otherwise wait for the network response.
          // This ensures a fast load from cache while updating in the background.
          return cachedResponse || networkResponsePromise;
        });
      })
    );
  }
});

// Immediately activate the new service worker
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});
