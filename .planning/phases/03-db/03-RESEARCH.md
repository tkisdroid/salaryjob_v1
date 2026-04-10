---
phase: 03-db
phase_name: 프로필·공고 DB 연결
researched: 2026-04-10
status: ready-for-planning
research_areas_count: 10
confidence: HIGH
---

# Phase 3: 프로필·공고 DB 연결 — Research

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01**: Supabase Storage, 단일 `public` 버킷, 경로 `avatars/{user_id}.{ext}`. Worker avatar 1종만 (biz logo/공고 사진 Phase 4+ 이월). 5MB 한도, JPEG/PNG/WebP, Zod + Server 재검증.
- **D-02**: Jobs RLS ON — public SELECT, owner(`auth.uid()=authorId`) INSERT/UPDATE/DELETE. 새 `supabase/migrations/{ts}_jobs_rls_phase3.sql`. Applications/Reviews RLS Phase 4/5까지 OFF 유지.
- **D-03**: POST-04 비로그인 접근은 `/` 랜딩 확장. 별도 `/jobs` 라우트 없음, `/home` 공개화 없음. `/posts/{id}` public read (RLS), "지원" 클릭 → `/login?next=/posts/{id}`.
- **D-04**: pg_cron `*/5 * * * *` + Lazy filter hybrid. UI 쿼리도 `status='active' AND workDate+startTime > now()` 방어 필터 추가.
- **D-05**: SSR 첫 페이지 20개 + client cursor 무한 스크롤 10개씩. Cursor = `{createdAtISO}_{jobId}`. IntersectionObserver.
- **D-06**: PostGIS `ST_DWithin` + `ORDER BY ST_Distance`. `navigator.geolocation` 권한 요청. 거부 시 서울시청(37.5665, 126.9780) fallback. Prisma `$queryRaw` 필수.

### Claude's Discretion

- Supabase Storage 버킷 생성 방법 (SQL migration 권장)
- Avatar 업로드 UX (file input + camera capture)
- Business 프로필 편집 form의 shadcn 컴포넌트 선택
- Geolocation 거부 fallback 상세 (서울시청 + 상단 배너)
- 페이지네이션 client 컴포넌트 위치 (`src/components/worker/job-list-infinite.tsx`)
- Prisma `$queryRaw` vs findMany (거리 검색 `$queryRaw` 필수, fallback은 findMany)
- Loading states (Suspense vs useTransition)
- 만료 공고 UI ("만료" 배지 + disabled 스타일)
- radiusKm 기본값, "정확한 거리" 배너 copy
- 거리 권한 거부 시 모달 vs 상단 배너

### Deferred Ideas (OUT OF SCOPE)

- Application CRUD, Application RLS — Phase 4
- Business 로고 이미지 업로드 — Phase 4+
- 야간 할증 50% 자동 가산 (SHIFT-03) — Phase 4
- Review 시스템, Settlement — Phase 5
- Worker `/settings` 페이지, MobileTabBar 반응형 — Phase 3+ UI polish
- Worker 가용 시간 캘린더 — Phase 4+
- 즐겨찾기/찜, 키워드 검색 — Phase 4+
- Business 인증 배지, `mock-data.ts` 삭제 — Phase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | Worker는 이름, 닉네임, 프로필 사진, 소개글을 등록할 수 있다 | 연구 영역 1 (Storage), 5 (Server Actions), 8 (Form 패턴) |
| WORK-02 | Worker는 선호 카테고리(food, retail 등)를 저장할 수 있다 | 연구 영역 5 (Server Actions — updateWorkerProfile) |
| WORK-03 | Worker는 뱃지 레벨, 평점, 근무 횟수, 완료율을 프로필에서 볼 수 있다 | queries.ts 확장 (getCurrentWorker read) |
| WORK-04 | Worker는 본인 계정의 프로필만 수정할 수 있다 (RLS) | Phase 2 profile_rls.sql 이미 적용 (carry-forward) |
| BIZ-01 | Business는 상호명, 주소, 카테고리, 로고/이모지, 설명을 등록할 수 있다 | 연구 영역 5 (Server Actions), 8 (Form 패턴) |
| BIZ-02 | Business는 평점, 리뷰 수, 완료율을 프로필에서 볼 수 있다 | queries.ts 확장 (getBusinessProfile read) |
| BIZ-03 | Business는 본인 계정의 프로필만 수정할 수 있다 (RLS) | Phase 2 profile_rls.sql 이미 적용 (carry-forward) |
| POST-01 | Business는 공고 작성(시급·교통비·인원·주소·드레스코드·준비물)을 저장 | 연구 영역 5 (Server Actions — createJob) + Prisma schema stub 해소 |
| POST-02 | Business는 자신의 공고 목록을 본다 | queries.ts 확장 (getJobsByBusiness), D-02 RLS |
| POST-03 | Business는 공고를 수정하거나 삭제할 수 있다 | 연구 영역 5 (Server Actions — updateJob, deleteJob), D-02 RLS |
| POST-04 | Worker는 로그인 없이 공고 목록을 페이지네이션으로 볼 수 있다 | D-03 랜딩 확장, D-02 public SELECT RLS, D-05 cursor |
| POST-05 | Worker는 공고 상세에서 모든 정보(예상 수입 포함)를 확인할 수 있다 | queries.ts getJobById + job-utils calculateEarnings |
| POST-06 | 공고는 workDate/startTime이 지나면 자동으로 "만료" 상태로 전환 | 연구 영역 2 (pg_cron), D-04 lazy filter |
</phase_requirements>

---

## Executive Summary

Phase 3에서 플래너가 반드시 적용해야 할 10개의 핵심 발견:

1. **Next.js 16 `revalidatePath`는 동일 API, `revalidateTag`는 서명 변경**: `revalidatePath(path)` 그대로 사용. `revalidateTag`는 두 번째 인수 `'max'` 필수 (`revalidateTag('jobs', 'max')`). 단일 인수 형태는 deprecated — TypeScript 오류 발생. Server Action 내 즉시 반영에는 `updateTag()` 사용. [VERIFIED: node_modules/next/dist/docs]

2. **Supabase Storage 버킷 생성은 SQL migration으로**: `INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true)` 한 줄. RLS 정책은 `storage.foldername(name)[1] = auth.uid()::text` 패턴 사용 (NOT `name LIKE 'avatars/' || auth.uid() || '%'`). [VERIFIED: Supabase 공식 문서]

3. **Server Action 업로드 주의: Next.js body limit 기본 1MB**: 5MB 파일을 Server Action FormData로 직접 받을 경우 Next.js 기본 1MB body 제한에 걸릴 수 있음. `next.config.ts`의 `experimental.serverActions.bodySizeLimit: '5mb'` 설정 필수. 또는 signed URL 방식(클라이언트가 Supabase Storage에 직접 업로드)으로 우회. [VERIFIED: WebSearch + Supabase 문서]

4. **pg_cron `$$` dollar-quoting 문법 확인 완료**: `SELECT cron.schedule('job-name', '*/5 * * * *', $$SQL BODY$$)` 형태. Supabase 호스티드 환경에서는 pg_cron 이미 설치됨 (`CREATE EXTENSION IF NOT EXISTS pg_cron` 으로 충분). `cron.unschedule('job-name')` 으로 멱등성 보장. pg_cron은 기본 UTC 타임존으로 동작. [VERIFIED: pg_cron GitHub 공식 문서]

5. **PostGIS `$queryRaw`에 GIST 인덱스 누락**: Phase 2 migration SQL에 `jobs.location` 컬럼에 대한 GIST 인덱스가 없음. `ST_DWithin`은 GIST 인덱스 없이도 동작하지만 full table scan 발생. Phase 3 migration에 `CREATE INDEX jobs_location_gist_idx ON jobs USING GIST (location)` 추가 필요. [VERIFIED: migration SQL grep 확인]

6. **Prisma 7 `$queryRaw` 타입 안전 사용법**: tagged template literal `prisma.$queryRaw<T[]>\`...\`` 형태. 변수는 `${lng}` 직접 삽입 (Prisma가 prepared statement로 처리). 컬럼명 등 identifier는 변수로 주입 불가 (SQL injection 위험). 반환 타입에 `distance_m` 추가 포함 custom interface 정의 필요. [VERIFIED: Prisma 공식 문서]

7. **jobs 테이블 Phase 2 stubbed 컬럼 해소 필요**: `queries.ts`의 `adaptJob()`에서 `duties: []`, `requirements: []`, `dressCode: ""`, `whatToBring: []`, `tags: []`가 Phase 2 stub으로 남아있음. Phase 3 `createJob` Server Action이 이 필드들을 DB에 저장하려면 Prisma schema에 컬럼을 추가하거나 — 아니면 Job 테이블이 아닌 text parsing 방식 결정 필요. 현재 biz/posts/new/page.tsx의 5-step form이 이미 이 필드들을 수집하는 UI를 갖추고 있음. [VERIFIED: codebase 직접 확인]

8. **무한 스크롤은 SSR 첫 20개 + Client Wrapper 패턴**: `<JobListInfinite initialJobs={jobs} initialCursor={nextCursor}>` Client Component wrapping 패턴. 서버에서 첫 20개 렌더링 후 Client Component가 sentinel div의 IntersectionObserver로 `loadMore` Server Action을 호출해 append. `useTransition` + `useOptimistic` React 19 조합 권장. [ASSUMED — 패턴 기반, 구체 구현은 확인 필요]

9. **navigator.geolocation은 항상 User Interaction 후 호출**: 페이지 로드 시 자동 호출 금지 (브라우저 UX 가이드라인 위반). "내 근처 일자리 보기" 버튼 클릭 이벤트 기반 호출. 권한 거부 시 `서울시청(37.5665, 126.9780)` fallback + 상단 배너 노출. `enableHighAccuracy: false, timeout: 5000, maximumAge: 60000` 설정으로 빠른 위치 획득. [VERIFIED: MDN Web API 동작 원칙]

10. **Phase 2 profile RLS는 이미 active**: `supabase/migrations/20260410000003_profile_rls.sql`이 `worker_profiles`와 `business_profiles`에 RLS를 설정함. WORK-04, BIZ-03은 추가 migration 없이 이미 충족됨. Phase 3는 `jobs` RLS만 새로 켜면 됨. [VERIFIED: 02-02-SUMMARY.md + migration files]

---

## Validation Architecture

`nyquist_validation: true` — Vitest 기반 테스트 인프라 이미 구축 완료 (Phase 2).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/data/` |
| Full suite command | `npx vitest run` |
| E2E | Playwright (`npx playwright test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | Worker 프로필 저장 (name, nickname, avatar URL, bio) | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 |
| WORK-02 | preferredCategories 저장/조회 | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 |
| WORK-03 | badge/rating/totalJobs read-only 노출 | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 |
| WORK-04 | 타 사용자 프로필 수정 불가 (RLS) | integration | `npx vitest run tests/profile/worker-profile.test.ts` | ❌ Wave 0 |
| BIZ-01 | Business 프로필 저장 | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 |
| BIZ-02 | rating/reviewCount/completionRate read | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 |
| BIZ-03 | 타 사용자 biz 프로필 수정 불가 | integration | `npx vitest run tests/profile/biz-profile.test.ts` | ❌ Wave 0 |
| POST-01 | Job 생성 DB 저장 | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 |
| POST-02 | Business 자기 공고 목록 조회 | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 |
| POST-03 | Job 수정/삭제 (owner only) | integration | `npx vitest run tests/jobs/job-crud.test.ts` | ❌ Wave 0 |
| POST-04 | 비로그인 공고 목록 접근 | e2e/smoke | `npx playwright test tests/e2e/public-job-list.spec.ts` | ❌ Wave 0 |
| POST-05 | 공고 상세 예상 수입 계산 | unit | `npx vitest run tests/utils/job-utils.test.ts` | ❌ Wave 0 |
| POST-06 | 만료 자동 전환 (pg_cron + lazy filter) | integration | `npx vitest run tests/jobs/job-expiry.test.ts` | ❌ Wave 0 |
| D-01 | Storage avatar 업로드/조회 | integration | `npx vitest run tests/storage/avatar-upload.test.ts` | ❌ Wave 0 |
| D-06 | PostGIS ST_DWithin 거리 필터 동작 | integration | `npx vitest run tests/jobs/postgis-distance.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `tests/profile/worker-profile.test.ts` — WORK-01..04
- [ ] `tests/profile/biz-profile.test.ts` — BIZ-01..03
- [ ] `tests/jobs/job-crud.test.ts` — POST-01..03
- [ ] `tests/jobs/job-expiry.test.ts` — POST-06
- [ ] `tests/jobs/postgis-distance.test.ts` — D-06
- [ ] `tests/storage/avatar-upload.test.ts` — D-01
- [ ] `tests/utils/job-utils.test.ts` — POST-05 (calculateEarnings는 이미 pure function, 테스트 작성 용이)
- [ ] `tests/e2e/public-job-list.spec.ts` — POST-04

---

## Research Area 1: Supabase Storage 업로드 패턴

### 1-1. 버킷 생성 (SQL Migration)

[VERIFIED: Supabase 공식 문서 Creating Buckets]

```sql
-- supabase/migrations/{timestamp}_storage_setup.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;  -- 멱등성 보장
```

`public: true`로 설정 시 버킷 내 모든 파일이 `getPublicUrl()`로 공개 읽기 가능. Dashboard 없이 migration SQL 한 줄로 재현성 확보.

### 1-2. Storage RLS 정책 (storage.objects)

[VERIFIED: Supabase Storage Access Control 공식 문서]

Supabase Storage는 `storage.foldername(name)` 헬퍼 함수를 제공. `name LIKE 'avatars/' || auth.uid() || '%'` 보다 정식 패턴:

```sql
-- SELECT: 누구나 (public 버킷)
CREATE POLICY "public_avatars_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- INSERT: 본인 user_id 경로만
CREATE POLICY "own_avatar_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- UPDATE: 본인만
CREATE POLICY "own_avatar_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- DELETE: 본인만
CREATE POLICY "own_avatar_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'public'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
```

**경로 구조**: `avatars/{user_id}/{filename}.{ext}` — `foldername`이 배열로 분해함. 혹은 D-01 결정대로 `avatars/{user_id}.{ext}` flat 구조라면 `foldername(name)[1] = 'avatars'` + `name = 'avatars/' || auth.uid()::text || '.' || extension` 체크로 변경 가능. **권장: 서브폴더 `avatars/{user_id}/{filename}` 패턴이 foldername 헬퍼와 더 자연스럽게 맞음.**

### 1-3. Server Action에서 업로드

[VERIFIED: Supabase 문서 + WebSearch]

**핵심 주의: Next.js Server Action body size limit 기본 1MB**. 5MB 파일 허용을 위해 `next.config.ts` 설정 필수:

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
}
```

Server Action에서 FormData로 파일 수신 후 Supabase Storage에 업로드:

```typescript
// src/app/(worker)/my/profile/edit/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireWorker } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function uploadAvatar(
  _prevState: AvatarFormState,
  formData: FormData
): Promise<AvatarFormState> {
  const session = await requireWorker()
  const file = formData.get('avatar') as File | null

  if (!file || file.size === 0) return { error: '파일을 선택해주세요' }
  if (file.size > 5 * 1024 * 1024) return { error: '파일 크기는 5MB 이하여야 합니다' }

  // MIME 타입 서버 검증 (클라이언트 선언 기반)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'JPEG, PNG, WebP 파일만 업로드 가능합니다' }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${session.id}/${Date.now()}.${ext}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: '업로드에 실패했습니다: ' + uploadError.message }

  // Public URL 획득
  const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(path)

  // DB 업데이트 (avatar URL 저장)
  await prisma.workerProfile.update({
    where: { userId: session.id },
    data: { avatar: publicUrl },
  })

  revalidatePath('/my')
  revalidatePath('/my/profile/edit')
  return { success: true, avatarUrl: publicUrl }
}
```

### 1-4. Public URL vs Signed URL

[VERIFIED: Supabase 문서]

- **Public URL** (`getPublicUrl`): 버킷이 public일 때 만료 없는 영구 URL. 아바타용으로 적합.
- **Signed URL** (`createSignedUrl`): 만료 시간 설정 가능. private 버킷용. Phase 3에서는 불필요.

```typescript
// Public URL (만료 없음, 아바타에 적합)
const { data } = supabase.storage.from('public').getPublicUrl('avatars/userId/photo.jpg')
// data.publicUrl = "https://{project}.supabase.co/storage/v1/object/public/public/avatars/userId/photo.jpg"
```

### 1-5. 이전 아바타 삭제 (re-upload 시)

기존 아바타를 삭제 후 새로 업로드하는 방식보다, **upsert: true** + 타임스탬프 포함 경로 전략 권장:
- `avatars/{user_id}/{timestamp}.jpg` — 매번 새 파일 생성 (이전 파일은 정리 대상)
- 또는 `avatars/{user_id}/avatar.jpg` + `upsert: true` — 항상 같은 경로 덮어쓰기 (단순함, 권장)

**권장**: `upsert: true` + 고정 경로 `avatars/{user_id}/avatar.{ext}`. 이전 파일 삭제 별도 처리 불필요.

### 1-6. 이미지 MIME 검증 (magic byte)

`file-type` npm 패키지는 package.json에 없음 — Phase 3에서는 추가 dep 없이 `file.type` 서버 검증으로 진행. `file.type`은 브라우저가 선언하는 값이지만 Server Action 컨텍스트에서 `File` 객체의 `.type`은 node 환경에서 브라우저 요청에서 왔으므로 여전히 스푸핑 가능. 완전한 보호를 위해선 `file-type` 패키지 추가 또는 첫 몇 바이트 직접 검사 필요 — Phase 3에서는 MIME 검증 + 5MB 크기 제한으로 실용적 수준 충족.

### 1-7. 주요 함정

1. **Next.js Server Action body size 기본 1MB** — `serverActions.bodySizeLimit: '5mb'` 미설정 시 5MB 파일 업로드 불가. [VERIFIED]
2. **storage.objects RLS 미설정 시 기본 차단** — Supabase는 RLS 정책 없으면 업로드 자체가 거부됨. migration에서 INSERT 정책 누락 시 401/403 에러.
3. **`createClient()`는 Server Action에서 `await` 필요** — `server.ts`의 `createClient()`는 async 함수 (`await cookies()` 내부). `const supabase = createClient()` 누락 시 undefined.
4. **upsert 없이 같은 경로 재업로드 시 409 Conflict** — `upload(path, file, { upsert: false })` 기본값. 아바타 재업로드는 `upsert: true` 필수.
5. **auth.uid()가 storage RLS에서 null** — anon 사용자가 업로드 시도 시 `auth.uid()` = null → 정책 실패. Authenticated 사용자만 업로드 허용하는 정책의 `TO authenticated` 절 필수.

---

## Research Area 2: pg_cron 설정 + SQL Migration 구조

### 2-1. Extension 활성화

[VERIFIED: pg_cron GitHub 공식 문서 + Supabase WebSearch]

Supabase 호스티드 환경에서는 pg_cron이 사전 설치됨. `CREATE EXTENSION`만으로 활성화 가능:

```sql
-- supabase/migrations/{timestamp}_pg_cron_extension.sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**주의**: Supabase 로컬 개발 환경(supabase start)에서는 pg_cron이 기본 포함되어 있지 않을 수 있음. 이 프로젝트는 direct-prisma 전략 (Supabase CLI 미사용)이므로 production Supabase 인스턴스에만 적용.

### 2-2. cron.schedule() 정확한 문법

[VERIFIED: pg_cron GitHub README]

```sql
-- $$ dollar-quoting 사용 (단따옴표 이스케이프 문제 방지)
SELECT cron.schedule(
  'expire-jobs-every-5-min',
  '*/5 * * * *',
  $$
    UPDATE public.jobs
    SET status = 'expired'
    WHERE status = 'active'
      AND (
        "workDate"::date + CAST("startTime" AS time)
      )::timestamptz AT TIME ZONE 'Asia/Seoul' < now() - INTERVAL '5 minutes';
  $$
);
```

**타임존 처리**:
- pg_cron은 기본 UTC 타임존으로 동작
- `workDate`는 `DATE` 타입, `startTime`은 `VARCHAR("HH:MM")` 타입
- 한국 시간(KST = UTC+9) 비교: `workDate + startTime::time < now() AT TIME ZONE 'Asia/Seoul'` 또는 반대로 `now()` 를 KST로 변환
- **권장 접근**: `(workDate + startTime::time)::timestamptz < NOW() - INTERVAL '5 minutes'` — Supabase PostgreSQL은 UTC 저장이므로 workDate+startTime이 UTC로 저장되었다면 직접 비교 가능. 시드 데이터 저장 기준 확인 필요.

### 2-3. 멱등성 보장 (Migration 재실행 안전)

```sql
-- 기존 job 제거 후 재등록 (멱등성)
SELECT cron.unschedule('expire-jobs-every-5-min');

SELECT cron.schedule(
  'expire-jobs-every-5-min',
  '*/5 * * * *',
  $$UPDATE public.jobs SET status = 'expired' ...$$
);
```

`cron.unschedule()` 은 job이 없어도 에러를 발생시키지 않음 (returns boolean false). migration이 여러 번 실행되어도 안전.

### 2-4. 검증 쿼리

```sql
-- 등록된 job 목록 확인
SELECT * FROM cron.job;

-- 실행 히스토리 (최근 10개)
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### 2-5. Lazy Filter (UI 쪽 방어 쿼리)

pg_cron은 최대 5분 지연 있음. UI에서 만료 공고가 노출되지 않으려면 `queries.ts`의 모든 job 조회에 lazy filter 추가:

```typescript
// queries.ts에 추가 (getJobs, $queryRaw 포함)
where: {
  status: 'active',
  // Lazy filter: pg_cron 5분 지연 커버
  workDate: { gte: new Date() },  // 완전한 날짜 기준
}
```

더 정확한 시간 기준 필터는 raw SQL:
```sql
AND ("workDate" + CAST("startTime" AS time))::timestamptz > now()
```

### 2-6. 주요 함정

1. **pg_cron은 UTC 기준** — 한국 시간 09:00 알바가 UTC 00:00에 만료. 테스트 시 UTC 기준으로 시간 설정 필요.
2. **workDate(DATE) + startTime(VARCHAR) 결합 시 타입 캐스팅** — `CAST("startTime" AS time)` 또는 `"startTime"::time` 필수. 직접 `+` 연산은 PostgreSQL이 허용하지 않음.
3. **`cron.unschedule()` 오류 무시** — job 없는 경우 false 반환. `DO $$ ... EXCEPTION WHEN ... END $$` 블록 불필요.
4. **apply-supabase-migrations.ts는 이미 멱등성 체크** — `_supabase_migrations` 테이블로 적용된 파일 skip. 단, SQL 내용이 변경되면 재적용 안 됨. job name 변경 시 이전 job 수동 제거 필요.
5. **Supabase 대시보드에서 확인 권장** — Dashboard → Database → Cron Jobs에서 시각적 확인 가능.

---

## Research Area 3: PostGIS `$queryRaw` with Prisma 7

### 3-1. 기본 패턴

[VERIFIED: Prisma 공식 문서 + 커뮤니티 검증]

```typescript
// src/lib/db/queries.ts
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma'

interface JobWithDistance {
  id: string
  businessId: string
  title: string
  category: string
  hourlyPay: number
  transportFee: number
  workDate: Date
  startTime: string
  endTime: string
  workHours: unknown  // Prisma Decimal → string in raw
  headcount: number
  filled: number
  lat: unknown        // Decimal → string in raw
  lng: unknown
  status: string
  isUrgent: boolean
  distance_m: number  // ST_Distance 결과 (meters)
  // business 관계는 JOIN으로 포함
  business_id: string
  business_name: string
  business_logo: string | null
  // ... 기타 business 필드
}

export async function getJobsByDistance(params: {
  userLat: number
  userLng: number
  radiusM: number
  limit: number
  cursor?: { createdAt: Date; id: string }
}): Promise<JobWithDistance[]> {
  const { userLat, userLng, radiusM, limit, cursor } = params

  const rows = await prisma.$queryRaw<JobWithDistance[]>`
    SELECT
      j.*,
      ST_Distance(
        j.location,
        ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
      ) AS distance_m,
      bp.name AS business_name,
      bp.logo AS business_logo,
      bp.address AS business_address,
      bp.lat AS business_lat,
      bp.lng AS business_lng,
      bp.rating AS business_rating,
      bp."reviewCount" AS business_review_count,
      bp."completionRate" AS business_completion_rate,
      bp.verified AS business_verified,
      bp.description AS business_description,
      bp.category AS business_category
    FROM public.jobs j
    LEFT JOIN public.business_profiles bp ON j."businessId" = bp.id
    WHERE j.status = 'active'
      AND j.location IS NOT NULL
      AND ("workDate" + CAST("startTime" AS time))::timestamptz > now()
      AND ST_DWithin(
        j.location,
        ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography,
        ${radiusM}
      )
      ${cursor ? Prisma.sql`AND (j."createdAt", j.id) < (${cursor.createdAt}, ${cursor.id}::uuid)` : Prisma.empty}
    ORDER BY distance_m ASC NULLS LAST, j."createdAt" DESC
    LIMIT ${limit}
  `

  return rows
}
```

### 3-2. ST_DWithin과 ST_Distance 핵심 개념

[VERIFIED: PostGIS 공식 문서 기반]

- **`geography` 타입**: 단위가 **미터 (meters)**. `ST_DWithin(geog1, geog2, 5000)` = 5km 반경.
- **`geometry` 타입**: 단위가 **도 (degrees)**. Phase 3에서는 geography 사용 (이미 스키마에 `geography(Point, 4326)`으로 정의됨).
- **`ST_MakePoint(lng, lat)`**: 경도(longitude)가 첫 번째 인수, 위도(latitude)가 두 번째.
- **SRID 4326**: WGS84 좌표계 (GPS 표준). `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` 패턴.
- **`ST_Distance` 반환값**: geography 타입 간 거리 (미터).

### 3-3. location null 처리

Job.location은 nullable. 위치 없는 공고:
- `ST_DWithin` 필터에서 null location 공고는 자동으로 제외됨 (NULL safe)
- 위치 없는 공고도 목록에 노출하려면 별도 fallback 쿼리 필요 (D-06에 따르면 PostGIS 쿼리 + 거리 없는 fallback 병행)

**권장 접근**: 거리 쿼리와 일반 쿼리 두 경로:
1. `userLat, userLng` 있음 → PostGIS `$queryRaw`, location 있는 공고만 거리순
2. `userLat, userLng` 없음 (fallback) → `prisma.job.findMany`, 최신순, `distanceM: 0`

### 3-4. GIST 인덱스 누락 확인

[VERIFIED: migration SQL 직접 확인]

Phase 2 migration SQL에 `jobs.location`에 대한 GIST 인덱스 없음. Phase 3 migration에 반드시 추가:

```sql
-- supabase/migrations/{timestamp}_jobs_location_gist.sql
CREATE INDEX IF NOT EXISTS jobs_location_gist_idx
  ON public.jobs USING GIST (location);
```

GIST 인덱스 없이도 동작하지만 대용량 공고 시 `ST_DWithin` full table scan 발생.

### 3-5. Prisma `$queryRaw` 반환 타입 주의

[VERIFIED: Prisma 공식 문서]

- `Decimal` 컬럼 (`lat`, `lng`, `workHours`, `hourlyPay`): raw query 결과에서 **string** 또는 **number** (pg driver 의존). `Number()` 코어션 필요.
- `Date` 컬럼 (`workDate`, `createdAt`): raw query에서 **Date** 또는 **string** (pg driver 의존).
- `Boolean` (`isUrgent`): raw query에서 **boolean** 유지됨.
- UUID 컬럼: raw query에서 **string** 유지.
- `distance_m`: `number` (PostGIS ST_Distance float8).

### 3-6. 주요 함정

1. **`ST_MakePoint(lng, lat)` 인수 순서** — 경도 first, 위도 second. 반대로 하면 지구 반대편 쿼리.
2. **Prisma.sql 템플릿에서 identifier 주입 불가** — `ORDER BY ${column}` 형태 불가. 컬럼명은 하드코딩.
3. **raw query 결과의 camelCase vs snake_case** — PostgreSQL 컬럼명이 snake_case면 결과도 snake_case. `"businessId"` 같은 quoted identifier는 결과도 `businessId`. 어댑터에서 매핑 필요.
4. **cursor 튜플 비교 syntax** — `(col1, col2) < (val1, val2)` PostgreSQL 튜플 비교. Prisma.sql로 parameterize 시 `Prisma.sql\`AND (j."createdAt", j.id) < (${date}, ${uuid}::uuid)\`` 형태.
5. **GIST 인덱스 없으면 ST_DWithin 느림** — 공고 수백 개에서는 무시 가능하지만 수천 개 이상에서 성능 저하.

---

## Research Area 4: Jobs RLS Migration — 정확한 SQL

### 4-1. Phase 2 상태 확인

[VERIFIED: supabase/migrations/20260410000004_disable_rls_jobs_applications_reviews.sql]

현재 상태:
```sql
alter table public.jobs disable row level security;
alter table public.applications disable row level security;
alter table public.reviews disable row level security;
```

Phase 3 목표: `jobs`만 RLS 재활성화. `applications`/`reviews`는 그대로 OFF.

### 4-2. 새 Migration 파일 (완전한 SQL)

[VERIFIED: D-02 결정 + Supabase RLS 문서]

```sql
-- supabase/migrations/{timestamp}_jobs_rls_phase3.sql
-- Phase 3: Enable RLS on jobs table (was disabled in 20260410000004)
-- applications and reviews remain disabled until Phase 4/5

-- 1. Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 2. Public SELECT (anon + authenticated — POST-04 충족)
CREATE POLICY "jobs_public_select"
  ON public.jobs
  FOR SELECT
  USING (true);

-- 3. INSERT: 공고 작성자(authorId)만
CREATE POLICY "jobs_owner_insert"
  ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = "authorId");

-- 4. UPDATE: 공고 작성자만
CREATE POLICY "jobs_owner_update"
  ON public.jobs
  FOR UPDATE TO authenticated
  USING (auth.uid() = "authorId")
  WITH CHECK (auth.uid() = "authorId");

-- 5. DELETE: 공고 작성자만
CREATE POLICY "jobs_owner_delete"
  ON public.jobs
  FOR DELETE TO authenticated
  USING (auth.uid() = "authorId");
```

### 4-3. `auth.uid()` vs `auth.jwt() ->> 'sub'`

[VERIFIED: Supabase 공식 문서]

- `auth.uid()`: Supabase Auth 내장 헬퍼. 현재 authenticated 사용자의 UUID 반환. 권장.
- `auth.jwt() ->> 'sub'`: JWT subject. `auth.uid()`와 동일한 값. fallback으로만 사용.

`"authorId"`는 Prisma schema에서 camelCase로 정의 — PostgreSQL에서 case-sensitive identifier로 double-quote 필요.

### 4-4. 정책 검증 쿼리

```sql
-- Phase 3 적용 후 확인
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'jobs';

-- RLS 상태 확인
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('jobs', 'applications', 'reviews');
```

### 4-5. 롤백 플랜

RLS가 기존 로직을 깨는 경우:
```sql
-- 임시 비활성화 (정책은 유지)
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;

-- 정책 제거 (완전 롤백)
DROP POLICY IF EXISTS "jobs_public_select" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_insert" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_update" ON public.jobs;
DROP POLICY IF EXISTS "jobs_owner_delete" ON public.jobs;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
```

### 4-6. Service Role Key 사용 시

Phase 3의 Server Actions는 Supabase 클라이언트를 통해 DB에 접근하지 않음 (Prisma 직접 사용). Prisma는 `DIRECT_URL`(서비스 레벨 연결)을 통해 연결하므로 RLS 정책을 바이패스함. RLS는 `supabase-js` 클라이언트를 통한 접근에만 적용.

**핵심**: Phase 3 Server Actions에서 Prisma를 통한 DB 접근은 RLS 영향 없음. RLS는 `/posts/{id}` 공개 페이지에서 `supabase-js` anon 클라이언트를 통해 Job을 읽을 때만 적용됨.

### 4-7. 주요 함정

1. **Prisma는 RLS를 바이패스** — Prisma가 DIRECT_URL (service role)로 연결하므로 Server Actions의 CRUD는 RLS 영향 없음. RLS는 supabase-js client 통한 접근에만 적용.
2. **`"authorId"` double-quote 필수** — PostgreSQL은 camelCase identifier를 소문자로 folding. `WHERE auth.uid() = authorid` 는 틀림, `WHERE auth.uid() = "authorId"` 가 맞음.
3. **`applications`/`reviews` RLS 꺼진 상태 유지** — 이번 migration에서 jobs만 켜야 함. 실수로 전체 켜면 Phase 4 전에 Application 쿼리 깨짐.
4. **멱등성**: `CREATE POLICY IF NOT EXISTS` 문법은 PostgreSQL에서 지원 안 됨. `apply-supabase-migrations.ts`의 migration tracking이 중복 실행을 막으므로 일반 `CREATE POLICY` 사용 가능.

---

## Research Area 5: Next.js 16 Server Actions + 캐시 무효화

### 5-1. Next.js 16 caching 변경사항

[VERIFIED: nextjs.org/blog/next-16 + node_modules/next/dist/docs]

**`revalidateTag()` 서명 변경** (BREAKING):
```typescript
// ✅ Next.js 16 올바른 사용법
import { revalidateTag } from 'next/cache'
revalidateTag('jobs', 'max')         // SWR semantics
revalidateTag('jobs', { expire: 0 }) // 즉시 만료

// ⚠️ deprecated — TypeScript 오류 발생
revalidateTag('jobs')
```

**`updateTag()` 신규** (Server Actions 전용):
```typescript
// Server Action에서 즉시 읽기-반영 (read-your-writes)
import { updateTag } from 'next/cache'
updateTag('jobs')  // 즉시 만료, 다음 요청에서 fresh data
```

**`revalidatePath()`**: 서명 변경 없음. Phase 3에서 주요 사용.

**`cacheComponents: true`** (next.config.ts): 이 프로젝트에서 미활성화. `'use cache'`, `cacheTag`, `cacheLife`는 `cacheComponents: true` 없으면 동작 안 함.

### 5-2. Server Action 서명 패턴

Phase 2 `AuthFormState` 패턴 (`src/app/(auth)/types.ts`) 참조:

```typescript
// src/lib/form-state.ts (새 파일로 공유 타입 추출)
export type FormState<T = void> =
  | { success: true; data?: T }
  | { error: string }
  | null
  | undefined

// useActionState 패턴 (폼 상태 피드백 필요 시)
export async function updateWorkerProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> { ... }

// direct <form action> 패턴 (성공 시 redirect)
export async function createJob(formData: FormData): Promise<void> {
  // ... create ...
  redirect(`/biz/posts/${newJob.id}`)
}
```

### 5-3. 캐시 무효화 전략

| 변경 작업 | 무효화 대상 | 사용 함수 |
|---------|-----------|---------|
| 공고 생성 | `/` (랜딩), `/home`, `/biz/posts` | `revalidatePath('/'); revalidatePath('/home'); revalidatePath('/biz/posts')` |
| 공고 수정 | `/posts/[id]`, `/biz/posts/[id]`, `/biz/posts` | `revalidatePath('/posts/[id]', 'page'); revalidatePath('/biz/posts')` |
| 공고 삭제 | `/biz/posts`, `/` | `revalidatePath('/biz/posts'); revalidatePath('/')` |
| Worker 프로필 수정 | `/my`, `/my/profile/edit` | `revalidatePath('/my'); revalidatePath('/my/profile/edit')` |
| Avatar 업로드 | `/my`, `/my/profile/edit` | `revalidatePath('/my'); revalidatePath('/my/profile/edit')` |
| Business 프로필 수정 | `/biz/profile`, `/biz` | `revalidatePath('/biz/profile'); revalidatePath('/biz')` |

**Phase 3에서 `cacheComponents`를 활성화하지 않으므로 `revalidateTag`는 사용하지 않음** — 페이지들이 `'use cache'` + `cacheTag()`를 사용하지 않아 태그 기반 무효화가 효과 없음.

### 5-4. redirect() after mutation

```typescript
// Server Action에서 성공 redirect 패턴
import { redirect } from 'next/navigation'

export async function createJob(formData: FormData): Promise<void> {
  const session = await requireBusiness()
  // ... DB 저장 ...
  revalidatePath('/biz/posts')
  revalidatePath('/')
  revalidatePath('/home')
  redirect(`/biz/posts/${newJob.id}`)  // throw 방식으로 구현됨
}
```

`redirect()`는 Next.js에서 내부적으로 `throw`를 사용. `try-catch`로 감싸면 redirect가 차단됨. redirect 후에는 코드가 실행되지 않음.

### 5-5. 주요 함정

1. **`revalidateTag('jobs')` 단일 인수 사용 금지** — Next.js 16에서 deprecated + TypeScript 오류.
2. **`redirect()` 를 try-catch 안에 두면 동작 안 함** — `try { ... redirect() } catch { ... }` 에서 catch 블록이 redirect를 삼킴. redirect 전에 모든 처리 완료 필요.
3. **`cacheComponents: false` 환경에서 `updateTag()` 사용 불필요** — `updateTag`는 `'use cache'` 태그 시스템과 연동. 현재 프로젝트는 `cacheComponents` 미활성화.
4. **`revalidatePath`는 void 반환** — 반환값 없음. `await revalidatePath(...)` 불필요.
5. **Server Action에서 `'use server'` 파일 최상단 선언** — 함수별 `'use server'`도 가능하지만 파일 전체 선언이 관리 용이.

---

## Research Area 6: Cursor-based Infinite Scroll + IntersectionObserver

### 6-1. Cursor 인코딩 전략

[ASSUMED — 패턴 기반 권장]

**Cursor 형식**: `{createdAtISO}_{jobId}` 단순 문자열 결합.

```typescript
// 서버에서 cursor 생성
function encodeCursor(job: Job): string {
  return `${job.createdAt.toISOString()}_${job.id}`
}

// 서버에서 cursor 파싱
function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const idx = cursor.indexOf('_')
  if (idx === -1) return null
  const iso = cursor.slice(0, idx)
  // UUID에 '-'가 포함되므로 마지막 '_' 이후가 아님 — ISO datetime의 '.' 뒤 첫 '_' 위치
  // 더 안전: ISO datetime은 정해진 길이(24자). cursor.slice(0, 24), cursor.slice(25)
  const createdAt = new Date(iso)
  const id = cursor.slice(idx + 1)
  return { createdAt, id }
}
```

**더 안전한 접근**: ISO 8601 datetime은 `2026-04-10T12:00:00.000Z` 형태로 24자 고정. `cursor.slice(0, 24)`와 `cursor.slice(25)` (언더스코어 제외)로 분리.

### 6-2. 튜플 비교 cursor 쿼리

```sql
-- Prisma findMany with cursor (createdAt, id) tuple comparison
WHERE (j."createdAt", j.id) < (${cursor.createdAt}, ${cursor.id}::uuid)
ORDER BY j."createdAt" DESC, j.id DESC
```

**Prisma findMany + cursor 방식**: Prisma의 내장 cursor 기능을 활용할 수도 있지만 PostGIS와 함께 사용 시 `$queryRaw` 필수. 거리 없는 fallback은 Prisma cursor 내장:

```typescript
// 거리 없는 fallback (prisma.findMany cursor)
const rows = await prisma.job.findMany({
  where: { status: 'active' },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  cursor: cursor ? { id: cursor.id } : undefined,
  skip: cursor ? 1 : 0,
  take: limit,
  include: JOB_INCLUDE,
})
```

### 6-3. Client Component 패턴

```typescript
// src/components/worker/job-list-infinite.tsx
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

interface Props {
  initialJobs: Job[]
  initialCursor: string | null
}

export function JobListInfinite({ initialJobs, initialCursor }: Props) {
  const [jobs, setJobs] = useState(initialJobs)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [isPending, startTransition] = useTransition()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !isPending) {
          startTransition(async () => {
            const result = await loadMoreJobs(cursor) // Server Action
            if (result.jobs.length > 0) {
              setJobs(prev => [...prev, ...result.jobs])
              setCursor(result.nextCursor)
            } else {
              setCursor(null)
            }
          })
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [cursor, isPending])

  return (
    <>
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
      {cursor && (
        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
          {isPending && <Spinner />}
        </div>
      )}
    </>
  )
}
```

### 6-4. SSR + Client Wrapper 조합

```typescript
// src/app/(worker)/home/page.tsx (Server Component)
export default async function HomePage() {
  const session = await requireWorker() // or verifySession for graceful fallback
  const { jobs, nextCursor } = await getJobsPaginated({ limit: 20 })

  return (
    <main>
      <JobListInfinite
        initialJobs={jobs}
        initialCursor={nextCursor}
      />
    </main>
  )
}
```

첫 20개는 SSR로 즉시 렌더링 (LCP 최적화). 이후 client에서 IntersectionObserver로 append.

### 6-5. 주요 함정

1. **IntersectionObserver cleanup 필수** — `return () => observer.disconnect()` 없으면 메모리 누수 + 중복 호출.
2. **sentinel div가 cursor 없을 때도 DOM에 남아있으면 빈 fetch** — `cursor === null` 시 sentinel div 렌더링 안 하거나 observer disconnect 필수.
3. **React key={job.id} 필수** — 서버 렌더링된 리스트와 클라이언트 append 리스트가 섞이면 duplicate key 경고. `job.id` (UUID)로 키 고정.
4. **`useTransition` 중복 호출 방지** — `!isPending` 조건 체크. IntersectionObserver callback이 여러 번 연속 호출될 수 있음.
5. **`initialJobs` hydration mismatch** — 서버에서 내려준 jobs와 클라이언트 초기 상태가 다르면 hydration error. `useState(initialJobs)` 는 hydration 시 서버 HTML과 일치해야 함.

---

## Research Area 7: navigator.geolocation 모범 사례

### 7-1. 권한 상태 확인

[VERIFIED: MDN Web API 기반]

```typescript
// 권한 상태 확인 (요청 전 미리 확인)
async function checkGeolocationPermission(): Promise<PermissionState> {
  if (!navigator.permissions) return 'prompt'  // 구형 브라우저
  const result = await navigator.permissions.query({ name: 'geolocation' })
  return result.state  // 'granted' | 'denied' | 'prompt'
}
```

### 7-2. 위치 요청 패턴 (User Interaction 기반)

```typescript
// 절대 페이지 로드 시 자동 호출 금지
// 항상 버튼 클릭 등 user interaction 이후 호출

function useGeolocation() {
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null)
  const [denied, setDenied] = useState(false)

  // 서울시청 fallback
  const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.9780 }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setCoords(SEOUL_CITY_HALL)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setDenied(true)
        setCoords(SEOUL_CITY_HALL)  // fallback
      },
      {
        enableHighAccuracy: false,  // GPS 대기 없이 빠른 위치
        timeout: 5000,              // 5초 타임아웃
        maximumAge: 60000,          // 1분 캐시
      }
    )
  }

  return { coords: coords ?? SEOUL_CITY_HALL, denied, requestLocation }
}
```

### 7-3. Privacy 고려사항

위치 정보를 localStorage나 쿠키에 저장하면 개인정보보호법(PIPA) 이슈 가능. **React state에만 ephemeral하게 저장**. 페이지 새로고침 시 재요청.

### 7-4. 주요 함정

1. **`navigator.geolocation`은 Server Component에서 사용 불가** — 브라우저 API. Client Component에서만.
2. **권한 거부 후 재요청 불가** — 한번 거부하면 `getCurrentPosition` 호출해도 즉시 error callback. 브라우저 설정에서만 재허용 가능.
3. **`enableHighAccuracy: true` + 짧은 timeout 조합 지양** — GPS 신호 대기로 5-30초 지연. `enableHighAccuracy: false`로 IP/WiFi 기반 빠른 위치 획득.
4. **localhost HTTPS 없이는 geolocation 요청 안 됨** — Chrome은 localhost에서 HTTP도 허용. Firefox/Safari는 HTTPS 필요. 개발 시 `next dev` (localhost) 동작 확인.

---

## Research Area 8: shadcn/ui Form 패턴 — Profile Edit + Job Create

### 8-1. 현재 UI 자산 상태

[VERIFIED: biz/posts/new/page.tsx 직접 확인]

`src/app/biz/posts/new/page.tsx`는 이미 5-step form UI를 갖추고 있음 (`'use client'`, `useState` 기반). 이 UI를 Server Action에 연결하는 작업이 Phase 3의 핵심.

현재 UI에 있는 필드:
- Step 1: title, category, description
- Step 2: workDate, startTime, endTime, headcount, isUrgent
- Step 3: hourlyPay, transportFee
- Step 4: duties, requirements, dressCode, whatToBring

**문제**: 이 UI에 주소(address) 및 lat/lng 입력 필드가 없음. POST-01에서 주소 필드 필수.

### 8-2. Prisma Schema Stub 해소 전략

[VERIFIED: queries.ts Phase 2 stub 목록 확인]

`adaptJob()`에서 stub으로 남긴 필드들:
- `duties: []` — Prisma schema에 컬럼 없음
- `requirements: []` — 동일
- `dressCode: ""` — 동일
- `whatToBring: []` — 동일
- `tags: []` — 동일

**옵션 A**: Prisma schema에 새 컬럼 추가 (권장)
```prisma
// Job 모델에 추가
duties        String[]  @default([])
requirements  String[]  @default([])
dressCode     String?
whatToBring   String[]  @default([])
tags          String[]  @default([])
address       String?   // 공고 위치 주소
addressDetail String?
```

**옵션 B**: 기존 `description` 텍스트에 포함 — UX 저하, 권장하지 않음.

**권장**: 옵션 A. `prisma db push`로 컬럼 추가. 기존 null → 빈 배열 default.

### 8-3. Form 접근법 비교

Phase 3 form에서 **직접 Server Action 연결** (react-hook-form 불필요):

```typescript
// 5-step form에서 마지막 단계 submit 시 Server Action 호출
const handlePublish = async () => {
  setIsPublishing(true)
  const formData = new FormData()
  formData.append('title', form.title)
  formData.append('category', form.category)
  // ... 모든 필드 append
  const result = await createJob(formData)
  if ('error' in result) { setError(result.error); setIsPublishing(false) }
}
```

**`react-hook-form`**: package.json에 포함됨. Profile Edit처럼 단순 단일 form에서 선택적으로 활용 가능. 5-step form에는 overkill.

### 8-4. Worker Profile Edit Form 구조

`src/app/(worker)/my/profile/edit/` 폴더 존재, `page.tsx` 없음. Phase 3에서 신설:

```typescript
// src/app/(worker)/my/profile/edit/page.tsx
export default async function WorkerProfileEditPage() {
  const worker = await getCurrentWorker()
  if (!worker) redirect('/login')
  return <WorkerProfileEditForm worker={worker} />
}

// src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx (Client Component)
'use client'
```

필드: name, nickname, bio (VarChar 140), preferredCategories (multi-select), avatar (file input).

### 8-5. 날짜/시간 입력

현재 `biz/posts/new` UI에서 이미 native `<input type="date">`, `<input type="time">` 사용. Phase 3에서 동일 패턴 유지. `@base-ui/react`의 DatePicker는 과도함.

### 8-6. 주요 함정

1. **5-step form이 이미 `'use client'`** — Server Action을 직접 `<form action={serverAction}>` 패턴으로 연결 불가. `handlePublish`에서 명시적으로 Server Action 호출 필요.
2. **FormData의 배열 필드** — `formData.append('duties', '업무1')`, `formData.append('duties', '업무2')` 형태로 여러 번 append. 서버에서 `formData.getAll('duties')`.
3. **주소 → lat/lng 변환** — Kakao 지도 API 연동은 Phase 3 out of scope. 단기 대안: Business가 수동으로 lat/lng를 입력하거나, 공고 생성 시 BusinessProfile의 lat/lng를 자동 복사.
4. **WorkerProfile avatar null 체크** — 기존 avatar가 이모지일 수도 있음 (Phase 1 mock 이모지). 업로드 후 URL로 교체.

---

## Research Area 9: 이미지 검증 경계 — Server-side MIME 체크

### 9-1. file.type의 신뢰성

[ASSUMED — 웹 표준 기반]

브라우저가 File 객체에 설정하는 `file.type` (MIME type):
- 일반적으로 파일 확장자 기반으로 추론됨
- 악의적 사용자가 Content-Type 헤더를 조작하거나 파일 확장자를 속일 수 있음
- **Server Action에서 받는 `File` 객체의 `.type`은 브라우저가 선언한 값** — 완전 신뢰 불가

### 9-2. Phase 3 적용 전략

완전한 magic byte 검증을 위해서는 `file-type` npm 패키지 필요 (package.json에 없음). Phase 3에서는 **실용적 수준**:

```typescript
// Server Action에서 서버측 검증 (layers)
// Layer 1: MIME type 선언 검증
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
if (!ALLOWED_MIME.has(file.type)) return { error: '허용되지 않는 파일 형식' }

// Layer 2: 파일 크기 검증 (서버에서 신뢰 가능)
if (file.size > 5 * 1024 * 1024) return { error: '5MB 초과' }

// Layer 3: 확장자 검증 (추가 방어)
const ext = file.name.split('.').pop()?.toLowerCase()
if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) {
  return { error: '허용되지 않는 파일 확장자' }
}
```

**Supabase Storage 자체 방어**: Storage는 실제로 파일을 저장할 때 추가적인 보안 레이어를 가짐. 이미지 서빙 시 content-type 재검증.

**완전한 magic byte 체크 (선택적)**:
```typescript
// file.arrayBuffer()로 첫 bytes 확인
const buffer = await file.slice(0, 12).arrayBuffer()
const bytes = new Uint8Array(buffer)
// JPEG: bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
// PNG: bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
// WebP: bytes[8..11] === WEBP
```

Phase 3에서는 3-layer 검증으로 충분. `file-type` 패키지 추가는 선택적.

### 9-3. 주요 함정

1. **`file.size` 는 서버에서 신뢰 가능** — HTTP body에서 실제 바이트 수이므로 스푸핑 불가.
2. **`file.type`은 스푸핑 가능** — MIME 검증만으로는 부족하지만 Phase 3 수준에서는 실용적.
3. **Zod로 File 검증 불가** — Zod는 primitive 타입 검증. File 객체는 별도 검증 로직 필요.

---

## Research Area 10: 재검증 전략 across Pages

### 10-1. 현재 캐싱 상황

[VERIFIED: 코드베이스 확인]

Phase 2 페이지들은 `'use cache'`/`cacheTag` 없이 일반 async Server Component로 구현됨. Next.js 16에서 `cacheComponents: false` (기본값)이면 모든 dynamic 코드는 request time에 실행됨 → **실질적으로 항상 fresh data**.

따라서 `revalidateTag`/`updateTag` 없이도 페이지 재방문 시 최신 데이터 표시됨.

### 10-2. Server Action 후 revalidatePath 전략

**`revalidatePath`가 필요한 이유**: Next.js는 Client Router Cache를 가짐. 이미 방문한 페이지는 client에서 캐시됨. `revalidatePath` 없으면 뒤로가기 시 이전 데이터 표시.

```typescript
// 공고 생성 후 (createJob Server Action)
revalidatePath('/', 'layout')           // 랜딩 페이지 전체
revalidatePath('/home')                 // Worker 홈
revalidatePath('/biz/posts')            // Business 공고 목록
redirect(`/biz/posts/${newJob.id}`)    // 새 공고 상세로 이동

// 공고 수정 후 (updateJob Server Action)
revalidatePath('/biz/posts')
revalidatePath(`/biz/posts/${jobId}`)
revalidatePath(`/posts/${jobId}`)       // Worker 공개 상세
// redirect는 선택적

// Worker 프로필 수정 후
revalidatePath('/my')
revalidatePath('/my/profile/edit')

// Business 프로필 수정 후
revalidatePath('/biz/profile')
revalidatePath('/biz')
```

### 10-3. 미래 cacheTag 도입 준비

Phase 4+ 에서 `cacheComponents: true` 활성화 시:
```typescript
// 공고 조회 함수에 cacheTag 추가
async function getJobs() {
  'use cache'
  cacheTag('jobs')
  // ...
}
```

Phase 3에서는 준비만, 구현은 불필요.

---

## Cross-cutting Concerns

### 트랜잭션 경계

**Avatar 업로드 + DB 업데이트**: Storage 업로드와 Prisma DB 업데이트는 서로 다른 시스템이므로 atomic transaction 불가. 권장 순서:
1. Storage 업로드 성공 확인
2. Prisma DB 업데이트
3. 실패 시 Storage에서 파일 삭제 (cleanup)

**Job 생성**: Prisma transaction으로 단일 처리 가능:
```typescript
const newJob = await prisma.$transaction(async (tx) => {
  return tx.job.create({ data: { ... } })
})
```

### 에러 처리 일관성

Phase 2 `AuthFormState` 패턴 확장:
```typescript
// src/lib/form-state.ts
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { error: string }

// 사용 예
export type JobFormState = ActionResult<{ id: string }> | null | undefined
```

### 접근성 (Accessibility)

- File input: `<input type="file" accept="image/jpeg,image/png,image/webp">` + `aria-label`
- Error message: `role="alert"` + `aria-live="polite"`
- Loading state: `aria-busy="true"` + spinner에 `aria-label="로딩 중"`
- 카테고리 선택: `<fieldset>` + `<legend>` 패턴 (현재 biz form에서 button 그리드 사용 중)

### 낙관적 업데이트 (Optimistic Updates)

React 19의 `useOptimistic` 활용 가능:
```typescript
const [optimisticJobs, addOptimisticJob] = useOptimistic(jobs,
  (state, newJob: Job) => [newJob, ...state]
)
```

Phase 3 필수는 아님. Server Action + `useTransition`으로 충분.

---

## Proposed Plan Breakdown

플래너에게 제안하는 플랜 구성 (6-8개 예상):

| 플랜 # | 이름 | Wave | 내용 |
|--------|------|------|------|
| 03-01 | Wave 0: 테스트 인프라 + Schema 확장 | 0 | 테스트 파일 skeleton 생성, Prisma schema에 duties/requirements/dressCode/whatToBring/tags/address 컬럼 추가, `prisma db push` |
| 03-02 | Wave 1: SQL Migrations (Storage + RLS + pg_cron + GIST) | 1 | 4개 migration 파일 작성+적용: storage bucket/RLS, jobs RLS, pg_cron, GIST 인덱스 |
| 03-03 | Wave 2: queries.ts 확장 + Server Actions (Job CRUD) | 2 | `getJobsPaginated`, `getJobsByDistance`, `getJobsByBusiness`, `getBusinessProfileByUserId` queries 추가. createJob/updateJob/deleteJob Server Actions |
| 03-04 | Wave 3: Worker 프로필 CRUD + Avatar 업로드 | 3 | `updateWorkerProfile` Server Action, Avatar upload Server Action, `/my/profile/edit/page.tsx` 신설 |
| 03-05 | Wave 4: Business 프로필 CRUD | 4 | `updateBusinessProfile` Server Action, `/biz/profile` 페이지 wire |
| 03-06 | Wave 5: 랜딩 + 공고 목록 페이지네이션 + 거리 정렬 | 5 | 랜딩 `/` 확장, `/home` 무한 스크롤 + PostGIS 거리 정렬, `JobListInfinite` 컴포넌트 |
| 03-07 | Wave 6: Business 공고 CRUD UI Wire + 공고 상세 | 6 | `biz/posts/new` Server Action 연결, biz/posts/[id] 수정/삭제, `/posts/[id]` 공개 상세 |
| 03-08 | Wave 7: E2E 검증 + pg_cron 확인 | 7 | 통합 테스트 run, pg_cron 동작 확인, UAT 시나리오 실행 |

---

## Key Risks + Mitigations

### Risk 1: Next.js body size limit으로 5MB 업로드 실패

**위험도**: HIGH
**설명**: Server Action 기본 body limit 1MB. 5MB 파일 업로드 즉시 실패.
**완화**: `next.config.ts`에 `experimental.serverActions.bodySizeLimit: '5mb'` 설정을 Wave 0에서 반드시 추가.

### Risk 2: pg_cron workDate+startTime 타임존 오계산

**위험도**: MEDIUM
**설명**: pg_cron UTC 동작 + workDate(DATE) + startTime(VARCHAR) 조합 시 타임존 변환 오류 가능. KST 09:00 공고가 UTC 00:00에 만료되거나, UTC 기준 아직 안 지났는데 만료 처리될 수 있음.
**완화**: seed 데이터의 workDate/startTime 저장 기준 확인. UTC 기준 테스트 작성. lazy filter를 `now()` UTC 기준으로 단일 계산.

### Risk 3: Prisma `$queryRaw` 결과 타입 mismatch

**위험도**: MEDIUM
**설명**: raw query 결과의 Decimal 컬럼이 string으로 오는 경우. adaptJob adapter가 Number() 코어션을 하지 않으면 `"12500"` (문자열) 전달.
**완화**: `JobWithDistance` interface를 실제 pg driver 반환 타입 기준으로 정의. 모든 numeric 필드에 `Number()` 명시적 변환.

### Risk 4: Jobs RLS 활성화로 기존 Prisma 쿼리 영향

**위험도**: LOW (이론적)
**설명**: Prisma는 DIRECT_URL (service role)로 연결 → RLS 바이패스. 하지만 `supabase-js` 클라이언트 통한 접근이 있으면 영향.
**완화**: Phase 3 코드에서 supabase-js로 jobs 테이블 접근하는 곳 확인 (현재 없음). Prisma만 사용.

### Risk 5: Job 생성 시 lat/lng 없음 (주소→좌표 변환 미구현)

**위험도**: HIGH
**설명**: POST-01은 공고 주소 필드 필요. 주소→좌표 변환(Kakao API)은 Phase 3 out of scope. `location` 컬럼(geography)에 null 허용이지만 D-06 거리 검색에서 위치 없는 공고 제외됨.
**완화**: Phase 3에서 Business Profile의 lat/lng를 새 공고의 기본 좌표로 자동 복사. 공고 폼에서 "사업장 위치 사용" 체크박스 + 수동 좌표 입력 필드(위도/경도) 제공. 주소 입력 필드는 text로만 저장.

---

## Known Pitfalls — Aggregated

(연구 영역 전체에서 수집, 최소 25개)

### Storage & Avatar
1. Next.js Server Action body size limit 기본 1MB — `serverActions.bodySizeLimit: '5mb'` 필수
2. `storage.objects` RLS 미설정 시 업로드 401/403 자동 차단
3. `createClient()`가 async — `await createClient()` 누락 시 undefined
4. `upload(..., { upsert: false })` 기본값 — 같은 경로 재업로드 409 Conflict
5. `TO authenticated` 절 없으면 anon도 쓰기 가능
6. `auth.uid()`가 null (anon 사용자) 시 정책 실패 — INSERT 정책에 `TO authenticated` 필수

### pg_cron
7. pg_cron은 UTC 기준 — KST 변환 주의
8. `workDate(DATE) + startTime(VARCHAR)` 직접 덧셈 불가 — `CAST("startTime" AS time)` 또는 `"startTime"::time` 필수
9. `cron.unschedule()` 호출 순서 — 없는 job 제거 시 false 반환 (에러 아님)
10. `apply-supabase-migrations.ts`의 tracking table로 중복 실행 방지되지만 SQL 내용 변경은 감지 안 함

### PostGIS / $queryRaw
11. `ST_MakePoint(lng, lat)` — 경도 첫 번째, 위도 두 번째 (반대로 하면 지구 반대편)
12. `ST_DWithin(geog, geog, meters)` — geography 타입은 미터 단위 (degrees 아님)
13. Prisma `$queryRaw` Decimal 컬럼 → pg driver에서 string 반환 가능 — `Number()` 변환 필수
14. GIST 인덱스 없으면 `ST_DWithin` full table scan
15. cursor 튜플 비교 `(col1, col2) < (v1, v2)` — uuid 캐스팅 `::uuid` 필수
16. `Prisma.sql` template에서 identifier (컬럼명, 테이블명) 주입 불가

### Jobs RLS
17. `"authorId"` double-quote 필수 — PostgreSQL camelCase identifier case-folding
18. `applications`/`reviews` 실수로 RLS 켜면 Phase 4 전에 CRUD 깨짐
19. `CREATE POLICY IF NOT EXISTS` PostgreSQL에서 지원 안 됨 — migration tracking으로 중복 방지
20. Prisma는 service role로 RLS 바이패스 — RLS는 supabase-js client 접근에만 적용

### Next.js 16 Server Actions & Caching
21. `revalidateTag('jobs')` 단일 인수 deprecated — 두 번째 인수 `'max'` 필수
22. `redirect()`를 try-catch 내부에 두면 catch가 삼킴
23. `revalidatePath`는 void 반환 — await 불필요
24. `'use server'` 파일에서 `redirect()` 사용 시 `import { redirect } from 'next/navigation'` 필요

### Infinite Scroll
25. IntersectionObserver `disconnect()` cleanup 필수 — 메모리 누수
26. sentinel div가 cursor null 시에도 DOM에 있으면 빈 fetch 반복
27. `useTransition` + `!isPending` 중복 호출 방지 조건 필수
28. hydration mismatch — `useState(initialJobs)` 서버 HTML과 일치해야

### Geolocation
29. `navigator.geolocation`은 Client Component 전용 — SSR에서 undefined
30. 한번 거부된 geolocation 권한은 `getCurrentPosition` 호출로 재요청 불가
31. localhost에서 HTTP geolocation 요청 — Firefox/Safari는 HTTPS 필요

### Form / Schema
32. 5-step form이 `'use client'` — `<form action={serverAction}>` 직접 연결 불가, 명시적 호출 필요
33. Job 생성 시 lat/lng 미제공 → location null → 거리 검색에서 제외
34. `FormData.getAll('fieldName')` — 배열 필드는 `append()` + `getAll()` 패턴
35. `preferredCategories` 배열 FormData 전달 — 여러 번 append 후 `getAll()`

---

## External Refs Consulted

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — revalidatePath 서명 확인
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md` — revalidateTag 두 번째 인수 필수 확인
- `nextjs.org/blog/next-16` — Next.js 16 breaking changes 전체 목록 [VERIFIED: 2025-10-21 발행]
- `github.com/citusdata/pg_cron` — cron.schedule $$ dollar-quoting + cron.unschedule 문법
- `supabase.com/docs/guides/storage/buckets/creating-buckets` — `INSERT INTO storage.buckets` SQL 패턴
- `supabase.com/docs/guides/storage/security/access-control` — `storage.foldername()` helper 함수 + RLS 정책 패턴
- `prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries` — $queryRaw tagged template + 타입 제네릭
- `prisma/migrations/20260410000000_init_phase2/migration.sql` — GIST 인덱스 누락 확인 [직접 파일 확인]

### Secondary (MEDIUM confidence)
- `supabase.com/docs/guides/storage/uploads/standard-uploads` — 6MB 일반 업로드 한도, upsert 옵션
- WebSearch: Supabase Storage + Next.js Server Action body size limit 경고
- WebSearch: pg_cron Supabase 1.6.4, CREATE EXTENSION 방법
- `.planning/phases/02-supabase-prisma-auth/02-02-SUMMARY.md` — Phase 2 migration 현황 확인
- `.planning/phases/02-supabase-prisma-auth/02-03-SUMMARY.md` — dal.ts, proxy.ts 패턴 확인
- `.planning/phases/02-supabase-prisma-auth/02-07-SUMMARY.md` — queries.ts stub 목록 확인
- `src/app/biz/posts/new/page.tsx` — 5-step form UI 현황 직접 확인

### Tertiary (LOW confidence — 확인 필요)
- IntersectionObserver 무한 스크롤 패턴 — 표준 패턴이지만 React 19 + useTransition 조합은 미검증
- `navigator.permissions.query({ name: 'geolocation' })` — 구형 브라우저 지원 여부 미검증

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IntersectionObserver + useTransition + Server Action 조합이 React 19에서 안정적 동작 | Research Area 6 | hydration mismatch 또는 중복 호출. 대안: Route Handler + fetch 패턴 |
| A2 | Supabase workDate는 UTC 기준으로 저장됨 (seed.ts 확인 안 함) | Research Area 2 | pg_cron 만료 시간 오계산 |
| A3 | Phase 3에서 `cacheComponents: false` (미활성화) 유지 — 페이지들이 항상 dynamic | Research Area 10 | 만약 일부 페이지가 static으로 pre-render되면 revalidatePath 필요성 증가 |
| A4 | `storage.foldername(name)[2]` 가 `avatars/{user_id}/filename` 구조에서 user_id를 정확히 추출 | Research Area 1 | RLS 정책이 예상과 다르게 동작 — 테스트로 검증 필요 |
| A5 | D-01의 `avatars/{user_id}.{ext}` 경로 구조를 서브폴더 `avatars/{user_id}/avatar.ext`로 변경해도 결정 범위 내 | Research Area 1 | D-01 재확인 필요 — foldername 헬퍼 활용이 더 자연스러움 |
