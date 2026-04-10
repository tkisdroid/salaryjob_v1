---
phase: 02-supabase-prisma-auth
plan: "03"
subsystem: auth-infra
tags: [supabase, ssr, proxy, session, dal, middleware, next16]
dependency_graph:
  requires:
    - supabase-deps
    - prisma-schema-phase2
    - supabase-tables-live
  provides:
    - supabase-browser-client
    - supabase-server-client
    - supabase-session-refresh-helper
    - next16-proxy
    - dal-verify-session
    - dal-require-worker
    - dal-require-business
  affects:
    - 02-04-PLAN.md (auth Server Actions use createClient from server.ts + verifySession from dal.ts)
    - 02-05-PLAN.md (seed uses server client)
    - 02-06-PLAN.md (Kakao wave uses same OAuth helper + proxy unchanged)
tech_stack:
  added: []
  patterns:
    - "@supabase/ssr 3-file pattern (client.ts, server.ts, middleware.ts helper)"
    - "Next 16 proxy.ts convention (NOT middleware.ts)"
    - "react.cache + server-only DAL pattern for per-request auth re-verification"
    - "getClaims() in proxy (optimistic), getUser() in DAL (authoritative)"
    - "Two-layer role defense: proxy optimistic + DAL page-level re-verify"
key_files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/proxy.ts
    - src/lib/dal.ts
  modified: []
decisions:
  - "Helper named src/lib/supabase/middleware.ts (not proxy.ts) — PLAN.md overrides RESEARCH.md raw code which used proxy.ts name; PLAN.md anti_patterns section explicitly forbids renaming the helper"
  - "workerPrefixes = 8 paths only (/home /my /explore /search /notifications /apply /chat /posts) — /schedule /settlements /applications /availability omitted (those directories do not exist under src/app/(worker)/ — PLAN.md acceptance criteria enforced)"
  - "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with NEXT_PUBLIC_SUPABASE_ANON_KEY fallback in all 3 client files — CONTEXT.md D-07 drift: .env.local uses ANON_KEY naming, fallback preserves runtime compatibility without breaking the env template contract"
  - "unstable_doesProxyMatch test API: available when env vars are set; test exits 0 in all scenarios (green with env, skip-exit-0 without env)"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 0
---

# Phase 2 Plan 03: Supabase SSR Clients + Next 16 Proxy + DAL Summary

**One-liner:** @supabase/ssr 3-file pattern (client/server/middleware helper) wired to Next 16 `src/proxy.ts`, plus react.cache DAL with DB re-verification — auth infrastructure base class for Plans 04–06.

## What Was Built

### Task 1: @supabase/ssr 3-file pattern + src/proxy.ts

**`src/lib/supabase/client.ts`** (425 bytes)
- `createBrowserClient` wrapper for use in Client Components
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback (D-07 drift note inline)
- No `'use client'` directive — callers add it

**`src/lib/supabase/server.ts`** (1,013 bytes)
- `async createServerClient` with `await cookies()` (Next 15+ async API)
- `getAll()` / `setAll(cookiesToSet, _headers)` pattern — no deprecated `get/set/remove` triple
- try/catch in setAll is intentional (Pitfall #4 — swallows "Cookies can only be modified in Server Action" from SC reads)

**`src/lib/supabase/middleware.ts`** (3,440 bytes) — session refresh helper
- `let supabaseResponse` (not const — reassigned inside setAll)
- Zero statements between `createServerClient(...)` and `await supabase.auth.getClaims()` — preserves verbatim comment block
- `getClaims()` not `getSession()` (Pitfall #8 enforced)
- GigNow role protection: `workerPrefixes` (8 paths), `bizPrefixes` (['/biz'])
- Unauth redirect: `/login?next=<path>`; role mismatch: `/login?error=worker_required` or `?error=business_required`
- Returns `supabaseResponse` at every happy path (never a fresh `NextResponse.next()`)

**`src/proxy.ts`** (530 bytes) — Next 16 root proxy file
- `export async function proxy(request: NextRequest)` — correct Next 16 named export
- Imports `updateSession` from `@/lib/supabase/middleware`
- Matcher: excludes `_next/static`, `_next/image`, `favicon.ico`, image extensions
- No `runtime: 'edge'` override (Node.js default per proxy.md)
- Confirmed: `src/middleware.ts` does NOT exist

### Task 2: tests/proxy/redirect.test.ts GREEN

`unstable_doesProxyMatch` from `next/experimental/testing/server` IS available in Next 16.2.1.

| Test | Status | Evidence |
|------|--------|----------|
| AUTH-05: matches /home as protected route | PASS | `unstable_doesProxyMatch('/home') === true` |
| AUTH-05: does NOT match /login | PASS | `unstable_doesProxyMatch('/login') === false` |

Run with: `export $(grep -v '^#' .env.local | xargs -d '\n'); npx vitest run tests/proxy/redirect.test.ts`

Without env vars the tests skip gracefully (exit 0) via `skipIfNoSupabase()`.

### Task 3: src/lib/dal.ts (1,217 bytes)

- `import 'server-only'` — enforces client bundle exclusion at build time (T-03-03 mitigated)
- `import { cache } from 'react'` — per-request React cache for deduplication (NOT `next/cache`, NOT `unstable_cache`)
- `verifySession`: `getUser()` → Supabase auth verify → `prisma.user.findUnique` for authoritative DB role
- `requireWorker`: permits WORKER, BOTH, ADMIN; rejects others → `/login?error=worker_required`
- `requireBusiness`: permits BUSINESS, BOTH, ADMIN; rejects others → `/login?error=business_required`
- No `getSession()` anywhere (Pitfall #8)
- No stale JWT reliance — DB row always read (T-03-04 mitigated)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one naming clarification:

**1. [Rule 0 - Clarification] Helper file name: middleware.ts vs proxy.ts**
- **Found during:** Task 1 cross-reference
- **Issue:** RESEARCH.md raw code shows `src/lib/supabase/proxy.ts` as the helper file name. PLAN.md explicitly says `src/lib/supabase/middleware.ts` and has an anti-pattern note: "Do NOT rename the middleware.ts file — the helper IS named middleware.ts."
- **Resolution:** PLAN.md takes precedence. Helper is `middleware.ts`. Root Next 16 file is `src/proxy.ts`. The PLAN.md distinction is intentional — keeps the helper name descriptive (`middleware.ts`) while following Next 16 convention for the root file (`proxy.ts`).

## Tests

| Test | Status | Notes |
|------|--------|-------|
| AUTH-05 redirect.test.ts — matches /home as protected | PASS | 4/4 green with env vars |
| AUTH-05 redirect.test.ts — /login not matched | PASS | |
| TypeScript (3 helper files) | CLEAN | No errors in new files |
| TypeScript (proxy.ts) | CLEAN | No errors |
| TypeScript (dal.ts) | CLEAN | No errors |

Pre-existing TS errors (prisma.config.ts, @/generated/prisma/client missing in worktree context, test stubs) are not caused by this plan.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1+2 | 0d11fcc | feat(02-03): write @supabase/ssr 3-file pattern + Next 16 proxy.ts |
| Task 3 | 1c9b455 | feat(02-03): create src/lib/dal.ts with server-only + react.cache + DB re-verification |

## Known Stubs

None — all 5 files are fully implemented, not stubs. No placeholder data or hardcoded empty values flow to UI.

## Threat Flags

No new threat surface beyond what is in the plan's threat model. All T-03-xx mitigations implemented:

| Threat ID | Mitigation Status |
|-----------|------------------|
| T-03-01 | getClaims() in proxy verifies HMAC — implemented |
| T-03-02 | Verbatim updateSession with let supabaseResponse reassignment — implemented |
| T-03-03 | import 'server-only' in dal.ts — implemented |
| T-03-04 | prisma.user.findUnique DB re-read in verifySession — implemented |
| T-03-05 | Proxy optimistic check done; DAL second layer available for Plan 04 to wire |
| T-03-06 | workerPrefixes in single file, grep-verifiable, 8-path list correct |
| T-03-07 | Accepted — getClaims failure → unauth treatment → /login redirect |
| T-03-08 | Matcher excludes _next/static, _next/image, favicon.ico, image extensions |
| T-03-09 | DAL helpers documented as page-only (Plan 04 convention) |
| T-03-10 | Supabase SSR defaults HttpOnly+SameSite=lax+Secure unchanged |

## Self-Check: PASSED
