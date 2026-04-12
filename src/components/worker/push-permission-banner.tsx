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
    <div className="mx-4 my-3 flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand-light p-3 text-sm">
      <Bell className="h-5 w-5 text-brand-deep shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-brand-deep">
          알림을 켜서 빠르게 수락 소식을 받아보세요
        </p>
        <p className="mt-0.5 text-xs text-brand-deep/80">
          사업장이 수락하면 OS 알림으로 즉시 안내드립니다.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand px-4 text-xs font-bold text-white hover:bg-brand-dark"
      >
        켜기
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="닫기"
        className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-deep/70 hover:bg-brand/10"
      >
        <X className="h-4 w-4" />
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
