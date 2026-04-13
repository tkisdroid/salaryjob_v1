---
phase: 06-admin-backoffice
plan: "03"
subsystem: auth
tags: [routing, dal, middleware, admin, role-gate]
dependency_graph:
  requires: [06-02]
  provides: [ADMIN routing layer, requireAdmin DAL helper, /admin middleware gate]
  affects: [src/lib/auth/routing.ts, src/lib/dal.ts, src/lib/supabase/middleware.ts]
tech_stack:
  added: []
  patterns: [React.cache deduplication, three-layer auth gate (middleware→layout→DAL)]
key_files:
  modified:
    - src/lib/auth/routing.ts
    - src/lib/dal.ts
    - src/lib/supabase/middleware.ts
decisions:
  - "ADMIN gate in canRoleAccessPath uses strict equality (role==='ADMIN') — BOTH role cannot access /admin (T-06-06 mitigated)"
  - "admin requirement checked FIRST in getRouteRequirement to prevent BOTH accidentally matching worker/business prefix before admin prefix"
  - "requireAdmin IS_TEST_MODE branch uses findFirst(role=ADMIN) without SKIP LOCKED — admin tests are not concurrent (unlike apply-race)"
  - "Middleware admin gate uses (!role || !canRoleAccessPath) — unauthenticated users hitting /admin also get redirect (defense-in-depth)"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-13"
  tasks_completed: 3
  files_modified: 3
---

# Phase 06 Plan 03: Auth DAL + Routing + Middleware ADMIN Gate Summary

Three surgical files gain ADMIN-awareness. Wave 4 (admin UI) is now unblocked — `/admin` routes are role-gated at all three layers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Routing patches — ADMIN branch in 3 functions | 220d233 | src/lib/auth/routing.ts |
| 2 | requireAdmin() DAL helper | e510f6b | src/lib/dal.ts |
| 3 | Middleware /admin gate + landing redirect | 622202f | src/lib/supabase/middleware.ts |

## Key Diffs

### canRoleAccessPath — before vs after

```typescript
// BEFORE (routing.ts)
export function canRoleAccessPath(role, path) {
  const requirement = getRouteRequirement(path)
  if (!requirement) return true
  if (!role) return false
  if (role === 'ADMIN' || role === 'BOTH') return true   // BUG: ADMIN/BOTH bypass everything
  if (requirement === 'worker') return role === 'WORKER'
  return role === 'BUSINESS'
}

// AFTER (routing.ts)
export function canRoleAccessPath(role, path) {
  const requirement = getRouteRequirement(path)
  if (!requirement) return true
  if (!role) return false
  if (requirement === 'admin') return role === 'ADMIN'   // strict — ADMIN-only (T-06-06)
  if (role === 'ADMIN' || role === 'BOTH') return true   // cross-access for non-admin routes
  if (requirement === 'worker') return role === 'WORKER'
  return role === 'BUSINESS'
}
```

### getDefaultPathForRole — before vs after

```typescript
// BEFORE
export function getDefaultPathForRole(role) {
  if (role === 'BUSINESS' || role === 'ADMIN') return '/biz'  // BUG: ADMIN→/biz
  if (role === 'WORKER' || role === 'BOTH') return '/home'
  return '/role-select'
}

// AFTER
export function getDefaultPathForRole(role) {
  if (role === 'ADMIN') return '/admin'   // ADMIN first — correct default
  if (role === 'BUSINESS') return '/biz'
  if (role === 'WORKER' || role === 'BOTH') return '/home'
  return '/role-select'
}
```

### Middleware patch

```typescript
// BEFORE: landing redirect
if (user && path === '/') {
  const url = request.nextUrl.clone()
  const r = user.app_metadata?.role as AppRole | undefined
  url.pathname = r === 'BUSINESS' || r === 'BOTH' ? '/biz' : '/home'
  return NextResponse.redirect(url)
}

// AFTER: landing redirect (ADMIN branch added first)
if (user && path === '/') {
  const url = request.nextUrl.clone()
  const r = user.app_metadata?.role as AppRole | undefined
  if (r === 'ADMIN') url.pathname = '/admin'
  else if (r === 'BUSINESS' || r === 'BOTH') url.pathname = '/biz'
  else url.pathname = '/home'
  return NextResponse.redirect(url)
}

// AFTER: admin gate (added BEFORE worker/business gates)
if (requirement === 'admin' && (!role || !canRoleAccessPath(role, path))) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('error', 'admin_required')
  return NextResponse.redirect(url)
}
```

## Test Results

- `tests/auth/admin-routing.test.ts` — 6/6 GREEN (flipped from RED as required by Wave 0)
- `tests/auth/` full suite — 27 test files, 37 tests, all GREEN
- Zero regressions in Phase 4/5 auth-dependent flows

## Evidence Mapping

| Behavior | Evidence |
|----------|----------|
| getDefaultPathForRole('ADMIN') === '/admin' | vitest unit test (admin-routing.test.ts) |
| canRoleAccessPath('ADMIN', '/admin') === true | vitest unit test |
| canRoleAccessPath('BUSINESS', '/admin') === false | vitest unit test |
| canRoleAccessPath('WORKER', '/admin') === false | vitest unit test |
| canRoleAccessPath('ADMIN', '/biz') === true | vitest unit test |
| canRoleAccessPath('ADMIN', '/home') === true | vitest unit test |
| requireAdmin() exported and typed | grep + tsc --noEmit (no new errors) |
| Middleware root redirect for ADMIN → /admin | Human UAT Scenario 1 (middleware runs in Next.js request lifecycle, not exercised by vitest) |
| Middleware /admin gate enforcement | Human UAT Scenario 1 (same reason) |

Middleware-level behaviors are explicitly deferred to Human UAT Scenario 1. This is an honest evidence mapping — vitest cannot exercise Next.js middleware request lifecycle.

## Threat Model Coverage

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-06-05 | Two-layer gate: middleware check (advisory) + requireAdmin() DB re-verify (authoritative) |
| T-06-06 | `requirement === 'admin'` checked BEFORE `role === 'ADMIN' \|\| 'BOTH'` generic branch — BOTH cannot access /admin |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No new network endpoints or auth paths introduced beyond what the plan specifies.

## Self-Check: PASSED

- src/lib/auth/routing.ts — modified, committed 220d233
- src/lib/dal.ts — modified, committed e510f6b
- src/lib/supabase/middleware.ts — modified, committed 622202f
- All commit hashes verified in git log
