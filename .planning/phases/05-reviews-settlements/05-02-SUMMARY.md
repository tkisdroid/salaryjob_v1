---
phase: "05"
plan: "02"
subsystem: schema+types+support
tags: [wave-2, schema, prisma, settled-enum, review-support, validations, errors, constants]
dependency_graph:
  requires: [05-01-SUMMARY.md, 04-02-schema-dal-SUMMARY.md]
  provides:
    - ApplicationStatus.settled (Prisma enum + Postgres enum + UI union)
    - WorkerProfile.reviewCount column (Plan 03 biz→worker aggregation)
    - ReviewError + reviewErrorToKorean (Plan 03 action error handling)
    - createWorkerReviewSchema + createBusinessReviewSchema (Plan 03 input validation)
    - WORKER_TO_BIZ_TAGS + BIZ_TO_WORKER_TAGS (Plan 03/04 review-form UI)
  affects:
    - prisma/schema.prisma
    - src/generated/prisma (regenerated, gitignored)
    - src/lib/types/job.ts
    - tests/fixtures/phase5/settlements.ts
    - Plans 03-06 (all consume settled enum or review support modules)
tech_stack:
  added: []
  patterns:
    - additive-enum-via-ALTER-TYPE (direct pg SQL, not prisma db push — _supabase_migrations diff blocker)
    - application-errors.ts shape mirrored for ReviewError
    - zod-schema-per-direction (shared shape, direction inferred by SA location)
    - readonly-const-tuple for tag sets (single edit point, open string in DB)
key_files:
  created:
    - src/lib/errors/review-errors.ts
    - src/lib/validations/review.ts
    - src/lib/constants/review-tags.ts
  modified:
    - prisma/schema.prisma
    - src/lib/types/job.ts
    - tests/fixtures/phase5/settlements.ts
decisions:
  - "Direct SQL (ALTER TYPE ADD VALUE) used instead of prisma db push — Supabase internal _supabase_migrations table caused a data-loss warning in prisma db push; actual enum+column additions verified via pg client query"
  - "WorkerProfile.reviewCount added alongside existing BusinessProfile.reviewCount (Plan 03 biz→worker rating aggregation requires it)"
  - "ApplicationStatus UI union keeps 'completed' for legacy row compatibility (research Pitfall 4)"
  - "Fixture factory flipped status='completed' → 'settled' in Plan 02 Task 2 (not Plan 04 as originally noted in Wave 0 comment)"
metrics:
  duration_minutes: ~20
  completed_date: "2026-04-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 05 Plan 02: Schema Foundation + Review Support Modules Summary

**One-liner:** Prisma schema extended with `ApplicationStatus.settled` + `WorkerProfile.reviewCount`, Prisma Client regenerated, UI types widened, and three review support modules (errors / validations / tag constants) created for downstream Plans 03-06.

---

## What Was Built

### Task 1: Prisma Schema + DB Push (`80cb44f`)

Two schema changes applied in a single edit to `prisma/schema.prisma`:

**(a) ApplicationStatus enum** — added `settled` value after `completed`:
```prisma
completed  // legacy — kept for historical rows, new checkouts use 'settled'
settled    // NEW Phase 5 — SETL-01 replaces 'completed' for new checkouts
```

**(b) WorkerProfile.reviewCount column** — additive non-destructive column:
```prisma
totalJobs           Int           @default(0)
reviewCount         Int           @default(0) // NEW Phase 5 — required by Plan 03 biz→worker rating aggregation
completionRate      Int           @default(0)
```

**Prisma generate output:**
```
✔ Generated Prisma Client (7.5.0) to .\src\generated\prisma in 150ms
```

**DB push note:** `prisma db push` produced a `_supabase_migrations` table drop warning (pre-existing configuration drift between Prisma migrations path and Supabase internal tables). Changes were instead applied via direct SQL:
```sql
ALTER TYPE public."ApplicationStatus" ADD VALUE IF NOT EXISTS 'settled';
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
```

**Supabase verification:**
```
Enum values: ['confirmed','in_progress','checked_in','completed','cancelled','pending','settled']
reviewCount column: [{"column_name":"reviewCount","data_type":"integer","column_default":"0"}]
```

### Task 2: UI Type Union + Fixture Flip (`b577046`)

**`src/lib/types/job.ts`** — extended `ApplicationStatus` union and `STATUS_TO_BUCKET`:
- Added `"settled"` to the union (between `"in_progress"` and `"completed"`)
- Added `settled: "done"` to STATUS_TO_BUCKET
- Kept `"completed"` for legacy row compatibility

**`tests/fixtures/phase5/settlements.ts`** — flipped Wave 0 placeholder:
- `status: "completed"` → `status: "settled"` in `createSettledApplication`
- Updated file header comment to reference Plan 02 Task 2 as the source of the flip
- Updated JSDoc on factory function

### Task 3: Review Support Modules (`b0e4a21`)

**`src/lib/errors/review-errors.ts`** (49 lines):
- `ReviewErrorCode` union: `invalid_input | not_settled | already_reviewed | invalid_state | unknown`
- `ReviewError` class extending Error with `readonly code: ReviewErrorCode`
- `reviewErrorToKorean` exhaustive switch (5 cases) — user-safe Korean messages, no internal detail leak (T-05-22 mitigation)

**`src/lib/validations/review.ts`** (24 lines):
- `createWorkerReviewSchema` — `applicationId` (uuid), `rating` (int 1-5), `tags` (string[] max 8), `comment` (string max 500 optional)
- `createBusinessReviewSchema` = same schema (direction inferred by SA location, defense-in-depth)
- Inferred TypeScript types exported for both

**`src/lib/constants/review-tags.ts`** (33 lines):
- `WORKER_TO_BIZ_TAGS` — 8 Korean tags: "친절해요", "분위기 좋음", "시간 엄수", "지시 명확", "업무량 적당", "교통비 제대로", "재방문 의사", "초보도 환영"
- `BIZ_TO_WORKER_TAGS` — 8 Korean tags: "성실함", "밝은 인상", "시간 엄수", "업무 숙련", "의사소통 원활", "책임감 있음", "팀워크 좋음", "재고용 희망"
- `WorkerToBizTag` and `BizToWorkerTag` derived types

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] prisma db push blocked by _supabase_migrations diff warning**
- **Found during:** Task 1
- **Issue:** `prisma db push` showed "You are about to drop the `_supabase_migrations` table, which is not empty (13 rows)" — this is a pre-existing config drift between the `migrations.path` setting in `prisma.config.ts` and Supabase's internal migration tracking table. The plan states `--accept-data-loss` must NOT be used without investigation, and dropping `_supabase_migrations` is clearly not intended.
- **Fix:** Applied the enum value and column additions directly via `pg` client SQL (`ALTER TYPE ADD VALUE` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`). Verified via `SELECT unnest(enum_range)` and `information_schema.columns` query.
- **Files modified:** none (DB change only)
- **Commit:** `80cb44f`

**2. [Deviation] Fixture flip moved from Plan 04 Task 1 → Plan 02 Task 2**
- **Found during:** Task 2 review of 05-01 SUMMARY decisions
- **Issue:** The Wave 0 comment in settlements.ts said "Plan 04 migrates both the factory and the DONE_STATUSES constant." However, Plan 02 Task 2 explicitly lists flipping the fixture as its action. Plan 04 handles `DONE_STATUSES` but not the factory.
- **Fix:** Flipped the fixture in Plan 02 Task 2 as the plan specifies. Updated comments to accurately reflect Plan 02 Task 2 as source.
- **Files modified:** `tests/fixtures/phase5/settlements.ts`
- **Commit:** `b577046`

---

## Commits

| Hash | Message |
|------|---------|
| `80cb44f` | feat(05-02): add ApplicationStatus.settled + WorkerProfile.reviewCount + prisma db push |
| `b577046` | feat(05-02): extend ApplicationStatus UI union + flip phase5 fixture to settled |
| `b0e4a21` | feat(05-02): add review errors + validations + hardcoded Korean tag sets |

---

## Schema Diff

```diff
enum ApplicationStatus {
  pending
  confirmed
  in_progress
  checked_in
- completed
+ completed  // legacy — kept for historical rows, new checkouts use 'settled'
+ settled    // NEW Phase 5 — SETL-01 replaces 'completed' for new checkouts
  cancelled
}

model WorkerProfile {
  totalJobs           Int  @default(0)
+ reviewCount         Int  @default(0)  // NEW Phase 5
  completionRate      Int  @default(0)
}
```

---

## Supabase Verification Evidence

```
-- (a) enum has settled:
SELECT unnest(enum_range(NULL::"ApplicationStatus")) AS val;
→ ['confirmed','in_progress','checked_in','completed','cancelled','pending','settled'] (7 rows)

-- (b) worker_profiles has reviewCount:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='worker_profiles' AND column_name='reviewCount';
→ [{"column_name":"reviewCount","data_type":"integer","column_default":"0"}] (1 row)
```

---

## Known Stubs

None — this plan creates foundational types and support modules only. No production UI code, no stubs.

---

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. Zod mitigations for T-05-04/05/08 implemented as planned.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `grep -n "  settled" prisma/schema.prisma` | FOUND (line 44) |
| `grep -n "reviewCount\s*Int" prisma/schema.prisma` returns 2 matches | FOUND (lines 97, 120) |
| `grep "settled" src/generated/prisma/enums.ts` | FOUND (`settled: 'settled'`) |
| Supabase enum has 7 values including `settled` | VERIFIED |
| Supabase `worker_profiles.reviewCount` column exists | VERIFIED |
| `grep -c '"settled"' src/lib/types/job.ts` >= 2 | FOUND (2) |
| `grep 'settled: "done"' src/lib/types/job.ts` | FOUND |
| `grep 'status: "settled"' tests/fixtures/phase5/settlements.ts` | FOUND |
| `grep -c 'status: "completed"' tests/fixtures/phase5/settlements.ts` = 0 | CONFIRMED |
| `src/lib/errors/review-errors.ts` exists, min 40 lines | FOUND (49 lines) |
| `src/lib/validations/review.ts` exists, min 20 lines | FOUND (24 lines) |
| `src/lib/constants/review-tags.ts` exists, min 25 lines | FOUND (33 lines) |
| `grep -c "case " src/lib/errors/review-errors.ts` = 5 | FOUND |
| WORKER_TO_BIZ_TAGS.length = 8, BIZ_TO_WORKER_TAGS.length = 8 | VERIFIED |
| commit `80cb44f` exists | FOUND |
| commit `b577046` exists | FOUND |
| commit `b0e4a21` exists | FOUND |
