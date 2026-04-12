"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  MapPin,
  Clock,
  Inbox,
  Flame,
} from "lucide-react";
import { BackButton } from "@/components/shared/back-button";
import type { JobCategory } from "@/lib/types/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SearchJob {
  id: string;
  title: string;
  businessName: string;
  category: JobCategory;
  hourlyPay: number;
  workDate: string;
  isUrgent: boolean;
  tags: string[];
  address: string;
}

const CATEGORY_LABELS: Record<"all" | JobCategory, string> = {
  all: "전체",
  food: "음식",
  retail: "유통",
  logistics: "물류",
  office: "사무",
  event: "행사",
  cleaning: "청소",
  education: "교육",
  tech: "기술",
};

const CATEGORIES: Array<"all" | JobCategory> = [
  "all",
  "food",
  "retail",
  "logistics",
  "office",
  "event",
  "cleaning",
  "education",
  "tech",
];

const PAY_TIERS = [
  { label: "전체", value: 0 },
  { label: "1만원 이상", value: 10000 },
  { label: "1.2만원 이상", value: 12000 },
  { label: "1.5만원 이상", value: 15000 },
] as const;

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

export function SearchClient({ jobs }: { jobs: SearchJob[] }) {
  const params = useSearchParams();
  // Seed urgent filter from URL param (/search?urgent=1)
  const initialUrgent = params.get("urgent") === "1";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | JobCategory>("all");
  const [minPay, setMinPay] = useState(0);
  const [urgentOnly, setUrgentOnly] = useState(initialUrgent);

  // Keep urgent filter in sync if the URL param changes (back/forward nav)
  useEffect(() => {
    setUrgentOnly(params.get("urgent") === "1");
  }, [params]);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (category !== "all" && job.category !== category) return false;
      if (job.hourlyPay < minPay) return false;
      if (urgentOnly && !job.isUrgent) return false;
      if (query.length === 0) return true;
      const q = query.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.businessName.toLowerCase().includes(q) ||
        job.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [jobs, query, category, minPay, urgentOnly]);

  return (
    <div className="max-w-lg mx-auto px-5 sm:px-6 py-6 space-y-5">
      {/* Header with back */}
      <div className="flex items-center gap-2">
        <BackButton fallbackHref="/explore" ariaLabel="뒤로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </BackButton>
        <h1 className="text-lg font-bold">검색</h1>
      </div>

      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="직종·회사명·태그로 검색"
          className="w-full h-11 pl-9 pr-9 rounded-full border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Urgent toggle */}
      <div>
        <button
          type="button"
          onClick={() => setUrgentOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            urgentOnly
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          급구만 보기
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 sm:-mx-6 px-5 sm:px-6">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat)}
            className="shrink-0 rounded-full"
          >
            {CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Pay filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 sm:-mx-6 px-5 sm:px-6">
        {PAY_TIERS.map((opt) => (
          <Button
            key={opt.label}
            variant={minPay === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setMinPay(opt.value)}
            className="shrink-0 rounded-full"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        검색 결과{" "}
        <span className="font-semibold text-foreground">
          {filtered.length}건
        </span>
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">
            조건에 맞는 공고가 없어요
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            검색어나 필터를 조금 넓혀 보세요
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setMinPay(0);
              setUrgentOnly(false);
            }}
          >
            필터 초기화
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <Link key={job.id} href={`/posts/${job.id}`} className="block">
              <Card className="transition-colors hover:border-brand/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground truncate">
                        {job.businessName}
                      </p>
                      <h3 className="text-sm font-bold mt-0.5 line-clamp-1">
                        {job.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-brand">
                        {formatWon(job.hourlyPay)}
                      </p>
                      {job.isUrgent && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                          <Flame className="w-2.5 h-2.5" />
                          급구
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(job.workDate)}
                    </span>
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {job.address.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </span>
                  </div>
                  {job.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.tags.slice(0, 4).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
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
    </div>
  );
}
