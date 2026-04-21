"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, List, Map as MapIcon, MapPin, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/worker/map-view";
import { formatMoney } from "@/lib/format";
import { categoryLabel, formatWorkDate } from "@/lib/job-utils";
import type { Job, JobCategory } from "@/lib/types/job";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "tags" | "map";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 } as const;

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

function compactAddress(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return "주소 미등록";
  return trimmed.split(" ").slice(0, 2).join(" ");
}

function buildTagGroups(jobs: Job[]) {
  const tagCounts = new Map<string, number>();
  for (const job of jobs) {
    for (const tag of job.tags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }

  const categoryTags = CATEGORIES.filter((cat) => cat.key !== "all").map((cat) => ({
    label: cat.label,
    value: categoryLabel(cat.key as JobCategory),
    count: jobs.filter((job) => job.category === cat.key).length,
    category: cat.key,
  }));

  const popularTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko-KR"))
    .slice(0, 14)
    .map(([label, count]) => ({ label, value: label, count }));

  return [
    { title: "직종", tags: categoryTags },
    { title: "공고 태그", tags: popularTags },
  ];
}

export function ExploreClient({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | JobCategory>("all");
  const [minPay, setMinPay] = useState(0);
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (category !== "all" && job.category !== category) return false;
      if (job.hourlyPay < minPay) return false;
      if (!normalizedQuery) return true;

      return (
        job.title.toLowerCase().includes(normalizedQuery) ||
        job.business.name.toLowerCase().includes(normalizedQuery) ||
        job.business.address.toLowerCase().includes(normalizedQuery) ||
        categoryLabel(job.category).toLowerCase().includes(normalizedQuery) ||
        job.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [jobs, query, category, minPay]);

  const mapCenter = useMemo(() => {
    const coordinates = filtered
      .map((job) => ({
        lat: Number(job.business.lat),
        lng: Number(job.business.lng),
      }))
      .filter((coord) => Number.isFinite(coord.lat) && Number.isFinite(coord.lng));

    if (coordinates.length === 0) return DEFAULT_CENTER;

    return {
      lat: coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length,
      lng: coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length,
    };
  }, [filtered]);

  const tagGroups = useMemo(() => buildTagGroups(jobs), [jobs]);

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setMinPay(0);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-6">
      <header className="pt-3 pb-1">
        <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          탐색
        </h1>
        <p className="mt-0.5 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          내 주변 공고를 검색하고 비교하세요
        </p>
      </header>

      <div className="mt-4 flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-[13px] font-medium transition-colors focus-within:border-ink">
        <Search className="h-4 w-4 text-text-subtle" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="직종, 지역, 매장명으로 검색"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-text-subtle"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="검색어 지우기"
            className="grid h-7 w-7 place-items-center rounded-[10px] text-text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-[14px] w-[14px]" />
          </button>
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-ink text-white">
            <Search className="h-[14px] w-[14px]" />
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-0.5 rounded-full border border-border bg-surface p-1">
        {(
          [
            { v: "list" as const, label: "리스트", icon: List },
            { v: "tags" as const, label: "태그", icon: Tag },
            { v: "map" as const, label: "지도", icon: MapIcon },
          ]
        ).map((seg) => (
          <button
            key={seg.v}
            type="button"
            onClick={() => setView(seg.v)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-bold tracking-tight transition-colors",
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

      {view !== "tags" && (
        <div className="space-y-3 pt-3">
          <div className="chip-scroll -mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
                  category === cat.key
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="chip-scroll -mx-4 px-4">
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

          <p className="pt-1 text-[12px] font-semibold text-muted-foreground">
            검색 결과{" "}
            <b className="tabnum font-extrabold text-ink">{filtered.length}</b>건
          </p>
        </div>
      )}

      {view === "list" && (
        <div className="pt-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-border bg-surface py-16 text-center">
              <Inbox className="mb-4 h-12 w-12 text-text-subtle" />
              <p className="text-[15px] font-extrabold tracking-tight text-ink">
                조건에 맞는 공고가 없어요
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
                필터를 조금 넓혀 보세요
              </p>
              <Button variant="ghost-premium" className="mt-4" onClick={resetFilters}>
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
                        {job.business.name} · {categoryLabel(job.category)}
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
                        {compactAddress(job.business.address)}
                      </p>
                      <p className="tabnum mt-0.5 text-[11.5px] font-semibold text-muted-foreground">
                        {formatWorkDate(job.workDate)} {job.startTime}
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
          {tagGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.tags.length === 0 ? (
                  <span className="text-[12.5px] font-semibold text-muted-foreground">
                    등록된 태그가 없습니다.
                  </span>
                ) : (
                  group.tags.map((tag) => (
                    <button
                      key={`${group.title}-${tag.value}`}
                      type="button"
                      onClick={() => {
                        if ("category" in tag && tag.category) {
                          setCategory(tag.category as JobCategory);
                          setQuery("");
                        } else {
                          setQuery(tag.value);
                        }
                        setView("list");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-[7px] text-[12px] font-bold tracking-tight text-ink transition-colors hover:border-ink"
                    >
                      {tag.label}
                      <span className="tabnum ml-0.5 text-[10.5px] text-muted-foreground">
                        {tag.count}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === "map" && (
        <div className="pt-4">
          <MapView
            center={mapCenter}
            jobs={filtered}
            radiusM={3000}
            onMarkerClick={(jobId) => router.push(`/posts/${jobId}`)}
          />
        </div>
      )}
    </div>
  );
}
