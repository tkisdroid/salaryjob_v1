import Link from "next/link"
import {
  FileText,
  Users,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  Star,
  ChevronRight,
  Eye,
  MapPin,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

/* ── Mock Data ── */

const BUSINESS_NAME = "맛있는 카페"

const STAT_CARDS = [
  {
    icon: FileText,
    label: "진행중 공고",
    value: 3,
    unit: "건",
    trend: "+1 이번 주",
    trendUp: true,
    color: "text-teal",
    bg: "bg-teal/10",
  },
  {
    icon: Users,
    label: "새 지원",
    value: 5,
    unit: "건",
    trend: "+3 어제 대비",
    trendUp: true,
    color: "text-brand",
    bg: "bg-brand/10",
  },
  {
    icon: CalendarCheck,
    label: "오늘 근무",
    value: 2,
    unit: "건",
    trend: "예정 시간 14:00",
    trendUp: false,
    color: "text-teal",
    bg: "bg-teal/10",
  },
] as const

const URGENT_ITEMS = [
  {
    type: "application" as const,
    title: "주말 카페 서빙 알바",
    description: "새 지원 3건 — 24시간 내 응답 필요",
    time: "2시간 전",
  },
  {
    type: "today" as const,
    title: "오늘 14:00 근무 시작",
    description: "김민수님 — 카페 서빙 (14:00~18:00)",
    time: "2시간 후",
  },
  {
    type: "application" as const,
    title: "물류 상하차 단기",
    description: "새 지원 2건 — 마감 임박",
    time: "5시간 전",
  },
] as const

const AI_RECOMMENDED_WORKERS = [
  {
    id: "w1",
    name: "이준호",
    rating: 4.9,
    jobs: 23,
    skills: ["카페", "서빙"],
    matchReason: "카페 경험 다수, 시간 일치",
  },
  {
    id: "w2",
    name: "박서연",
    rating: 4.8,
    jobs: 15,
    skills: ["서빙", "음료제조"],
    matchReason: "근처 거주, 즉시 가능",
  },
  {
    id: "w3",
    name: "최동현",
    rating: 4.7,
    jobs: 31,
    skills: ["물류", "상하차"],
    matchReason: "물류 경험 풍부, 높은 평점",
  },
  {
    id: "w4",
    name: "정하늘",
    rating: 4.6,
    jobs: 8,
    skills: ["카페", "베이킹"],
    matchReason: "카페 경력 2년, 주말 가능",
  },
] as const

const ACTIVE_POSTS = [
  {
    id: "p1",
    title: "주말 카페 서빙 알바",
    status: "active" as const,
    applications: 3,
    views: 128,
  },
  {
    id: "p2",
    title: "물류 상하차 단기",
    status: "active" as const,
    applications: 2,
    views: 87,
  },
  {
    id: "p3",
    title: "이벤트 스태프 (3/29)",
    status: "active" as const,
    applications: 0,
    views: 45,
  },
] as const

/* ── Helpers ── */

function StatusBadgeColor(status: string) {
  switch (status) {
    case "active":
      return "bg-teal/10 text-teal"
    case "closed":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

function StatusLabel(status: string) {
  switch (status) {
    case "active":
      return "활성"
    case "closed":
      return "마감"
    default:
      return status
  }
}

/* ── Page ── */

export default function BizDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          안녕하세요, {BUSINESS_NAME}님
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          오늘 하루도 좋은 인재와 함께하세요.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bg}`}
                >
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                    <span className="text-base font-normal text-muted-foreground ml-0.5">
                      {stat.unit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {stat.trendUp && (
                      <TrendingUp className="w-3 h-3 text-teal" />
                    )}
                    {!stat.trendUp && <Clock className="w-3 h-3" />}
                    {stat.trend}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Urgent Items */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-foreground">즉시 확인 필요</h2>
        </div>
        <Card>
          <CardContent className="divide-y divide-border">
            {URGENT_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3 ${i === 0 ? "" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === "application"
                        ? "bg-brand animate-urgent"
                        : "bg-teal"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.time}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* AI Recommended Workers */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-foreground">AI 추천 인재</h2>
          <span className="text-xs text-muted-foreground ml-1">
            활성 공고 기반
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {AI_RECOMMENDED_WORKERS.map((worker) => (
            <Link
              key={worker.id}
              href={`/biz/workers/${worker.id}`}
              className="flex-shrink-0 w-56"
            >
              <Card className="hover:ring-2 hover:ring-teal/30 transition-all">
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback>{worker.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{worker.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-brand text-brand" />
                        {worker.rating} · {worker.jobs}회 근무
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {worker.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-teal font-medium">
                    {worker.matchReason}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Active Posts Summary */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">내 공고 현황</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/biz/posts">
              전체 보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="divide-y divide-border">
            {ACTIVE_POSTS.map((post) => (
              <Link
                key={post.id}
                href={`/biz/posts/${post.id}`}
                className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${StatusBadgeColor(post.status)}`}
                  >
                    {StatusLabel(post.status)}
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {post.title}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {post.applications}명 지원
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.views}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
