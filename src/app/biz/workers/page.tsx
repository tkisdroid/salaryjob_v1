"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  Star,
  Heart,
  MapPin,
  Users,
} from "lucide-react"

/* ── Mock Data ── */

const WORKERS = [
  {
    id: "w1",
    name: "이준호",
    rating: 4.9,
    completedJobs: 23,
    skills: ["카페", "서빙", "음료제조"],
    location: "강남구",
    availability: "주말 가능",
    isFavorite: true,
  },
  {
    id: "w2",
    name: "박서연",
    rating: 4.8,
    completedJobs: 15,
    skills: ["서빙", "음료제조", "청소"],
    location: "서초구",
    availability: "평일/주말 가능",
    isFavorite: false,
  },
  {
    id: "w3",
    name: "최동현",
    rating: 4.7,
    completedJobs: 31,
    skills: ["물류", "상하차", "배송"],
    location: "영등포구",
    availability: "평일 가능",
    isFavorite: true,
  },
  {
    id: "w4",
    name: "정하늘",
    rating: 4.6,
    completedJobs: 8,
    skills: ["카페", "베이킹", "서빙"],
    location: "마포구",
    availability: "주말 가능",
    isFavorite: false,
  },
  {
    id: "w5",
    name: "김수진",
    rating: 4.9,
    completedJobs: 42,
    skills: ["사무", "행정", "데이터입력"],
    location: "강남구",
    availability: "평일 오전 가능",
    isFavorite: false,
  },
  {
    id: "w6",
    name: "오민석",
    rating: 4.4,
    completedJobs: 12,
    skills: ["이벤트", "행사", "세팅"],
    location: "송파구",
    availability: "주말 가능",
    isFavorite: false,
  },
] as const

/* ── Page ── */

export default function BizWorkersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<Record<string, boolean>>(
    Object.fromEntries(WORKERS.map((w) => [w.id, w.isFavorite]))
  )

  function toggleFavorite(workerId: string) {
    setFavorites((prev) => ({
      ...prev,
      [workerId]: !prev[workerId],
    }))
  }

  const filteredWorkers = WORKERS.filter((w) =>
    searchQuery
      ? w.name.includes(searchQuery) ||
        w.skills.some((s) => s.includes(searchQuery))
      : true
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          <Users className="h-[22px] w-[22px] text-brand-deep" />
          인재 검색
        </h1>
        <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          조건에 맞는 인재를 검색하고 제안을 보내보세요.
        </p>
      </div>

      {/* Search — 46px pill */}
      <div className="relative mb-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 transition-colors focus-within:border-ink">
        <Search className="h-4 w-4 text-text-subtle" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 스킬로 검색..."
          className="flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-text-subtle focus:outline-none"
        />
      </div>

      {/* Filter Row */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "전체 카테고리" },
          { label: "전체 지역" },
          { label: "전체 평점" },
          { label: "전체 가용시간" },
        ].map((f) => (
          <button
            key={f.label}
            type="button"
            className="rounded-full border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight text-ink transition-colors hover:border-ink"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-surface py-20 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-[20px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
            <Users className="h-8 w-8 text-brand-deep" />
          </div>
          <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
            조건에 맞는 인재를 찾지 못했어요
          </h3>
          <p className="max-w-sm text-[13px] font-medium text-muted-foreground">
            조건을 넓혀보세요. 더 많은 인재를 만날 수 있어요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="rounded-[22px] border border-border-soft bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-[14px] font-extrabold text-brand-deep">
                  {worker.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/biz/workers/${worker.id}`}
                      className="truncate text-[14.5px] font-extrabold tracking-[-0.02em] text-ink transition-colors hover:text-brand-deep"
                    >
                      {worker.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(worker.id)}
                      className="shrink-0 grid h-8 w-8 place-items-center rounded-full transition-transform hover:bg-surface-2 active:scale-90"
                      aria-label={
                        favorites[worker.id] ? "단골 해제" : "단골 등록"
                      }
                    >
                      <Heart
                        className={`h-[18px] w-[18px] ${
                          favorites[worker.id]
                            ? "fill-brand-deep text-brand-deep"
                            : "text-text-subtle"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="tabnum mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                    <Star className="h-3 w-3 fill-[#fbbf24] text-[#fbbf24]" />
                    <span>
                      <b className="font-bold text-ink">{worker.rating}</b> ·{" "}
                      {worker.completedJobs}회 근무
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {worker.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--brand)_14%,var(--surface))] px-2 py-0.5 text-[10.5px] font-bold text-brand-deep"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      <b className="font-bold text-ink">{worker.location}</b>
                      {"\u3000"}
                      {worker.availability}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
