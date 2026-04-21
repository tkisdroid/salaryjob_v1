---
phase: 11-worker-flow-codex-12-filled
plan: "04"
subsystem: worker-search-explore
tags: [search, explore, server-filtering, searchParams, BUG-W11]
dependency_graph:
  requires: []
  provides: [server-side-filtered-search, server-side-filtered-explore]
  affects: [src/app/(worker)/search, src/app/(worker)/explore]
tech_stack:
  added: []
  patterns: [Next.js async searchParams, URL-driven filter state, router.push navigation]
key_files:
  created: []
  modified:
    - src/app/(worker)/search/page.tsx
    - src/app/(worker)/search/search-client.tsx
    - src/app/(worker)/explore/page.tsx
    - src/app/(worker)/explore/explore-client.tsx
decisions:
  - "Server filters category via getJobsPaginated; urgent/minPay filtered in JS on pre-fetched rows since getJobsPaginated doesn't natively support them yet"
  - "Text search kept as instant client-side refinement on server-pre-filtered set (no URL nav on keystroke)"
  - "Enter key and clear button both trigger applyFilters to push text query to URL"
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 11 Plan 04: Server-Side Filtering for Search and Explore Summary

Converted search and explore pages from full client-side filtering (fetch 50 rows, filter in browser with useMemo) to server-side filtering with URL searchParams driving the DB query via `getJobsPaginated`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Convert search page to server-side filtering via searchParams | `83c4c42` |
| 2 | Convert explore page to server-side filtering via searchParams | `9528b05` |

## What Was Built

### search/page.tsx
- Accepts `searchParams: Promise<SearchParams>` (Next.js 16 async pattern)
- Reads `category`, `q`, `tag`, `urgent`, `minPay`, `cursor` from URL
- Validates category against `VALID_CATEGORIES` set before passing to `getJobsPaginated`
- Applies `urgent` and `minPay` filters in JS on pre-fetched rows (server-side, not client)
- Passes `initialCategory`, `initialQuery`, `initialUrgent`, `initialMinPay`, `nextCursor` props to `SearchClient`

### search-client.tsx
- Removed `useSearchParams` import entirely
- Removed `useMemo` client-side filtering block (category/pay/urgent were all in useMemo)
- Added `applyFilters(overrides)` that builds a `URLSearchParams` and calls `router.push`
- Text search remains instant client-side refinement on the server-pre-filtered `jobs` array
- All filter buttons (category chips, pay tiers, urgent toggle, clear, reset) call `applyFilters`
- Search input triggers `applyFilters` on Enter key

### explore/page.tsx
- Same server-side pattern: reads `category`, `q`, `minPay`, `cursor` from `searchParams`
- `minPay` filter applied in JS on pre-fetched rows
- Passes `initialCategory`, `initialQuery`, `initialMinPay`, `nextCursor` to `ExploreClient`

### explore-client.tsx
- `useMemo` filtering block narrowed to text-search only (category/minPay removed)
- Added `applyFilters(overrides)` with `router.push` navigation
- Category chips, pay tier chips, and tag view clicks all navigate via `applyFilters`
- `resetFilters` now calls `router.push("/explore")` instead of only resetting local state

## Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` (src/ only) | 0 errors |
| `searchParams` in search/page.tsx | 3 matches |
| `searchParams` in explore/page.tsx | 3 matches |
| `applyFilters\|router.push` in search-client.tsx | 8 matches |
| `applyFilters\|router.push` in explore-client.tsx | 10 matches |
| `useMemo` in search-client.tsx | 0 matches (removed) |
| `useSearchParams` in search-client.tsx | 0 matches (removed) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Both pages are fully wired to `getJobsPaginated` with real DB queries. Category filter goes to the DB; urgent/minPay apply server-side in JS on the pre-fetched page of results (consistent with plan instructions noting `getJobsPaginated` doesn't yet support them natively).

## Self-Check: PASSED

- `src/app/(worker)/search/page.tsx` exists, contains `await searchParams`, `getJobsPaginated`, `initialCategory`
- `src/app/(worker)/search/search-client.tsx` exists, contains `applyFilters`, no `useMemo` filter block, no `useSearchParams`
- `src/app/(worker)/explore/page.tsx` exists, contains `await searchParams`, `getJobsPaginated`, `initialCategory`
- `src/app/(worker)/explore/explore-client.tsx` exists, contains `applyFilters`, text-only `useMemo`
- Commits `83c4c42` and `9528b05` verified in git log
