"use client";

import { useCallback, useState } from "react";

/**
 * Seoul City Hall — D-06 fallback coordinates used on permission denial
 * or 5s timeout. Matches pg_cron tests and test fixtures.
 */
export const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 } as const;

interface Coords {
  lat: number;
  lng: number;
}

interface UseGeolocationResult {
  coords: Coords | null;
  denied: boolean;
  loading: boolean;
  requestLocation: () => void;
}

/**
 * navigator.geolocation wrapper with:
 *  - NO auto-request on mount (Research Area 7.2 — user MUST click)
 *  - 5s timeout, enableHighAccuracy: false (fast IP/WiFi-based position)
 *  - Seoul City Hall fallback on denial or timeout
 *  - `denied` state exposes the "allow location" banner UX
 *
 * Design note: We deliberately do NOT throw on failure. Denial is a normal
 * path on /home (D-06). The fallback coords still produce a usable distance
 * sort centered on the city — just not personalized.
 */
export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setCoords(SEOUL_CITY_HALL);
      setDenied(true);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDenied(false);
        setLoading(false);
      },
      () => {
        setCoords(SEOUL_CITY_HALL);
        setDenied(true);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  }, []);

  return { coords, denied, loading, requestLocation };
}
