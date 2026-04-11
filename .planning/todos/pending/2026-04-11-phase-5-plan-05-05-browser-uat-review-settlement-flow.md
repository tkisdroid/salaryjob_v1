---
created: 2026-04-11T05:11:22.155Z
title: Phase 5 Plan 05-05 브라우저 UAT — 리뷰+정산 UI 4개 시나리오
area: ui
priority: high
source: phase-05-plan-05-05 human-verify checkpoint (deferred)
files:
  - src/app/(worker)/my/applications/[id]/review/page.tsx
  - src/app/(worker)/my/settlements/page.tsx
  - src/app/biz/posts/[id]/applicants/[applicantId]/review/page.tsx
  - src/app/biz/settlements/page.tsx
  - src/components/ui/star-rating-input.tsx
  - src/components/ui/tag-chip-picker.tsx
  - src/components/shared/review-form.tsx
  - src/components/shared/settlement-card.tsx
  - src/components/worker/review-prompt-banner.tsx
---

## Problem

Phase 5 Plan 05-05의 human-verify checkpoint를 사용자 요청에 따라 deferred 처리. 리뷰 + 정산 UI(4개 페이지 + 5개 컴포넌트)가 Plan 03 server action과 Plan 04 settlement query에 실제로 wiring되어 동작하는지 브라우저에서 수동 검증 필요.

## Solution

아래 4개 시나리오를 dev 서버에서 순서대로 실행하고 결과 회신:

**Prereq:** `npm run db:seed` → `npm run dev`

**Scenario A — Worker review + settlement flow**
1. `worker@dev.gignow.com` 로그인
2. `/my/settlements` → 총수입 카드 + 이번 달 카드 + (미리뷰 항목 있으면) 노란 배너
3. 배너 "리뷰 작성하기" 클릭 → `/my/applications/{id}/review` → 별점 + 태그 + 코멘트 제출
4. 성공 토스트 + `/my/applications/{id}` 리다이렉트
5. 같은 URL 재접속 → `?message=already_reviewed`

**Scenario B — Biz review + settlement flow**
1. `cafe@dev.gignow.com` 로그인
2. `/biz/settlements` → 누적/이번 달 카드 + 정산 목록
3. `/biz/posts/{jobId}/applicants/{applicantId}/review` → 폼 렌더 + 제출
4. 동일 URL 재접속 → `?message=already_reviewed`

**Scenario C — Gate behaviour**
1. Worker로 `in_progress` 상태 지원의 리뷰 URL 접속 → `?error=not_settled`
2. 다른 Worker 지원 URL 시도 → `/login`

**Scenario D — Empty state**
1. 정산 내역 없는 Worker로 `/my/settlements` → "아직 정산 내역이 없어요" 카드

## Context

- Plan 05-05 태스크 1, 2는 commits `6bac992`, `fa8a3fb`로 이미 랜딩됨
- 자동화 테스트 48개는 전부 GREEN (Plan 03/04 서버 레이어 검증)
- 이 todo가 resolve되면 Plan 05-05 SUMMARY.md에 UAT 결과 기록
- Phase 5 verification (Plan 05-07) 전에 반드시 해결
