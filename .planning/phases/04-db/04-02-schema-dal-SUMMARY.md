---
phase: 04-db
plan: 02
subsystem: prisma-schema-dal
tags: [prisma, schema, dal, enum, push-subscription, ownership]
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03
dependency_graph:
  requires:
    - "03-01 (initial Prisma schema + Supabase connection)"
    - "02-02 (Supabase + Prisma Phase 2 baseline)"
  provides:
    - "ApplicationStatus.pending enum value on Supabase"
    - "PushSubscription table for Plan 04-06 (web push)"
    - "WorkerProfile.noShowCount column for Plan 04-03 (pg_cron no-show detection)"
    - "requireApplicationOwner / requireJobOwner helpers for Plans 04-04 / 04-05 / 04-09"
  affects:
    - "Wave 2 Plan 04-03 (RLS SQL references ApplicationStatus values)"
    - "Wave 3 Plans 04-04/04-05 (Server Actions call ownership helpers)"
tech_stack:
  added:
    - "none (uses existing Prisma 7.5.0 / @prisma/adapter-pg stack)"
  patterns:
    - "React cache()-wrapped DAL helpers with redirect-on-mismatch"
    - "Shell env var override for dotenv-loaded prisma.config.ts when .env diverges from .env.local"
key_files:
  created: []
  modified:
    - "prisma/schema.prisma"
    - "src/lib/dal.ts"
    - "src/lib/types/job.ts"
  regenerated:
    - "src/generated/prisma (gitignored)"
decisions:
  - "ApplicationStatus.pending added as FIRST Prisma enum value for code readability, but Postgres appends new values at end (enum positions are purely cosmetic at the DB level — the default still resolves correctly)"
  - "Application UI type retains 'checked_in' as a legacy variant to avoid breaking src/lib/db/queries.ts adaptApplication() cast; Phase 5 will fully remove"
  - "Ownership helpers use redirect (not return false) on all failure paths so callers cannot accidentally treat a falsy return as success — T-04-05 mitigation"
  - "requireApplicationOwner gates on requireWorker (worker-side actions); requireJobOwner gates on requireBusiness (business-side actions)"
metrics:
  duration_seconds: 536
  tasks_completed: 5
  files_modified: 3
  commits: 5
  completed_at: "2026-04-10"
---

# Phase 04 Plan 02: Schema + DAL Summary

**One-liner:** ApplicationStatus.pending + WorkerProfile.noShowCount + PushSubscription model pushed to Supabase; dal.ts gains requireApplicationOwner/requireJobOwner helpers for Wave 3 ownership gating.

## What was built

Three Prisma schema changes required by downstream Phase 4 plans, plus two DAL ownership helpers that centralize the "does session own this row" check.

### Prisma schema diff (`prisma/schema.prisma`)

```diff
 enum ApplicationStatus {
+  pending       // NEW Phase 4 — default state after one-tap apply
   confirmed
   in_progress
-  checked_in
+  checked_in    // deprecated - use in_progress (Phase 5 removal candidate)
   completed
   cancelled
 }

 model WorkerProfile {
   completionRate      Int           @default(0)
+  noShowCount         Int           @default(0)  // D-22 — pg_cron no-show
   createdAt           DateTime      @default(now())
 }

 model User {
   reviewsReceived   Review[]           @relation("RevieweeReviews")
+  pushSubscriptions PushSubscription[]
 }

 model Application {
-  status          ApplicationStatus  @default(confirmed)
+  status          ApplicationStatus  @default(pending)
 }

+model PushSubscription {
+  id         String    @id @default(uuid()) @db.Uuid
+  userId     String    @db.Uuid
+  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
+  endpoint   String    @unique
+  p256dh     String
+  auth       String
+  createdAt  DateTime  @default(now())
+  lastUsedAt DateTime?
+
+  @@index([userId])
+  @@map("push_subscriptions")
+}
```

### DAL helpers (`src/lib/dal.ts`)

```ts
export const requireApplicationOwner = cache(
  async (applicationId: string): Promise<{ session: SessionUser; application: Application }> => { ... }
)

export const requireJobOwner = cache(
  async (jobId: string): Promise<{ session: SessionUser; job: Job }> => { ... }
)
```

Both redirect on any failure branch (`/login?error={application,job}_not_{found,owned}`), so callers may safely destructure the return value without additional checks. Wrapped with React `cache()` per Phase 2 Phase 2 pattern — request-scoped memoization.

### UI type (`src/lib/types/job.ts`)

- Extracted `ApplicationStatus` as an exported union including `pending`.
- Added `STATUS_TO_BUCKET` map for worker tab routing (`upcoming | active | done`):
  - `pending` → `upcoming` (auto-accept timer running)
  - `confirmed` → `upcoming`
  - `in_progress` → `active`
  - `completed` → `done`
  - `cancelled` → `done`
- `Application.status` accepts `ApplicationStatus | "checked_in"` for legacy row compatibility.

## Prisma db push log

```
$ npx prisma db push
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
Datasource "db": PostgreSQL database "postgres", schema "public"
  at "db.lkntomgdhfvxzvnzmlct.supabase.co:5432"

Your database is now in sync with your Prisma schema. Done in 1.16s
```

### Post-push Supabase verification (direct pg query)

| Object | Status |
|--------|--------|
| `worker_profiles.noShowCount` column | exists |
| `push_subscriptions` table | exists (7 columns: id, userId, endpoint, p256dh, auth, createdAt, lastUsedAt) |
| `"ApplicationStatus"` enum | `{confirmed, in_progress, checked_in, completed, cancelled, pending}` |
| `applications.status` column default | `'pending'::"ApplicationStatus"` |

Drift check via `npx prisma db pull --print`: round-trips cleanly (all 4 changes visible in the pulled schema).

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `de8fc71` | Task 1 | feat(04-02): add ApplicationStatus.pending as default state |
| 2 | `bb615f5` | Task 2 | feat(04-02): add WorkerProfile.noShowCount and PushSubscription model |
| 3 | `ca36b34` | Task 3 | feat(04-02): add pending to UI ApplicationStatus union + STATUS_TO_BUCKET |
| 4 | `3019bbd` | Task 4 | feat(04-02): add requireApplicationOwner and requireJobOwner DAL helpers |
| 5 | `882253d` | Task 5 | chore(04-02): apply schema via prisma db push to Supabase |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Env file precedence corrupted DATABASE_URL**

- **Found during:** Task 5 (`npx prisma db push`)
- **Issue:** `prisma.config.ts` uses `import "dotenv/config"` which loads `.env` (not `.env.local`). The repo's `.env` contained a 714-char `DATABASE_URL="prisma+postgres://localhost:51213/..."` (Prisma local-dev proxy URL, quoted so the closing `"` became an invalid symbol at offset 606). `.env.local` held the real Supabase URL but was never loaded. Initial push failed with `P1013: Invalid symbol 34, offset 606`.
- **Fix:** Exported `DATABASE_URL` and `DIRECT_URL` inline from `.env.local` as shell env vars for the single `prisma db push` invocation (shell env overrides dotenv). Did not modify `.env` or `prisma.config.ts` — out of this plan's scope (tracking below).
- **Files modified:** none
- **Commit:** `882253d` (chore)

**2. [Rule 2 - Missing functionality] Worktree had no .env files**

- **Found during:** Task 5 setup
- **Issue:** Git worktrees don't inherit untracked files (`.env`, `.env.local`) from the main checkout, so `prisma db push` had no credentials at all.
- **Fix:** Copied `.env` and `.env.local` from `../../../` (main repo) into the worktree before running Prisma. Verified both files are in `.gitignore` (no leak risk).
- **Files modified:** none (env files gitignored)

**3. [Rule 1 - Adjustment] UI `Application.status` type kept `checked_in` for legacy compatibility**

- **Found during:** Task 3
- **Issue:** Plan suggested dropping `checked_in` from the UI union, but `src/lib/db/queries.ts:113` does `status: a.status as Application["status"]` — a hard cast from the Prisma row. If any existing database row still has `checked_in`, the cast would silently produce an invalid UI value. Removing it from the UI type would require either a runtime filter or a migration.
- **Fix:** UI `Application.status` is `ApplicationStatus | "checked_in"` — the clean `ApplicationStatus` union (without `checked_in`) is exported for new code, while the interface preserves legacy compatibility. Phase 5 will fully remove once historical rows are migrated.

## Known Follow-ups (out of this plan's scope)

- **`.env` file cleanup:** The `.env` file at the repo root contains a quoted `prisma+postgres://localhost:51213/...` URL that (a) breaks Prisma parsing, (b) shadows the real Supabase URL in `.env.local`. Phase 4 Plan 04-01 or a cleanup ticket should normalize env loading (either update `prisma.config.ts` to prefer `.env.local`, or delete the stale `.env` line). Not touched here because plan 04-01 owns the `.env.example` file.
- **Exhaustive switch warnings:** No current file does a non-exhaustive `switch(status)` that the new `pending` variant would break — confirmed via `npx tsc --noEmit` (no errors in `src/` beyond pre-existing `prisma.config.ts` TS2353, `vitest.config.ts` plugin type conflict, and test file errors — all out of scope).
- **Prisma enum ordering:** Postgres appended `pending` at the end of the enum (position 6) even though schema.prisma lists it first. This is a Prisma/Postgres behavior — ordering is cosmetic in the schema file. Default value resolves correctly regardless.

## Threat Flags

None — all schema changes are additive and gated by Plan 04-03 RLS (Wave 2). No new trust boundaries introduced outside the plan's `<threat_model>`.

## Self-Check: PASSED

- `prisma/schema.prisma` contains `pending`, `noShowCount`, `PushSubscription`, `@default(pending)` — FOUND
- `src/lib/dal.ts` contains `requireApplicationOwner`, `requireJobOwner`, `application_not_owned`, `job_not_owned` — FOUND
- `src/lib/types/job.ts` contains `pending`, `STATUS_TO_BUCKET` — FOUND
- Commits `de8fc71 bb615f5 ca36b34 3019bbd 882253d` — FOUND in `git log`
- Supabase DB: `push_subscriptions` table, `worker_profiles.noShowCount`, `applications.status` default `'pending'`, `"ApplicationStatus"` enum includes `pending` — VERIFIED via direct pg query
- `npx tsc --noEmit` on plan files: 0 errors — VERIFIED
- `npx prisma db pull --print` round-trip: no drift — VERIFIED
