"use client";

import { useEffect } from "react";

/**
 * Registers the root /sw.js service worker on mount.
 *
 * Previously this was an inline <script dangerouslySetInnerHTML> in
 * src/app/layout.tsx, which React 19 complains about on every render with
 * "Encountered a script tag while rendering React component. Scripts
 * inside React components are never executed when rendering on the
 * client." Moving it into a client-side useEffect is the React-idiomatic
 * way — same behavior (register after hydration), no console noise.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[sw] registration failed:", error);
    });
  }, []);

  return null;
}
