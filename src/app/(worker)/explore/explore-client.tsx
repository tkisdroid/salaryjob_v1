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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

export interface ExploreJob {
  id: string;
  title: string;
  businessName: string;
  hourlyPay: number;
  tags: string[];
  address: string;
}

const FILTER_CHIPS = [
  { key: "category", label: "카테고리" },
  { key: "distance", label: "거리" },
  { key: "pay", label: "시급" },
] as const;

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

export function ExploreClient({ jobs }: { jobs: ExploreJob[] }) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  function toggleFilter(key: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">탐색</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          내 주변 공고를 둘러보세요
        </p>
      </header>

      <Link href="/search">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-brand/40">
          <Search className="h-4 w-4 shrink-0" />
          <span>공고 검색...</span>
        </div>
      </Link>

      <Tabs defaultValue="list">
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1">리스트</TabsTrigger>
          <TabsTrigger value="tags" className="flex-1">태그</TabsTrigger>
          <TabsTrigger value="map" className="flex-1">지도</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_CHIPS.map((chip) => (
              <Button
                key={chip.key}
                variant={activeFilters.has(chip.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(chip.key)}
                className="shrink-0"
              >
                <SlidersHorizontal className="h-3 w-3" />
                {chip.label}
              </Button>
            ))}
          </div>

          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-bold text-muted-foreground">아직 공고가 없어요</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                새 공고가 등록되면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Link key={job.id} href={`/posts/${job.id}`}>
                  <Card className="transition-shadow hover:ring-brand/30">
                    <CardContent>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold tracking-tight">
                            {job.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {job.businessName}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-brand">
                            {formatMoney(job.hourlyPay)}
                          </p>
                          <p className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {job.address.split(" ").slice(0, 2).join(" ")}
                          </p>
                        </div>
                      </div>
                      {job.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

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
                      className="cursor-pointer px-3 py-1 transition-colors hover:border-brand hover:bg-brand hover:text-white"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="map" className="pt-4">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-20 text-center">
            <Map className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="font-bold text-muted-foreground">지도 뷰는 곧 추가됩니다</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              내 주변 공고를 지도에서 한눈에 확인하세요
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
