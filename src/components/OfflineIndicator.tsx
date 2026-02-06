'use client';

import React, { useSyncExternalStore } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true
  );

  // Only show when offline to reduce visual noise
  if (isOnline) return null;

  return (
    <div className="fixed top-[57px] left-0 right-0 z-40 bg-amber-500 border-b border-amber-600">
      <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 px-4 py-1.5">
        <WifiOff className="w-3.5 h-3.5 text-white flex-shrink-0" strokeWidth={2.5} />
        <span className="font-semibold text-[11px] text-white uppercase tracking-wide">Offline Mode</span>
      </div>
    </div>
  );
}
