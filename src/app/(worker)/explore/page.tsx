"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Search, SlidersHorizontal, Map } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const FILTER_CHIPS = [
  { key: "category", label: "카테고리" },
  { key: "distance", label: "거리" },
  { key: "pay", label: "시급" },
] as const;

const POSTS = [
  {
    id: "p-1",
    title: "카페 바리스타",
    company: "블루보틀 강남점",
    pay: "시급 13,000원",
    distance: "0.8km",
    tags: ["카페", "주말"],
    category: "음식",
  },
  {
    id: "p-2",
    title: "편의점 주간",
    company: "CU 삼성역점",
    pay: "시급 11,000원",
    distance: "1.0km",
    tags: ["편의점", "주간"],
    category: "유통",
  },
  {
    id: "p-3",
    title: "행사 스태프",
    company: "이벤트플러스",
    pay: "시급 15,000원",
    distance: "1.2km",
    tags: ["행사", "단기"],
    category: "행사",
  },
  {
    id: "p-4",
    title: "물류 분류 작업",
    company: "쿠팡 풀필먼트",
    pay: "시급 12,500원",
    distance: "2.5km",
    tags: ["물류", "야간"],
    category: "물류",
  },
  {
    id: "p-5",
    title: "서빙 알바",
    company: "스타벅스 선릉점",
    pay: "시급 11,500원",
    distance: "0.3km",
    tags: ["카페", "평일"],
    category: "음식",
  },
];

const TAG_GROUPS = [
  {
    category: "직종",
    tags: ["카페", "편의점", "음식점", "물류", "행사", "사무", "교육", "청소"],
  },
  {
    category: "시간대",
    tags: ["새벽", "오전", "점심", "오후", "저녁", "야간", "주말"],
  },
  {
    category: "근무 형태",
    tags: ["단기", "장기", "일일", "주 1-2회", "주 3-4회", "풀타임"],
  },
  {
    category: "특징",
    tags: ["초보 환영", "즉시 출근", "교통비 지원", "식사 제공", "급구"],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExploreHubPage() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  function toggleFilter(key: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">탐색</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          내 주변 공고를 둘러보세요
        </p>
      </header>

      {/* Search shortcut */}
      <Link href="/search">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:border-brand/40 transition-colors">
          <Search className="w-4 h-4 shrink-0" />
          <span>공고 검색...</span>
        </div>
      </Link>

      <Tabs defaultValue="list">
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1">
            리스트
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex-1">
            태그
          </TabsTrigger>
          <TabsTrigger value="map" className="flex-1">
            지도
          </TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4 pt-4">
          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_CHIPS.map((chip) => (
              <Button
                key={chip.key}
                variant={activeFilters.has(chip.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(chip.key)}
                className="shrink-0"
              >
                <SlidersHorizontal className="w-3 h-3" />
                {chip.label}
              </Button>
            ))}
          </div>

          {/* Post list */}
          <div className="space-y-3">
            {POSTS.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`}>
                <Card className="hover:ring-brand/30 transition-shadow">
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold tracking-tight">{post.title}</h3>
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
                    <div className="flex flex-wrap gap-1 mt-2">
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-6 pt-4">
          {TAG_GROUPS.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                {group.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <Link key={tag} href={`/search?tag=${tag}`}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-brand hover:text-white hover:border-brand transition-colors px-3 py-1"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map" className="pt-4">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-20 px-6 text-center">
            <Map className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">
              지도 뷰는 곧 추가됩니다
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              내 주변 공고를 지도에서 한눈에 확인하세요
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
