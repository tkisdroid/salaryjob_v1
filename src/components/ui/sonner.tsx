"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

/**
 * Phase 4 Plan 04-08 — Lightweight in-house Toaster.
 *
 * The `sonner` npm package is not installed in the worktree (see Plan 04-08
 * deviation log). This file provides a compatible minimal API —
 * `<Toaster />` component + a `toast` helper with `success / error /
 * warning / info` variants — so call sites that expect `sonner` semantics
 * can be swapped later by changing the import path.
 *
 * Intentional scope:
 *   - In-memory queue (no context provider required — module-level state
 *     is fine for a single root Toaster)
 *   - 4-second auto-dismiss, manual dismiss via X button
 *   - Stacked bottom-center layout, mobile-first
 *   - No promise / loading / action variants — add if a callsite needs them
 *
 * If a future plan needs the full sonner feature surface (promises,
 * stacking animations, custom render), `npm install sonner` and replace
 * this file's re-exports with `export { toast, Toaster } from "sonner";`.
 */

type Variant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: Variant;
};

type Listener = (items: ToastItem[]) => void;

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(items.slice());
}

function push(variant: Variant, title: string, description?: string) {
  const id = nextId++;
  const item: ToastItem = { id, title, description, variant };
  items = [...items, item];
  emit();
  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 4000);
}

function dismiss(id: number) {
  items = items.filter((i) => i.id !== id);
  emit();
}

export const toast = {
  success: (title: string, description?: string) =>
    push("success", title, description),
  error: (title: string, description?: string) =>
    push("error", title, description),
  warning: (title: string, description?: string) =>
    push("warning", title, description),
  info: (title: string, description?: string) =>
    push("info", title, description),
};

type ToasterProps = {
  position?: "top-center" | "bottom-center";
  richColors?: boolean;
};

/**
 * Mount once at the root layout. Subscribes to the module-level queue and
 * renders stacked toasts. Does nothing on the server — effects only fire
 * on the client, matching sonner's SSR-safe behavior.
 */
export function Toaster({
  position = "bottom-center",
}: ToasterProps = {}) {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (next) => setQueue(next);
    listeners.add(listener);
    // Seed with any queued items that came in before mount
    listener(items);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const handleDismiss = useCallback((id: number) => dismiss(id), []);

  if (queue.length === 0) return null;

  const positionClass =
    position === "top-center"
      ? "top-4 left-1/2 -translate-x-1/2"
      : "bottom-4 left-1/2 -translate-x-1/2";

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 px-4 w-full max-w-sm pointer-events-none ${positionClass}`}
      aria-live="polite"
      role="region"
      aria-label="알림"
    >
      {queue.map((item) => (
        <ToastRow
          key={item.id}
          item={item}
          onDismiss={() => handleDismiss(item.id)}
        />
      ))}
    </div>
  );
}

function ToastRow({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const Icon =
    item.variant === "success"
      ? CheckCircle2
      : item.variant === "error"
        ? XCircle
        : item.variant === "warning"
          ? AlertTriangle
          : Info;
  const colorClass =
    item.variant === "success"
      ? "border-brand/30 bg-brand-light text-brand-deep"
      : item.variant === "error"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : item.variant === "warning"
          ? "border-brand/30 bg-brand-light text-brand-deep"
          : "border-border bg-card text-foreground";
  const iconColor =
    item.variant === "success"
      ? "text-brand"
      : item.variant === "error"
        ? "text-destructive"
        : item.variant === "warning"
          ? "text-brand-deep"
          : "text-muted-foreground";

  return (
    <div
      className={`pointer-events-auto rounded-lg border shadow-lg px-4 py-3 flex items-start gap-3 ${colorClass}`}
      role="status"
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{item.title}</p>
        {item.description && (
          <p className="text-xs opacity-80 mt-0.5">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="닫기"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
