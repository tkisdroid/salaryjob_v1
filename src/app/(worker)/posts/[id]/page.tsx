import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Calendar,
  Building2,
  BadgeCheck,
  Wallet,
  Share2,
  Heart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const POST = {
  id: "p-1",
  title: "카페 바리스타 주말 근무",
  company: {
    name: "블루보틀 강남점",
    initials: "BB",
    verified: true,
    rating: 4.8,
    reviewCount: 23,
  },
  payMin: 13000,
  payMax: 15000,
  payType: "시급",
  location: "서울 강남구 역삼동 123-45",
  distance: "0.8km",
  schedule: {
    dates: "2026.03.28 (토) ~ 2026.03.29 (일)",
    time: "09:00 - 18:00",
    hours: "8시간",
  },
  description: `블루보틀 강남점에서 주말 바리스타를 모집합니다.

주요 업무:
- 에스프레소 음료 제조
- 핸드드립 커피 추출
- 매장 청결 관리
- 고객 응대

자격 요건:
- 바리스타 경험 3개월 이상 (우대)
- 주말 근무 가능자
- 성실하고 친절한 분

근무 조건:
- 시급 13,000원 ~ 15,000원 (경력에 따라 차등)
- 식사 제공
- 교통비 지원 (일 5,000원)
- 4대보험 가입`,
  tags: ["카페", "바리스타", "주말", "강남", "식사제공"],
  urgent: false,
  postedAt: "2시간 전",
  applicantCount: 5,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/explore" className="p-1 -ml-1 hover:bg-muted rounded-md">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Heart className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Title & Meta */}
      <div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {POST.urgent && (
            <Badge variant="destructive" className="animate-urgent">
              급구
            </Badge>
          )}
          {POST.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="text-xl font-bold tracking-tight leading-snug">
          {POST.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{POST.postedAt}</p>
      </div>

      {/* Company info */}
      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="text-xs font-semibold bg-brand-light text-brand">
              {POST.company.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">
                {POST.company.name}
              </span>
              {POST.company.verified && (
                <BadgeCheck className="w-4 h-4 text-brand shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {POST.company.rating} ({POST.company.reviewCount}개 리뷰)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key info */}
      <div className="grid grid-cols-2 gap-3">
        <Card size="sm">
          <CardContent className="flex items-start gap-2">
            <Wallet className="w-4 h-4 text-brand mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{POST.payType}</p>
              <p className="text-sm font-bold text-brand">
                {POST.payMin.toLocaleString()}원 ~{" "}
                {POST.payMax.toLocaleString()}원
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-teal mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">위치</p>
              <p className="text-sm font-medium">{POST.distance}</p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">근무일</p>
              <p className="text-sm font-medium">{POST.schedule.dates}</p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">근무시간</p>
              <p className="text-sm font-medium">
                {POST.schedule.time} ({POST.schedule.hours})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      <Card size="sm">
        <CardContent className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">{POST.location}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* Description */}
      <section>
        <h2 className="text-base font-semibold mb-3">상세 정보</h2>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {POST.description}
        </div>
      </section>

      <Separator />

      {/* Tags */}
      <section>
        <h2 className="text-base font-semibold mb-3">태그</h2>
        <div className="flex flex-wrap gap-2">
          {POST.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="px-3 py-1">
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      {/* Applicant count */}
      <Card size="sm" className="bg-muted/50">
        <CardContent>
          <p className="text-xs text-muted-foreground text-center">
            현재{" "}
            <span className="font-semibold text-foreground">
              {POST.applicantCount}명
            </span>
            이 지원했어요
          </p>
        </CardContent>
      </Card>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand">
              {POST.payType} {POST.payMin.toLocaleString()}원 ~{" "}
              {POST.payMax.toLocaleString()}원
            </p>
          </div>
          <Button className="bg-brand hover:bg-brand-dark text-white px-6">
            지원하기
          </Button>
        </div>
      </div>
    </div>
  );
}
