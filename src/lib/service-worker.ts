/**
 * Service Worker Registration Utility
 * Handles PWA service worker registration and updates
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval: number | null = null;

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerStatus> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported in this browser');
      return {
        isSupported: false,
        isRegistered: false,
        isUpdateAvailable: false,
        registration: null,
      };
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.notifyUpdate();
          }
        });
      });

      this.updateCheckInterval = window.setInterval(() => {
        this.checkForUpdates();
      }, 60 * 60 * 1000);

      navigator.serviceWorker.addEventListener('controllerchange', () => {});

      return {
        isSupported: true,
        isRegistered: true,
        isUpdateAvailable: false,
        registration: this.registration,
      };
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
      return {
        isSupported: true,
        isRegistered: false,
        isUpdateAvailable: false,
        registration: null,
      };
    }
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return;
    }

    // Send skip waiting message
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for controller change
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve();
      }, { once: true });
    });

    // Reload page
    window.location.reload();
  }

  /**
   * Notify user of available update
   */
  private notifyUpdate(): void {
    // Dispatch custom event that UI can listen to
    const event = new CustomEvent('swUpdate', {
      detail: { registration: this.registration },
    });
    window.dispatchEvent(event);
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();
      
      if (this.updateCheckInterval) {
        clearInterval(this.updateCheckInterval);
      }
      
      return success;
    } catch (error) {
      console.error('[SW Manager] Unregister failed:', error);
      return false;
    }
  }

  /**
   * Cache model files explicitly
   */
  async cacheModelFiles(): Promise<boolean> {
    if (!this.registration?.active) {
      console.warn('[SW Manager] No active service worker');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      if (this.registration?.active) {
        this.registration.active.postMessage(
          { type: 'CACHE_MODEL' },
          [messageChannel.port2]
        );
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Get cache status for model files
   */
  async getCacheStatus(): Promise<Array<{ file: string; cached: boolean }>> {
    if (!this.registration?.active) {
      console.warn('[SW Manager] No active service worker');
      return [];
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.cachedFiles || []);
      };

      if (this.registration?.active) {
        this.registration.active.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      } else {
        resolve([]);
      }
    });
  }

  /**
   * Clear model cache and re-download fresh models
   * Call this when the app starts to ensure latest model is used
   */
  async clearModelCache(): Promise<boolean> {
    if (!this.registration?.active) {
      console.warn('[SW Manager] No active service worker');
      // If no SW, try to clear caches directly
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          const modelCaches = cacheNames.filter(name => name.includes('models') || name.includes('farmscan'));
          await Promise.all(modelCaches.map(name => caches.delete(name)));
          return true;
        } catch (error) {
          console.error('[SW Manager] Direct cache clear failed:', error);
          return false;
        }
      }
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      if (this.registration?.active) {
        this.registration.active.postMessage(
          { type: 'CLEAR_MODEL_CACHE' },
          [messageChannel.port2]
        );
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Get registration status
   */
  getStatus(): ServiceWorkerStatus {
    return {
      isSupported: 'serviceWorker' in navigator,
      isRegistered: !!this.registration,
      isUpdateAvailable: !!this.registration?.waiting,
      registration: this.registration,
    };
  }
}

// Singleton instance
const swManager = new ServiceWorkerManager();

export default swManager;

// Export convenient functions
export const registerServiceWorker = () => swManager.register();
export const checkForUpdates = () => swManager.checkForUpdates();
export const skipWaiting = () => swManager.skipWaiting();
export const unregisterServiceWorker = () => swManager.unregister();
export const cacheModelFiles = () => swManager.cacheModelFiles();
export const getCacheStatus = () => swManager.getCacheStatus();
export const getServiceWorkerStatus = () => swManager.getStatus();
export const clearModelCache = () => swManager.clearModelCache();
