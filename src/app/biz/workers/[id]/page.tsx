import Link from "next/link"
import {
  ChevronLeft,
  Star,
  Heart,
  Send,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Award,
  ThumbsUp,
} from "lucide-react"

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
      return "bg-brand text-ink"
    case "실버":
      return "bg-surface-2 text-ink"
    case "브론즈":
      return "bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep"
    default:
      return "bg-surface-2 text-muted-foreground"
  }
}

function renderStars(rating: number) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5
  const stars = []
  for (let i = 0; i < full; i++) {
    stars.push(
      <Star
        key={`f-${i}`}
        className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]"
      />
    )
  }
  if (hasHalf) {
    stars.push(
      <Star
        key="h"
        className="h-3.5 w-3.5 fill-[#fbbf24]/50 text-[#fbbf24]"
      />
    )
  }
  return stars
}

/* ── Page ── */

export default async function BizWorkerDetailPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/biz/workers"
          aria-label="뒤로"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          인재 상세
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column: Profile */}
        <div className="space-y-4 md:col-span-1">
          {/* Profile Card */}
          <div className="rounded-[22px] border border-border-soft bg-surface p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-[28px] font-extrabold text-brand-deep">
              {WORKER.name[0]}
            </div>
            <h2 className="mt-3 text-[18px] font-extrabold tracking-[-0.02em] text-ink">
              {WORKER.name}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <div className="flex">{renderStars(WORKER.rating)}</div>
              <span className="tabnum text-[13px] font-bold text-ink">
                {WORKER.rating}
              </span>
              <span className="tabnum text-[11.5px] font-semibold text-text-subtle">
                ({WORKER.reviewCount})
              </span>
            </div>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-tight ${badgeLevelColor(
                WORKER.badgeLevel,
              )}`}
            >
              <Award className="h-3 w-3" />
              {WORKER.badgeLevel}
            </span>
            <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
              {WORKER.bio}
            </p>

            <div className="my-4 border-t border-dashed border-border" />

            <div className="space-y-2 text-left text-[12.5px] font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {WORKER.location}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                가입 <span className="tabnum font-bold text-ink">{WORKER.joinDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="tabnum font-bold text-ink">{WORKER.completedJobs}회</span>{" "}
                근무 완료
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
              >
                <Send className="h-4 w-4" />
                제안 보내기
              </button>
              <button
                type="button"
                aria-label="단골 등록"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              보유 스킬
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WORKER.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--brand)_14%,var(--surface))] px-2.5 py-1 text-[11px] font-bold text-brand-deep"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience Badges */}
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              경험 배지
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {WORKER.experiences.map((exp) => (
                <span
                  key={exp.category}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-extrabold tracking-tight text-white"
                >
                  <Briefcase className="h-3.5 w-3.5 text-brand" />
                  {exp.category}{" "}
                  <span className="tabnum text-brand">{exp.count}회</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-4 md:col-span-2">
          {/* Availability Calendar */}
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-ink">
              <Clock className="h-4 w-4 text-brand-deep" />
              가용 시간표
            </h3>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {WORKER.availability.map((day) => (
                <div key={day.day} className="text-center">
                  <p className="mb-2 text-[11px] font-extrabold tracking-tight text-muted-foreground">
                    {day.day}
                  </p>
                  <div className="space-y-1">
                    {(["오전", "오후", "저녁"] as const).map((slot) => {
                      const on = (day.slots as readonly string[]).includes(slot);
                      return (
                        <div
                          key={slot}
                          className={`rounded-[8px] px-1 py-1.5 text-[10.5px] font-bold tracking-tight ${
                            on
                              ? "bg-brand text-ink"
                              : "bg-surface-2 text-text-subtle"
                          }`}
                        >
                          {slot}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-ink">
              <ThumbsUp className="h-4 w-4 text-brand-deep" />
              고용주 리뷰{" "}
              <span className="tabnum text-text-subtle">
                ({WORKER.reviews.length})
              </span>
            </h3>
            <div className="mt-4 divide-y divide-dashed divide-border">
              {WORKER.reviews.map((review) => (
                <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[13.5px] font-extrabold tracking-tight text-ink">
                        {review.employer}
                      </p>
                      <p className="tabnum mt-0.5 text-[11px] font-semibold text-text-subtle">
                        {review.date}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1">
                      <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                      <span className="tabnum text-[12.5px] font-extrabold text-ink">
                        {review.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
