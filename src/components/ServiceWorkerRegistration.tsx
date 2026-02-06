'use client';

import { useEffect } from 'react';
import swManager from '@/lib/service-worker';

// Version key to force cache clear when model changes
// INCREMENT THIS when you deploy a new model
const MODEL_CACHE_VERSION = 3;
const MODEL_VERSION_KEY = 'farmscan-model-version';

/**
 * Service Worker Registration Component
 * Handles PWA service worker registration on the client side
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // In development: unregister any existing SW so it can't intercept chunks and cause ChunkLoadError.
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
        if (regs.length) { /* unregistered in dev */ }
      });
      // Also clear caches in development
      clearAllCaches();
      return;
    }

    // Check if we need to force clear old model cache
    forceRefreshModelCache();

    // Wait for page to load before registering
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }

    async function registerSW() {
      try {
        const status = await swManager.register();
        
        if (status.isRegistered) {
          try {
            await swManager.cacheModelFiles();
          } catch (error) {
            console.warn('⚠️ Failed to pre-cache model files:', error);
          }
        }
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }

    // Listen for service worker updates
    const handleUpdate = () => {
      // Show update notification to user
      if (confirm('A new version is available! Reload to update?')) {
        swManager.skipWaiting();
      }
    };

    // Listen for cache updates from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CACHE_UPDATED') {
        localStorage.setItem(MODEL_VERSION_KEY, String(event.data.version));
      }
    };

    window.addEventListener('swUpdate', handleUpdate);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('swUpdate', handleUpdate);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Force refresh model cache if version has changed
 */
async function forceRefreshModelCache() {
  try {
    const storedVersion = localStorage.getItem(MODEL_VERSION_KEY);
    const currentVersion = String(MODEL_CACHE_VERSION);

    if (storedVersion !== currentVersion) {
      await clearAllCaches();
      try {
        await swManager.clearModelCache();
      } catch {
        // Caches already cleared directly
      }
      localStorage.setItem(MODEL_VERSION_KEY, currentVersion);
    }
  } catch (error) {
    console.error('[Cache] Error checking cache version:', error);
    // On error, just try to clear anyway
    await clearAllCaches();
  }
}

/**
 * Clear all FarmScan related caches
 */
async function clearAllCaches() {
  if (!('caches' in window)) {
    return;
  }
  
  try {
    const cacheNames = await caches.keys();
    const farmScanCaches = cacheNames.filter(name => 
      name.includes('farmscan') || name.includes('models')
    );
    
    if (farmScanCaches.length > 0) {
      await Promise.all(farmScanCaches.map(name => caches.delete(name)));
    }
  } catch (error) {
    console.error('[Cache] Failed to clear caches:', error);
  }
}
