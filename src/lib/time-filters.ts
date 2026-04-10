/**
 * Phase 4 Plan 04-07 — SEARCH-03 time preset + bucket filter logic.
 *
 * Two consumers:
 *   1. `buildTimeFilterSQL` — returns a string WHERE fragment + params array
 *      for composition into `getJobsPaginated` / `getJobsByDistance` raw SQL.
 *   2. `doesTimeBucketMatch` — pure predicate used by client-side filters and
 *      fixture assertions.
 *
 * Korean-labelled type literals ("오늘"/"오전"/etc) are intentional — they
 * match the URL query param format and the RED test contract:
 *   tests/search/time-filter.test.ts
 *   tests/search/time-bucket.test.ts
 *
 * Bucket boundaries (exclusive on upper bound, inclusive on lower):
 *   오전 [06:00, 12:00)
 *   오후 [12:00, 18:00)
 *   저녁 [18:00, 22:00)
 *   야간 [22:00, 06:00)  ← wraps midnight
 *
 * All raw SQL fragments use `"workDate"` / `"startTime"` column identifiers
 * that match Prisma's camelCase → quoted identifier convention. Never build
 * SQL by concatenating user input — all dynamic values flow through the
 * `params` array which callers pass to Prisma.$queryRaw / sql template.
 */

export type TimePreset = "오늘" | "내일" | "이번주";
export type TimeBucket = "오전" | "오후" | "저녁" | "야간";

const ALL_PRESETS: readonly TimePreset[] = ["오늘", "내일", "이번주"] as const;
const ALL_BUCKETS: readonly TimeBucket[] = [
  "오전",
  "오후",
  "저녁",
  "야간",
] as const;

export function isTimePreset(v: unknown): v is TimePreset {
  return typeof v === "string" && (ALL_PRESETS as readonly string[]).includes(v);
}

export function isTimeBucket(v: unknown): v is TimeBucket {
  return typeof v === "string" && (ALL_BUCKETS as readonly string[]).includes(v);
}

/**
 * Parse an "HH:MM" string into minutes since midnight.
 * Returns NaN on malformed input (caller decides whether to treat as no-match).
 */
function hmToMinutes(hm: string): number {
  if (typeof hm !== "string") return NaN;
  const [hStr, mStr] = hm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/**
 * SEARCH-03: predicate for whether a startTime "HH:MM" falls in a named bucket.
 *
 * Boundary semantics (locked by tests/search/time-bucket.test.ts):
 *   - 06:00 → 오전 (야간에는 포함 안 됨)
 *   - 22:00 → 야간 (저녁에는 포함 안 됨)
 *   - 05:00 → 야간 (midnight wrap)
 *   - 23:00 → 야간
 */
export function doesTimeBucketMatch(
  startTime: string,
  bucket: TimeBucket,
): boolean {
  const mins = hmToMinutes(startTime);
  if (!Number.isFinite(mins)) return false;

  switch (bucket) {
    case "오전":
      return mins >= 6 * 60 && mins < 12 * 60;
    case "오후":
      return mins >= 12 * 60 && mins < 18 * 60;
    case "저녁":
      return mins >= 18 * 60 && mins < 22 * 60;
    case "야간":
      // [22:00, 24:00) ∪ [00:00, 06:00)
      return mins >= 22 * 60 || mins < 6 * 60;
  }
}

export interface TimeFilterOpts {
  preset?: TimePreset;
  buckets?: TimeBucket[];
}

export interface TimeFilterSQL {
  /**
   * WHERE fragment (without leading " AND "). Empty string if no preset and
   * no buckets were supplied. Uses `$1, $2, ...` positional placeholders.
   *
   * NOTE: Prisma.$queryRaw does not support `$N` positional params directly —
   * callers should either:
   *   (a) use the `clauses` / `params` pair to build a Prisma.Sql via
   *       Prisma.sql`...` and inline each param, OR
   *   (b) use `whereClause` for unit-test assertions (the test file treats
   *       whereClause as a regex target) and re-derive SQL via the
   *       composition helper in queries.ts (buildTimeFilterPrismaSql).
   *
   * The shape `{ whereClause, params }` is dictated by the RED test contract
   * in tests/search/time-filter.test.ts.
   */
  whereClause: string;
  params: unknown[];
}

/**
 * SEARCH-03: build a WHERE fragment for preset + bucket filters.
 *
 * Preset → workDate range:
 *   오늘    → "workDate" = current_date
 *   내일    → "workDate" = current_date + interval '1 day'
 *   이번주  → "workDate" BETWEEN date_trunc('week', now())::date
 *                              AND date_trunc('week', now())::date + 6
 *
 * Buckets → startTime half-open ranges joined by OR. Multi-select is additive
 * (worker selects 오전 + 오후 → see anything in either range).
 *
 * Return shape is `{ whereClause: string, params: unknown[] }` per the RED
 * test contract. The current implementation uses SQL constants only (no
 * user-supplied values) so `params` is always `[]` — but callers should still
 * bind through their chosen SQL builder rather than concatenating.
 */
export function buildTimeFilterSQL(opts: TimeFilterOpts): TimeFilterSQL {
  const clauses: string[] = [];
  const params: unknown[] = [];

  switch (opts.preset) {
    case "오늘":
      clauses.push(`"workDate" = current_date`);
      break;
    case "내일":
      clauses.push(`"workDate" = current_date + interval '1 day'`);
      break;
    case "이번주":
      clauses.push(
        `"workDate" BETWEEN date_trunc('week', now())::date AND (date_trunc('week', now())::date + 6)`,
      );
      break;
  }

  if (opts.buckets && opts.buckets.length > 0) {
    const bucketSqls: string[] = [];
    for (const b of opts.buckets) {
      switch (b) {
        case "오전":
          bucketSqls.push(`("startTime" >= '06:00' AND "startTime" < '12:00')`);
          break;
        case "오후":
          bucketSqls.push(`("startTime" >= '12:00' AND "startTime" < '18:00')`);
          break;
        case "저녁":
          bucketSqls.push(`("startTime" >= '18:00' AND "startTime" < '22:00')`);
          break;
        case "야간":
          bucketSqls.push(`("startTime" >= '22:00' OR "startTime" < '06:00')`);
          break;
      }
    }
    if (bucketSqls.length > 0) {
      clauses.push(`(${bucketSqls.join(" OR ")})`);
    }
  }

  return {
    whereClause: clauses.join(" AND "),
    params,
  };
}
