"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Phase 4 Plan 04-08 — Supabase Realtime helpers for `public.applications`.
 *
 * Wraps `supabase.channel(...).on('postgres_changes', ...)` so consuming UI
 * code does not need to juggle channel names, cleanup, or the raw payload
 * shape. Each helper returns an `unsubscribe` function suitable for
 * `useEffect(..., [])` return values.
 *
 * Publication setup: Plan 04-03 migration `20260411000002_realtime.sql`
 * added `public.applications` to the `supabase_realtime` publication, so
 * INSERT/UPDATE/DELETE events are already broadcast server-side. RLS
 * policies (`20260412000001`) gate which rows each subscriber receives —
 * workers only see their own rows, business owners only see rows for
 * jobs they own.
 *
 * D-08 polling fallback: `onStatusChange` exposes the channel status so the
 * caller can react to `CHANNEL_ERROR` / `TIMED_OUT` by toggling a 60-second
 * polling loop (via `router.refresh()`). The fallback is essential because
 * Realtime can silently fail when network conditions are degraded, and the
 * Biz-side EXISTS-JOIN filter (Plan 04-09) has additional uncertainty.
 */

// The Supabase channel status transitions we care about. Typed narrowly so
// the UI callsite can use a `switch` without casts.
export type RealtimeChannelStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

export type ApplicationChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export type ApplicationChangeHandler = (
  payload: ApplicationChangePayload,
) => void;

export type RealtimeStatusHandler = (status: RealtimeChannelStatus) => void;

/**
 * Subscribe to postgres_changes on `public.applications` filtered to rows
 * owned by a single worker. RLS also enforces this server-side, so the
 * filter is belt-and-suspenders — it reduces unneeded payloads on the wire.
 *
 * Returns an unsubscribe function. Call it on effect cleanup.
 */
export function subscribeApplicationsForWorker(
  workerId: string,
  onChange: ApplicationChangeHandler,
  onStatusChange?: RealtimeStatusHandler,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`applications:worker:${workerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "applications",
        filter: `workerId=eq.${workerId}`,
      },
      (payload: {
        eventType: ApplicationChangePayload["eventType"];
        new: Record<string, unknown> | null;
        old: Record<string, unknown> | null;
      }) => {
        onChange({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      },
    )
    .subscribe((status) => {
      onStatusChange?.(status as RealtimeChannelStatus);
    });

  return () => {
    // fire-and-forget; removeChannel returns a promise but we don't await it
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to postgres_changes on `public.applications` filtered to rows
 * for a specific job (Biz-side view). Used by Plan 04-09
 * `/biz/posts/[id]/applicants` to live-update the applicant list when
 * workers apply, cancel, or the pg_cron auto-accept sweep runs.
 *
 * Returns an unsubscribe function. Call it on effect cleanup.
 */
export function subscribeApplicationsForJob(
  jobId: string,
  onChange: ApplicationChangeHandler,
  onStatusChange?: RealtimeStatusHandler,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`applications:job:${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "applications",
        filter: `jobId=eq.${jobId}`,
      },
      (payload: {
        eventType: ApplicationChangePayload["eventType"];
        new: Record<string, unknown> | null;
        old: Record<string, unknown> | null;
      }) => {
        onChange({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        });
      },
    )
    .subscribe((status) => {
      onStatusChange?.(status as RealtimeChannelStatus);
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
