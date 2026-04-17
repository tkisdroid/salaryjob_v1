"use client";

import { useEffect, useState } from "react";

/**
 * Phase 4 Plan 04-07 SEARCH-02 — lazy-load the Kakao Maps JavaScript SDK.
 *
 * Strategy (official pattern per https://apis.map.kakao.com/web/guide/):
 *   1. Inject `<script src="...?autoload=false">` into document.head on
 *      first hook call (idempotent — reuses any existing tag by id).
 *   2. Once the script fires `load`, call `window.kakao.maps.load(callback)`
 *      which completes SDK bootstrap. Inside that callback `window.kakao.maps`
 *      is fully populated and safe to use (Map / Marker / Circle / …).
 *   3. The hook transitions to `ready: true` in the callback so consumers
 *      can `useEffect` on it to create their Map instance.
 *
 * Graceful degradation:
 *   If `process.env.NEXT_PUBLIC_KAKAO_MAP_KEY` is empty/missing, the hook
 *   returns `{ ready: false, hasKey: false, error: null }` WITHOUT injecting
 *   the script. Consumers render a "지도 키 미설정" placeholder. This matches
 *   Phase 4 CLAUDE.md directive — Kakao JS key is provisioned by the user
 *   just before HUMAN-UAT and empty by default in .env.local.
 *
 * Error handling:
 *   - Random Vercel preview origins are blocked before script injection with
 *     an actionable setup message. Kakao platform whitelists usually cover
 *     localhost + production domains, not every ephemeral preview URL.
 *   - script.onerror → origin-aware guidance that points at Kakao Web
 *     platform domain registration.
 *   - SDK loads but `window.kakao.maps` missing → reload / initialization
 *     failure guidance.
 *
 * HMR safety:
 *   If another component already triggered the load and `window.kakao.maps`
 *   is present, we skip script injection and immediately run
 *   `kakao.maps.load(...)` — it is safe to call multiple times; the SDK
 *   dedupes internally.
 */

export interface KakaoSdkState {
  /** True once `kakao.maps.load` callback has fired and the SDK is usable. */
  ready: boolean;
  /** Non-null on script load failure or missing `kakao.maps` global. */
  error: string | null;
  /** Non-error guardrail message for unsupported hosts like random preview URLs. */
  blockedMessage: string | null;
  /**
   * False when `NEXT_PUBLIC_KAKAO_MAP_KEY` is empty/missing.
   * Consumers use this to decide between rendering a placeholder
   * and attempting to mount the map container.
   */
  hasKey: boolean;
}

const SCRIPT_ID = "kakao-maps-sdk";

function toOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getKakaoSdkBlockedMessage({
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
    "현재 Vercel preview 도메인에서는 카카오 지도를 불러오지 않습니다.",
    "카카오 개발자 콘솔 > 플랫폼 > Web에 등록한 localhost 또는 운영 도메인에서 확인해주세요.",
    `현재 주소: ${currentOrigin}`,
  ].join(" ");
}

export function getKakaoSdkLoadErrorMessage(currentOrigin: string | null): string {
  if (!currentOrigin) {
    return "카카오 지도 SDK를 불러오지 못했습니다. 카카오 개발자 콘솔 > 플랫폼 > Web에서 현재 도메인 등록 상태와 JavaScript 키를 확인해주세요.";
  }

  return `카카오 지도 SDK를 불러오지 못했습니다. 카카오 개발자 콘솔 > 플랫폼 > Web에 현재 주소(${currentOrigin})가 등록되어 있는지 확인해주세요.`;
}

export function useKakaoMapsSDK(): KakaoSdkState {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim() ?? "";

  // SSR-safe initial state: on the server we can't know if the key is set
  // (NEXT_PUBLIC_ is inlined at build time but we still return a stable
  // "not ready" value so hydration matches). The useEffect fills in the
  // real state on mount.
  const [state, setState] = useState<KakaoSdkState>({
    ready: false,
    error: null,
    blockedMessage: null,
    hasKey: key.length > 0,
  });

  useEffect(() => {
    if (!key) return;

    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : null;
    const blockedMessage = getKakaoSdkBlockedMessage({
      currentOrigin,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    if (blockedMessage) {
      setState({
        ready: false,
        error: null,
        blockedMessage,
        hasKey: true,
      });
      return;
    }

    // Already loaded? (HMR reload, multi-consumer mount)
    if (
      typeof window !== "undefined" &&
      (window as unknown as { kakao?: { maps?: { load?: unknown } } }).kakao
        ?.maps?.load
    ) {
      window.kakao.maps.load(() => {
        setState({
          ready: true,
          error: null,
          blockedMessage: null,
          hasKey: true,
        });
      });
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const handleLoad = () => {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { kakao?: { maps?: { load?: unknown } } }).kakao
          ?.maps?.load
      ) {
        window.kakao.maps.load(() => {
          setState({
            ready: true,
            error: null,
            blockedMessage: null,
            hasKey: true,
          });
        });
      } else {
        setState({
          ready: false,
          error:
            "카카오 지도 SDK 초기화가 완료되지 않았습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.",
          blockedMessage: null,
          hasKey: true,
        });
      }
    };

    const handleError = () => {
      setState({
        ready: false,
        error: getKakaoSdkLoadErrorMessage(currentOrigin),
        blockedMessage: null,
        hasKey: true,
      });
    };

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
      // `autoload=false` lets us control initialization timing via
      // kakao.maps.load(callback). Without this, the SDK initializes
      // synchronously during script eval and can race with our hook.
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
        key,
      )}&autoload=false`;
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, [key]);

  return state;
}
