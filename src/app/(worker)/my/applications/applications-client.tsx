"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Building2,
  Calendar,
  Wallet,
  Inbox,
  Hourglass,
  CheckCircle2,
  Zap,
  CheckCheck,
  QrCode,
  MapPin,
  Clock,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { formatWorkDate } from "@/lib/job-utils";
import { subscribeApplicationsForWorker } from "@/lib/supabase/realtime";
import { CancelApplicationDialog } from "@/components/worker/cancel-application-dialog";

/**
 * Phase 4 Plan 04-08 — /my/applications client runtime.
 *
 * Tab-based filter across three DB-derived buckets (pre-fetched server-side
 * in page.tsx). Supabase Realtime postgres_changes subscription flips the
 * `isStale` flag and calls `router.refresh()` whenever the worker's own
 * applications row changes — typical triggers are Business accept/reject,
 * the auto-accept pg_cron sweep, or shift state transitions.
 *
 * D-08 polling fallback: if the Realtime channel fails (CHANNEL_ERROR /
 * TIMED_OUT), a 60-second `setInterval` kicks in to router.refresh. This is
 * the MUST fallback committed in Plan 04-CONTEXT.md — Realtime is best
 * effort, but the 완료/수락 UX must not silently stall.
 */

// Shape returned by getApplicationsByWorker after JSON round-trip through
// the server → client boundary. Decimals become strings, Dates become
// strings — everything we touch is displayed, not operated on, so string
// is fine.
type AppRow = {
  id: string;
  jobId: string;
  workerId: string;
  // Phase 5 added 'settled' as the new terminal state for checked-out
  // applications. 'completed' is kept for legacy pre-Phase-5 rows that
  // the data migration did not catch (rows with checkOutAt IS NULL, or
  // partial states). STATUS_CONFIG must have an entry for every value
  // here — when it didn't, rendering ApplicationCard for a settled row
  // crashed because `STATUS_CONFIG[app.status].icon` blew up on
  // undefined, and the 완료 tab silently showed nothing.
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "settled"
    | "cancelled";
  appliedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  earnings: number | null;
  job: {
    id: string;
    title: string;
    workDate: string;
    startTime: string;
    endTime: string;
    hourlyPay: number;
    transportFee: number;
    business: {
      id: string;
      name: string;
      address: string;
    };
  };
};

type TabValue = "upcoming" | "active" | "done";

type Props = {
  workerId: string;
  initialTab: TabValue;
  upcoming: AppRow[];
  active: AppRow[];
  done: AppRow[];
};

/** UI-SPEC status → visual config. `cancelled` only surfaces if present. */
const STATUS_CONFIG: Record<
  AppRow["status"],
  {
    label: string;
    icon: typeof Hourglass;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
    accentClass: string;
  }
> = {
  pending: {
    label: "대기 중",
    icon: Hourglass,
    badgeVariant: "secondary",
    accentClass: "text-amber-600",
  },
  confirmed: {
    label: "수락됨",
    icon: CheckCircle2,
    badgeVariant: "default",
    accentClass: "text-teal-600",
  },
  in_progress: {
    label: "근무 중",
    icon: Zap,
    badgeVariant: "default",
    accentClass: "text-emerald-600",
  },
  completed: {
    label: "완료",
    icon: CheckCheck,
    badgeVariant: "outline",
    accentClass: "text-muted-foreground",
  },
  // Phase 5 terminal state: checkOut now writes status='settled' instead
  // of 'completed'. Rendered identically to 완료 but with a distinct
  // label so the user knows their earnings landed.
  settled: {
    label: "정산 완료",
    icon: CheckCheck,
    badgeVariant: "outline",
    accentClass: "text-brand",
  },
  cancelled: {
    label: "취소됨",
    icon: Inbox,
    badgeVariant: "destructive",
    accentClass: "text-destructive",
  },
};

export function ApplicationsClient({
  workerId,
  initialTab,
  upcoming,
  active,
  done,
}: Props) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<TabValue>(initialTab);
  // D-08 fallback: set to true when Realtime reports CHANNEL_ERROR / TIMED_OUT.
  // We MUST NOT rename this identifier — verify step greps for "pollingActive".
  const [pollingActive, setPollingActive] = useState(false);

  // Realtime subscription — primary update path.
  useEffect(() => {
    const unsubscribe = subscribeApplicationsForWorker(
      workerId,
      () => {
        // Any INSERT / UPDATE / DELETE on this worker's rows → refresh server
        // component to pick up fresh bucket contents.
        router.refresh();
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
  }, [workerId, router]);

  // D-08 polling fallback — only runs while Realtime is unhealthy.
  useEffect(() => {
    if (!pollingActive) return;
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [pollingActive, router]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            지원 내역
          </h1>
        </div>
      </header>

      <Tabs
        value={currentTab}
        onValueChange={(value: string) => setCurrentTab(value as TabValue)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1">
            예정 ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            진행중 ({active.length})
          </TabsTrigger>
          <TabsTrigger value="done" className="flex-1">
            완료 ({done.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="pt-4">
          <ApplicationList
            items={upcoming}
            emptyMessage="예정된 지원이 없어요"
          />
        </TabsContent>
        <TabsContent value="active" className="pt-4">
          <ApplicationList
            items={active}
            emptyMessage="진행 중인 근무가 없어요"
          />
        </TabsContent>
        <TabsContent value="done" className="pt-4">
          <ApplicationList
            items={done}
            emptyMessage="완료된 근무가 없어요"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApplicationList({
  items,
  emptyMessage,
}: {
  items: AppRow[];
  emptyMessage: string;
}) {
  if (items.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="space-y-3">
      {items.map((app) => (
        <ApplicationCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <p className="text-muted-foreground font-medium">{message}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        마음에 드는 공고에 지원해보세요
      </p>
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/home">공고 둘러보기</Link>
      </Button>
    </div>
  );
}

function ApplicationCard({ app }: { app: AppRow }) {
  const status = STATUS_CONFIG[app.status];
  const Icon = status.icon;

  // Combine workDate + startTime into a Date for the 24h cancel rule.
  // Workdate is ISO "YYYY-MM-DD..." (Prisma Date -> UTC midnight string).
  const workDateStartAt = combineWorkDateTime(
    app.job.workDate,
    app.job.startTime,
  );

  const canCancel =
    app.status === "pending" || app.status === "confirmed";
  const canCheckIn = app.status === "confirmed";
  const isInProgress = app.status === "in_progress";
  // Phase 5: both 'completed' (legacy) and 'settled' (new) are terminal
  // states that should show the earnings card. Treating settled as a
  // non-completed row hid the KRW payout from every post-Phase-5 shift.
  const isCompleted =
    app.status === "completed" || app.status === "settled";

  return (
    <article className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {app.job.business.name}
          </p>
          <h3 className="font-bold text-sm line-clamp-1 mt-0.5">
            {app.job.title}
          </h3>
        </div>
        <Badge variant={status.badgeVariant} className="shrink-0 gap-1">
          <Icon className={`w-3 h-3 ${status.accentClass}`} />
          {status.label}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatWorkDate(app.job.workDate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {app.job.startTime}~{app.job.endTime}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[140px]">
            {app.job.business.address.split(" ").slice(0, 2).join(" ")}
          </span>
        </span>
      </div>

      {isCompleted && app.earnings !== null && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            정산 금액
          </span>
          <span className="font-bold text-sm text-brand">
            {formatMoney(app.earnings)}
          </span>
        </div>
      )}

      {(canCancel || canCheckIn || isInProgress) && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {canCheckIn && (
            <Link
              href={`/my/applications/${app.id}/check-in`}
              className="flex-1 h-9 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" /> 체크인
            </Link>
          )}
          {isInProgress && (
            <Link
              href={`/my/applications/${app.id}/check-in`}
              className="flex-1 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> 체크아웃
            </Link>
          )}
          {canCancel && (
            <CancelApplicationDialog
              applicationId={app.id}
              workDateStartAt={workDateStartAt}
              trigger={
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg border border-border hover:bg-muted text-xs font-medium text-muted-foreground transition-colors"
                >
                  취소
                </button>
              }
            />
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Combine a workDate ISO string (UTC midnight) with an "HH:MM" startTime
 * into a Date representing the shift start instant. Mirrors the
 * combineWorkDateTime helper inside cancelApplication — keep logic
 * identical so the client 24h check matches the server-side rule.
 */
function combineWorkDateTime(workDateIso: string, startTime: string): Date {
  const [h, m] = startTime.split(":").map((n) => Number(n));
  const combined = new Date(workDateIso);
  combined.setUTCHours(h, m, 0, 0);
  return combined;
}
