'use client';

import { useEffect } from 'react';
import swManager from '@/lib/service-worker';

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
          console.log('✅ Service Worker registered successfully');
          
          // Pre-cache model files
          try {
            await swManager.cacheModelFiles();
            console.log('✅ Model files cached for offline use');
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
      console.log('🔄 Service Worker update available');
      
      // Show update notification to user
      if (confirm('A new version is available! Reload to update?')) {
        swManager.skipWaiting();
      }
    };

    window.addEventListener('swUpdate', handleUpdate);

    return () => {
      window.removeEventListener('swUpdate', handleUpdate);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
