# Phase 13: Admin + 공통 수정 — Codex 감사 10건

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Codex Adversarial Audit (2026-04-21, 4.7M tokens)

<domain>
## Phase Boundary

Admin 역할 확장 + 코드베이스 공통 품질 수정 10건. 내용/디자인 변경 없이 기능적 수정과 코드 품질 개선만.
</domain>

<decisions>
## Implementation Decisions

### Admin 기능 확장
- BUG-A01: admin 사이드바 메뉴가 `/admin`, `/admin/businesses`뿐 → users, workers, settlements, jobs 메뉴 추가
- BUG-A02: 대시보드가 BusinessProfile count만 표시 → 전체 사용자/워커/공고/지원/근무/정산 집계 추가
- BUG-A03: 수수료 저장 form이 액션 반환값을 버림 → 에러/성공 피드백 표시
- BUG-A04: 사업자 인증 수동 승인/반려 UI 없음 → approve/reject 버튼 + 서버 액션 추가
- BUG-A05: admin 정산 oversight 없음 → 전체 정산 목록 조회 페이지 추가

### 코드 품질 (공통)
- BUG-C01: `src/lib/db/queries.ts`에 `any` 타입 남용 → Prisma payload 타입 또는 명시 타입으로 교체 (adaptBusiness, adaptJob, raw row types 등)
- BUG-C02: `getApplications()` 인증 실패를 catch하고 빈 배열 반환 → 인증 실패 시 throw 또는 명시적 에러 반환
- BUG-C03: env non-null 단언 (`!`) 사용 → env 누락 시 graceful error (throw with message)
- BUG-C04: 레거시/dead 파일 정리 → `salaryjob*.html`, `_design_review/`, `src/_legacy/*`, orphan 컴포넌트 삭제
- BUG-C05: silent error swallowing 패턴 → OCR, upload, push 등에서 에러 로그 추가 또는 사용자 피드백

### Claude's Discretion
- Admin 새 페이지들의 데이터 fetching 패턴 (서버 컴포넌트 vs API)
- any 타입 교체 시 Prisma select 타입 추론 활용 범위
- dead 파일 판별 기준 (git blame으로 최근 사용 여부 확인)
- env validation 위치 (각 파일 vs 중앙 config)
</decisions>

<canonical_refs>
## Canonical References

### Admin
- `src/app/admin/admin-sidebar.tsx` — 사이드바 메뉴 (BUG-A01)
- `src/app/admin/page.tsx` — 대시보드 (BUG-A02)
- `src/app/admin/businesses/[id]/page.tsx` — 사업자 상세/수수료 (BUG-A03, A04)
- `src/lib/db/admin-queries.ts` — admin 쿼리 레이어 (BUG-A02, A05)
- `src/lib/actions/admin-actions.ts` — admin 서버 액션 (BUG-A03, A04)

### 공통
- `src/lib/db/queries.ts` — any 타입, getApplications (BUG-C01, C02)
- `src/app/(auth)/role-select/actions.ts` — env non-null 단언 (BUG-C03)
- `src/app/biz/verify/actions.ts` — silent error swallowing (BUG-C05)
- `prisma/schema.prisma` — 타입 참조
</canonical_refs>

<specifics>
## Specific Ideas

- BUG-A01: 기존 AdminSidebar 패턴 따라서 NavItem 추가
- BUG-A02: prisma aggregate/count 쿼리로 대시보드 데이터
- BUG-A04: `updateBusinessVerification(id, verified: boolean)` 액션 추가
- BUG-C01: `adaptBusiness`의 `any` → `Prisma.BusinessProfileGetPayload<{select: ...}>` 사용
- BUG-C04: `_design_review/`, `salaryjob*.html`, `src/_legacy/` 확인 후 삭제
</specifics>

<deferred>
## Deferred Ideas

- Admin 사용자 관리 CRUD 전체 (BUG-A01 → 목록 조회만, 수정/삭제는 v2)
- Admin 정산 재처리/보류 기능 (BUG-A05 → 조회만, 액션은 v2)
- 전체 코드베이스 타입 안전성 감사 (BUG-C01 → queries.ts만, 전체는 v2)
</deferred>

---

*Phase: 13-admin-codex-10*
*Context gathered: 2026-04-21 via Codex Adversarial Audit*
