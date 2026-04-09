"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search as SearchIcon,
  X,
  MapPin,
  SlidersHorizontal,
  Inbox,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const ALL_POSTS = [
  {
    id: "s-1",
    title: "카페 바리스타",
    company: "블루보틀 강남점",
    pay: "시급 13,000원",
    payAmount: 13000,
    distance: "0.8km",
    distanceKm: 0.8,
    category: "카페",
    date: "2026-03-28",
    tags: ["카페", "주말"],
  },
  {
    id: "s-2",
    title: "편의점 주간 근무",
    company: "CU 삼성역점",
    pay: "시급 11,000원",
    payAmount: 11000,
    distance: "1.0km",
    distanceKm: 1.0,
    category: "유통",
    date: "2026-03-27",
    tags: ["편의점", "주간"],
  },
  {
    id: "s-3",
    title: "행사 스태프 모집",
    company: "이벤트플러스",
    pay: "시급 15,000원",
    payAmount: 15000,
    distance: "1.2km",
    distanceKm: 1.2,
    category: "행사",
    date: "2026-03-29",
    tags: ["행사", "단기"],
  },
  {
    id: "s-4",
    title: "물류 분류 작업",
    company: "쿠팡 풀필먼트",
    pay: "시급 12,500원",
    payAmount: 12500,
    distance: "2.5km",
    distanceKm: 2.5,
    category: "물류",
    date: "2026-03-30",
    tags: ["물류", "야간"],
  },
  {
    id: "s-5",
    title: "서빙 알바",
    company: "스타벅스 선릉점",
    pay: "시급 11,500원",
    payAmount: 11500,
    distance: "0.3km",
    distanceKm: 0.3,
    category: "카페",
    date: "2026-03-26",
    tags: ["카페", "평일"],
  },
  {
    id: "s-6",
    title: "사무실 청소",
    company: "클린메이트",
    pay: "시급 12,000원",
    payAmount: 12000,
    distance: "1.8km",
    distanceKm: 1.8,
    category: "청소",
    date: "2026-03-28",
    tags: ["청소", "오전"],
  },
  {
    id: "s-7",
    title: "과외 보조교사",
    company: "에듀플러스",
    pay: "시급 16,000원",
    payAmount: 16000,
    distance: "3.2km",
    distanceKm: 3.2,
    category: "교육",
    date: "2026-04-01",
    tags: ["교육", "오후"],
  },
];

const CATEGORIES = [
  "전체",
  "카페",
  "유통",
  "행사",
  "물류",
  "청소",
  "교육",
] as const;

const DISTANCE_OPTIONS = [
  { label: "전체", value: Infinity },
  { label: "1km 이내", value: 1 },
  { label: "2km 이내", value: 2 },
  { label: "5km 이내", value: 5 },
] as const;

const PAY_OPTIONS = [
  { label: "전체", value: 0 },
  { label: "1만원+", value: 10000 },
  { label: "1.2만원+", value: 12000 },
  { label: "1.5만원+", value: 15000 },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [maxDistance, setMaxDistance] = useState(Infinity);
  const [minPay, setMinPay] = useState(0);

  const filteredPosts = useMemo(() => {
    return ALL_POSTS.filter((post) => {
      const matchesQuery =
        query.length === 0 ||
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.company.toLowerCase().includes(query.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === "전체" || post.category === selectedCategory;

      const matchesDistance = post.distanceKm <= maxDistance;

      const matchesPay = post.payAmount >= minPay;

      return matchesQuery && matchesCategory && matchesDistance && matchesPay;
    });
  }, [query, selectedCategory, maxDistance, minPay]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="공고 검색 (직종, 회사명, 태그)"
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Category */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Distance + Pay */}
        <div className="flex gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {DISTANCE_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant={maxDistance === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMaxDistance(opt.value)}
                className="shrink-0 text-xs"
              >
                <MapPin className="w-3 h-3" />
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PAY_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              variant={minPay === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setMinPay(opt.value)}
              className="shrink-0 text-xs"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        검색 결과{" "}
        <span className="font-semibold text-foreground">
          {filteredPosts.length}건
        </span>
      </p>

      {/* Results */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">
            조건에 맞는 공고가 없어요
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            검색어나 필터를 변경해보세요
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setSelectedCategory("전체");
              setMaxDistance(Infinity);
              setMinPay(0);
            }}
          >
            필터 초기화
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <Card className="hover:ring-brand/30 transition-shadow">
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{post.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {post.company}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-brand">
                        {post.pay}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                        <MapPin className="w-3 h-3" />
                        {post.distance}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {post.date}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
