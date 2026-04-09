import Link from "next/link"
import {
  ArrowLeft,
  Star,
  Heart,
  Send,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Shield,
  Award,
  ThumbsUp,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

/* ── Mock Data ── */

const WORKER = {
  id: "w1",
  name: "이준호",
  rating: 4.9,
  reviewCount: 18,
  completedJobs: 23,
  badgeLevel: "골드",
  bio: "카페 바리스타 경력 2년, 음식점 서빙 경험 다수. 시간 약속을 잘 지키고, 밝은 성격으로 고객 응대에 자신 있습니다. 평일 저녁, 주말 전일 근무 가능합니다.",
  location: "서울 강남구",
  joinDate: "2025-06",
  skills: ["카페", "서빙", "음료제조", "바리스타", "청소"],
  experiences: [
    { category: "카페", count: 12 },
    { category: "서빙", count: 8 },
    { category: "물류", count: 3 },
  ],
  availability: [
    { day: "월", slots: ["저녁"] as string[] },
    { day: "화", slots: ["저녁"] as string[] },
    { day: "수", slots: [] as string[] },
    { day: "목", slots: ["저녁"] as string[] },
    { day: "금", slots: ["저녁"] as string[] },
    { day: "토", slots: ["오전", "오후", "저녁"] as string[] },
    { day: "일", slots: ["오전", "오후"] as string[] },
  ],
  reviews: [
    {
      id: "r1",
      employer: "스타벅스 역삼점",
      rating: 5.0,
      date: "2026-03-20",
      comment:
        "성실하고 손님 응대가 뛰어납니다. 다음에도 꼭 함께 일하고 싶습니다.",
    },
    {
      id: "r2",
      employer: "블루보틀 삼성점",
      rating: 4.8,
      date: "2026-03-10",
      comment:
        "시간 약속을 잘 지키고 꼼꼼하게 업무를 처리합니다. 음료 제조도 능숙해요.",
    },
    {
      id: "r3",
      employer: "할리스 강남점",
      rating: 4.9,
      date: "2026-02-25",
      comment:
        "밝은 성격으로 분위기를 좋게 만들어주었습니다. 서빙도 깔끔합니다.",
    },
    {
      id: "r4",
      employer: "CJ 물류센터",
      rating: 4.7,
      date: "2026-02-15",
      comment:
        "체력이 좋고 성실합니다. 물류 작업도 꼼꼼하게 잘 해주었어요.",
    },
  ],
} as const

/* ── Helpers ── */

function badgeLevelColor(level: string) {
  switch (level) {
    case "골드":
      return "bg-yellow-100 text-yellow-700 border-yellow-300"
    case "실버":
      return "bg-gray-100 text-gray-700 border-gray-300"
    case "브론즈":
      return "bg-orange-100 text-orange-700 border-orange-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function renderStars(rating: number) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5
  const stars = []
  for (let i = 0; i < full; i++) {
    stars.push(
      <Star key={`f-${i}`} className="w-3.5 h-3.5 fill-brand text-brand" />
    )
  }
  if (hasHalf) {
    stars.push(
      <Star key="h" className="w-3.5 h-3.5 fill-brand/50 text-brand" />
    )
  }
  return stars
}

/* ── Page ── */

export default async function BizWorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/biz/workers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">인재 상세</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile */}
        <div className="md:col-span-1 space-y-4">
          {/* Profile Card */}
          <Card>
            <CardContent className="flex flex-col items-center text-center pt-2">
              <Avatar className="w-20 h-20 text-2xl mb-3">
                <AvatarFallback className="text-2xl">
                  {WORKER.name[0]}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold">{WORKER.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex">{renderStars(WORKER.rating)}</div>
                <span className="text-sm font-medium">{WORKER.rating}</span>
                <span className="text-xs text-muted-foreground">
                  ({WORKER.reviewCount})
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border mt-2 ${badgeLevelColor(WORKER.badgeLevel)}`}
              >
                <Award className="w-3 h-3" />
                {WORKER.badgeLevel}
              </span>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {WORKER.bio}
              </p>

              <Separator className="my-4" />

              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {WORKER.location}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  가입 {WORKER.joinDate}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {WORKER.completedJobs}회 근무 완료
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <Button
                  className="flex-1 bg-teal text-white hover:bg-teal/90"
                >
                  <Send className="w-4 h-4" />
                  제안 보내기
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">보유 스킬</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {WORKER.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">경험 배지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {WORKER.experiences.map((exp) => (
                  <span
                    key={exp.category}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal/10 text-sm font-medium text-teal"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {exp.category} {exp.count}회
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Availability Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                가용 시간표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {WORKER.availability.map((day) => (
                  <div key={day.day} className="text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {day.day}
                    </p>
                    <div className="space-y-1">
                      {(["오전", "오후", "저녁"] as const).map((slot) => (
                        <div
                          key={slot}
                          className={`px-1 py-1.5 rounded text-xs ${
                            (day.slots as readonly string[]).includes(slot)
                              ? "bg-teal/15 text-teal font-medium"
                              : "bg-muted/50 text-muted-foreground/50"
                          }`}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                고용주 리뷰 ({WORKER.reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {WORKER.reviews.map((review) => (
                <div key={review.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-medium">{review.employer}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-brand text-brand" />
                      <span className="text-sm font-medium">
                        {review.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                  <Separator className="mt-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
