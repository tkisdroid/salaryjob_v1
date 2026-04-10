# Phase 3 — Deferred Items

Items discovered during execution that are OUT OF SCOPE for the current plan and deferred to a future plan/phase.

## From 03-01 (2026-04-10)

### 1. Phase 2 `_supabase_migrations` tracking table dropped by `prisma db push`

**Discovered during:** 03-01 Task 4 verification (idempotent db push re-run)

**Issue:** Phase 2's direct-prisma migration strategy creates a `public._supabase_migrations` tracking table via `scripts/apply-supabase-migrations.ts` to record which raw-SQL migrations were applied. However, this table is NOT declared in `prisma/schema.prisma`. As a result, every subsequent `npx prisma db push --accept-data-loss` sees it as drift and drops it ("You are about to drop the `_supabase_migrations` table, which is not empty (9 rows)").

**Impact:**
- Phase 2's tracking is lost after any Prisma push in Phase 3+.
- Running `scripts/apply-supabase-migrations.ts` again will re-attempt to apply all 9 migrations. The migrations are intended to be idempotent (CREATE EXTENSION IF NOT EXISTS, CREATE POLICY IF NOT EXISTS, CREATE OR REPLACE FUNCTION, etc.), so re-application should be safe. But the tracking is gone — next run will say "applied" to already-applied migrations.
- 03-01 did NOT run `scripts/apply-supabase-migrations.ts`, so no functional regression in Phase 3. The DB still has all Phase 2 extensions, RLS policies, auth triggers, and PostGIS setup — only the tracking row was dropped.

**Scope:** Out of scope for 03-01 (schema column additions + test scaffolds only).

**Recommended fix (future plan):**
- **Option A:** Add `_supabase_migrations` model to `prisma/schema.prisma` so Prisma preserves it.
- **Option B:** Move tracking table to a separate schema (e.g., `migrations._supabase_migrations`) that Prisma ignores.
- **Option C:** Use `prisma db push --skip-generate` with an explicit `IGNORE TABLE` policy (Prisma 7 may support this via `migrations.ignoreTables` in `prisma.config.ts` — needs research).

**Suggested owner:** Phase 3 Wave 1 (03-02) which already deals with raw SQL migrations and pg_cron, OR a dedicated Phase 2 gap-closure plan.

**Verification that drop did NOT break Phase 3:**
- `applications`, `business_profiles`, `jobs`, `reviews`, `users`, `worker_profiles` tables all still present in `public` schema.
- PostGIS extension still present (`geography_columns`, `geometry_columns`, `spatial_ref_sys` intact).
- `prisma.job.findFirst()` returns seeded row with new columns defaulting to `[]`/null.

## From 03-03 (2026-04-10)

### 2. Phase 2 `tests/data/migrations.test.ts` DATA-03 assertion stale after 03-02 RLS re-enablement

**Discovered during:** 03-03 Task 3 full-suite regression check (`npx vitest run`).

**Issue:** Phase 2's `tests/data/migrations.test.ts` contains the assertion:
```ts
it('RLS is disabled on jobs, applications, reviews (D-05)', async () => {
  // ... expects pg_tables.rowsecurity = false for jobs
})
```
This was correct under Phase 2 D-05 (which disabled RLS on jobs via `20260410000004_disable_rls_jobs_applications_reviews.sql`). However, Phase 3 plan 03-02 **intentionally re-enabled** RLS on `public.jobs` via `20260411000001_jobs_rls_phase3.sql` (adding `jobs_public_select` + 3 owner write policies). The test is now asserting a state that was intentionally reversed by 03-02.

**Verified not caused by 03-03:** The Worker profile CRUD tests (`tests/profile/worker-profile.test.ts`) and avatar upload tests (`tests/storage/avatar-upload.test.ts`) introduced by 03-03 all pass cleanly. The failing test was already stale at the end of 03-02 execution — the orchestrator's wave 1 sequential merge did not re-run the full suite, and 03-02 did not modify this test.

**Impact:** Pre-existing failure in the Phase 3 worktree test suite. Does NOT affect any Phase 3 production code. 11/11 new Task 3 tests still pass.

**Scope:** Out of scope for 03-03 (worker profile CRUD, not test maintenance of Phase 2 migration assertions).

**Recommended fix (future plan):**
- Update `tests/data/migrations.test.ts` line 33–45 to split the assertion:
  - `jobs` should now expect `rowsecurity = true` (per 03-02)
  - `applications` and `reviews` remain `rowsecurity = false` (unchanged)
- Add a new assertion checking the 4 `jobs_*` policies exist on `public.jobs`.

**Suggested owner:** Any subsequent Phase 3 plan that touches `tests/data/` OR a Phase 3 gap-closure plan.

**Commands to reproduce:**
```bash
npx vitest run tests/data/migrations.test.ts
# FAIL: RLS should be disabled on jobs: expected true to be false
```
