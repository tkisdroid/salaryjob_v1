"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Building2, Calendar, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PastEmployer {
  readonly id: string;
  readonly companyName: string;
  readonly companyInitials: string;
  readonly lastWorkedAt: string; // ISO date string
  readonly category: string;
  readonly hourlyRate: number;
}

interface QuickRematchProps {
  readonly pastEmployers?: readonly PastEmployer[];
}

type RematchState = "idle" | "confirming" | "submitting" | "submitted";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const DEFAULT_EMPLOYERS: readonly PastEmployer[] = [
  {
    id: "emp-1",
    companyName: "스타벅스 강남점",
    companyInitials: "스타",
    lastWorkedAt: "2026-03-20T10:00:00Z",
    category: "카페",
    hourlyRate: 12500,
  },
  {
    id: "emp-2",
    companyName: "CU 역삼역점",
    companyInitials: "CU",
    lastWorkedAt: "2026-03-15T14:00:00Z",
    category: "편의점",
    hourlyRate: 11000,
  },
  {
    id: "emp-3",
    companyName: "쿠팡 물류센터",
    companyInitials: "쿠팡",
    lastWorkedAt: "2026-03-10T08:00:00Z",
    category: "물류",
    hourlyRate: 14000,
  },
  {
    id: "emp-4",
    companyName: "이벤트플러스",
    companyInitials: "이플",
    lastWorkedAt: "2026-03-05T09:00:00Z",
    category: "행사",
    hourlyRate: 13500,
  },
];

// ---------------------------------------------------------------------------
// Employer Card
// ---------------------------------------------------------------------------

function EmployerCard({
  employer,
  rematchState,
  onRematchClick,
  onConfirm,
  onCancel,
}: {
  readonly employer: PastEmployer;
  readonly rematchState: RematchState;
  readonly onRematchClick: () => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 min-w-[140px] rounded-xl border border-border p-4",
        "bg-card transition-all shrink-0",
        rematchState === "submitted" && "ring-2 ring-brand/50"
      )}
    >
      <Avatar className="w-12 h-12">
        <AvatarFallback className="text-xs font-semibold bg-brand-light text-brand">
          {employer.companyInitials}
        </AvatarFallback>
      </Avatar>

      <div className="text-center">
        <p className="line-clamp-1 text-sm font-bold leading-tight tracking-tight">
          {employer.companyName}
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
          <Calendar className="w-2.5 h-2.5" />
          {formatRelativeTime(employer.lastWorkedAt)}
        </p>
      </div>

      {rematchState === "confirming" ? (
        <div className="flex flex-col gap-1.5 w-full">
          <p className="text-[11px] text-center text-muted-foreground">
            {employer.companyName}에<br />다시 지원할까요?
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs bg-brand hover:bg-brand-dark text-white"
              onClick={onConfirm}
            >
              지원
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs"
              onClick={onCancel}
            >
              취소
            </Button>
          </div>
        </div>
      ) : rematchState === "submitting" ? (
        <Button size="sm" className="w-full h-7 text-xs" disabled>
          지원 중...
        </Button>
      ) : rematchState === "submitted" ? (
        <p className="text-xs font-bold text-brand-deep">지원 완료!</p>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onClick={onRematchClick}
        >
          <RotateCcw className="w-3 h-3" />
          다시 지원
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function QuickRematch({ pastEmployers }: QuickRematchProps) {
  const employers = pastEmployers ?? DEFAULT_EMPLOYERS;
  const [states, setStates] = useState<Record<string, RematchState>>({});

  const getState = (id: string): RematchState => states[id] ?? "idle";

  const handleRematchClick = useCallback((id: string) => {
    setStates((prev) => ({ ...prev, [id]: "confirming" }));
  }, []);

  const handleCancel = useCallback((id: string) => {
    setStates((prev) => ({ ...prev, [id]: "idle" }));
  }, []);

  const handleConfirm = useCallback(async (id: string) => {
    setStates((prev) => ({ ...prev, [id]: "submitting" }));

    // TODO: Replace with actual server action call
    // await rematchAction({ employerId: id });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setStates((prev) => ({ ...prev, [id]: "submitted" }));
  }, []);

  // Empty state
  if (employers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            아직 근무 이력이 없어요
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            첫 근무를 완료하면 여기에 표시돼요
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand" />
          이전 근무처에 다시 지원
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Horizontal scroll container */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {employers.map((employer) => (
            <EmployerCard
              key={employer.id}
              employer={employer}
              rematchState={getState(employer.id)}
              onRematchClick={() => handleRematchClick(employer.id)}
              onConfirm={() => handleConfirm(employer.id)}
              onCancel={() => handleCancel(employer.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
