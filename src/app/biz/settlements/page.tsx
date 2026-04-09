import {
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Info,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

/* ── Mock Data ── */

const SUMMARY = {
  totalMonth: "1,580,000",
  pending: "360,000",
  completed: "1,220,000",
} as const

const SETTLEMENTS = [
  {
    id: "s1",
    workerName: "이준호",
    date: "2026-03-25",
    postTitle: "카페 서빙 (3/25)",
    gross: 36000,
    commission: 0,
    net: 36000,
    status: "pending" as const,
  },
  {
    id: "s2",
    workerName: "박서연",
    date: "2026-03-24",
    postTitle: "카페 서빙 (3/24)",
    gross: 48000,
    commission: 0,
    net: 48000,
    status: "processing" as const,
  },
  {
    id: "s3",
    workerName: "최동현",
    date: "2026-03-22",
    postTitle: "물류 상하차 (3/22)",
    gross: 120000,
    commission: 0,
    net: 120000,
    status: "completed" as const,
  },
  {
    id: "s4",
    workerName: "김수진",
    date: "2026-03-20",
    postTitle: "사무 보조 (3/20)",
    gross: 88000,
    commission: 0,
    net: 88000,
    status: "completed" as const,
  },
  {
    id: "s5",
    workerName: "정하늘",
    date: "2026-03-18",
    postTitle: "카페 서빙 (3/18)",
    gross: 36000,
    commission: 0,
    net: 36000,
    status: "completed" as const,
  },
  {
    id: "s6",
    workerName: "이준호",
    date: "2026-03-15",
    postTitle: "카페 서빙 (3/15)",
    gross: 48000,
    commission: 0,
    net: 48000,
    status: "completed" as const,
  },
  {
    id: "s7",
    workerName: "오민석",
    date: "2026-03-12",
    postTitle: "이벤트 세팅 (3/12)",
    gross: 150000,
    commission: 0,
    net: 150000,
    status: "completed" as const,
  },
] as const

/* ── Helpers ── */

function statusInfo(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "정산 대기",
        className: "bg-brand/10 text-brand",
        icon: Clock,
      }
    case "processing":
      return {
        label: "처리 중",
        className: "bg-yellow-100 text-yellow-700",
        icon: AlertCircle,
      }
    case "completed":
      return {
        label: "완료",
        className: "bg-teal/10 text-teal",
        icon: CheckCircle,
      }
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
        icon: Clock,
      }
  }
}

function formatCurrency(amount: number) {
  return amount.toLocaleString("ko-KR") + "원"
}

/* ── Page ── */

export default function BizSettlementsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">정산 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          근무자 급여 정산 현황을 확인하세요.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal/10">
              <Wallet className="w-6 h-6 text-teal" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이번 달 정산 총액</p>
              <p className="text-xl font-bold text-foreground">
                {SUMMARY.totalMonth}원
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand/10">
              <Clock className="w-6 h-6 text-brand" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">대기 중</p>
              <p className="text-xl font-bold text-foreground">
                {SUMMARY.pending}원
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal/10">
              <CheckCircle className="w-6 h-6 text-teal" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">완료</p>
              <p className="text-xl font-bold text-foreground">
                {SUMMARY.completed}원
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Notice */}
      <Card className="border-teal/20 bg-teal/5 mb-6">
        <CardContent className="flex items-center gap-3">
          <Info className="w-5 h-5 text-teal flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              수수료 안내
            </p>
            <p className="text-xs text-muted-foreground">
              수수료 10% (현재 프로모션:{" "}
              <span className="font-bold text-teal">0%</span>) · 프로모션 기간:
              2026년 6월 30일까지
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <CardTitle>정산 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table Header (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border mb-2">
            <span>근무자</span>
            <span>공고</span>
            <span className="text-right">총액</span>
            <span className="text-right">수수료</span>
            <span className="text-right">정산액</span>
            <span className="text-center">상태</span>
          </div>

          <div className="divide-y divide-border">
            {SETTLEMENTS.map((item) => {
              const status = statusInfo(item.status)
              const StatusIcon = status.icon

              return (
                <div key={item.id}>
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 items-center px-3 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item.workerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.date}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.postTitle}
                    </p>
                    <p className="text-sm font-medium text-right min-w-[90px]">
                      {formatCurrency(item.gross)}
                    </p>
                    <p className="text-sm text-muted-foreground text-right min-w-[70px]">
                      {formatCurrency(item.commission)}
                    </p>
                    <p className="text-sm font-bold text-right min-w-[90px]">
                      {formatCurrency(item.net)}
                    </p>
                    <span
                      className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium min-w-[80px] ${status.className}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>

                  {/* Mobile Row */}
                  <div className="md:hidden px-1 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {item.workerName}
                        </p>
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold">
                        {formatCurrency(item.net)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.postTitle} · {item.date}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
