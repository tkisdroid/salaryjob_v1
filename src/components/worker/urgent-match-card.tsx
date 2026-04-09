"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UrgentMatchCardProps {
  readonly postId: string;
  readonly title: string;
  readonly companyName: string;
  readonly pay: string;
  readonly distance: string;
  readonly expiresAt: string; // ISO date string
  readonly onAccepted?: (applicationId: string, chatRoomId: string) => void;
  readonly onDeclined?: () => void;
}

type CardState = "active" | "expired" | "accepted" | "loading";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function UrgentMatchCard({
  postId,
  title,
  companyName,
  pay,
  distance,
  expiresAt,
  onAccepted,
  onDeclined,
}: UrgentMatchCardProps) {
  const [cardState, setCardState] = useState<CardState>("active");
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const diff = Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000
    );
    return Math.max(0, diff);
  });
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (cardState !== "active") return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setCardState("expired");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cardState]);

  const handleAccept = useCallback(async () => {
    setCardState("loading");
    setError(null);

    try {
      const response = await fetch("/api/matching/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "수락에 실패했어요.");
      }

      setCardState("accepted");
      onAccepted?.(data.applicationId, data.chatRoomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수락에 실패했어요.");
      setCardState("active");
    }
  }, [postId, onAccepted]);

  const handleDecline = useCallback(() => {
    onDeclined?.();
  }, [onDeclined]);

  const isExpired = cardState === "expired";
  const isAccepted = cardState === "accepted";
  const isLoading = cardState === "loading";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isExpired && "opacity-60 grayscale",
        isAccepted && "ring-2 ring-green-500"
      )}
    >
      {/* Urgent badge with pulse animation */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isExpired && !isAccepted && (
              <span className="relative flex h-6 items-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-50" />
                <span className="relative">{"\uAE09\uAD6C"}</span>
              </span>
            )}
            {isExpired && (
              <span className="flex h-6 items-center rounded-full bg-gray-400 px-2 text-xs font-bold text-white">
                {"\uC2DC\uAC04 \uB9CC\uB8CC"}
              </span>
            )}
            {isAccepted && (
              <span className="flex h-6 items-center gap-1 rounded-full bg-green-500 px-2 text-xs font-bold text-white">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {"\uC218\uB77D \uC644\uB8CC!"}
              </span>
            )}
          </div>
          {!isExpired && !isAccepted && (
            <span className="tabular-nums text-sm font-semibold text-red-600">
              {formatCountdown(remainingSeconds)}
            </span>
          )}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{companyName}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pay}</span>
          <span>{distance}</span>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </CardContent>

      {!isExpired && !isAccepted && (
        <CardFooter className="gap-2">
          <Button
            className="flex-1"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? "\uC218\uB77D \uC911..." : "\uC218\uB77D\uD558\uAE30"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDecline}
            disabled={isLoading}
          >
            {"\uAC70\uC808"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
