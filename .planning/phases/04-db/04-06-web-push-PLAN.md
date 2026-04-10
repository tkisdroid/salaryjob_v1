---
phase: 04-db
plan: 06
type: execute
wave: 4
depends_on: [2, 3, 4]
files_modified:
  - src/lib/push.ts
  - src/app/(worker)/my/actions.ts
  - public/sw.js
  - src/components/providers/service-worker-registrar.tsx
  - src/components/worker/push-permission-banner.tsx
  - src/app/layout.tsx
  - src/app/(worker)/posts/[id]/apply/actions.ts
  - src/app/biz/posts/[id]/applicants/actions.ts
autonomous: true
requirements:
  - APPL-01
  - APPL-04

must_haves:
  truths:
    - "Worker의 `/my` 첫 방문시 dismissable push-permission-banner가 표시되고, 클릭하면 Notification.requestPermission() + subscribePush Server Action이 호출되어 DB에 PushSubscription 레코드가 생성된다"
    - "Business가 acceptApplication/rejectApplication을 호출하면 해당 Worker의 모든 push subscription에 sendPushToUser가 호출되고 Web Push가 발송된다"
    - "worker가 applyOneTap을 호출하면 job author (Business)의 push subscription에 'new-application' 알림이 발송된다"
    - "web-push 410 Gone 에러가 발생하면 해당 PushSubscription 레코드가 DB에서 삭제된다"
    - "legacy src/app/api/push/register/route.ts 파일이 삭제되었다 (Phase 1 FCM 스텁)"
    - "public/sw.js Service Worker가 push + notificationclick 이벤트를 처리한다"
    - "tests/push/subscribe.test.ts 및 tests/push/send-410-cleanup.test.ts 가 GREEN"
  artifacts:
    - path: "src/lib/push.ts"
      provides: "webpush.setVapidDetails + sendPushToUser + 410 cleanup"
      exports: ["sendPushToUser"]
    - path: "src/app/(worker)/my/actions.ts"
      provides: "subscribePush + unsubscribePush Server Actions"
      exports: ["subscribePush", "unsubscribePush"]
    - path: "public/sw.js"
      provides: "push + notificationclick handlers"
    - path: "src/components/providers/service-worker-registrar.tsx"
      provides: "navigator.serviceWorker.register('/sw.js') on mount"
    - path: "src/components/worker/push-permission-banner.tsx"
      provides: "dismissable banner prompting Notification.requestPermission()"
  key_links:
    - from: "acceptApplication (Plan 04)"
      to: "sendPushToUser(workerId, { type: 'accepted' })"
      via: "post-commit hook"
      pattern: "sendPushToUser"
    - from: "public/sw.js"
      to: "/my/applications/[id]"
      via: "notificationclick deep link"
      pattern: "notification.click"
---

<objective>
Web Push 인프라 전체(VAPID 설정, Server Actions, Service Worker, Banner UI, Server Action 호출 포인트 3개)를 구현하고, Plan 04의 TODO push trigger를 연결한다. Legacy `src/app/api/push/register/route.ts` (Phase 1 FCM stub)를 삭제한다.

Purpose: NOTIF-01 부분 활성화. Phase 4 scope 확장 중 "Web Push 부분"(D-19, D-20) 충족.
Output: 5개 신규 파일 + 2개 기존 actions.ts push 호출 추가 + 1개 legacy route 삭제 + tests/push/*.test.ts GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@.planning/phases/04-db/04-UI-SPEC.md
@prisma/schema.prisma
@src/lib/dal.ts
@node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md
@src/app/api/push/register/route.ts
@src/app/(worker)/posts/[id]/apply/actions.ts
@src/app/biz/posts/[id]/applicants/actions.ts
@tests/push/subscribe.test.ts
@tests/push/send-410-cleanup.test.ts
@src/app/layout.tsx

<interfaces>
From Plan 02: prisma model `PushSubscription { id, userId, endpoint(unique), p256dh, auth, createdAt, lastUsedAt?, user }`

From Plan 04: applyOneTap / acceptApplication / rejectApplication have `// TODO(Plan 06): sendPushToUser(...)` markers that Plan 06 will wire.

Next.js 16 PWA guide (node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md) provides:
- Service worker location: public/sw.js
- Registration: navigator.serviceWorker.register('/sw.js') from client component
- Server Action pattern for subscribe/unsubscribe
- web-push library usage

Executor MUST read the PWA guide verbatim before writing public/sw.js because Next.js 16 imposes headers/scope rules.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: src/lib/push.ts — sendPushToUser + VAPID setup</name>
  <files>src/lib/push.ts</files>
  <read_first>
    - node_modules/web-push/README.md (webpush.setVapidDetails + sendNotification API)
    - .planning/phases/04-db/04-CONTEXT.md D-20 (sender 코드 스케치)
    - tests/push/send-410-cleanup.test.ts
    - .planning/phases/04-db/04-RESEARCH.md Pattern — Web Push
  </read_first>
  <behavior>
    - `sendPushToUser(userId: string, payload: PushPayload)` fetches all PushSubscription rows for userId, sends via webpush.sendNotification
    - On 410 Gone error, deletes the subscription from DB
    - On 404 Not Found, also deletes (endpoint invalid)
    - Uses Promise.allSettled (one bad sub does not block others)
    - `PushPayload` type: `{ title: string; body: string; url?: string; type?: 'accepted' | 'rejected' | 'new-application' | 'reminder' }`
    - Lazy VAPID init (check env vars; if missing, warn and return no-op)
  </behavior>
  <action>
  ```typescript
  import 'server-only'
  import webpush from 'web-push'
  import { prisma } from '@/lib/db'

  export type PushPayload = {
    title: string
    body: string
    url?: string
    type?: 'accepted' | 'rejected' | 'new-application' | 'reminder'
  }

  let vapidConfigured = false
  function ensureVapidConfigured(): boolean {
    if (vapidConfigured) return true
    const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY
    const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY
    if (!pub || !priv) {
      console.warn('[push] WEB_PUSH_VAPID_* env vars missing — push notifications disabled')
      return false
    }
    webpush.setVapidDetails('mailto:dev@gignow.local', pub, priv)
    vapidConfigured = true
    return true
  }

  /**
   * Phase 4 D-20: Send a Web Push notification to every device of a user.
   *
   * Delivery is best-effort (allSettled). Failures:
   *   - 410 Gone / 404 Not Found → subscription is dead, delete from DB
   *   - Other errors → log + swallow (do not break the calling Server Action)
   *
   * MUST be called AFTER the caller's DB transaction commits, never inside a transaction,
   * because push delivery can take 1–3 seconds.
   */
  export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!ensureVapidConfigured()) return

    const subs = await prisma.pushSubscription.findMany({ where: { userId } })
    if (subs.length === 0) return

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          )
          // Update lastUsedAt for successful delivery
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          })
        } catch (err: any) {
          const statusCode = err?.statusCode
          if (statusCode === 410 || statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
            console.warn(`[push] removed dead subscription ${sub.id} (${statusCode})`)
          } else {
            console.error(`[push] delivery failed for subscription ${sub.id}:`, err)
          }
        }
      }),
    )
    // Intentionally swallow all rejections — sendPushToUser is fire-and-forget
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/push.ts && grep -q "sendPushToUser" src/lib/push.ts && grep -q "410" src/lib/push.ts && grep -q "setVapidDetails" src/lib/push.ts && npm test -- tests/push/send-410-cleanup --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - src/lib/push.ts exports sendPushToUser
    - tests/push/send-410-cleanup.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: subscribePush + unsubscribePush Server Actions</name>
  <files>src/app/(worker)/my/actions.ts</files>
  <read_first>
    - src/lib/dal.ts (verifySession pattern)
    - prisma/schema.prisma PushSubscription model
    - tests/push/subscribe.test.ts
    - .planning/phases/04-db/04-CONTEXT.md D-20
  </read_first>
  <behavior>
    - `subscribePush(sub: { endpoint: string; p256dh: string; auth: string })`: verifySession (any role) → prisma.pushSubscription.upsert by endpoint → returns {success}
    - `unsubscribePush(endpoint: string)`: verifySession → prisma.pushSubscription.deleteMany where endpoint AND userId
  </behavior>
  <action>
  파일 생성 (기존 my 디렉토리에 actions.ts가 없으면 신규):

  ```typescript
  'use server'

  import { z } from 'zod'
  import { verifySession } from '@/lib/dal'
  import { prisma } from '@/lib/db'

  const subscribeSchema = z.object({
    endpoint: z.string().url(),
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  })

  export type SubscribeResult =
    | { success: true; id: string }
    | { success: false; error: string }

  /**
   * Phase 4 D-20: Save a Web Push subscription for the current session user.
   * Upserts by endpoint (re-subscribing with the same endpoint updates keys + user).
   */
  export async function subscribePush(input: { endpoint: string; p256dh: string; auth: string }): Promise<SubscribeResult> {
    const parsed = subscribeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'invalid_input' }
    const session = await verifySession()

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: session.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
      update: {
        userId: session.id,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
    })
    return { success: true, id: sub.id }
  }

  export async function unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
    const session = await verifySession()
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.id },
    })
    return { success: true }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/my/actions.ts" && grep -q "subscribePush" "src/app/(worker)/my/actions.ts" && grep -q "unsubscribePush" "src/app/(worker)/my/actions.ts" && npm test -- tests/push/subscribe --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - 2개 Server Action export
    - tests/push/subscribe.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: public/sw.js — push + notificationclick handlers</name>
  <files>public/sw.js</files>
  <read_first>
    - node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md (verbatim sw.js 예제)
    - .planning/phases/04-db/04-CONTEXT.md D-19, D-20
  </read_first>
  <behavior>
    - `self.addEventListener('push', ...)`: parse payload JSON, call `self.registration.showNotification(title, { body, data: { url }, icon, badge })`
    - `self.addEventListener('notificationclick', ...)`: `event.notification.close()`, `clients.openWindow(data.url ?? '/')`
    - Fallback when payload is empty: "GigNow" title + "새 알림" body
  </behavior>
  <action>
  `public/sw.js` 파일 생성 (이 경로는 Next.js 16이 public 디렉토리 그대로 정적 서빙):

  ```javascript
  // Phase 4 D-19/D-20 — Service Worker for Web Push notifications
  // This file is served from /sw.js by Next.js (public/ folder)
  // Scope is root '/' by default; registration happens in ServiceWorkerRegistrar.

  self.addEventListener('install', (event) => {
    // Skip waiting so a new SW takes effect immediately on refresh
    self.skipWaiting()
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
  })

  self.addEventListener('push', (event) => {
    let payload = { title: 'GigNow', body: '새 알림이 도착했습니다', url: '/' }
    if (event.data) {
      try {
        const parsed = event.data.json()
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
          url: parsed.url || payload.url,
          type: parsed.type,
        }
      } catch (e) {
        // Not JSON — use text as body
        payload.body = event.data.text() || payload.body
      }
    }

    const options = {
      body: payload.body,
      icon: '/icons/icon-192.png',  // optional — graceful degrade if missing
      badge: '/icons/badge-72.png',
      data: { url: payload.url, type: payload.type },
      tag: payload.type || 'default',
      renotify: true,
    }
    event.waitUntil(self.registration.showNotification(payload.title, options))
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = (event.notification.data && event.notification.data.url) || '/'
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // If an existing window is open, focus it and navigate
      for (const client of allClients) {
        if ('focus' in client && 'navigate' in client) {
          await client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })())
  })
  ```

  **Note on icons:** `/icons/icon-192.png` and `/icons/badge-72.png`는 optional. 존재하지 않으면 브라우저가 기본 아이콘 사용. Phase 5에서 PWA 아이콘 정식 추가 예정. 지금 에러 방지를 위해 존재하지 않는 path는 browser가 알아서 fallback.
  </action>
  <verify>
    <automated>bash -c 'test -f public/sw.js && grep -q "addEventListener(\x27push\x27" public/sw.js && grep -q "notificationclick" public/sw.js && grep -q "showNotification" public/sw.js && echo OK'</automated>
  </verify>
  <done>
    - public/sw.js 존재
    - push + notificationclick handlers 구현
  </done>
</task>

<task type="auto">
  <name>Task 4: ServiceWorkerRegistrar + PushPermissionBanner + layout wire</name>
  <files>src/components/providers/service-worker-registrar.tsx, src/components/worker/push-permission-banner.tsx, src/app/layout.tsx</files>
  <read_first>
    - src/app/layout.tsx (현재 root layout)
    - .planning/phases/04-db/04-UI-SPEC.md (push-permission-banner UI contract)
    - .planning/phases/04-db/04-CONTEXT.md discretion: Web Push 권한 요청 타이밍
    - node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md (registration location)
  </read_first>
  <action>
  **1. src/components/providers/service-worker-registrar.tsx:**
  ```typescript
  'use client'
  import { useEffect } from 'react'

  export function ServiceWorkerRegistrar() {
    useEffect(() => {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[sw] registration failed:', err)
      })
    }, [])
    return null
  }
  ```

  **2. src/components/worker/push-permission-banner.tsx:**

  UI-SPEC에 맞춰 shadcn `Alert` 컴포넌트 사용 (Plan 01에서 `npx shadcn@latest add alert` 설치 예정이므로 해당 의존은 Plan 08에서 설치된다고 가정; 만약 미설치면 여기서 `<div>` + tailwind로 대체).

  ```typescript
  'use client'
  import { useEffect, useState } from 'react'
  import { subscribePush } from '@/app/(worker)/my/actions'
  import { Bell, X } from 'lucide-react'

  const DISMISSED_KEY = 'gignow.pushBannerDismissed'

  export function PushPermissionBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
      if (typeof window === 'undefined') return
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return
      if (Notification.permission !== 'default') return
      if (localStorage.getItem(DISMISSED_KEY)) return
      setVisible(true)
    }, [])

    if (!visible) return null

    async function handleEnable() {
      try {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          setVisible(false)
          localStorage.setItem(DISMISSED_KEY, '1')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const vapidPublic = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
        if (!vapidPublic) {
          console.warn('[push] NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY missing')
          setVisible(false)
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        })
        const json = sub.toJSON()
        await subscribePush({
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        })
        setVisible(false)
      } catch (err) {
        console.error('[push] subscribe failed:', err)
      }
    }

    function handleDismiss() {
      setVisible(false)
      localStorage.setItem(DISMISSED_KEY, '1')
    }

    return (
      <div className="mx-4 my-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <Bell className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-amber-900">알림을 켜서 빠르게 수락 소식을 받아보세요</p>
          <p className="text-xs text-amber-800 mt-0.5">Business가 수락하면 OS 알림으로 즉시 안내드립니다.</p>
        </div>
        <button
          type="button"
          onClick={handleEnable}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
        >
          켜기
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="닫기"
          className="rounded-md p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // VAPID public key base64url → Uint8Array (Web Push standard)
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }
  ```

  **중요: `.env.local`에 `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` 키를 추가해야 한다.** 이는 클라이언트에 노출되는 public key이므로 `NEXT_PUBLIC_` 접두사 필수. Plan 01 .env.example에는 이미 `WEB_PUSH_VAPID_PUBLIC_KEY` (서버용)가 있으므로, **Plan 06이 새 키 `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` 를 .env.example에 추가**해야 한다. 두 키의 값은 동일해야 한다.

  **3. .env.example 업데이트 (single line 추가):**
  ```
  # Phase 4 — Client-exposed VAPID public key (same value as WEB_PUSH_VAPID_PUBLIC_KEY)
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=
  ```

  **4. src/app/layout.tsx 에 ServiceWorkerRegistrar 추가:**
  현재 layout.tsx를 읽고 children 직전에 `<ServiceWorkerRegistrar />` import/렌더링. import line 추가:
  ```typescript
  import { ServiceWorkerRegistrar } from '@/components/providers/service-worker-registrar'
  ```
  JSX의 `<body>` 직후 또는 최상위 provider 내부에 `<ServiceWorkerRegistrar />` 추가.

  PushPermissionBanner는 layout이 아닌 `/my` 페이지(Plan 08)에 렌더링한다. 여기서는 컴포넌트만 작성하고 Plan 08이 wire.
  </action>
  <verify>
    <automated>bash -c 'test -f src/components/providers/service-worker-registrar.tsx && test -f src/components/worker/push-permission-banner.tsx && grep -q "ServiceWorkerRegistrar" src/app/layout.tsx && grep -q "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY" .env.example && echo OK'</automated>
  </verify>
  <done>
    - 2 컴포넌트 파일 생성
    - layout.tsx에 ServiceWorkerRegistrar import + 렌더
    - .env.example 추가
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Plan 04 TODO wiring — applyOneTap + acceptApplication + rejectApplication에 sendPushToUser 추가</name>
  <files>src/app/(worker)/posts/[id]/apply/actions.ts, src/app/biz/posts/[id]/applicants/actions.ts</files>
  <read_first>
    - src/app/(worker)/posts/[id]/apply/actions.ts (Plan 04의 TODO 주석)
    - src/app/biz/posts/[id]/applicants/actions.ts (Plan 04의 TODO 주석)
    - src/lib/push.ts (Task 1)
  </read_first>
  <behavior>
    - applyOneTap 성공 후 (트랜잭션 커밋 후): job의 authorId를 조회해서 sendPushToUser(authorId, { type: 'new-application', title, body, url: '/biz/posts/{jobId}/applicants' }) fire-and-forget
    - acceptApplication 성공 후: sendPushToUser(app.workerId, { type: 'accepted', title: '지원이 수락되었습니다', body: job.title, url: `/my/applications/${applicationId}` })
    - rejectApplication 성공 후: sendPushToUser(app.workerId, { type: 'rejected', title: '지원이 거절되었습니다', body: job.title, url: '/my/applications' })
    - 모든 호출은 `.catch()` 또는 try/catch 감싸서 실패가 main flow를 깨지 않음
  </behavior>
  <action>
  **applyOneTap 수정** (기존 `// TODO(Plan 06)` 위치):

  기존:
  ```typescript
  revalidatePath('/my/applications')
  revalidatePath(`/posts/${jobId}`)
  // TODO(Plan 06): sendPushToUser(jobAuthorId, { type: 'new-application', jobId })
  ```

  교체:
  ```typescript
  revalidatePath('/my/applications')
  revalidatePath(`/posts/${jobId}`)

  // Fire-and-forget push to job author (Business)
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { authorId: true, title: true },
    })
    if (job) {
      await sendPushToUser(job.authorId, {
        type: 'new-application',
        title: '새 지원자가 있습니다',
        body: job.title,
        url: `/biz/posts/${jobId}/applicants`,
      }).catch(() => {})
    }
  } catch (e) {
    console.error('[applyOneTap] push notify failed', e)
  }
  ```

  파일 상단 import에 `import { sendPushToUser } from '@/lib/push'` 추가.

  **acceptApplication 수정** — 기존 `// TODO(Plan 06)` 위치:
  ```typescript
  revalidatePath(`/biz/posts/${app.jobId}/applicants`)
  revalidatePath('/my/applications')

  try {
    const jobTitle = await prisma.job.findUnique({
      where: { id: app.jobId },
      select: { title: true },
    })
    await sendPushToUser(app.workerId, {
      type: 'accepted',
      title: '지원이 수락되었습니다',
      body: jobTitle?.title ?? '근무 확정',
      url: `/my/applications/${applicationId}`,
    }).catch(() => {})
  } catch (e) {
    console.error('[acceptApplication] push failed', e)
  }
  ```

  **rejectApplication 수정** — 동일 패턴:
  ```typescript
  try {
    const jobTitle = await prisma.job.findUnique({
      where: { id: app.jobId },
      select: { title: true },
    })
    await sendPushToUser(app.workerId, {
      type: 'rejected',
      title: '지원이 거절되었습니다',
      body: jobTitle?.title ?? '',
      url: '/my/applications',
    }).catch(() => {})
  } catch (e) {
    console.error('[rejectApplication] push failed', e)
  }
  ```

  파일 상단 import에 `import { sendPushToUser } from '@/lib/push'` 추가.

  **중요:** push 호출은 트랜잭션 **바깥**에서 (이미 트랜잭션 커밋된 후)만 실행해야 한다. Plan 04 구현에서 이미 `prisma.$transaction(...)` 블록이 끝난 후 revalidatePath가 호출되므로 그 다음에 push를 추가.

  Plan 04의 tests/applications/accept-reject.test.ts가 여전히 GREEN이어야 한다 (push는 mock되어 있거나 vi.mock으로 web-push를 무력화).
  </action>
  <verify>
    <automated>bash -c 'grep -q "sendPushToUser" "src/app/(worker)/posts/[id]/apply/actions.ts" && grep -q "sendPushToUser" "src/app/biz/posts/[id]/applicants/actions.ts" && npm test -- tests/applications/accept-reject tests/applications/apply-one-tap --run 2>&1 | tail -20'</automated>
  </verify>
  <done>
    - 3개 Server Action에서 sendPushToUser 호출 추가
    - Plan 04 tests still GREEN (regression check)
  </done>
</task>

<task type="auto">
  <name>Task 6: Legacy /api/push/register 삭제</name>
  <files>src/app/api/push/register/route.ts (deleted)</files>
  <read_first>
    - src/app/api/push/register/route.ts (삭제 대상 확인 — Phase 1 FCM stub)
  </read_first>
  <action>
  `src/app/api/push/register/route.ts` 파일 삭제.

  Windows bash:
  ```
  rm -f "src/app/api/push/register/route.ts"
  ```

  디렉토리 `src/app/api/push/register/` 가 비면 디렉토리도 삭제:
  ```
  rmdir "src/app/api/push/register" 2>/dev/null || true
  rmdir "src/app/api/push" 2>/dev/null || true
  ```

  코드베이스에서 해당 경로 import 참조가 있는지 grep 확인:
  ```
  grep -r "api/push/register" src/ --include="*.ts" --include="*.tsx"
  ```
  결과 0 이어야 한다. 만약 참조가 있으면 해당 파일도 같이 제거/수정.
  </action>
  <verify>
    <automated>bash -c '! test -f "src/app/api/push/register/route.ts" && echo "legacy route deleted"'</automated>
  </verify>
  <done>
    - Legacy route 파일 삭제
    - 참조 0
  </done>
</task>

<task type="auto">
  <name>Task 7: Full tests/push GREEN 확인</name>
  <files>(verification only)</files>
  <read_first>
    - tests/push/
  </read_first>
  <action>
  `npm test -- tests/push --run` 실행. 2 파일 PASS 확인:
  - subscribe.test.ts (subscribePush + unsubscribePush)
  - send-410-cleanup.test.ts (web-push mock, 410 → delete)
  </action>
  <verify>
    <automated>npm test -- tests/push --run 2>&1 | tail -20</automated>
  </verify>
  <done>
    - tests/push 2/2 GREEN
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client browser → subscribePush | Untrusted endpoint + keys; verifySession gates userId |
| web-push → external push endpoints | 3rd-party servers (FCM, Mozilla autopush) — trust is delegated |
| public/sw.js → all origins | SW runs at root scope; displays notifications with app branding |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-32 | Spoofing | Malicious client claiming arbitrary userId | mitigate | subscribePush takes userId from verifySession, not from input; Zod only validates sub keys |
| T-04-33 | Info Disclosure | Subscription keys stored plain in DB | accept | p256dh/auth are designed to be stored; no PII beyond userId; RLS on push_subscriptions table is a Phase 5 enhancement |
| T-04-34 | Tampering | push payload injection via sendPushToUser | mitigate | Only server code constructs payloads; never pass user-submitted strings unsanitized (acceptApplication uses job.title from DB only) |
| T-04-35 | DoS | Hammering external push endpoints → getting rate-limited | mitigate | allSettled + log, does not retry; Phase 5 could add exponential backoff queue |
| T-04-36 | Cross-site scripting via notification body | 410 cleanup | mitigate | self.registration.showNotification escapes text; no innerHTML path |
| T-04-37 | Information disclosure via SW scope | public/sw.js at root | accept | SW only receives push events; does not intercept fetch or cache credentials |
| T-04-38 | VAPID private key exposure | web-push setVapidDetails | mitigate | WEB_PUSH_VAPID_PRIVATE_KEY is server-only env var (no NEXT_PUBLIC_ prefix); Plan 01 .env.example enforces convention |
</threat_model>

<verification>
- tests/push/ 2/2 GREEN
- Legacy route deleted
- Service worker + registrar wired
- Plan 04 regression: tests/applications/apply-one-tap + accept-reject still GREEN with push mock
</verification>

<success_criteria>
- [x] src/lib/push.ts + 410 cleanup
- [x] subscribePush / unsubscribePush Server Actions
- [x] public/sw.js push + notificationclick
- [x] ServiceWorkerRegistrar in layout
- [x] PushPermissionBanner component (not yet rendered — Plan 08)
- [x] Plan 04 TODO wiring complete for 3 Server Actions
- [x] Legacy /api/push/register deleted
- [x] tests/push GREEN, Plan 04 regression tests still GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-06-SUMMARY.md` with:
- 파일 목록 + 역할
- sw.js push handler 코드 스니펫
- Known follow-up: PushPermissionBanner wiring to /my layout (Plan 08), 알림 클릭 deep link 실기 테스트 (HUMAN-UAT)
</output>
