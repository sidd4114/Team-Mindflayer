"use client";

import { useState, useEffect, useRef } from "react";

/** Haversine distance in meters */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad1) * Math.cos(rad2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Bearing from point 1 to point 2 in degrees (0 = North, 90 = East) */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(rad2);
  const x = Math.cos(rad1) * Math.sin(rad2) - Math.sin(rad1) * Math.cos(rad2) * Math.cos(dLon);
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function bearingToCardinal(deg: number): string {
  const cards = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round(deg / 45) % 8;
  return cards[i];
}

export default function FieldGuidance({
  target,
  targetLabel = "Target",
  onUserLocation,
  className = "",
}: {
  target: { lat: number; lng: number };
  targetLabel?: string;
  onUserLocation?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("GPS not available");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        onUserLocation?.(latitude, longitude);
        setError(null);
      },
      (err) => {
        setError(err.message || "Location unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [onUserLocation]);

  if (error) {
    return (
      <div className={`rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 ${className}`}>
        <p className="font-medium">GPS unavailable</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!userPos) {
    return (
      <div className={`rounded-xl bg-slate-100 border border-slate-200 p-3 text-sm text-slate-600 ${className}`}>
        <p>Getting your location…</p>
      </div>
    );
  }

  const dist = haversineDistance(userPos.lat, userPos.lng, target.lat, target.lng);
  const bear = bearing(userPos.lat, userPos.lng, target.lat, target.lng);
  const cardinal = bearingToCardinal(bear);

  const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;

  return (
    <div className={`rounded-xl bg-[#6B7B3F]/10 border border-[#6B7B3F]/30 p-3 text-sm ${className}`}>
      <p className="font-semibold text-slate-900">Guidance to {targetLabel}</p>
      <p className="mt-1 text-slate-700">
        Walk <strong>{distText}</strong> <strong>{cardinal}</strong>
      </p>
      <p className="text-xs text-slate-500 mt-0.5">
        Bearing {Math.round(bear)}° · Distance updates as you move
      </p>
    </div>
  );
}
