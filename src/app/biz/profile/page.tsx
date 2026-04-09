import Link from "next/link"
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Star,
  Pencil,
  Globe,
  Image as ImageIcon,
  CheckCircle,
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

const BUSINESS = {
  name: "맛있는 카페",
  category: "외식/음료",
  verified: true,
  address: "서울특별시 강남구 테헤란로 123, 1층",
  phone: "02-1234-5678",
  website: "https://tasty-cafe.kr",
  operatingHours: {
    weekday: "08:00 ~ 22:00",
    weekend: "09:00 ~ 21:00",
    holiday: "10:00 ~ 18:00",
  },
  description:
    "강남 역삼역 근처의 스페셜티 커피 전문 카페입니다. 직접 로스팅한 원두로 최고의 커피를 제공합니다. 따뜻하고 편안한 분위기에서 편히 쉬어가세요.",
  photos: [
    { id: 1, label: "매장 외관" },
    { id: 2, label: "내부 인테리어" },
    { id: 3, label: "바 공간" },
    { id: 4, label: "테라스" },
  ],
  rating: 4.8,
  reviewCount: 32,
  totalHires: 47,
  joinDate: "2025-06",
} as const

/* ── Page ── */

export default function BizProfilePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">업체 프로필</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            구직자에게 보여지는 업체 정보입니다.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/biz/profile/edit">
            <Pencil className="w-4 h-4" />
            프로필 수정
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center text-center pt-2">
              <div className="w-24 h-24 rounded-2xl bg-teal/10 flex items-center justify-center mb-4">
                <Building2 className="w-12 h-12 text-teal" />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground">
                  {BUSINESS.name}
                </h2>
                {BUSINESS.verified && (
                  <CheckCircle className="w-5 h-5 text-teal" />
                )}
              </div>

              <Badge variant="secondary" className="mb-3">
                {BUSINESS.category}
              </Badge>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-brand text-brand" />
                  <span className="font-semibold">{BUSINESS.rating}</span>
                  <span className="text-muted-foreground">
                    ({BUSINESS.reviewCount})
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="w-full space-y-3 text-sm text-left">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-foreground">{BUSINESS.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-foreground">{BUSINESS.phone}</p>
                </div>
                {BUSINESS.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={BUSINESS.website}
                      className="text-teal hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {BUSINESS.website.replace("https://", "")}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                영업 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평일</span>
                  <span className="font-medium">
                    {BUSINESS.operatingHours.weekday}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">주말</span>
                  <span className="font-medium">
                    {BUSINESS.operatingHours.weekend}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">공휴일</span>
                  <span className="font-medium">
                    {BUSINESS.operatingHours.holiday}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-teal">
                    {BUSINESS.totalHires}
                  </p>
                  <p className="text-xs text-muted-foreground">총 채용 횟수</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {BUSINESS.reviewCount}
                  </p>
                  <p className="text-xs text-muted-foreground">받은 리뷰</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>업체 소개</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {BUSINESS.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                업체 사진
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BUSINESS.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-xl bg-muted flex flex-col items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">
                      {photo.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-4 h-4 text-brand" />
                평점 및 리뷰
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground">
                    {BUSINESS.rating}
                  </p>
                  <div className="flex items-center gap-0.5 mt-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(BUSINESS.rating)
                            ? "fill-brand text-brand"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {BUSINESS.reviewCount}개 리뷰
                  </p>
                </div>

                <Separator orientation="vertical" className="h-16" />

                <div className="flex-1 space-y-1.5">
                  {[
                    { stars: 5, count: 20 },
                    { stars: 4, count: 8 },
                    { stars: 3, count: 3 },
                    { stars: 2, count: 1 },
                    { stars: 1, count: 0 },
                  ].map((row) => (
                    <div
                      key={row.stars}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="w-3 text-muted-foreground">
                        {row.stars}
                      </span>
                      <Star className="w-3 h-3 fill-brand text-brand" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{
                            width: `${(row.count / BUSINESS.reviewCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-4 text-right text-muted-foreground">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
