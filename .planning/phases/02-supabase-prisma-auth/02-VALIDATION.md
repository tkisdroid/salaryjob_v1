---
phase: 2
slug: supabase-prisma-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` §Validation Architecture (lines 1398-1465).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + @testing-library/react + Playwright (NONE currently installed — Wave 0 installs) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` (created in Wave 0) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30s quick / ~2min full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot` (unit + integration, <30s target)
- **After every plan wave:** Run `npx vitest run && npx playwright test` (full suite, <2min target)
- **Before `/gsd-verify-work`:** Full suite must be green + manual smoke of signup→login→refresh→logout for all 6 dev accounts
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Task IDs will be assigned by the planner. This table maps each REQ-ID to its automated verify command. The planner must ensure every task inherits at least one verify from this table via its `<automated>` block.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DATA-01 | Prisma schema has User, WorkerProfile, BusinessProfile, Job, Application, Review models | unit | `npx prisma validate && node -e "const {PrismaClient}=require('./src/generated/prisma/client'); const p=new PrismaClient(); console.log(Object.keys(p).filter(k=>['user','workerProfile','businessProfile','job','application','review'].includes(k)))"` | ❌ W0 | ⬜ pending |
| DATA-02 | PostGIS extension enabled + geography columns present on Job | unit | `npx vitest run tests/data/postgis.test.ts` | ❌ W0 | ⬜ pending |
| DATA-03 | Supabase has all 4 migrations applied (PostGIS, auth trigger, User RLS, Profile RLS) | unit | `npx vitest run tests/data/migrations.test.ts` | ❌ W0 | ⬜ pending |
| DATA-04 | `npx prisma db seed` creates 6 users + 8 businesses + 8 jobs + 5 applications | integration | `npx prisma migrate reset --force --skip-seed && npx prisma db seed && npx vitest run tests/data/seed.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-01 | Email/Password signup creates auth.users + public.users rows | integration | `npx vitest run tests/auth/signup.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-01m | Magic link signup (verifyOtp token flow) | integration | `npx vitest run tests/auth/magic-link.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-01g | Google OAuth `signInWithOAuth` returns valid redirect URL | smoke | `npx vitest run tests/auth/google-oauth.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-01k | Kakao OAuth `signInWithOAuth` returns valid redirect URL | smoke | `npx vitest run tests/auth/kakao-oauth.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-02 | Role selection writes `public.users.role` AND `auth.users.app_metadata.role` | integration | `npx vitest run tests/auth/role-select.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-03 | Browser refresh preserves session | E2E | `npx playwright test tests/e2e/session-persist.spec.ts` | ❌ W0 | ⬜ pending |
| AUTH-04 | Logout clears all `sb-*-auth-token` cookies | E2E | `npx playwright test tests/e2e/logout.spec.ts` | ❌ W0 | ⬜ pending |
| AUTH-05 | Unauthenticated request to protected route → /login redirect | E2E + unit | `npx playwright test tests/e2e/protected-redirect.spec.ts && npx vitest run tests/proxy/redirect.test.ts` | ❌ W0 | ⬜ pending |
| AUTH-06 | Worker-only path blocks BUSINESS user (login as business+test → /my/profile → redirect) | E2E | `npx playwright test tests/e2e/role-worker-only.spec.ts` | ❌ W0 | ⬜ pending |
| AUTH-07 | Business-only path blocks WORKER user (login as worker+test → /biz/posts → redirect) | E2E | `npx playwright test tests/e2e/role-biz-only.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is dedicated to test infrastructure. Must complete BEFORE any Wave 1 schema work.

- [ ] Install testing stack: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test && npx playwright install chromium`
- [ ] `vitest.config.ts` (jsdom env for React tests, node env for DB tests — use `environmentMatchGlobs`)
- [ ] `tests/setup.ts` (`@testing-library/jest-dom` matchers import)
- [ ] `playwright.config.ts` (baseURL `http://localhost:3000`, chromium only, `saveStorageState` reuse for authed tests)
- [ ] `package.json` scripts: `"test": "vitest run"`, `"test:e2e": "playwright test"`, `"test:watch": "vitest"`
- [ ] `tests/data/postgis.test.ts` — asserts `SELECT PostGIS_Version()` non-null + `jobs.location` is geography type via `SELECT pg_typeof(location)`
- [ ] `tests/data/migrations.test.ts` — asserts `supabase_migrations.schema_migrations` ≥ 4, asserts `users`/`worker_profiles`/`business_profiles` tables exist with RLS enabled (`pg_tables.rowsecurity = true`)
- [ ] `tests/data/seed.test.ts` — post-seed row counts match D-04 expectations (6 users, 8 businesses, 8 jobs, 5 applications)
- [ ] `tests/auth/signup.test.ts` — integration against dev Supabase project; asserts trigger copies row to public.users within 100ms
- [ ] `tests/auth/magic-link.test.ts` — mock Supabase auth or inbucket test mailbox
- [ ] `tests/auth/google-oauth.test.ts` — asserts `data.url` starts with `https://accounts.google.com/o/oauth2/v2/auth?`
- [ ] `tests/auth/kakao-oauth.test.ts` — asserts `data.url` starts with `https://kauth.kakao.com/oauth/authorize?` (in Kakao wave)
- [ ] `tests/auth/role-select.test.ts` — asserts both `public.users.role` AND `auth.users.app_metadata.role` updated
- [ ] `tests/proxy/redirect.test.ts` — uses `next/experimental/testing/server.unstable_doesProxyMatch`
- [ ] `tests/e2e/session-persist.spec.ts`
- [ ] `tests/e2e/logout.spec.ts`
- [ ] `tests/e2e/protected-redirect.spec.ts`
- [ ] `tests/e2e/role-worker-only.spec.ts`
- [ ] `tests/e2e/role-biz-only.spec.ts`
- [ ] `tests/helpers/test-users.ts` — login helpers for the 6 dev accounts with `storageState` reuse

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email deliverability for Magic Link in real inbox | AUTH-01m | Supabase uses real SMTP; cannot assert delivery to Gmail/Naver/Kakao inbox in CI | During Phase 2 DoD: send magic link to personal Gmail, click link, verify redirect to /home |
| Google OAuth end-to-end with real Google account | AUTH-01g | Google CAPTCHA + consent screen cannot be scripted | Sign in with Google on `worker+test` — verify profile created + role assignment flow works |
| Kakao OAuth end-to-end with real Kakao account | AUTH-01k | Kakao Developer console + Korean account required | Sign in with Kakao — verify identical flow to Google |
| All 6 seed accounts smoke test | DATA-04, AUTH-01..04 | Composite check before phase sign-off | Manually log in as each of 6 dev accounts, verify correct role-gated landing page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (no `vitest` without `run`, no `playwright test --ui`)
- [ ] Feedback latency < 30s for quick runs
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
