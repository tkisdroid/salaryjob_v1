import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wallet,
  Calendar,
  Users,
  Eye,
  Bookmark,
  Pencil,
  XCircle,
  Zap,
  ChevronRight,
  Building2,
  Tag,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

/* ── Mock Data ── */

const POST = {
  id: "p1",
  title: "주말 카페 서빙 알바",
  status: "active" as const,
  createdAt: "2026-03-24",
  updatedAt: "2026-03-24",
  deadline: "2026-03-30",
  category: "외식/음료",
  content:
    "안녕하세요! 저희 카페에서 주말에 함께 일할 서빙 스태프를 모집합니다.\n\n주요 업무:\n- 고객 주문 접수 및 서빙\n- 테이블 정리 및 매장 청소\n- 간단한 음료 제조 보조\n\n근무 시간: 토요일 오후 2시 ~ 5시 (3시간)\n경험자 우대, 초보자도 환영합니다!\n친절하고 성실한 분을 찾고 있어요.",
  payType: "시급",
  payAmount: "12,000원",
  location: "서울 강남구 역삼동 123-45",
  schedule: "토요일 14:00~17:00",
  headcount: 1,
  tags: ["카페", "서빙", "주말", "단기", "초보가능"],
  views: 128,
  saves: 15,
  applications: 3,
} as const

/* ── Helpers ── */

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return { className: "bg-teal/10 text-teal", label: "활성" }
    case "closed":
      return { className: "bg-muted text-muted-foreground", label: "마감" }
    case "draft":
      return { className: "bg-brand/10 text-brand", label: "임시저장" }
    default:
      return { className: "", label: status }
  }
}

/* ── Page ── */

export default async function BizPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const badge = statusBadge(POST.status)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/biz/posts">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <h1 className="text-2xl font-bold text-foreground">{POST.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            등록일 {POST.createdAt} · 마감 {POST.deadline}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">조회수</p>
              <p className="text-lg font-bold">{POST.views}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <Bookmark className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">저장</p>
              <p className="text-lg font-bold">{POST.saves}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <Users className="w-5 h-5 text-teal" />
            <div>
              <p className="text-xs text-muted-foreground">지원</p>
              <p className="text-lg font-bold text-teal">
                {POST.applications}명
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" asChild>
          <Link href={`/biz/posts/${id}/edit`}>
            <Pencil className="w-4 h-4" />
            수정
          </Link>
        </Button>
        <Button variant="outline">
          <XCircle className="w-4 h-4" />
          마감하기
        </Button>
        <Button variant="outline" className="border-brand/30 text-brand">
          <Zap className="w-4 h-4" />
          급구로 전환
        </Button>
        <Button
          className="bg-teal text-white hover:bg-teal/90 ml-auto"
          asChild
        >
          <Link href={`/biz/posts/${id}/applicants`}>
            <Users className="w-4 h-4" />
            지원자 보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>공고 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                {POST.content}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-6">
                {POST.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">공고 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">카테고리</p>
                  <p className="text-sm font-medium">{POST.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">근무 위치</p>
                  <p className="text-sm font-medium">{POST.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wallet className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">급여</p>
                  <p className="text-sm font-medium">
                    {POST.payType} {POST.payAmount}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">근무 일정</p>
                  <p className="text-sm font-medium">{POST.schedule}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">모집 인원</p>
                  <p className="text-sm font-medium">{POST.headcount}명</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">마감일</p>
                  <p className="text-sm font-medium">{POST.deadline}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
