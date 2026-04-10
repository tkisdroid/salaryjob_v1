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
  - "Task 5 checkpoint: user must select MCP vs CLI path before Plan 02 can execute schema push"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 4
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

### Task 5: CHECKPOINT (awaiting user decision)
See checkpoint section below.

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

## Task 5 Checkpoint — Supabase MCP vs CLI Decision

**Type:** decision

Plan 02 (Wave 1) needs to apply migrations to a live Supabase project. The approach (MCP vs CLI) must be decided before Plan 02 executes.

**Options:**

| Option | ID | Pros | Cons |
|--------|-----|------|------|
| MCP primary | `mcp-primary` | Fully automated — Claude creates project + applies migrations without user CLI setup | Requires MCP server wired in this session; Plan 02 stalls if it isn't |
| Supabase CLI | `cli-fallback` | Proven path, works without MCP | User must `npm i -g supabase` + `supabase login` + `supabase link` before Plan 02 |
| Try MCP, fall back to CLI | `try-mcp-fallback-cli` | Handles uncertainty gracefully | Conditional branch in Plan 02; may interrupt mid-execution to install CLI |

**User must also confirm:**
- (a) Supabase account ready?
- (b) Permission to create a new project OR existing dev project ref to reuse?

**Reply with:** one of `mcp-primary`, `cli-fallback`, or `try-mcp-fallback-cli` + answers to (a) and (b).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 099d666 | chore(02-01): install testing + Supabase + seed runner dependencies |
| Task 2 | 82b85cc | chore(02-01): add Vitest + Playwright config and test helpers |
| Task 3 | ec80b97 | test(02-01): add failing test stubs for all REQ-IDs |
| Task 4 | a9faf57 | chore(02-01): preserve legacy schema, write placeholder, add .env.example, fix ARCHITECTURE.md drift |

## Known Stubs

All 14 test stubs in `tests/` are intentional stubs — they exist to become green as downstream Plans deliver their artifacts. They are not blocking this plan's goals; they are the goal (Wave 0 test scaffolding). No unintentional stubs.

## Self-Check: PASSED

All 21 created files found on disk. All 4 task commits verified in git log.
