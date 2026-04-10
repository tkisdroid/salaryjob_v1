---
phase: 02-supabase-prisma-auth
plan: "02"
subsystem: database
tags: [database, prisma, supabase, postgis, migrations, rls, schema]
dependency_graph:
  requires:
    - vitest-config
    - supabase-deps
    - env-template
    - legacy-schema-preserved
  provides:
    - prisma-schema-phase2
    - supabase-tables-live
    - postgis-enabled
    - auth-trigger-handle-new-user
    - rls-user-profiles
    - migration-sql-artifact
  affects:
    - 02-03-PLAN.md (auth routes depend on public.users + trigger)
    - 02-04-PLAN.md (proxy/middleware depends on User.role enum)
    - 02-05-PLAN.md (seed depends on all 6 tables + enums)
tech_stack:
  added: []
  patterns:
    - "direct-prisma: prisma db push for schema, tsx script for Supabase-specific SQL"
    - "_supabase_migrations tracking table for idempotent re-runs"
    - "Unsupported('geography(Point, 4326)') for PostGIS columns in Prisma 7"
key_files:
  created:
    - prisma/migrations/20260410000000_init_phase2/migration.sql
    - supabase/migrations/20260410000000_enable_postgis.sql
    - supabase/migrations/20260410000001_auth_trigger_handle_new_user.sql
    - supabase/migrations/20260410000002_user_rls.sql
    - supabase/migrations/20260410000003_profile_rls.sql
    - supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql
    - scripts/apply-supabase-migrations.ts
    - tests/.supabase-connectivity.json (gitignored)
  modified:
    - prisma/schema.prisma (placeholder → full Phase 2 schema)
    - package.json (added db:supabase script)
    - .gitignore (added tests/.supabase-connectivity.json)
decisions:
  - "prisma db push used instead of prisma migrate dev — Supabase built-in extensions (pg_graphql, pgcrypto, supabase_vault, uuid-ossp) caused drift detection to block migrate dev; db push bypasses migration history check"
  - "Migration SQL documented in prisma/migrations/20260410000000_init_phase2/migration.sql via migrate diff --from-empty --to-schema for future reference"
  - "url/directUrl removed from schema.prisma datasource block (Prisma 7 breaking change — must be in prisma.config.ts)"
  - "_supabase_migrations tracking table added to enable idempotent re-runs of apply-supabase-migrations.ts"
  - "5th migration added to explicitly disable RLS on jobs/applications/reviews (Supabase enables RLS on all tables by default for new projects)"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 3
---

# Phase 2 Plan 02: Schema + Migrations Summary

**One-liner:** Prisma 7 schema with 6 models + 5 enums applied to live Supabase via db push; PostGIS + auth trigger + RLS policies applied via idempotent Node script; DATA-02 + DATA-03 tests green.

## Strategy Pivot

**Original plan assumed:** `supabase db push` (CLI) or `mcp__supabase__apply_migration` (MCP) for applying Supabase-specific SQL.

**Both were already resolved in Plan 02-01 Task 5 checkpoint** as unavailable. This plan executed the `direct-prisma` strategy chosen there.

**Additional pivot within this plan:** `prisma migrate dev --name init_phase2` was also blocked. Supabase projects come with built-in extensions (pg_graphql, pgcrypto, plpgsql, supabase_vault, uuid-ossp) that Prisma's migration history doesn't know about. This caused Prisma to detect "drift" and demand an interactive `migrate reset` — which would wipe all Supabase system data. Resolution: used `prisma db push` instead, which syncs schema to DB without requiring clean migration history.

**Final execution flow (as executed):**

```
1. npx prisma db push             → creates 6 tables + 5 enums + geography columns
2. npx prisma generate            → generates src/generated/prisma/ client
3. tsx scripts/apply-supabase-migrations.ts →
     - 20260410000000_enable_postgis.sql       (PostGIS extension)
     - 20260410000001_auth_trigger_handle_new_user.sql (auth → public.users trigger)
     - 20260410000002_user_rls.sql             (User RLS own-row policies)
     - 20260410000003_profile_rls.sql          (WorkerProfile + BusinessProfile RLS)
     - 20260410000004_disable_rls_jobs_applications_reviews.sql (D-05 RLS disable)
```

**Why this is correct:** The hybrid SSOT model from CONTEXT.md D-03 is preserved — Prisma owns tables/relations/enums, `supabase/migrations/*.sql` owns PostGIS/trigger/RLS. The only difference from original plan is the application mechanism (Node pg client instead of Supabase CLI/MCP).

## What Was Built

### Task 1: Connectivity verification
- Confirmed `direct-prisma` path from Plan 02-01 Task 5 checkpoint
- All 6 required env vars present in `.env.local`
- `tests/.supabase-connectivity.json` written (gitignored) with path: "direct-prisma", project_ref: "lkntomgdhfvxzvnzmlct"

### Task 2: Prisma schema + migration
- `prisma/schema.prisma` replaced from placeholder to full Phase 2 schema
- **5 enums:** UserRole (WORKER/BUSINESS/BOTH/ADMIN), JobCategory (8 values), ApplicationStatus (5 values), ReviewDirection (2 values), BadgeLevel (6 values)
- **6 models:** User, WorkerProfile, BusinessProfile, Job, Application, Review
- `BusinessProfile.location` and `Job.location` as `Unsupported("geography(Point, 4326)")?`
- `User.id` has no `@default(uuid())` — auth trigger populates it from `auth.users.id`
- Applied via `prisma db push --accept-data-loss`
- Prisma client generated at `src/generated/prisma/`
- Migration SQL captured at `prisma/migrations/20260410000000_init_phase2/migration.sql`

### Task 3: Supabase SQL migrations + apply script
- 5 SQL migration files in `supabase/migrations/`
- `scripts/apply-supabase-migrations.ts`: reads SQL files in lexicographic order, connects via DIRECT_URL, tracks applied migrations in `_supabase_migrations` table (idempotent re-runs safe)
- `npm run db:supabase` script added to package.json
- All 5 migrations applied to live Supabase project (lkntomgdhfvxzvnzmlct)

**Live DB verification:**
- Tables (6): users, worker_profiles, business_profiles, jobs, applications, reviews + spatial_ref_sys (PostGIS)
- Enums (5): all created in public schema
- PostGIS: version 3.3 enabled
- Trigger: `on_auth_user_created` on auth.users — SECURITY DEFINER, set search_path = ''
- RLS: ENABLED on users, worker_profiles, business_profiles; DISABLED on jobs, applications, reviews

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] url/directUrl removed from schema.prisma datasource**
- **Found during:** Task 2 — `npx prisma validate` exited 1 with P1012 error
- **Issue:** The RESEARCH.md verbatim schema included `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in the datasource block. Prisma 7 does not support these in schema.prisma — they must be in prisma.config.ts (already set by Plan 02-01).
- **Fix:** Removed both properties from datasource block. Schema validates cleanly.
- **Files modified:** `prisma/schema.prisma`
- **Commit:** 73428f3

**2. [Rule 1 - Bug] prisma migrate dev blocked by Supabase built-in extension drift**
- **Found during:** Task 2 — `prisma migrate dev --name init_phase2` detected drift from pg_graphql, pgcrypto, supabase_vault, uuid-ossp extensions
- **Issue:** Prisma's migration history is empty but DB already has Supabase system extensions. Prisma demanded interactive `migrate reset` which would wipe system data.
- **Fix:** Used `prisma db push --accept-data-loss` instead. Captured the equivalent SQL via `prisma migrate diff --from-empty --to-schema` and stored in `prisma/migrations/20260410000000_init_phase2/migration.sql` for documentation/future reference.
- **Files modified:** `prisma/migrations/20260410000000_init_phase2/migration.sql` (created)
- **Commit:** 73428f3

**3. [Rule 1 - Bug] Supabase enables RLS on all tables by default**
- **Found during:** Task 3 — after applying SQL migrations, verified RLS state and found jobs, applications, reviews all had RLS ENABLED
- **Issue:** New Supabase projects automatically enable RLS on all tables. CONTEXT.md D-05 requires RLS DISABLED on jobs/applications/reviews in Phase 2.
- **Fix:** Added 5th migration `20260410000004_disable_rls_jobs_applications_reviews.sql` with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` for the 3 tables. Applied immediately.
- **Files modified:** `supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql` (created)
- **Commit:** 8f054fc

**4. [Rule 2 - Missing] apply-supabase-migrations.ts not idempotent**
- **Found during:** Task 3 re-run — script failed with "policy already exists" when run a second time
- **Issue:** Script applied all SQL files every run; Supabase-specific DDL (CREATE POLICY, etc.) is not idempotent.
- **Fix:** Added `_supabase_migrations` tracking table. Script now skips already-applied files on re-run.
- **Files modified:** `scripts/apply-supabase-migrations.ts`
- **Commit:** 8f054fc

## Tests

| Test | Status | Notes |
|------|--------|-------|
| DATA-02 postgis.test.ts — PostGIS extension installed | PASS | PostGIS 3.3 |
| DATA-02 postgis.test.ts — jobs.location column exists as geography | PASS | |
| DATA-03 migrations.test.ts — creates all 6 required tables | PASS | |
| DATA-03 migrations.test.ts — RLS enabled on users/worker_profiles/business_profiles | PASS | |
| DATA-03 migrations.test.ts — RLS disabled on jobs/applications/reviews | PASS | |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1+2 | 73428f3 | feat(02-02): write Phase 2 Prisma schema (6 models + 5 enums) and apply via db push |
| Task 3 | 8f054fc | feat(02-02): write 5 Supabase SQL migrations + apply-supabase-migrations script |

## Known Stubs

None — this plan is pure infrastructure (schema, migrations, scripts). No UI rendering or data stubs introduced.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: trigger-security-definer | supabase/migrations/20260410000001_auth_trigger_handle_new_user.sql | `handle_new_user` runs as SECURITY DEFINER. Mitigated by `set search_path = ''` (blocks search_path injection). Role coercion from raw_app_meta_data is safe — cast to typed enum fails loudly on invalid values. |

## Self-Check: PASSED

Files verified on disk:
- prisma/schema.prisma: FOUND (full schema, 6 models + 5 enums)
- prisma/migrations/20260410000000_init_phase2/migration.sql: FOUND
- supabase/migrations/20260410000000_enable_postgis.sql: FOUND
- supabase/migrations/20260410000001_auth_trigger_handle_new_user.sql: FOUND
- supabase/migrations/20260410000002_user_rls.sql: FOUND
- supabase/migrations/20260410000003_profile_rls.sql: FOUND
- supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql: FOUND
- scripts/apply-supabase-migrations.ts: FOUND

Commits verified in git log:
- 73428f3: FOUND
- 8f054fc: FOUND

Live DB verified:
- 6 public tables: CONFIRMED
- PostGIS extension: ENABLED (v3.3)
- handle_new_user trigger: EXISTS
- RLS users/worker_profiles/business_profiles: ENABLED
- RLS jobs/applications/reviews: DISABLED
- DATA-02 + DATA-03 tests: 5/5 PASS
