"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface UrgentTriggerButtonProps {
  readonly postId: string;
  readonly onTriggered?: (notifiedCount: number) => void;
}

type TriggerState =
  | "idle"
  | "confirming"
  | "loading"
  | "success";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function UrgentTriggerButton({
  postId,
  onTriggered,
}: UrgentTriggerButtonProps) {
  const [state, setState] = useState<TriggerState>("idle");
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer for success state
  useEffect(() => {
    if (state !== "success" || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state, remainingSeconds]);

  const handleClick = useCallback(() => {
    setState("confirming");
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/matching/urgent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          radiusKm: 2,
          timeoutMinutes: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "\uAE09\uAD6C \uB9E4\uCE6D\uC744 \uC2DC\uC791\uD560 \uC218 \uC5C6\uC5B4\uC694.");
      }

      setNotifiedCount(data.notifiedWorkers);
      setRemainingSeconds(10 * 60); // 10 minutes
      setState("success");
      onTriggered?.(data.notifiedWorkers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "\uAE09\uAD6C \uB9E4\uCE6D\uC744 \uC2DC\uC791\uD560 \uC218 \uC5C6\uC5B4\uC694."
      );
      setState("idle");
    }
  }, [postId, onTriggered]);

  // Idle state: show trigger button
  if (state === "idle") {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="destructive" onClick={handleClick}>
          {"\u26A1 \uAE09\uAD6C \uB9E4\uCE6D \uC2DC\uC791"}
        </Button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Confirming state: show confirmation dialog inline
  if (state === "confirming") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm font-medium text-red-900 dark:text-red-100">
          {"\uBC18\uACBD 2km \uB0B4 \uAC00\uC6A9 \uC778\uB825\uC5D0\uAC8C \uC54C\uB9BC\uC744 \uBCF4\uB0BC\uAE4C\uC694?"}
        </p>
        <p className="text-xs text-red-700 dark:text-red-300">
          {"10\uBD84 \uD6C4 \uC790\uB3D9 \uB9CC\uB8CC\uB429\uB2C8\uB2E4."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={handleConfirm}
          >
            {"\uB124, \uBCF4\uB0B4\uACA0\uC2B5\uB2C8\uB2E4"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            {"\uCDE8\uC18C"}
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <Button variant="destructive" disabled>
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {"\uC54C\uB9BC \uBCF4\uB0B4\uB294 \uC911..."}
      </Button>
    );
  }

  // Success state: show result with countdown
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
      <p className="text-sm font-medium text-green-900 dark:text-green-100">
        {`${notifiedCount}\uBA85\uC5D0\uAC8C \uC54C\uB9BC\uC744 \uBCF4\uB0C8\uC5B4\uC694!`}
      </p>
      <p className="text-xs text-green-700 dark:text-green-300">
        {"10\uBD84 \uB0B4 \uC218\uB77D\uC744 \uAE30\uB2E4\uB9AC\uACE0 \uC788\uC5B4\uC694."}
      </p>
      {remainingSeconds > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-green-200 dark:bg-green-800">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-1000"
              style={{ width: `${(remainingSeconds / 600) * 100}%` }}
            />
          </div>
          <span className="tabular-nums text-xs font-semibold text-green-700 dark:text-green-300">
            {formatCountdown(remainingSeconds)}
          </span>
        </div>
      )}
      {remainingSeconds <= 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          {"\uB9E4\uCE6D \uC2DC\uAC04\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC5B4\uC694."}
        </p>
      )}
    </div>
  );
}
