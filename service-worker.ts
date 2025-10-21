// FIX: Added a triple-slash directive to include the Web Worker TypeScript library.
// This provides the correct global types for a Service Worker environment, such as `ServiceWorkerGlobalScope`,
// `ExtendableEvent`, and `FetchEvent`, resolving all type-related errors in this file.
/// <reference lib="webworker" />

// This is a global constant that will be replaced by the build process
// FIX: Removed the `declare const self` line which caused a redeclaration error.
// The `webworker` lib reference correctly types the global `self`.

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
// FIX: Correctly typed the event parameter as `ExtendableEvent` to access `waitUntil`.
self.addEventListener('activate', (event: ExtendableEvent) => {
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
// FIX: Correctly typed the event parameter as `FetchEvent` to access `request` and `respondWith`.
self.addEventListener('fetch', (event: FetchEvent) => {
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
          // Network failed. If there's a cached version, it will be used.
          // If not, we must re-throw the error to let the browser handle the failure.
          console.warn(`Service Worker: Fetch failed for ${request.url};`, error);
          // FIX: Re-throw the error to ensure the promise chain correctly propagates the failure
          // in case of a cache miss. This fixes the TypeScript type error on `respondWith`.
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
// FIX: The service worker global scope (`self`) is now correctly typed, allowing access to `skipWaiting`.
self.addEventListener('install', (event: ExtendableEvent) => {
    // FIX: It's best practice to wrap skipWaiting in waitUntil to ensure
    // it completes before the install event is considered finished.
    // FIX: Explicitly cast `self` to the correct type to resolve a type inference issue where `skipWaiting` was not being identified as a function. This addresses the "not callable" error.
    event.waitUntil((self as unknown as ServiceWorkerGlobalScope).skipWaiting());
});
