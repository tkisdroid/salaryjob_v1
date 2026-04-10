"use client";

/**
 * Phase 4 Plan 04-09 — Dialog primitive re-export shim.
 *
 * The shadcn/radix `dialog` primitive is not installed in this project —
 * `@base-ui/react/dialog` is the native primitive the rest of the
 * codebase targets (see src/components/worker/cancel-application-dialog.tsx
 * for the alert-dialog counterpart).
 *
 * This file re-exports the base-ui Dialog parts under the standard shadcn
 * naming scheme (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`,
 * `DialogTitle`, `DialogDescription`, `DialogClose`) so callsites written
 * against shadcn's API can import from `@/components/ui/dialog` without
 * coupling to base-ui's `Dialog.Root` / `Dialog.Popup` naming.
 *
 * `DialogContent` here is a thin wrapper that combines `Portal + Backdrop
 * + Popup` with sensible defaults so the common case is a one-liner at
 * callsites. Callers needing custom backdrop styling can import the raw
 * `Dialog` namespace from `@base-ui/react/dialog` directly.
 */

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;
export const DialogTitle = BaseDialog.Title;
export const DialogDescription = BaseDialog.Description;

type DialogContentProps = ComponentProps<typeof BaseDialog.Popup> & {
  children?: ReactNode;
};

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
      <BaseDialog.Popup
        {...props}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl",
          className,
        )}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-left", className)}
      {...props}
    />
  );
}
