"use client";

import { useEffect } from "react";

/**
 * Phase 4 D-19 — Register /sw.js exactly once per session.
 *
 * Rendered from the root layout so every route benefits. No-op on the server
 * (SSR) and gracefully degrades when `navigator.serviceWorker` is unavailable
 * (Safari private mode, non-secure contexts, etc).
 *
 * Registration is best-effort: a failure only means push will not fire —
 * the rest of the app continues to work.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);

  return null;
}
