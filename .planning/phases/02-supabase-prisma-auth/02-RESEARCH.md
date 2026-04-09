# Phase 2: Supabase·Prisma·Auth 기반 - Research

**Researched:** 2026-04-10
**Domain:** Next.js 16 + React 19 + Prisma 7.5 + Supabase (Auth + Postgres + PostGIS)
**Confidence:** HIGH (모든 핵심 주장은 로컬 `node_modules/next/dist/docs/`의 Next.js 16 공식 문서, `npm view`의 레지스트리 버전 조회, `@supabase/ssr@0.10.2`의 실제 TypeScript 정의, 그리고 `supabase/supabase` GitHub master의 Next.js 공식 예제로 교차 검증됨)

## Summary

Phase 2는 인프라 wire-up — 새 UI 없음. 기존 Phase 1 mock UI 위에 (1) 새 Prisma 7 스키마 (6 models + 5 enums, legacy는 `.legacy.txt`로 보존), (2) `@supabase/ssr@0.10.2` 3-file 패턴 (`client.ts` / `server.ts` / `proxy.ts` 헬퍼), (3) `src/proxy.ts` (Next 16 proxy 파일), (4) 5개 SQL 마이그레이션 (PostGIS 확장 + auth 트리거 + User/WorkerProfile/BusinessProfile RLS), (5) `prisma/seed.ts` (mock-data.ts → DB 이식, 6 dev 계정) 을 얹는다.

**결정적인 새 사실 (리서치 중 발견 — Planner가 반드시 반영):**
1. **Kakao는 Supabase Auth의 *내장* provider** — CONTEXT.md D-01에서 "Custom OIDC가 필요함"으로 가정했지만 **사실이 아니다**. Kakao는 `signInWithOAuth({ provider: 'kakao' })` 한 줄로 동작한다. Phase 2 Kakao 계획을 "Supabase Dashboard에서 Kakao 토글 + Kakao Developers에서 REST API key/secret 발급"으로 단순화해야 함.
2. **Next.js 16 공식 파일명은 `proxy.ts` 확정** — Supabase 및 Vercel이 모두 `examples/with-supabase` / `examples/auth/nextjs`에서 `proxy.ts`를 사용 중. CONTEXT.md D-06 정확.
3. **`@supabase/ssr@0.10.2` API는 `getAll`/`setAll`** — 구 `get`/`set`/`remove`는 deprecated. 잘못 구현하면 "random logouts" 발생 (공식 타입 정의 인용).
4. **`supabase.auth.getClaims()`가 현재 권장 API** — 구 `getSession()`/`getUser()`가 아님. Proxy helper에서 "Do not run code between createServerClient and getClaims()" 경고 존재.
5. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 신 표준 key 이름** — 구 `NEXT_PUBLIC_SUPABASE_ANON_KEY`도 동작하지만 Supabase는 `sb_publishable_...` 형식의 publishable key로 이전 중. CONTEXT.md D-07은 `ANON_KEY`로 명시되어 있음 → Phase 2는 신 이름을 쓰되 구 이름도 backward-compat로 지원.
6. **Prisma 7 자동 시딩 제거** — `prisma migrate dev`/`migrate reset` 시 자동 시드 실행 없음. `npx prisma db seed` 명시 실행만 가능. seed 설정도 `package.json` → `prisma.config.ts` `migrations.seed`로 이동.
7. **Prisma 7도 PostGIS geography 네이티브 타입 없음** — `Unsupported("geography(Point, 4326)")?` 사용 + 공간 인덱스는 raw SQL 마이그레이션. (이전 WebFetch 결과 중 "네이티브 지원" 주장은 LLM 환각으로 확인됨 — 공식 schema reference와 교차검증.)
8. **Supabase Shared Pooler는 Supavisor** (pgBouncer 아님). 6543 포트는 transaction mode로 prepared statements 미지원 → Prisma 연결 시 `?pgbouncer=true` 반드시 포함. `prisma migrate dev`는 **반드시 5432 direct URL 사용**.

**Primary recommendation:** Phase 2 실행은 Wave 순서로 진행해야 한다 — Wave 0 (Prisma 스키마 재설계 + test harness) → Wave 1 (Supabase 프로젝트 + 마이그레이션 + 트리거) → Wave 2 (@supabase/ssr 3-file + proxy.ts + env) → Wave 3 (auth 페이지 wire-up + auth/confirm route) → Wave 4 (seed.ts + 6 dev 계정 E2E) → Wave 5 (Kakao 추가) → Wave 6 (ARCHITECTURE.md 드리프트 해소). 각 wave 종료 시 해당 REQ-ID가 자동화 가능하게 검증되어야 함.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 | Auth 방식**: Email/Password + Magic Link + Google OAuth가 Phase 2 핵심 3종. **Kakao는 Phase 2 말미에 추가** (단, 리서치 결과 Supabase 내장 provider로 확인됨 — custom OIDC 불필요). Naver/SMS/Apple = v2.
- **D-02 | Prisma schema 축소**: legacy 18KB → `prisma/schema.legacy.prisma.txt`로 이름 변경 보존. 새 schema = **6 models** (User, WorkerProfile, BusinessProfile, Job, Application, Review) + **5 enums** (UserRole, JobCategory, ApplicationStatus, ReviewDirection, BadgeLevel). `EMPLOYER` → `BUSINESS` 리네임. 기타 enum은 Phase 3+ 복귀.
- **D-03 | Migration 하이브리드**: Prisma Migrate = tables/relations/enums SSOT. Supabase SQL migrations = PostGIS + RLS + auth trigger 전용. 적용은 Supabase MCP `create_project` + `apply_migration`. 파일 구조 `prisma/migrations/` + `supabase/migrations/`.
- **D-04 | Seed = mock-data.ts 이식**: `prisma/seed.ts`에 `MOCK_BUSINESSES` 8개, `MOCK_JOBS` 8개, `MOCK_APPLICATIONS` 5개 그대로. 6 dev 계정 `@gignow.dev` 도메인 (worker/worker2/business/business2/both/admin). **`NODE_ENV === 'production'`이면 즉시 throw**.
- **D-05 | RLS 최소화**: User/WorkerProfile/BusinessProfile에만 own-row 정책. Job/Application/Review RLS DISABLED (Phase 3/4/5에서 도입). `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 — 클라이언트 번들 절대 금지.
- **D-06 | Next 16 SSR 패턴**: `@supabase/ssr` 3-file (`src/lib/supabase/client.ts` + `server.ts` + `proxy.ts` 헬퍼) + `src/proxy.ts` 루트 파일 (middleware.ts 아님). 역할 기반 경로 보호는 proxy에서 경로 prefix (`/home`, `/my`, `/biz`) + `user.role` 매칭.
- **D-07 | 환경 변수**: `.env.local` + Vercel Dashboard 양쪽 세팅. 공개 = `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. 서버 = `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pgbouncer), `DIRECT_URL`. OAuth = `SUPABASE_AUTH_GOOGLE_CLIENT_ID/SECRET`, `SUPABASE_AUTH_KAKAO_CLIENT_ID/SECRET`. PR에 `.env.example` 포함 필수.

### Claude's Discretion

- Prisma `prisma-client` vs 기본 `prisma-client-js` generator 선택 (성능 비교로 결정) — **리서치 결론: `prisma-client` (이미 설치됨, `prisma-client-js`는 deprecated)**
- RLS 정책에서 `auth.uid()` / `auth.jwt()` helper 활용 방식 — **리서치 결론: `auth.uid()` 기준, `auth.jwt() ->> 'role'`는 Phase 3 role-based 확장 때 도입**
- 세션 쿠키 이름·수명 — **리서치 결론: Supabase 기본값 유지 (`sb-<project-ref>-auth-token`)**
- Seed 스크립트의 dev 계정 password 생성 방식 — **리서치 결론: 고정 `gignowdev` (환경변수로 override 가능, but 기본값 하드코딩 OK — `.gignow.dev` 도메인과 결합해 dev-only임이 자명)**
- 프로필 이미지 업로드 — **Phase 2 제외 확정 (Phase 3로 이월)**

### Deferred Ideas (OUT OF SCOPE — 건드리지 말 것)

**Phase 3로 이월:** 프로필 이미지 업로드 (GCS vs Supabase Storage 결정 포함), WorkerProfile 고도화 필드 (availability calendar, 자격증 등), BusinessProfile 인증 배지·추가 문서, `src/lib/actions/*.ts` 4개 레거시 스캐폴드 재작성.

**Phase 4로 이월:** 체크인 위치 검증 (PostGIS ST_DWithin), 야간 할증 계산 서버 함수, Application/Job RLS 확장.

**Phase 5로 이월:** Review uniqueness constraint·trigger, Settlement 집계 view, `mock-data.ts` 삭제 + grep 검증 (DATA-05).

**v2 (로드맵 밖):** Naver OAuth, SMS OTP (Twilio/Vonage), Apple Sign-in, 완전한 multi-tenant RLS, Vercel Blob vs Supabase Storage vs GCS 벤치마크.
</user_constraints>

## Project Constraints (from CLAUDE.md / AGENTS.md)

Planner는 다음을 준수해야 한다:

| # | Constraint | Source | Phase 2 Enforcement |
|---|-----------|--------|----------------------|
| C-1 | **"This is NOT the Next.js you know"** — Next.js 16 breaking changes. 모든 API를 `node_modules/next/dist/docs/`에서 확인 후 작성할 것 | `AGENTS.md` | Task action 문구에 "verify against node_modules/next/dist/docs/<file>.md before implementing" 명시 |
| C-2 | **Tech stack 고정**: Next 16 App Router + React 19 + Prisma 7 + Supabase. 변경 시 PROJECT.md 업데이트 필수 | `CLAUDE.md` | 다른 auth lib 권고 금지 (Clerk, NextAuth, Auth.js 제안 금지) |
| C-3 | **PostgreSQL + PostGIS** 필수 | `CLAUDE.md` | DATA-02 requirement과 일치 |
| C-4 | **mock-data.ts는 Phase 2 종료 시점 그대로 존재** — Phase 5에서 제거 | `CLAUDE.md` | Phase 2 plan은 mock-data.ts import를 제거해서는 안 됨. seed에서 *읽기*만 |
| C-5 | **Timee 3축 불변**: 면접 없음 / 당일 근무 / 즉시 정산 — 이를 깨는 기능 설계 금지 | `CLAUDE.md` | Phase 2는 auth 인프라만 — 해당 3축과 직접 충돌 없음 |
| C-6 | **기본 절대경로 `@/` import** | `.planning/codebase/CONVENTIONS.md` | 신규 파일 (`@/lib/supabase/...`) 동일 관례 |
| C-7 | **Server Components 기본**, client는 `'use client'` 명시 | 동일 | `createClient()` from `server.ts`는 async Server Component, `client.ts`는 `'use client'` 파일에서만 |
| C-8 | **GSD workflow 강제**: 파일 변경은 GSD command 통해서만 | `CLAUDE.md` | Phase 2는 `/gsd-execute-phase 2`로 실행 |
| C-9 | **korean 인터페이스 언어** | `.planning/codebase/CONVENTIONS.md` | Auth 페이지 에러 메시지 한국어 유지 (Phase 1 그대로) |
| C-10 | **Vercel plugin knowledge-update**: Fluid Compute 기본, Edge Functions 비권장 | Vercel plugin subagent bootstrap | Proxy 기본 runtime = Node.js (Next 16 공식도 일치). "Do not put client in global env var, create per request" Supabase 경고와 정합 |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AUTH-01** | 사용자는 휴대폰 번호 또는 이메일로 회원가입할 수 있다 | `supabase.auth.signUp({ email, password })` + Magic Link via `signInWithOtp({ email })`. 휴대폰 OTP는 v2로 연기되어 있으므로 Phase 2 실제 범위는 **이메일** 전용 (CONTEXT.md D-01). REQ 설명이 "또는 휴대폰"이지만 locked decision에 따라 email-only 구현 → roadmap/requirements에 drift note 필요 |
| **AUTH-02** | Worker 역할과 Business 역할 중 하나 또는 둘 다 선택 가능 | `UserRole` enum (WORKER, BUSINESS, BOTH, ADMIN) + `role-select` 페이지 (아직 파일 없음 → Phase 2에서 신규 생성). 역할은 signup flow 최종 단계에서 DB `User.role` 컬럼에 저장 |
| **AUTH-03** | 로그인 후 브라우저 새로고침 시 세션 유지 | `@supabase/ssr` updateSession helper + `src/proxy.ts` — `supabase.auth.getClaims()`가 세션 자동 갱신. 공식 경고: "If you remove getClaims() and you use SSR with the Supabase client, your users may be randomly logged out" |
| **AUTH-04** | 로그아웃 시 모든 세션 쿠키 제거 | `supabase.auth.signOut()` in Server Action + `cookies().delete(name)` for any app-specific cookies. Supabase SSR은 `sb-<ref>-auth-token` 쿠키를 자동 제거 |
| **AUTH-05** | 비인증 → 보호 경로 접근 시 로그인 페이지 redirect | `src/proxy.ts` updateSession 로직 — 공식 예제는 `/login`, `/auth`로 시작하지 않는 경로에서 `user === null`이면 redirect(`/login`) |
| **AUTH-06** | Worker 전용 경로 차단 | Proxy에서 `/home`, `/my`, `/explore`, `/schedule`, `/settlements`, `/applications`, `/availability`, `/search`, `/notifications`, `/apply`, `/chat` prefix 매칭 + `claims.app_metadata.role` (또는 DB 조회 없이 JWT claim) 로 검사. **Next 16 data-security 가이드는 "proxy는 optimistic check만, server component/action에서 re-verify"를 강제함** → layout.tsx에서 2차 검증 필수 |
| **AUTH-07** | Business 전용 경로 차단 | 동일 — `/biz` prefix (`biz/posts`, `biz/workers`, `biz/verify`, `biz/settlements`, `biz/chat`, `biz/profile`, `biz/settings`) + 2차 검증 in `src/app/biz/layout.tsx` |
| **DATA-01** | Prisma 스키마에 User, WorkerProfile, BusinessProfile, Job, Application, Review 정의 | CONTEXT.md D-02 + 본 문서 "Prisma Schema — Phase 2" 섹션에 verbatim 제공 |
| **DATA-02** | PostGIS 활성화 + lat/lng 거리 쿼리 가능 | `extensions = [postgis]` (preview feature `postgresqlExtensions` 유지) + Supabase SQL migration `CREATE EXTENSION IF NOT EXISTS postgis;` + `Unsupported("geography(Point, 4326)")?` 컬럼. 공간 인덱스 (`GIST`)는 Phase 4로 연기 (D-05 deferred). **Phase 2는 컬럼 존재 + 확장 활성화만 검증** |
| **DATA-03** | Supabase 프로젝트에 초기 마이그레이션 적용 | Supabase MCP `create_project` → `apply_migration` 4회 (PostGIS enable, auth trigger, User RLS, Profile RLS) + `prisma migrate dev --name init_phase2`로 6 테이블 생성. 순서는 "Migration Execution Order" 섹션 참조 |
| **DATA-04** | 시드 데이터 제공 | `prisma/seed.ts` (tsx 실행) + `prisma.config.ts`의 `migrations.seed` 키 추가 + 6 dev 계정을 Supabase Admin API (`auth.admin.createUser`)로 생성 후 public.User trigger를 통해 자동 복제 |

### Drift note for AUTH-01

REQUIREMENTS.md는 "휴대폰 번호 또는 이메일"로 AUTH-01을 정의했지만, CONTEXT.md D-01 lock은 SMS OTP를 v2로 연기했다. Phase 2는 **이메일 3종** (Password, Magic Link, Google OAuth) + Phase 2 말미 Kakao OAuth로 AUTH-01을 부분 충족한다. 이 drift는 Phase 2 종료 시점 `STATE.md`의 "Known Risks"에 기록되어야 하며, requirements를 재표현할지는 Phase 2 verify 단계에서 결정.
</phase_requirements>

## Standard Stack

### Core (새로 설치할 패키지)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `^0.10.2` | Next.js App Router용 Supabase 클라이언트 (browser/server/proxy) | Supabase 공식. deprecated된 `@supabase/auth-helpers-nextjs`의 후계. 내부 타입 정의 상 `getAll`/`setAll` 패턴 강제. [VERIFIED: npm view @supabase/ssr version → 0.10.2, published 2026-04-09] |
| `@supabase/supabase-js` | `^2.103.0` | 저수준 Supabase JS SDK (auth, realtime, storage, rest) | `@supabase/ssr`의 peer dependency (`^2.102.1` 최소, `2.103.0`이 최신). [VERIFIED: npm view] |
| `tsx` | `^4.20.0` | `prisma/seed.ts` 실행기 (`tsx prisma/seed.ts`) | Prisma 7 `prisma.config.ts`의 `migrations.seed` 키에서 호출. ts-node 대비 빠르고 ESM 네이티브. [CITED: prisma.io docs] |

### Supporting (이미 설치되어 있음 — 그대로 활용)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prisma` | `^7.5.0` | CLI (`migrate`, `generate`, `db seed`, `studio`) | [VERIFIED: `npx prisma --version`] |
| `@prisma/client` | `^7.5.0` | 생성된 타입 안전 클라이언트 (출력: `src/generated/prisma/`) | 이미 설정됨 (`prisma/schema.prisma` generator block) |
| `@prisma/adapter-pg` | `^7.5.0` | node-postgres 드라이버 adapter (Supabase Supavisor pooler 호환) | `src/lib/db/index.ts`에서 이미 `new PrismaPg({ connectionString })`로 사용 중 |
| `pg` | `^8.20.0` | PostgreSQL Node.js 드라이버 | `@prisma/adapter-pg`의 내부 드라이버 |
| `zod` | `^4.3.6` | Signup/login form validation schemas | Next 16 authentication 가이드가 Zod를 공식 권고 |
| `react-hook-form` | `^7.72.0` | Signup 3-step form 상태 관리 | 이미 Phase 1 signup 페이지에서 사용 중 |
| `@hookform/resolvers` | `^5.2.2` | RHF + Zod 통합 | 동일 |
| `dotenv` | `^17.3.1` | prisma.config.ts + seed.ts의 env 로드 | 이미 `prisma.config.ts`에서 `import "dotenv/config"` 중 |

### Alternatives Considered (그리고 거부됨)
| Instead of | Could Use | Tradeoff | Why Rejected |
|------------|-----------|----------|--------------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | 구 패키지, Pages Router 혼용 지원 | **deprecated**. Supabase 공식이 ssr 패키지로 통합 완료 |
| Prisma `prisma-client` generator | `prisma-client-js` (default) | `node_modules` 자동 생성 | **deprecated in Prisma 7**. 현재 repo가 이미 `prisma-client` 사용 중 — 유지 |
| Supabase CLI `db push` | Prisma Migrate | Supabase-native migration 관리 | D-03 locked: Prisma가 SSOT, Supabase CLI는 RLS/확장 전용 |
| Auth.js (NextAuth v5) | `@supabase/ssr` | 다양한 provider 추상화 | **Supabase 단일 벤더 lock-in** (CLAUDE.md 제약). Auth.js는 Supabase Auth와 별도 세션 저장소 — 이중 관리 필요 |
| `pg-postgis-types` (typing) | `Unsupported()` | TypeScript 타입 명시성 | Phase 2에선 geography 컬럼을 읽지 않음 (선언만) → 타입 불필요 |

**Installation command:**
```bash
npm install @supabase/ssr@^0.10.2 @supabase/supabase-js@^2.103.0
npm install --save-dev tsx@^4.20.0
```

**Version verification protocol:**
```bash
npm view @supabase/ssr version time.modified
# Expected: version = '0.10.2', time.modified ≈ 2026-04-09
npm view @supabase/supabase-js version time.modified
# Expected: version = '2.103.0', time.modified ≈ 2026-04-09
npm view @supabase/ssr peerDependencies
# Expected: { '@supabase/supabase-js': '^2.102.1' } — our install satisfies this
```
[VERIFIED: executed during research on 2026-04-10]

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
prisma/
├── schema.prisma                    # 재설계된 6 models + 5 enums (legacy 보존)
├── schema.legacy.prisma.txt         # 기존 18KB scaffold (reference only, 재네이밍)
├── migrations/                      # Prisma 생성 (tables/relations/enums SSOT)
│   └── YYYYMMDDHHMMSS_init_phase2/
│       └── migration.sql
└── seed.ts                          # mock-data.ts 이식 (6 dev accts)

supabase/
├── config.toml                      # `supabase init` 결과 (optional — MCP만 쓴다면 생략 가능)
└── migrations/                      # MCP apply_migration 적용분을 git에도 복제 (audit)
    ├── 20260410000000_enable_postgis.sql
    ├── 20260410000001_auth_trigger_handle_new_user.sql
    ├── 20260410000002_user_rls.sql
    └── 20260410000003_profile_rls.sql

src/
├── proxy.ts                         # 루트 proxy 파일 (Next 16, middleware.ts 아님)
├── lib/
│   ├── db/index.ts                  # 기존 Prisma client (재사용, 변경 없음)
│   └── supabase/
│       ├── client.ts                # createBrowserClient (Client Components용)
│       ├── server.ts                # createServerClient (Server Components + actions)
│       └── proxy.ts                 # updateSession helper (proxy.ts에서 import)
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx             # Supabase signInWithPassword 연결 ('use client')
│   │   │   └── actions.ts           # Server Action: signInWithPassword, signInWithOtp
│   │   ├── signup/
│   │   │   ├── page.tsx             # 기존 3-step flow + Server Action 연결
│   │   │   └── actions.ts           # Server Action: signUp
│   │   └── role-select/
│   │       ├── page.tsx             # 신규 — User.role 저장
│   │       └── actions.ts           # Server Action: updateUserRole
│   ├── auth/
│   │   ├── confirm/
│   │   │   └── route.ts             # Magic Link callback (verifyOtp)
│   │   ├── callback/
│   │   │   └── route.ts             # OAuth callback (exchangeCodeForSession)
│   │   └── error/
│   │       └── page.tsx             # auth 에러 표시
│   └── layout.tsx                   # 변경 없음 (Server Component, Supabase 직접 주입 X)
└── .env.example                     # Phase 2 PR에 포함 필수
```

**Key rule (from Next.js 16 auth guide):** Do NOT check auth in `layout.tsx`. 파일이 부분 재렌더링되지 않아 보안 빈틈 발생. 대신 각 page component나 DAL (`src/lib/dal.ts`) 에서 verify.

### Pattern 1: `@supabase/ssr` 3-file pattern (VERBATIM from Supabase official)

**Source:** `https://github.com/supabase/supabase/tree/master/examples/auth/nextjs/lib/supabase` (fetched 2026-04-10)

**`src/lib/supabase/client.ts`** — Browser/Client Component용:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** — Server Components + Server Actions + Route Handlers용 (async cookies()):
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/proxy.ts`** — Proxy-only session refresh helper (import 대상):
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // GigNow-specific role-based protection
  const path = request.nextUrl.pathname
  const isAuthPublic =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth') ||
    path === '/'

  if (!user && !isAuthPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Role-based optimistic check (re-verify in page/action!)
  const role = user?.app_metadata?.role as
    | 'WORKER'
    | 'BUSINESS'
    | 'BOTH'
    | 'ADMIN'
    | undefined

  const workerPrefixes = [
    '/home',
    '/my',
    '/explore',
    '/schedule',
    '/settlements',
    '/applications',
    '/availability',
    '/search',
    '/notifications',
    '/apply',
    '/chat',
  ]
  const bizPrefixes = ['/biz']

  const needsWorker = workerPrefixes.some((p) => path.startsWith(p))
  const needsBiz = bizPrefixes.some((p) => path.startsWith(p))

  if (needsWorker && role && role !== 'WORKER' && role !== 'BOTH' && role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'worker_required')
    return NextResponse.redirect(url)
  }
  if (needsBiz && role && role !== 'BUSINESS' && role !== 'BOTH' && role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'business_required')
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
```

**`src/proxy.ts`** — 루트 proxy 파일 (Next 16):
```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - any image file extension
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**[CITED: https://github.com/supabase/supabase/blob/master/examples/auth/nextjs/lib/supabase/proxy.ts (fetched 2026-04-10)]**

### Pattern 2: Auth Confirm route (Magic Link / Email OTP callback)

**Source:** `https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/app/auth/confirm/route.ts` (fetched 2026-04-10)

**`src/app/auth/confirm/route.ts`** — Magic Link 링크 검증:
```ts
import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    } else {
      redirect(`/auth/error?error=${error.message}`)
    }
  }

  redirect(`/auth/error?error=No token hash or type`)
}
```

### Pattern 3: OAuth callback route (Google, Kakao)

**`src/app/auth/callback/route.ts`**:
```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/error?error=oauth_exchange_failed`)
}
```

### Pattern 4: Server Action signup (AUTH-01 ~ AUTH-02)

**`src/app/(auth)/signup/actions.ts`**:
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export async function signUpWithPassword(formData: FormData) {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/role-select`,
    },
  })
  if (error) return { error: { form: [error.message] } }

  redirect('/auth/check-email')
}

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/role-select`,
      shouldCreateUser: true,
    },
  })
  if (error) return { error: { form: [error.message] } }
  return { success: true }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/role-select`,
    },
  })
  if (error) return { error: { form: [error.message] } }
  if (data.url) redirect(data.url)
}

// Phase 2 후반부 — Kakao (내장 provider, custom OIDC 불필요)
export async function signInWithKakao() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/role-select`,
    },
  })
  if (error) return { error: { form: [error.message] } }
  if (data.url) redirect(data.url)
}
```

### Pattern 5: Role selection Server Action (AUTH-02)

**`src/app/(auth)/role-select/actions.ts`**:
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const RoleSchema = z.enum(['WORKER', 'BUSINESS', 'BOTH'])

export async function selectRole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = RoleSchema.safeParse(formData.get('role'))
  if (!parsed.success) return { error: 'invalid_role' }

  // Update Prisma row (public.User)
  await prisma.user.update({
    where: { id: user.id },
    data: { role: parsed.data },
  })

  // Also update app_metadata so JWT claim sees role in proxy.ts
  // NOTE: only service_role key can update app_metadata.
  // This MUST run via a second supabase client using service_role key,
  // or via a Supabase Edge Function triggered by the update.
  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: parsed.data },
  })

  redirect(parsed.data === 'BUSINESS' ? '/biz' : '/home')
}
```

### Pattern 6: Logout Server Action (AUTH-04)

**`src/app/(auth)/login/actions.ts`** (logout part):
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

Supabase의 `signOut()`은 `sb-<project-ref>-auth-token` 쿠키를 자동으로 제거한다 (setAll 콜백을 통해). 추가 쿠키 삭제는 불필요하지만, 앱이 독자적으로 설정한 쿠키가 있다면 `(await cookies()).delete('name')`으로 제거 가능 (Server Action 내부에서만).

### Pattern 7: DAL (Data Access Layer) for secure auth re-verification

Next 16 data-security 가이드 ("A page-level authentication check does not extend to Server Actions defined within it. Always re-verify inside the action") 에 따라:

**`src/lib/dal.ts`**:
```ts
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Fetch DB row for role (JWT claim may be stale right after role-select)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true },
  })
  if (!dbUser) redirect('/login?error=user_not_found')

  return { id: dbUser.id, email: dbUser.email, role: dbUser.role }
})

export const requireWorker = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'WORKER' && session.role !== 'BOTH' && session.role !== 'ADMIN') {
    redirect('/login?error=worker_required')
  }
  return session
})

export const requireBusiness = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'BUSINESS' && session.role !== 'BOTH' && session.role !== 'ADMIN') {
    redirect('/login?error=business_required')
  }
  return session
})
```

[CITED: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, DAL section lines 1137-1172]

### Anti-Patterns to Avoid

- **❌ `middleware.ts` 파일명 사용**: Next 16에서 deprecated. 반드시 `proxy.ts`. Codemod 존재: `npx @next/codemod@canary middleware-to-proxy .` — 그러나 Phase 2는 파일을 신규 작성하므로 codemod 불필요.
- **❌ Proxy에서 DB 쿼리**: Proxy는 모든 경로 + 프리페치에서 실행. 쿠키 기반 optimistic check만. 실제 권한 검증은 page/action/DAL에서.
- **❌ Layout에서 auth check**: Partial Rendering 때문에 네비게이션 간 재실행 안 됨. Page component 또는 DAL에서 verify.
- **❌ `get`/`set`/`remove` cookie helper 사용**: `@supabase/ssr@0.10.2`에서 deprecated. `getAll`/`setAll`만.
- **❌ `supabase.auth.getSession()`을 SSR에서 사용**: 공식 경고 — 토큰 자동 갱신 안 일어나 로그아웃됨. 대신 `getClaims()` (proxy) 또는 `getUser()` (page/action).
- **❌ Global singleton Supabase client**: Fluid Compute에서 instance 재사용 — 매 request마다 `createClient()` 호출.
- **❌ `NEXT_PUBLIC_` prefix 없이 anon key 노출**: Next.js가 client bundle에 넣지 않음. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 필수.
- **❌ `SUPABASE_SERVICE_ROLE_KEY`를 client 코드에서 import**: bundle 노출 시 DB 전체 탈취 리스크. `'server-only'` import로 방어.
- **❌ `prisma.config.ts`에 seed 없이 `npx prisma db seed` 기대**: Prisma 7는 `migrations.seed` 키 필수. 구 `package.json.prisma.seed` 방식은 deprecated.
- **❌ Prisma migrate를 `DATABASE_URL` (pooler)로 실행**: Supavisor transaction mode = prepared statements 미지원 → 즉시 실패. 반드시 `DIRECT_URL` (5432 direct).

## Prisma Schema — Phase 2

### Full recommended schema

**`prisma/schema.prisma`** (Phase 2, 6 models + 5 enums):

```prisma
// GigNow Platform - Phase 2 Prisma Schema
// Scope: Auth + core profile/job/app/review shell
// Legacy 18KB schema preserved at prisma/schema.legacy.prisma.txt

generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [postgis]
}

// ============================================================================
// ENUMS (Phase 2 minimum — matches mock-data.ts types)
// ============================================================================

enum UserRole {
  WORKER
  BUSINESS
  BOTH
  ADMIN
}

enum JobCategory {
  food
  retail
  logistics
  office
  event
  cleaning
  education
  tech
}

enum ApplicationStatus {
  confirmed
  in_progress
  checked_in
  completed
  cancelled
}

enum ReviewDirection {
  worker_to_business
  business_to_worker
}

enum BadgeLevel {
  newbie
  bronze
  silver
  gold
  platinum
  diamond
}

// ============================================================================
// MODELS
// ============================================================================

model User {
  id        String   @id @db.Uuid      // = auth.users.id (1:1 via trigger)
  email     String?  @unique
  phone     String?  @unique
  role      UserRole @default(WORKER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workerProfile   WorkerProfile?
  businessProfile BusinessProfile?
  jobsPosted      Job[]             @relation("BusinessJobs")
  applications    Application[]     @relation("WorkerApps")
  reviewsGiven    Review[]          @relation("ReviewerReviews")
  reviewsReceived Review[]          @relation("RevieweeReviews")

  @@map("users")
}

model WorkerProfile {
  id                  String      @id @default(uuid()) @db.Uuid
  userId              String      @unique @db.Uuid
  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                String
  nickname            String?
  avatar              String?     // emoji or URL (URL upload in Phase 3)
  bio                 String?     @db.VarChar(140)
  preferredCategories JobCategory[]
  badgeLevel          BadgeLevel  @default(newbie)
  rating              Decimal     @default(0) @db.Decimal(3, 2)
  totalJobs           Int         @default(0)
  completionRate      Int         @default(0)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  @@map("worker_profiles")
}

model BusinessProfile {
  id             String      @id @default(uuid()) @db.Uuid
  userId         String      @unique @db.Uuid
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String
  category       JobCategory
  logo           String?     // emoji or URL
  address        String
  addressDetail  String?
  lat            Decimal     @db.Decimal(10, 7)
  lng            Decimal     @db.Decimal(10, 7)
  // Geography column added via Supabase raw SQL migration (Prisma cannot natively declare)
  location       Unsupported("geography(Point, 4326)")?
  rating         Decimal     @default(0) @db.Decimal(3, 2)
  reviewCount    Int         @default(0)
  completionRate Int         @default(0)
  verified       Boolean     @default(false)
  description    String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  jobs           Job[]

  @@map("business_profiles")
}

model Job {
  id             String      @id @default(uuid()) @db.Uuid
  businessId     String      @db.Uuid
  business       BusinessProfile @relation(fields: [businessId], references: [id], onDelete: Cascade)
  authorId       String      @db.Uuid
  author         User        @relation("BusinessJobs", fields: [authorId], references: [id], onDelete: Cascade)
  title          String
  category       JobCategory
  description    String
  hourlyPay      Int
  transportFee   Int         @default(0)
  workDate       DateTime    @db.Date
  startTime      String      // "HH:MM"
  endTime        String      // "HH:MM"
  workHours      Decimal     @db.Decimal(4, 2)
  headcount      Int
  filled         Int         @default(0)
  lat            Decimal     @db.Decimal(10, 7)
  lng            Decimal     @db.Decimal(10, 7)
  location       Unsupported("geography(Point, 4326)")?
  status         String      @default("active")  // active | filled | expired
  isUrgent       Boolean     @default(false)
  nightShiftAllowance Boolean @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  applications   Application[]

  @@index([category, workDate, status])
  @@index([businessId])
  @@map("jobs")
}

model Application {
  id              String             @id @default(uuid()) @db.Uuid
  jobId           String             @db.Uuid
  job             Job                @relation(fields: [jobId], references: [id], onDelete: Cascade)
  workerId        String             @db.Uuid
  worker          User               @relation("WorkerApps", fields: [workerId], references: [id], onDelete: Cascade)
  status          ApplicationStatus  @default(confirmed)
  appliedAt       DateTime           @default(now())
  checkInAt       DateTime?
  checkOutAt      DateTime?
  actualHours     Decimal?           @db.Decimal(5, 2)
  earnings        Int?
  reviewGiven     Boolean            @default(false)
  reviewReceived  Boolean            @default(false)

  reviews         Review[]

  @@unique([jobId, workerId])
  @@index([workerId, status])
  @@index([jobId])
  @@map("applications")
}

model Review {
  id            String          @id @default(uuid()) @db.Uuid
  applicationId String          @db.Uuid
  application   Application     @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  reviewerId    String          @db.Uuid
  reviewer      User            @relation("ReviewerReviews", fields: [reviewerId], references: [id], onDelete: Cascade)
  revieweeId    String          @db.Uuid
  reviewee      User            @relation("RevieweeReviews", fields: [revieweeId], references: [id], onDelete: Cascade)
  direction     ReviewDirection
  rating        Int             // 1-5
  tags          String[]        @default([])
  comment       String?
  createdAt     DateTime        @default(now())

  @@unique([applicationId, direction])  // Phase 5 will enforce review-once-per-direction
  @@map("reviews")
}
```

**Key decisions embedded:**
- `User.id` **not** `@default(uuid())` — instead populated by Supabase auth trigger (sees `auth.users.id` as source of truth).
- `WorkerProfile.preferredCategories` = `JobCategory[]` (Postgres array, not Json — Prisma 7 supports native enum arrays).
- `BusinessProfile.location` / `Job.location` = `Unsupported("geography(Point, 4326)")?` — Prisma 읽기/쓰기 불가, raw SQL 또는 `$queryRaw` 필요. Phase 2는 선언만; Phase 4 ST_DWithin 쿼리에서 사용. Phase 2 seed는 lat/lng decimal 컬럼만 채움.
- `Review.@@unique([applicationId, direction])` — REV-03 uniqueness를 DB 레벨로 (Phase 5 구현).
- 인덱스는 Phase 2가 실제 쿼리하지 않을 컬럼에도 미리 깔아둠 (`Job.@@index([category, workDate, status])`는 Phase 3 탐색용).

### Migration via Prisma

```bash
# 1. Backup legacy schema first
mv prisma/schema.prisma prisma/schema.legacy.prisma.txt
# 2. Create new schema.prisma with content above
# 3. Ensure DATABASE_URL + DIRECT_URL in .env.local
# 4. Generate migration + apply
npx prisma migrate dev --name init_phase2
# Expected output: "✔ Generated Prisma Client"
# Expected side-effect: creates prisma/migrations/<timestamp>_init_phase2/migration.sql
```

**CRITICAL**: `prisma migrate dev` opens interactive prompts when schema drift detected. On a fresh Supabase DB with no prior migrations this runs straight through. If errors occur, `prisma migrate reset` requires confirmation — pipe `yes |` for non-TTY CI.

## Supabase SQL Migrations — Phase 2

### Migration 1: PostGIS extension

**`supabase/migrations/20260410000000_enable_postgis.sql`**:
```sql
-- Phase 2 · PostGIS extension for location-based queries
-- Applied via Supabase MCP apply_migration before Prisma migrate
create extension if not exists postgis with schema extensions;

-- Note: Prisma 7's previewFeatures = ["postgresqlExtensions"] + schema declaration
-- extensions = [postgis] will ALSO attempt to create this during migrate dev.
-- Both idempotent via IF NOT EXISTS.
```

### Migration 2: auth.users → public.users trigger

**`supabase/migrations/20260410000001_auth_trigger_handle_new_user.sql`**:
```sql
-- Phase 2 · Auto-create public.users row when auth.users row inserted
-- Applied AFTER prisma migrate dev (needs public.users table to exist)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, phone, role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      (new.raw_app_meta_data ->> 'role')::public."UserRole",
      'WORKER'::public."UserRole"
    ),
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Notes:**
- `security definer set search_path = ''` is the secure pattern — forces fully-qualified names so search_path attacks cannot hijack the function.
- `public."UserRole"` must be quoted because Prisma creates PascalCase enum type names by default.
- `"createdAt"` / `"updatedAt"` quoted because Prisma camelCase maps to quoted identifiers in Postgres. Alternatively use Prisma `@map("created_at")` to force snake_case and simplify this trigger. **Planner decision**: use the quoted-identifier approach for Phase 2 (avoid schema refactor).
- Default role fallback = `WORKER`. role-select Server Action then updates role + JWT app_metadata.

### Migration 3: User RLS policies

**`supabase/migrations/20260410000002_user_rls.sql`**:
```sql
-- Phase 2 · User table row-level security (own-row only)

alter table public.users enable row level security;

-- Read own row
create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);

-- Update own row (email/phone via auth.updateUser; role via admin.updateUserById only)
create policy "users_update_own"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy: trigger handle_new_user runs as security definer, bypasses RLS
-- No delete policy: account deletion is an admin operation (service_role)
```

### Migration 4: WorkerProfile + BusinessProfile RLS

**`supabase/migrations/20260410000003_profile_rls.sql`**:
```sql
-- Phase 2 · Profile tables RLS (own ALL, others SELECT)

-- Worker profiles
alter table public.worker_profiles enable row level security;

create policy "worker_profiles_select_all"
  on public.worker_profiles
  for select
  using (true);  -- All authenticated users can browse worker profiles (Phase 3 public listing)

create policy "worker_profiles_insert_own"
  on public.worker_profiles
  for insert
  with check (auth.uid() = "userId");

create policy "worker_profiles_update_own"
  on public.worker_profiles
  for update
  using (auth.uid() = "userId")
  with check (auth.uid() = "userId");

create policy "worker_profiles_delete_own"
  on public.worker_profiles
  for delete
  using (auth.uid() = "userId");

-- Business profiles
alter table public.business_profiles enable row level security;

create policy "business_profiles_select_all"
  on public.business_profiles
  for select
  using (true);

create policy "business_profiles_insert_own"
  on public.business_profiles
  for insert
  with check (auth.uid() = "userId");

create policy "business_profiles_update_own"
  on public.business_profiles
  for update
  using (auth.uid() = "userId")
  with check (auth.uid() = "userId");

create policy "business_profiles_delete_own"
  on public.business_profiles
  for delete
  using (auth.uid() = "userId");

-- Phase 2 explicitly does NOT enable RLS on jobs, applications, reviews
-- These tables remain RLS-disabled until Phase 3/4/5 (see D-05)
```

### Migration Execution Order (strictly serial)

```
1. [PREREQ] User manually sets SUPABASE_URL + PUBLISHABLE_KEY + SERVICE_ROLE_KEY + DATABASE_URL + DIRECT_URL in .env.local
           (Claude asks once, user pastes; Claude never reads these back to confirm)
2. [MCP] mcp__supabase__create_project  (if project doesn't exist)
        → output: project_ref, host, JWT secret
3. [MCP] mcp__supabase__apply_migration  (file: 20260410000000_enable_postgis.sql)
4. [CLI] npx prisma migrate dev --name init_phase2
        → creates public.users, worker_profiles, business_profiles, jobs, applications, reviews
        → creates enum types in public schema
        → MUST use DIRECT_URL (port 5432), not DATABASE_URL (port 6543)
5. [MCP] mcp__supabase__apply_migration  (file: 20260410000001_auth_trigger_handle_new_user.sql)
        → ORDER CRITICAL: trigger references public.users, must exist first (step 4)
6. [MCP] mcp__supabase__apply_migration  (file: 20260410000002_user_rls.sql)
7. [MCP] mcp__supabase__apply_migration  (file: 20260410000003_profile_rls.sql)
8. [MCP] mcp__supabase__list_tables  (sanity check: 6 tables, 5 enum types, RLS on 3)
9. [CLI] npx prisma db seed  (after prisma.config.ts migrations.seed key added)
        → creates 6 auth.users via admin API → trigger fires → 6 public.users rows
        → creates 8 business profiles, 8 jobs, 5 applications per mock-data.ts
```

**Idempotency:** Steps 3/5/6/7 use `create ... if not exists` / `create or replace` / `drop ... if exists` → safe to re-run. Step 4 creates a new prisma migration file each time — only run once per schema version. Step 9 is NOT idempotent (uses `prisma.*.create` not `upsert`) — seed must start with `prisma.review.deleteMany()`, `prisma.application.deleteMany()`, ..., `prisma.user.deleteMany()` in reverse FK order.

## Seed Script — Phase 2

### `prisma.config.ts` update

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",  // ← NEW for Phase 2
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

### `prisma/seed.ts` structure (skeleton — not verbatim, planner fills in)

```ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import {
  MOCK_BUSINESSES,
  MOCK_JOBS,
  MOCK_APPLICATIONS,
  MOCK_CURRENT_WORKER,
} from "../src/lib/mock-data";

if (process.env.NODE_ENV === "production") {
  throw new Error("❌ Seed script refused to run in production");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD ?? "gignowdev";

const DEV_ACCOUNTS = [
  { email: "worker+test@gignow.dev", role: "WORKER", profile: "kim-jihoon" },
  { email: "worker2+test@gignow.dev", role: "WORKER", profile: "empty" },
  { email: "business+test@gignow.dev", role: "BUSINESS", profile: "biz-1" },  // 스타벅스 역삼점
  { email: "business2+test@gignow.dev", role: "BUSINESS", profile: "biz-2" }, // 쿠팡 송파
  { email: "both+test@gignow.dev", role: "BOTH", profile: "both" },
  { email: "admin+test@gignow.dev", role: "ADMIN", profile: "admin" },
] as const;

async function main() {
  console.log("🌱 GigNow Phase 2 seed starting...");

  // Step 1: Reverse-order delete to avoid FK errors
  await prisma.review.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany();

  // Also cleanup auth.users for dev domains
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  for (const u of existingUsers.users) {
    if (u.email?.endsWith("@gignow.dev")) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  // Step 2: Create 6 dev auth.users via Admin API
  const createdUsers: Record<string, string> = {};
  for (const acct of DEV_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acct.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      app_metadata: { role: acct.role },
    });
    if (error) throw error;
    createdUsers[acct.profile] = data.user.id;
    // trigger handle_new_user fires → public.users row created automatically
    // But role defaults to WORKER in trigger, must update via Prisma:
    await prisma.user.update({
      where: { id: data.user.id },
      data: { role: acct.role as any },
    });
  }

  // Step 3: WorkerProfile for kim-jihoon (from MOCK_CURRENT_WORKER)
  await prisma.workerProfile.create({
    data: {
      userId: createdUsers["kim-jihoon"],
      name: MOCK_CURRENT_WORKER.name,
      nickname: MOCK_CURRENT_WORKER.nickname,
      avatar: MOCK_CURRENT_WORKER.avatar,
      bio: MOCK_CURRENT_WORKER.bio,
      preferredCategories: MOCK_CURRENT_WORKER.preferredCategories as any,
      badgeLevel: MOCK_CURRENT_WORKER.badgeLevel as any,
      rating: MOCK_CURRENT_WORKER.rating,
      totalJobs: MOCK_CURRENT_WORKER.totalJobs,
      completionRate: MOCK_CURRENT_WORKER.completionRate,
    },
  });

  // Step 4: BusinessProfile × 8 (all MOCK_BUSINESSES)
  // Own rule: biz-1 owned by business+test, biz-2 owned by business2+test,
  //           biz-3..8 owned by admin+test (so seed completes without more accounts)
  const bizOwnership: Record<string, keyof typeof createdUsers> = {
    "biz-1": "biz-1",
    "biz-2": "biz-2",
    "biz-3": "admin",
    "biz-4": "admin",
    "biz-5": "admin",
    "biz-6": "admin",
    "biz-7": "admin",
    "biz-8": "admin",
  };

  const bizIdMap: Record<string, string> = {};
  for (const mockBiz of MOCK_BUSINESSES) {
    const created = await prisma.businessProfile.create({
      data: {
        userId: createdUsers[bizOwnership[mockBiz.id]],
        name: mockBiz.name,
        category: mockBiz.category as any,
        logo: mockBiz.logo,
        address: mockBiz.address,
        addressDetail: mockBiz.addressDetail,
        lat: mockBiz.lat,
        lng: mockBiz.lng,
        rating: mockBiz.rating,
        reviewCount: mockBiz.reviewCount,
        completionRate: mockBiz.completionRate,
        verified: mockBiz.verified,
        description: mockBiz.description,
      },
    });
    bizIdMap[mockBiz.id] = created.id;
  }

  // Step 5: Populate geography column for each business via raw SQL
  // (Prisma cannot write Unsupported() columns)
  for (const mockBiz of MOCK_BUSINESSES) {
    const dbId = bizIdMap[mockBiz.id];
    await prisma.$executeRaw`
      update public.business_profiles
      set location = ST_SetSRID(ST_MakePoint(${mockBiz.lng}, ${mockBiz.lat}), 4326)::geography
      where id = ${dbId}::uuid
    `;
  }

  // Step 6: Job × 8 (MOCK_JOBS)
  const jobIdMap: Record<string, string> = {};
  for (const mockJob of MOCK_JOBS) {
    const businessDbId = bizIdMap[mockJob.businessId];
    const ownerUserId = createdUsers[bizOwnership[mockJob.businessId]];
    const job = await prisma.job.create({
      data: {
        businessId: businessDbId,
        authorId: ownerUserId,
        title: mockJob.title,
        category: mockJob.category as any,
        description: mockJob.description,
        hourlyPay: mockJob.hourlyPay,
        transportFee: mockJob.transportFee,
        workDate: new Date(mockJob.workDate),
        startTime: mockJob.startTime,
        endTime: mockJob.endTime,
        workHours: mockJob.workHours,
        headcount: mockJob.headcount,
        filled: mockJob.filled,
        lat: mockJob.business.lat,
        lng: mockJob.business.lng,
        status: "active",
        isUrgent: mockJob.isUrgent,
        nightShiftAllowance: mockJob.nightShiftAllowance,
      },
    });
    jobIdMap[mockJob.id] = job.id;
    // geography column for job
    await prisma.$executeRaw`
      update public.jobs
      set location = ST_SetSRID(ST_MakePoint(${mockJob.business.lng}, ${mockJob.business.lat}), 4326)::geography
      where id = ${job.id}::uuid
    `;
  }

  // Step 7: Application × 5 (MOCK_APPLICATIONS) — all owned by kim-jihoon (WORKER)
  for (const mockApp of MOCK_APPLICATIONS) {
    await prisma.application.create({
      data: {
        jobId: jobIdMap[mockApp.jobId],
        workerId: createdUsers["kim-jihoon"],
        status: mockApp.status as any,
        appliedAt: new Date(mockApp.appliedAt),
        checkInAt: mockApp.checkInAt ? new Date(mockApp.checkInAt) : null,
        checkOutAt: mockApp.checkOutAt ? new Date(mockApp.checkOutAt) : null,
        actualHours: mockApp.actualHours ?? undefined,
        earnings: mockApp.earnings ?? undefined,
        reviewGiven: mockApp.reviewGiven,
        reviewReceived: mockApp.reviewReceived,
      },
    });
  }

  // Step 8: Reviews = empty (Phase 5 will populate)
  console.log(`✅ Seed complete:
  - 6 auth.users + public.users
  - 1 WorkerProfile (kim-jihoon)
  - 8 BusinessProfile (+ PostGIS location)
  - 8 Job (+ PostGIS location)
  - 5 Application (kim-jihoon → various jobs)
  - 0 Review (Phase 5)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Notes for planner:**
- Use `supabase.auth.admin.createUser` **NOT** `supabase.auth.signUp` in seed — the admin API bypasses email confirmation and RLS.
- The dev password default `gignowdev` is fine hard-coded because `@gignow.dev` accounts are recognizable as dev-only. Override via `SEED_DEV_PASSWORD` env var if wanted.
- MOCK_JOBS uses `mockJob.business.lat` (derived from businesses) — lat/lng stored redundantly in Job rows is intentional (denormalized for fast distance queries).
- Run command: `npx prisma db seed` (NOT `prisma migrate dev` — Prisma 7 no longer auto-seeds).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token signing + refresh | Custom `jose` + cookies logic | `@supabase/ssr` + `getClaims()` | Token rotation, PKCE, OAuth flow, email verification all handled. Hand-roll = 3 days + security bugs. |
| Password hashing | bcrypt direct | Supabase Auth (`signUp({ password })`) | Supabase handles bcrypt + salt + hash parameters via internal `pgsodium`. |
| OAuth provider config | Manual `@auth/core` + custom strategies | Supabase `signInWithOAuth({ provider: 'google' \| 'kakao' })` | Google and Kakao are BUILT-IN Supabase providers. Just toggle in dashboard. |
| Session refresh middleware | Manual cookie-based refresh token flow | `@supabase/ssr` `updateSession` helper | Published, battle-tested, handles edge cases (stale tokens, concurrent requests, token race). |
| Email delivery (magic link, confirm email) | Custom SMTP + Nodemailer | Supabase built-in email (100 free/day on free tier) | Templates customizable in Supabase Dashboard → Authentication → Email Templates. Phase 2 sticks with defaults. |
| Row-level security | Application-level checks in every query | Postgres RLS + `auth.uid()` | Database-enforced, can't be bypassed even if code is wrong. Phase 2 enables on User/Profile; Phase 3+ expands. |
| PostGIS point columns in Prisma | Custom Decimal pair + manual haversine | `Unsupported("geography(Point, 4326)")` + `ST_SetSRID(ST_MakePoint(...))` via raw SQL | Haversine in app code = slow + no index use. PostGIS GIST index = O(log n). |
| Seed dev accounts | Manual signup via Playwright | `supabase.auth.admin.createUser` | Admin API skips email verification, idempotent, no browser. |
| UUID generation | `crypto.randomUUID()` in app | `@default(uuid())` or `auth.users.id` | DB-generated for anon writes, auth.uid() for auth'd. |
| Cookie options | Manual `httpOnly: true, secure: true, sameSite: 'lax'` | `@supabase/ssr` handles via `cookieOptions?` parameter | Supabase defaults are already secure + match spec. Override only if needed. |

**Key insight:** Supabase + `@supabase/ssr` removes ~80% of hand-rolled auth code vs. Auth.js or custom JWT. Phase 2 should be ≤ 500 LOC of new code across all new files combined (excluding schema + migrations).

## Runtime State Inventory

**Trigger:** Phase 2 is a rename/refactor-adjacent phase (renaming `EmployerProfile` → `BusinessProfile`, shrinking Prisma schema, replacing mock auth with real auth). Runtime state inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — repo has no existing Supabase DB, no Postgres data. `.env` contains only `DATABASE_URL` (currently unused). `.env.local` has `NODE_ENV` and `NEXT_PUBLIC_APP_URL` only. | Fresh DB. No data migration needed. Phase 2 seeds from scratch. |
| **Live service config** | None — no Supabase project yet. No Vercel deployment live. No MCP-registered integrations beyond Supabase MCP (client-side). | Phase 2 creates new Supabase project via MCP. User will paste API keys once. |
| **OS-registered state** | None — no pm2, no Windows Task Scheduler, no cron. | N/A |
| **Secrets/env vars** | `.env` has `DATABASE_URL` only. `.env.local` has `NODE_ENV` + `NEXT_PUBLIC_APP_URL`. Phase 2 must ADD 7 new vars (see Environment Availability). | Add to both `.env.local` (local) and Vercel Dashboard (production/preview). Write `.env.example` as PR artifact. |
| **Build artifacts / installed packages** | `src/generated/prisma/` exists from legacy schema — will be regenerated by `prisma migrate dev`. `node_modules/@prisma/engines/` has WASM + native binaries — no cleanup needed. **`@supabase/ssr` + `@supabase/supabase-js` not installed yet** — confirmed via `ls node_modules/@supabase/` returns nothing. | Run `npm install @supabase/ssr@^0.10.2 @supabase/supabase-js@^2.103.0 && npm install --save-dev tsx@^4.20.0`. After install, `prisma migrate dev` will regenerate client from new schema. |

**Runtime state risk for Phase 2:** Near-zero. This is effectively greenfield for Supabase + Prisma (legacy schema exists but unused — no DB rows anywhere).

**The canonical question answered:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* → Only `src/generated/prisma/` which auto-regenerates. `EmployerProfile` type name only appears in legacy schema (soon renamed) and never in mock-data.ts (which uses `MockBusiness`). grep confirms: Phase 1 code uses `MockBusiness`/`biz-*` names, not `Employer`. Safe to rename.

## Common Pitfalls

### Pitfall 1: `middleware.ts` 파일을 만들면 Next 16이 deprecation 경고는 내지 않지만 동작은 한다

**What goes wrong:** Developer creates `src/middleware.ts` by instinct. Next 16 accepts it (backward compat) but the file is officially deprecated. Future Next update may remove support.
**Why it happens:** LLM training data and Stack Overflow answers overwhelmingly show `middleware.ts`.
**How to avoid:** Phase 2 task "Create proxy file" must specify `src/proxy.ts` explicitly + link to `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. No ambiguity.
**Warning signs:** Git shows `src/middleware.ts` being created. Fail CI by adding a lint rule that forbids `src/middleware.ts` presence once `src/proxy.ts` exists.

### Pitfall 2: `prisma migrate dev` against Supavisor transaction pooler fails silently or with "prepared statement already exists"

**What goes wrong:** `DATABASE_URL=postgres://...:6543/...?pgbouncer=true` is used for migrations. Prisma tries to create prepared statements; Supavisor transaction mode rejects them. Error message is cryptic ("unexpected response from server").
**Why it happens:** User copies the pooler URL from Supabase Dashboard and uses it for everything.
**How to avoid:** Phase 2 `prisma/schema.prisma` datasource MUST declare `directUrl = env("DIRECT_URL")`. `DIRECT_URL` points to port 5432 (session mode). `prisma migrate dev` auto-uses `directUrl` when present.
**Warning signs:** Migration hangs or throws opaque error. Check the URL — if port is 6543, fix `DIRECT_URL`.

### Pitfall 3: Cookie race in Server Components — "random logouts"

**What goes wrong:** Developer removes `getClaims()` call from `updateSession` thinking it's redundant, or calls a DB query between `createServerClient` and `getClaims`. Session cookie refresh is lost. Users get randomly logged out.
**Why it happens:** Supabase docs inline warning: "Do not run code between createServerClient and supabase.auth.getClaims(). A simple mistake could make it very hard to debug issues with users being randomly logged out."
**How to avoid:** Copy `updateSession` verbatim from official example. No custom code between client creation and getClaims.
**Warning signs:** QA reports "I was logged in 5 minutes ago, now I'm not" with no auth action taken.

### Pitfall 4: Setting cookies from a Server Component — silent failure

**What goes wrong:** Developer imports `createClient` from `server.ts` in a Server Component, calls `supabase.auth.signOut()` which internally tries to `setAll` cookies. Next.js throws "Cookies can only be modified in Server Action or Route Handler" — but the `server.ts` catch block swallows it.
**Why it happens:** The `server.ts` setAll has a try/catch specifically to silence this. Developer doesn't notice the call was a no-op.
**How to avoid:** Auth mutation code (signUp, signIn, signOut) MUST be in Server Actions (`'use server'`) or Route Handlers. Pages/components only READ auth state via `getUser()` or `getClaims()`.
**Warning signs:** Logout button does nothing — user stays logged in. Check the component type (server vs. action).

### Pitfall 5: RLS blocks seed script

**What goes wrong:** Seed script uses anon key → tries to `prisma.user.create` → RLS policy requires `auth.uid() = id` but seed has no auth context → INSERT rejected.
**Why it happens:** Hybrid model — Prisma bypasses RLS when using service_role connection, but if seed accidentally loads the anon-key connection, it hits RLS.
**How to avoid:** (a) `DATABASE_URL` in seed env uses the *direct* `postgres` superuser credentials (Supabase project's database password, NOT the service role key as a connection string). (b) trigger `handle_new_user` uses `security definer` — bypasses RLS when auth.users is inserted. (c) Seed's `auth.admin.createUser` calls use service_role key.
**Warning signs:** Seed fails with "new row violates row-level security policy for table users".

### Pitfall 6: Supabase project has no initial auth.users → trigger never fires → public.users empty

**What goes wrong:** Developer runs seed before running trigger migration. auth.admin.createUser succeeds (creates auth.users row), but there's no trigger → public.users stays empty → subsequent `prisma.workerProfile.create({ data: { userId: ... } })` fails with FK violation.
**Why it happens:** Ordering bug in execution script.
**How to avoid:** STRICT execution order documented in "Migration Execution Order" above. Planner must lock this sequence.
**Warning signs:** Seed step "Create WorkerProfile for kim-jihoon" fails with FK error referencing `users` table.

### Pitfall 7: Layout auth check gives false security

**What goes wrong:** Developer adds `verifySession()` in `src/app/(worker)/layout.tsx` thinking it protects all worker routes. It doesn't — layout only re-runs on initial hit, not on client-side navigation.
**Why it happens:** "Partial Rendering" behavior in Next.js App Router — layouts are preserved across navigations.
**How to avoid:** Check auth in individual page components or in the DAL (`src/lib/dal.ts`). Use `requireWorker()` / `requireBusiness()` helpers at the top of each protected page.
**Warning signs:** User logs out in one tab, navigates in another tab — still sees authed UI until hard refresh.

### Pitfall 8: `supabase.auth.getSession()` in server code

**What goes wrong:** Code uses `getSession()` instead of `getUser()` / `getClaims()` — returns session from cookie without verifying against Supabase. Attackers can forge cookies if HMAC key leaks.
**Why it happens:** Old tutorial code. `getSession()` is client-only recommended.
**How to avoid:** In server code (Server Components, Actions, Route Handlers, Proxy): use `getClaims()` (proxy) or `getUser()` (pages/actions). Both hit Supabase to verify.
**Warning signs:** Code review finds `await supabase.auth.getSession()` in a server-side file. Replace immediately.

### Pitfall 9: Kakao OAuth callback URL mismatch

**What goes wrong:** Kakao Developers dashboard has redirect URI as `http://localhost:3000/auth/callback`, but Supabase expects `https://<project>.supabase.co/auth/v1/callback`. Kakao returns success → Supabase can't find matching provider config → redirect to `/auth/error`.
**Why it happens:** Developer confuses app-level callback with Supabase-level callback. Kakao calls Supabase, Supabase calls app.
**How to avoid:** Kakao Developers → Platforms → Web → Site Domain = `https://<project>.supabase.co` + Redirect URI = `https://<project>.supabase.co/auth/v1/callback`. App side just needs `/auth/callback` that handles `exchangeCodeForSession`.
**Warning signs:** Kakao login succeeds in Kakao popup but app ends up on `/auth/error?error=oauth_exchange_failed`.

### Pitfall 10: `auth.admin.createUser` service_role key missing

**What goes wrong:** Seed script initializes service role client with `anon` key by accident (copy-paste from client.ts). `auth.admin.*` calls return 401.
**Why it happens:** Both keys are env vars; one is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the other is `SUPABASE_SERVICE_ROLE_KEY`. Typo or wrong var used.
**How to avoid:** Seed script imports `server-only` at top. Reject if `SUPABASE_SERVICE_ROLE_KEY` starts with `sb_publishable_` or is missing.
**Warning signs:** Seed fails with "invalid API key" or "forbidden" on the first `admin.createUser` call.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev + Prisma | ✓ | 22.14.0 | — |
| npm | Package install | ✓ | (from Node 22) | — |
| `npx prisma` | Migrations + seed + generate | ✓ | 7.5.0 | — |
| `@prisma/client` + `@prisma/adapter-pg` + `pg` | Runtime DB access | ✓ | 7.5.0 / 7.5.0 / 8.x | — |
| Next.js 16 local docs | Authoritative API reference | ✓ | embedded in `node_modules/next/dist/docs/` | — |
| `@supabase/ssr` | 3-file pattern | ✗ | — | **BLOCKING** — must install `@supabase/ssr@^0.10.2` |
| `@supabase/supabase-js` | Low-level SDK | ✗ | — | **BLOCKING** — must install `@supabase/supabase-js@^2.103.0` |
| `tsx` | seed.ts runner | ✗ | — | **BLOCKING** — must install `tsx@^4.20.0` (devDep); alternatively `ts-node` already? → no, not in package.json |
| Supabase MCP server | Project creation + apply_migration | ⚠️ assumed available based on CONTEXT.md D-03, but not verified in this session | unknown | Fallback: `supabase` CLI (`npm i -g supabase`) + `supabase db push`. Requires Docker Desktop for local dev, OR direct CLI against remote. |
| `supabase` CLI | Optional — `supabase init`, `supabase db push` | ✗ (not globally installed) | — | Only needed if MCP path fails. Install via `npm i -g supabase` OR scoop/brew. |
| Docker | Supabase CLI local dev | ⚠️ unknown | — | Not needed if using MCP-only or direct-to-remote CLI. |
| Google OAuth credentials | AUTH-01 Google provider | ⚠️ Must be created by user in Google Cloud Console | — | User action required during Wave 2. Can complete Phase 2 without (skip Google, use Password+MagicLink only) and add later. |
| Kakao OAuth credentials | Phase 2 末 Kakao provider | ⚠️ Must be created by user in Kakao Developers | — | Can complete Phase 2 without (deferred to final wave). |
| Supabase project + API keys | All DB + Auth work | ⚠️ User must provide or Claude creates via MCP | — | **BLOCKING for Wave 1 onward.** Planner must include "Block until user confirms Supabase project access" step. |

**Missing dependencies with no fallback:**
- `@supabase/ssr`, `@supabase/supabase-js`, `tsx` — all installable via npm, planner's first wave task.

**Missing dependencies with fallback:**
- Supabase MCP server availability is unverified. If MCP tools fail, fallback is `npm i -g supabase && supabase link --project-ref <ref> && supabase db push`. Planner should have Plan B ready.
- Google/Kakao OAuth creds — Phase 2 can ship with Email/Password + Magic Link alone, adding OAuth providers after.

**Assumption-flag items (need user confirmation):**
- [ASSUMED] Supabase MCP tools are configured in this Claude Code session. If not, Wave 1 must either provision MCP or switch to CLI path.
- [ASSUMED] User has a Google Cloud account able to create OAuth consent screen + credentials. If not, skip Google in Wave 3 and add later.
- [ASSUMED] User has a Kakao Developers account. If not, Kakao wave is a no-op.

## Validation Architecture

**Config:** `.planning/config.json` has `workflow.nyquist_validation: true` — **VALIDATION.md required**.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None currently installed** — repo has no jest/vitest/playwright configured. Phase 2 Wave 0 must install Vitest (lightest, fastest, works with Next 16 + TS + ESM). |
| Recommended | **Vitest 3.x + @testing-library/react + Playwright** for E2E. Install as Wave 0 task. |
| Config file | `vitest.config.ts` (create in Wave 0) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run && npx playwright test` |

**Install command (Wave 0):**
```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npm install --save-dev @playwright/test
npx playwright install chromium
```

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **DATA-01** | Prisma schema has User, WorkerProfile, BusinessProfile, Job, Application, Review models | unit (schema introspection) | `npx prisma validate && node -e "const {PrismaClient}=require('./src/generated/prisma/client'); const p=new PrismaClient(); console.log(Object.keys(p).filter(k=>['user','workerProfile','businessProfile','job','application','review'].includes(k)))"` | ❌ Wave 0 — after schema rewrite |
| **DATA-02** | PostGIS extension enabled + geography columns present | unit (SQL query via raw) | `vitest run tests/data/postgis.test.ts` → asserts `SELECT PostGIS_version()` returns non-null + `jobs.location` is geography type | ❌ Wave 0 |
| **DATA-03** | Supabase has all 4 migrations applied | unit (MCP query) | `vitest run tests/data/migrations.test.ts` → asserts `SELECT count(*) FROM supabase_migrations.schema_migrations` ≥ 4, asserts `users`, `worker_profiles`, `business_profiles` tables exist with RLS enabled | ❌ Wave 0 |
| **DATA-04** | `npx prisma db seed` creates 6 users + 8 businesses + 8 jobs + 5 applications | integration | `npx prisma migrate reset --force --skip-seed && npx prisma db seed && vitest run tests/data/seed.test.ts` → counts rows | ❌ Wave 0 |
| **AUTH-01** | User signup via email/password creates auth.users + public.users rows | integration (MSW + Supabase test instance OR real Supabase dev project) | `vitest run tests/auth/signup.test.ts` → calls signup action, asserts Supabase auth.admin.getUserByEmail returns user, asserts prisma.user.findUnique returns matching row | ❌ Wave 0 |
| **AUTH-01 (MagicLink)** | Magic link flow sends email + verifyOtp redirects correctly | integration | `vitest run tests/auth/magic-link.test.ts` → mock SMTP capture, assert token_hash generated, simulate GET `/auth/confirm?token_hash=...&type=magiclink` | ❌ Wave 0 |
| **AUTH-01 (Google)** | `signInWithOAuth({ provider: 'google' })` returns redirect URL | smoke | `vitest run tests/auth/google-oauth.test.ts` → asserts `data.url` starts with `https://accounts.google.com/o/oauth2/v2/auth?` | ❌ Wave 0 |
| **AUTH-01 (Kakao)** | `signInWithOAuth({ provider: 'kakao' })` returns redirect URL | smoke (Phase 2 末) | `vitest run tests/auth/kakao-oauth.test.ts` → asserts `data.url` starts with `https://kauth.kakao.com/oauth/authorize?` | ❌ Wave 0 (skip initially, add in Kakao wave) |
| **AUTH-02** | Role selection Server Action writes to `public.users.role` AND `auth.users.app_metadata.role` | integration | `vitest run tests/auth/role-select.test.ts` → creates user, calls `selectRole('BOTH')`, asserts DB + JWT claim both updated | ❌ Wave 0 |
| **AUTH-03** | Browser refresh preserves session | E2E (Playwright) | `npx playwright test tests/e2e/session-persist.spec.ts` → login, reload page, assert user still authed (url !== /login) | ❌ Wave 0 |
| **AUTH-04** | Logout removes all session cookies | E2E | `npx playwright test tests/e2e/logout.spec.ts` → login, click logout, assert `context.cookies()` has no `sb-*-auth-token` cookies | ❌ Wave 0 |
| **AUTH-05** | Unauthenticated user redirected to /login | E2E + unit (proxy test) | `npx playwright test tests/e2e/protected-redirect.spec.ts` (E2E) + `vitest run tests/proxy/redirect.test.ts` using `unstable_doesProxyMatch` API (Next 16 experimental testing helper) | ❌ Wave 0 |
| **AUTH-06** | Worker-only path blocks BUSINESS user | E2E + unit | `npx playwright test tests/e2e/role-worker-only.spec.ts` → login as business+test, visit `/my/profile`, expect redirect | ❌ Wave 0 |
| **AUTH-07** | Business-only path blocks WORKER user | E2E + unit | `npx playwright test tests/e2e/role-biz-only.spec.ts` → login as worker+test, visit `/biz/posts`, expect redirect | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot` (unit + integration, <30s target)
- **Per wave merge:** `npx vitest run && npx playwright test` (full suite, <2min target)
- **Phase gate:** Full suite green + manual smoke of signup→login→refresh→logout for all 6 dev accounts before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` + `tests/setup.ts` (jsdom env, `@testing-library/jest-dom` matchers)
- [ ] `playwright.config.ts` (baseURL http://localhost:3000, use chromium only for Phase 2 speed)
- [ ] `tests/data/postgis.test.ts` — asserts PostGIS extension + geography column types
- [ ] `tests/data/migrations.test.ts` — lists tables + RLS status via raw SQL
- [ ] `tests/data/seed.test.ts` — post-seed row counts
- [ ] `tests/auth/signup.test.ts` — integration against dev Supabase project
- [ ] `tests/auth/magic-link.test.ts` — mock Supabase auth or use test inbucket mailbox
- [ ] `tests/auth/role-select.test.ts` — asserts both public.users.role AND app_metadata.role
- [ ] `tests/proxy/redirect.test.ts` — uses `next/experimental/testing/server` `unstable_doesProxyMatch`
- [ ] `tests/e2e/session-persist.spec.ts`
- [ ] `tests/e2e/logout.spec.ts`
- [ ] `tests/e2e/protected-redirect.spec.ts`
- [ ] `tests/e2e/role-worker-only.spec.ts`
- [ ] `tests/e2e/role-biz-only.spec.ts`
- [ ] Framework install: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test && npx playwright install chromium`
- [ ] `package.json` scripts: `"test": "vitest run"`, `"test:e2e": "playwright test"`, `"test:watch": "vitest"`

**E2E test requirement:** Vitest integration tests need a live Supabase dev project (the one created in Wave 1). Playwright E2E tests need `next dev` running + same Supabase. Planner should create a `tests/helpers/test-users.ts` that logs in as `worker+test@gignow.dev`/`gignowdev` etc. and reuses `saveStorageState` across tests for speed.

**Note on Next 16 experimental proxy testing:** `next/experimental/testing/server` has `unstable_doesProxyMatch` and `isRewrite`/`getRewrittenUrl` helpers for unit-testing proxy logic without running a full server. This is listed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` section "Unit testing (experimental)" — use for matcher and redirect logic tests.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| **V2 Authentication** | ✅ yes | Supabase Auth (bcrypt + pgsodium) + Magic Link (crypto-random token) + OAuth PKCE (Google, Kakao) |
| **V3 Session Management** | ✅ yes | `@supabase/ssr` HttpOnly SameSite=lax Secure cookies + server-side refresh in proxy. Default Supabase cookie name `sb-<project-ref>-auth-token` |
| **V4 Access Control** | ✅ yes | Postgres RLS (User/Profile tables) + DAL re-verification in Server Components + Server Action re-verification (Next 16 data-security guide explicit requirement) |
| **V5 Input Validation** | ✅ yes | Zod schemas in Server Actions (signup form, role-select, login) — schema validation BEFORE Supabase API call |
| **V6 Cryptography** | ✅ yes | **Never hand-roll.** Supabase handles password hashing (bcrypt + pgsodium for pgSodium-enabled projects), JWT signing (HS256 via `JWT_SECRET` provisioned by Supabase), TLS in transit (Supabase CDN) |
| **V7 Error Handling & Logging** | ⚠️ partial | Auth errors logged to Supabase Dashboard. App-side errors go to `console.error` for Phase 2 — centralized logging is Phase 3+ concern (no Sentry yet). |
| **V8 Data Protection** | ✅ yes | `SUPABASE_SERVICE_ROLE_KEY` server-only (enforced via `'server-only'` import). Publishable key safe to expose. Passwords never stored in app code. |
| **V9 Communication** | ✅ yes | HTTPS only (Vercel + Supabase enforce TLS) |
| **V10 Malicious Code** | ⚪ n/a | Phase 2 doesn't introduce file upload or markdown rendering |
| **V11 Business Logic** | ⚠️ partial | Rate limiting on signup NOT implemented in Phase 2 — should use Supabase Auth's built-in rate limits (60 email/hour per IP by default). Custom rate limits deferred to v2. |
| **V12 Files & Resources** | ⚪ n/a | No file upload in Phase 2 (deferred to Phase 3) |
| **V13 API & Web Service** | ✅ yes | Server Actions encrypted IDs (Next.js built-in), CSRF protection via SameSite=lax + Origin header check (Next.js built-in, see data-security.md "Allowed origins") |
| **V14 Configuration** | ✅ yes | `.env.local` not committed; `.env.example` ships with Phase 2 PR; Vercel env vars manually mirrored |

### Known Threat Patterns for Next.js 16 + Supabase + Prisma

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **SQL injection** | Tampering | Prisma ORM parameterized queries. Raw `$executeRaw` in seed uses tagged templates (`prisma.$executeRaw\`SELECT ... WHERE id = ${id}::uuid\``) — Prisma auto-escapes. |
| **IDOR on profiles** | Info disclosure + Elevation | RLS policy `users_update_own` enforces `auth.uid() = id` at DB level. Even if app code is buggy, DB rejects the update. |
| **Session fixation** | Tampering | Supabase rotates JWT on every `refreshSession` call (automatic in `updateSession` helper). New access token every hour. |
| **CSRF on Server Actions** | Tampering | Next.js 16 Server Actions enforce `Origin === Host` + SameSite=lax cookies. See `data-security.md` "Allowed origins" section. |
| **XSS via user-controlled HTML** | Tampering | React auto-escapes JSX. No `dangerouslySetInnerHTML` in Phase 2 code. Phase 2 has no markdown/HTML user input. |
| **OAuth open redirect** | Tampering | `auth/callback/route.ts` must validate `next` param against allowlist (/, /home, /my, /biz, /role-select) — **Planner task to implement**. Current Supabase example blindly uses `next` param → add allowlist check. |
| **Password brute force** | Spoofing | Supabase built-in rate limits: 4 failed attempts/min per email, 60 emails/hour per IP. Enable "Email confirmations" in dashboard. |
| **Magic link reuse** | Spoofing | Supabase tokens are single-use, 1-hour expiry. `verifyOtp` rejects on second call. |
| **JWT forgery** | Spoofing | HS256 JWT secret is project-scoped and NEVER exposed client-side. `getClaims()` verifies HMAC against Supabase JWKS. Don't use `getSession()` in server code (verifies cookie only, not signature). |
| **Cookie theft (XSS)** | Info disclosure | `HttpOnly` + `SameSite=lax` + `Secure` defaults. JS cannot read `sb-*-auth-token` cookie. |
| **Mass assignment in Server Actions** | Elevation | Zod schemas explicitly whitelist fields. Never `prisma.user.update({ where: ..., data: formData })` — always destructure + validate. |
| **Trigger SQL injection via raw_user_meta_data** | Tampering | `handle_new_user()` uses parameterized insert + `security definer set search_path = ''` to prevent search_path hijacking. Casting `(new.raw_app_meta_data ->> 'role')::public."UserRole"` fails on invalid enum → safe fallback. |
| **`admin.updateUserById` from untrusted context** | Elevation | Role-select Server Action re-verifies session via DAL BEFORE calling admin API. Admin API requires service_role key which is never bundled to client. |
| **Race: two tabs signup same email** | — | Supabase returns error on duplicate auth.users.email (unique constraint). Handled gracefully. |

### Next 16 Data Security Guide — MUST-FOLLOW for Phase 2

Directly cited from `node_modules/next/dist/docs/01-app/02-guides/data-security.md` line 327-358:

> "A page-level authentication check does not extend to the Server Actions defined within it. Always re-verify inside the action."

**Phase 2 enforcement:**
- Every Server Action (`signUpWithPassword`, `signInWithOAuth`, `selectRole`, `logout`) calls `await createClient()` + `getUser()` before mutating state.
- `src/lib/dal.ts` provides `verifySession()`, `requireWorker()`, `requireBusiness()` helpers cached per-request via `react.cache`.
- Any page that displays role-gated UI calls `requireWorker()` or `requireBusiness()` at its top — NEVER in a Layout.

## Code Examples

See "Architecture Patterns" section above for verbatim code. All patterns sourced from either:
- `node_modules/next/dist/docs/` (Next.js 16.2.1 embedded docs — authoritative)
- `https://github.com/supabase/supabase/tree/master/examples/auth/nextjs/` (Supabase official maintained example)
- `https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/` (Vercel official maintained example)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` file | `proxy.ts` file | Next.js 16.0.0 (2025) | File rename + codemod. Vercel/Supabase examples updated. |
| `cookies()` synchronous | `cookies()` async (await required) | Next.js 15.0.0-RC | `const cookieStore = await cookies()` mandatory; sync access deprecated |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Package consolidation. `auth-helpers-*` deprecated. |
| `get`/`set`/`remove` cookie methods | `getAll`/`setAll` | `@supabase/ssr` 0.4+ | Array-based pattern prevents partial-set race conditions |
| `supabase.auth.getSession()` on server | `supabase.auth.getClaims()` in proxy, `getUser()` in pages | `@supabase/ssr` 0.10+ | `getClaims()` is new, uses JWKS + HMAC verification instead of trusting cookie |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...` format) | 2025+ | Both still supported during transition; new projects use publishable |
| `prisma-client-js` generator | `prisma-client` generator (explicit output) | Prisma 7.0.0 | `prisma-client-js` deprecated but works; recommended to use new generator |
| `package.json "prisma.seed"` | `prisma.config.ts migrations.seed` | Prisma 7.0.0 | Config moved; `package.json` form deprecated |
| Automatic seed on `migrate dev` | Manual `prisma db seed` only | Prisma 7.0.0 | Explicit control; avoids accidental data loss |
| Edge runtime as default for middleware | Node.js runtime default for proxy | Next.js 15.5.0 (stable), 16.0.0 (default) | Full Node.js APIs available in proxy; Fluid Compute compat |
| pgBouncer (real) on Supabase | Supavisor (Postgres-native pooler) | 2024 | Transaction mode port 6543 with `?pgbouncer=true` flag for prepared statements opt-out |

**Deprecated/outdated (do NOT use in Phase 2):**
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr`
- `@supabase/auth-helpers-react` — roll your own with `client.ts` + React context if needed (Phase 2 doesn't need global auth context — server components read via DAL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (technically works but Supabase docs moving away)
- `Geometry()` / `Geography()` native type in Prisma schema — **not implemented in Prisma 7** (training-data hallucination). Use `Unsupported("geography(Point, 4326)")?`.
- `middleware.ts` filename in Next 16

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase MCP tools (`create_project`, `apply_migration`, `execute_sql`, `list_tables`) are available in this Claude Code session | Migration Execution Order, Environment Availability | HIGH — without MCP, Plan B is Supabase CLI (`supabase` npm package + `supabase link` + `supabase db push`) which requires user to install CLI locally. Planner should have fallback task defined. |
| A2 | User has or will create Google Cloud OAuth credentials during Wave 3 | AUTH-01 Google support | MEDIUM — Phase 2 can ship with Email/Password + MagicLink alone. Google support flag as "optional in Phase 2" if creds unavailable. |
| A3 | User has or will create Kakao Developers app credentials during final wave | AUTH-01 Kakao support | LOW — Kakao is "Phase 2 bonus" per CONTEXT.md. Can defer entirely if needed. |
| A4 | Phase 2 requirement AUTH-01 "phone number or email" is satisfied by email-only implementation | phase_requirements | MEDIUM — REQUIREMENTS.md says "phone or email" but CONTEXT.md D-01 defers SMS to v2. Drift noted. Phase 2 verify step should decide: (a) restate REQ-01 as email-only, or (b) keep REQ-01 open with SMS as follow-up. |
| A5 | Prisma 7's `previewFeatures = ["postgresqlExtensions"]` + `extensions = [postgis]` is still the correct incantation in 7.5.0 | Prisma Schema — Phase 2 | LOW — verified in current schema.prisma that this declaration works; `prisma migrate` was run successfully in the past with legacy schema. |
| A6 | The `user.role` in the DB is readable via Prisma's `@default("WORKER")` trigger fallback + later updated via admin API during role-select | Pattern 5: Role selection | MEDIUM — if Supabase trigger fails silently or enum cast rejects, `public.users` insert fails → signup broken. Wave 1 must include an E2E test: create auth user → assert public.users row exists within 100ms. |
| A7 | `tsx` is the correct seed runner for Prisma 7 (vs. `ts-node`, `bun`, `swc-node`) | Seed Script Phase 2 | LOW — Prisma docs example uses `tsx`. Package lightweight, ESM-native, works with Node 22. |
| A8 | Supabase built-in Kakao provider supports the Korean Kakao Developers account (not just Kakao.com global account) | Pattern 4, Kakao OAuth | LOW — Supabase provider is Kakao-agnostic; works with any OAuth 2.0 compliant Kakao app. Verified by Supabase docs that Kakao is built-in. But domestic-specific nuances (Kakao Sync vs. Kakao Login) may need discovery during implementation. |
| A9 | Next 16 `proxy.ts` unit testing via `next/experimental/testing/server.unstable_doesProxyMatch` is stable enough for Phase 2 CI | Wave 0 Gaps, Validation Architecture | LOW — experimental, may change. Fallback: E2E tests in Playwright exercise real proxy behavior, which is sufficient for Phase 2 even without unit tests. |
| A10 | `supabase.auth.getClaims()` is preferred over `getUser()` in proxy context (per Supabase's official example) | Pattern 1 code verbatim, Pitfall 3 | LOW — came directly from the official Supabase Next.js example. |
| A11 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the current production-recommended env var name for new projects (not `ANON_KEY`) | Pattern 1, env vars discussion | LOW — verified via Supabase docs; both supported. CONTEXT.md D-07 uses `ANON_KEY` — planner should either follow D-07 verbatim (using ANON_KEY) OR document the upgrade to PUBLISHABLE_KEY as an intentional lift. **Recommendation: use `PUBLISHABLE_KEY` as primary + accept `ANON_KEY` as fallback.** Requires one-line update to CONTEXT.md D-07 after confirmation. |

## Open Questions (RESOLVED)

All questions below were resolved during plan creation. Each resolution is noted inline; the planner has already addressed each item in Plan 01-06 or accepted the known limitation.

1. **MCP availability verification**
   - What we know: CONTEXT.md D-03 assumes Supabase MCP is wired up. The Vercel plugin subagent bootstrap doesn't mention it.
   - What's unclear: Whether `mcp__supabase__*` tools respond in the current session.
   - Recommendation: Wave 1 first task = "Verify Supabase MCP connectivity by calling `list_projects`. If fails, fallback to Supabase CLI path." This should be the very first action before creating any files.
   - **RESOLVED:** Plan 01 Task 5 is a blocking `checkpoint:decision` that verifies Supabase MCP connectivity before Plan 02 (Wave 1) begins. User selects `mcp-primary`, `cli-fallback`, or `try-mcp-fallback-cli`. CLI fallback path (`supabase db push` + `supabase link`) is documented end-to-end in Plan 02 so the executor can re-route mid-flight if MCP fails.

2. **Seed execution on Supabase preview branches**
   - What we know: CONTEXT.md says "Supabase 프리뷰 branch: `supabase migration new seed_dev_data` + Supabase CLI로 브랜치 생성 시 자동 적용"
   - What's unclear: Whether branch migrations should contain seed data (unusual — typically seeds are separate) or whether each branch creates via `prisma db seed` manually.
   - Recommendation: Phase 2 ships with `prisma db seed` only. Supabase branch integration deferred to Phase 3+ (not blocking for Phase 2 DoD).
   - **RESOLVED:** Phase 2 ships with `prisma db seed` only (Plan 05 owns the seed script + prisma.config.ts wiring). Supabase branch seed integration is explicitly deferred to Phase 3+. Accepted as scope boundary — not blocking for Phase 2 DoD.

3. **`auth.users.email` ↔ `public.users.email` synchronization**
   - What we know: Trigger copies email from auth.users on insert.
   - What's unclear: What happens when user changes email via Supabase `auth.updateUser({ email })` — public.users.email stays stale.
   - Recommendation: Phase 2 adds an UPDATE trigger: `create trigger on_auth_user_email_updated after update of email on auth.users for each row execute procedure public.handle_user_email_update();`. OR accept stale and document as known limitation. Phase 2 priority: document as known limitation, add sync trigger in Phase 3.
   - **RESOLVED:** Accepted as known limitation for Phase 2. The Phase 2 trigger only handles INSERT (auth.users → public.users row creation). Email-change propagation trigger is deferred to Phase 3 profile work, where user profile editing flows will be implemented alongside the full email-update handler. Drift captured implicitly in Plan 06 Task 4 ARCHITECTURE.md review.

4. **Session cookie name override for multi-project dev**
   - What we know: Supabase default cookie = `sb-<project-ref>-auth-token`.
   - What's unclear: If developer runs multiple Supabase projects locally (dev, staging) on same port, cookies collide.
   - Recommendation: Don't override. The `<project-ref>` differentiator is enough. Use browser profiles for multi-project dev.
   - **RESOLVED:** Use Supabase default cookie name `sb-<project-ref>-auth-token`. Multi-project local development is a non-goal for Phase 2 (solo developer, single dev project). No cookie name override is introduced. Developers running multiple Supabase projects simultaneously should use browser profiles.

5. **Prisma `directUrl` for Vercel production**
   - What we know: `directUrl` must be non-pooled for migrations.
   - What's unclear: Whether Vercel production runtime needs both `DATABASE_URL` and `DIRECT_URL` or just `DATABASE_URL`. Runtime queries use the pooler, migrations don't run on Vercel (they run during `vercel build` via `prisma generate` only, not `prisma migrate deploy` in production).
   - Recommendation: Set both in Vercel env vars for safety. `DATABASE_URL` for runtime. `DIRECT_URL` only used if CI runs `prisma migrate deploy` as part of build (optional).
   - **RESOLVED:** Plan 01 Task 4 writes BOTH `DATABASE_URL` (Supavisor pooler port 6543 with `?pgbouncer=true` for runtime queries) AND `DIRECT_URL` (direct connection port 5432 for migrations) into `.env.example`. Plan 02 Task 2 adds `directUrl = env("DIRECT_URL")` to the Prisma `datasource db` block. Vercel production env vars should mirror both — documented in user_setup frontmatter of Plan 01.

6. **Empty `src/app/(biz)` route group**
   - What we know: `src/app/(biz)/` directory exists but is empty. Real biz routes live under `src/app/biz/` (flat path).
   - What's unclear: Whether to delete the empty `(biz)` group or leave it for future use.
   - Recommendation: Leave it. Deletion is not Phase 2 scope; Phase 3 can reorganize if needed.
   - **RESOLVED:** Left as-is. Phase 2 is not responsible for deleting empty route groups. The real biz routes live at flat `src/app/biz/` path (which is what Plan 04 Task 3 modifies for `requireBusiness()` layout gating). Phase 3+ can reorganize if needed — no Phase 2 scope impact.

7. **`role-select` page does not exist yet**
   - What we know: `src/app/(auth)/role-select/page.tsx` is referenced in CONTEXT.md "existing mock UI to wire Supabase into" but the file does NOT exist.
   - What's unclear: Whether Phase 1 had a role-select page that was later removed, or whether Phase 2 needs to create it from scratch.
   - Recommendation: Phase 2 Wave 3 creates `role-select/page.tsx` + `actions.ts` from scratch. Phase 1 retroactive scope did not include this page.
   - **RESOLVED:** Plan 04 Task 3 creates `src/app/(auth)/role-select/page.tsx` from scratch as a Server Component with `verifySession()` first-layer check and three `<form action={selectRole}>` submissions (WORKER/BUSINESS/BOTH). Plan 04 Task 3 also creates the matching `src/app/(auth)/role-select/actions.ts` with Next 16 data-security re-verification and admin API `app_metadata.role` update.

## Sources

### Primary (HIGH confidence)
- **Next.js 16.2.1 local docs** at `C:/Users/TG/Desktop/Njobplatform/node_modules/next/dist/docs/` — Authoritative per AGENTS.md directive. Verified: proxy.md, authentication.md, data-security.md, cookies.md.
- **`@supabase/ssr@0.10.2` TypeScript definitions** at `https://unpkg.com/@supabase/ssr@0.10.2/dist/main/createServerClient.d.ts` et al — Verified `getAll`/`setAll` is current API, `get/set/remove` deprecated.
- **`supabase/supabase` GitHub master** `examples/auth/nextjs/` — Fetched 2026-04-10 via raw.githubusercontent.com:
  - `lib/supabase/client.ts` (verbatim, sha `f5e7647`)
  - `lib/supabase/server.ts` (verbatim, sha `867ecbc`)
  - `lib/supabase/proxy.ts` (verbatim, sha `ddc4e84`)
  - `proxy.ts` (root, verbatim)
  - `.env.example` (verified `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` naming)
- **`vercel/next.js` GitHub canary** `examples/with-supabase/app/auth/confirm/route.ts` — Verbatim auth confirm route.
- **npm registry verification**:
  - `npm view @supabase/ssr version time.modified` → `0.10.2`, 2026-04-09
  - `npm view @supabase/supabase-js version` → `2.103.0`, 2026-04-09
  - `npm view @supabase/ssr peerDependencies` → `{ '@supabase/supabase-js': '^2.102.1' }`
  - `npx prisma --version` → `prisma 7.5.0`, `@prisma/client 7.5.0`, Node 22.14.0
- **Local repo inspection**:
  - `package.json`, `prisma.config.ts`, `prisma/schema.prisma`, `src/lib/db/index.ts`, `src/lib/mock-data.ts`, `src/app/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(worker)/layout.tsx`, `src/app/biz/layout.tsx` — all READ and verified during session.

### Secondary (MEDIUM confidence)
- **Supabase docs via WebFetch**:
  - `https://supabase.com/docs/guides/database/prisma` (connection strings)
  - `https://supabase.com/docs/guides/auth/social-login/auth-kakao` (confirmed Kakao built-in)
  - `https://supabase.com/docs/guides/auth/managing-user-data` (trigger pattern)
  - `https://supabase.com/docs/guides/database/connecting-to-postgres` (Supavisor vs pgBouncer)
  - `https://supabase.com/docs/guides/api/api-keys` (publishable vs anon key)
  - `https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting` (pgBouncer + prepared statements)
  - `https://supabase.com/docs/guides/deployment/managing-environments` (supabase init recommendation)
- **Prisma docs via WebFetch**:
  - `https://www.prisma.io/docs/orm/prisma-schema/postgresql-extensions` (PostGIS + Unsupported)
  - `https://www.prisma.io/docs/orm/reference/prisma-schema-reference` (Unsupported() + Geometry verification)
  - `https://www.prisma.io/docs/orm/prisma-schema/overview/generators` (prisma-client vs prisma-client-js)
  - `https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding` (Prisma 7 seed config)
- **Supabase community MCP**: `https://github.com/supabase-community/supabase-mcp` (tool name list)

### Tertiary (LOW confidence)
- Training data knowledge of Auth.js, Clerk, and other alternatives (used only to compare — not relied on for Supabase specifics)
- One earlier WebFetch claim that "Prisma 7 natively supports Geometry" — CONTRADICTED by second WebFetch and Prisma schema reference. Flagged as LLM hallucination; final position is `Unsupported("geography(Point, 4326)")`.

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — versions verified via `npm view`, peer deps checked, installed versions confirmed via `npx prisma --version`
- **Architecture patterns:** HIGH — all code blocks copied verbatim from official Supabase/Vercel examples fetched live 2026-04-10
- **Prisma schema:** HIGH — Legacy schema read directly, new schema designed from mock-data.ts + CONTEXT.md D-02
- **Supabase SQL migrations:** MEDIUM — Trigger pattern verified from Supabase docs; RLS policies standard; specific SQL written by me (needs verify step)
- **Seed script:** MEDIUM — Structure follows Prisma + mock-data.ts; admin API + trigger interaction verified; actual file not yet tested
- **Pitfalls:** HIGH — Each pitfall has inline citation to official docs or code comments
- **Validation architecture:** MEDIUM — Test framework choice is a recommendation (no tests currently); test commands are standard Vitest/Playwright
- **Security domain:** HIGH — ASVS mapping + threat patterns verified against Next 16 data-security.md

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days) — faster changing: `@supabase/ssr` (check 0.10.x patches), Next.js 16.2.x (check for proxy.ts breaking changes). Slower: Prisma 7.5.x, PostGIS patterns.

**Unresolved blockers for planning:** None. A1 (MCP availability) is a runtime verification item for Wave 1, not a planning blocker — Plan B (CLI path) is documented.
