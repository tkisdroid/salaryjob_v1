"use client";

import { useEffect, useRef } from "react";

type Props = {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
};

/**
 * Phase 4 Plan 04-08 D-14 — html5-qrcode wrapper with React 19 StrictMode guard.
 *
 * Known issue: React 19 StrictMode double-mounts effects in development;
 * html5-qrcode's `Html5Qrcode.start()` crashes if called twice on the same
 * DOM node. We defend with a per-mount flag (`startedRef`) and a tear-down
 * sequence that awaits `stop().then(clear)` before releasing the ref.
 *
 * This component MUST be loaded via dynamic import with `ssr: false` from
 * the consuming page:
 *
 *   const QrScanner = dynamic(
 *     () => import("@/components/worker/qr-scanner").then((m) => m.QrScanner),
 *     { ssr: false },
 *   );
 *
 * html5-qrcode touches `window` and `navigator.mediaDevices` at import time,
 * so rendering on the server throws. The dynamic import also keeps the ~150kb
 * bundle out of the initial payload for users who never reach the scanner.
 */
export function QrScanner({ onScan, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Stable refs for the callbacks so the effect does not re-fire when the
  // parent passes new function identities on every render.
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (startedRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const Ctor = mod.Html5Qrcode;
        const containerId = `qr-scanner-${Math.random()
          .toString(36)
          .slice(2)}`;
        if (!containerRef.current) return;
        containerRef.current.id = containerId;
        scanner = new Ctor(containerId);
        startedRef.current = true;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScanRef.current?.(decodedText);
          },
          // Per-frame errors are normal while no QR is in frame — ignore.
          () => {},
        );
      } catch (err) {
        startedRef.current = false;
        const message =
          err instanceof Error ? err.message : String(err ?? "unknown");
        onErrorRef.current?.(message);
      }
    })();

    return () => {
      cancelled = true;
      if (scanner && startedRef.current) {
        scanner
          .stop()
          .then(() => {
            try {
              scanner.clear();
            } catch {
              // clear() throws if stop() partially failed — swallow
            }
          })
          .catch(() => {
            // stop() throws if the scanner never reached RUNNING — swallow
          })
          .finally(() => {
            startedRef.current = false;
          });
      } else {
        startedRef.current = false;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-sm mx-auto aspect-square bg-black rounded-lg overflow-hidden"
    />
  );
}
