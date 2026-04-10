---
phase: 04-db
plan: 06
subsystem: notifications
tags: [web-push, vapid, service-worker, notifications, phase-4, wave-4]
one_liner: "Web Push (VAPID) end-to-end: sender library, subscribe/unsubscribe actions, Service Worker, opt-in banner, and Plan 04 TODO wiring."
requirements: [APPL-01, APPL-04, NOTIF-01]
depends_on: [04-02, 04-03, 04-04]
provides:
  - sendPushToUser(userId, payload) fire-and-forget Web Push sender with 410 Gone cleanup
  - subscribePush / unsubscribePush Server Actions
  - public/sw.js push + notificationclick handlers
  - ServiceWorkerRegistrar client component mounted in root layout
  - PushPermissionBanner opt-in UI (defined; Plan 08 mounts it under /my)
affects:
  - src/lib/push.ts (new)
  - src/lib/actions/push-actions.ts (new)
  - public/sw.js (new)
  - src/components/providers/service-worker-registrar.tsx (new)
  - src/components/worker/push-permission-banner.tsx (new)
  - src/app/layout.tsx (mount SWRegistrar)
  - src/app/(worker)/posts/[id]/apply/actions.ts (TODO wired)
  - src/app/biz/posts/[id]/applicants/actions.ts (TODO wired)
  - tests/fixtures/phase4/index.ts (push_subscriptions in TRUNCATE)
  - tests/push/subscribe.test.ts (GREEN)
  - tests/push/send-410-cleanup.test.ts (GREEN)
  - .env.example (WEB_PUSH_VAPID_SUBJECT + NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY)
  - src/app/api/push/register/route.ts (DELETED — legacy Phase 1 FCM stub)
tech-stack:
  added: [web-push (already installed 04-01)]
  patterns:
    - "Fire-and-forget push delivery: Promise.allSettled per device, 410/404 → row delete, other errors swallowed"
    - "CJS/ESM interop resolver: read web-push.setVapidDetails / sendNotification via both namespace and default at call time so vi.mock can rebind either shape"
    - "Post-transaction side effects: push calls live AFTER prisma.$transaction commits, never inside, so slow delivery cannot stall DB locks"
    - "Client upsert-by-endpoint: same browser re-subscribing reuses the row; keys rotate in-place"
    - "VAPID key stored twice: server-only WEB_PUSH_VAPID_PRIVATE_KEY + client-exposed NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY (same value as public half)"
key-files:
  created:
    - src/lib/push.ts
    - src/lib/actions/push-actions.ts
    - public/sw.js
    - src/components/providers/service-worker-registrar.tsx
    - src/components/worker/push-permission-banner.tsx
    - .planning/phases/04-db/04-06-web-push-SUMMARY.md
  modified:
    - src/app/layout.tsx
    - src/app/(worker)/posts/[id]/apply/actions.ts
    - src/app/biz/posts/[id]/applicants/actions.ts
    - tests/fixtures/phase4/index.ts
    - tests/push/subscribe.test.ts
    - tests/push/send-410-cleanup.test.ts
    - .env.example
  deleted:
    - src/app/api/push/register/route.ts
decisions:
  - "Delivery contract is fire-and-forget: sendPushToUser never throws and is awaited only for ordering guarantees. A dead push endpoint can never break apply/accept/reject success paths."
  - "410 Gone and 404 Not Found both trigger row deletion. These are the only status codes the Web Push standard uses to signal permanent subscription revocation; other errors (429, 5xx) are logged and retried on the next send."
  - "web-push is imported via `import * as webpushNs from 'web-push'` and resolved at call time through a helper that checks both the namespace and `.default`. This is the only shape that survives `vi.mock('web-push', factory)` which creates fresh vi.fn() instances on either binding."
  - "PushPermissionBanner is defined in this plan but NOT mounted anywhere. Plan 08 (/my layout) will render it once the worker home area is wired. This lets the banner ship with its server-action dependency without prematurely exposing UI."
  - "The truncate helper in tests/fixtures/phase4/index.ts was missing public.push_subscriptions — a silent pre-existing gap that would have collided with endpoint UNIQUE across test runs. Added per Rule 2 (critical correctness for tests)."
metrics:
  tasks: 7
  files-created: 5
  files-modified: 7
  files-deleted: 1
  commits: 7
  tests-passing: 3 (tests/push) + 16 (tests/applications + tests/push combined regression)
  duration: "~15 minutes"
  completed: 2026-04-10
---

# Phase 04-db Plan 06: Web Push Summary

## One-liner

VAPID 기반 Web Push 인프라 전체 구현: sender 라이브러리 + subscribe/unsubscribe Server Actions + Service Worker + opt-in 배너 + Plan 04의 apply/accept/reject TODO 연결. Legacy Phase 1 FCM 스텁 삭제.

## What Shipped

### 1. `src/lib/push.ts` — `sendPushToUser`
- VAPID lazy init (`WEB_PUSH_VAPID_PUBLIC_KEY` + `WEB_PUSH_VAPID_PRIVATE_KEY` env — missing는 no-op warning).
- `findMany` all PushSubscription rows for userId → `Promise.allSettled` sendNotification per row.
- 410 Gone / 404 Not Found → `prisma.pushSubscription.delete` + warn log.
- Successful delivery → `lastUsedAt` bump (best-effort).
- Other errors → logged, swallowed. Never thrown. Fire-and-forget by contract.

### 2. `src/lib/actions/push-actions.ts` — Server Actions
- `subscribePush({ endpoint, keys: { p256dh, auth } })`: upsert by endpoint, userId from `requireWorker()` session (never trusted from input per T-04-32).
- `unsubscribePush(endpoint)`: delete by `(endpoint, userId)` pair.
- Accepts the native `PushSubscription.toJSON()` shape so client code doesn't need to flatten.

### 3. `public/sw.js` — Service Worker

```javascript
self.addEventListener("push", (event) => {
  let payload = { title: "GigNow", body: "새 알림이 도착했습니다", url: "/" };
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() }; }
    catch { payload.body = event.data.text() || payload.body; }
  }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { url: payload.url, type: payload.type },
    tag: payload.type || "default",
    renotify: true,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url) || "/";
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of allClients) {
      if ("focus" in client && "navigate" in client) {
        await client.navigate(url).catch(() => {});
        return client.focus();
      }
    }
    return self.clients.openWindow?.(url);
  })());
});
```

### 4. Layout wiring
- `src/components/providers/service-worker-registrar.tsx`: one-shot `navigator.serviceWorker.register('/sw.js')` in `useEffect`, silent on SSR + unsupported browsers.
- `src/app/layout.tsx`: `<ServiceWorkerRegistrar />` mounted in `<body>` before `{children}`.

### 5. Opt-in UI (defined, unmounted)
- `src/components/worker/push-permission-banner.tsx`: dismissable Tailwind `<div>` + Bell icon.
- `Notification.requestPermission` → `pushManager.subscribe({ applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY).buffer as ArrayBuffer })` → `subscribePush(sub.toJSON())`.
- `localStorage['gignow.pushBannerDismissed']` tracks dismissal.
- Not rendered yet — Plan 08 will wire it under `/my` layout.

### 6. Plan 04 TODO wiring
- `applyOneTap`: after commit → lookup `job.authorId` + `job.title` → `sendPushToUser(authorId, { type: 'new-application', url: '/biz/posts/${jobId}/applicants' })`.
- `acceptApplication`: after status update → `sendPushToUser(workerId, { type: 'accepted', url: '/my/applications/${applicationId}' })`.
- `rejectApplication`: after transaction → `sendPushToUser(workerId, { type: 'rejected', url: '/my/applications' })`.
- All three wrapped in `try/catch` so lookup failures also can't poison the success path. `sendPushToUser` itself already swallows delivery errors.

### 7. Legacy cleanup
- `src/app/api/push/register/route.ts` (Phase 1 FCM stub with `mock-user-id` hardcoded) deleted. Zero remaining references.

## Test Status

| File | Status |
|------|--------|
| `tests/push/subscribe.test.ts` | GREEN (2/2) |
| `tests/push/send-410-cleanup.test.ts` | GREEN (1/1) |
| `tests/applications/apply-one-tap.test.ts` | GREEN (regression) |
| `tests/applications/apply-duplicate.test.ts` | GREEN (regression) |
| `tests/applications/apply-race.test.ts` | GREEN (regression) |
| `tests/applications/accept-reject.test.ts` | GREEN (regression, 3/3) |
| `tests/applications/list-biz.test.ts` | GREEN (regression) |
| `tests/applications/list-worker.test.ts` | GREEN (regression) |
| `tests/applications/headcount-fill.test.ts` | GREEN (regression) |
| `tests/applications/auto-accept-cron.test.ts` | GREEN (regression) |

**Combined: tests/applications + tests/push = 16/16 GREEN.**

Regression paths still pass because the test DB has zero PushSubscription rows during these flows, so `sendPushToUser` short-circuits at `findMany → []` without ever touching `web-push`.

## Deviations from Plan

### Auto-fixed (Rules 1-3)

**1. [Rule 3 - Blocker] subscribe.test.ts imports from `@/lib/actions/push-actions`, not `@/app/(worker)/my/actions`**
- **Found during:** Task 2 prep, reading the test file
- **Issue:** The plan specified `src/app/(worker)/my/actions.ts` but the pre-written RED test imports `@/lib/actions/push-actions`. Tests are source of truth.
- **Fix:** Created `src/lib/actions/push-actions.ts` instead. Directory `src/lib/actions/` created (did not previously exist).
- **Commit:** `08ef60f`

**2. [Rule 3 - Blocker] web-push CJS/ESM interop breaks `vi.mock`**
- **Found during:** Task 1 RED → GREEN
- **Issue:** `import webpush from 'web-push'` routed calls through the `default` binding, but `vi.mock('web-push', factory)` in send-410-cleanup.test.ts set up separate `vi.fn()` instances on `default` and top-level. The test's mock targeted the top-level `sendNotification`, so the default-imported one was never rejected → 410 test failed.
- **Fix:** Replaced with `import * as webpushNs from 'web-push'` + a `resolveWebPush()` helper that reads functions from the namespace first, falling back to `.default`. This gives `vi.mock` a single target regardless of which shape the test configures.
- **Commit:** `c18a7b6`

**3. [Rule 2 - Missing critical correctness] `truncatePhase4Tables` omits `public.push_subscriptions`**
- **Found during:** Task 1 GREEN prep
- **Issue:** Pre-existing fixture helper drops `applications/jobs/business_profiles/worker_profiles/users` but not `push_subscriptions`. Because `push_subscriptions.endpoint` is UNIQUE, two tests using the same mock endpoint would collide across runs.
- **Fix:** Added `public.push_subscriptions` to the TRUNCATE target in `tests/fixtures/phase4/index.ts` (same `CASCADE` semantics — the table has no dependents).
- **Commit:** `c18a7b6`

**4. [Rule 1 - Bug] subscribe Server Action signature mismatch**
- **Found during:** Task 2
- **Issue:** The plan sketched `subscribePush({ endpoint, p256dh, auth })` (flat) but the test uses `buildMockSubscription()` which returns the native `{ endpoint, keys: { p256dh, auth } }` shape.
- **Fix:** `subscribePush` Zod schema validates the nested shape so client code can pass `sub.toJSON()` directly. Matches what `PushPermissionBanner` actually generates.
- **Commit:** `08ef60f`

**5. [Rule 1 - Type error] PushManager.subscribe applicationServerKey type narrowing**
- **Found during:** Task 7 tsc sweep
- **Issue:** Modern TS lib typings require `applicationServerKey: BufferSource`. `urlBase64ToUint8Array()` returns `Uint8Array<ArrayBufferLike>`, which is NOT assignable because `ArrayBufferLike` includes `SharedArrayBuffer`.
- **Fix:** Cast `.buffer as ArrayBuffer` since the Uint8Array was just constructed with `new Uint8Array(rawData.length)` — guaranteed ArrayBuffer-backed.
- **Commit:** `028125a`

**6. [Rule 1 - Cleanup] Unused `@ts-expect-error` directives**
- **Found during:** Task 7 tsc sweep
- **Issue:** Both test files had `@ts-expect-error` on imports from now-existing modules.
- **Fix:** Removed the directives.
- **Commit:** `028125a`

### Auth gates

None. VAPID keys were already present in `.env.local` before execution started (copied from main repo in init).

## Known Follow-ups

1. **Banner mounting (Plan 08)** — `PushPermissionBanner` is defined but not rendered anywhere. Plan 08's `/my` layout will mount it above the page content.
2. **Icon assets (Phase 5)** — `public/sw.js` references `/icons/icon-192.png` and `/icons/badge-72.png` which do not exist yet. Browsers fall back to default icons, so notifications still work; proper PWA icons are a Phase 5 concern.
3. **Notification click deep-link HUMAN-UAT** — Clicking an OS notification and verifying the target URL opens correctly in the existing tab (vs new window) requires a real browser, since vitest does not load Service Workers. Add to `04-HUMAN-UAT.md`.
4. **Phase 5 RLS on push_subscriptions** — Table currently has no RLS policy (not critical because userId is set server-side, but belt-and-braces for multi-tenant). Row-level security applies in Phase 5.
5. **Exponential backoff queue (Phase 5)** — 429/5xx delivery failures are logged and dropped. A real production queue would retry with backoff.

## Threat Flags

No new trust boundaries introduced beyond those in the plan's `<threat_model>`. The legacy `/api/push/register` route was deleted, which strictly *removes* an untrusted network surface (it accepted any `token` string and logged it as if from `mock-user-id`).

## Self-Check: PASSED

**Files verified on disk:**
- FOUND: `src/lib/push.ts`
- FOUND: `src/lib/actions/push-actions.ts`
- FOUND: `public/sw.js`
- FOUND: `src/components/providers/service-worker-registrar.tsx`
- FOUND: `src/components/worker/push-permission-banner.tsx`
- MODIFIED (verified): `src/app/layout.tsx` contains `ServiceWorkerRegistrar`
- MODIFIED (verified): `src/app/(worker)/posts/[id]/apply/actions.ts` contains `sendPushToUser`
- MODIFIED (verified): `src/app/biz/posts/[id]/applicants/actions.ts` contains `sendPushToUser`
- MODIFIED (verified): `.env.example` contains `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`
- DELETED (verified): `src/app/api/push/register/route.ts`

**Commits verified via `git log --oneline`:**
- FOUND: `c18a7b6` feat(04-06): sendPushToUser with 410 Gone cleanup
- FOUND: `08ef60f` feat(04-06): subscribePush / unsubscribePush Server Actions
- FOUND: `2568e0d` feat(04-06): Service Worker for Web Push + notification click routing
- FOUND: `aeda2fc` feat(04-06): ServiceWorkerRegistrar + PushPermissionBanner + layout wire
- FOUND: `fe06d7d` feat(04-06): wire sendPushToUser into apply/accept/reject flows
- FOUND: `a313b1f` chore(04-06): delete legacy /api/push/register FCM stub
- FOUND: `028125a` test(04-06): unlock @ts-expect-error directives + narrow pushManager key type

**Test runs verified:**
- `tests/push` = 3/3 GREEN
- `tests/applications + tests/push` = 16/16 GREEN
- `tsc --noEmit` = 0 errors on Plan 06 files (pre-existing errors in tests/proxy, tests/shift, tests/storage, vitest.config.ts are out of scope)
