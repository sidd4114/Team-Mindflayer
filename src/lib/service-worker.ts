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
      console.log('[SW Manager] Registering service worker...');
      
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW Manager] Service worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        console.log('[SW Manager] New service worker found');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[SW Manager] New service worker available');
            this.notifyUpdate();
          }
        });
      });

      // Check for updates periodically (every hour)
      this.updateCheckInterval = window.setInterval(() => {
        this.checkForUpdates();
      }, 60 * 60 * 1000);

      // Listen for controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Manager] Service worker controller changed');
        // Optionally reload the page
        // window.location.reload();
      });

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
      console.log('[SW Manager] Checked for updates');
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
      console.log('[SW Manager] Service worker unregistered');
      
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
