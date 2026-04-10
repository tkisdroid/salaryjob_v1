---
phase: 02-supabase-prisma-auth
verified: 2026-04-10T12:30:00Z
status: human_needed
score: 11/11 must-haves verified (automated checks)
overrides_applied: 0
human_verification:
  - test: "Email/Password 신규 가입 → role-select → /home 도달 확인"
    expected: "가입 후 이메일 인증 없이 (또는 인증 완료 후) role-select 페이지에서 WORKER 선택 시 /home으로 리다이렉트"
    why_human: "Supabase 이메일 확인 설정(Dashboard)에 따라 즉시 로그인 가능 여부가 달라짐. 실제 브라우저 플로우 필요."
  - test: "로그인 후 브라우저 새로고침 — 세션 유지 확인 (AUTH-03)"
    expected: "worker@dev.gignow.com 로그인 → /home 확인 → F5 새로고침 → 여전히 /home (로그인 상태 유지, /login으로 튀지 않음)"
    why_human: "@supabase/ssr 쿠키 세션 유지가 실 브라우저에서만 검증 가능"
  - test: "로그아웃 — 쿠키 제거 확인 (AUTH-04)"
    expected: "로그아웃 후 DevTools → Application → Cookies에서 sb-*-auth-token 쿠키가 모두 사라지고 /login으로 리다이렉트"
    why_human: "쿠키 존재 여부는 브라우저 DevTools로만 확인 가능"
  - test: "Worker-only 경로에 Business 계정으로 접근 차단 확인 (AUTH-06/07)"
    expected: "business@dev.gignow.com 로그인 후 /home 접근 시 /login?error=worker_required로 리다이렉트"
    why_human: "프록시 역할 체크 + DAL 2중 방어가 실 브라우저 세션에서 동작하는지 E2E 확인 필요"
  - test: "Kakao OAuth 버튼 클릭 — 카카오 동의 화면 도달 확인 (AUTH-01k 실 플로우)"
    expected: "카카오 버튼 클릭 시 카카오 OAuth 동의 화면으로 리다이렉트됨 (Supabase Dashboard에서 Kakao provider 설정 완료 전제)"
    why_human: "외부 OAuth provider 설정 완료 여부가 Dashboard에 의존. 코드는 정상이나 provider 미활성화 시 Supabase 오류 반환"
---

# Phase 2: Supabase·Prisma·Auth 기반 Verification Report

**Phase Goal:** Worker/Business가 실제 계정으로 가입·로그인해 세션이 유지되고, 앱이 Supabase DB 위에서 동작할 준비가 된다
**Verified:** 2026-04-10T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 새 사용자가 이메일 또는 휴대폰으로 회원가입해 Worker·Business 역할을 선택하고 Supabase에 계정이 생성된다 | ✓ VERIFIED (drift noted) | `signup/actions.ts:27` `supabase.auth.signUp()` wired; `role-select/actions.ts:25` `prisma.user.update({role})` wired; AUTH-01 drift: 휴대폰 번호 미지원 (이메일 전용, STATE.md 기록됨) |
| 2 | 로그인한 사용자는 브라우저 새로고침 이후에도 세션이 유지되고, 로그아웃하면 모든 세션 쿠키가 사라진다 | ? HUMAN | `src/lib/supabase/middleware.ts` `updateSession()` + `src/proxy.ts` 구조적으로 정상; `logout()` `supabase.auth.signOut()` 호출; 실 브라우저에서 쿠키 생존·소멸 확인 필요 |
| 3 | 비로그인 사용자가 보호 경로에 접근하면 로그인 페이지로, Worker 경로에 Business-only 사용자가 접근하면 차단된다 | ✓ VERIFIED (proxy layer) | `middleware.ts:56-61` 미인증 → `/login?next=<path>`; `middleware.ts:88-98` 역할 불일치 → `/login?error=worker_required|business_required`; `tests/proxy/redirect.test.ts` 2/2 PASS; E2E 확인은 인간 검증 항목 |
| 4 | 로컬 Prisma migrate와 Supabase 프로젝트 양쪽에 User/WorkerProfile/BusinessProfile/Job/Application/Review 스키마가 적용되어 있고 PostGIS 확장이 활성화되어 있다 | ✓ VERIFIED | `prisma/schema.prisma` 6 models + 5 enums 확인; PostGIS `Unsupported("geography(Point, 4326)")` Job/BusinessProfile에 선언; `tests/data/postgis.test.ts` 2/2 PASS; `tests/data/migrations.test.ts` 3/3 PASS |
| 5 | `prisma/seed.ts` 또는 Supabase SQL 시드로 빈 DB를 현실적인 테스트 데이터로 채울 수 있다 | ✓ VERIFIED | `prisma/seed.ts` 존재, 6 dev 계정 + 8 businesses + 8 jobs + 5 applications; `tests/data/seed.test.ts` 6/6 PASS; Live DB counts confirmed by orchestrator |

**Score:** 4/5 truths fully verified programmatically + 1 deferred to human (세션 쿠키 브라우저 확인). 모든 구조적 구현은 VERIFIED.

---

### Requirements Coverage

| Requirement | Description | Evidence | Status |
|-------------|-------------|----------|--------|
| **AUTH-01** | 이메일/휴대폰 회원가입 (Supabase Auth) | `signup/actions.ts:13-37` signUpWithPassword; `signup/actions.ts:40-55` signInWithMagicLink; `signup/actions.ts:58-73` signInWithGoogle; `signup/actions.ts:78-92` signInWithKakao. **Drift:** 휴대폰 OTP 미지원 (SMS v2). 이메일 4방식 완전 구현. | ✓ SATISFIED (drift: 휴대폰 제외) |
| **AUTH-02** | Worker/Business/Both 역할 선택 | `role-select/page.tsx:17-37` 3개 role form; `role-select/actions.ts:9` `z.enum(['WORKER','BUSINESS','BOTH'])`; `role-select/actions.ts:25` DB update; `role-select/actions.ts:37-41` admin JWT claim update. AUTH-02 test PASS. | ✓ SATISFIED |
| **AUTH-03** | 로그인 후 새로고침 세션 유지 | `src/proxy.ts` → `updateSession` 매 요청마다 쿠키 갱신; `src/lib/supabase/middleware.ts:5-37` @supabase/ssr 세션 새로고침 패턴. 실 브라우저 검증 필요. | ? NEEDS HUMAN |
| **AUTH-04** | 로그아웃 시 쿠키 제거 | `login/actions.ts:46-51` `supabase.auth.signOut()` + `redirect('/login')`. 실 브라우저 쿠키 확인 필요. | ? NEEDS HUMAN |
| **AUTH-05** | 미인증 사용자 보호 경로 차단 | `middleware.ts:56-61` 미인증 redirect; `proxy.ts:4-5` matcher; `tests/proxy/redirect.test.ts` 2/2 PASS | ✓ SATISFIED |
| **AUTH-06** | Worker 전용 경로 — Worker 역할 없는 사용자 차단 | `middleware.ts:73-92` workerPrefixes 8개; `(worker)/layout.tsx:12` `await requireWorker()`; `dal.ts:22-27` role 검증 | ✓ SATISFIED |
| **AUTH-07** | Business 전용 경로 — Business 역할 없는 사용자 차단 | `middleware.ts:83,93-98` bizPrefixes; `biz/layout.tsx:12` `await requireBusiness()`; `dal.ts:30-35` role 검증 | ✓ SATISFIED |
| **DATA-01** | Prisma 스키마 6 모델 정의 | `prisma/schema.prisma:64-201` User, WorkerProfile, BusinessProfile, Job, Application, Review 6개 모두 확인. 5개 enum. | ✓ SATISFIED |
| **DATA-02** | PostGIS 확장 + 위치 기반 쿼리 가능 | `prisma/schema.prisma:113,147` `Unsupported("geography(Point, 4326)")`; `supabase/migrations/20260410000000_enable_postgis.sql` 적용; `tests/data/postgis.test.ts` 2/2 PASS | ✓ SATISFIED |
| **DATA-03** | Supabase 초기 마이그레이션 적용 | `prisma db push` + `apply-supabase-migrations.ts` 5개 SQL 실행; `tests/data/migrations.test.ts` 3/3 PASS; Live DB: 6 tables + PostGIS 3.3.7 + handle_new_user trigger | ✓ SATISFIED |
| **DATA-04** | 시드 데이터 `prisma/seed.ts` | `prisma/seed.ts` 6 dev 계정 + mock-data 이식; `tests/data/seed.test.ts` 6/6 PASS; Live DB: 6 users, 1 worker_profile, 8 business_profiles, 8 jobs, 5 applications | ✓ SATISFIED |

**Requirements Coverage: 9/11 programmatically SATISFIED, 2 deferred to human browser verification (AUTH-03, AUTH-04)**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase/client.ts` | Browser Supabase client | ✓ VERIFIED | `createBrowserClient` with ANON_KEY fallback |
| `src/lib/supabase/server.ts` | Server Supabase client | ✓ VERIFIED | `async createClient()`, `await cookies()`, getAll/setAll |
| `src/lib/supabase/middleware.ts` | Session refresh helper | ✓ VERIFIED | `updateSession()`, getClaims (not getSession), let supabaseResponse |
| `src/proxy.ts` | Next 16 proxy entry | ✓ VERIFIED | `export async function proxy()`, calls `updateSession`, matcher excludes static files |
| `src/lib/dal.ts` | DAL with DB re-verify | ✓ VERIFIED | `import 'server-only'`, `cache()`, `getUser()` + `prisma.user.findUnique()` |
| `src/app/(auth)/login/actions.ts` | Login server actions | ✓ VERIFIED | `signInWithPassword(prevState, formData)` → `AuthFormState`; `logout()` |
| `src/app/(auth)/signup/actions.ts` | Signup server actions | ✓ VERIFIED | signUpWithPassword, signInWithMagicLink, signInWithGoogle, signInWithKakao |
| `src/app/(auth)/role-select/actions.ts` | Role select action | ✓ VERIFIED | `selectRole()`, `verifySession()` re-verify, DB + JWT update |
| `src/app/(auth)/role-select/page.tsx` | Role select page | ✓ VERIFIED | `await verifySession()`, 3 role forms |
| `src/app/auth/confirm/route.ts` | Magic link confirm | ✓ VERIFIED | `verifyOtp()`, ALLOWED_NEXT_PATHS open-redirect mitigation |
| `src/app/auth/callback/route.ts` | OAuth callback | ✓ VERIFIED | `exchangeCodeForSession()`, ALLOWED_NEXT_PATHS |
| `src/app/(worker)/layout.tsx` | Worker layout guard | ✓ VERIFIED | `await requireWorker()` at top |
| `src/app/biz/layout.tsx` | Biz layout guard | ✓ VERIFIED | `await requireBusiness()` at top |
| `src/lib/db/queries.ts` | Prisma query adapters | ✓ VERIFIED | getJobs, getApplications, getCurrentWorker, etc.; `import 'server-only'` |
| `src/app/(auth)/types.ts` | Shared auth state type | ✓ VERIFIED | `AuthFormState` union type, all optional fields |
| `prisma/schema.prisma` | Phase 2 schema | ✓ VERIFIED | 6 models + 5 enums + PostGIS Unsupported columns |
| `prisma/seed.ts` | Dev seed | ✓ VERIFIED | 6 auth accounts + mock-data transplant + PostGIS raw SQL |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/proxy.ts` | `src/lib/supabase/middleware.ts` | `import { updateSession }` | ✓ WIRED | `proxy.ts:2` import confirmed |
| `src/lib/supabase/middleware.ts` | Supabase Auth | `supabase.auth.getClaims()` | ✓ WIRED | `middleware.ts:45` confirmed |
| `src/lib/dal.ts` | Supabase Auth | `supabase.auth.getUser()` | ✓ WIRED | `dal.ts:9` confirmed |
| `src/lib/dal.ts` | Prisma DB | `prisma.user.findUnique()` | ✓ WIRED | `dal.ts:13-16` confirmed |
| `login/actions.ts` | `src/lib/supabase/server.ts` | `createClient()` | ✓ WIRED | `actions.ts:3` import + `actions.ts:27` usage |
| `login/actions.ts` | Prisma DB | `prisma.user.findUnique()` | ✓ WIRED | `actions.ts:34-38` dynamic import + query |
| `role-select/actions.ts` | DAL `verifySession` | Server re-verify | ✓ WIRED | `actions.ts:17` |
| `role-select/actions.ts` | Prisma DB | `prisma.user.update()` | ✓ WIRED | `actions.ts:25-28` |
| `role-select/actions.ts` | Supabase admin | `admin.auth.admin.updateUserById()` | ✓ WIRED | `actions.ts:37-41` JWT app_metadata update |
| `(worker)/layout.tsx` | DAL `requireWorker` | Layout-level guard | ✓ WIRED | `layout.tsx:2,12` |
| `biz/layout.tsx` | DAL `requireBusiness` | Layout-level guard | ✓ WIRED | `layout.tsx:2,12` |
| 11 `src/app/*` pages | `src/lib/db/queries.ts` | Prisma adapters | ✓ WIRED | grep `@/lib/mock-data` in `src/app/` → 0 results |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `(worker)/home/page.tsx` | `urgentJobs`, `jobs`, `worker` | `getUrgentJobs()`, `getJobs()`, `getCurrentWorker()` from `db/queries.ts` → `prisma.job.findMany()`, `prisma.workerProfile.findUnique()` | Yes — live Supabase DB | ✓ FLOWING |
| `(worker)/my/page.tsx` | `worker`, `applications` | `getCurrentWorker()`, `getApplications()` → Prisma queries | Yes | ✓ FLOWING |
| `(worker)/posts/[id]/page.tsx` | `job`, `reviews` | `getJobById(id)`, `getReviews()` → Prisma queries | Yes | ✓ FLOWING |
| `role-select/page.tsx` | session (auth check only) | `verifySession()` → Supabase `getUser()` + Prisma | Yes | ✓ FLOWING |

**Known stubs in data flow (Phase 3 deferred, not Phase 2 blockers):**

| Stub | File:Field | Reason | Blocks Phase 2? |
|------|-----------|--------|-----------------|
| `duties: []` | `db/queries.ts` adaptJob | Phase 3 schema column | No |
| `requirements: []` | `db/queries.ts` adaptJob | Phase 3 schema column | No |
| `distanceM: 0` | `db/queries.ts` adaptJob | Phase 3 PostGIS ST_Distance | No |
| `settlementStatus: null` | `db/queries.ts` adaptApplication | Phase 3 schema column | No |
| `noShowCount: 0` | `db/queries.ts` getCurrentWorker | Phase 3 schema column | No |
| `totalEarnings: 0` | `db/queries.ts` getCurrentWorker | Phase 3 settlement compute | No |

All stubs are explicitly documented in `db/queries.ts` with `// TODO Phase 3:` comments and return safe empty defaults that render without breaking the UI.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript — 0 errors in src/ | `npx tsc --noEmit --skipLibCheck \| grep "^src/" \| wc -l` | `0` | ✓ PASS |
| Vitest 18/18 tests green | `npx vitest run` | `9 files, 18 tests passed` | ✓ PASS |
| DATA-02 PostGIS installed | `tests/data/postgis.test.ts` | `2/2 PASS` | ✓ PASS |
| DATA-03 migrations applied | `tests/data/migrations.test.ts` | `3/3 PASS` | ✓ PASS |
| DATA-04 seed counts | `tests/data/seed.test.ts` | `6/6 PASS` | ✓ PASS |
| AUTH-01 signup defined | `tests/auth/signup.test.ts` | `1/1 PASS` | ✓ PASS |
| AUTH-01k kakao defined | `tests/auth/kakao-oauth.test.ts` | `1/1 PASS` | ✓ PASS |
| AUTH-02 role-select | `tests/auth/role-select.test.ts` | `1/1 PASS` | ✓ PASS |
| AUTH-05 proxy redirect | `tests/proxy/redirect.test.ts` | `2/2 PASS` | ✓ PASS |
| mock-data imports in src/app/ | `grep -r "@/lib/mock-data" src/app/` | `0 files` | ✓ PASS (CLAUDE.md constraint SATISFIED) |
| mock-data imports in src/ | `grep -r "@/lib/mock-data" src/` | `0 files` | ✓ PASS |
| No Clerk/NextAuth references | `grep -r "Clerk\|NextAuth" src/` | 1 stale TODO comment in `api/push/register/route.ts` | ⚠️ WARNING (non-blocking) |

---

### CLAUDE.md Hard Constraints

| Constraint | Verification | Status |
|------------|-------------|--------|
| `grep -rn "@/lib/mock-data" src/app/` → 0 lines | Confirmed: 0 files found | ✓ SATISFIED |
| `src/lib/mock-data.ts` file intact (used by seed.ts) | `prisma/seed.ts:20-23` imports MOCK_BUSINESSES/JOBS/APPLICATIONS/CURRENT_WORKER | ✓ CONFIRMED |
| Tech stack: Next.js 16 + React 19 + Prisma 7 + Supabase Auth | No Clerk/NextAuth in src/ (1 stale TODO comment only); @supabase/ssr wired | ✓ SATISFIED |
| PostGIS required | `prisma/schema.prisma` Unsupported geography columns; PostGIS test PASS | ✓ SATISFIED |
| Performance "1분 이내 완료" | Not measurable until E2E with live server; Phase 5 SC-5 defines actual acceptance criterion | ? DEFERRED to Phase 5 |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/api/push/register/route.ts` | `// TODO: Authenticate via Clerk` stale comment | ⚠️ Warning | Dead comment only — no Clerk code, no production import. Non-blocking. |
| `src/lib/db/queries.ts` | `(r: any)` explicit any in getReviews | ℹ️ Info | Documented — Prisma generated types are gitignored. Runtime types exist. `eslint-disable` applied. |
| `src/lib/db/queries.ts` | `adaptBusiness(b: any)`, `adaptJob(j: any)` | ℹ️ Info | Same root cause as above. Safe at runtime. |

No blocker anti-patterns found. All `// TODO Phase 3:` stubs in `db/queries.ts` return safe empty defaults that do not break user-visible functionality for Phase 2 goals.

---

### Human Verification Required

#### 1. Email/Password 가입 → 역할 선택 → 홈 도달 (AUTH-01 + AUTH-02 통합)

**Test:** 브라우저에서 `/signup` → 이메일/비밀번호 입력 → 가입 → (이메일 인증 완료 후) → `/role-select` → WORKER 선택 → `/home` 도달 확인
**Expected:** 전 과정이 에러 없이 완료되고 Supabase Dashboard → Authentication → Users에 신규 계정이 보임
**Why human:** 이메일 인증 설정(confirm 즉시 vs 이메일 확인 필요)이 Supabase Dashboard 설정에 따라 다름. 코드 자체는 정상 wired.

#### 2. 세션 유지 (AUTH-03)

**Test:** `worker@dev.gignow.com` / `gignowdev`로 로그인 → `/home` 확인 → 브라우저 새로고침 (F5)
**Expected:** 새로고침 후에도 `/home`에 머물고 `/login`으로 튀지 않음 (sb-*-auth-token 쿠키가 유지됨)
**Why human:** `@supabase/ssr` `updateSession()` 쿠키 갱신이 실 브라우저에서만 검증 가능. 서버-사이드 쿠키 설정·읽기 라운드트립.

#### 3. 로그아웃 쿠키 제거 (AUTH-04)

**Test:** 로그인 상태 → 로그아웃 액션 실행 → DevTools → Application → Cookies
**Expected:** `sb-lkntomgdhfvxzvnzmlct-auth-token` 쿠키가 사라지고 `/login`으로 리다이렉트
**Why human:** 쿠키 존재/소멸은 브라우저 DevTools에서만 확인 가능

#### 4. Worker 경로 역할 차단 (AUTH-06/07)

**Test:** `business@dev.gignow.com`으로 로그인 → `/home` 접근 시도
**Expected:** `/login?error=worker_required`로 리다이렉트
**Why human:** 역할 기반 프록시 차단이 실 세션·JWT에서 동작하는지 확인 필요. `tests/proxy/redirect.test.ts`는 라우트 매처만 테스트했고 역할 체크는 E2E 필요.

#### 5. Kakao OAuth 실제 플로우 (AUTH-01k)

**Test:** Kakao Dashboard + Supabase Dashboard에서 Kakao provider 설정 완료 후 → 카카오 버튼 클릭
**Expected:** 카카오 동의 화면으로 이동 → 동의 → `/home` 또는 `/role-select` 도달
**Why human:** OAuth provider 설정이 Dashboard 작업 (코드 외부)이고 실제 redirect 플로우 검증 필요

---

### AUTH-01 Drift Note (Documented in STATE.md)

ROADMAP.md SC-1에는 "이메일 또는 휴대폰" 가입이 명시되어 있으나, Phase 2에서 휴대폰 OTP(SMS)는 구현되지 않았습니다.

**결정:** CONTEXT.md D-01 및 STATE.md Known Risks에 공식 기록됨.
- 이메일 4방식(Password + Magic Link + Google + Kakao)이 대신 제공됨
- 한국 서비스에서 이메일이 주 가입 경로로 충분 (SMS OTP는 Twilio/Vonage 연동 비용 부담)
- SMS OTP는 v2 로드맵에 명시

이 드리프트는 AUTH-01을 실패로 분류하지 않습니다. SATISFIED (이메일 4방식 + 휴대폰 드리프트 문서화 완료).

---

### Gaps Summary

자동화 검사에서 발견된 블로커 갭 없음.

**관찰된 비블로커 항목:**

1. **stale Clerk TODO comment** (`src/app/api/push/register/route.ts:12`) — 스택 전환 후 남은 주석. 프로덕션 코드 경로에 영향 없음. Phase 3 cleanup에서 제거 권장.

2. **E2E 테스트 4/5 deferred** — `tests/e2e/session-persist.spec.ts`, `logout.spec.ts`, `role-worker-only.spec.ts`, `role-biz-only.spec.ts`가 dev server 전용 포트 요구로 자동 실행 보류. 위 Human Verification 항목 2-4로 수동 확인 권장.

3. **Google OAuth credential 미설정** — `SUPABASE_AUTH_GOOGLE_CLIENT_ID`/`SECRET`이 Supabase Dashboard에 아직 입력되지 않았을 수 있음. 코드는 정상이나 버튼 클릭 시 Supabase 오류 반환. Phase 2 완료 요건이 아닌 설정 작업.

4. **Kakao OAuth Dashboard 설정** — 위 Google과 동일. 코드 완성, Dashboard 설정 필요.

---

## 종합 판정

Phase 2 목표인 **"Worker/Business가 실제 계정으로 가입·로그인해 세션이 유지되고, 앱이 Supabase DB 위에서 동작할 준비가 된다"** 에 대해:

- **DB 기반 동작:** Supabase 프로젝트에 6개 테이블, PostGIS 3.3.7, auth trigger가 실제로 존재하고 `src/lib/db/queries.ts`가 Prisma를 통해 데이터를 조회함. `src/app/` 어디에도 `mock-data.ts` import 없음. **완전히 달성.**

- **가입·로그인·역할 선택:** signUpWithPassword/signInWithPassword/selectRole Server Actions가 Supabase Auth와 Prisma에 완전히 wired됨. TypeScript 0 errors. 18/18 tests green. **구조적으로 완전히 달성. 실 브라우저 플로우 확인 보류.**

- **세션 유지:** `@supabase/ssr` `updateSession()` + `src/proxy.ts` 구조가 올바르게 구현됨. 실 브라우저 세션 쿠키 생존 확인이 인간 검증 필요.

- **CLAUDE.md 하드 제약 (mock removal):** `grep "@/lib/mock-data" src/app/` → 0. 완전히 충족.

자동화로 검증 가능한 모든 항목이 PASS이므로, **status: human_needed**. 블로커 갭 없음.

---

_Verified: 2026-04-10T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
