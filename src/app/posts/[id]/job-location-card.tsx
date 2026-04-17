"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateDistanceMeters } from "@/lib/distance";
import { formatDistance } from "@/lib/format";
import { useKakaoMapsSDK } from "@/lib/hooks/use-kakao-maps-sdk";
import { cn } from "@/lib/utils";
import { LoaderCircle, MapPin, Navigation } from "lucide-react";

interface Props {
  businessName: string;
  address: string;
  addressDetail: string;
  lat: number;
  lng: number;
}

interface Coordinates {
  lat: number;
  lng: number;
}

type LocationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unsupported"
  | "denied"
  | "error";

function isValidCoordinate(value: number): boolean {
  return Number.isFinite(value);
}

function getGeolocationErrorMessage(code: number): {
  status: Exclude<LocationStatus, "idle" | "loading" | "ready">;
  message: string;
} {
  switch (code) {
    case 1:
      return {
        status: "denied",
        message:
          "위치 권한이 꺼져 있어 현재 위치 기준 거리를 보여드릴 수 없어요. 브라우저에서 위치 접근을 허용한 뒤 다시 시도해주세요.",
      };
    case 3:
      return {
        status: "error",
        message:
          "현재 위치를 확인하는 데 시간이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.",
      };
    default:
      return {
        status: "error",
        message:
          "현재 위치를 확인하지 못했어요. GPS 또는 네트워크 상태를 확인한 뒤 다시 시도해주세요.",
      };
  }
}

export function JobLocationCard({
  businessName,
  address,
  addressDetail,
  lat,
  lng,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const businessMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const userMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const userCircleRef = useRef<kakao.maps.Circle | null>(null);
  const { ready, error, blockedMessage, hasKey } = useKakaoMapsSDK();

  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(
    "위치 권한을 허용하면 현재 위치 기준 거리를 보여드려요.",
  );
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);

  const hasMapCoordinates =
    isValidCoordinate(lat) && isValidCoordinate(lng);

  const workplaceCoords = useMemo(
    () => ({
      lat,
      lng,
    }),
    [lat, lng],
  );

  const distanceM = useMemo(() => {
    if (!userCoords || !hasMapCoordinates) return null;
    return Math.round(calculateDistanceMeters(userCoords, workplaceCoords));
  }, [hasMapCoordinates, userCoords, workplaceCoords]);

  const requestCurrentLocation = useCallback((silent: boolean = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("unsupported");
      setLocationMessage(
        "이 브라우저에서는 현재 위치를 확인할 수 없어 거리 계산을 지원하지 않습니다.",
      );
      return;
    }

    setLocationStatus("loading");
    if (!silent) {
      setLocationMessage("현재 위치를 확인하고 있어요...");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
        setLocationMessage(null);
      },
      (error) => {
        const next = getGeolocationErrorMessage(error.code);
        setLocationStatus(next.status);
        setLocationMessage(next.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 60_000,
      },
    );
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.geolocation ||
      !navigator.permissions?.query
    ) {
      return;
    }

    let cancelled = false;

    void navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;

        if (result.state === "granted") {
          requestCurrentLocation(true);
          return;
        }

        if (result.state === "denied") {
          setLocationStatus("denied");
          setLocationMessage(
            "위치 권한이 꺼져 있어 현재 위치 기준 거리를 보여드릴 수 없어요. 브라우저에서 위치 접근을 허용한 뒤 다시 시도해주세요.",
          );
        }
      })
      .catch(() => {
        // Permissions API is optional. Keep the manual CTA path when unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (!ready || !containerRef.current || !hasMapCoordinates) return;

    const kakao = window.kakao;
    const destination = new kakao.maps.LatLng(lat, lng);

    if (!mapRef.current) {
      const map = new kakao.maps.Map(containerRef.current, {
        center: destination,
        level: 4,
      });
      mapRef.current = map;
      requestAnimationFrame(() => map.relayout());
    }

    const map = mapRef.current;
    if (!map) return;

    if (!businessMarkerRef.current) {
      businessMarkerRef.current = new kakao.maps.Marker({
        map,
        position: destination,
        title: businessName,
      });
    } else {
      businessMarkerRef.current.setMap(map);
      businessMarkerRef.current.setPosition(destination);
      businessMarkerRef.current.setTitle(businessName);
    }

    if (!userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.setMap(null);
        userCircleRef.current = null;
      }
      map.setCenter(destination);
      map.setLevel(4);
      return;
    }

    const current = new kakao.maps.LatLng(userCoords.lat, userCoords.lng);

    if (!userMarkerRef.current) {
      userMarkerRef.current = new kakao.maps.Marker({
        map,
        position: current,
        title: "현재 위치",
      });
    } else {
      userMarkerRef.current.setMap(map);
      userMarkerRef.current.setPosition(current);
      userMarkerRef.current.setTitle("현재 위치");
    }

    if (!userCircleRef.current) {
      userCircleRef.current = new kakao.maps.Circle({
        center: current,
        radius: 120,
        strokeWeight: 2,
        strokeColor: "#2382F7",
        strokeOpacity: 0.45,
        fillColor: "#BFDBFE",
        fillOpacity: 0.24,
      });
    } else {
      userCircleRef.current.setPosition(current);
      userCircleRef.current.setRadius(120);
    }
    userCircleRef.current.setMap(map);

    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(destination);
    bounds.extend(current);
    map.setBounds(bounds);
  }, [businessName, hasMapCoordinates, lat, lng, ready, userCoords]);

  useEffect(() => {
    return () => {
      businessMarkerRef.current?.setMap(null);
      userMarkerRef.current?.setMap(null);
      userCircleRef.current?.setMap(null);
      businessMarkerRef.current = null;
      userMarkerRef.current = null;
      userCircleRef.current = null;
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.008em] text-foreground">
            {address}
          </p>
          {addressDetail ? (
            <p className="mt-1 text-[12px] text-muted-foreground">
              {addressDetail}
            </p>
          ) : null}
        </div>
        {distanceM !== null ? (
          <span className="inline-flex items-center rounded-full bg-brand-light px-3 py-1 text-[12px] font-semibold text-brand-deep">
            현재 위치에서 {formatDistance(distanceM)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-brand" />
          근무지
        </span>
        {userCoords ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[#2382F7]" />
            내 위치
          </span>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto rounded-full border-brand/25 text-xs text-brand-deep hover:bg-brand-light"
          onClick={() => requestCurrentLocation()}
          disabled={locationStatus === "loading"}
        >
          {locationStatus === "loading" ? (
            <>
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              현재 위치 확인 중
            </>
          ) : userCoords ? (
            <>
              <Navigation className="h-3.5 w-3.5" />
              현재 위치 다시 확인
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5" />
              현재 위치 기준 거리 확인
            </>
          )}
        </Button>
      </div>

      {locationMessage ? (
        <p
          className={cn(
            "mt-2 text-[12px] leading-[1.6]",
            locationStatus === "denied" || locationStatus === "error"
              ? "text-[color:var(--amber-deep)]"
              : "text-muted-foreground",
          )}
        >
          {locationMessage}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted/40">
        {!hasMapCoordinates ? (
          <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            저장된 좌표가 없어 지도를 표시할 수 없습니다.
          </div>
        ) : !hasKey ? (
          <div className="flex h-56 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            카카오 지도 키가 설정되면 근무 위치 지도를 바로 보여드릴게요.
          </div>
        ) : blockedMessage ? (
          <div className="p-4">
            <Alert>
              <AlertDescription>{blockedMessage}</AlertDescription>
            </Alert>
          </div>
        ) : error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={containerRef}
              data-testid="job-location-map"
              className="h-56 w-full bg-muted"
            />
            {!ready ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-xs font-medium text-muted-foreground">
                지도를 불러오는 중...
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
