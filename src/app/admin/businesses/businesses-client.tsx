"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";

/**
 * Admin business list — client filter bar.
 *
 * URL-as-source-of-truth (D-40..D-43):
 *   ?q=…&field=name|reg|owner|phone
 *   &verified=all|yes|no
 *   &sort=created_desc|created_asc|rate_desc|rate_asc
 *   &cursor=…
 *
 * All filter changes drop the cursor and call router.replace() inside
 * useTransition so the page stays interactive while the server re-renders.
 * 300ms debounce on the search input to avoid excessive navigations.
 */

type SearchField = "name" | "reg" | "owner" | "phone";
type VerifiedFilter = "all" | "yes" | "no";
type SortOption =
  | "created_desc"
  | "created_asc"
  | "rate_desc"
  | "rate_asc";

interface Props {
  initialQuery?: string;
  initialField?: SearchField;
  initialVerified?: VerifiedFilter;
  initialSort?: SortOption;
}

const FIELD_LABELS: Record<SearchField, string> = {
  name: "사업장명",
  reg: "사업자번호",
  owner: "대표자",
  phone: "연락처",
};

const SORT_LABELS: Record<SortOption, string> = {
  created_desc: "최신순",
  created_asc: "오래된순",
  rate_desc: "수수료 높은순",
  rate_asc: "수수료 낮은순",
};

export function BusinessesClient({
  initialQuery = "",
  initialField = "name",
  initialVerified = "all",
  initialSort = "created_desc",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(overrides: Partial<Record<string, string | null>>) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    // Always drop cursor when filters change
    params.delete("cursor");
    for (const [key, value] of Object.entries(overrides)) {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value as string);
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : (pathname || "/admin/businesses"));
    });
  }

  // Debounced search input handler (300ms)
  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: value || null });
    }, 300);
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const currentField = (sp?.get("field") as SearchField) ?? initialField;
  const currentVerified =
    (sp?.get("verified") as VerifiedFilter) ?? initialVerified;
  const currentSort = (sp?.get("sort") as SortOption) ?? initialSort;

  return (
    <div
      className={`space-y-4 rounded-lg border border-border bg-card p-4 ${
        isPending ? "opacity-70" : ""
      }`}
      aria-busy={isPending}
    >
      {/* Search row: input + field selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="검색어 입력..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="min-h-[44px] flex-1"
          aria-label="사업장 검색"
        />
        <ToggleGroup
          type="single"
          value={currentField}
          onValueChange={(v) => {
            if (!v) return;
            navigate({ field: v });
          }}
          aria-label="검색 필드"
          className="flex flex-wrap gap-1"
        >
          {(Object.keys(FIELD_LABELS) as SearchField[]).map((f) => (
            <ToggleGroupItem
              key={f}
              value={f}
              aria-label={FIELD_LABELS[f]}
              className="min-h-[44px] px-3"
            >
              {FIELD_LABELS[f]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Verified filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">인증</span>
        <ToggleGroup
          type="single"
          value={currentVerified}
          onValueChange={(v) => {
            if (!v) return;
            navigate({ verified: v });
          }}
          aria-label="인증 상태 필터"
          className="flex gap-1"
        >
          <ToggleGroupItem value="all" className="min-h-[44px] px-3">
            전체
          </ToggleGroupItem>
          <ToggleGroupItem value="yes" className="min-h-[44px] px-3">
            인증됨
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="min-h-[44px] px-3">
            미인증
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Sort selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">정렬</span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
            <button
              key={s}
              onClick={() => navigate({ sort: s })}
              className={`min-h-[44px] rounded-md border px-3 text-sm transition-colors ${
                currentSort === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-label={SORT_LABELS[s]}
              aria-pressed={currentSort === s}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
