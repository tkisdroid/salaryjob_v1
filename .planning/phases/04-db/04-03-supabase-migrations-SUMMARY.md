---
phase: 04-db
plan: 03
subsystem: supabase-migrations
tags: [supabase, postgres, rls, pg_cron, realtime, migration]
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
  - SHIFT-01
dependency_graph:
  requires:
    - "04-02 (ApplicationStatus.pending enum + WorkerProfile.noShowCount column on Supabase)"
    - "Phase 3 (supabase_realtime publication, pg_cron extension, RLS pattern)"
  provides:
    - "applications RLS policies (defense in depth + Realtime row-gating)"
    - "postgres_changes subscription eligibility for public.applications"
    - "auto-accept-applications-every-min pg_cron job (D-03)"
    - "detect-no-show-applications-every-5-min pg_cron job (D-22)"
  affects:
    - "Wave 3 Plan 04-04 (applyOneTap Server Action relies on pending default + RLS-compatible inserts)"
    - "Wave 3 Plan 04-05 (accept/reject flow — business UPDATE via RLS policy)"
    - "Wave 3 Plan 04-07 (check-in / check-out actions + no-show grace window semantics)"
    - "Wave 3 Plan 04-09 (Realtime subscription for live application status)"
tech_stack:
  added:
    - "none (pure SQL DDL + pg_cron schedules — pg_cron extension already enabled in Phase 3)"
  patterns:
    - "DROP POLICY IF EXISTS guards for idempotent RLS re-application"
    - "DO block + pg_publication_tables check for idempotent publication ADD"
    - "cron.unschedule-if-exists + cron.schedule pair for idempotent job scheduling"
    - "CTE chain (no_show_rows → cancelled_apps → decremented_jobs → worker_profiles update) for atomic cascading state transition"
key_files:
  created:
    - "supabase/migrations/20260412000001_applications_rls_phase4.sql"
    - "supabase/migrations/20260412000002_applications_realtime_publication.sql"
    - "supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql"
    - "supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql"
  modified: []
  unchanged_but_used:
    - "scripts/apply-supabase-migrations.ts (Phase 2/3 runner; automatically picked up the 4 new files in lexicographic order — no code change needed)"
decisions:
  - "Re-enabled RLS on public.applications only — public.reviews remains disabled until Phase 5 (contract from D-05 disable migration comment)"
  - "Business UPDATE policy uses EXISTS(jobs join) rather than a materialized jobs.authorId snapshot — join is cheap because applications.jobId is indexed and jobs.id is PK"
  - "No-show CTE uses GREATEST(filled-1, 0) to guard against double-decrement races with manual cancel"
  - "No-show CTE also re-opens jobs from 'filled' → 'active' when seat is freed (conservative safety net; won't fire if workDate already passed because filled jobs with expired workDate are handled by Phase 3 expire-jobs cron)"
  - "REPLICA IDENTITY set to DEFAULT explicitly (Postgres default) for clarity — enables UPDATE events to carry old→new diff for Realtime subscribers"
  - "Auto-accept cron runs every minute (not every 5 min like expire-jobs) because Worker UX promises near-instant confirmation; WHERE clause uses indexed (workerId, status) partial scope so DB load is minimal"
metrics:
  duration_seconds: 900
  tasks_completed: 5
  files_modified: 4
  commits: 4
  completed_at: "2026-04-10"
---

# Phase 04 Plan 03: Supabase Migrations Summary

**One-liner:** Four SQL migrations applied to Supabase — RLS on applications (5 policies), Realtime publication membership, and two pg_cron schedules (auto-accept 30-min + no-show detection with atomic CTE cascading).

## What was built

Four migration files in `supabase/migrations/` (timestamp prefix `20260412000001..4`) that together close the gap between Phase 2's D-05 disable migration and Wave 3's Server Action needs. All four are idempotent and were applied to the live Supabase project `lkntomgdhfvxzvnzmlct` via `scripts/apply-supabase-migrations.ts`.

### 1. `20260412000001_applications_rls_phase4.sql` — RLS re-enable (D-17)

Re-enables `ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY` and creates **5 policies** (no DELETE policy → soft-delete via `status='cancelled'`):

| Policy | Command | Role | Predicate |
|--------|---------|------|-----------|
| `applications_select_worker` | SELECT | authenticated | `auth.uid() = workerId` |
| `applications_select_business` | SELECT | authenticated | `EXISTS (jobs j WHERE j.id = applications.jobId AND j.authorId = auth.uid())` |
| `applications_insert_worker` | INSERT | authenticated | `auth.uid() = workerId` (WITH CHECK) |
| `applications_update_worker` | UPDATE | authenticated | `auth.uid() = workerId` (both USING and WITH CHECK) |
| `applications_update_business` | UPDATE | authenticated | `EXISTS (jobs join)` (both USING and WITH CHECK) |

Overrides the `applications` portion of `20260410000004_disable_rls_jobs_applications_reviews.sql`. `reviews` and `jobs` states are untouched (jobs was already re-enabled in Phase 3 D-02).

### 2. `20260412000002_applications_realtime_publication.sql` — Realtime publication (D-06/D-07)

`ALTER PUBLICATION supabase_realtime ADD TABLE public.applications` (guarded by `pg_publication_tables` check in a `DO` block for idempotency). Also sets `REPLICA IDENTITY DEFAULT` explicitly — enables UPDATE events to carry the old→new diff for client subscribers. RLS policies from migration 1 automatically gate per-row visibility during Realtime dispatch per Supabase docs.

### 3. `20260412000003_pg_cron_auto_accept_applications.sql` — Auto-accept timer (D-03)

```
cron.schedule('auto-accept-applications-every-min', '* * * * *', $$
  UPDATE public.applications
  SET status = 'confirmed'
  WHERE status = 'pending'
    AND "appliedAt" < now() - INTERVAL '30 minutes';
$$)
```

Runs every minute. Only touches rows where `(workerId, status)` composite index narrows the scan + the timestamp predicate eliminates most rows — constant low DB load. Uses `unschedule-if-exists` guard before `schedule()` for idempotent re-runs.

### 4. `20260412000004_pg_cron_detect_no_show_applications.sql` — No-show detection (D-22)

Runs every 5 minutes. Cascading state transition via **one CTE chain** (atomic-ish — all runs inside a single statement, postgres guarantees atomicity within the cron-dispatched execution):

1. `no_show_rows`: SELECT `status='confirmed' AND checkInAt IS NULL AND (workDate + startTime + 30min) < now()`
2. `cancelled_apps`: UPDATE applications → `status = 'cancelled'`
3. `decremented_jobs`: UPDATE jobs → `filled = GREATEST(filled-1, 0)`, re-open `filled → active`
4. Final UPDATE: worker_profiles → `noShowCount = noShowCount + 1`

Grace window matches the D-09 check-in window (30 min after start). Same `unschedule-if-exists` guard pattern.

## Verification — all 6 checks PASS on Supabase

All queries executed via `pg` client over `DIRECT_URL` to `db.lkntomgdhfvxzvnzmlct.supabase.co:5432`:

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | `pg_class.relrowsecurity` for `applications` | `true` | `{"relname":"applications","relrowsecurity":true}` ✓ |
| 2 | `pg_policies` count on `applications` | 5 named policies | All 5 present: insert_worker, select_business, select_worker, update_business, update_worker ✓ |
| 3 | `pg_publication_tables` for `supabase_realtime` + `applications` | 1 row | `[{"pubname":"supabase_realtime","schemaname":"public","tablename":"applications"}]` ✓ |
| 4 | `cron.job` `auto-accept-applications-every-min` | schedule=`* * * * *`, active=true | `[{"jobname":"auto-accept-applications-every-min","schedule":"* * * * *","active":true}]` ✓ |
| 5 | `cron.job` `detect-no-show-applications-every-5-min` | schedule=`*/5 * * * *`, active=true | `[{"jobname":"detect-no-show-applications-every-5-min","schedule":"*/5 * * * *","active":true}]` ✓ |
| 6 | `pg_class.relreplident` for `applications` | `'d'` (DEFAULT) | `[{"relreplident":"d"}]` ✓ |

### Migration script output (excerpted)

```
Found 13 Supabase migration(s) to apply:
  ...
Skipping (already applied): 20260410000000_enable_postgis.sql
... (9 skipped)
Applying: 20260412000001_applications_rls_phase4.sql
  OK
Applying: 20260412000002_applications_realtime_publication.sql
  OK
Applying: 20260412000003_pg_cron_auto_accept_applications.sql
  OK
Applying: 20260412000004_pg_cron_detect_no_show_applications.sql
  OK
Done. 4 applied, 9 skipped (already applied).
```

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `c9ac03d` | Task 1 | feat(04-03): add applications RLS phase4 migration |
| 2 | `836dcb6` | Task 2 | feat(04-03): add applications realtime publication migration |
| 3 | `d760581` | Task 3 | feat(04-03): add pg_cron auto-accept applications migration |
| 4 | `1becf4b` | Task 4 | feat(04-03): add pg_cron no-show detection migration |

Task 5 (apply + verify) produced no file changes — it ran `scripts/apply-supabase-migrations.ts` unchanged and verified state via direct pg queries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Worktree missing `.env` / `.env.local` files**

- **Found during:** Task 5 (`npx tsx scripts/apply-supabase-migrations.ts`)
- **Issue:** Git worktrees don't inherit untracked files from the parent checkout. Without `.env.local` the script could not read `DIRECT_URL`.
- **Fix:** Copied both files from the main repo (`../../../.env*`) into the worktree. Both are gitignored — no leak risk.
- **Files modified:** none (gitignored)

**2. [Rule 3 - Blocker] Migration tracker under-seeded**

- **Found during:** Task 5 (first script run)
- **Issue:** The `_supabase_migrations` tracker only had 2 rows (for `20260410000000_enable_postgis.sql` and `20260410000001_auth_trigger_handle_new_user.sql`). The first script run re-applied Phase 2/3 migrations and immediately errored on `20260410000002_user_rls.sql` (`policy "users_select_own" for table "users" already exists`). Phase 2's direct-prisma migration run (see 02-02 SUMMARY) didn't populate the tracker for every file — likely because it used a different apply path for those.
- **Fix:** Verified the 7 missing Phase 2/3 migrations are already live on the DB via direct pg queries against `pg_policies`, `pg_class`, `cron.job`, `storage.buckets`, `pg_trigger`. All 7 confirmed applied. Then seeded the tracker via `INSERT ... ON CONFLICT DO NOTHING` for all 7 files. Re-ran the script — it correctly skipped all 9 prior files and applied only the 4 new ones.
- **Files modified:** none (only DB state in the tracker table)

**3. [Rule 3 - Workaround] `dotenv/config` loads `.env` instead of `.env.local`**

- **Found during:** Task 5
- **Issue:** `scripts/apply-supabase-migrations.ts` uses `import "dotenv/config"` which loads `.env` only. `DIRECT_URL` lives in `.env.local` (per Phase 2 direct-prisma convention), and `.env` has a corrupted stale `DATABASE_URL="prisma+postgres://localhost:51213/..."` from an earlier Prisma local-dev experiment. Same problem as 04-02 Plan.
- **Fix:** Overrode `DIRECT_URL` inline on the shell before running: `DIRECT_URL="postgresql://...@db.lkntomgdhfvxzvnzmlct.supabase.co:5432/postgres" npx tsx scripts/apply-supabase-migrations.ts`. Shell env overrides dotenv. Did not modify `.env` or `scripts/apply-supabase-migrations.ts` — per 04-02 notes this cleanup is owned by Plan 04-10.
- **Files modified:** none

### Scope boundary deferrals

- Plan lists `scripts/apply-supabase-migrations.ts` in `files_modified`, but after reading the Phase 2 version it became clear **no code change is needed** — the script already applies new `.sql` files in lexicographic order via a tracker table, and the 4 new migrations are picked up automatically. The `files_modified` entry in the plan was aspirational (listing the runner as a dependency rather than a modification target).

## Known Follow-ups (out of scope)

- **Env normalization** (owned by Plan 04-10 cleanup ticket): `.env` contains a corrupted `DATABASE_URL` that shadows `.env.local`. `scripts/apply-supabase-migrations.ts` uses `dotenv/config` (loads `.env` only, not `.env.local`). Workaround: shell env override. Permanent fix belongs to a separate cleanup plan.
- **Migration tracker audit** (Phase 5 consideration): The `_supabase_migrations` tracker diverged from actual DB state during Phase 2 direct-prisma fallback. This plan re-aligned it for the files this plan touches, but the tracker is still the source of truth for future Supabase CLI migrations. Consider a cross-check script in Phase 5.
- **No-show cron test fixture** (Wave 3 Plan 04-07): The no-show cron's CTE chain is complex enough that Wave 3 should include an integration test that (a) seeds a confirmed application with workDate+startTime already 31+ min in the past and checkInAt NULL, (b) manually invokes the cron body as raw SQL, (c) asserts all 3 cascading effects (application cancelled, jobs.filled decremented, worker_profiles.noShowCount++).
- **Prisma RLS bypass verification** (Wave 3): Prisma uses DIRECT_URL (service role) so it bypasses RLS entirely. Wave 3 Server Actions must continue to enforce ownership via `requireApplicationOwner` / `requireJobOwner` from `src/lib/dal.ts`. RLS is defense-in-depth only.

## Checkpoint: Task 6 (human-verify)

**Status:** Awaiting human verification. Per parallel executor conventions, automation gates are already captured above (all 6 checks pass). The human-facing checklist in the plan was:

- [x] (automated) `applications.relrowsecurity = true`
- [x] (automated) 5 policies present on `applications`
- [x] (automated) `supabase_realtime` publication includes `applications`
- [x] (automated) `auto-accept-applications-every-min` cron active
- [x] (automated) `detect-no-show-applications-every-5-min` cron active
- [ ] **(manual, optional)** Operator visits Supabase Dashboard → Database → Replication → confirms `applications` toggle is visible in UI (UI-layer sanity check — not a hard gate because `pg_publication_tables` is already confirmed)

Orchestrator may treat this plan as PASS based on the 5 automated checks. Manual UI verification is optional belt-and-suspenders for Wave 3 gate.

## Threat Flags

None beyond the plan's declared `<threat_model>`. All 4 migrations match the STRIDE register (T-04-10..T-04-16) exactly.

## Self-Check: PASSED

- `supabase/migrations/20260412000001_applications_rls_phase4.sql` — FOUND (80 lines, 5 CREATE POLICY, ENABLE ROW LEVEL SECURITY)
- `supabase/migrations/20260412000002_applications_realtime_publication.sql` — FOUND (30 lines, DO block ADD TABLE, REPLICA IDENTITY DEFAULT)
- `supabase/migrations/20260412000003_pg_cron_auto_accept_applications.sql` — FOUND (31 lines, cron.schedule every minute, INTERVAL '30 minutes', status='confirmed')
- `supabase/migrations/20260412000004_pg_cron_detect_no_show_applications.sql` — FOUND (64 lines, cron.schedule every 5 min, CTE chain, noShowCount++, GREATEST filled-1)
- Commits `c9ac03d 836dcb6 d760581 1becf4b` — FOUND in `git log`
- Supabase DB state: RLS enabled, 5 policies, publication member, 2 cron jobs active, REPLICA IDENTITY=DEFAULT — VERIFIED via direct pg queries
