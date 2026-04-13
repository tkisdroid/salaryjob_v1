# Phase 6: Admin Backoffice — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

운영자(ADMIN)용 백오피스와 이를 뒷받침하는 사업자(BusinessProfile) 데이터 확장. 네 가지 기능 축:
1. Admin이 사업장 프로필을 검색·정렬·조회할 수 있는 /admin 라우트
2. 사업장별 수수료율(%) 관리 + 정산 시점 스냅샷 적용
3. 사업자 회원가입 시점의 사업자등록번호 입력 + 첫 공고 등록 시 사업자등록증 이미지 업로드 유도 게이트
4. Admin이 사업자등록번호 / 대표자명 / 연락처 / 등록증 이미지를 열람할 수 있는 관리자 뷰

범위 밖(v2로 보류):
- 사업장 편집/제재(ban) — Admin은 현재 phase에서 열람 중심
- 워커 관리 화면 — 본 Phase는 사업자 운영만
- 실결제/원천징수(Toss) — 수수료 "계산 + 저장"까지만. 실제 출금은 v2

</domain>

<decisions>
## Implementation Decisions

### Admin 라우팅·접근 모델
- **D-27:** `/admin` 전용 루트. middleware에서 role=ADMIN 외 403(또는 /login?error=admin_required)
- **D-28:** 로그인 시 ADMIN 역할이면 `/admin`으로 자동 리다이렉트(기존 `/home`/`/biz` 분기에 ADMIN 우선 분기 추가)
- **D-29:** Admin 내비게이션은 /biz 사이드바 재사용 금지 — `AdminSidebar` 별도 컴포넌트로 분리

### 사업자 인증 게이트
- **D-30:** 가입 시점에는 **사업자등록번호 10자리만** 입력받음(이미지 업로드 생략). 형식(NNN-NN-NNNNN) 정규식 통과 시 `verified=true` 자동 승인
- **D-31:** 공고 등록(첫 게시) 시 사업자등록증 이미지가 필요 — `businessRegImageUrl is null`이면 `/biz/verify` 이미지 업로드 플로우로 리다이렉트
- **D-32:** 이미지 업로드 시 OCR로 사업자등록번호 자동 추출 → 입력된 regNumber와 일치 확인. 참고: https://purecode.tistory.com/2 (Naver CLOVA OCR 스타일)
- **D-33:** 이미지 업로드·OCR 실패해도 이미지 저장은 진행 — 번호 불일치는 admin 재검토 플래그로만 기록(자동 거부 X). 운영 초기 False Positive 허용

### 수수료 모델
- **D-34:** 정산 시점 스냅샷 적용. checkOut Server Action에서 `gross → commission/net` 계산 시 `BusinessProfile.commissionRate`(override) 또는 전역 default rate 사용. 과거 settled 행은 불변
- **D-35:** 전역 기본 수수료율 **0% 초기 시작**. 향후 5% → 10% 단계적 확대. 환경변수 또는 config 테이블 후보(research에서 결정)
- **D-36:** `commissionRate`는 Decimal(5,2), nullable. null이면 전역 default 사용. admin이 명시 입력 시 override

### 스키마 확장 범위
- **D-37:** `BusinessProfile`에 아래 컬럼 추가 — 모두 nullable (기존 row 호환):
  - `businessRegNumber` String? (형식: NNN-NN-NNNNN)
  - `ownerName` String?
  - `ownerPhone` String?
  - `businessRegImageUrl` String? (Supabase Storage URL)
  - `commissionRate` Decimal(5,2)?
- **D-38:** Supabase Storage 버킷 `business-reg-docs` 신설. RLS: owner + ADMIN만 read. uploader는 소유자만
- **D-39:** 기존 `verified: Boolean` 컬럼 재사용 — D-30 자동 승인 로직이 이 플래그를 토글

### Admin 검색·정렬
- **D-40:** 검색 필드 — 사업장명(ILIKE), 사업자번호(ILIKE with dashes normalized), 대표자명(ILIKE), 연락처(ILIKE digits-only)
- **D-41:** 필터 — verified 상태(verified/unverified). "pending" 개념은 D-30 자동 승인으로 사실상 없음(운영상 unverified = regNumber 미입력 또는 형식 오류)
- **D-42:** 정렬 — createdAt asc/desc (default desc), commissionRate asc/desc
- **D-43:** 페이지네이션 — 커서 기반(기존 Phase 3 `getJobsPaginated` 패턴 재사용). 초기 목록 20건

### Claude's Discretion
- `/admin` 레이아웃 세부(사이드바 vs 탑바), Admin 대시보드 첫 화면 카드 구성
- Admin 수수료 입력 UI(숫자 스피너 vs 직접 입력)
- OCR 실패 시 사용자 피드백 카피
- Supabase Storage 버킷 권한 policy 세부 SQL
- 검색 debounce 간격, 빈 결과 플레이스홀더 문구

</decisions>

<specifics>
## Specific Ideas

- **OCR 참고:** https://purecode.tistory.com/2 — Naver CLOVA OCR Secret(General) API 사용 튜토리얼. Next.js Server Action에서 파일 업로드 + 외부 API 호출 패턴. env `CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL` 도입 예상
- **사업자등록번호 형식:** 한국 공식 10자리(XXX-XX-XXXXX). 숫자만 보관 vs 하이픈 포함 — 입력은 자동포맷, DB는 숫자만 10자 저장 추천(검색 편의)
- **전화번호:** User.phone은 Supabase Auth 전화인증용. ownerPhone은 별도 컬럼으로 분리(가입자 ≠ 대표자일 수 있음)
- **admin 계정 생성:** Supabase Auth에서 role='ADMIN' 수동 설정(초기 시드 또는 SQL). 본 phase에서 admin 초대 UI는 생성 안 함 — 최초 1명은 수동 시드

</specifics>

<canonical_refs>
## Canonical References

### Schema baseline
- `prisma/schema.prisma` — 현재 BusinessProfile/User/Job 모델. Phase 6는 BusinessProfile만 확장
- `prisma/migrations/` 및 `supabase/migrations/` (Phase 3/4에서 사용한 direct-SQL 마이그레이션 패턴) — 신규 컬럼/버킷 추가 방식 참고

### Auth + Routing
- `src/lib/auth/routing.ts` — 기존 role 기반 분기 (canRoleAccessPath, defaultHomeForRole). D-27/D-28 구현 타겟
- `src/lib/dal.ts` — `requireBusiness`/`requireWorker` 참고. 신규 `requireAdmin()` 추가 예상
- `src/lib/supabase/middleware.ts` — /admin 게이팅 삽입 지점

### Settlement (수수료 스냅샷 지점)
- `src/app/biz/posts/actions.ts` 또는 worker check-out action — `checkOut` Server Action 내 gross/commission/net 계산 로직이 수정 지점(Phase 5 SETL-01 참고)
- `.planning/phases/05-reviews-settlements/05-04-PLAN.md` + SUMMARY — settlement queries 월경계 Asia/Seoul 패턴

### 기존 verify 페이지
- `src/app/biz/verify/page.tsx` — 현 mock OCR 화면. Phase 6에서 이미지 업로드 + 실제 OCR 연동으로 재작업

### 디자인 시스템
- `.impeccable.md` + `.agents/skills/impeccable/SKILL.md` — 톤/컬러/간격 가이드
- `src/components/ui/` — shadcn 컴포넌트 재사용

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `canRoleAccessPath`, `defaultHomeForRole` (`src/lib/auth/routing.ts`) — ADMIN 분기 확장 지점
- `requireBusiness`, `requireWorker`, `requireApplicationOwner` (`src/lib/dal.ts`) — 같은 패턴으로 `requireAdmin()` 추가
- Phase 3 커서 페이지네이션(`getJobsPaginated`) — Admin 목록 페이지네이션에 재사용
- `src/components/ui/input`, `toggle-group`, `card` — 검색/필터 UI 빌드 블록
- Supabase Storage 패턴 (Phase 3 avatar 업로드, `src/app/(worker)/my/profile/actions.ts`) — business-reg-docs 버킷 업로드 참고

### Established Patterns
- Server Action + Zod validation + `firstFieldError` (`src/app/biz/posts/actions.ts` 참고) — Admin CRUD에도 동일 패턴
- 커밋 단위 `fix|feat(phase-plan): ...` 메시지 컨벤션
- 브랜드 컬러 oklch + 한국어 UI, 오프브랜드 컬러 금지

### Integration Points
- `/admin` 신규 route group (App Router). layout.tsx에서 `requireAdmin()` 게이트
- `BusinessProfile` 스키마 변경 → `prisma generate` + supabase migration
- 공고 등록 액션(`createJob`)에 "이미지 미업로드 시 redirect to /biz/verify" 가드 추가
- 정산 액션에 `commissionRate` 스냅샷 로직 삽입

### 현재 드리프트 경고
- STATE.md 기록된 `npx prisma generate` 필요성 — 본 phase는 스키마 확장이 있으므로 `prisma generate` 필수 실행 후 commit(내용은 gitignore되지만 타입 인덱스 변경 있을 수 있음)

</code_context>

<deferred>
## Deferred Ideas

- Admin에서 사업장 제재(ban/suspend) — v2
- Admin에서 워커 관리 화면(프로필 열람/제재) — v2
- Admin 활동 로그/감사 추적 — v2
- 사업자등록증 OCR 불일치 자동 거부 플로우 — 운영 데이터 확보 후 결정
- 실제 출금/원천징수(Toss) — v2 (PAY-01..04)
- Admin 초대 UI(이메일 기반) — v2. 최초 ADMIN은 수동 시드
- 수수료 이력 감사(audit trail) — 현재 phase는 스냅샷만, 이력 테이블은 v2

</deferred>

---

*Phase: 06-admin-backoffice*
*Context gathered: 2026-04-13*
