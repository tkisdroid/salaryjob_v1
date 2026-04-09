"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  Inbox,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types & Config
// ---------------------------------------------------------------------------

type SettlementStatus =
  | "CHECKOUT_PENDING"
  | "APPROVED"
  | "AUTO_APPROVED"
  | "PROCESSING"
  | "SETTLED"
  | "RETRY_1"
  | "RETRY_2"
  | "RETRY_3"
  | "FAILED";

interface Settlement {
  readonly id: string;
  readonly company: string;
  readonly postTitle: string;
  readonly date: string;
  readonly grossAmount: number;
  readonly netAmount: number;
  readonly status: SettlementStatus;
  readonly settledAt: string | null;
}

interface StatusConfig {
  readonly label: string;
  readonly variant: "default" | "secondary" | "outline" | "destructive";
  readonly colorClass: string;
  readonly icon: typeof CheckCircle;
}

const STATUS_CONFIG: Record<SettlementStatus, StatusConfig> = {
  CHECKOUT_PENDING: {
    label: "확인 대기",
    variant: "secondary",
    colorClass: "text-muted-foreground",
    icon: Clock,
  },
  APPROVED: {
    label: "승인됨",
    variant: "secondary",
    colorClass: "text-muted-foreground",
    icon: Clock,
  },
  AUTO_APPROVED: {
    label: "자동 승인",
    variant: "secondary",
    colorClass: "text-muted-foreground",
    icon: Clock,
  },
  PROCESSING: {
    label: "처리 중",
    variant: "outline",
    colorClass: "text-yellow-600",
    icon: AlertTriangle,
  },
  SETTLED: {
    label: "정산 완료",
    variant: "default",
    colorClass: "text-teal",
    icon: CheckCircle,
  },
  RETRY_1: {
    label: "재시도 1",
    variant: "outline",
    colorClass: "text-yellow-600",
    icon: AlertTriangle,
  },
  RETRY_2: {
    label: "재시도 2",
    variant: "outline",
    colorClass: "text-yellow-600",
    icon: AlertTriangle,
  },
  RETRY_3: {
    label: "재시도 3",
    variant: "outline",
    colorClass: "text-yellow-600",
    icon: AlertTriangle,
  },
  FAILED: {
    label: "실패",
    variant: "destructive",
    colorClass: "text-destructive",
    icon: XCircle,
  },
};

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_SETTLEMENTS: readonly Settlement[] = [
  {
    id: "stl-1",
    company: "블루보틀 강남점",
    postTitle: "카페 바리스타 (3/25)",
    date: "2026-03-25",
    grossAmount: 52000,
    netAmount: 52000,
    status: "CHECKOUT_PENDING",
    settledAt: null,
  },
  {
    id: "stl-2",
    company: "이벤트플러스",
    postTitle: "행사 스태프 (3/24)",
    date: "2026-03-24",
    grossAmount: 75000,
    netAmount: 75000,
    status: "PROCESSING",
    settledAt: null,
  },
  {
    id: "stl-3",
    company: "쿠팡 풀필먼트",
    postTitle: "물류 분류 작업 (3/22)",
    date: "2026-03-22",
    grossAmount: 120000,
    netAmount: 120000,
    status: "SETTLED",
    settledAt: "2026-03-22T18:30:00",
  },
  {
    id: "stl-4",
    company: "CU 삼성역점",
    postTitle: "편의점 주간 (3/20)",
    date: "2026-03-20",
    grossAmount: 88000,
    netAmount: 88000,
    status: "SETTLED",
    settledAt: "2026-03-20T19:15:00",
  },
  {
    id: "stl-5",
    company: "스타벅스 선릉점",
    postTitle: "서빙 알바 (3/18)",
    date: "2026-03-18",
    grossAmount: 46000,
    netAmount: 46000,
    status: "SETTLED",
    settledAt: "2026-03-18T17:45:00",
  },
  {
    id: "stl-6",
    company: "마케팅허브",
    postTitle: "전단지 배포 (3/15)",
    date: "2026-03-15",
    grossAmount: 60000,
    netAmount: 60000,
    status: "SETTLED",
    settledAt: "2026-03-15T16:20:00",
  },
  {
    id: "stl-7",
    company: "GS25 역삼점",
    postTitle: "편의점 야간 (3/12)",
    date: "2026-03-12",
    grossAmount: 96000,
    netAmount: 96000,
    status: "FAILED",
    settledAt: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

function calculateSummary(settlements: readonly Settlement[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = settlements.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = thisMonth
    .filter((s) => s.status === "SETTLED")
    .reduce((sum, s) => sum + s.netAmount, 0);

  const pendingAmount = thisMonth
    .filter((s) =>
      ["CHECKOUT_PENDING", "APPROVED", "AUTO_APPROVED", "PROCESSING", "RETRY_1", "RETRY_2", "RETRY_3"].includes(s.status)
    )
    .reduce((sum, s) => sum + s.netAmount, 0);

  const settledCount = thisMonth.filter((s) => s.status === "SETTLED").length;

  return { totalIncome, pendingAmount, settledCount };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCards({
  totalIncome,
  pendingAmount,
  settledCount,
}: {
  totalIncome: number;
  pendingAmount: number;
  settledCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card size="sm">
        <CardContent className="text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal/10 mx-auto mb-1.5">
            <TrendingUp className="w-4 h-4 text-teal" />
          </div>
          <p className="text-[11px] text-muted-foreground">이번 달 수입</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {formatCurrency(totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand/10 mx-auto mb-1.5">
            <Clock className="w-4 h-4 text-brand" />
          </div>
          <p className="text-[11px] text-muted-foreground">대기 중</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {formatCurrency(pendingAmount)}
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal/10 mx-auto mb-1.5">
            <CheckCircle className="w-4 h-4 text-teal" />
          </div>
          <p className="text-[11px] text-muted-foreground">정산 완료</p>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {settledCount}건
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettlementCard({ settlement }: { settlement: Settlement }) {
  const config = STATUS_CONFIG[settlement.status];
  const StatusIcon = config.icon;

  return (
    <Card size="sm" className="hover:ring-brand/30 transition-shadow">
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate">
            {settlement.postTitle}
          </h3>
          <Badge variant={config.variant} className="shrink-0">
            <StatusIcon className="w-3 h-3 mr-0.5" />
            {config.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {settlement.company}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {settlement.date}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">정산 금액</span>
          <span className="text-sm font-bold text-foreground">
            {formatCurrency(settlement.netAmount)}
          </span>
        </div>

        {settlement.settledAt && (
          <p className="text-[11px] text-muted-foreground">
            입금 완료: {new Date(settlement.settledAt).toLocaleString("ko-KR", {
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <p className="text-muted-foreground font-medium">
        아직 정산 내역이 없어요
      </p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        첫 근무를 완료하면 여기에 표시돼요!
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkerSettlementsPage() {
  const settlements = MOCK_SETTLEMENTS;
  const { totalIncome, pendingAmount, settledCount } =
    calculateSummary(settlements);

  if (settlements.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <header>
          <div className="flex items-center gap-2">
            <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand" />
              정산 내역
            </h1>
          </div>
        </header>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand" />
            정산 내역
          </h1>
        </div>
      </header>

      <SummaryCards
        totalIncome={totalIncome}
        pendingAmount={pendingAmount}
        settledCount={settledCount}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          전체 내역
        </h2>
        {settlements.map((settlement) => (
          <SettlementCard key={settlement.id} settlement={settlement} />
        ))}
      </section>
    </div>
  );
}
