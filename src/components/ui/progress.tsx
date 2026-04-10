"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 4 Plan 04-09 — Lightweight in-house Progress primitive.
 *
 * The shadcn `@radix-ui/react-progress` primitive is not installed in this
 * project (the codebase uses `@base-ui/react` for complex primitives). This
 * file provides a minimal drop-in replacement that accepts the same
 * `value` / `className` props so future plans can swap the import path for
 * the real shadcn/radix component without touching callsites.
 *
 * Supports 0..100 percentage display. Renders role="progressbar" with the
 * proper aria attributes so screen readers announce the progress state.
 */

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value?: number | null;
  max?: number;
  /** Optional class forwarded onto the inner filled indicator. */
  indicatorClassName?: string;
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    { value, max = 100, className, indicatorClassName, ...props },
    ref,
  ) => {
    const clamped =
      typeof value === "number"
        ? Math.max(0, Math.min(max, value))
        : 0;
    const pct = max === 0 ? 0 : (clamped / max) * 100;
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-primary transition-[width] duration-500 ease-linear",
            indicatorClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";
