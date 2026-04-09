"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  Star,
  Heart,
  Briefcase,
  MapPin,
  Filter,
  Users,
  SlidersHorizontal,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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

const CATEGORIES = [
  { value: "", label: "전체 카테고리" },
  { value: "food", label: "외식/음료" },
  { value: "retail", label: "판매/매장" },
  { value: "logistics", label: "물류/배송" },
  { value: "office", label: "사무/행정" },
  { value: "event", label: "이벤트/행사" },
  { value: "cleaning", label: "청소/정리" },
] as const

const LOCATIONS = [
  { value: "", label: "전체 지역" },
  { value: "gangnam", label: "강남구" },
  { value: "seocho", label: "서초구" },
  { value: "mapo", label: "마포구" },
  { value: "yeongdeungpo", label: "영등포구" },
  { value: "songpa", label: "송파구" },
] as const

const RATINGS = [
  { value: "", label: "전체 평점" },
  { value: "4.5", label: "4.5 이상" },
  { value: "4.0", label: "4.0 이상" },
  { value: "3.5", label: "3.5 이상" },
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
        <h1 className="text-2xl font-bold text-foreground">인재 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select className="w-auto min-w-[140px]">
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[120px]">
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[120px]">
          {RATINGS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <Select className="w-auto min-w-[140px]">
          <option value="">전체 가용시간</option>
          <option value="weekday">평일 가능</option>
          <option value="weekend">주말 가능</option>
          <option value="anytime">전일 가능</option>
        </Select>
      </div>

      {/* Results */}
      {filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 mb-4">
            <Users className="w-8 h-8 text-teal" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            조건에 맞는 인재를 찾지 못했어요
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            조건을 넓혀보세요. 더 많은 인재를 만날 수 있어요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => (
            <Card
              key={worker.id}
              className="hover:ring-2 hover:ring-teal/20 transition-all"
            >
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <Link
                    href={`/biz/workers/${worker.id}`}
                    className="flex items-center gap-3"
                  >
                    <Avatar size="lg">
                      <AvatarFallback>{worker.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold hover:text-teal transition-colors">
                        {worker.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-brand text-brand" />
                        {worker.rating} · {worker.completedJobs}회 근무
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleFavorite(worker.id)}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
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

                <div className="flex flex-wrap gap-1 mb-3">
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

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {worker.location}
                  </span>
                  <span>{worker.availability}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
