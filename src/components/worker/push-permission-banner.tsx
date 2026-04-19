"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { subscribePush } from "@/lib/actions/push-actions";

/**
 * Phase 4 D-19/D-20 — Dismissable "enable notifications" banner.
 *
 * Rendering rules (all must be true to show):
 *   - `window.Notification` is defined (Safari ≥16, Chrome, Edge, Firefox)
 *   - `navigator.serviceWorker` is defined (secure context)
 *   - `Notification.permission === 'default'` (never asked OR reset)
 *   - localStorage flag `gignow.pushBannerDismissed` is absent
 *
 * Click flow:
 *   1. Notification.requestPermission()
 *   2. On grant: serviceWorker.ready → pushManager.subscribe({applicationServerKey})
 *   3. Pass PushSubscription.toJSON() to subscribePush Server Action
 *
 * Rendered from the `/my` layout (Plan 08). This file only defines the
 * component — it is not mounted anywhere yet.
 */

const DISMISSED_KEY = "gignow.pushBannerDismissed";

function shouldShowPushPermissionBanner(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (Notification.permission !== "default") return false;
  return !window.localStorage.getItem(DISMISSED_KEY);
}

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowPushPermissionBanner()) return;
    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  async function handleEnable() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        window.localStorage.setItem(DISMISSED_KEY, "1");
        setVisible(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidPublic = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
      if (!vapidPublic) {
        console.warn(
          "[push] NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY missing — cannot subscribe",
        );
        setVisible(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Modern TS lib typings expect BufferSource — copy into a fresh
        // ArrayBuffer-backed Uint8Array so the `.buffer` view is narrowed.
        applicationServerKey: urlBase64ToUint8Array(vapidPublic)
          .buffer as ArrayBuffer,
      });

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        console.warn("[push] subscription returned incomplete shape", json);
        setVisible(false);
        return;
      }

      await subscribePush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setVisible(false);
    } catch (err) {
      console.error("[push] subscribe failed:", err);
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="grid grid-cols-[36px_1fr_auto_auto] items-center gap-3 rounded-[18px] border border-[color-mix(in_oklch,var(--brand)_30%,var(--border))] bg-[color-mix(in_oklch,var(--brand)_14%,var(--surface))] p-[14px]">
      <span className="grid h-9 w-9 place-items-center rounded-[12px] border border-border-soft bg-surface text-brand-deep">
        <Bell className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
          알림을 켜서 빠르게 수락 소식을 받아보세요
        </p>
        <p className="mt-1 text-[11.5px] font-medium leading-snug text-muted-foreground">
          사업장이 수락하면 OS 알림으로 즉시 안내드립니다.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-ink px-4 text-[12px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
      >
        켜기
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="닫기"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-text-subtle hover:bg-surface-2 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * VAPID public key (base64url, no padding) → Uint8Array.
 * Required by PushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
