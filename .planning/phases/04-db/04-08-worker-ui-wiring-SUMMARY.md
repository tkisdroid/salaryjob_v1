---
phase: 04-db
plan: 08
subsystem: worker-ui-wiring
tags: [worker, ui, server-actions, realtime, qr-scanner, html5-qrcode, mock-removal, phase-4, wave-5]
one_liner: "Worker 4개 화면 + 3개 신규 컴포넌트를 실 Server Actions에 결선, Supabase Realtime 폴링 폴백 포함, html5-qrcode 카메라 통합, /my/applications 인라인 목업 완전 제거."
requirements: [APPL-01, APPL-02, APPL-04, SHIFT-01, SHIFT-02, SHIFT-03]
dependency_graph:
  requires:
    - "04-04 (applyOneTap, cancelApplication, getApplicationsByWorker)"
    - "04-05 (checkIn, checkOut, QR JWT, geofence)"
    - "04-06 (PushPermissionBanner — this plan mounts it)"
    - "04-03 (Supabase Realtime publication on applications)"
  provides:
    - "src/lib/supabase/realtime.ts — subscribeApplicationsForWorker / subscribeApplicationsForJob helpers (consumed by Plan 04-09 Biz applicants UI)"
    - "src/components/worker/qr-scanner.tsx — html5-qrcode wrapper with React 19 StrictMode guard"
    - "src/components/worker/cancel-application-dialog.tsx — base-ui alert-dialog with 24h D-21 rule"
    - "src/components/ui/sonner.tsx — lightweight in-house Toaster (sonner-compatible API surface)"
  affects:
    - "Plan 04-09 (imports subscribeApplicationsForJob from src/lib/supabase/realtime.ts)"
    - "Plan 04-10 HUMAN-UAT (Worker 화면 실 DB 왕복 수동 검증 — Task 7 deferred to UAT plan)"
tech-stack:
  added: [] # html5-qrcode was already installed in Plan 04-01
  patterns:
    - "Supabase Realtime + D-08 polling fallback: onStatusChange exposes channel status; CHANNEL_ERROR/TIMED_OUT toggles a 60s setInterval router.refresh; SUBSCRIBED clears it"
    - "html5-qrcode React 19 StrictMode guard: per-mount startedRef flag + async stop().then(clear) teardown; dynamic import ssr:false to keep camera module off the server"
    - "JSON.parse(JSON.stringify(row)) serialization at Server/Client component boundary for Prisma rows containing Decimal + Date — the client only displays, so primitive round-trip is safe"
    - "ApplicationError code → applicationErrorToKorean user-facing message — T-04-21 (info disclosure) mitigated at every Server Action callsite in this plan"
    - "base-ui/react AlertDialog parts (Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close) with controlled open state + inline phase machine (idle → pending → success/error)"
key-files:
  created:
    - src/lib/supabase/realtime.ts
    - src/app/(worker)/my/applications/applications-client.tsx
    - src/components/worker/cancel-application-dialog.tsx
    - src/components/worker/qr-scanner.tsx
    - src/components/ui/sonner.tsx
    - .planning/phases/04-db/04-08-worker-ui-wiring-SUMMARY.md
  modified:
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
    - src/app/(worker)/my/applications/page.tsx
    - src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx
    - src/app/(worker)/my/applications/[id]/check-in/page.tsx
    - src/app/(worker)/my/page.tsx
    - src/app/layout.tsx
decisions:
  - "JSON round-trip for Prisma row serialization across Server → Client boundary. Plan hinted at typed Awaited<ReturnType<...>> but Next 16 serialization rejects Decimal/Date in some code paths — simpler primitive shape avoids the issue and client only displays, never operates on Decimal math."
  - "Lightweight in-house Toaster (src/components/ui/sonner.tsx) because `sonner` npm package is not installed in this worktree. API surface matches (toast.success/error/warning/info + Toaster component) so callsites can swap the import path later without touching business code. cancel-application-dialog.tsx uses inline dialog feedback instead of toasts so it works independently of the toaster."
  - "CancelApplicationDialog uses inline phase-machine feedback (idle → pending → success/error) rather than toast popups. Rationale: the user needs to see success confirmation before the dialog closes, which is hard to guarantee with fire-and-forget toasts. Auto-dismisses 1.5s after success with router.refresh() so the list re-fetches."
  - "D-08 polling fallback lives directly in applications-client.tsx (not a reusable hook) because it is the only screen that needs the worker-scoped fallback in this plan. Plan 04-09's Biz applicants client will add its own copy if needed — premature abstraction deferred."
  - "check-in-flow.tsx phase machine has 6 states (ready/locating/working/scanning/submitting/done) rather than plan's 5. Added 'submitting' to differentiate the brief window between QR scan success and checkOut Server Action completion — without it the user sees the camera view flash back to working before settling on done, which is disorienting."
  - "QrScanner effect deps are explicitly [] (not [onScan, onError]) with ref-stabilized callbacks — re-running the effect on every parent render would crash html5-qrcode because stop()/start() are not atomic. React 19 StrictMode remount is handled by startedRef."
metrics:
  tasks: 6
  commits: 5
  files-created: 5
  files-modified: 6
  duration: "~60 minutes"
  completed: "2026-04-11"
---

# Phase 04-db Plan 08: Worker UI Wiring Summary

## One-liner

Worker 4개 주요 화면을 실 Server Actions에 결선하고, Supabase Realtime (D-08 60s 폴링 폴백 포함)으로 지원 상태를 실시간 갱신하며, html5-qrcode 카메라를 통합한 체크인/체크아웃 phase machine을 구현. `/my/applications`의 인라인 `APPLICATIONS` 목업 상수 완전 제거.

## What Shipped

### 1. `src/lib/supabase/realtime.ts` — Realtime 헬퍼

```ts
export function subscribeApplicationsForWorker(
  workerId: string,
  onChange: ApplicationChangeHandler,
  onStatusChange?: RealtimeStatusHandler,
): () => void

export function subscribeApplicationsForJob(
  jobId: string,
  onChange: ApplicationChangeHandler,
  onStatusChange?: RealtimeStatusHandler,
): () => void
```

`supabase.channel(...).on('postgres_changes', {filter: 'workerId=eq.X'|'jobId=eq.X'}, ...)` 의 타입화된 wrapper. unsubscribe 함수를 반환해 `useEffect` cleanup에 바로 꽂을 수 있음. `onStatusChange` 3번째 인자가 D-08 fallback의 트리거 — `CHANNEL_ERROR`/`TIMED_OUT` 시 호출자가 setState 해 60s setInterval로 폴링 전환 가능.

RLS (Plan 04-03 `20260412000001`)가 서버 쪽에서 row 필터링을 강제하므로, 클라이언트 filter는 성능/대역폭 최적화 목적 (belt-and-suspenders).

Plan 04-09 (Biz applicants UI)가 동일 파일에서 `subscribeApplicationsForJob`을 import 하도록 제네릭 API 설계.

### 2. `/posts/[id]/apply/apply-confirm-flow.tsx` — applyOneTap wire

Phase 1의 `setTimeout(() => setStep('confirmed'), 900)` 목업 제거:

```tsx
const handleConfirm = async () => {
  setStep("confirming");
  setErrorMessage(null);
  const result = await applyOneTap({ jobId: job.id });
  if (result.success) {
    setStep("confirmed");
  } else {
    setErrorMessage(applicationErrorToKorean(result.error));
    setStep("error");
  }
};
```

Phase가 4-state machine으로 확장: `review → confirming → confirmed | error`. Error 화면에 "다시 시도" + "홈으로" 버튼. 성공 화면의 CTA를 `/my` → `/my/applications`로 바꿔 방금 생성된 지원을 바로 확인할 수 있도록 조정.

T-04-21 (info disclosure) 대응: 모든 에러 문구는 `applicationErrorToKorean(code)`를 통과 — 원시 서버 에러 메시지는 UI에 절대 노출되지 않음.

### 3. `/my/applications` — 실 데이터 + Tabs + Realtime

**Before:** page.tsx에 `const APPLICATIONS: Application[] = [...]` 인라인 목업 배열 + `AllTab`/`PendingTab`/`AcceptedTab`/`CompletedTab` 컴포넌트가 이를 filter.

**After:** server component가 세 bucket을 `Promise.all`로 병렬 fetch 후 `ApplicationsClient`로 전달:

```tsx
const [upcoming, active, done] = await Promise.all([
  getApplicationsByWorker(session.id, { bucket: "upcoming" }),
  getApplicationsByWorker(session.id, { bucket: "active" }),
  getApplicationsByWorker(session.id, { bucket: "done" }),
]);
```

`applications-client.tsx`는:
- shadcn Tabs 3탭 (예정/진행중/완료) with counts
- `subscribeApplicationsForWorker` useEffect — INSERT/UPDATE/DELETE 감지 시 `router.refresh()`
- **D-08 폴링 폴백:** `pollingActive` state, `CHANNEL_ERROR`/`TIMED_OUT` 감지 시 true, 별도 useEffect가 60s setInterval로 refresh
- `ApplicationCard`: status 배지(아이콘 매핑) + 일자/시간/주소 + 상태별 액션 버튼 (체크인 / 체크아웃 / 취소)

```
pending → [취소]
confirmed → [체크인] [취소]
in_progress → [체크아웃]
completed → 금액 표시 only
```

`applications-client.tsx` line-level verify 수치:
- `pollingActive` 언급 4회
- `setInterval` 2회 (Realtime 폴백 타이머 + comment 제외한 실 호출)
- `CHANNEL_ERROR|TIMED_OUT` 매치 4회

### 4. `src/components/worker/cancel-application-dialog.tsx`

`@base-ui/react/alert-dialog` primitives 위에 쌓은 취소 확인 모달. D-21 24h 규칙 client-side 선행 검사:

```tsx
const hoursUntilStart = (workDateStartAt.getTime() - now.getTime()) / 3600_000;
const isLate = hoursUntilStart < 24;

await cancelApplication(applicationId, { acknowledgedNoShowRisk: isLate });
```

Phase machine: `idle → pending → success | error`. Late-cancel 시 amber 색 + "노쇼 수락하고 취소" 버튼. 성공 후 1.5초 후 자동 닫힘 + `router.refresh()`.

서버의 `cancelApplication`이 동일 규칙을 재검증하므로 (T-04-46 mitigation), 클라이언트 게이트는 UX 폴리시.

### 5. `src/components/worker/qr-scanner.tsx` — html5-qrcode wrapper

```tsx
const mod = await import("html5-qrcode");
scanner = new mod.Html5Qrcode(containerId);
await scanner.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: { width: 250, height: 250 } },
  (decodedText) => onScanRef.current?.(decodedText),
  () => {}, // per-frame errors are normal
);
```

**React 19 StrictMode guard:**
- `startedRef` — 이 mount에서 start()를 이미 호출했는지 추적
- `onScanRef`/`onErrorRef` — callback 안정화 (effect dep은 `[]`, 부모 re-render가 effect를 재실행해 stop/start 사이클이 발생하는 것 방지)
- 정리 단계: `scanner.stop().then(clear).catch().finally(() => startedRef.current = false)`

**Dynamic import ssr:false 패턴** (호출 측에서):
```tsx
const QrScanner = dynamic(
  () => import("@/components/worker/qr-scanner").then(m => m.QrScanner),
  { ssr: false },
);
```

html5-qrcode는 import 시점에 `window`/`navigator.mediaDevices`를 참조하므로 SSR 불가. dynamic import는 또한 ~150kb 번들을 체크인 페이지에 도달한 사용자에게만 전송해 초기 페이로드를 가볍게 유지.

### 6. `check-in-flow.tsx` — 6-phase machine

```
ready → locating → working
               ↓        ↓
           (error)   scanning → submitting → done
```

- **ready**: confirmed 상태, "체크인 시작" 버튼
- **locating**: `navigator.geolocation.getCurrentPosition({enableHighAccuracy:true, timeout:10s})` 해결 대기
- **working**: in_progress, elapsed timer, "근무 종료 (QR 체크아웃)" 버튼
- **scanning**: 블랙 배경 + QrScanner 마운트, 디코딩된 텍스트를 handleScan에 전달
- **submitting**: checkOut Server Action in-flight, 스피너
- **done**: 정산 요약 (earnings, actualHours, nightPremium) + 리뷰 링크

Error state 관리: 각 phase에서 inline error card 표시. Error 발생 시 이전 valid phase로 되돌림 (예: geofence 실패 → ready로, QR invalid → working으로).

Geolocation error 메시지 한국어화: 권한 거부 / 브라우저 미지원 / 기타 구분.

Plan 원안은 5-phase였지만 `submitting`을 추가한 이유: QR 스캔 성공 순간과 checkOut 완료 사이 잠깐의 빈 공간이 "근무 중" 화면으로 돌아갔다가 "done"으로 튀는 UX 깜빡임을 만들었음. `submitting` phase가 매끄러운 전환을 보장.

### 7. `/my/applications/[id]/check-in/page.tsx` — real Prisma + ownership gate

기존 `getApplicationById` adapter(Phase 1 shape)를 제거하고 `prisma.application.findUnique({include: {job: {include: {business:true}}}})`로 교체. `workerId !== session.id`면 `notFound()`. `JSON.parse(JSON.stringify(app))` 직렬화로 Decimal/Date → primitive, client component의 CheckInApplication 타입과 일치.

### 8. `/my/page.tsx` — PushPermissionBanner 마운트

```tsx
import { PushPermissionBanner } from "@/components/worker/push-permission-banner";

// profile card 위에:
<PushPermissionBanner />
```

Plan 04-06에서 컴포넌트는 이미 authored + unmounted 상태였고, 이 plan이 유일한 마운트 사이트. 배너는 self-dismiss 로직 내장 — 권한이 이미 granted/denied거나 localStorage flag가 있으면 렌더되지 않음.

### 9. `src/components/ui/sonner.tsx` — 인하우스 Toaster

`sonner` npm 패키지가 워크트리에 설치되어 있지 않음 (자세한 사항은 Deviations 참조). sonner 호환 최소 API만 구현:

```ts
export const toast = {
  success: (title, desc?) => ...,
  error: (title, desc?) => ...,
  warning: (title, desc?) => ...,
  info: (title, desc?) => ...,
};

export function Toaster({ position?, richColors? }): JSX.Element
```

Module-level queue + listener set, 4초 auto-dismiss, 수동 X 버튼 dismiss, 스택 레이아웃. 현재 이 plan에서 `toast.*`를 호출하는 사이트는 없음(cancel-dialog는 inline 피드백 사용) — 향후 사이트가 필요할 때 import path만 `sonner`로 바꾸면 교체 가능.

### 10. `src/app/layout.tsx`

Toaster를 `<body>` 최하단에 top-center 위치로 마운트.

## Server Action 호출 그래프

```
apply-confirm-flow.tsx         → applyOneTap({jobId})
                                 → { success: true, applicationId } | { success: false, error }

applications-client.tsx        → (via CancelApplicationDialog)
  CancelApplicationDialog      → cancelApplication(id, {acknowledgedNoShowRisk})
                                 → { success: true, noShowCounted } | { success: false, error }

check-in-flow.tsx             → checkIn(id, {lat, lng})
                                 → { success: true } | { success: false, error }
                              → checkOut(id, qrToken)
                                 → { success: true, actualHours, earnings, nightPremium } | { success: false, error }

/my 페이지                    → (via PushPermissionBanner → subscribePush)
```

모든 에러는 `applicationErrorToKorean`을 통과 — 원시 메시지 누출 없음.

## Realtime + Polling Fallback 플로우

```
┌─────────────────────────────────────────────────────────────┐
│ useEffect #1 — Realtime subscription (primary)              │
│                                                              │
│  subscribeApplicationsForWorker(workerId,                    │
│    (payload) => router.refresh(),                            │
│    (status) => {                                             │
│       if (CHANNEL_ERROR || TIMED_OUT) setPollingActive(true) │
│       else if (SUBSCRIBED)           setPollingActive(false) │
│    })                                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓ (on status change)
┌─────────────────────────────────────────────────────────────┐
│ useEffect #2 — Polling fallback (secondary)                  │
│                                                              │
│  if (!pollingActive) return                                  │
│  const id = setInterval(() => router.refresh(), 60_000)      │
│  return () => clearInterval(id)                              │
└─────────────────────────────────────────────────────────────┘
```

정상 상태 (`SUBSCRIBED`)로 복귀하면 setInterval이 자동으로 cleanup되어 폴링이 즉시 중단됨.

## Test Results

전체 tsc 기준, plan 04-08이 create/modify한 11개 파일 **0 TS errors**:

```
src/lib/supabase/realtime.ts                                     ✓
src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx         ✓
src/app/(worker)/my/applications/page.tsx                        ✓
src/app/(worker)/my/applications/applications-client.tsx        ✓
src/app/(worker)/my/applications/[id]/check-in/page.tsx          ✓
src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx ✓
src/components/worker/qr-scanner.tsx                             ✓
src/components/worker/cancel-application-dialog.tsx              ✓
src/components/ui/sonner.tsx                                     ✓
src/app/(worker)/my/page.tsx                                     ✓
src/app/layout.tsx                                               ✓
```

프로젝트 전체 `npx tsc --noEmit`은 일부 pre-existing 에러 (prisma.config.ts, tests/*의 `@ts-expect-error` directive unused, tests/storage/avatar-upload.test.ts Uint8Array, vitest.config.ts rollup type mismatch)를 보고하지만 모두 다른 plan 소유의 deferred item이며 04-08 변경과 무관.

**`npx next build --experimental-build-mode compile` 결과: SUCCESS.** 모든 라우트 (`/my`, `/my/applications`, `/my/applications/[id]/check-in`, `/posts/[id]/apply` 포함) 컴파일 통과, 경고는 turbopack root inference 하나뿐 (플랜 범위 밖).

Grep 검증:
```
grep -rln "from .*mock-data" src/app/(worker)/posts src/app/(worker)/my → 0 refs
```

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `f2eb55a` | Task 1 | feat(04-08): add supabase realtime helpers for applications |
| 2 | `cf0d20a` | Task 2 | feat(04-08): wire applyOneTap Server Action in apply-confirm-flow |
| 3 | `090737e` | Task 3+3b | feat(04-08): real applications list + realtime + cancel dialog |
| 4 | `c4062f3` | Task 4 | feat(04-08): wire check-in/check-out with html5-qrcode scanner |
| 5 | `b70493c` | Task 5 | feat(04-08): mount PushPermissionBanner + lightweight Toaster |

Task 6 (verification-only)과 Task 7 (human-verify checkpoint)은 별도 커밋 없음.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] Worktree 환경 셋업 부재**

- **Found during:** Task 1 셋업
- **Issue:** Git worktrees가 `.env`, `.env.local`, `node_modules`, `src/generated/prisma`를 상속하지 않음. tsc/build 전무.
- **Fix:** 메인 repo에서 `.env` + `.env.local` 복사, Windows junction으로 `node_modules` 및 `src/generated/prisma`를 메인 repo에 심볼릭 링크. Plan 04-05 SUMMARY의 동일 deviation 패턴 답습. 모두 gitignore 범위.
- **Files modified:** 없음 (ignored/junction)

**2. [Rule 3 — Blocker] `sonner` npm 패키지 미설치**

- **Found during:** Task 3 CancelApplicationDialog 작성 중
- **Issue:** Plan Task 3/5는 `npx shadcn@latest add alert-dialog sonner …`로 shadcn primitives를 설치하라 했으나, 이 프로젝트는 shadcn/ui 정통 버전이 아닌 `@base-ui/react` 기반 custom fork를 사용 중 (기존 `src/components/ui/tabs.tsx`가 `@base-ui/react/tabs`를 import 하는 것으로 확인). `@base-ui/react/alert-dialog`는 이미 `node_modules`에 있어 AlertDialog는 문제 없었지만, `sonner`는 누락.
- **Fix:** 두 단계:
  1. `CancelApplicationDialog`는 inline phase machine 피드백을 사용하도록 설계 — toast가 필요 없음. dialog 내부에서 success/error state를 직접 렌더하고 1.5s 후 auto-close + `router.refresh()`.
  2. `src/components/ui/sonner.tsx`에 lightweight in-house Toaster 구현 — sonner의 최소 API (`toast.success/error/warning/info` + `<Toaster />`)를 호환하도록 작성. layout.tsx에 마운트. 실제로 toast를 부르는 callsite는 현재 없으나, 향후 실제 sonner로 교체하고 싶으면 import path만 바꾸면 됨.
- **Files modified:** `src/components/ui/sonner.tsx` (new), `src/app/layout.tsx` (+2 lines)
- **Commit:** `b70493c`

**3. [Rule 1 — Bug] `@ts-expect-error` directive unused in realtime.ts**

- **Found during:** Task 1 tsc 검증
- **Issue:** 초안에 `// @ts-expect-error — supabase-js v2 uses a loose literal type here`를 `.on('postgres_changes', ...)` 호출 앞에 붙였으나, @supabase/ssr + supabase-js 최신 타입이 실제로 overload를 올바르게 해석해 directive가 unused가 됨 → TS2578.
- **Fix:** 두 helper 모두에서 `@ts-expect-error` 주석 제거. 타입은 자연스럽게 해결됨.
- **Files modified:** `src/lib/supabase/realtime.ts`
- **Commit:** `f2eb55a`

**4. [Rule 1 — Bug] check-in page.tsx JSDoc grep 충돌**

- **Found during:** Task 4 verify
- **Issue:** page.tsx JSDoc 주석에 `` `getApplicationById` `` 문자열이 남아 있어 verify grep이 "old adapter 사용 중"으로 오진. 실제 런타임 코드는 `prisma.application.findUnique`만 호출함.
- **Fix:** 주석에서 함수명 언급 제거, 의미는 유지.
- **Files modified:** `src/app/(worker)/my/applications/[id]/check-in/page.tsx`
- **Commit:** `c4062f3`

**5. [Rule 2 — Missing critical functionality] check-in-flow phase machine에 `submitting` 추가**

- **Found during:** Task 4 설계
- **Issue:** Plan 원안의 5-phase (ready/locating/working/scanning/done)는 QR 스캔 성공 직후부터 `checkOut` Server Action이 완료되기 전까지 어느 phase도 표현하지 않음 → 화면이 "근무 중"으로 순간 돌아갔다가 바로 "done"으로 튀는 깜빡임 발생.
- **Fix:** 6-phase로 확장 — `scanning → submitting → done`. `submitting` phase는 전용 스피너 + "정산 중..." 문구. UX 개선만 있고 동작 로직 동일.
- **Files modified:** `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx`
- **Commit:** `c4062f3`

### Scope boundary deferrals

- **Task 7 (human-verify checkpoint)**: subagent 실행 컨텍스트가 `/gsd-execute-phase` wave 5 orchestrator 하위이고, plan 04-10 HUMAN-UAT가 wave 완료 후 지원/근무/Realtime 수동 검증을 전담. 이 plan은 tsc clean + `next build --experimental-build-mode compile` 성공으로 자동 게이트를 충족하고 실제 브라우저 UAT는 04-10으로 위임. Plan의 `how-to-verify` 블록도 "실제 QR + Web Push + Kakao Maps는 04-HUMAN-UAT.md"로 위임을 명시.
- **sonner 실물 설치:** 워크트리 junction 환경에서 `npm install sonner`를 수행하면 메인 repo node_modules에 영향이 가므로 삼가고 in-house Toaster로 대체. 향후 실제 sonner가 필요하면 `src/components/ui/sonner.tsx`의 export를 `export { toast, Toaster } from 'sonner'`로 교체하면 됨.

## Known Stubs

없음. 모든 터치된 파일이 실 Server Action 호출 및 실 DB 쿼리로 완전히 결선됨:

- `apply-confirm-flow.tsx` → `applyOneTap`
- `applications-client.tsx` → `getApplicationsByWorker` (server 쪽) + Realtime + `cancelApplication` (via dialog)
- `check-in-flow.tsx` → `checkIn`, `checkOut`
- `check-in/page.tsx` → `prisma.application.findUnique`
- `/my/page.tsx` → `PushPermissionBanner` (→ `subscribePush`)

`Toaster` 컴포넌트 자체는 현재 callsite가 없지만 이는 stub이 아닌 infrastructure — Plan 04-09(Biz)가 사용할 수 있도록 준비.

## Threat Flags

새로 도입된 surface 없음. Plan frontmatter의 threat model (T-04-45..50)는 모두 기존 mitigation과 일치:

- T-04-45 (spoofed Realtime subscription) — RLS가 `workerId=auth.uid()` 필터링 강제, helper는 belt-and-suspenders client filter 추가
- T-04-46 (cancel tampering) — server `cancelApplication`이 `workerId===session.id` 재검증
- T-04-47 (info disclosure via toasts) — 모든 에러는 `applicationErrorToKorean`을 경유, 원시 메시지 노출 없음. 현재 실제 toast 호출 없음(dialog inline) → surface 더 작음
- T-04-48 (XSS via job title) — React 기본 escape, `dangerouslySetInnerHTML` 사용 없음
- T-04-49 (concurrent checkOut) — server가 `status !== 'in_progress'` 시 `invalid_state` 반환, 두 번째 탭은 error phase로 회귀
- T-04-50 (camera permission abuse) — QrScanner는 `phase === 'scanning'`일 때만 마운트 (사용자가 "QR 체크아웃" 버튼 명시 클릭 후)

## Self-Check: PASSED

- `src/lib/supabase/realtime.ts` contains `subscribeApplicationsForWorker`, `subscribeApplicationsForJob`, `postgres_changes` — FOUND
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` contains `applyOneTap`, no `setTimeout.*success`, no `from .*mock-data` — VERIFIED
- `src/app/(worker)/my/applications/page.tsx` has no `const APPLICATIONS =`, uses `getApplicationsByWorker` — VERIFIED
- `src/app/(worker)/my/applications/applications-client.tsx` contains `subscribeApplicationsForWorker`, `pollingActive` (4), `setInterval` (2), `CHANNEL_ERROR|TIMED_OUT` (4) — VERIFIED
- `src/components/worker/cancel-application-dialog.tsx` contains `AlertDialog`, `cancelApplication`, `acknowledgedNoShowRisk` — FOUND
- `src/components/worker/qr-scanner.tsx` contains `html5-qrcode`, `startedRef`, `facingMode` — FOUND
- `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` contains `checkIn`, `checkOut`, no `mock-data` import — VERIFIED
- `src/app/(worker)/my/applications/[id]/check-in/page.tsx` uses `prisma.application.findUnique`, owns session check — VERIFIED
- `src/app/(worker)/my/page.tsx` contains `PushPermissionBanner` — FOUND
- `src/components/ui/sonner.tsx` contains `Toaster`, `toast.success` — FOUND
- `src/app/layout.tsx` imports `Toaster` — FOUND
- `grep -rln "from .*mock-data" src/app/(worker)/posts src/app/(worker)/my` → 0 — VERIFIED
- Commits `f2eb55a cf0d20a 090737e c4062f3 b70493c` — FOUND in `git log`
- `npx tsc --noEmit` on plan-owned files: 0 errors — VERIFIED
- `npx next build --experimental-build-mode compile`: SUCCESS (all routes compiled) — VERIFIED
- Worker 화면 실 DB 왕복 수동 UAT: DEFERRED to Plan 04-10 HUMAN-UAT (per Plan 04-08 Task 7 checkpoint contract)
