"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 4 Plan 04-09 — Lightweight in-house ScrollArea primitive.
 *
 * The shadcn `@radix-ui/react-scroll-area` primitive is not installed in
 * this project. Since modern Safari / Chrome / Firefox scrollbars on
 * overflow containers already provide the visual affordance we need, this
 * shim just wraps a styled div that enables `overflow-y-auto`. Swap this
 * file for the real shadcn primitive if a future plan needs custom
 * scrollbar skinning.
 *
 * Accepts the standard shadcn signature (`className`, children) so
 * callsites can migrate without a rewrite.
 */

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement>;

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative overflow-y-auto pr-1", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ScrollArea.displayName = "ScrollArea";
