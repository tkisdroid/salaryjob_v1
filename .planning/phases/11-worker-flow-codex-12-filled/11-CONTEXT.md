# Phase 11: Worker Flow 기능 수정 — Codex 감사 12건

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Codex Adversarial Audit (2026-04-21, 4.7M tokens)

<domain>
## Phase Boundary

Worker 역할의 기능적 버그 12건을 수정합니다. 내용/디자인은 건드리지 않고 기능적인 부분만 수정합니다. 불필요한 코드(dead buttons, orphan components) 정리 포함.

**핵심 원칙:** 기존 UI 레이아웃/스타일은 유지. 기능 동작만 수정.
</domain>

<decisions>
## Implementation Decisions

### 지원 상태 모델 (CRITICAL)
- BUG-W01: `apply-confirm-flow.tsx`가 "지원 확정" 표시하지만 `applyOneTap`은 `status="pending"` 저장 → UI를 pending 중심으로 수정 ("지원 완료, 사업자 확인 중" 등)
- BUG-W02: `applyOneTap`이 지원 시점에 `jobs.filled` 증가 → confirmed 시점으로 이동하거나, pending 해제/거절 시 감소 로직 추가
- BUG-W03: 지원 화면이 이미 지원/마감/정원초과를 서버 렌더 단계에서 막지 않음 → page.tsx에서 서버 사이드 체크 추가

### 마이페이지 상태 필터링
- BUG-W04: `my/page.tsx` 최근 완료 근무가 `status === "completed"` 필터 → checkout이 `settled` 저장하므로 `settled` 포함하도록 수정
- BUG-W05: "최근 완료 전체 보기" → `/my/applications?tab=completed` 이동 → `applications-client.tsx`는 `upcoming|active|done`만 허용 → `done` 탭으로 매핑 또는 `completed` 탭 추가
- BUG-W06: `applications-client.tsx` STATUS_CONFIG에 `checked_in` 누락 → 런타임 오류 방지를 위해 추가

### 정산 금액 표시
- BUG-W07: check-in-flow.tsx 결과 화면 + settlements/page.tsx가 gross `earnings`만 표시 → `netEarnings`(실지급액) 기준으로 변경, `commissionAmount` 별도 표시

### 하드코딩/미구현 제거
- BUG-W08: `getCurrentWorker()`가 `noShowCount`, `verifiedId`, `verifiedPhone`, `skills`, `totalEarnings`, `thisMonthEarnings`를 하드코딩 → 실제 DB aggregation 쿼리로 교체
- BUG-W09: `/my/favorites/page.tsx` "준비 중" 페이지 → 기능 구현이 아닌 명확한 coming-soon 또는 라우트 제거
- BUG-W10: `/posts/new/page.tsx` handleSubmit이 아무것도 안 함 → Worker 글 등록이 비즈니스 모델상 불필요하면 라우트 제거, 필요하면 구현

### 검색/탐색
- BUG-W11: search/page.tsx + explore/page.tsx가 DB에서 제한된 행만 가져와 클라이언트 필터링 → 서버 사이드 필터링 + 페이지네이션으로 전환

### 인증 부트스트랩
- BUG-W12: 소셜/매직링크 가입 후 prisma.user/프로필 row 미보장 → role-select 전에 user+profile ensure 로직 추가

### Claude's Discretion
- filled 카운트 수정 시 트랜잭션 범위 결정
- STATUS_CONFIG에 추가할 checked_in의 표시 문구/색상
- getCurrentWorker 쿼리 최적화 (단일 쿼리 vs 다중)
- 클라이언트 필터링→서버 전환 시 API 설계
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Worker 페이지
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` — 지원 확정 UI (BUG-W01)
- `src/app/(worker)/posts/[id]/apply/actions.ts` — applyOneTap 서버 액션 (BUG-W01, W02)
- `src/app/(worker)/posts/[id]/apply/page.tsx` — 지원 화면 (BUG-W03)
- `src/app/(worker)/my/page.tsx` — 마이페이지 (BUG-W04, W08)
- `src/app/(worker)/my/applications/applications-client.tsx` — 지원 목록 (BUG-W05, W06)
- `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` — 체크인/아웃 (BUG-W07)
- `src/app/(worker)/my/settlements/page.tsx` — 정산 내역 (BUG-W07)
- `src/app/(worker)/my/favorites/page.tsx` — 즐겨찾기 (BUG-W09)
- `src/app/(worker)/posts/new/page.tsx` — 글 등록 (BUG-W10)
- `src/app/(worker)/search/page.tsx` — 검색 (BUG-W11)
- `src/app/(worker)/explore/page.tsx` — 탐색 (BUG-W11)

### 공통
- `src/lib/db/queries.ts` — getCurrentWorker, getApplications (BUG-W08)
- `src/app/(auth)/signup/actions.ts` — 소셜 가입 (BUG-W12)
- `src/app/(auth)/role-select/actions.ts` — 역할 선택 (BUG-W12)
- `prisma/schema.prisma` — ApplicationStatus enum, Job.filled
</canonical_refs>

<specifics>
## Specific Ideas

- BUG-W01 수정 시 Timee 모델 참조: 자동수락은 pg_cron에 의존하므로 UI는 "지원 완료, 자동 확정 대기 중" 으로 표현
- BUG-W02 filled 증가는 `acceptApplication` (biz 승인) 또는 pg_cron auto-accept에서만 발생해야 함
- BUG-W06 checked_in은 Prisma enum에 있지만 현재 코드에서 미사용 → STATUS_CONFIG에 추가만 하고 별도 flow는 만들지 않음
- BUG-W08 totalEarnings는 `Settlement.netEarnings` SUM, thisMonthEarnings도 동일하게 월 필터
</specifics>

<deferred>
## Deferred Ideas

- 즐겨찾기 전체 기능 구현 (BUG-W09 → 라우트 정리만, 전체 구현은 v2)
- Worker 글 등록 기능 (BUG-W10 → 비즈니스 모델 검증 후 결정)
- 검색 고도화: 위치 기반 + PostGIS (BUG-W11 → 서버 필터링만, geo는 v2)
</deferred>

---

*Phase: 11-worker-flow-codex-12-filled*
*Context gathered: 2026-04-21 via Codex Adversarial Audit*
