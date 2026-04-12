"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin, Navigation, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommuteTimerProps {
  readonly companyName: string;
  readonly address: string;
  readonly startTime: Date;
  readonly lat: number;
  readonly lng: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeRemaining(startTime: Date): {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const diff = startTime.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));

  return {
    totalSeconds,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isExpired: totalSeconds <= 0,
  };
}

function getInitialTotalSeconds(startTime: Date): number {
  const diff = startTime.getTime() - Date.now();
  return Math.max(1, Math.floor(diff / 1000));
}

function buildKakaoMapUrl(lat: number, lng: number, name: string): string {
  // Kakao Map directions URL with destination coordinates
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}

function formatPad(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Progress Ring Component
// ---------------------------------------------------------------------------

function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 6,
}: {
  readonly progress: number;
  readonly size?: number;
  readonly strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      className="rotate-[-90deg]"
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn(
          "transition-[stroke-dashoffset] duration-1000",
          progress > 0.3 ? "text-brand" : "text-[color:var(--urgent)]",
        )}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CommuteTimer({
  companyName,
  address,
  startTime,
  lat,
  lng,
}: CommuteTimerProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(startTime));

  // Store initial total seconds for progress calculation
  const initialTotalSeconds = useMemo(
    () => getInitialTotalSeconds(startTime),
    [startTime],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(computeRemaining(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const progress = remaining.totalSeconds / initialTotalSeconds;
  const kakaoUrl = buildKakaoMapUrl(lat, lng, companyName);

  return (
    <Card className={cn(remaining.isExpired && "ring-2 ring-brand")}>
      <CardContent className="flex flex-col items-center gap-4 py-6">
        {/* Progress ring with countdown */}
        <div className="relative flex items-center justify-center">
          <ProgressRing progress={Math.max(0, Math.min(1, progress))} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {remaining.isExpired ? (
              <div className="flex flex-col items-center gap-1 animate-pulse">
                <AlertCircle className="w-6 h-6 text-brand" />
                <span className="text-xs font-bold text-brand">출발!</span>
              </div>
            ) : (
              <>
                <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                <span className="text-lg font-bold tabular-nums">
                  {remaining.hours > 0 && `${remaining.hours}:`}
                  {formatPad(remaining.minutes)}:{formatPad(remaining.seconds)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status text */}
        {remaining.isExpired ? (
          <p className="text-base font-bold text-brand animate-pulse">
            지금 출발하세요!
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            출발까지{" "}
            <span className="font-bold text-foreground">
              {remaining.hours > 0 && `${remaining.hours}시간 `}
              {remaining.minutes}분
            </span>
          </p>
        )}

        {/* Company info */}
        <div className="w-full space-y-1 text-center">
          <p className="font-bold text-sm">{companyName}</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {address}
          </p>
        </div>

        {/* Kakao Map button */}
        <Button
          className="w-full bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD835] font-bold"
          asChild
        >
          <a href={kakaoUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="w-4 h-4" />
            카카오맵으로 길찾기
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
