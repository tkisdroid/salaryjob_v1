# Phase 12: Business Flow 기능 수정 — Codex 감사 13건

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Codex Adversarial Audit (2026-04-21, 4.7M tokens)

<domain>
## Phase Boundary

Business 역할의 기능적 버그 13건을 수정합니다. 내용/디자인은 건드리지 않고 기능적인 부분만 수정합니다.

**핵심 원칙:** 기존 UI 레이아웃/스타일은 유지. 기능 동작만 수정.
</domain>

<decisions>
## Implementation Decisions

### 공고 등록/수정 (CRITICAL)
- BUG-B01: 야간/익일 종료 시간을 UI에서 허용하지만 서버 `end <= start`를 0시간으로 거부 → 서버 검증에서 야간(end < start = 익일) 허용하도록 수정
- BUG-B02: `createJob`이 `{ error: "verify_required", redirectTo }` 반환해도 form이 `redirectTo`로 이동 안 함 → `new-job-form.tsx`에서 redirectTo 처리 추가
- BUG-B03: `updateJob` 액션 존재하지만 `/biz/posts/[id]/edit` UI 없음 → 공고 수정 페이지 생성
- BUG-B04: `/biz/posts/[id]/page.tsx` 삭제 실패 시 피드백 없음 → 에러 toast/alert 추가

### 지원자 관리
- BUG-B05: `applicants-client.tsx`가 `pending`일 때만 승인/거절 버튼 표시 → `confirmed` 상태에서도 취소 버튼 표시
- BUG-B06: `acceptApplication`은 상태만 변경, 알림/채팅 즉시 생성 없음 → 확정 시 push notification trigger + chat room ensure 추가
- BUG-B07: QR 생성이 공고 소유자만 확인, 해당 공고에 `in_progress` 워커 있는지 미확인 → 근무 상태 체크 추가
- BUG-B08: `checkout-qr-modal.tsx`가 `rate_limited` 등 QR 전용 오류를 일반 에러로 표시 → 전용 에러 메시지 매핑

### 리뷰/정산
- BUG-B09: biz review가 `settled` 상태에서만 허용, legacy `completed` 차단 → `completed` OR `settled` 허용
- BUG-B10: 정산 페이지가 조회만, 결제 수단/실행 없음 → 현재 스코프에서는 "정산 자동 처리" 안내 문구 추가 (실제 결제 연동은 v2)

### 설정 페이지
- BUG-B11: settings/payment, commission, support, notifications 4개 페이지 미구현 → 각각 명확한 coming-soon 또는 기본 기능 구현
- BUG-B11a: notifications/page.tsx "ON/OFF UI는 아직 준비 중" → coming-soon 표시

### 인재 제안
- BUG-B12: `sendWorkerOffer`가 DB row만 생성, 워커 수락/거절 경로 없음 → offer 알림 + 워커 측 수락/거절 UI는 v2 (현재는 offer 전송 후 안내 메시지)
- BUG-B13: `workers/page.tsx`가 전체 워커 노출, 필터링 없음 → 사업자 지역/카테고리 기반 기본 필터 추가

### Claude's Discretion
- 야간 시간 검증 로직 구체 구현 (endTime이 startTime보다 작으면 익일로 간주)
- 공고 수정 페이지의 form 재사용 vs 새로 만들기
- confirmed 취소 시 filled 감소 트랜잭션 범위
- QR 상태 체크 시 어떤 상태를 허용할지 (in_progress만? confirmed도?)
</decisions>

<canonical_refs>
## Canonical References

### Business 페이지
- `src/app/biz/posts/new/new-job-form.tsx` — 공고 등록 폼 (BUG-B01, B02)
- `src/app/biz/posts/actions.ts` — createJob, updateJob 서버 액션 (BUG-B01, B03)
- `src/app/biz/posts/[id]/page.tsx` — 공고 상세 (BUG-B04)
- `src/app/biz/posts/[id]/applicants/applicants-client.tsx` — 지원자 관리 (BUG-B05)
- `src/app/biz/posts/[id]/applicants/actions.ts` — acceptApplication, rejectApplication (BUG-B05, B06)
- `src/app/biz/posts/[id]/actions.ts` — QR 생성 (BUG-B07)
- `src/components/biz/checkout-qr-modal.tsx` — QR 모달 (BUG-B08)
- `src/app/biz/posts/[id]/applicants/[applicantId]/review/actions.ts` — 리뷰 (BUG-B09)
- `src/app/biz/settlements/page.tsx` — 정산 (BUG-B10)
- `src/app/biz/settings/payment/page.tsx` — 결제 설정 (BUG-B11)
- `src/app/biz/settings/notifications/page.tsx` — 알림 설정 (BUG-B11a)
- `src/app/biz/workers/actions.ts` — sendWorkerOffer (BUG-B12)
- `src/app/biz/workers/page.tsx` — 워커 목록 (BUG-B13)

### 공통
- `src/lib/services/chat.ts` — 채팅 서비스 (BUG-B06)
- `src/lib/actions/push-actions.ts` — push notification (BUG-B06)
- `prisma/schema.prisma` — ApplicationStatus, WorkerOffer
</canonical_refs>

<specifics>
## Specific Ideas

- BUG-B01: endTime < startTime → 익일 간주. 예: start=22:00, end=06:00 → 8시간 근무
- BUG-B03: new-job-form.tsx를 공유 컴포넌트로 리팩토링하여 edit에서도 재사용
- BUG-B06: acceptApplication 후 chat.ts의 getOrCreateChatRoom 호출 + push notification
- BUG-B09: review actions에서 `where: { status: "settled" }` → `where: { status: { in: ["settled", "completed"] } }`
</specifics>

<deferred>
## Deferred Ideas

- 실제 결제 수단 등록/실행 (BUG-B10 → v2 Toss Payments 연동)
- 워커 offer 수락/거절 UI (BUG-B12 → v2)
- settings 4개 페이지 전체 기능 (BUG-B11 → v2)
- 워커 필터링 고도화 (BUG-B13 → 기본만, geo 필터는 v2)
</deferred>

---

*Phase: 12-business-flow-codex-13-crud*
*Context gathered: 2026-04-21 via Codex Adversarial Audit*
