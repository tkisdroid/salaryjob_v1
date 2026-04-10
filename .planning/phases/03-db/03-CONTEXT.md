---
phase: 03-db
phase_name: 프로필·공고 DB 연결
gathered: 2026-04-10
status: Ready for planning
discuss_mode: interactive
decisions_count: 6
---

# Phase 3: 프로필·공고 DB 연결 — Context

**Goal (ROADMAP.md):** Worker/Business가 자기 프로필을 실제로 저장·수정하고, Business가 작성한 공고가 실 DB에서 CRUD로 동작한다

**Requirements in scope:** WORK-01, WORK-02, WORK-03, WORK-04, BIZ-01, BIZ-02, BIZ-03, POST-01, POST-02, POST-03, POST-04, POST-05, POST-06

<domain>
## Phase Boundary

**IN scope — Phase 3:**
- Worker 프로필 CRUD (이름, 닉네임, 사진 업로드, 소개글, 선호 카테고리) + 뱃지/평점/근무 횟수/완료율 read
- Business 프로필 CRUD (상호명, 주소, 카테고리, 로고/이모지, 설명) + 평점/리뷰 수/완료율 read
- Job CRUD (Business가 자기 공고 작성/수정/삭제 + 자기 공고 목록)
- Job 목록 페이지 (Worker용, 비로그인 포함 접근) with 페이지네이션 + **거리 정렬**
- Job 상세 페이지 (예상 수입 계산, 만료 상태 자동 반영)
- Supabase Storage Worker avatar 업로드 1종
- Jobs RLS 재활성화 (Phase 2에서 꺼 두었던 것)
- 공고 만료 자동화 (pg_cron)

**OUT of scope — Phase 4+:**
- Application (원탭 지원), check-in/out, 실근무 시간 — Phase 4
- Business 로고 이미지 업로드 (이모지만 허용) — Phase 4+
- 공고 사진 필드 자체가 없음 (스키마에 없음) — 도입 시 스키마 변경 필요
- 야간 할증 50% 자동 가산 — Phase 4 (SHIFT-03)
- Review 시스템, Settlement — Phase 5
- Worker용 `/settings` 페이지 — Phase 3+ UI polish (UAT gap)
- MobileTabBar 반응형 정책 (desktop 사이드바 vs 탭바 유지) — Phase 3+ UI polish
- 영어 error code → 한국어 UX 카피 통일 — Phase 3+ UX polish

</domain>

<carry_forward>
## Phase 2에서 이월·유지되는 결정

| 출처 | 결정 | Phase 3 적용 |
|------|------|-------------|
| Phase 2 D-01 | Supabase 단일 벤더 (Auth + DB + Storage) | **Phase 3 D-01 동일** — 이미지도 Supabase Storage |
| Phase 2 D-02 | Prisma 7 datasource url/directUrl은 `prisma.config.ts`에 | 유지, 변경 없음 |
| Phase 2 D-03 | Hybrid SSOT (Prisma=모델/리레이션, supabase/migrations=RLS/trigger/extension) | **Phase 3에서 jobs RLS + pg_cron은 `supabase/migrations/*.sql` 에 추가** |
| Phase 2 D-04 | `mock-data.ts`는 seed.ts 경로만 유지 (Phase 5까지) | 유지, Phase 3 UI swap은 02-07에서 이미 완료 |
| Phase 2 D-05 | jobs/applications/reviews는 Phase 2 시점 RLS OFF | **Phase 3 D-02에서 jobs RLS 재활성화** (applications/reviews는 Phase 4/5에서) |
| Phase 2 D-06 | `src/proxy.ts` 낙관적 role 체크 + `src/lib/dal.ts` 엄격 재검증 2중 방어 | 유지, Phase 3 Server Actions도 같은 패턴 |
| Phase 2 D-07 | `.env.local` 12개 키 기본 | 유지, 추가 키 없음 (Storage는 기존 SUPABASE_URL/KEY 사용) |

## Phase 2 자산 (재사용 가능, 다시 만들지 말 것)

**Data layer (완성):**
- `prisma/schema.prisma` — User, WorkerProfile, BusinessProfile, Job, Application, Review 모두 정의 완료
- `src/lib/db/queries.ts` — getJobs, getJobById, getJobsByCategory, getUrgentJobs, getTodayJobs, getApplications, getCurrentWorker, getReviews, getBizApplicantById, getBusinessById, getApplicationById (Phase 3는 여기를 확장 + 페이지네이션 인자 추가)
- `src/lib/db/index.ts` — Prisma client singleton
- `src/generated/prisma/` — Prisma client 생성 결과

**Auth layer (완성):**
- `src/lib/dal.ts` — verifySession / requireWorker / requireBusiness (Phase 3 Server Actions가 바로 사용)
- `src/lib/supabase/{client,server,middleware}.ts` — @supabase/ssr 3-file pattern
- `src/proxy.ts` — Next 16 proxy 낙관적 체크
- `src/app/(auth)/*` — 로그인/가입/role-select 전체 (Phase 3에서 건드릴 일 없음)

**Seed data (라이브 DB):**
- 6 dev 계정 (worker/worker2/business/business2/both/admin @ dev.gignow.com, pw=gignowdev)
- 1 WorkerProfile (kim-jihoon, worker@dev.gignow.com)
- 8 BusinessProfile (8 biz 모두 admin 계정에 묶음 — business1/2는 각자 1개만, admin이 나머지 6개 보유, D-02 1:many 스키마 fix 결과)
- 8 Jobs (PostGIS location point 포함)
- 5 Applications (Phase 4가 확장)
- 0 Reviews

**UI layer (Phase 1 mock UI, Phase 3가 wire할 대상):**
- `src/app/(worker)/home/page.tsx` — 공고 리스트 + 추천 섹션 (02-07에서 queries.ts로 swap됨, Phase 3에서 페이지네이션 + 거리정렬 확장)
- `src/app/(worker)/my/page.tsx` — Worker MY 페이지 (02-07에서 swap, 로그아웃 버튼 0051085에서 추가)
- `src/app/(worker)/posts/[id]/page.tsx` — 공고 상세 (02-07에서 swap)
- `src/app/biz/profile/page.tsx` — Business 프로필 (아직 mock, Phase 3에서 wire 대상)
- `src/app/biz/posts/new/page.tsx` — 새 공고 작성 (mock, Phase 3 CRUD 구현 대상)
- `src/app/biz/posts/page.tsx` — Business 공고 목록 (mock, Phase 3 wire)
- `src/app/biz/posts/[id]/page.tsx` — Business 공고 상세 (mock, Phase 3 wire)
- `src/app/(worker)/my/profile/edit/` — **폴더만 있고 page.tsx 없음**. Phase 3에서 신설 (WORK-01..04)

</carry_forward>

<decisions>
## Implementation Decisions

### D-01 이미지 업로드 저장소
**Decision:** Supabase Storage, 단일 `public` 버킷 + 경로 분리 (`avatars/{user_id}.{ext}`)
**Scope (Phase 3):**
- Worker avatar 업로드 **1종만** (WORK-01 "프로필 사진" 요구사항)
- Business 로고 / 공고 사진은 Phase 4+ 로 이월
**Constraints (Claude 재량으로 세팅):**
- 파일 사이즈 ≤ 5MB
- 허용 포맷: JPEG, PNG, WebP
- 클라이언트 Zod + Server Action 재검증
- 이미지 resize는 Phase 3에서 미루고 클라이언트 미리보기만
**RLS 정책:**
- `storage.objects` 에서 `bucket_id = 'public'` 이고 `name like 'avatars/' || auth.uid() || '%'` 인 row 에 대해서만 INSERT/UPDATE/DELETE 허용
- SELECT는 public (누구나 read)
**Why:** Phase 2 D-01 단일 벤더 철학 유지. Supabase Storage는 Seoul region을 자동 사용. Free tier 1GB/2GB egress는 dev 단계에 충분. @supabase/storage-js는 이미 @supabase/supabase-js 안에 포함.

### D-02 Jobs 테이블 RLS 재활성화
**Decision:** Jobs RLS ON — public SELECT + owner(`auth.uid() = authorId`) 에게만 INSERT/UPDATE/DELETE
**New migration:** `supabase/migrations/{timestamp}_jobs_rls_phase3.sql`
**Policies:**
```sql
-- SELECT: anyone (anon + authenticated)
CREATE POLICY "jobs_public_select" ON public.jobs
  FOR SELECT USING (true);

-- INSERT: only the authoring business
CREATE POLICY "jobs_owner_insert" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = "authorId");

-- UPDATE: only the authoring business
CREATE POLICY "jobs_owner_update" ON public.jobs
  FOR UPDATE USING (auth.uid() = "authorId")
  WITH CHECK (auth.uid() = "authorId");

-- DELETE: only the authoring business
CREATE POLICY "jobs_owner_delete" ON public.jobs
  FOR DELETE USING (auth.uid() = "authorId");

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
```
**Why:** POST-04 "로그인 없이 공고 목록 볼 수 있음" 충족 + defense-in-depth. Phase 2 D-05 의 "Phase 2 시점 OFF"는 의도적이었음 (auth 검증 단순화 위해). Phase 3에서 jobs CRUD가 들어오는 지금이 RLS 켜는 자연스러운 시점.
**Applications/Reviews RLS:** Phase 4/5 scope (각 phase에서 해당 기능 구현 시점에 켬).

### D-03 POST-04 비로그인 공고 목록 접근 경로
**Decision:** 랜딩 페이지 `/` 에서 공고 미리보기 + 전체 목록 (확장)
**How:**
- `src/app/page.tsx` 는 이미 public이고 getJobs({ limit: 3 }) 호출 중 (02-07)
- Phase 3에서: `/` 에 **전체 공고 리스트 + 페이지네이션** 섹션 확장. 상세 클릭 시 `/posts/{id}` 는 public으로 열람 가능 (RLS public SELECT 덕분), 단 "지원" 버튼 클릭 시 `/login?next=/posts/{id}` 로 유도
- 별도 `/jobs` 라우트 신설 **안** 함 (scope 축소)
- `/home` 은 Worker 전용 유지 (로그인 + workerProfile 필요)
**Why:** scope 최소화, 기존 `src/app/page.tsx` 확장. proxy.ts 변경 거의 없음.

### D-04 공고 만료 자동화 (POST-06)
**Decision:** pg_cron + Lazy filter hybrid
**pg_cron 설정:**
```sql
-- supabase/migrations/{timestamp}_jobs_pg_cron_expire.sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-jobs-every-5-min',
  '*/5 * * * *',
  $$
    UPDATE public.jobs
    SET status = 'expired'
    WHERE status = 'active'
      AND ("workDate" + CAST("startTime" AS interval))::timestamptz < now() - interval '5 minutes';
  $$
);
```
**Lazy filter in queries:**
- `src/lib/db/queries.ts` 의 getJobs 등이 항상 `WHERE status = 'active' AND workDate + startTime > now()` 를 추가로 걸어서 pg_cron 지연(최대 5분) gap 동안 만료 공고가 UI에 노출되지 않게 함
**Why:** Supabase 내장, 별도 인프라 없음 (vercel.json + Vercel Cron 불필요), dev/prod 모두 동일 동작. pg_cron은 Supabase 모든 플랜에서 사용 가능.
**Note:** pg_cron 활성화를 위해 Supabase Dashboard → Database → Extensions에서 `pg_cron` 체크 필요 (migration에서 `CREATE EXTENSION`은 실행되지만 Dashboard 확인 권장).

### D-05 페이지네이션 방식
**Decision:** SSR 첫 페이지 + client cursor 무한 스크롤 (Hybrid)
**How:**
- 첫 렌더: `src/app/(worker)/home/page.tsx` 가 SSR에서 `getJobs({ limit: 20 })` 호출 → first paint에 20개 공고 즉시 노출
- 이후: 스크롤 하단 감지 (`IntersectionObserver` + client component) → Server Action 또는 `/api/jobs?cursor={createdAt}_{id}&limit=10` 호출 → 다음 10개 append
- Cursor encoding: `{createdAtISO}_{jobId}` 형태. 초기 cursor는 last item의 값.
**Why:** 첫 페이지 SSR로 SEO + LCP 우수, 이후 client cursor는 부드러운 무한 스크롤 UX. Timee 스타일 완전 매칭.
**Claude 재량으로 결정할 세부:**
- Server Action vs Route Handler (Server Action 권장: /api 없이 cleanly 호출 가능)
- 첫 페이지 limit=20 / 이후 limit=10 (사용자 네트워크 비용 균형)
- Loading skeleton 컴포넌트 (Phase 1 UI 재사용 또는 신설)

### D-06 PostGIS 거리 검색/정렬 (Phase 3에 포함)
**Decision:** Phase 3 scope에 포함
**How:**
- 사용자 위치 수집: `navigator.geolocation.getCurrentPosition()` (client component). 권한 프롬프트 → 성공 시 `{lat, lng}` 상태 저장 → Server Action 호출 시 쿼리 파라미터로 전달
- 쿼리: `getJobs({ limit, cursor, userLat, userLng, radiusKm })` 호출 시 Prisma `$queryRaw` 로 PostGIS 사용:
```sql
SELECT *,
  ST_Distance(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) AS distance_m
FROM public.jobs
WHERE status = 'active'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, $radiusM)
ORDER BY distance_m ASC, "createdAt" DESC
LIMIT $limit;
```
- 권한 거부 fallback:
  1. `navigator.geolocation` 미지원 또는 사용자 거부 → 서울시청 좌표 (37.5665, 126.9780) 기본값 사용 + UI에 "정확한 거리를 위해 위치 권한을 허용해 주세요" 배너 표시
  2. 또는 cursor만 사용 (거리 없이 최신순) — 배너 클릭 시 다시 권한 요청
**Why:** Timee "내 근처 일자리" 핵심 UX. Phase 2에서 PostGIS 준비 끝 (extension 활성, location 필드 존재). Phase 3에서 도입 안 하면 /home 가 단순 리스트가 되어 Timee 철학 훼손.
**Claude 재량:**
- radiusKm 기본값 (예: 10km / 30km / 전체)
- "정확한 거리" 배너 copy 문구
- Geolocation permission 거부 시 첫 실행 UX (모달 vs 상단 바너)

</decisions>

<discretion>
## Claude's Discretion (planner가 알아서 결정)

- **Supabase Storage 버킷 생성 방법**: Dashboard 수동 vs `supabase/migrations/*.sql` (storage.buckets INSERT). SQL 마이그레이션으로 선언해서 재현성 확보 권장.
- **Avatar 업로드 UX**: file input / drag-drop / 카메라 접근 여부. 모바일 UX 고려해서 file input + camera capture attribute.
- **Business 프로필 편집 form의 shadcn 컴포넌트 선택**: Phase 2에서 추가된 shadcn/ui 패턴 그대로 사용. Form + Input + Select + Textarea.
- **Geolocation 거부 fallback 상세**: 서울시청 좌표 기본값 + 상단 배너 권장. 사용자 "다시 허용하기" 클릭 시 재요청.
- **페이지네이션 client 컴포넌트 위치**: `src/components/worker/job-list-infinite.tsx` 같은 전용 컴포넌트로 분리 vs home/page.tsx 에 inline. 전용 컴포넌트 권장.
- **Prisma `$queryRaw` vs `prisma.job.findMany` + `.$extends()`**: 거리 검색은 `$queryRaw` 에서만 PostGIS 함수 호출 가능하므로 `$queryRaw` 필수. findMany는 거리 없는 fallback 경로에서 사용.
- **Loading states**: Suspense boundaries vs client `useTransition`. Phase 1 mock UI에 loading state 있으면 재사용.
- **공고 만료 status "expired" 의 UI 표시**: "만료" 배지 + disabled 스타일. Phase 1 mock에 선례 있는지 확인 후 일관성 유지.

</discretion>

<deferred>
## Phase 3 이후로 이월

### Phase 4 (지원·근무 라이프사이클)
- Application CRUD (원탭 지원, accept/reject)
- Application RLS 활성화
- Check-in/out 실시간 상태
- 야간 할증 50% 자동 가산 (SHIFT-03)
- PostGIS `ST_DWithin` 을 business 측 "현장 지원자 검색" 에도 적용

### Phase 5 (리뷰·정산·목업 제거)
- Review system (양방향)
- Settlement (Toss Payments)
- `src/lib/mock-data.ts` 파일 자체 삭제
- `prisma/seed.ts`의 mock-data import 제거

### Phase 3+ (언제든 끼어들 수 있는 UI polish)
- Worker `/settings` 페이지 신설 (Phase 2 UAT gap)
- `/biz/**` 라우트에 로그아웃 버튼 배치
- 영어 error code → 한국어 UX 카피 통일 (`worker_required` → "근무자 권한 필요" 등)
- MobileTabBar 반응형 정책 (desktop 사이드바 vs 탭바 유지)
- `account_email` Kakao OAuth 동의항목 추가 + 비즈니스 앱 검수 (production 전)
- Supabase Dashboard "Confirm email" ON + 재검증 (production 전)

### Phase 3 scope에서 명시적으로 제외
- Business 로고 이미지 업로드 (이모지/URL 유지)
- 공고 사진 업로드 (스키마에 필드 없음)
- 공고 카테고리 외 태깅 시스템
- Business 인증 배지 (BIZ-01 verified 필드는 seed에서 false 기본)
- Worker 가용 시간 캘린더 (WorkerAvailability 모델 — Phase 4+)
- Job 검색 (keyword) — 거리+카테고리 필터만
- 즐겨찾기/찜 (Phase 4+)

</deferred>

<canonical_refs>
## Canonical References

### 프로젝트 문서 (필독)
- `.planning/PROJECT.md` — 핵심 가치 ("면접 제로·즉시 정산·원탭"), 테크 스택 락, Phase 진행 상황
- `.planning/ROADMAP.md` — Phase 3 Goal + Success Criteria 원문
- `.planning/REQUIREMENTS.md` — WORK-01..04, BIZ-01..03, POST-01..06 상세
- `./CLAUDE.md` — Project-wide rules, mock-data 제약, tech stack 락
- `./AGENTS.md` — Next.js 16 breaking changes 경고

### Phase 2 context (이월·재사용 참조)
- `.planning/phases/02-supabase-prisma-auth/02-CONTEXT.md` — D-01..07 원문
- `.planning/phases/02-supabase-prisma-auth/02-01-SUMMARY.md` — 테스트 인프라 상태, direct-prisma strategy pivot
- `.planning/phases/02-supabase-prisma-auth/02-02-SUMMARY.md` — DB schema 결정, RLS 정책 현황, 5 migration 파일 목록
- `.planning/phases/02-supabase-prisma-auth/02-03-SUMMARY.md` — @supabase/ssr 3-file pattern, proxy.ts, dal.ts helpers
- `.planning/phases/02-supabase-prisma-auth/02-04-SUMMARY.md` — Server Actions 패턴, ALLOWED_NEXT_PATHS allowlist
- `.planning/phases/02-supabase-prisma-auth/02-05-SUMMARY.md` — seed.ts 구조, BusinessProfile 1:many 스키마 fix
- `.planning/phases/02-supabase-prisma-auth/02-07-SUMMARY.md` — queries.ts adapter 목록, types/job.ts, 11 swap 파일
- `.planning/phases/02-supabase-prisma-auth/02-08-SUMMARY.md` — AuthFormState 타입 패턴
- `.planning/phases/02-supabase-prisma-auth/02-HUMAN-UAT.md` — 5/5 pass, 4 deployment gaps 상세
- `.planning/phases/02-supabase-prisma-auth/02-VERIFICATION.md` — 11/11 auto-verification 통과 detail

### 코드 (Phase 3 작업 기준점)
- `prisma/schema.prisma` — 6 models + 5 enums (모든 필드 정의 완료)
- `src/lib/db/queries.ts` — 기존 adapter 목록 (Phase 3가 확장)
- `src/lib/dal.ts` — requireWorker / requireBusiness / verifySession
- `src/lib/supabase/{client,server,middleware}.ts` — Supabase 클라이언트 패턴
- `src/proxy.ts` — Next 16 proxy pattern, protected/public 경로 리스트
- `src/lib/types/job.ts` — Mock* 호환 타입 + clean 별칭
- `src/lib/job-utils.ts` — 순수 함수 (calculateEarnings, formatWorkDate 등)
- `src/lib/mock-data.ts` — seed.ts가 여전히 참조. **수정/삭제 절대 금지** (Phase 5까지 유지)
- `supabase/migrations/20260410000000_enable_postgis.sql` — PostGIS 3.3.7 활성
- `supabase/migrations/20260410000002_user_rls.sql` — User RLS 정책
- `supabase/migrations/20260410000003_profile_rls.sql` — Profile RLS 정책
- `supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql` — **Phase 3 D-02가 이 파일의 jobs 부분을 재활성화**
- `scripts/apply-supabase-migrations.ts` — Supabase SQL runner (direct-prisma path)

### 외부 문서 (Context7 또는 공식 문서 직접 참조 필요)
- **@supabase/storage-js**: https://supabase.com/docs/reference/javascript/storage-createbucket , https://supabase.com/docs/guides/storage
- **Supabase Storage RLS**: https://supabase.com/docs/guides/storage/security/access-control
- **pg_cron**: https://supabase.com/docs/guides/database/extensions/pg_cron
- **PostGIS `ST_DWithin` + `ST_Distance` + `ST_MakePoint`**: https://postgis.net/docs/reference.html
- **Prisma `$queryRaw`**: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
- **Next 16 Server Actions + revalidatePath**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **@supabase/ssr 쿠키 패턴** (이미 Phase 2에서 구현됨): `node_modules/@supabase/ssr/dist/` 참조

### MCP integrations 가용성
- **Supabase MCP**: **미가용** (프로젝트 `lkntomgdhfvxzvnzmlct` 은 linked 계정 밖). Phase 2 direct-prisma 경로 유지.
- **Context7 MCP**: 가용 — 외부 라이브러리 실시간 문서 조회에 활용 권장 (especially `@supabase/storage-js`, `PostGIS`)

</canonical_refs>

## 다음 단계

`.planning/phases/03-db/03-DISCUSS-CHECKPOINT.json` 삭제 예정 (CONTEXT.md가 canonical output이 됨).

**Next command**: `/gsd-plan-phase 3` — researcher + planner spawn, CONTEXT.md + RESEARCH.md → 세부 plan 작성.
