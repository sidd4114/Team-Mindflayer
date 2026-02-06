// Service Worker for FarmScan PWA
// Handles offline caching of app assets and ML model files

// IMPORTANT: Increment version when model files change to force cache refresh
const CACHE_VERSION = 3;
const CACHE_NAME = `farmscan-v${CACHE_VERSION}`;
const MODEL_CACHE = `farmscan-models-v${CACHE_VERSION}`;

// List of all old cache names to delete (add old versions here)
const OLD_CACHES = [
  'farmscan-v1', 'farmscan-v2',
  'farmscan-models-v1', 'farmscan-models-v2'
];

// Core app files to cache (including advice and locale messages for offline treatment/prevention)
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/advice-data.json',
  '/messages/en.json',
  '/messages/hi.json',
  '/messages/mr.json',
];

// Model files to cache for offline use
const MODEL_FILES = [
  '/models/image-classifier/model.json',
  '/models/image-classifier/labels.json',
  '/models/image-classifier/group1-shard1of2.bin',
  '/models/image-classifier/group1-shard2of2.bin',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache core assets
        const coreCache = await caches.open(CACHE_NAME);
        console.log('[Service Worker] Caching core assets');
        await coreCache.addAll(CORE_ASSETS);

        // Cache model files
        const modelCache = await caches.open(MODEL_CACHE);
        console.log('[Service Worker] Caching ML model files');
        await modelCache.addAll(MODEL_FILES);

        console.log('[Service Worker] Install complete');
        
        // Force the waiting service worker to become the active service worker
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Install failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      // Clean up ALL old caches aggressively
      const cacheNames = await caches.keys();
      console.log('[Service Worker] Current caches:', cacheNames);
      
      await Promise.all(
        cacheNames
          .filter((name) => {
            // Delete if it's not current version OR if it's in old caches list
            const isOldCache = OLD_CACHES.includes(name);
            const isNotCurrent = name !== CACHE_NAME && name !== MODEL_CACHE;
            return isOldCache || isNotCurrent;
          })
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );

      // Take control of all clients immediately
      await self.clients.claim();
      
      // Notify all clients to refresh their model cache
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION });
      });
      
      console.log('[Service Worker] Activation complete, version:', CACHE_VERSION);
    })()
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Don't intercept Next.js / dev server requests – let the browser handle them.
  // These paths are served by the dev server or build output; SW fetch often fails and breaks loading.
  const pathname = url.pathname;
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('[turbopack]') ||
    pathname.includes('node_modules') ||
    pathname.startsWith('/_nextjs_') ||
    pathname.includes('original-stack-frames')
  ) {
    return;
  }

  // Handle model files with cache-first strategy
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(
      (async () => {
        try {
          // Try cache first
          const cached = await caches.match(request);
          if (cached) {
            console.log('[Service Worker] Serving model from cache:', url.pathname);
            return cached;
          }

          // Fallback to network (only if online)
          try {
            console.log('[Service Worker] Fetching model from network:', url.pathname);
            const response = await fetch(request);
            
            // Cache the response
            if (response.ok) {
              const cache = await caches.open(MODEL_CACHE);
              cache.put(request, response.clone());
            }
            
            return response;
          } catch (networkError) {
            // Network failed, check cache one more time
            const cachedFallback = await caches.match(request);
            if (cachedFallback) {
              console.log('[Service Worker] Serving model from cache (network failed):', url.pathname);
              return cachedFallback;
            }
            // No cache available, return error response
            console.error('[Service Worker] Model fetch failed and no cache available:', url.pathname);
            return new Response('Model not available offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          }
        } catch (error) {
          console.error('[Service Worker] Model fetch failed:', error);
          // Return error response instead of throwing
          return new Response('Model fetch failed', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      })()
    );
    return;
  }

  // Handle app files with network-first strategy
  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch((err) => {
            console.warn('[Service Worker] Failed to cache response:', err);
          });
        }
        
        return response;
      } catch (error) {
        // Fallback to cache
        const cached = await caches.match(request);
        if (cached) {
          console.log('[Service Worker] Serving from cache:', url.pathname);
          return cached;
        }

        // If it's a navigation request and we have no cache, show offline page
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match('/');
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Return error response instead of throwing
        console.warn('[Service Worker] Request failed and not cached:', url.pathname);
        return new Response('Resource not available offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_MODEL') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(MODEL_CACHE);
          
          // Check which files are already cached
          const cacheChecks = await Promise.all(
            MODEL_FILES.map(async (file) => {
              const cached = await cache.match(file);
              return { file, cached: !!cached };
            })
          );
          
          // Only fetch files that aren't cached
          const filesToFetch = cacheChecks
            .filter(({ cached }) => !cached)
            .map(({ file }) => file);
          
          if (filesToFetch.length > 0) {
            try {
              // Try to fetch missing files (only works if online)
              await cache.addAll(filesToFetch);
              console.log('[Service Worker] Cached model files:', filesToFetch);
            } catch (fetchError) {
              // If offline, that's okay - files might already be cached from install
              console.warn('[Service Worker] Could not fetch model files (offline?):', fetchError);
              // Check if we have at least some files cached
              const hasAnyCache = cacheChecks.some(({ cached }) => cached);
              if (!hasAnyCache) {
                throw new Error('No model files cached and offline');
              }
            }
          } else {
            console.log('[Service Worker] All model files already cached');
          }
          
          event.ports[0]?.postMessage({ success: true });
        } catch (error) {
          console.error('[Service Worker] Cache model failed:', error);
          event.ports[0]?.postMessage({ success: false, error: error.message });
        }
      })()
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        try {
          const modelCache = await caches.open(MODEL_CACHE);
          const cachedFiles = await Promise.all(
            MODEL_FILES.map(async (file) => {
              const response = await modelCache.match(file);
              return { file, cached: !!response };
            })
          );
          event.ports[0]?.postMessage({ cachedFiles });
        } catch (error) {
          console.error('[Service Worker] Get cache status failed:', error);
          event.ports[0]?.postMessage({ cachedFiles: [], error: error.message });
        }
      })()
    );
  }

  // Handle clearing model cache (force refresh)
  if (event.data && event.data.type === 'CLEAR_MODEL_CACHE') {
    event.waitUntil(
      (async () => {
        try {
          console.log('[Service Worker] Clearing all model caches...');
          
          // Delete ALL model-related caches
          const cacheNames = await caches.keys();
          const modelCaches = cacheNames.filter(name => name.includes('models'));
          
          await Promise.all(
            modelCaches.map(name => {
              console.log('[Service Worker] Deleting model cache:', name);
              return caches.delete(name);
            })
          );
          
          // Also delete old version caches
          await Promise.all(
            OLD_CACHES.map(async (name) => {
              if (await caches.has(name)) {
                console.log('[Service Worker] Deleting old cache:', name);
                return caches.delete(name);
              }
            })
          );
          
          // Re-cache fresh model files
          const freshCache = await caches.open(MODEL_CACHE);
          console.log('[Service Worker] Re-caching fresh model files...');
          await freshCache.addAll(MODEL_FILES);
          
          console.log('[Service Worker] Model cache cleared and refreshed');
          event.ports[0]?.postMessage({ success: true, version: CACHE_VERSION });
        } catch (error) {
          console.error('[Service Worker] Clear model cache failed:', error);
          event.ports[0]?.postMessage({ success: false, error: error.message });
        }
      })()
    );
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      (async () => {
        // Implement offline data sync logic here
        console.log('[Service Worker] Syncing offline data...');
      })()
    );
  }
});
