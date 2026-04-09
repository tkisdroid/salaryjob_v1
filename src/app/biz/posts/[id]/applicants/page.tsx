import Link from "next/link"
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Calendar,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

/* ── Mock Data ── */

const POST_TITLE = "주말 카페 서빙 알바"

const APPLICANTS = [
  {
    id: "a1",
    name: "이준호",
    rating: 4.9,
    completedJobs: 23,
    status: "pending" as const,
    message: "안녕하세요! 카페 경력 2년입니다. 토요일 근무 가능합니다.",
    appliedAt: "2시간 전",
    skills: ["카페", "서빙", "음료제조", "바리스타"],
    availability: "주말 전체 가능",
    reviews: [
      {
        employer: "스타벅스 역삼점",
        rating: 5,
        comment: "성실하고 손님 응대가 뛰어남",
      },
      {
        employer: "블루보틀 삼성점",
        rating: 4.8,
        comment: "시간 약속을 잘 지키고 꼼꼼함",
      },
    ],
  },
  {
    id: "a2",
    name: "박서연",
    rating: 4.8,
    completedJobs: 15,
    status: "pending" as const,
    message: "주말 오후 시간이 비어서 지원합니다. 서빙 경험 있습니다!",
    appliedAt: "5시간 전",
    skills: ["서빙", "음료제조", "청소"],
    availability: "토요일 오후 가능",
    reviews: [
      {
        employer: "투썸플레이스 강남점",
        rating: 4.7,
        comment: "밝은 성격으로 고객 응대 잘함",
      },
    ],
  },
  {
    id: "a3",
    name: "김동현",
    rating: 4.5,
    completedJobs: 8,
    status: "accepted" as const,
    message: "서빙 초보이지만 열심히 배우겠습니다!",
    appliedAt: "1일 전",
    skills: ["서빙", "청소"],
    availability: "주말 전체 가능",
    reviews: [
      {
        employer: "이디야 합정점",
        rating: 4.5,
        comment: "성실하게 근무함",
      },
    ],
  },
  {
    id: "a4",
    name: "정하늘",
    rating: 4.2,
    completedJobs: 3,
    status: "rejected" as const,
    message: "카페 일에 관심이 많습니다. 기회를 주세요!",
    appliedAt: "2일 전",
    skills: ["서빙"],
    availability: "토요일만 가능",
    reviews: [],
  },
] as const

/* ── Helpers ── */

function statusInfo(status: string) {
  switch (status) {
    case "pending":
      return { label: "대기", className: "bg-brand/10 text-brand" }
    case "accepted":
      return { label: "수락", className: "bg-teal/10 text-teal" }
    case "rejected":
      return { label: "거절", className: "bg-muted text-muted-foreground" }
    default:
      return { label: status, className: "" }
  }
}

function filterApplicants(tab: string) {
  if (tab === "all") return APPLICANTS
  return APPLICANTS.filter((a) => a.status === tab)
}

/* ── Applicant Card ── */

function ApplicantCard({
  applicant,
}: {
  applicant: (typeof APPLICANTS)[number]
}) {
  const badge = statusInfo(applicant.status)

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{applicant.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{applicant.name}</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-brand text-brand" />
                  {applicant.rating}
                </span>
                <span>&#183;</span>
                <span className="flex items-center gap-0.5">
                  <Briefcase className="w-3 h-3" />
                  {applicant.completedJobs}회 근무
                </span>
                <span>&#183;</span>
                <span>{applicant.appliedAt}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3">
          <p className="text-sm text-foreground">{applicant.message}</p>
        </div>

        <div className="flex items-center gap-2">
          {applicant.status === "pending" && (
            <>
              <Button
                size="sm"
                className="bg-teal text-white hover:bg-teal/90"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                수락
              </Button>
              <Button size="sm" variant="outline">
                <XCircle className="w-3.5 h-3.5" />
                거절
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost">
            <MessageCircle className="w-3.5 h-3.5" />
            채팅
          </Button>
        </div>

        <details className="mt-3 group">
          <summary className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <ChevronDown className="w-3.5 h-3.5 group-open:hidden" />
            <ChevronUp className="w-3.5 h-3.5 hidden group-open:inline" />
            상세 정보 보기
          </summary>
          <div className="mt-3 space-y-3 pt-3 border-t border-border">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                보유 스킬
              </p>
              <div className="flex flex-wrap gap-1">
                {applicant.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                가능 시간
              </p>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {applicant.availability}
              </p>
            </div>

            {applicant.reviews.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  이전 고용주 리뷰
                </p>
                <div className="space-y-2">
                  {applicant.reviews.map((review, i) => (
                    <div
                      key={i}
                      className="bg-muted/30 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium">
                          {review.employer}
                        </p>
                        <span className="flex items-center gap-0.5 text-xs">
                          <Star className="w-3 h-3 fill-brand text-brand" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

/* ── Page ── */

export default async function BizApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/biz/posts/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">지원자 관리</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {POST_TITLE} &#183; 지원자 {APPLICANTS.length}명
          </p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            전체 ({APPLICANTS.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            대기 ({APPLICANTS.filter((a) => a.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            수락 ({APPLICANTS.filter((a) => a.status === "accepted").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            거절 ({APPLICANTS.filter((a) => a.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-3 mt-4">
            {filterApplicants("all").map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          <div className="space-y-3 mt-4">
            {filterApplicants("pending").map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="accepted">
          <div className="space-y-3 mt-4">
            {filterApplicants("accepted").map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="rejected">
          <div className="space-y-3 mt-4">
            {filterApplicants("rejected").map((applicant) => (
              <ApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
