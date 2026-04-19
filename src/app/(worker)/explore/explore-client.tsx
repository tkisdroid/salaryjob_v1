"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, Map, Inbox, List, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { JobCategory } from "@/lib/types/job";

type ViewMode = "list" | "tags" | "map";

export interface ExploreJob {
  id: string;
  title: string;
  businessName: string;
  category: JobCategory;
  hourlyPay: number;
  tags: string[];
  address: string;
}

const CATEGORIES: Array<{ key: "all" | JobCategory; label: string }> = [
  { key: "all", label: "전체" },
  { key: "food", label: "음식" },
  { key: "retail", label: "유통" },
  { key: "logistics", label: "물류" },
  { key: "office", label: "사무" },
  { key: "event", label: "행사" },
  { key: "cleaning", label: "청소" },
  { key: "education", label: "교육" },
  { key: "tech", label: "기술" },
];

const PAY_TIERS = [
  { label: "전체", value: 0 },
  { label: "1만원+", value: 10000 },
  { label: "1.2만원+", value: 12000 },
  { label: "1.5만원+", value: 15000 },
] as const;

const TAG_GROUPS: Array<{
  category: string;
  tags: Array<{ label: string; count?: number; hot?: boolean; dark?: boolean }>;
}> = [
  {
    category: "직종",
    tags: [
      { label: "카페", count: 24, hot: true },
      { label: "편의점", count: 18 },
      { label: "음식점", count: 32, hot: true },
      { label: "물류", count: 15 },
      { label: "행사", count: 8 },
      { label: "사무", count: 5 },
      { label: "교육", count: 3 },
      { label: "청소", count: 11 },
    ],
  },
  {
    category: "시간대",
    tags: [
      { label: "새벽", count: 6 },
      { label: "오전", count: 22 },
      { label: "점심", count: 14, hot: true },
      { label: "오후", count: 28 },
      { label: "저녁", count: 19 },
      { label: "야간", count: 7 },
      { label: "주말", count: 33, dark: true },
    ],
  },
  {
    category: "근무 형태",
    tags: [
      { label: "단기", count: 42, dark: true },
      { label: "장기", count: 9 },
      { label: "일일", count: 38, hot: true },
      { label: "주 1-2회" },
      { label: "주 3-4회" },
      { label: "풀타임" },
    ],
  },
  {
    category: "특징",
    tags: [
      { label: "초보 환영", count: 45, hot: true },
      { label: "즉시 출근", count: 23 },
      { label: "교통비 지원", count: 12 },
      { label: "식사 제공", count: 18 },
      { label: "급구", count: 7, hot: true },
    ],
  },
];

export function ExploreClient({ jobs }: { jobs: ExploreJob[] }) {
  const [category, setCategory] = useState<"all" | JobCategory>("all");
  const [minPay, setMinPay] = useState(0);
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (category !== "all" && job.category !== category) return false;
      if (job.hourlyPay < minPay) return false;
      return true;
    });
  }, [jobs, category, minPay]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-6">
      {/* explore-title + sub */}
      <header className="pt-3 pb-1">
        <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          탐색
        </h1>
        <p className="mt-0.5 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          내 주변 공고를 둘러보세요
        </p>
      </header>

      {/* search-input — 46px pill + ink sbtn */}
      <Link
        href="/search"
        className="mt-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-text-subtle transition-colors hover:border-ink"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">직종, 지역, 매장명으로 검색</span>
        <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-ink text-white">
          <Search className="h-[14px] w-[14px]" />
        </span>
      </Link>

      {/* triseg — 3-way view toggle */}
      <div className="mt-3 flex gap-0.5 rounded-full border border-border bg-surface p-1">
        {(
          [
            { v: "list" as const, label: "리스트", icon: List },
            { v: "tags" as const, label: "태그", icon: Tag },
            { v: "map" as const, label: "지도", icon: Map },
          ]
        ).map((seg) => (
          <button
            key={seg.v}
            type="button"
            onClick={() => setView(seg.v)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-[12.5px] font-bold tracking-tight transition-colors inline-flex items-center justify-center gap-1.5",
              view === seg.v
                ? "bg-ink text-white"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            <seg.icon className="h-[14px] w-[14px]" />
            {seg.label}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div className="space-y-3 pt-3">
          {/* chip-scroll-cats */}
          <div className="chip-scroll -mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold tracking-tight leading-none transition-colors",
                  category === cat.key
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* pay-tier chips */}
          <div className="chip-scroll -mx-4 px-4">
            {PAY_TIERS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setMinPay(opt.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold tracking-tight leading-none transition-colors",
                  minPay === opt.value
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* result-count */}
          <p className="pt-1 text-[12px] font-semibold text-muted-foreground">
            검색 결과{" "}
            <b className="tabnum font-extrabold text-ink">{filtered.length}</b>건
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
              <Inbox className="mb-4 h-12 w-12 text-text-subtle" />
              <p className="text-[15px] font-extrabold tracking-tight text-ink">
                조건에 맞는 공고가 없어요
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
                필터를 조금 넓혀 보세요
              </p>
              <Button
                variant="ghost-premium"
                className="mt-4"
                onClick={() => {
                  setCategory("all");
                  setMinPay(0);
                }}
              >
                필터 초기화
              </Button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/posts/${job.id}`}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface px-4.5 py-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-extrabold tracking-[-0.025em] text-ink">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">
                        {job.businessName}
                      </p>
                      {job.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabnum text-[15px] font-extrabold tracking-[-0.025em] text-brand-deep">
                        {formatMoney(job.hourlyPay)}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.address.split(" ").slice(0, 2).join(" ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === "tags" && (
        <div className="space-y-6 pt-4">
          {TAG_GROUPS.map((group) => (
            <section key={group.category}>
              <h3 className="mb-2 text-[11.5px] font-extrabold tracking-wider uppercase text-muted-foreground">
                {group.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((t) => (
                  <Link
                    key={t.label}
                    href={`/search?tag=${t.label}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-[7px] text-[12px] font-bold tracking-tight transition-colors",
                      t.hot
                        ? "border-transparent bg-lime-chip text-lime-chip-fg"
                        : t.dark
                          ? "border-ink bg-ink text-white"
                          : "border-border bg-surface text-ink hover:border-ink",
                    )}
                  >
                    {t.label}
                    {typeof t.count === "number" && (
                      <span
                        className={cn(
                          "tabnum text-[10.5px] ml-0.5",
                          t.hot
                            ? "text-[color-mix(in_oklch,var(--lime-chip-fg)_70%,transparent)]"
                            : t.dark
                              ? "text-[color-mix(in_oklch,#fff_60%,transparent)]"
                              : "text-muted-foreground",
                        )}
                      >
                        {t.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === "map" && (
        <div className="pt-4">
          <div className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border bg-surface-2 px-6 py-20 text-center">
            <Map className="mb-4 h-12 w-12 text-text-subtle" />
            <p className="text-[15px] font-extrabold tracking-tight text-ink">
              지도 뷰는 곧 추가됩니다
            </p>
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              내 주변 공고를 지도에서 한눈에 확인하세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
