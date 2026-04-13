---
phase: 06-admin-backoffice
plan: 03
type: execute
wave: 3
depends_on: [02]
files_modified:
  - src/lib/auth/routing.ts
  - src/lib/dal.ts
  - src/lib/supabase/middleware.ts
autonomous: true
requirements: [D-27, D-28, D-29]
must_haves:
  truths:
    - "getDefaultPathForRole returns '/admin' for ADMIN (unit-tested in tests/auth/admin-routing.test.ts); middleware root-redirect for ADMIN → /admin is covered by Human UAT Scenario 1 (middleware is not exercised by vitest)"
    - "canRoleAccessPath('ADMIN', '/admin') === true AND canRoleAccessPath(non-ADMIN, '/admin') === false (unit-tested)"
    - "ADMIN can still access /biz and /home paths — cross-role override preserved (unit-tested)"
    - "requireAdmin() DAL helper redirects non-ADMIN sessions to /login?error=admin_required (tsc-verified; runtime behavior exercised via Human UAT Scenario 1)"
    - "tests/auth/admin-routing.test.ts flips from RED to GREEN without any test changes"
    - "Phase 5 + Phase 4 auth tests remain green"
  artifacts:
    - path: "src/lib/auth/routing.ts"
      provides: "ADMIN branch in canRoleAccessPath + getDefaultPathForRole + getRouteRequirement"
      contains: "/admin"
    - path: "src/lib/dal.ts"
      provides: "requireAdmin() helper"
      exports: ["requireAdmin"]
    - path: "src/lib/supabase/middleware.ts"
      provides: "/admin gate + landing page redirect branch for ADMIN (covered by Human UAT Scenario 1)"
  key_links:
    - from: "src/lib/supabase/middleware.ts"
      to: "src/lib/auth/routing.ts"
      via: "canRoleAccessPath + getRouteRequirement"
      pattern: "requirement === 'admin'"
    - from: "src/lib/dal.ts"
      to: "src/lib/supabase/server.ts + prisma"
      via: "verifySession pattern reuse"
      pattern: "requireAdmin"
---

<objective>
Three surgical files get ADMIN-aware. This wave unblocks Wave 4 (admin UI) by guaranteeing `/admin` routes are properly role-gated at every layer: middleware (fast), layout (trusted DAL), and client redirect (login landing).

Purpose: Phase 2-4 already built the three-layer gate for WORKER and BUSINESS. Phase 6 adds a single ADMIN branch to each layer. Zero new patterns.
Output: 3 files modified, `tests/auth/admin-routing.test.ts` flips RED→GREEN. Middleware-specific behaviors (root redirect, /admin gate enforcement) are covered by Human UAT Scenario 1 because middleware runs inside Next.js request lifecycle and is not exercised by vitest.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@src/lib/auth/routing.ts
@src/lib/dal.ts
@src/lib/supabase/middleware.ts
@tests/auth/admin-routing.test.ts
</context>

<interfaces>
Existing patterns — match verbatim:
```typescript
// src/lib/dal.ts existing
export const requireBusiness = cache(async (applicationId?: string) => { ... })
export const requireWorker = cache(async () => { ... })

// Phase 6 addition — mirror of requireBusiness minus the test-mode resolver
export const requireAdmin = cache(async () => { ... })
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Routing patches — add ADMIN branch to 3 functions</name>
  <files>src/lib/auth/routing.ts</files>
  <behavior>
    After changes, the admin-routing.test.ts assertions ALL pass:
    - getDefaultPathForRole('ADMIN') === '/admin'
    - canRoleAccessPath('ADMIN', '/admin') === true
    - canRoleAccessPath('BUSINESS', '/admin') === false
    - canRoleAccessPath('WORKER', '/admin') === false
    - canRoleAccessPath('ADMIN', '/biz') === true (retained)
    - canRoleAccessPath('ADMIN', '/home') === true (retained)

    Existing WORKER/BUSINESS/BOTH tests unchanged.
  </behavior>
  <action>
    Apply exactly these edits to `src/lib/auth/routing.ts`:

    1. Add `ADMIN_PREFIXES` constant: `const ADMIN_PREFIXES = ['/admin']`

    2. Extend `RouteRequirement` type: `type RouteRequirement = 'worker' | 'business' | 'admin' | null`

    3. In `getRouteRequirement(path)`, add as FIRST check (before worker/business):
       ```typescript
       if (ADMIN_PREFIXES.some((p) => startsWithSegment(path, p))) return 'admin'
       ```

    4. Rewrite `canRoleAccessPath` to match Research §Example 2:
       ```typescript
       export function canRoleAccessPath(role, path) {
         const requirement = getRouteRequirement(path)
         if (!requirement) return true
         if (!role) return false
         if (requirement === 'admin') return role === 'ADMIN'   // strict — ADMIN-only
         if (role === 'ADMIN' || role === 'BOTH') return true
         if (requirement === 'worker') return role === 'WORKER'
         return role === 'BUSINESS'
       }
       ```

    5. Rewrite `getDefaultPathForRole` to put ADMIN FIRST (per Pitfall 1 — current code routes ADMIN to /biz):
       ```typescript
       export function getDefaultPathForRole(role) {
         if (role === 'ADMIN') return '/admin'
         if (role === 'BUSINESS') return '/biz'
         if (role === 'WORKER' || role === 'BOTH') return '/home'
         return '/role-select'
       }
       ```
  </action>
  <verify>
    <automated>npx vitest run tests/auth/admin-routing.test.ts</automated>
  </verify>
  <done>All 6 assertions in admin-routing.test.ts pass. Existing routing tests (if any) still pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: requireAdmin() DAL helper</name>
  <files>src/lib/dal.ts</files>
  <behavior>
    - `requireAdmin()` returns SessionUser when caller's role is ADMIN
    - Redirects to `/login?error=admin_required` when role is anything else
    - Wrapped in `React.cache` (deduplicates within one request)
    - Does NOT include a test-mode resolver — Phase 6 admin tests use `createTestAdmin` fixture + real JWT-less path via the verifySession flow. If Phase 6 tests need bypass, add a minimal IS_TEST_MODE branch that picks the first role='ADMIN' user (mirror resolveTestBusinessSession simplified).
  </behavior>
  <action>
    Append after `requireBusiness` export:

    ```typescript
    export const requireAdmin = cache(async () => {
      if (IS_TEST_MODE) {
        const admin = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, email: true, role: true },
        })
        if (!admin) {
          throw new Error(
            '[dal:test] requireAdmin: no ADMIN users in DB — call createTestAdmin() first',
          )
        }
        return { id: admin.id, email: admin.email, role: admin.role as 'ADMIN' }
      }
      const session = await verifySession()
      if (session.role !== 'ADMIN') {
        redirect('/login?error=admin_required')
      }
      return session
    })
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -n "requireAdmin" src/lib/dal.ts</automated>
  </verify>
  <done>Helper exported, tsc green, matches existing `requireBusiness` structure.</done>
</task>

<task type="auto">
  <name>Task 3: Middleware — /admin gate + landing redirect for ADMIN</name>
  <files>src/lib/supabase/middleware.ts</files>
  <action>
    Two edits to `src/lib/supabase/middleware.ts`:

    1. Update the `path === '/'` landing redirect (currently sends BUSINESS/BOTH to /biz, everyone else to /home):
       ```typescript
       if (user && path === '/') {
         const url = request.nextUrl.clone()
         const r = user.app_metadata?.role as AppRole | undefined
         if (r === 'ADMIN') url.pathname = '/admin'
         else if (r === 'BUSINESS' || r === 'BOTH') url.pathname = '/biz'
         else url.pathname = '/home'
         return NextResponse.redirect(url)
       }
       ```

    2. Add an admin requirement block AFTER the existing business block:
       ```typescript
       if (requirement === 'admin' && (!role || !canRoleAccessPath(role, path))) {
         const url = request.nextUrl.clone()
         url.pathname = '/login'
         url.searchParams.set('error', 'admin_required')
         return NextResponse.redirect(url)
       }
       ```
       Place this BEFORE the return — it terminates the middleware on ADMIN gate failure.

    Do not modify anything else in this file. Preserve all existing worker/business/auth behavior. Middleware behavior itself is not vitest-covered — Human UAT Scenario 1 validates the `/` landing redirect and the `/admin` gate at runtime.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run tests/auth</automated>
  </verify>
  <done>
    - Middleware compiles
    - tests/auth directory stays fully green
    - Middleware runtime behavior (root redirect, /admin gate) deferred to Human UAT Scenario 1 — noted in SUMMARY so the checker can verify honest evidence mapping.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cookie → middleware → layout | JWT claim in `app_metadata.role` is advisory; DB lookup in `verifySession`/`requireAdmin` is authoritative |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-05 | Spoofing | `app_metadata.role` in middleware | mitigate | Middleware check is defense-in-depth; `requireAdmin()` in layout re-verifies against `public.users.role` via Prisma (DB-trusted). Two-layer gate. |
| T-06-06 | Elevation of Privilege | canRoleAccessPath ordering | mitigate | `requirement === 'admin'` checked BEFORE the `role === 'ADMIN' || 'BOTH' returns true` generic branch — prevents BOTH accidentally accessing /admin |
</threat_model>

<verification>
- `npx vitest run tests/auth` — all green (including admin-routing flip)
- `npx vitest run tests/applications tests/settlements tests/reviews` — Phase 4/5 auth-dependent flows still green
- Grep `requireAdmin` in `src/lib/dal.ts` returns the new export
- Middleware runtime behavior verified via Human UAT Scenario 1 (outside vitest scope)
</verification>

<success_criteria>
- admin-routing.test.ts GREEN (pure-function coverage)
- `requireAdmin` exported and typed
- Middleware gates /admin (runtime behavior deferred to Human UAT Scenario 1)
- Zero regressions
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-03-SUMMARY.md` — include the final diff of `canRoleAccessPath` and `getDefaultPathForRole` and the middleware patch in fenced code blocks. Explicitly note that middleware-level behavior (root landing redirect, /admin gate) is covered by Human UAT Scenario 1, not vitest, so the evidence mapping is honest.
</output>
