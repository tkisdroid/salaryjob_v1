"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Search as SearchIcon,
  X,
  MapPin,
  Clock,
  Inbox,
  Flame,
} from "lucide-react";
import type { JobCategory } from "@/lib/types/job";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

function isJobCategory(value: string | null): value is JobCategory {
  return value !== null && CATEGORIES.includes(value as "all" | JobCategory) && value !== "all";
}

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
  const initialUrgent = params.get("urgent") === "1";
  const categoryParam = params.get("category");
  const initialCategory: "all" | JobCategory = isJobCategory(categoryParam)
    ? categoryParam
    : "all";
  const initialQuery = params.get("q") ?? params.get("tag") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<"all" | JobCategory>(initialCategory);
  const [minPay, setMinPay] = useState(0);
  const [urgentOnly, setUrgentOnly] = useState(initialUrgent);

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
        job.address.toLowerCase().includes(q) ||
        job.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [jobs, query, category, minPay, urgentOnly]);

  return (
    <div className="mx-auto max-w-lg px-5 pt-5 pb-6 sm:px-6">
      {/* Header with chevron back */}
      <div className="flex items-center gap-2 pb-1">
        <Link
          href="/explore"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <SearchIcon className="h-[20px] w-[20px] text-brand-deep" />
          검색
        </h1>
      </div>

      {/* Search input — 46px pill + ink search button */}
      <div className="relative mt-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 transition-colors focus-within:border-ink">
        <SearchIcon className="h-4 w-4 text-text-subtle" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="직종·회사명·태그로 검색"
          className="flex-1 bg-transparent text-[13px] font-medium text-ink placeholder:text-text-subtle focus:outline-none"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="grid h-6 w-6 place-items-center rounded-full text-text-subtle hover:bg-surface-2 hover:text-ink"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Urgent toggle — lime-chip when active */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setUrgentOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold tracking-tight leading-none transition-colors",
            urgentOnly
              ? "border-transparent bg-lime-chip text-lime-chip-fg"
              : "border-border bg-surface text-ink hover:border-ink",
          )}
        >
          <Flame className="h-[14px] w-[14px]" />
          급구만 보기
        </button>
      </div>

      {/* Category filter — chip-scroll */}
      <div className="chip-scroll -mx-5 mt-3 px-5 sm:-mx-6 sm:px-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
              category === cat
                ? "border-ink bg-ink text-white"
                : "border-border bg-surface text-ink hover:border-ink",
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Pay filter — chip-scroll */}
      <div className="chip-scroll -mx-5 mt-3 px-5 sm:-mx-6 sm:px-6">
        {PAY_TIERS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setMinPay(opt.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
              minPay === opt.value
                ? "border-ink bg-ink text-white"
                : "border-border bg-surface text-ink hover:border-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="pt-4 text-[12px] font-semibold text-muted-foreground">
        검색 결과{" "}
        <b className="tabnum font-extrabold text-ink">{filtered.length}</b>건
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
          <Inbox className="mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            조건에 맞는 공고가 없어요
          </p>
          <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
            검색어나 필터를 조금 넓혀 보세요
          </p>
          <Button
            variant="ghost-premium"
            className="mt-4"
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
        <ul className="mt-3 space-y-2.5">
          {filtered.map((job) => (
            <li key={job.id}>
              <Link
                href={`/posts/${job.id}`}
                className="block rounded-[22px] border border-border bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {job.isUrgent && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime-chip px-[9px] py-[4px] text-[10.5px] font-extrabold leading-none tracking-tight text-lime-chip-fg">
                          <Flame className="h-[10px] w-[10px]" />
                          급구
                        </span>
                      )}
                      <p className="min-w-0 truncate text-[11.5px] font-bold tracking-tight text-muted-foreground">
                        {job.businessName}
                      </p>
                    </div>
                    <h3 className="mt-0.5 line-clamp-1 text-[15px] font-extrabold tracking-[-0.025em] text-ink">
                      {job.title}
                    </h3>
                  </div>
                  <div className="shrink-0 pt-0.5 text-right">
                    <p className="tabnum text-[15px] font-extrabold tracking-[-0.025em] text-brand-deep">
                      {formatWon(job.hourlyPay)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[11.5px] font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(job.workDate)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {job.address.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </span>
                </div>
                {job.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
