---
phase: 04-db
plan: 07-search-map
subsystem: worker-home-search
tags: [phase4, wave4, search, kakao-maps, time-filter, url-state, next16-async]
requirements:
  - SEARCH-02
  - SEARCH-03
dependency_graph:
  requires:
    - "04-04 (queries.ts prior additions; this plan appends without touching)"
    - "04-03 (jobs.location geography column + GIST index for ST_DWithin)"
  provides:
    - "src/lib/time-filters.ts (buildTimeFilterSQL + doesTimeBucketMatch + TimePreset/TimeBucket + type guards)"
    - "getJobsPaginated + getJobsByDistance extended with optional timePreset + timeBuckets parameters"
    - "src/types/kakao.d.ts (ambient window.kakao + kakao.maps namespace)"
    - "src/lib/hooks/use-kakao-maps-sdk.ts (lazy SDK loader with graceful empty-key handling)"
    - "src/components/worker/map-view.tsx (Kakao Maps container + markers + React preview card)"
    - "src/components/worker/home-filter-bar.tsx (view/radius/preset/buckets URL-driven filters)"
    - "src/components/ui/toggle-group.tsx + alert.tsx (shadcn-style shims over radix-ui monolith)"
    - "/home page.tsx refactor to Next.js 16 async searchParams contract"
    - "/home home-client.tsx (stateless list/map switch delegating to server re-renders)"
  affects:
    - "Plan 04-08 Worker UI (can now link to /home?view=map deep-links)"
    - "Plan 04-10 E2E HUMAN-UAT scenario 3 (Kakao Maps exploration) unblocked pending key provisioning"
tech_stack:
  added:
    - "none — uses radix-ui monolith already installed, Kakao SDK injected lazily at runtime"
  patterns:
    - "Next.js 16 async searchParams: searchParams: Promise<Record<string, string | string[] | undefined>>"
    - "URL-as-source-of-truth filter state: router.replace + useTransition in client filter bar"
    - "Kakao Maps autoload=false + kakao.maps.load(callback) lazy bootstrap per apis.map.kakao.com/web/guide"
    - "Graceful external-dep degradation: missing NEXT_PUBLIC_KAKAO_MAP_KEY → placeholder Alert, no script injection"
    - "Prisma.sql + Prisma.empty + Prisma.join composition for additive WHERE fragments (SQL injection T-04-39 mitigated)"
    - "Type guards (isTimePreset / isTimeBucket) bridging untrusted URL query strings to discriminated unions"
key_files:
  created:
    - "src/lib/time-filters.ts (175 lines)"
    - "src/types/kakao.d.ts (120 lines)"
    - "src/lib/hooks/use-kakao-maps-sdk.ts (138 lines)"
    - "src/components/ui/toggle-group.tsx (79 lines)"
    - "src/components/ui/alert.tsx (65 lines)"
    - "src/components/worker/map-view.tsx (200 lines)"
    - "src/components/worker/home-filter-bar.tsx (169 lines)"
    - "src/app/(worker)/home/home-client.tsx (124 lines)"
    - ".planning/phases/04-db/04-07-search-map-SUMMARY.md (this file)"
  modified:
    - "src/lib/db/queries.ts (+106 lines: TimePreset/TimeBucket imports, buildTimeFilterPrismaSql helper, time params on getJobsPaginated + getJobsByDistance)"
    - "src/app/(worker)/home/page.tsx (rewrote to Next.js 16 async searchParams; delegates to HomeClient for list/map switch)"
    - "tests/search/time-filter.test.ts (removed unused @ts-expect-error after implementation)"
    - "tests/search/time-bucket.test.ts (removed unused @ts-expect-error after implementation)"
    - ".planning/phases/04-db/deferred-items.md (logged preexisting tests/data failures unrelated to this plan)"
decisions:
  - "Type literals are Korean strings ('오늘'/'내일'/'이번주' + '오전'/'오후'/'저녁'/'야간') per the RED test contract in tests/search/time-*.test.ts. This also matches the URL query param format so no client-side translation layer is needed."
  - "buildTimeFilterSQL returns { whereClause, params } shape (not Prisma.Sql) so the unit test can regex-match the string form. A parallel helper buildTimeFilterPrismaSql inside queries.ts produces the runtime Prisma.Sql fragment — keeping time-filters.ts free of Prisma imports lets vitest load that module without initializing the Prisma client."
  - "Hook placed at src/lib/hooks/use-kakao-maps-sdk.ts (matching existing use-geolocation.ts convention) rather than plan-suggested src/hooks/. Project standardized on src/lib/hooks earlier in Phase 3."
  - "shadcn primitives (toggle-group, alert) implemented as hand-rolled shims over radix-ui monolith rather than via `shadcn add` CLI, matching button.tsx / badge.tsx pattern. Markup mirrors shadcn defaults so future CLI migration is mechanical."
  - "SSR center defaults to Seoul City Hall (37.5665, 126.978). Client-side geolocation upgrade deferred to Phase 5 — the Plan 04-07 scope focuses on filter UX + map rendering. A follow-up can add `?lat&lng` query params."
  - "MapView markers positioned at job.business.lat/lng (not job.lat/lng) because the Job type exposes business coords and the geography column on jobs is derived from the business address in Phase 3 seed data."
  - "Marker click triggers React-rendered preview card overlay instead of Kakao InfoWindow — avoids T-04-44 XSS surface because React escapes by default while InfoWindow accepts raw HTML strings."
  - "Filter bar uses router.replace (not router.push) so radius changes don't stack history entries; the browser Back button jumps out of /home cleanly."
  - "queries.ts additions are strictly additive: all new params are optional, buildTimeFilterPrismaSql returns Prisma.empty when no filters supplied, and existing call sites (Phase 3 landing page) continue to work unchanged."
  - "Kakao key graceful-empty handling verified: with NEXT_PUBLIC_KAKAO_MAP_KEY='' the hook returns hasKey=false, MapView renders Alert placeholder, and the HomeFilterBar's 지도 toggle is disabled with a tooltip. No network request, no script injection, no crash."
metrics:
  duration_minutes: ~40
  tasks_completed: 7
  files_created: 9
  files_modified: 5
  commits: 6
  lines_added_total: ~1440
  tests_green: 11
  completed_at: "2026-04-10"
---

# Phase 04 Plan 07: Search + Map Summary

**One-liner:** SEARCH-02 + SEARCH-03 exploration upgrade for `/home` — Korean-labelled time preset + bucket filters pushed all the way down to PostGIS query, URL-as-state filter bar, lazy Kakao Maps SDK with graceful empty-key handling, and a Next.js 16 async-searchParams rewrite of the worker home page.

## Component Tree

```
/home (page.tsx, Server Component, async searchParams)
 ├─ Earnings / Categories / Urgent (Phase 3, unchanged)
 └─ HomeClient (home-client.tsx, Client Component, stateless)
     ├─ HomeFilterBar (home-filter-bar.tsx)
     │   ├─ ToggleGroup: view [리스트 | 지도]  (지도 disabled if no kakao key)
     │   ├─ ToggleGroup: radius [1 | 3 | 5 | 10] km
     │   ├─ ToggleGroup: preset [오늘 | 내일 | 이번주]    (single, optional)
     │   └─ ToggleGroup: buckets [오전 | 오후 | 저녁 | 야간]  (multiple)
     │
     ├─ [view=list] → inline JobCard list (Phase 3 card design)
     │
     └─ [view=map] → MapView (map-view.tsx)
         ├─ useKakaoMapsSDK hook (autoload=false + kakao.maps.load)
         ├─ kakao.maps.Circle      (search radius ring)
         ├─ kakao.maps.Marker[]    (one per job; title=job.title for DOM tooltip)
         └─ React preview card     (selectedJob state; 상세보기 → router.push)
```

## URL Query Param Schema

All filter state is serialized to the URL so deep-links are shareable and SSR
is deterministic. HomeFilterBar mutates it via `router.replace` inside
`startTransition` for responsive UX.

| Param     | Values                                     | Default | Multi? |
|-----------|--------------------------------------------|---------|--------|
| `view`    | `list` / `map`                             | `list`  | no     |
| `radius`  | `1` / `3` / `5` / `10`                     | `3`     | no     |
| `preset`  | `오늘` / `내일` / `이번주`                  | (unset) | no     |
| `buckets` | `오전` / `오후` / `저녁` / `야간`           | (empty) | yes    |

Example deep-link:
```
/home?view=map&radius=5&preset=오늘&buckets=오전&buckets=오후
```

Unknown / malformed values are silently dropped by `isTimePreset` /
`isTimeBucket` type guards in `page.tsx::parseFilters`. This hardens the
query param boundary against tampering (T-04-39).

## Kakao SDK Loading Sequence

```
1. HomeFilterBar renders with kakaoAvailable prop (from server component)
   └─ if false → 지도 toggle is disabled with tooltip
2. User clicks 지도 → URL becomes /home?view=map
3. Server re-renders → HomeClient receives currentView='map'
4. HomeClient mounts MapView
5. MapView calls useKakaoMapsSDK()
   a. Hook reads process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
   b. If empty → return { hasKey: false, ready: false, error: null }
       → MapView renders Alert placeholder, script is never injected
   c. If set → inject <script id="kakao-maps-sdk" async src="...?autoload=false">
6. Script load fires → kakao.maps.load(callback)
7. Inside callback → setState({ ready: true })
8. MapView initialization effect runs:
   new kakao.maps.Map(container, { center, level: 5 })
9. Circle effect runs → shows radius ring
10. Markers effect runs → positions one kakao.maps.Marker per job
11. Marker click → setSelectedJob(job) → React preview card
12. "상세보기" button → onMarkerClick(jobId) → router.push('/posts/:id')
```

## Tests

| Suite | Result |
|-------|--------|
| `tests/search/time-filter.test.ts` | **4 GREEN** (was RED at baseline) |
| `tests/search/time-bucket.test.ts` | **7 GREEN** (was RED at baseline) |
| `tests/e2e/map-view.spec.ts` (Playwright) | **1 skipped** (test.skip on missing NEXT_PUBLIC_KAKAO_MAP_KEY — runner exits 0) |

TypeScript compilation for plan files: clean (`npx tsc --noEmit` produces
zero errors in `src/lib/time-filters.ts`, `src/lib/db/queries.ts`,
`src/types/kakao.d.ts`, `src/lib/hooks/use-kakao-maps-sdk.ts`,
`src/components/ui/{toggle-group,alert}.tsx`,
`src/components/worker/{map-view,home-filter-bar}.tsx`,
`src/app/(worker)/home/{page,home-client}.tsx`).

## Prisma.sql Composition Verified

A runtime verification script (removed after confirming) checked that:
- `Prisma.empty` renders to an empty string inside `Prisma.sql` templates
- `Prisma.join(fragments, ' AND ')` correctly composes fragment arrays
- OR-joining bucket fragments produces balanced parentheses
- A full composed query with preset + buckets produces syntactically-valid SQL:
  `SELECT * FROM jobs WHERE status='active' AND "workDate" = current_date AND (("startTime" >= '06:00' AND "startTime" < '12:00') OR ("startTime" >= '12:00' AND "startTime" < '18:00')) LIMIT 50`

When both `timePreset` and `timeBuckets` are `undefined`, `buildTimeFilterPrismaSql`
returns `Prisma.empty` so the existing call sites (Phase 3 anonymous landing
page) continue to execute with identical SQL as before.

## Commits

| Hash      | Subject |
|-----------|---------|
| `e76af37` | feat(04-07): add time-filters lib for SEARCH-03 preset + bucket |
| `1b67198` | feat(04-07): extend queries.ts with SEARCH-03 time filters |
| `37851e6` | feat(04-07): add ambient Kakao Maps SDK types |
| `5264ec4` | feat(04-07): add useKakaoMapsSDK hook (lazy SDK loader) |
| `50cc8b3` | feat(04-07): add MapView + HomeFilterBar + toggle-group/alert primitives |
| `714d857` | feat(04-07): refactor /home with list/map toggle + filter URL schema |

## Deviations from Plan

### Auto-fixed Issues

**1. [Note] Test contract literal forms are Korean, not Latin**

Plan example code used `'today' | 'tomorrow' | 'this-week'` and
`'morning' | 'afternoon' | ...`, but the RED tests in
`tests/search/time-*.test.ts` assert with Korean literals (`"오늘"`, `"오전"`,
etc) and a `{ whereClause, params }` shape. Tests are the source of truth —
implemented to the test contract. The URL query param format also uses Korean
so no translation layer is needed.

**2. [Rule 3 - Blocking] Prisma client regeneration required in worktree**

`npx tsc --noEmit` reported missing `@/generated/prisma/client` on first run
because the worktree's `src/generated/prisma/` was stale. Fixed by running
`npx prisma generate`. No code change — the generated output lives in
`.gitignore`-adjacent territory and is rebuilt on-demand.

**3. [Note] Hook placed at src/lib/hooks/, not src/hooks/**

Plan frontmatter lists `src/hooks/use-kakao-maps-sdk.ts`, but the project
already established `src/lib/hooks/` as the convention (see
`src/lib/hooks/use-geolocation.ts` from Phase 3). Kept consistent with the
existing convention.

**4. [Note] shadcn primitives hand-rolled over radix-ui monolith**

Plan suggested `npx shadcn add toggle-group alert`, but the project uses the
`radix-ui` monolith package (see `src/components/ui/button.tsx` importing
`{ Slot } from "radix-ui"`). Installing the shadcn scoped packages would
introduce a second Radix import style and split the bundle. Wrote two small
shims (`toggle-group.tsx` 79 lines, `alert.tsx` 65 lines) that mirror shadcn
default markup for future CLI migration.

**5. [Rule 3 - Blocking] Unused @ts-expect-error directives after GREEN**

`tests/search/time-filter.test.ts` and `time-bucket.test.ts` carried
`@ts-expect-error` comments from the Wave 0 RED baseline. Once Task 1 shipped
`@/lib/time-filters`, those directives became unused and triggered TS2578.
Removed the directives and updated the file header comments from
"RED BASELINE" to "GREEN (Plan 04-07)".

**6. [Scope boundary] Preexisting tests/data failures documented, not fixed**

`tests/data/seed.test.ts` (5 failures) and `tests/data/migrations.test.ts`
(1 RLS assertion failure) are all preexisting and unrelated to this plan.
Verified by stashing all my changes and re-running: identical failures.
Root cause: worktree DB has no Phase 3 seed data loaded and the RLS assertion
is a Phase 4/5 scope tracker. Logged under "From Plan 04-07 execution" in
`.planning/phases/04-db/deferred-items.md`.

### Adjustments / Notes

**7. [Note] HomeJobList (Phase 3 legacy) left in place, no longer imported**

`src/app/(worker)/home/home-job-list.tsx` was the Phase 3 infinite-scroll
list. The Plan 04-07 refactor uses HomeClient instead, and page.tsx no
longer imports HomeJobList. The file is orphaned but not deleted — it has
no dependents and deletion is a Phase 5 cleanup item. Removing it now would
bloat the diff with an unrelated concern.

**8. [Note] SSR uses Seoul City Hall as default map center**

Phase 3's `useGeolocation` hook is browser-only and provides worker location
after a click. For Plan 04-07 SSR we use the same Seoul City Hall fallback
(37.5665, 126.978) as the default center for the initial `getJobsByDistance`
call. A Phase 5 follow-up can read optional `?lat&lng` query params so the
client can deep-link its geolocated position into an SSR-ready URL.

## Authentication / External Setup Gates

**NEXT_PUBLIC_KAKAO_MAP_KEY (intentionally unset)** — per the parallel-executor
notes and Plan 04-01 Task 9 checkpoint, the Kakao JavaScript key requires real
Developer App registration and is provisioned by the user just before final
HUMAN-UAT. The implementation handles the empty key gracefully:
- Hook returns `hasKey=false` without injecting any script
- MapView renders Alert placeholder ("지도 키가 설정되지 않았습니다...")
- HomeFilterBar `지도` toggle is `disabled` with explanatory tooltip
- Playwright map-view.spec.ts self-skips via `test.skip(!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY)`

This is NOT a deviation — it is the designed fallback path documented in
Plan 04-01 SUMMARY "External setup required".

## Known Stubs

None. All rendered values flow from real data (`getJobsByDistance` via Prisma
→ HomeClient → JobCard / Marker). The "지도 키 미설정" Alert is a
user-facing explanatory state, not a stub rendering fake data.

## Known Follow-ups

1. **Worker-geolocated SSR center** — currently hardcoded to Seoul City Hall.
   Phase 5 should add optional `?lat&lng` query params so the client can
   deep-link a geolocated position and SSR reflects it.
2. **Cursor pagination in list mode** — Plan 04-07 drops the Phase 3 cursor
   pagination in favor of `limit: 50` non-cursor fetch, because combining
   infinite scroll with list/map toggle adds complexity. Phase 5 can restore
   a "더보기" button or server-side pagination token.
3. **HomeJobList cleanup** — orphaned Phase 3 component, ready for deletion
   in a Phase 5 cleanup sweep.
4. **Kakao key provisioning + HUMAN-UAT scenario 3** — unblocked once user
   registers the Kakao Developer app and sets `NEXT_PUBLIC_KAKAO_MAP_KEY`.
5. **InfoWindow vs preview card** — current preview card is a React overlay.
   A future polish could use a skin-customized InfoWindow for tighter
   visual integration with Kakao's map UI. Requires careful XSS audit
   (escape job.title through a known-safe path before passing to SDK).

## Threat Flags

No new threat surface beyond what the plan's `<threat_model>` already
enumerated (T-04-39 through T-04-44). Mitigations applied:

| ID | Mitigation |
|----|------------|
| T-04-39 SQL Injection on URL params | Type guards (isTimePreset/isTimeBucket) drop unknown literals at the boundary; all time filter SQL values are compile-time constants composed via `Prisma.sql` + `Prisma.join` (no user-bound interpolation); radius is coerced via `Number()` and gated by `VALID_RADII` Set. |
| T-04-40 Kakao key info disclosure | Empty-key graceful path implemented — no script loaded, no key exposed. When populated, key still ships in client bundle, mitigated by Kakao Developer Console domain allowlist (documented in Plan 04-01 HUMAN-UAT). |
| T-04-42 Supply chain | Script src pinned to `https://dapi.kakao.com/v2/maps/sdk.js` (Kakao official CDN, HTTPS), injected via `document.createElement('script')` without `eval` or `innerHTML`. |
| T-04-44 XSS via InfoWindow | Marker title uses Kakao's native `title` attribute (escaped browser tooltip); preview card rendered via React (escaped). InfoWindow is not used. |

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: src/lib/time-filters.ts
- FOUND: src/types/kakao.d.ts
- FOUND: src/lib/hooks/use-kakao-maps-sdk.ts
- FOUND: src/components/ui/toggle-group.tsx
- FOUND: src/components/ui/alert.tsx
- FOUND: src/components/worker/map-view.tsx
- FOUND: src/components/worker/home-filter-bar.tsx
- FOUND: src/app/(worker)/home/page.tsx
- FOUND: src/app/(worker)/home/home-client.tsx
- FOUND: src/lib/db/queries.ts (modified, +106 lines)

**Commits verified (git log --oneline):**
- FOUND: e76af37 (time-filters lib)
- FOUND: 1b67198 (queries.ts time filter extension)
- FOUND: 37851e6 (kakao.d.ts ambient types)
- FOUND: 5264ec4 (useKakaoMapsSDK hook)
- FOUND: 50cc8b3 (MapView + HomeFilterBar + shadcn shims)
- FOUND: 714d857 (/home page.tsx refactor + home-client.tsx + test cleanup)

**Test verification:**
- `npx vitest run tests/search` → 2 files pass, 11/11 tests GREEN
- `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/map-view.spec.ts --reporter=line` → exit 0, 1 skipped (test.skip on missing key — designed fallback)
- `npx tsc --noEmit` on plan files → 0 errors (preexisting errors in unrelated files logged in deferred-items.md)
