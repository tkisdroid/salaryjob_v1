---
phase: 04-db
plan: 08
type: execute
wave: 5
depends_on: [4, 5, 6]
files_modified:
  - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
  - src/app/(worker)/my/applications/page.tsx
  - src/app/(worker)/my/applications/applications-client.tsx
  - src/app/(worker)/my/applications/[id]/check-in/page.tsx
  - src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx
  - src/components/worker/qr-scanner.tsx
  - src/components/worker/cancel-application-dialog.tsx
  - src/app/(worker)/my/page.tsx
  - src/app/(worker)/my/my-client-banner.tsx
  - src/lib/supabase/realtime.ts
autonomous: false
requirements:
  - APPL-01
  - APPL-02
  - APPL-04
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03

must_haves:
  truths:
    - "/posts/[id]/apply 원탭 지원 버튼이 applyOneTap Server Action을 호출하고 결과에 따라 성공/에러 UX를 표시한다"
    - "/my/applications 페이지가 getApplicationsByWorker로 실 데이터를 로드하고 예정/진행중/완료 탭 필터를 지원하며 Supabase Realtime postgres_changes 구독으로 상태 변화를 실시간 반영한다"
    - "/my/applications/[id]/check-in 페이지가 geofence 기반 체크인과 html5-qrcode 카메라 기반 체크아웃을 수행하고 서버 Action 결과를 UI에 반영한다"
    - "Worker `cancelApplication` 플로우가 24시간 규칙에 따라 경고 모달을 표시하고 acknowledgedNoShowRisk를 전달한다"
    - "/my 페이지가 PushPermissionBanner를 렌더링한다"
    - "기존 인라인 하드코드 목업 (APPLICATIONS 상수)이 /my/applications/page.tsx에서 제거되어 있다"
    - "src/app/(worker) 밑의 touched 파일에서 `grep -r mock-data src/app/(worker)/posts src/app/(worker)/my` 0 matches"
  artifacts:
    - path: "src/components/worker/qr-scanner.tsx"
      provides: "html5-qrcode wrapper (dynamic import, ssr:false, StrictMode guarded)"
    - path: "src/lib/supabase/realtime.ts"
      provides: "subscribeApplicationsForWorker helper"
      exports: ["subscribeApplicationsForWorker"]
  key_links:
    - from: "apply-confirm-flow.tsx"
      to: "applyOneTap"
      via: "Server Action call"
      pattern: "applyOneTap"
    - from: "applications-client.tsx"
      to: "supabase.channel postgres_changes"
      via: "useEffect subscribe"
      pattern: "postgres_changes"
    - from: "check-in-flow.tsx"
      to: "checkIn + checkOut Server Actions"
      via: "onSubmit handler + html5-qrcode handleScan"
      pattern: "checkIn|checkOut"
---

<objective>
Worker 쪽 3개 주요 화면 + 1개 메인 페이지 배너를 실 Server Actions에 wire up하고, Supabase Realtime 구독을 연결하며, html5-qrcode 카메라 통합을 수행한다. /my/applications 인라인 목업 상수를 완전히 제거한다.

Purpose: APPL-01/02/04 + SHIFT-01/02/03 UX 충족. Phase 1 목업 화면을 실 데이터 플로우로 교체.
Output: 4개 화면 수정/재작성 + 2개 새 컴포넌트 + 1개 realtime 라이브러리.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-UI-SPEC.md
@src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx
@src/app/(worker)/my/applications/page.tsx
@src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx
@src/app/(worker)/posts/[id]/apply/actions.ts
@src/app/(worker)/my/applications/actions.ts
@src/app/(worker)/my/applications/[id]/check-in/actions.ts
@src/app/(worker)/my/actions.ts
@src/lib/supabase/client.ts
@src/lib/db/queries.ts
@src/lib/errors/application-errors.ts
@src/components/worker/push-permission-banner.tsx
@node_modules/next/dist/docs/01-app/02-guides/prefetching-and-streaming.md

<interfaces>
From Plan 04:
- applyOneTap({jobId}) → Result
- cancelApplication(id, {acknowledgedNoShowRisk?}) → CancelResult
- queries: getApplicationsByWorker(workerId, {bucket})

From Plan 05:
- checkIn(id, coords) → Result
- checkOut(id, qrToken) → Result with {actualHours, earnings, nightPremium}

From Plan 06:
- PushPermissionBanner component

From CONTEXT.md carry_forward: existing files with inline mocks to REMOVE:
- src/app/(worker)/my/applications/page.tsx (inline APPLICATIONS constant)
- src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx (setTimeout mock)
- src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx (handleScan mock)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: src/lib/supabase/realtime.ts — subscribeApplicationsForWorker helper</name>
  <files>src/lib/supabase/realtime.ts</files>
  <read_first>
    - src/lib/supabase/client.ts (@supabase/ssr browser client 패턴)
    - .planning/phases/04-db/04-CONTEXT.md D-06, D-08 (postgres_changes + 폴백)
    - .planning/phases/04-db/04-RESEARCH.md Summary #1
  </read_first>
  <action>
  ```typescript
  'use client'
  import { createClient } from '@/lib/supabase/client'

  type ApplicationChangeHandler = (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => void

  /**
   * Phase 4 D-06: Subscribe to postgres_changes for applications owned by a worker.
   * RLS policies (20260412000001) auto-filter to workerId=auth.uid().
   *
   * Returns an unsubscribe function. Call on cleanup (useEffect return).
   *
   * Polling fallback (D-08): the caller should also maintain a React Query refetchInterval
   * and toggle it based on the connection status callback.
   */
  export function subscribeApplicationsForWorker(
    workerId: string,
    onChange: ApplicationChangeHandler,
    onStatusChange?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void,
  ): () => void {
    const supabase = createClient()
    const channel = supabase
      .channel(`applications:worker:${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT (new application by self), UPDATE (accept/reject/auto-accept/state)
          schema: 'public',
          table: 'applications',
          filter: `workerId=eq.${workerId}`,
        },
        (payload: any) => onChange({ eventType: payload.eventType, new: payload.new, old: payload.old }),
      )
      .subscribe((status) => {
        onStatusChange?.(status as any)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  export function subscribeApplicationsForJob(
    jobId: string,
    onChange: ApplicationChangeHandler,
    onStatusChange?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void,
  ): () => void {
    const supabase = createClient()
    const channel = supabase
      .channel(`applications:job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `jobId=eq.${jobId}`,
        },
        (payload: any) => onChange({ eventType: payload.eventType, new: payload.new, old: payload.old }),
      )
      .subscribe((status) => {
        onStatusChange?.(status as any)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/supabase/realtime.ts && grep -q "subscribeApplicationsForWorker" src/lib/supabase/realtime.ts && grep -q "subscribeApplicationsForJob" src/lib/supabase/realtime.ts && grep -q "postgres_changes" src/lib/supabase/realtime.ts && echo OK'</automated>
  </verify>
  <done>
    - 2개 helper export
  </done>
</task>

<task type="auto">
  <name>Task 2: apply-confirm-flow.tsx — applyOneTap Server Action wire</name>
  <files>src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx</files>
  <read_first>
    - src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx (Phase 1 setTimeout mock 위치)
    - src/app/(worker)/posts/[id]/apply/actions.ts (applyOneTap signature)
    - src/lib/errors/application-errors.ts (applicationErrorToKorean)
    - .planning/phases/04-db/04-UI-SPEC.md (apply flow 색/여백/성공 화면)
  </read_first>
  <action>
  현재 파일의 `setTimeout(() => setPhase('success'), ...)` mock을 제거하고 real Server Action 호출로 교체:

  ```typescript
  // existing imports + new imports
  import { applyOneTap } from './actions'
  import { applicationErrorToKorean } from '@/lib/errors/application-errors'

  // inside handleApply (or equivalent handler)
  async function handleApply() {
    setPhase('loading')
    const result = await applyOneTap({ jobId: job.id })
    if (result.success) {
      setApplicationId(result.applicationId)
      setPhase('success')
    } else {
      setErrorMessage(applicationErrorToKorean(result.error))
      setPhase('error')
    }
  }
  ```

  UI는 Phase 1 목업의 phase machine (ready → loading → success/error)를 보존. error phase에서 "홈으로" 버튼 + "다시 시도" 버튼을 노출. success phase에서 "내 지원 목록 보기" 버튼 → `/my/applications`.

  `mock-data.ts` import가 이 파일에 있으면 제거 (타입만 쓰고 있다면 `import type { Job } from '@/lib/types/job'`로 교체).
  </action>
  <verify>
    <automated>bash -c 'grep -q "applyOneTap" "src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx" && ! grep -q "setTimeout.*success" "src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx" && ! grep -q "from .*mock-data" "src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx" && echo OK'</automated>
  </verify>
  <done>
    - applyOneTap 호출
    - setTimeout mock 제거
    - mock-data import 없음
  </done>
</task>

<task type="auto">
  <name>Task 3: /my/applications 페이지 — 실 데이터 + 탭 + Realtime</name>
  <files>src/app/(worker)/my/applications/page.tsx, src/app/(worker)/my/applications/applications-client.tsx, src/components/worker/cancel-application-dialog.tsx</files>
  <read_first>
    - src/app/(worker)/my/applications/page.tsx (인라인 APPLICATIONS 상수 위치)
    - src/app/(worker)/my/applications/actions.ts (cancelApplication)
    - src/lib/db/queries.ts getApplicationsByWorker
    - src/lib/supabase/realtime.ts (Task 1)
    - .planning/phases/04-db/04-UI-SPEC.md (탭 + 상태 x 색 매핑 표)
    - shadcn tabs 컴포넌트 이미 설치됨 (src/components/ui/tabs.tsx 확인)
  </read_first>
  <action>
  **1. page.tsx (server component) — 인라인 APPLICATIONS 상수 삭제:**

  ```typescript
  // src/app/(worker)/my/applications/page.tsx
  import { requireWorker } from '@/lib/dal'
  import { getApplicationsByWorker } from '@/lib/db/queries'
  import { ApplicationsClient } from './applications-client'

  type SearchParams = { tab?: 'upcoming' | 'active' | 'done' }

  export default async function MyApplicationsPage({
    searchParams,
  }: {
    searchParams: Promise<SearchParams>
  }) {
    const params = await searchParams
    const session = await requireWorker()
    const bucket = params.tab ?? 'upcoming'

    // Load all buckets server-side for instant tab switching
    const [upcoming, active, done] = await Promise.all([
      getApplicationsByWorker(session.id, { bucket: 'upcoming' }),
      getApplicationsByWorker(session.id, { bucket: 'active' }),
      getApplicationsByWorker(session.id, { bucket: 'done' }),
    ])

    return (
      <ApplicationsClient
        workerId={session.id}
        initialTab={bucket}
        upcoming={upcoming}
        active={active}
        done={done}
      />
    )
  }
  ```

  **기존 인라인 `const APPLICATIONS = [...]` 상수 완전 삭제.** 파일에 남아있으면 verify 실패.

  **2. applications-client.tsx (client component):**

  ```typescript
  'use client'
  import { useEffect, useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
  import { subscribeApplicationsForWorker } from '@/lib/supabase/realtime'
  import { CancelApplicationDialog } from '@/components/worker/cancel-application-dialog'
  import { Hourglass, CheckCircle2, Zap, CheckCheck, XCircle } from 'lucide-react'
  // ... 기타 imports

  type AppRow = Awaited<ReturnType<typeof import('@/lib/db/queries').getApplicationsByWorker>>[number]

  type Props = {
    workerId: string
    initialTab: 'upcoming' | 'active' | 'done'
    upcoming: AppRow[]
    active: AppRow[]
    done: AppRow[]
  }

  export function ApplicationsClient({ workerId, initialTab, upcoming, active, done }: Props) {
    const router = useRouter()
    const [currentTab, setCurrentTab] = useState(initialTab)
    const [isStale, setIsStale] = useState(false) // Realtime triggered → prompt refresh

    useEffect(() => {
      const unsubscribe = subscribeApplicationsForWorker(workerId, (payload) => {
        // Any change → mark stale → router.refresh() to reload server component
        setIsStale(true)
        router.refresh()
      })
      return unsubscribe
    }, [workerId, router])

    return (
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">지원 내역</h1>
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="upcoming">예정 ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="active">진행중 ({active.length})</TabsTrigger>
            <TabsTrigger value="done">완료 ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <ApplicationList items={upcoming} emptyMessage="예정된 지원이 없습니다" />
          </TabsContent>
          <TabsContent value="active">
            <ApplicationList items={active} emptyMessage="진행 중인 근무가 없습니다" />
          </TabsContent>
          <TabsContent value="done">
            <ApplicationList items={done} emptyMessage="완료된 근무가 없습니다" />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  function ApplicationList({ items, emptyMessage }: { items: AppRow[]; emptyMessage: string }) {
    if (items.length === 0) {
      return <p className="text-center py-12 text-muted-foreground">{emptyMessage}</p>
    }
    return (
      <ul className="space-y-3 mt-4">
        {items.map((app) => <ApplicationCard key={app.id} app={app} />)}
      </ul>
    )
  }

  function ApplicationCard({ app }: { app: AppRow }) {
    // Render status badge per UI-SPEC table (pending=Hourglass amber, confirmed=CheckCircle2 teal, ...)
    // Render job.title, job.business.name, workDate, startTime, earnings (if completed), etc.
    // Render action buttons:
    //   - pending/confirmed: "취소" (opens CancelApplicationDialog)
    //   - confirmed + within check-in window: "체크인" → /my/applications/[id]/check-in
    //   - in_progress: "체크아웃" → /my/applications/[id]/check-in (same page, different flow)
    //   - completed: 금액 표시
    return (
      <li className="rounded-lg border bg-card p-4">
        {/* ... per UI-SPEC */}
      </li>
    )
  }
  ```

  **3. cancel-application-dialog.tsx:**

  shadcn alert-dialog + sonner 설치 필요:
  ```
  npx shadcn@latest add alert-dialog sonner dialog progress sheet tooltip
  ```
  (Plan 09도 같은 primitives 필요하므로 여기서 한꺼번에 설치)

  ```typescript
  'use client'
  import { useState } from 'react'
  import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
  } from '@/components/ui/alert-dialog'
  import { toast } from 'sonner'
  import { cancelApplication } from '@/app/(worker)/my/applications/actions'
  import { applicationErrorToKorean } from '@/lib/errors/application-errors'

  type Props = {
    applicationId: string
    workDateStartAt: Date // workDate + startTime combined
    trigger: React.ReactNode
  }

  export function CancelApplicationDialog({ applicationId, workDateStartAt, trigger }: Props) {
    const now = new Date()
    const hoursUntilStart = (workDateStartAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    const isLate = hoursUntilStart < 24

    const [open, setOpen] = useState(false)
    const [pending, setPending] = useState(false)

    async function handleConfirm() {
      setPending(true)
      const result = await cancelApplication(applicationId, { acknowledgedNoShowRisk: isLate })
      setPending(false)
      setOpen(false)
      if (result.success) {
        if (result.noShowCounted) {
          toast.warning('취소되었습니다. 노쇼 1회가 기록됩니다.')
        } else {
          toast.success('취소되었습니다')
        }
      } else {
        toast.error(applicationErrorToKorean(result.error))
      }
    }

    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isLate ? '지금 취소하면 노쇼가 기록됩니다' : '지원을 취소하시겠어요?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isLate
                ? '근무 24시간 전이 지나 무료 취소가 불가합니다. 취소시 프로필 완료율이 감소하고 노쇼 카운트가 1 증가합니다.'
                : '근무 24시간 전까지 무료로 취소할 수 있습니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={pending}>
              {pending ? '처리 중...' : isLate ? '노쇼 수락하고 취소' : '취소하기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
  ```

  Sonner toaster는 root layout에 `<Toaster />`로 마운트. 없으면 layout.tsx 에 추가 (Task 5와 묶어 처리).
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/my/applications/applications-client.tsx" && test -f "src/components/worker/cancel-application-dialog.tsx" && ! grep -q "const APPLICATIONS\s*=" "src/app/(worker)/my/applications/page.tsx" && grep -q "getApplicationsByWorker" "src/app/(worker)/my/applications/page.tsx" && grep -q "subscribeApplicationsForWorker" "src/app/(worker)/my/applications/applications-client.tsx" && echo OK'</automated>
  </verify>
  <done>
    - page.tsx 인라인 APPLICATIONS 제거, getApplicationsByWorker 호출
    - applications-client.tsx Tabs + Realtime
    - cancel-application-dialog.tsx with 24h rule
    - shadcn primitives 설치
  </done>
</task>

<task type="auto">
  <name>Task 3b: D-08 polling fallback — Worker applications-client</name>
  <files>src/app/(worker)/my/applications/applications-client.tsx</files>
  <read_first>
    - src/app/(worker)/my/applications/applications-client.tsx (Task 3 결과물)
    - src/lib/supabase/realtime.ts (Task 1 — subscribeApplicationsForWorker는 onStatusChange 3번째 인자 이미 지원)
    - .planning/phases/04-db/04-CONTEXT.md D-08 (60초 polling fallback 결정)
    - .planning/phases/04-db/04-RESEARCH.md "Open Questions (RESOLVED)" Q#4 (EXISTS JOIN Realtime 불확실성 + fallback 커밋)
  </read_first>
  <action>
  Task 3에서 작성한 `applications-client.tsx`의 Realtime 구독을 **polling fallback과 결합**한다. D-08 "Realtime 실패시 60초 polling"을 JSDoc 주석이 아니라 실제 런타임 코드로 구현한다.

  **변경 방식 — 3곳 수정:**

  1. `useState` 추가:
  ```typescript
  const [pollingActive, setPollingActive] = useState(false)
  ```

  2. `subscribeApplicationsForWorker` 호출에 **3번째 인자 `onStatusChange` 콜백을 추가**하여 status 전이를 pollingActive로 매핑:
  ```typescript
  useEffect(() => {
    const unsubscribe = subscribeApplicationsForWorker(
      workerId,
      (payload) => {
        setIsStale(true)
        router.refresh()
      },
      (status) => {
        // D-08 fallback trigger
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setPollingActive(true)
        } else if (status === 'SUBSCRIBED') {
          setPollingActive(false)
        }
      },
    )
    return unsubscribe
  }, [workerId, router])
  ```

  3. `pollingActive`가 true이면 60초 간격으로 `router.refresh()` 호출:
  ```typescript
  useEffect(() => {
    if (!pollingActive) return
    const id = setInterval(() => router.refresh(), 60_000)
    return () => clearInterval(id)
  }, [pollingActive, router])
  ```

  **중요:**
  - 이 task는 기존 Task 3 applications-client.tsx의 일부를 **수정**한다 (덮어쓰기 아님).
  - `pollingActive` 상태 이름은 verify grep이 문자열 매칭하므로 변경하지 말 것.
  - 기존 Realtime 구독은 그대로 유지 — polling은 **보조** 경로다. 정상 상태(`SUBSCRIBED`)로 복귀하면 setInterval이 cleanup 되어 polling 중단.
  - RESEARCH.md Q#4 RESOLVED 결정에 따라 이 fallback은 MUST 구현이며, 없으면 Biz-side EXISTS JOIN Realtime이 조용히 실패할 경우 Worker UI가 갱신되지 않는 위험이 남는다.
  </action>
  <verify>
    <automated>bash -c 'f="src/app/(worker)/my/applications/applications-client.tsx"; pct=$(grep -c "pollingActive" "$f"); si=$(grep -c "setInterval" "$f"); ce=$(grep -Ec "CHANNEL_ERROR|TIMED_OUT" "$f"); if [ "$pct" -ge 2 ] && [ "$si" -ge 1 ] && [ "$ce" -ge 1 ]; then echo "OK pollingActive=$pct setInterval=$si channel=$ce"; else echo "FAIL pollingActive=$pct setInterval=$si channel=$ce"; exit 1; fi'</automated>
  </verify>
  <done>
    - applications-client.tsx에 pollingActive state 존재
    - subscribeApplicationsForWorker의 3번째 인자로 onStatusChange 콜백 전달
    - pollingActive === true일 때 60초 setInterval router.refresh
    - CHANNEL_ERROR / TIMED_OUT 트리거 분기 존재
  </done>
</task>

<task type="auto">
  <name>Task 4: QR Scanner wrapper + check-in-flow 통합</name>
  <files>src/components/worker/qr-scanner.tsx, src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx, src/app/(worker)/my/applications/[id]/check-in/page.tsx</files>
  <read_first>
    - src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx (현재 QR mock UI)
    - src/app/(worker)/my/applications/[id]/check-in/actions.ts (checkIn + checkOut)
    - .planning/phases/04-db/04-RESEARCH.md (html5-qrcode React 19 StrictMode 이슈 + dynamic import 패턴)
    - .planning/phases/04-db/04-UI-SPEC.md (check-in visual)
    - node_modules/html5-qrcode/README.md
  </read_first>
  <action>
  **1. src/components/worker/qr-scanner.tsx (wrapper):**

  ```typescript
  'use client'
  import { useEffect, useRef } from 'react'

  type Props = {
    onScan: (decodedText: string) => void
    onError?: (err: string) => void
  }

  /**
   * Phase 4 D-14 — html5-qrcode wrapper with React 19 StrictMode guard.
   *
   * Known issue: React 19 StrictMode double-mounts effects; html5-qrcode's Html5Qrcode.start()
   * can crash if called twice on the same DOM node. We defend with a ref flag + async stop().then(clear).
   *
   * Must be loaded via dynamic import with ssr:false from the consuming page (check-in-flow.tsx):
   *   const QrScanner = dynamic(() => import('@/components/worker/qr-scanner').then(m => m.QrScanner), { ssr: false })
   */
  export function QrScanner({ onScan, onError }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const startedRef = useRef(false)

    useEffect(() => {
      if (!containerRef.current) return
      if (startedRef.current) return

      let scanner: any = null
      let cancelled = false

      ;(async () => {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        const id = `qr-scanner-${Math.random().toString(36).slice(2)}`
        containerRef.current!.id = id
        scanner = new Html5Qrcode(id)
        startedRef.current = true
        try {
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => onScan(decodedText),
            () => {}, // per-frame errors are normal while no QR in frame
          )
        } catch (err: any) {
          startedRef.current = false
          onError?.(String(err?.message ?? err))
        }
      })()

      return () => {
        cancelled = true
        if (scanner && startedRef.current) {
          scanner.stop()
            .then(() => scanner.clear())
            .catch(() => {})
            .finally(() => { startedRef.current = false })
        }
      }
    }, [onScan, onError])

    return <div ref={containerRef} className="w-full max-w-sm mx-auto aspect-square bg-black rounded-lg overflow-hidden" />
  }
  ```

  **2. check-in-flow.tsx 재작성:**

  현재 파일은 Phase 1 QR mock UI. Phase 4에서 다음 3-phase flow로 교체:
  - **phase 1: check-in** (confirmed status일 때): "체크인" 버튼 → geolocation 요청 → checkIn({lat,lng}) 호출
  - **phase 2: working** (in_progress): LIVE 인디케이터 + "체크아웃하기" 버튼 → QR scanner phase로
  - **phase 3: scanning**: QrScanner 카메라 → handleScan(decodedText) → checkOut(id, decodedText) 호출

  ```typescript
  'use client'
  import { useState } from 'react'
  import dynamic from 'next/dynamic'
  import { useRouter } from 'next/navigation'
  import { checkIn, checkOut } from './actions'
  import { applicationErrorToKorean } from '@/lib/errors/application-errors'
  import { toast } from 'sonner'
  // ... UI imports (Button, Card, etc. from @/components/ui)

  const QrScanner = dynamic(
    () => import('@/components/worker/qr-scanner').then(m => m.QrScanner),
    { ssr: false },
  )

  type Application = /* shape from server component props */ any

  type Props = { application: Application }

  type Phase = 'ready' | 'locating' | 'working' | 'scanning' | 'submitting' | 'done'

  export function CheckInFlow({ application }: Props) {
    const router = useRouter()
    const [phase, setPhase] = useState<Phase>(
      application.status === 'in_progress' ? 'working' : 'ready',
    )
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ actualHours: number; earnings: number } | null>(null)

    async function handleCheckIn() {
      setError(null)
      setPhase('locating')
      try {
        const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('geolocation_not_supported'))
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        })
        const res = await checkIn(application.id, {
          lat: coords.coords.latitude,
          lng: coords.coords.longitude,
        })
        if (res.success) {
          setPhase('working')
          router.refresh()
        } else {
          setError(applicationErrorToKorean(res.error))
          setPhase('ready')
        }
      } catch (e: any) {
        setError('위치 권한을 허용해주세요')
        setPhase('ready')
      }
    }

    async function handleScan(decodedText: string) {
      setPhase('submitting')
      const res = await checkOut(application.id, decodedText)
      if (res.success) {
        setResult({ actualHours: res.actualHours, earnings: res.earnings })
        setPhase('done')
        toast.success(`수고하셨습니다! ${res.earnings.toLocaleString()}원이 지급됩니다`)
      } else {
        setError(applicationErrorToKorean(res.error))
        setPhase('working')
      }
    }

    return (
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {phase === 'ready' && (
          <div>
            <h1 className="text-xl font-bold">체크인</h1>
            <p className="text-sm text-muted-foreground mt-1">매장 도착 후 버튼을 눌러주세요 (반경 200m 이내)</p>
            <button onClick={handleCheckIn} className="mt-4 w-full rounded-lg bg-primary py-3 text-white font-bold">
              체크인 시작
            </button>
          </div>
        )}

        {phase === 'locating' && <p>위치 확인 중...</p>}

        {phase === 'working' && (
          <div>
            <div className="flex items-center gap-2 text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold">LIVE · 근무 중</span>
            </div>
            <button onClick={() => setPhase('scanning')} className="mt-4 w-full rounded-lg bg-primary py-3 text-white font-bold">
              QR 체크아웃
            </button>
          </div>
        )}

        {phase === 'scanning' && (
          <div>
            <h2 className="font-bold mb-2">매장 QR을 카메라에 비춰주세요</h2>
            <QrScanner onScan={handleScan} onError={(e) => setError(e)} />
            <button onClick={() => setPhase('working')} className="mt-3 text-sm text-muted-foreground">취소</button>
          </div>
        )}

        {phase === 'submitting' && <p>정산 중...</p>}

        {phase === 'done' && result && (
          <div className="text-center py-8">
            <p className="text-lg">근무 완료!</p>
            <p className="text-3xl font-bold text-primary tabular-nums mt-2">{result.earnings.toLocaleString()}원</p>
            <p className="text-sm text-muted-foreground mt-1">실근무 {result.actualHours}시간</p>
            <button onClick={() => router.push('/my/applications')} className="mt-6 rounded-lg bg-muted px-6 py-2">지원 목록</button>
          </div>
        )}
      </div>
    )
  }
  ```

  **3. check-in page.tsx** (server component that fetches application):
  ```typescript
  import { requireWorker } from '@/lib/dal'
  import { prisma } from '@/lib/db'
  import { notFound } from 'next/navigation'
  import { CheckInFlow } from './check-in-flow'

  export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await requireWorker()
    const app = await prisma.application.findUnique({
      where: { id },
      include: { job: { include: { business: true } } },
    })
    if (!app || app.workerId !== session.id) return notFound()
    return <CheckInFlow application={JSON.parse(JSON.stringify(app))} />
  }
  ```

  `mock-data.ts` import 완전 제거. 기존 Phase 1 handleScan mock 로직 삭제.
  </action>
  <verify>
    <automated>bash -c 'test -f "src/components/worker/qr-scanner.tsx" && grep -q "html5-qrcode" "src/components/worker/qr-scanner.tsx" && grep -q "checkIn\\|checkOut" "src/app/(worker)/my/applications/\\[id\\]/check-in/check-in-flow.tsx" && ! grep -q "mock-data" "src/app/(worker)/my/applications/\\[id\\]/check-in/check-in-flow.tsx" && echo OK'</automated>
  </verify>
  <done>
    - qr-scanner.tsx 독립 컴포넌트 + dynamic import 패턴
    - check-in-flow.tsx Phase machine 3단계 + Server Actions wire
    - check-in page.tsx async params
    - mock 제거
  </done>
</task>

<task type="auto">
  <name>Task 5: /my 페이지 — PushPermissionBanner 렌더 + Toaster 설정</name>
  <files>src/app/(worker)/my/page.tsx, src/app/(worker)/my/my-client-banner.tsx, src/app/layout.tsx</files>
  <read_first>
    - src/app/(worker)/my/page.tsx (현재 구조)
    - src/components/worker/push-permission-banner.tsx (Plan 06)
    - src/app/layout.tsx
  </read_first>
  <action>
  **1. src/app/(worker)/my/my-client-banner.tsx** (client wrapper):

  이미 Plan 06에서 `src/components/worker/push-permission-banner.tsx`가 생성되었으므로, /my 페이지(server component)가 PushPermissionBanner (client component)를 직접 렌더할 수 있다. 중간 wrapper가 불필요하면 이 파일 생략하고 바로 page.tsx에서 import.

  **2. src/app/(worker)/my/page.tsx**:
  기존 page.tsx를 열어서 파일 최상단 rendering 구역에 `<PushPermissionBanner />` 삽입. import 추가:
  ```typescript
  import { PushPermissionBanner } from '@/components/worker/push-permission-banner'

  // ... 기존 JSX의 상단에:
  <PushPermissionBanner />
  ```

  **3. src/app/layout.tsx에 Sonner Toaster 추가:**
  ```typescript
  import { Toaster } from '@/components/ui/sonner'
  // ... 기존 imports

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="ko">
        <body>
          <ServiceWorkerRegistrar />
          {children}
          <Toaster position="top-center" richColors />
        </body>
      </html>
    )
  }
  ```

  `src/components/ui/sonner.tsx`는 Task 3에서 shadcn add sonner로 설치됨.
  </action>
  <verify>
    <automated>bash -c 'grep -q "PushPermissionBanner" "src/app/(worker)/my/page.tsx" && grep -q "Toaster" src/app/layout.tsx && test -f src/components/ui/sonner.tsx && echo OK'</automated>
  </verify>
  <done>
    - /my 페이지에 PushPermissionBanner 렌더
    - layout에 Toaster
  </done>
</task>

<task type="auto">
  <name>Task 6: mock-data import grep 최종 확인 (worker 루트)</name>
  <files>(verification only)</files>
  <read_first>
    - src/app/(worker)/ (grep 대상 전체)
  </read_first>
  <action>
  Phase 4 constraint: worker 쪽 touched 파일에서 `mock-data` import 0 참조.

  ```bash
  grep -rn "from .*mock-data" "src/app/(worker)/posts" "src/app/(worker)/my" 2>&1
  ```

  결과가 비어야 한다. 만약 남아있으면 해당 파일을 수정 (타입만 쓰는 경우 `@/lib/types/job`으로 교체, 데이터 쓰는 경우 server query 교체).

  **주의:** `src/lib/mock-data.ts` 파일 자체는 삭제하지 않는다 (Phase 5 exit criterion). `src/app/(worker)` 외부에는 여전히 참조 있을 수 있음 (Phase 5가 처리).
  </action>
  <verify>
    <automated>bash -c 'count=$(grep -rln "from .*mock-data" "src/app/(worker)/posts" "src/app/(worker)/my" 2>/dev/null | wc -l); if [ "$count" = "0" ]; then echo "OK 0 refs"; else echo "FAIL $count refs"; grep -rln "from .*mock-data" "src/app/(worker)/posts" "src/app/(worker)/my"; exit 1; fi'</automated>
  </verify>
  <done>
    - Worker posts + my 디렉토리에 mock-data 참조 0
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 7: Worker 화면 수동 검증 checkpoint</name>
  <files>(checkpoint — no files modified)</files>
  <action>See <how-to-verify> below. Checker performs the listed manual steps and responds via <resume-signal>.</action>
  <verify>
    <automated>echo "human verify required — see how-to-verify block"</automated>
  </verify>
  <done>Checker responds with approved / partial / failed per resume-signal contract.</done>
  <what-built>
    - /posts/[id]/apply 원탭 지원 → applyOneTap → 실 DB insert
    - /my/applications Tabs + Realtime 구독
    - /my/applications/[id]/check-in Phase machine + geofence + html5-qrcode
    - /my PushPermissionBanner
    - Cancel 24h 경고 모달
    - 모든 mock setTimeout/인라인 상수 제거
  </what-built>
  <how-to-verify>
    Checker가 dev server 실행 후 아래 시나리오를 직접 클릭 확인:

    1. Worker로 로그인 → `/home` → 공고 하나 클릭 → 상세 → "원탭 지원" → 성공 화면 표시 → `/my/applications` 이동
    2. 방금 생성된 application이 "예정" 탭에 "대기 중" 배지와 함께 표시됨
    3. 다른 탭 열고 Prisma Studio 또는 SQL로 `UPDATE applications SET status='confirmed' WHERE id=...` 수동 실행 → Worker 탭이 자동으로 "수락됨"으로 전환됨 (Realtime 확인, 60초 이내)
    4. (테스트 DB 시간 조작) application의 workDate/startTime을 현재 시각-5분으로 수정 → Worker가 /check-in → "체크인 시작" → geolocation 허용 → geofence 통과 확인 (200m 이내면 성공)
    5. /my 첫 방문시 "알림을 켜보세요" 배너 표시 확인

    (실제 QR + Web Push + Kakao Maps는 04-HUMAN-UAT.md의 수동 시나리오에서 별도 검증)

    Approve signal:
    - [ ] 1~5 모두 PASS → "approved"
    - [ ] 일부 실패 → 실패 항목 설명
  </how-to-verify>
  <resume-signal>"approved" 또는 이슈 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client camera → Worker's checkOut | html5-qrcode reads decoded text; JWT verification on server validates authenticity |
| Supabase Realtime subscription → client | RLS policies (Plan 03) gate which rows are dispatched |
| Geolocation API → checkIn | Mobile spoofable, see Plan 05 T-04-24 |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-45 | Spoofing | Realtime subscriber claiming other worker's channel | mitigate | Supabase Realtime passes JWT from supabase-js client; RLS filters rows server-side before dispatch |
| T-04-46 | Tampering | Client sending modified applicationId to cancelApplication | mitigate | cancelApplication Server Action verifies app.workerId === session.id |
| T-04-47 | Info Disclosure | Sonner toast leaking raw error strings | mitigate | All toast messages use applicationErrorToKorean (user-safe Korean strings) |
| T-04-48 | XSS via job title in badge | React renders with escaping | mitigate | No dangerouslySetInnerHTML; React default escape |
| T-04-49 | Race condition | Multiple browser tabs calling checkOut on same application | mitigate | checkOut throws 'invalid_state' if status != 'in_progress'; second call gets state error |
| T-04-50 | Camera permission abuse | QrScanner requesting camera silently | mitigate | Browser prompts user; QrScanner only mounts when user explicitly clicks "QR 체크아웃" button |
</threat_model>

<verification>
- All RED checks from Plan 01 are GREEN now (implicit regression)
- `grep -r "mock-data" src/app/(worker)/posts src/app/(worker)/my` → 0 matches
- Manual UAT checkpoint passes
</verification>

<success_criteria>
- [x] 4 worker screens wired to real Server Actions
- [x] /my/applications Realtime + Tabs
- [x] html5-qrcode wrapper with StrictMode guard
- [x] Check-in phase machine (ready → locating → working → scanning → done)
- [x] Cancel dialog with 24h rule
- [x] PushPermissionBanner on /my
- [x] mock-data import 0 in worker touched dirs
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-08-SUMMARY.md` with:
- Screen-by-screen diff
- Server Action call graph
- Known follow-ups: UAT checkpoint results
</output>
