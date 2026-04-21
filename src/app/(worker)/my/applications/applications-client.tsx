"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Hourglass,
  Inbox,
  MapPin,
  QrCode,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CancelApplicationDialog } from "@/components/worker/cancel-application-dialog";
import { formatMoney } from "@/lib/format";
import { formatWorkDate } from "@/lib/job-utils";
import { subscribeApplicationsForWorker } from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";

type AppRow = {
  id: string;
  jobId: string;
  workerId: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "settled"
    | "cancelled"
    | "checked_in";
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

const STATUS_CONFIG: Record<
  AppRow["status"],
  {
    label: string;
    icon: typeof Hourglass;
    accentClass: string;
  }
> = {
  pending: {
    label: "대기 중",
    icon: Hourglass,
    accentClass: "text-muted-foreground",
  },
  confirmed: {
    label: "확정됨",
    icon: CheckCircle2,
    accentClass: "text-teal-600",
  },
  in_progress: {
    label: "근무 중",
    icon: Zap,
    accentClass: "text-emerald-600",
  },
  checked_in: {
    label: "체크인 완료",
    icon: CheckCircle2,
    accentClass: "text-emerald-600",
  },
  completed: {
    label: "완료",
    icon: CheckCheck,
    accentClass: "text-muted-foreground",
  },
  settled: {
    label: "정산 완료",
    icon: CheckCheck,
    accentClass: "text-brand",
  },
  cancelled: {
    label: "취소됨",
    icon: Inbox,
    accentClass: "text-destructive",
  },
};

const TAB_EMPTY_COPY: Record<TabValue, string> = {
  upcoming: "예정된 지원이 없어요",
  active: "진행 중인 근무가 없어요",
  done: "완료된 근무가 없어요",
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
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeApplicationsForWorker(
      workerId,
      () => {
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

  useEffect(() => {
    if (!pollingActive) return;
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [pollingActive, router]);

  const currentItems =
    currentTab === "upcoming" ? upcoming : currentTab === "active" ? active : done;

  const tabs: Array<{ value: TabValue; label: string; count: number }> = [
    { value: "upcoming", label: "예정", count: upcoming.length },
    { value: "active", label: "진행중", count: active.length },
    { value: "done", label: "완료", count: done.length },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <header className="flex items-center gap-2 pb-1">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <FileText className="h-[22px] w-[22px] text-brand-deep" />
          지원 내역
        </h1>
      </header>

      <div
        role="tablist"
        aria-label="지원 내역 상태"
        className="mt-3 flex gap-0.5 rounded-full border border-border bg-surface p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`applications-tab-${tab.value}`}
            aria-controls={`applications-panel-${tab.value}`}
            aria-selected={currentTab === tab.value}
            onClick={() => setCurrentTab(tab.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-bold tracking-tight transition-colors",
              currentTab === tab.value
                ? "bg-ink text-white"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "tabnum text-[11px] font-extrabold",
                currentTab === tab.value ? "text-brand" : "text-text-subtle",
              )}
            >
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      <div
        id={`applications-panel-${currentTab}`}
        role="tabpanel"
        aria-labelledby={`applications-tab-${currentTab}`}
        className="pt-4"
      >
        <ApplicationList
          items={currentItems}
          emptyMessage={TAB_EMPTY_COPY[currentTab]}
        />
      </div>
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
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
      <Inbox className="mb-4 h-12 w-12 text-text-subtle" />
      <p className="text-[15px] font-extrabold tracking-tight text-ink">
        {message}
      </p>
      <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
        마음에 드는 공고에 지원해보세요
      </p>
      <Button variant="ghost-premium" className="mt-4" asChild>
        <Link href="/home">공고 둘러보기</Link>
      </Button>
    </div>
  );
}

function statusPillClasses(status: AppRow["status"]): string {
  switch (status) {
    case "in_progress":
      return "bg-surface-2 text-ink";
    case "checked_in":
      return "bg-surface-2 text-ink";
    case "confirmed":
      return "bg-brand text-ink";
    case "pending":
      return "bg-lime-chip text-lime-chip-fg";
    case "completed":
    case "settled":
      return "bg-ink text-white";
    case "cancelled":
      return "bg-destructive text-white";
  }
}

function ApplicationCard({ app }: { app: AppRow }) {
  const status = STATUS_CONFIG[app.status];
  const Icon = status.icon;

  const workDateStartAt = combineWorkDateTime(
    app.job.workDate,
    app.job.startTime,
  );

  const canCancel = app.status === "pending" || app.status === "confirmed";
  const canCheckIn = app.status === "confirmed";
  const isInProgress = app.status === "in_progress";
  const isCompleted = app.status === "completed" || app.status === "settled";

  return (
    <article className="rounded-[22px] border border-border-soft bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[11.5px] font-semibold text-muted-foreground">
            <Building2 className="h-[13px] w-[13px]" />
            {app.job.business.name}
          </p>
          <h3 className="mt-0.5 line-clamp-1 text-[14.5px] font-extrabold tracking-[-0.02em] text-ink">
            {app.job.title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight",
            statusPillClasses(app.status),
          )}
        >
          <Icon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <b className="font-bold text-ink">{formatWorkDate(app.job.workDate)}</b>
        </span>
        <span className="tabnum inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <b className="font-bold text-ink">
            {app.job.startTime}~{app.job.endTime}
          </b>
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="max-w-[140px] truncate">
            {app.job.business.address.split(" ").slice(0, 2).join(" ")}
          </span>
        </span>
      </div>

      {isCompleted && app.earnings !== null && (
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Wallet className="h-3 w-3" />
            정산 금액
          </span>
          <span className="tabnum text-[16px] font-extrabold tracking-[-0.025em] text-brand-deep">
            {formatMoney(app.earnings)}
          </span>
        </div>
      )}

      {(canCancel || canCheckIn || isInProgress) && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-dashed border-border pt-3">
          {canCheckIn && (
            <Link
              href={`/my/applications/${app.id}/check-in`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-ink bg-[color-mix(in_oklch,var(--brand)_10%,var(--surface))] text-[12.5px] font-bold text-ink transition-all hover:bg-[color-mix(in_oklch,var(--brand)_16%,var(--surface))]"
            >
              <QrCode className="h-4 w-4" />
              체크인
            </Link>
          )}
          {isInProgress && (
            <Link
              href={`/my/applications/${app.id}/check-in`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-ink text-[12.5px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              <Zap className="h-4 w-4" />
              체크아웃
            </Link>
          )}
          {canCancel && (
            <CancelApplicationDialog
              applicationId={app.id}
              workDateStartAt={workDateStartAt}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-[12px] border border-border bg-surface px-5 text-[12.5px] font-bold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-ink"
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

function combineWorkDateTime(workDateIso: string, startTime: string): Date {
  const [h, m] = startTime.split(":").map((n) => Number(n));
  const combined = new Date(workDateIso);
  combined.setUTCHours(h, m, 0, 0);
  return combined;
}
