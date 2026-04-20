"use client";

import { useEffect, useState } from "react";

/**
 * Lazy-load the Naver Maps JavaScript v3 (NCP) SDK.
 *
 * Strategy (per https://navermaps.github.io/maps.js.ncp/docs/):
 *   1. Inject `<script src="...?ncpKeyId=KEY">` into document.head on first
 *      hook call (idempotent — reuses any existing tag by id).
 *   2. Unlike Kakao Maps, Naver's SDK populates `window.naver.maps` as soon
 *      as the script fires `load`. There is no separate `load(callback)` step.
 *   3. The hook transitions to `ready: true` in the load handler so consumers
 *      can `useEffect` on it to create their Map instance.
 *
 * Graceful degradation:
 *   If `process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` is empty/missing, the
 *   hook returns `{ ready: false, hasKey: false, error: null }` WITHOUT
 *   injecting the script. Consumers render a placeholder.
 *
 * Error handling:
 *   - Random Vercel preview origins are blocked before script injection with
 *     an actionable setup message. NCP allow-lists usually cover localhost +
 *     production domains, not every ephemeral preview URL.
 *   - script.onerror → origin-aware guidance that points at NCP Console >
 *     Maps > Web Dynamic Map > 서비스 환경 등록.
 *   - SDK loads but `window.naver.maps` missing → reload / initialization
 *     failure guidance.
 */

export interface NaverSdkState {
  /** True once `window.naver.maps` is populated and the SDK is usable. */
  ready: boolean;
  /** Non-null on script load failure or missing `naver.maps` global. */
  error: string | null;
  /** Non-error guardrail message for unsupported hosts like random preview URLs. */
  blockedMessage: string | null;
  /**
   * False when `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` is empty/missing.
   * Consumers use this to decide between rendering a placeholder
   * and attempting to mount the map container.
   */
  hasKey: boolean;
}

const SCRIPT_ID = "naver-maps-sdk";

function toOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getNaverSdkBlockedMessage({
  currentOrigin,
  appUrl,
}: {
  currentOrigin: string | null;
  appUrl: string | null | undefined;
}): string | null {
  if (!currentOrigin) return null;

  let hostname: string;
  try {
    hostname = new URL(currentOrigin).hostname;
  } catch {
    return null;
  }

  if (!hostname.endsWith(".vercel.app")) {
    return null;
  }

  const configuredOrigin = toOrigin(appUrl);
  if (configuredOrigin && configuredOrigin === currentOrigin) {
    return null;
  }

  return [
    "현재 Vercel preview 도메인에서는 네이버 지도를 불러오지 않습니다.",
    "NCP 콘솔 > Services > AI·Application Service > Maps > Web Dynamic Map에 등록한 localhost 또는 운영 도메인에서 확인해주세요.",
    `현재 주소: ${currentOrigin}`,
  ].join(" ");
}

export function getNaverSdkLoadErrorMessage(
  currentOrigin: string | null,
): string {
  if (!currentOrigin) {
    return "네이버 지도 SDK를 불러오지 못했습니다. NCP 콘솔 > Maps > Web Dynamic Map에서 Client ID와 등록 도메인을 확인해주세요.";
  }

  return `네이버 지도 SDK를 불러오지 못했습니다. NCP 콘솔 > Maps > Web Dynamic Map에 현재 주소(${currentOrigin})가 등록되어 있는지 확인해주세요.`;
}

function hasNaverMaps(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { naver?: { maps?: unknown } }).naver?.maps,
  );
}

export function useNaverMapsSDK(): NaverSdkState {
  const key = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? "";

  // SSR-safe initial state: on the server we can't know if the key is set
  // (NEXT_PUBLIC_ is inlined at build time but we still return a stable
  // "not ready" value so hydration matches). The useEffect fills in the
  // real state on mount.
  const [state, setState] = useState<NaverSdkState>({
    ready: false,
    error: null,
    blockedMessage: null,
    hasKey: key.length > 0,
  });

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    const deferState = (nextState: NaverSdkState) => {
      queueMicrotask(() => {
        if (!cancelled) setState(nextState);
      });
    };

    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : null;
    const blockedMessage = getNaverSdkBlockedMessage({
      currentOrigin,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    if (blockedMessage) {
      deferState({
        ready: false,
        error: null,
        blockedMessage,
        hasKey: true,
      });
      return () => {
        cancelled = true;
      };
    }

    // Already loaded? (HMR reload, multi-consumer mount)
    if (hasNaverMaps()) {
      deferState({
        ready: true,
        error: null,
        blockedMessage: null,
        hasKey: true,
      });
      return () => {
        cancelled = true;
      };
    }

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const markReady = () => {
      if (cancelled) return;
      setState({
        ready: true,
        error: null,
        blockedMessage: null,
        hasKey: true,
      });
    };

    const markError = (message: string) => {
      if (cancelled) return;
      setState({
        ready: false,
        error: message,
        blockedMessage: null,
        hasKey: true,
      });
    };

    // Poll for `window.naver.maps` as a race-safe fallback. The script's
    // `load` event can be missed under React strict mode (effect runs twice:
    // the first mount attaches the listener, the cleanup removes it, and if
    // the script finishes loading before the remount re-subscribes we would
    // wait forever on an event that already fired).
    pollTimer = setInterval(() => {
      if (hasNaverMaps()) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        markReady();
      }
    }, 100);

    const handleLoad = () => {
      if (hasNaverMaps()) {
        markReady();
      } else {
        markError(
          "네이버 지도 SDK 초기화가 완료되지 않았습니다. NCP 콘솔에서 Client ID와 Web 서비스 URL 등록을 확인한 뒤 페이지를 새로고침해주세요.",
        );
      }
    };

    const handleError = () => {
      markError(getNaverSdkLoadErrorMessage(currentOrigin));
    };

    // Naver SDK invokes this global when Client ID auth fails (wrong key,
    // unregistered Web 서비스 URL, or Web Dynamic Map service not enabled
    // on the NCP application). Without this handler the SDK silently stops
    // loading tiles and leaves us in the "ready" state with no feedback.
    const authFailureCallback = () => {
      markError(
        `네이버 지도 인증에 실패했습니다. NCP 콘솔 > Maps > 해당 Application에 Web Dynamic Map 서비스가 활성화되어 있고 "${currentOrigin ?? "현재 주소"}"가 Web 서비스 URL로 등록되어 있는지 확인해주세요.`,
      );
    };
    (
      window as unknown as { navermap_authFailure?: () => void }
    ).navermap_authFailure = authFailureCallback;

    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    let script: HTMLScriptElement;
    if (existing) {
      script = existing;
      // Another mount already injected the tag; subscribe to its events.
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
    } else {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      // NCP integrated Key ID → `ncpKeyId`. The other parameter name
      // `ncpClientId` is reserved for legacy Naver Developers keys and will
      // fail auth with InvalidParameter when an NCP Key ID is passed.
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
        key,
      )}`;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      const w = window as unknown as { navermap_authFailure?: () => void };
      if (w.navermap_authFailure === authFailureCallback) {
        delete w.navermap_authFailure;
      }
    };
  }, [key]);

  return state;
}
