---
phase: 02-supabase-prisma-auth
plan: "01"
subsystem: testing-infra
tags: [testing, vitest, playwright, supabase, prisma, housekeeping]
dependency_graph:
  requires: []
  provides:
    - vitest-config
    - playwright-config
    - test-stubs-wave0
    - supabase-deps
    - env-template
    - legacy-schema-preserved
  affects:
    - 02-02-PLAN.md (schema, env vars)
    - 02-03-PLAN.md (proxy test stub ready)
    - 02-04-PLAN.md (auth stubs ready)
    - 02-05-PLAN.md (seed stub ready)
tech_stack:
  added:
    - "@supabase/ssr@^0.10.2"
    - "@supabase/supabase-js@^2.103.0"
    - "tsx@^4.21.0"
    - "vitest@^3.2.4"
    - "@vitejs/plugin-react@^6.0.1"
    - "@testing-library/react@^16.3.2"
    - "@testing-library/jest-dom@^6.9.1"
    - "jsdom@^29.0.2"
    - "@playwright/test@^1.59.1"
  patterns:
    - "environmentMatchGlobs dual-env (node for DB/auth tests, jsdom for components)"
    - "dynamic import pattern for Plan-04-owned modules in Wave 0 stubs"
    - "skipIfNoSupabase() guard for pre-provisioning test runs"
key_files:
  created:
    - vitest.config.ts
    - playwright.config.ts
    - tests/setup.ts
    - tests/helpers/test-users.ts
    - tests/helpers/skip-if-no-supabase.ts
    - tests/data/postgis.test.ts
    - tests/data/migrations.test.ts
    - tests/data/seed.test.ts
    - tests/auth/signup.test.ts
    - tests/auth/magic-link.test.ts
    - tests/auth/google-oauth.test.ts
    - tests/auth/kakao-oauth.test.ts
    - tests/auth/role-select.test.ts
    - tests/proxy/redirect.test.ts
    - tests/e2e/session-persist.spec.ts
    - tests/e2e/logout.spec.ts
    - tests/e2e/protected-redirect.spec.ts
    - tests/e2e/role-worker-only.spec.ts
    - tests/e2e/role-biz-only.spec.ts
    - .env.example
    - prisma/schema.legacy.prisma.txt
  modified:
    - package.json (scripts + 9 deps)
    - package-lock.json
    - prisma/schema.prisma (replaced with Prisma 7 placeholder)
    - prisma.config.ts (added directUrl)
    - .planning/codebase/ARCHITECTURE.md (drift fixes)
decisions:
  - "Prisma 7 breaking change: url/directUrl must be in prisma.config.ts, NOT schema.prisma — placeholder omits them from datasource block"
  - "vitest environmentMatchGlobs deprecated in v3 — kept per plan spec; will migrate to test.projects in a future cleanup if needed"
  - ".env.example force-added past .env* gitignore pattern (it is a template, not secrets)"
  - "Task 5 resolved: chose direct-prisma path (4th option). MCP not accessible (project lkntomgdhfvxzvnzmlct lives in a Supabase account not linked to this Claude Code MCP); Supabase CLI + Docker Desktop not installed locally; pivoted to Prisma migrate + Node-driven raw-SQL execution against direct DATABASE_URL for Supabase-specific concerns (PostGIS extension, auth trigger handle_new_user, RLS policies). Hybrid SSOT model from CONTEXT.md D-03 preserved — Prisma owns tables/relations/enums, supabase/migrations/*.sql files own extension+trigger+RLS, applied via scripts/apply-supabase-migrations.ts (not Supabase CLI)."
metrics:
  duration: "~30 minutes (incl. checkpoint resolution)"
  completed_date: "2026-04-10"
  tasks_completed: 5
  tasks_total: 5
  files_created: 21
  files_modified: 5
---

# Phase 2 Plan 01: Testing Infra + Housekeeping Summary

**One-liner:** Vitest 3 + Playwright Wave-0 stubs for all 13 REQ-IDs, @supabase/ssr installed, legacy Prisma schema preserved, ARCHITECTURE.md drift fixed — Phase 2 "출발선" locked.

## What Was Built

### Task 1: Dependencies installed
- `@supabase/ssr@0.10.2` + `@supabase/supabase-js@2.103.0` added to `dependencies`
- `tsx`, `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test` added to `devDependencies`
- Playwright chromium binary downloaded
- npm scripts: `test` (vitest run), `test:watch`, `test:e2e`, `test:all`

### Task 2: Test configuration and helpers
- `vitest.config.ts`: dual-environment (node for DB/auth/proxy, jsdom for components), `@` alias to `./src`, 15s timeout
- `playwright.config.ts`: chromium only, `baseURL http://localhost:3000`, webServer auto-start, storage state reuse
- `tests/setup.ts`: jest-dom matchers via `@testing-library/jest-dom/vitest`
- `tests/helpers/test-users.ts`: 6 DEV_USERS (worker, worker2, business, business2, both, admin) + `loginAs()` Playwright helper
- `tests/helpers/skip-if-no-supabase.ts`: `skipIfNoSupabase()` guard for pre-provisioning runs

### Task 3: 14 failing test stubs covering every REQ-ID
All stubs:
- Have `// REQ: <ID>` header comment
- Skip gracefully when `NEXT_PUBLIC_SUPABASE_URL` is unset (exit 0)
- Use `await import(...).catch(() => null)` dynamic pattern for Plan-04 modules (no static imports that would break Vitest load)

| File | REQ-ID | Skip guard |
|------|--------|-----------|
| tests/data/postgis.test.ts | DATA-02 | skipIfNoSupabase() |
| tests/data/migrations.test.ts | DATA-03 | skipIfNoSupabase() |
| tests/data/seed.test.ts | DATA-04 | skipIfNoSupabase() |
| tests/auth/signup.test.ts | AUTH-01 | it.skipIf env |
| tests/auth/magic-link.test.ts | AUTH-01m | it.skipIf env |
| tests/auth/google-oauth.test.ts | AUTH-01g | it.skipIf env |
| tests/auth/kakao-oauth.test.ts | AUTH-01k | it.skipIf env |
| tests/auth/role-select.test.ts | AUTH-02 | it.skipIf env |
| tests/proxy/redirect.test.ts | AUTH-05 | skipIfNoSupabase() |
| tests/e2e/session-persist.spec.ts | AUTH-03 | test.skip env |
| tests/e2e/logout.spec.ts | AUTH-04 | test.skip env |
| tests/e2e/protected-redirect.spec.ts | AUTH-05 | test.skip env |
| tests/e2e/role-worker-only.spec.ts | AUTH-06 | test.skip env |
| tests/e2e/role-biz-only.spec.ts | AUTH-07 | test.skip env |

Verified: `NEXT_PUBLIC_SUPABASE_URL= npx vitest run tests/data tests/auth tests/proxy` → exit 0, 18 tests skipped.

### Task 4: Schema preservation, .env.example, ARCHITECTURE.md
- `prisma/schema.legacy.prisma.txt`: 18,397-byte verbatim copy of legacy schema (EMPLOYER enum preserved)
- `prisma/schema.prisma`: 669-byte Prisma 7 placeholder (no url/directUrl — Prisma 7 requires these in prisma.config.ts)
- `prisma.config.ts`: added `directUrl: process.env["DIRECT_URL"]`
- `.env.example`: 12 D-07 env vars, DATABASE_URL with `?pgbouncer=true`, DIRECT_URL with `:5432`
- `.planning/codebase/ARCHITECTURE.md`: removed Clerk webhook + Toss + Push refs; added Supabase Auth; added drift-note banner

### Task 5: CHECKPOINT — RESOLVED (direct-prisma path)
Chosen path documented in Task 5 Checkpoint Resolution section below. Strategy decision committed alongside `.env.local` env-var population.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma 7 incompatible schema datasource url/directUrl**
- **Found during:** Task 4 — `npx prisma validate` exited 1 with P1012 error
- **Issue:** The plan's placeholder schema template included `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in the datasource block. In Prisma 7, these properties are no longer supported in schema.prisma — they must be in `prisma.config.ts`.
- **Fix:** Removed `url`/`directUrl` from `prisma/schema.prisma` datasource block. Added `directUrl: process.env["DIRECT_URL"]` to `prisma.config.ts`. Schema placeholder now validates cleanly.
- **Files modified:** `prisma/schema.prisma`, `prisma.config.ts`
- **Commit:** a9faf57

**2. [Rule 2 - Missing] .env.example blocked by .env* gitignore pattern**
- **Found during:** Task 4 git commit
- **Issue:** `.gitignore` has `.env*` which also matches `.env.example`. The template file must be committed.
- **Fix:** Used `git add -f .env.example` to force-track the template file. This is the standard practice — example files have no secrets.
- **Files modified:** `.gitignore` not changed (intentional — `.env.example` force-tracked)
- **Commit:** a9faf57

## Task 5 Checkpoint — Supabase Push Strategy: RESOLVED

**Resolution date:** 2026-04-10
**Chosen path:** `direct-prisma` (4th option, introduced after both MCP and CLI paths were ruled out)

### Why neither original option worked

| Option | Outcome | Reason |
|--------|---------|--------|
| `mcp-primary` | ❌ blocked | Project `lkntomgdhfvxzvnzmlct` lives in a Supabase account that this Claude Code session's MCP connector is NOT linked to. All `mcp__claude_ai_Supabase__*` calls return `MCP error -32600: You do not have permission`. |
| `cli-fallback` | ❌ blocked | Supabase CLI not installed locally. `supabase start` (local dev) requires Docker Desktop, which is also not installed. Installing both is a 30+ minute Windows + WSL2 detour. |
| `try-mcp-fallback-cli` | ❌ blocked | Both prerequisites above fail. |

### `direct-prisma` path (chosen)

Pivoted to a fourth strategy that needs no MCP and no CLI:

1. **Connection verified.** `db.lkntomgdhfvxzvnzmlct.supabase.co:5432` reachable via `pg` client with password from user; project is empty (0 public tables, 0 auth.users) — clean slate, no collision risk.
2. **Existing extensions:** `pg_graphql 1.5.11`, `pg_stat_statements 1.11`, `pgcrypto 1.3`, `plpgsql 1.0`, `supabase_vault 0.3.1`, `uuid-ossp 1.1`. **PostGIS not yet enabled** — Plan 02-02 must enable it via raw SQL.
3. **Hybrid SSOT model preserved (CONTEXT.md D-03):**
   - **Prisma 7** owns: tables, relations, enums, indexes (via `prisma migrate dev/deploy` reading `prisma/schema.prisma`)
   - **`supabase/migrations/*.sql`** own: PostGIS extension, `auth.users → public.User` trigger, RLS policies on User/WorkerProfile/EmployerProfile
   - **Application path** (replaces `supabase db push`): a small Node script `scripts/apply-supabase-migrations.ts` reads `supabase/migrations/*.sql` in lexicographic order and executes them via `pg` client against `DIRECT_URL`.
4. **`.env.local` populated** (gitignored, never committed):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon JWT)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role JWT, server-only)
   - `DATABASE_URL` and `DIRECT_URL` both pointing to `db.lkntomgdhfvxzvnzmlct.supabase.co:5432` (Supavisor pooler not provisioned for this project — TODO before production)
   - All 12 keys from `.env.example` template are present (key-name diff returned empty)

### Implications for downstream plans

- **Plan 02-02:** Use `npx prisma migrate dev` for schema, then `tsx scripts/apply-supabase-migrations.ts` for the four `supabase/migrations/*.sql` files. NO `supabase db push`. NO MCP `apply_migration`.
- **Plan 02-03..02-06:** Unaffected — `@supabase/ssr` reads the same env vars regardless of how migrations were applied.
- **Plan 02-05 seed:** `tsx prisma/seed.ts` works against `DATABASE_URL` directly.
- **Production cutover (post-Phase 2):** Provision the Supavisor pooler in Supabase dashboard, then split `DATABASE_URL` (port 6543, transaction mode) from `DIRECT_URL` (port 5432, direct) per RESEARCH.md §Key Finding #6.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 099d666 | chore(02-01): install testing + Supabase + seed runner dependencies |
| Task 2 | 82b85cc | chore(02-01): add Vitest + Playwright config and test helpers |
| Task 3 | ec80b97 | test(02-01): add failing test stubs for all REQ-IDs |
| Task 4 | a9faf57 | chore(02-01): preserve legacy schema, write placeholder, add .env.example, fix ARCHITECTURE.md drift |
| Task 5 | (pending) | docs(02-01): resolve checkpoint — chose direct-prisma path |

## Known Stubs

All 14 test stubs in `tests/` are intentional stubs — they exist to become green as downstream Plans deliver their artifacts. They are not blocking this plan's goals; they are the goal (Wave 0 test scaffolding). No unintentional stubs.

## Self-Check: PASSED

All 21 created files found on disk. All 4 task commits verified in git log.
