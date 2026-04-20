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
      <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-surface py-16 text-center">
        <Inbox className="mb-4 h-12 w-12 text-text-subtle" />
        <p className="text-[15px] font-extrabold tracking-tight text-ink">
          아직 지원자가 없습니다
        </p>
        <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
          공고가 노출되면 Worker의 지원이 여기 실시간으로 표시돼요
        </p>
      </div>
    );
  }

  return (
    <ul className="max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
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
    <li className="space-y-3 rounded-[22px] border border-border-soft bg-surface p-[18px] transition-colors hover:border-ink">
      <Link
        href={`/biz/posts/${app.jobId}/applicants/${app.id}`}
        className="block rounded-[14px] transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <div className="flex items-start gap-3 p-1">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
            {avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-extrabold tracking-[-0.02em] text-ink">
              {displayName}
            </p>
            <div className="tabnum mt-0.5 flex items-center gap-2 text-[11.5px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
                <b className="font-bold text-ink">{ratingNum.toFixed(1)}</b>
              </span>
              <span className="text-text-subtle">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Briefcase className="h-3 w-3" />
                완료 <b className="font-bold text-ink">{totalJobs}회</b>
              </span>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </Link>

      {showAutoAcceptTimer && (
        <div>
          <div className="mb-1.5 flex justify-between text-[11.5px] font-semibold text-muted-foreground">
            <span>자동 수락까지</span>
            <span className="tabnum font-bold text-ink">
              {minutesLeft}분 남음
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(percentElapsed)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="자동 수락 타이머"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-linear"
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
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink text-[12.5px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            수락
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={pending}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/30 bg-surface text-[12.5px] font-bold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
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
    className: "bg-surface-2 text-muted-foreground",
    Icon: Hourglass,
  },
  confirmed: {
    label: "수락됨",
    className: "bg-brand text-ink",
    Icon: CheckCircle2,
  },
  checked_in: {
    label: "체크인",
    className: "bg-lime-chip text-lime-chip-fg",
    Icon: CheckCircle2,
  },
  in_progress: {
    label: "근무 중",
    className: "bg-lime-chip text-lime-chip-fg",
    Icon: Zap,
  },
  completed: {
    label: "완료",
    className: "bg-ink text-white",
    Icon: CheckCheck,
  },
  settled: {
    label: "정산 완료",
    className: "bg-ink text-white",
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
      className={`inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${entry.className}`}
    >
      <Icon className="h-3 w-3" />
      {entry.label}
    </span>
  );
}
