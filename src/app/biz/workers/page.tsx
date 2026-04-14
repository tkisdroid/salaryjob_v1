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
import { Input } from "@/components/ui/input"

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
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">인재 검색</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          조건에 맞는 인재를 검색하고 제안을 보내보세요.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 스킬로 검색..."
          className="h-11 rounded-2xl border-border bg-card text-sm pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "전체 카테고리" },
          { label: "전체 지역" },
          { label: "전체 평점" },
          { label: "전체 가용시간" },
        ].map((f) => (
          <button key={f.label}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent transition-colors active:scale-95">
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-4">
            <Users className="w-8 h-8 text-brand" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            조건에 맞는 인재를 찾지 못했어요
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            조건을 넓혀보세요. 더 많은 인재를 만날 수 있어요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold shrink-0">
                  {worker.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/biz/workers/${worker.id}`}
                      className="text-sm font-bold hover:text-brand transition-colors"
                    >
                      {worker.name}
                    </Link>
                    <button
                      onClick={() => toggleFavorite(worker.id)}
                      className="transition-transform active:scale-90"
                      aria-label={
                        favorites[worker.id]
                          ? "단골 해제"
                          : "단골 등록"
                      }
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          favorites[worker.id]
                            ? "fill-brand text-brand"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{worker.rating} · {worker.completedJobs}회 근무</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {worker.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{worker.location}{"\u3000"}{worker.availability}</span>
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
