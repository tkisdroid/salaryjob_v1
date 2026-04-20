"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { List, Map as MapIcon } from "lucide-react";
import type { TimePreset, TimeBucket } from "@/lib/time-filters";
import { cn } from "@/lib/utils";

/**
 * Phase 4 Plan 04-07 SEARCH-02 + SEARCH-03 — /home filter bar.
 *
 * URL-as-source-of-truth: every filter update mutates the current pathname's
 * query string via `router.replace`, which triggers a server component
 * re-render that re-fetches jobs with the new filter. This keeps deep-links
 * shareable and the browser Back button predictable.
 *
 * URL query param schema:
 *   ?view=list|map               (default: list)
 *   &radius=1|3|5|10             (default: 3, km)
 *   &preset=오늘|내일|이번주      (optional, unset = no preset filter)
 *   &buckets=오전&buckets=오후...(multi, repeated keys, unset = no bucket filter)
 *
 * The `mapAvailable` prop drives whether the "지도" toggle is disabled —
 * set by the server component from `Boolean(process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)`.
 *
 * `useTransition` wraps `router.replace` so UI stays interactive while the
 * server action fetches new data (pending state can be surfaced via isPending).
 */

interface Props {
  currentRadius: number;
  currentPreset?: TimePreset;
  currentBuckets: TimeBucket[];
  currentView: "list" | "map";
  /**
   * Reserved for future UX signal (e.g. badge). The 지도 toggle itself is
   * always clickable — if the Naver map key is missing, MapView renders a
   * friendly placeholder instead of silently dying under a disabled button.
   */
  mapAvailable: boolean;
}

const RADIUS_STEPS = [1, 3, 5, 10] as const;
const PRESETS: TimePreset[] = ["오늘", "내일", "이번주"];
const BUCKETS: TimeBucket[] = ["오전", "오후", "저녁", "야간"];

export function HomeFilterBar({
  currentRadius,
  currentPreset,
  currentBuckets,
  currentView,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildHref(cb: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    cb(params);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : (pathname ?? "/home");
  }

  function mutate(cb: (params: URLSearchParams) => void) {
    startTransition(() => {
      router.replace(buildHref(cb));
    });
  }

  return (
    <div
      data-testid="home-filter-bar"
      className={cn(
        "sticky top-0 z-20 space-y-3 border-b border-border-soft bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] px-4 py-3 [backdrop-filter:saturate(1.4)_blur(12px)]",
        isPending && "opacity-80",
      )}
    >
      {/* View toggle — premium pill segmented (리스트 | 지도) */}
      <div className="flex gap-0.5 rounded-full border border-border bg-surface p-1">
        {(
          [
            { v: "list" as const, label: "리스트", Icon: List },
            { v: "map" as const, label: "지도", Icon: MapIcon },
          ]
        ).map(({ v, label, Icon }) => {
          const checked = currentView === v;
          return (
            <Link
              key={v}
              href={buildHref((params) => {
                if (v === "list") {
                  params.delete("view");
                  return;
                }
                params.set("view", v);
              })}
              role="radio"
              aria-checked={checked}
              aria-label={`${label} 보기`}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-bold tracking-tight transition-colors",
                checked
                  ? "bg-ink text-white"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              <Icon className="h-[14px] w-[14px]" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Distance stepper 1/3/5/10 km */}
      <div>
        <p className="mb-2 px-0.5 text-[11px] font-bold tracking-tight text-muted-foreground">
          거리
        </p>
        <div className="chip-scroll">
          {RADIUS_STEPS.map((km) => {
            const checked = currentRadius === km;
            return (
              <button
                key={km}
                type="button"
                onClick={() => mutate((p) => p.set("radius", String(km)))}
                aria-pressed={checked}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
                  checked
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {km}km
              </button>
            );
          })}
        </div>
      </div>

      {/* Time preset (single) */}
      <div>
        <p className="mb-2 px-0.5 text-[11px] font-bold tracking-tight text-muted-foreground">
          시기
        </p>
        <div className="chip-scroll">
          {PRESETS.map((preset) => {
            const checked = currentPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  mutate((p) => {
                    if (checked) p.delete("preset");
                    else p.set("preset", preset);
                  })
                }
                aria-pressed={checked}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
                  checked
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time buckets (multiple) */}
      <div>
        <p className="mb-2 px-0.5 text-[11px] font-bold tracking-tight text-muted-foreground">
          시간대
        </p>
        <div className="chip-scroll">
          {BUCKETS.map((bucket) => {
            const checked = currentBuckets.includes(bucket);
            return (
              <button
                key={bucket}
                type="button"
                onClick={() =>
                  mutate((p) => {
                    const next = checked
                      ? currentBuckets.filter((b) => b !== bucket)
                      : [...currentBuckets, bucket];
                    p.delete("buckets");
                    for (const b of next) p.append("buckets", b);
                  })
                }
                aria-pressed={checked}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold leading-none tracking-tight transition-colors",
                  checked
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-surface text-ink hover:border-ink",
                )}
              >
                {bucket}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
