# Phase 2: Supabase·Prisma·Auth 기반 - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Discuss mode:** Delegated (user authorized Claude to decide all gray areas under compatibility + domestic-market constraints)

<domain>
## Phase Boundary

Phase 2는 **실 데이터베이스 연결 + 이중 역할(Worker/Business) 인증 기반**만 책임진다. 이 안에서 Phase 2가 끝나면 다음이 모두 TRUE:

1. 로컬 개발과 Supabase 프리뷰 양쪽에 동일한 Prisma 스키마가 적용되어 있고 PostGIS 확장이 활성화됨
2. 새 사용자가 이메일/비밀번호, 매직 링크, Google OAuth 중 하나로 가입하고 Worker/Business/Both 역할을 선택할 수 있음
3. 로그인한 사용자는 브라우저 새로고침 이후에도 세션 유지, 로그아웃 시 모든 쿠키 제거
4. 보호 경로 미들웨어가 비로그인 사용자를 차단하고, 역할 전용 경로(worker-only, business-only)는 해당 역할을 요구
5. `prisma/seed.ts`로 빈 DB를 현실적인 테스트 데이터(mock-data.ts 값을 DB로 이식)로 채울 수 있음
6. Dev 계정 3개(worker, business, both) 시드로 Phase 1 mock UI를 그대로 로그인 상태에서 브라우징 가능

**OUT of Phase 2 scope (Phase 3+ territory):**
- 프로필 수정 UI/API (Phase 3 — WORK, BIZ)
- 공고 CRUD (Phase 3 — POST)
- 지원·체크인·체크아웃 (Phase 4 — APPL, SHIFT)
- 리뷰 제출·정산 집계 (Phase 5 — REV, SETL, DATA-05)
- AI 매칭, Toss 결제, Push 알림, 고급 검색, 채팅 (v2 out-of-scope)

**Boundary 지키는 법**: mock-data.ts는 Phase 2 동안 **그대로 존재**한다 (Phase 5에서 제거). Phase 2가 추가하는 것은 Supabase/Prisma/Auth 인프라이지 기존 UI 경로를 DB로 바꾸는 작업이 아니다.

</domain>

<decisions>
## Implementation Decisions

### D-01 | Auth 방식 조합

**결정:** Phase 2에 포함 = **Email/Password + Magic Link + Google OAuth**. **카카오 소셜 로그인은 Phase 2 말미에 추가 (Supabase custom OIDC provider)**. 네이버 소셜과 SMS OTP는 v2.

**근거:**
- Supabase Auth가 Email/Password, Magic Link, Google OAuth를 **내장 지원**하므로 Phase 2 범위 안에서 하루 내 구성 가능.
- 카카오는 한국 사용자 기대치의 핵심(이용 편의). Supabase가 네이티브로 지원하지 않지만 Custom OAuth provider로 가능. Phase 2 내에서 추가하되, 기본 3종이 먼저 작동한 뒤 덧붙인다.
- 네이버는 사용자 기반이 카카오보다 작고 Custom provider 구현 부담 대비 가치가 낮아 v2.
- SMS OTP는 국내에서 Twilio/Vonage 같은 외부 통신사 연동이 필요하고 건당 비용·스팸 필터링 이슈가 있어 Phase 2 범위 밖.
- Google은 국내에서도 YouTube/Gmail 계정으로 흔하며 Supabase 기본 provider라 설정 비용이 거의 0.
- Apple 로그인은 iOS 웹뷰 요구사항이 생길 때(PWA iOS 앱 등록 시점) 도입 — Phase 2 스코프 아님.

**적용 범위:**
- AUTH-01~04 (회원가입/세션/로그아웃)는 Email/Password + Magic Link + Google + 카카오 4종 모두 동일하게 다룸.
- AUTH-05~07 (middleware 보호, 역할 전용 경로)는 provider 종류와 무관.

### D-02 | 기존 `prisma/schema.prisma` 처리

**결정:** **Phase 2 범위에 필요한 6개 핵심 모델 + 필수 enum만 남기고 나머지는 Phase 3+ 도입 시점으로 격리**. 삭제가 아닌 "보류" — 기존 18KB schema는 참고용으로 `prisma/schema.legacy.prisma.txt`로 이름 변경해 보존.

**Phase 2 스키마의 최소 세트:**
- `User` (Supabase auth.users와 1:1 관계, email/phone/createdAt/role)
- `WorkerProfile` (name, nickname, avatar, bio, preferredCategories, badgeLevel, rating, totalJobs, completionRate)
- `BusinessProfile` (name, category, logo, address, lat, lng, rating, reviewCount, completionRate, verified)
- `Job` (businessId, title, category, description, hourlyPay, transportFee, workDate, startTime, endTime, workHours, headcount, lat, lng, status)
- `Application` (jobId, workerId, status, appliedAt, checkInAt, checkOutAt, actualHours, earnings, reviewGiven, reviewReceived)
- `Review` (applicationId, direction, rating, tags, comment, createdAt)

**필수 enum:**
- `UserRole` (WORKER, BUSINESS, BOTH) — 기존 EMPLOYER는 BUSINESS로 리네이밍(Phase 1 UI 일관성)
- `JobCategory` (food, retail, logistics, office, event, cleaning, education, tech — mock-data.ts와 동일 8종)
- `ApplicationStatus` (confirmed, in_progress, checked_in, completed, cancelled)
- `ReviewDirection` (worker-to-business, business-to-worker)
- `BadgeLevel` (newbie, bronze, silver, gold, platinum, diamond — mock-data.ts와 동일)

**Phase 3+ 복귀 예정 (legacy schema에서 가져올 것들):**
- TagType, TransportType, AvailabilityStatus, PartnershipLevel → Phase 3 프로필 고도화 시점
- PostType, LocationType, ScheduleType, PayType → Phase 3 공고 고도화 시점
- Chat, Settlement 상세 필드 → Phase 4/5

**근거:**
- 기존 schema가 Mar-27에 작성된 탐색적 스캐폴드이고, Phase 1 mock-data는 이 스키마의 복잡한 하위 필드 중 일부만 사용. 전부 마이그레이션하면 Phase 2가 실제 DB 왕복 기반 검증이 아니라 스키마 변환 작업으로 변한다.
- 관리 편의: "보류"해서 legacy를 보존하면 나중에 필드 추가 시 원본 결정 이유를 참조 가능. Phase 3 리뷰 시 복원할 것을 명확히 표기.
- Prisma + Supabase가 둘 다 점진적 enum 추가를 허용하므로 처음부터 최대치를 정의할 필요 없음.

### D-03 | Prisma ↔ Supabase 마이그레이션 전략

**결정:** **하이브리드** — Prisma Migrate를 **테이블·관계·enum의 single source of truth**로, Supabase SQL 마이그레이션을 **PostGIS 확장·RLS 정책·auth 트리거 전용**으로 분리. 실제 적용은 **Supabase MCP 서버**로 Claude가 직접 수행.

**파일 구조:**
```
prisma/
├── schema.prisma              # Prisma가 관리하는 모델 source of truth
├── migrations/                # prisma migrate dev가 생성
└── seed.ts                    # D-04 참조

supabase/
├── config.toml                # supabase init 결과
└── migrations/                # Supabase CLI 관리 (RLS·PostGIS·auth trigger)
    ├── 00000000000000_enable_postgis.sql
    ├── 00000000000001_auth_trigger.sql
    └── 00000000000002_rls_policies.sql
```

**실행 순서 (Phase 2 실행 계획에 그대로 반영):**
1. Supabase 프로젝트 생성 (Supabase MCP `create_project`) + env 변수(`.env.local`) 수동 기입
2. `prisma migrate dev --name init_phase2` → 6개 테이블 생성
3. Supabase MCP `apply_migration`으로 PostGIS 확장 활성화 SQL 적용
4. Supabase MCP `apply_migration`으로 auth.users → public.User 트리거 생성
5. Supabase MCP `apply_migration`으로 Phase 2 범위 RLS 정책 적용 (D-05 참조)
6. `prisma db seed` (D-04)
7. 로컬 `next dev` + Supabase 프리뷰 모두에서 로그인 루프 검증

**호환성 체크 (사용자 요구):**
- **Supabase**: MCP 서버, CLI, Prisma Postgres adapter 모두 공식 지원
- **Vercel**: `@supabase/ssr` 공식 패키지로 SSR 완벽 호환, Marketplace integration 제공
- **GCP**: 중립 — Supabase가 AWS 기반이지만 앱은 Vercel edge에서 GCP 서비스(예: Cloud Storage for blobs)와 병렬 호출 가능. 향후 파일 저장소를 GCS로 분리해도 DB 경로는 변경 불필요.

**PostGIS 활성화 위치:** Prisma 스키마에 `extensions = [postgis]` 선언(이미 legacy schema에 존재) + Supabase 마이그레이션 SQL에서 `CREATE EXTENSION IF NOT EXISTS postgis;` 명시적 실행. 이중 안전.

**근거:**
- Prisma 단독: RLS·auth trigger 지원 약함, Supabase 고유 기능 누락
- Supabase 단독: 개발자 UX가 Prisma보다 덜 익숙, TypeScript 타입 자동 생성은 있지만 relation query builder가 Prisma 수준은 아님
- 하이브리드: 각자 잘하는 영역에서 작동. 익숙한 Prisma UX + Supabase 고유 기능 + Claude MCP 자동 적용

### D-04 | Seed 데이터 전략

**결정:** `prisma/seed.ts`에 **mock-data.ts의 값을 그대로 이식**. Phase 1 UI에서 검증한 동일 데이터가 Phase 2 이후 실 DB에서도 재현되어야 회귀 테스트가 유효.

**시드 구조:**
- **사용자 계정 6개 (Dev/테스트용):**
  - `worker+test@gignow.dev` (WORKER, email+password: `gignowdev`) — mock-data의 "김지훈" 프로필 이식
  - `worker2+test@gignow.dev` (WORKER, 빈 프로필)
  - `business+test@gignow.dev` (BUSINESS, 스타벅스 역삼점 연결)
  - `business2+test@gignow.dev` (BUSINESS, 쿠팡 송파 물류센터 연결)
  - `both+test@gignow.dev` (BOTH, 양쪽 프로필 가짐 — BOTH 역할 검증용)
  - `admin+test@gignow.dev` (ADMIN, Phase 2에서는 권한 차별화 안 함)
- **Business 8개:** mock-data.ts MOCK_BUSINESSES를 그대로
- **Job 8개:** mock-data.ts MOCK_JOBS 그대로 (workDate는 seed 실행 시점에 상대 계산)
- **Application 5개:** mock-data.ts MOCK_APPLICATIONS 그대로 (app-1~app-past-3)
- **Review:** 없음 — Phase 5에서 작성, Phase 2 seed는 비워둠 (리뷰 모델은 존재하지만 빈 상태)

**환경별 시드 동작:**
- 로컬 dev: `npx prisma db seed` 명령으로 수동 실행
- Supabase 프리뷰 branch: `supabase migration new seed_dev_data` + Supabase CLI로 브랜치 생성 시 자동 적용
- 프로덕션: seed 스크립트는 **절대** 프로덕션에서 실행되지 않음. `process.env.NODE_ENV === 'production'`이면 즉시 throw.

**근거:**
- 새 seed를 쓰면 Phase 1 UI와 Phase 2 DB 화면이 달라져서 디자인 회귀 원인 파악이 어려움
- mock-data.ts의 "스타벅스 역삼점", "쿠팡 송파 물류센터" 같은 한국 지역·브랜드 이름이 이미 현실감 있게 짜여 있어 재활용 가치 높음
- 테스트 계정 도메인을 `@gignow.dev`로 통일하면 정규식 필터링/스팸 방지 로직 작성 용이 (관리 편의)

### D-05 | RLS Phase 2 범위

**결정 (Gray area가 아니지만 D-03과 연쇄로 잠가둠):** Phase 2에서는 **Auth 테이블과 프로필 read-own 정책만** 활성화. 공고/지원/리뷰 테이블의 RLS 정책은 Phase 3/4/5에서 각 기능과 함께 도입.

**Phase 2 RLS 정책 (최소):**
- `User` — `auth.uid() = id`에 대해 SELECT/UPDATE 허용, 그 외 deny
- `WorkerProfile` — `auth.uid() = userId`에 대해 ALL 허용, 다른 사용자는 SELECT만 허용
- `BusinessProfile` — `auth.uid() = userId`에 대해 ALL 허용, 다른 사용자는 SELECT만 허용
- `Job`, `Application`, `Review` — **Phase 2 종료 시점까지 RLS disabled** (Phase 3부터 점진 도입)

**Service Role 사용 방침:** seed 스크립트와 Phase 4 체크인 계산 등 서버 전용 작업은 `SUPABASE_SERVICE_ROLE_KEY` 사용 — 클라이언트 번들에 절대 포함 금지 (`.env.local` → Vercel production env에만 존재).

### D-06 | Next.js 16 Proxy·SSR 패턴

**결정 (잠금):** `@supabase/ssr` 공식 패턴 3-file 구조 채택. Next.js 16이 `middleware.ts`를 `proxy.ts`로 이름 변경한 것을 반영.

**파일:**
```
src/lib/supabase/
├── client.ts       # 브라우저/클라이언트 컴포넌트용 createBrowserClient
├── server.ts       # 서버 컴포넌트·Server Actions·Route Handlers용 createServerClient
└── middleware.ts   # proxy.ts에서 호출하는 세션 새로고침 헬퍼

src/proxy.ts        # Next 16 proxy (구 middleware), 모든 경로에서 세션 리프레시
```

**역할 기반 경로 보호:** `src/proxy.ts`에서 세션 확인 후, 경로 prefix(`/worker`, `/biz`, `/my`, `/home` 등)와 user.role을 매칭. 권한 없으면 `/login?next=...`로 redirect.

**근거:** Vercel의 Next.js 공식 가이드(`vercel:nextjs` skill)와 Supabase 공식 예제의 교집합. GCP/Vercel/Supabase 세 벤더 모두에서 검증된 패턴.

### D-07 | 환경 변수 & 시크릿 관리

**결정 (잠금):** 다음 env 변수를 `.env.local` + Vercel Dashboard 양쪽에 동일하게 세팅.

```
# 공개 (client 번들 포함 OK)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key>

# 서버 전용 (절대 클라이언트 금지)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgres://...?pgbouncer=true          # Prisma 연결 풀링용
DIRECT_URL=postgres://...                            # Prisma migrate dev/deploy용

# OAuth
SUPABASE_AUTH_GOOGLE_CLIENT_ID=<>
SUPABASE_AUTH_GOOGLE_SECRET=<>
SUPABASE_AUTH_KAKAO_CLIENT_ID=<>                     # Phase 2 후반
SUPABASE_AUTH_KAKAO_SECRET=<>                        # Phase 2 후반
```

**Vercel 배포:** `vercel env pull .env.local` 워크플로를 Phase 2 완료 시점에 정착. Phase 2 PR에 `.env.example` 템플릿 포함.

### Claude's Discretion

아래 항목은 D-01~D-07이 확정되어 Planner/Researcher가 판단해도 무방:
- Prisma `prisma-client` vs 기본 generator 선택 (성능 비교로 결정)
- RLS 정책 작성 시 Supabase PostgreSQL 함수 helper(`auth.uid()`, `auth.jwt()`) 활용 방식
- 세션 쿠키 이름·수명 (Supabase 기본값 유지가 유력)
- Seed 스크립트의 dev 계정 password 생성 방식 (고정 vs 환경변수)
- 프로필 이미지 업로드는 Phase 2에서 제외, Phase 3 또는 별도 phase에서 GCP Cloud Storage 또는 Supabase Storage로 결정 (사용자 요구: GCP 호환성 → Phase 3 재검토)

### Folded Todos

없음 — `todo match-phase 2` 결과 0건

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level specs
- `.planning/PROJECT.md` — Core value (면접 제로·즉시 정산), 제약(Supabase/Prisma/Tailwind), key decisions 5건
- `.planning/REQUIREMENTS.md` §Authentication + §Data Layer — AUTH-01..07, DATA-01..04 (Phase 2 스코프)
- `.planning/REQUIREMENTS.md` §Traceability — Phase 매핑 테이블
- `.planning/ROADMAP.md` Phase 2 상세 — Goal + 5 success criteria
- `.planning/STATE.md` — Phase 2 현재 위치, Open TODOs, Known Risks (Clerk/Toss 문서 드리프트 해소 포함)

### Codebase maps
- `.planning/codebase/STACK.md` — 실제 설치된 스택 (Next 16.2.1, Prisma 7.5, @prisma/adapter-pg)
- `.planning/codebase/ARCHITECTURE.md` — **주의: aspirational 내용(Clerk/Toss/push)이 섞여있음. 실제 설치 기준은 STACK.md**
- `.planning/codebase/CONVENTIONS.md` §TypeScript + §Component Conventions — 서버 컴포넌트 기본, 절대경로 `@/` import
- `.planning/codebase/STRUCTURE.md` — 라우트 그룹 (auth)/(worker)/biz 구조

### Existing code to adapt
- `prisma/schema.prisma` — legacy 18KB 스캐폴드, D-02에 따라 `prisma/schema.legacy.prisma.txt`로 보존 후 재설계
- `src/lib/mock-data.ts` — D-04 seed 이식의 원본 소스 (Phase 5 종료까지 유지)
- `src/lib/db/index.ts` — 기존 Prisma client export (재사용 검토)
- `src/lib/actions/*.ts` — Mar-27 생성된 Server Actions 스캐폴드 (Phase 2는 건드리지 않음, Phase 3부터 재작성)
- `src/app/layout.tsx` — Root layout, AuthProvider 삽입 지점

### External docs (Context7/공식 문서로 실시간 확인)
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs — `@supabase/ssr` 3-file 패턴
- Supabase + Prisma: https://supabase.com/partners/integrations/prisma — 공식 통합 가이드
- Supabase Kakao OAuth (custom provider): https://supabase.com/docs/guides/auth/social-login — Phase 2 말미 추가 시 참조
- Next.js 16 proxy.ts 변경: https://nextjs.org/docs (middleware → proxy rename)
- Vercel Marketplace Supabase: https://vercel.com/marketplace/supabase — Vercel env 자동 provisioning
- Prisma with Supabase PostGIS: https://www.prisma.io/docs/orm/overview/databases/postgresql — `previewFeatures = ["postgresqlExtensions"]`

### MCP integrations available
- **Supabase MCP** (`mcp__claude_ai_Supabase__*`) — `create_project`, `apply_migration`, `execute_sql`, `list_tables`, `get_advisors` 등 Claude가 직접 DB 작업 수행 가능. D-03 실행 순서에서 활용.
- **Context7** (`mcp__context7__*`) — Supabase/Prisma 최신 API 문서 실시간 조회

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`prisma/schema.prisma` (legacy 18KB)** — Enum 정의(UserRole, BadgeLevel, JobCategory 계열) 상당수가 Phase 1 mock-data.ts 타입과 호환. 이름만 일부 조정해서 Phase 2 최소 세트로 축소.
- **`src/lib/mock-data.ts`** — 8 businesses, 8 jobs, 5 applications 한국 시장 데이터. Phase 2 seed 원본 (D-04).
- **`src/lib/db/index.ts`** — 633 bytes의 Prisma client 초기화 모듈. 그대로 활용 또는 Supabase adapter 주입으로 확장.
- **`src/lib/utils.ts` `cn()`** — Phase 2 UI 수정이 거의 없지만 auth 페이지 마이너 수정 시 재사용.

### Established Patterns
- **App Router 라우트 그룹**: `(auth)` / `(worker)` / `biz` — Phase 2는 `(auth)/login`, `(auth)/signup`, `(auth)/role-select`를 실제 Supabase client로 wire하고 `biz/` 경로에 proxy.ts로 role check 추가.
- **Server Components 기본**: Phase 1 코드 전반이 async Server Component 패턴. `@supabase/ssr` `createServerClient`가 이와 정확히 맞물림.
- **절대 경로 import**: `@/lib/...`, `@/components/...` — Phase 2 신규 파일도 동일 관례.
- **shadcn/ui + Tailwind v4**: 이미 로그인/회원가입 페이지 스타일 존재 — 인프라 wire-up만 필요, UI 재작업 없음.

### Integration Points
- **`src/app/layout.tsx`**: Supabase server client로 session 확인 후 AuthContextProvider (필요 시) 주입 지점.
- **`src/proxy.ts` (신규)**: Next 16 proxy 파일. `middleware.ts`로 만들지 말 것.
- **`src/app/(auth)/login/page.tsx` / `signup/page.tsx` / `role-select/page.tsx`**: 기존 페이지는 현재 mock 동작. Supabase `signInWithPassword`, `signInWithOtp`, `signInWithOAuth` 호출로 교체.
- **`src/app/(worker)/layout.tsx` / `src/app/biz/layout.tsx`**: 서버 컴포넌트에서 user.role 검증 (proxy에서 1차 차단 + layout에서 2차 확인).

### 드리프트 처리
- `.planning/codebase/ARCHITECTURE.md`에 "Clerk (webhook integration at /api/webhooks/clerk)", "Toss payments webhook" 등 미설치 언급 남아있음. Phase 2 housekeeping 작업으로 **해당 섹션을 현재 실제 상태(Supabase Auth 예정, 결제 미구현)로 수정** → 문서 드리프트 해소.

</code_context>

<specifics>
## Specific Ideas

- **"스타벅스 역삼점" 패턴 유지**: D-04에서 mock-data.ts의 현실적 한국 지명·브랜드 이름을 seed로 그대로 가져간다. 새로운 fake 데이터를 만들지 않음.
- **`@gignow.dev` 도메인 컨벤션**: 테스트 계정은 모두 `<role>+test@gignow.dev` 형식. 실 가입 사용자와 시각적 구분.
- **BOTH 역할 검증**: Timee 벤치마크 원칙에 따라 한 사용자가 Worker와 Business 동시 역할 가능해야 함. `both+test@gignow.dev` 계정으로 Phase 2에서 반드시 E2E 검증.
- **Supabase MCP 활용**: Claude가 직접 `create_project` / `apply_migration`을 호출해 사용자 손을 거치지 않는 자동화 지향. OAuth secret 같은 사용자 입력 필요 값만 질문.
- **Kakao는 Phase 2 말미 "보너스"**: 기본 3종(Email/Password, Magic Link, Google)이 통과한 후 Kakao 추가. Phase 2 plan에서 Kakao는 마지막 plan으로 분리.

</specifics>

<deferred>
## Deferred Ideas

### Phase 3로 이월
- 프로필 이미지 업로드 (Supabase Storage vs GCS 결정 포함)
- WorkerProfile 고도화 필드(availability calendar, 보유 자격증 등)
- BusinessProfile 인증 배지·추가 문서
- `src/lib/actions/*.ts` 레거시 스캐폴드 재작성

### Phase 4로 이월
- 체크인 위치 검증 로직 (PostGIS ST_DWithin)
- 야간 할증 계산 (이미 Phase 1 mock에 존재, Phase 4에서 서버 함수로 이관)
- RLS 정책 확장(Application, Job)

### Phase 5로 이월
- Review uniqueness constraint와 trigger
- Settlement 집계 view
- mock-data.ts 삭제 + grep 검증

### v2 (로드맵 밖)
- 네이버 OAuth provider (custom OIDC)
- SMS OTP (Twilio/Vonage 통신사 연동)
- Apple Sign-in (iOS PWA 배포 시점)
- Row-Level Security를 완전한 multi-tenant 수준으로 확장
- Vercel Blob vs Supabase Storage vs GCS 파일 저장소 벤치마크 (사용자 "GCP 호환" 요구를 실제 사용 시점에 재평가)

### Reviewed Todos (not folded)
없음 — 매칭된 todo 0건

</deferred>

---

*Phase: 02-supabase-prisma-auth*
*Context gathered: 2026-04-10 (discuss mode: delegated decisions)*
*Decision authority: User explicitly authorized Claude to decide all gray areas under compatibility + domestic-market constraints. See memory/feedback_autonomous_decisions.md*
