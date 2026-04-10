---
phase: 02-supabase-prisma-auth
plan: "05"
subsystem: seed
tags: [seed, prisma, mock-data, dev-accounts, postgis, supabase-admin]
dependency_graph:
  requires:
    - prisma-schema-phase2
    - supabase-tables-live
    - postgis-enabled
    - auth-trigger-handle-new-user
  provides:
    - seed-dev-accounts
    - seed-business-profiles
    - seed-jobs-postgis
    - seed-applications
    - data04-green
  affects:
    - 02-06-PLAN.md (E2E tests depend on seeded dev accounts)
    - 02-07-PLAN.md (mock-data swap depends on seeded DB)
tech_stack:
  added: []
  patterns:
    - "supabase.auth.admin.createUser with email_confirm:true for dev account seeding"
    - "reverse-order deleteMany for FK-safe idempotent re-seeding"
    - "prisma.$executeRaw with ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography for PostGIS columns"
    - "dotenv config loading in tests/setup.ts for vitest .env.local support"
key_files:
  created:
    - prisma/seed.ts
  modified:
    - prisma.config.ts (migrations.seed key added)
    - prisma/schema.prisma (BusinessProfile.userId unique→index, User relation 1:many)
    - src/lib/db/index.ts (default export added for test compatibility)
    - tests/setup.ts (dotenv .env.local loading for vitest)
decisions:
  - "BusinessProfile.userId changed from @unique to plain @db.Uuid with @@index: schema had 1:1 relation but plan requires 1:many (admin account owns biz-3..8 for seed simplicity). Correct domain model — a business operator can manage multiple locations."
  - "Added default export to src/lib/db/index.ts: seed.test.ts stubs use dynamic import default pattern; named-only export was causing undefined prisma at test time."
  - "Added dotenv .env.local loading to tests/setup.ts: vitest does not auto-load .env.local the way Next.js does, so DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL were not visible to the db module during test runs."
  - "Emails use @dev.gignow.com domain (not @gignow.dev as in RESEARCH.md sketch): matches critical_constraints item 3 in the plan prompt which specifies worker@dev.gignow.com etc."
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 4
---

# Phase 2 Plan 05: Dev Seed (mock-data.ts → DB) Summary

**One-liner:** prisma/seed.ts transplants all MOCK_BUSINESSES/JOBS/APPLICATIONS into live Supabase via Prisma + raw PostGIS SQL, with 6 supabase.auth.admin.createUser dev accounts; DATA-04 6/6 green.

## What Was Built

### Task 1: prisma.config.ts seed key

Added `seed: "tsx prisma/seed.ts"` to the `migrations` block in `prisma.config.ts`. This is the Prisma 7 mechanism for registering a seed runner — Prisma ≤6 used `package.json prisma.seed`, which no longer works.

### Task 2: prisma/seed.ts — 8-step seed logic

**Full seed flow:**

1. **Reverse-order deleteMany** (FK-safe): Review → Application → Job → BusinessProfile → WorkerProfile → User
2. **auth.users cleanup**: `supabase.auth.admin.listUsers()` then delete any `@dev.gignow.com` accounts
3. **6 dev auth.users** via `supabase.auth.admin.createUser({ email_confirm: true })`:
   - `worker@dev.gignow.com` (WORKER) — kim-jihoon
   - `worker2@dev.gignow.com` (WORKER) — empty profile
   - `business@dev.gignow.com` (BUSINESS) — owns biz-1 스타벅스 역삼점
   - `business2@dev.gignow.com` (BUSINESS) — owns biz-2 쿠팡 송파 물류센터
   - `both@dev.gignow.com` (BOTH) — dual-role verification
   - `admin@dev.gignow.com` (ADMIN) — owns biz-3..8
   - Trigger `handle_new_user` auto-creates public.users rows; seed overrides role via `prisma.user.update`
4. **1 WorkerProfile** for kim-jihoon (from MOCK_CURRENT_WORKER)
5. **8 BusinessProfiles** (all MOCK_BUSINESSES) via Prisma create
6. **PostGIS location** for each BusinessProfile via `prisma.$executeRaw` ST_SetSRID/ST_MakePoint
7. **8 Jobs** (all MOCK_JOBS) via Prisma create (lat/lng denormalized from business)
8. **PostGIS location** for each Job via `prisma.$executeRaw`
9. **5 Applications** (all MOCK_APPLICATIONS) — all owned by kim-jihoon
10. **0 Reviews** — Phase 5 territory
11. **Count verification** at end — throws if counts don't match expected

**Run command:** `npx tsx --env-file=.env.local prisma/seed.ts` (or `npx prisma db seed` once Prisma 7 seed runner picks up config)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BusinessProfile.userId @unique prevents 8 profiles with 6 users**
- **Found during:** Task 2 — seed would fail at 3rd BusinessProfile insert for admin
- **Issue:** schema.prisma had `userId @unique` on BusinessProfile (1:1 relation). The RESEARCH.md seed skeleton assigns biz-3..8 all to the admin account (6 businesses, 1 user), which violates this constraint.
- **Fix:** Changed `userId @unique @db.Uuid` → `userId @db.Uuid` with `@@index([userId])` on BusinessProfile. Updated `User` relation from `businessProfile BusinessProfile?` → `businessProfiles BusinessProfile[]`. Ran `npx prisma db push --accept-data-loss` and `npx prisma generate`.
- **Correctness:** This is the correct domain model — a business operator can manage multiple branch locations (e.g., Starbucks chain). 1:1 was too restrictive.
- **Files modified:** `prisma/schema.prisma`, `src/generated/prisma/` (regenerated)
- **Commit:** 3bce841

**2. [Rule 1 - Bug] src/lib/db/index.ts had no default export**
- **Found during:** Task 2 vitest run — `prisma.user` undefined (TypeError)
- **Issue:** `tests/data/seed.test.ts` stub uses `const { default: prisma } = await import('@/lib/db')`. The db module only had named export `prisma`, so `default` was `undefined`.
- **Fix:** Added `export default prisma;` at bottom of `src/lib/db/index.ts`.
- **Files modified:** `src/lib/db/index.ts`
- **Commit:** 3bce841

**3. [Rule 2 - Missing] tests/setup.ts not loading .env.local**
- **Found during:** Task 2 vitest run — `Can't reach database server at base` (DATABASE_URL truncated)
- **Issue:** Vitest does not auto-load `.env.local` the way Next.js does. The `DATABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` vars were not available to the Prisma client at test initialization time.
- **Fix:** Added `import { config } from 'dotenv'` + `config({ path: path.resolve(process.cwd(), '.env.local') })` to `tests/setup.ts`. This runs before any test file loads.
- **Files modified:** `tests/setup.ts`
- **Commit:** 3bce841

## Tests

| Test file | REQ-ID | Status |
|-----------|--------|--------|
| tests/data/seed.test.ts — has 6 seeded users | DATA-04 | PASS |
| tests/data/seed.test.ts — has 1 worker_profile | DATA-04 | PASS |
| tests/data/seed.test.ts — has 8 business_profiles | DATA-04 | PASS |
| tests/data/seed.test.ts — has 8 jobs | DATA-04 | PASS |
| tests/data/seed.test.ts — has 5 applications | DATA-04 | PASS |
| tests/data/seed.test.ts — has 0 reviews initially | DATA-04 | PASS |
| tests/data/postgis.test.ts (DATA-02) | DATA-02 | Still PASS |
| tests/data/migrations.test.ts (DATA-03) | DATA-03 | Still PASS |

## Live DB Verification (post-seed)

```
users             : 6  ✓
worker_profiles   : 1  ✓
business_profiles : 8  ✓
jobs              : 8  ✓
applications      : 5  ✓
reviews           : 0  ✓
```

All 8 BusinessProfiles have valid PostGIS `location` column (ST_SetSRID/ST_MakePoint).
All 8 Jobs have valid PostGIS `location` column.

## mock-data.ts Status

`src/lib/mock-data.ts` is unchanged and still exists. `prisma/seed.ts` imports from it (ESM import — allowed per plan, seed is not production code). No production code paths were added to mock-data.ts.

## Known Stubs

None — seed.ts fully wired to live DB. All 6 accounts log in immediately (email_confirm: true).

## Threat Flags

No new threat surface. The seed script:
- Guards against production execution (`NODE_ENV === 'production'` throw)
- Never logs the SUPABASE_SERVICE_ROLE_KEY
- Accounts use `@dev.gignow.com` domain (clearly dev-only, easy to identify and revoke)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 4bab775 | chore(02-05): Task 1 — add migrations.seed key to prisma.config.ts (Prisma 7 D-04) |
| Task 2 | 3bce841 | feat(02-05): Task 2 — prisma/seed.ts + schema fix + db default export + env loading |

## Self-Check: PASSED

Files verified on disk:
- prisma/seed.ts: FOUND (249 lines)
- prisma.config.ts: FOUND (contains `seed: "tsx prisma/seed.ts"`)
- prisma/schema.prisma: FOUND (BusinessProfile.userId no longer @unique)
- src/lib/db/index.ts: FOUND (default export present)
- tests/setup.ts: FOUND (dotenv loading present)

Commits verified:
- 4bab775: FOUND
- 3bce841: FOUND

DATA-04 tests: 6/6 PASS
DATA-02 + DATA-03 tests: still PASS (not regressed)
