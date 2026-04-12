"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Hourglass,
  CheckCircle2,
  XCircle,
  Zap,
  CheckCheck,
  Star,
  Briefcase,
  Inbox,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  acceptApplication,
  rejectApplication,
} from "./actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";
import { subscribeApplicationsForJob } from "@/lib/supabase/realtime";
import type { SerializedApplication } from "./page";

/**
 * Phase 4 Plan 04-09 — /biz/posts/[id]/applicants client runtime.
 *
 * Wires Accept / Reject Server Actions, Supabase Realtime (+ D-08 polling
 * fallback), and the 30-minute auto-accept progress indicator onto the
 * server-fetched applicant list.
 *
 * D-08 polling fallback: if the Realtime channel fails (CHANNEL_ERROR /
 * TIMED_OUT), a 60-second `setInterval` kicks in to `router.refresh()`.
 * The Biz-side EXISTS-JOIN SELECT RLS (Plan 04-03) has RESEARCH Q#4
 * uncertainty around Realtime dispatch evaluation, so polling fallback is
 * MANDATORY here — not "nice to have".
 *
 * Auto-accept timer: Phase 4 D-03 auto-accepts pending applications 30
 * minutes after they are submitted. The card shows a progress bar ticking
 * toward the auto-accept moment so the Business understands the clock.
 */

type Props = {
  jobId: string;
  initialApplications: SerializedApplication[];
};

const AUTO_ACCEPT_MS = 30 * 60 * 1000; // D-03: 30 minutes

export function ApplicantsClient({ jobId, initialApplications }: Props) {
  const router = useRouter();
  const [apps, setApps] = useState<SerializedApplication[]>(
    initialApplications,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // D-08 fallback: set to true when Realtime reports CHANNEL_ERROR / TIMED_OUT.
  // Must NOT rename this identifier — verify step greps for "pollingActive".
  const [pollingActive, setPollingActive] = useState(false);

  // Re-sync local state whenever the server props refresh.
  useEffect(() => {
    setApps(initialApplications);
  }, [initialApplications]);

  // Realtime subscription — primary update path.
  useEffect(() => {
    const unsubscribe = subscribeApplicationsForJob(
      jobId,
      (payload) => {
        startTransition(() => {
          router.refresh();
          // Optimistic merge so the Biz sees instant feedback even before
          // the server component finishes re-rendering.
          if (payload.eventType === "INSERT" && payload.new) {
            setApps((prev) => {
              const incoming = payload.new as unknown as SerializedApplication;
              if (prev.some((a) => a.id === incoming.id)) return prev;
              toast.info("새 지원자가 있습니다");
              return [...prev, incoming];
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setApps((prev) =>
              prev.map((a) =>
                a.id === (payload.new as { id?: string }).id
                  ? {
                      ...a,
                      ...(payload.new as unknown as SerializedApplication),
                    }
                  : a,
              ),
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            setApps((prev) =>
              prev.filter(
                (a) => a.id !== (payload.old as { id?: string }).id,
              ),
            );
          }
        });
      },
      (status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setPollingActive(true);
        } else if (status === "SUBSCRIBED") {
          setPollingActive(false);
        }
      },
    );
    return unsubscribe;
  }, [jobId, router]);

  // D-08 polling fallback — only runs while Realtime is unhealthy.
  useEffect(() => {
    if (!pollingActive) return;
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [pollingActive, router]);

  async function handleAccept(applicationId: string) {
    setPendingId(applicationId);
    const result = await acceptApplication(applicationId);
    setPendingId(null);
    if (result.success) {
      toast.success("수락되었습니다");
      // Optimistic: flip the local row immediately.
      setApps((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: "confirmed" } : a,
        ),
      );
      router.refresh();
    } else {
      toast.error(applicationErrorToKorean(result.error));
    }
  }

  async function handleReject(applicationId: string) {
    setPendingId(applicationId);
    const result = await rejectApplication(applicationId);
    setPendingId(null);
    if (result.success) {
      toast.success("거절되었습니다");
      setApps((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: "cancelled" } : a,
        ),
      );
      router.refresh();
    } else {
      toast.error(applicationErrorToKorean(result.error));
    }
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium">
          아직 지원자가 없습니다
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          공고가 노출되면 Worker의 지원이 여기 실시간으로 표시돼요
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      {apps.map((app) => (
        <ApplicantCard
          key={app.id}
          app={app}
          pending={pendingId === app.id}
          onAccept={() => handleAccept(app.id)}
          onReject={() => handleReject(app.id)}
        />
      ))}
    </ul>
  );
}

function ApplicantCard({
  app,
  pending,
  onAccept,
  onReject,
}: {
  app: SerializedApplication;
  pending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const showAutoAcceptTimer = app.status === "pending";
  const [percentElapsed, setPercentElapsed] = useState(0);

  useEffect(() => {
    if (!showAutoAcceptTimer) return;
    const appliedAt = new Date(app.appliedAt).getTime();
    function tick() {
      const elapsed = Date.now() - appliedAt;
      const pct = Math.min(100, (elapsed / AUTO_ACCEPT_MS) * 100);
      setPercentElapsed(pct);
    }
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [app.appliedAt, showAutoAcceptTimer]);

  const profile = app.workerProfile;
  const displayName = app.worker.name || "익명";
  const ratingNum = Number(profile?.rating ?? 0);
  const totalJobs = profile?.totalJobs ?? 0;
  const avatar = app.worker.avatar ?? "👤";
  const minutesLeft = Math.max(
    0,
    Math.round(30 - (percentElapsed * 30) / 100),
  );
  const canAct = app.status === "pending";

  return (
    <li className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <Link
        href={`/biz/posts/${app.jobId}/applicants/${app.id}`}
        className="block rounded-xl transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <div className="flex items-start gap-3 p-1">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-brand text-brand" />
                {ratingNum.toFixed(1)}
              </span>
              <span>&#183;</span>
              <span className="flex items-center gap-0.5">
                <Briefcase className="w-3 h-3" />
                완료 {totalJobs}회
              </span>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </Link>

      {showAutoAcceptTimer && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>자동 수락까지</span>
            <span className="tabular-nums">
              {minutesLeft}분 남음
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(percentElapsed)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="자동 수락 타이머"
          >
            <div
              className="h-full bg-teal transition-[width] duration-500 ease-linear"
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
        </div>
      )}

      {canAct && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onAccept}
            disabled={pending}
            className="flex-1 h-9 rounded-lg bg-teal text-white text-xs font-bold hover:bg-teal/90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            수락
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={pending}
            className="flex-1 h-9 rounded-lg border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            거절
          </button>
        </div>
      )}
    </li>
  );
}

const STATUS_BADGE: Record<
  SerializedApplication["status"],
  { label: string; className: string; Icon: typeof Hourglass }
> = {
  pending: {
    label: "대기 중",
    className: "bg-muted text-muted-foreground",
    Icon: Hourglass,
  },
  confirmed: {
    label: "수락됨",
    className: "bg-teal/10 text-teal",
    Icon: CheckCircle2,
  },
  checked_in: {
    label: "체크인",
    className: "bg-sky-500/10 text-sky-700",
    Icon: CheckCircle2,
  },
  in_progress: {
    label: "근무 중",
    className: "bg-emerald-500/10 text-emerald-700",
    Icon: Zap,
  },
  completed: {
    label: "완료",
    className: "bg-muted text-muted-foreground",
    Icon: CheckCheck,
  },
  settled: {
    label: "정산 완료",
    className: "bg-brand/10 text-brand-deep",
    Icon: CheckCheck,
  },
  cancelled: {
    label: "거절됨",
    className: "bg-destructive/10 text-destructive",
    Icon: XCircle,
  },
};

function StatusBadge({
  status,
}: {
  status: SerializedApplication["status"];
}) {
  const entry = STATUS_BADGE[status];
  const Icon = entry.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${entry.className}`}
    >
      <Icon className="w-3 h-3" />
      {entry.label}
    </span>
  );
}
