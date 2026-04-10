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
