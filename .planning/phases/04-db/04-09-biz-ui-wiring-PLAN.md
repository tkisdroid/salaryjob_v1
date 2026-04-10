---
phase: 04-db
plan: 09
type: execute
wave: 5
depends_on: [4, 5, 6]
files_modified:
  - src/app/biz/posts/[id]/applicants/page.tsx
  - src/app/biz/posts/[id]/applicants/applicants-client.tsx
  - src/app/biz/posts/[id]/page.tsx
  - src/components/biz/checkout-qr-modal.tsx
autonomous: false
requirements:
  - APPL-03
  - APPL-04
  - SHIFT-02

must_haves:
  truths:
    - "/biz/posts/[id]/applicants 페이지가 getApplicationsByJob으로 실 데이터를 로드하고 인라인 APPLICANTS 상수가 삭제되어 있다"
    - "Business의 '수락'/'거절' 버튼이 acceptApplication / rejectApplication Server Actions를 호출한다"
    - "지원자 카드에 30분 자동수락 타이머(progress bar)가 pending 상태인 application에 표시된다"
    - "applicants 페이지가 Supabase Realtime subscribeApplicationsForJob으로 새 지원 / 상태 변경을 실시간 반영한다"
    - "/biz/posts/[id] 페이지에 '퇴근 QR 열기' 버튼이 있고 클릭시 모달에 QR SVG가 렌더되며 10분 카운트다운 진행"
    - "10분 만료 10초 전에 generateCheckoutQrToken을 재호출하여 새 QR로 교체한다"
    - "비즈 디렉토리 touched 파일에서 mock-data import 0 참조"
  artifacts:
    - path: "src/app/biz/posts/[id]/applicants/applicants-client.tsx"
      provides: "realtime + accept/reject + auto-accept timer progress"
    - path: "src/components/biz/checkout-qr-modal.tsx"
      provides: "QR SVG + 10 min countdown + auto-regenerate"
  key_links:
    - from: "applicants-client"
      to: "acceptApplication / rejectApplication"
      via: "button onClick"
      pattern: "acceptApplication"
    - from: "checkout-qr-modal"
      to: "generateCheckoutQrToken"
      via: "on open + on expire"
      pattern: "generateCheckoutQrToken"
---

<objective>
Business 쪽 2개 화면 수정 + 1개 컴포넌트 신규 작성: 지원자 관리 Realtime + accept/reject, 공고 상세의 "퇴근 QR 열기" 모달. 인라인 APPLICANTS 상수 제거.

Purpose: APPL-03/04 + SHIFT-02(Biz QR 발급) UX 충족. Worker 쪽 Plan 08과 동시 실행 가능 (같은 Wave 5, 다른 파일).
Output: 4개 파일 수정 또는 신규 + mock 제거 + shadcn dialog/progress/scroll-area wiring.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-UI-SPEC.md
@src/app/biz/posts/[id]/applicants/page.tsx
@src/app/biz/posts/[id]/page.tsx
@src/app/biz/posts/[id]/applicants/actions.ts
@src/app/biz/posts/[id]/actions.ts
@src/lib/db/queries.ts
@src/lib/supabase/realtime.ts
@src/lib/errors/application-errors.ts

<interfaces>
From Plan 04:
- acceptApplication(applicationId) → ActionResult
- rejectApplication(applicationId) → ActionResult
- queries.getApplicationsByJob(jobId)

From Plan 05:
- generateCheckoutQrToken(jobId) → { success, token, expiresAt } | { success: false, error: 'rate_limited' | ... }

From Plan 08 (Wave 5 parallel):
- src/lib/supabase/realtime.ts exports subscribeApplicationsForJob — Plan 08 creates it; Plan 09 relies on same file
- ⚠️ Wave 5 coordination: 두 plan이 동시 실행되므로 file 충돌 주의. src/lib/supabase/realtime.ts는 Plan 08 Task 1이 생성 → Plan 09는 import만. 실행 순서는 wave 내 Plan 08 → Plan 09 가 안전 OR 두 plan이 각자 helper를 독립 작성 후 merge (planner는 Plan 08 생성 → Plan 09 사용 순서 권장)

Note: files_modified 충돌 방지 체크: Plan 08은 `src/lib/supabase/realtime.ts`를 create한다. Plan 09도 그 파일을 import한다. `files_modified`에 Plan 09가 이 파일을 포함시키지 않으므로 병렬 실행 가능하지만, 실행시 Plan 09가 Plan 08 완료 후에 import 가능. Wave dispatcher가 Plan 08을 먼저 실행하도록 자연 순서. 만약 동시 실행되면 Plan 09의 Task 1에서 file 존재 확인 후 대기.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: 의존성 확인 — src/lib/supabase/realtime.ts 존재 체크</name>
  <files>(check only)</files>
  <read_first>
    - src/lib/supabase/realtime.ts (Plan 08 Task 1 생성 대상)
  </read_first>
  <action>
  이 태스크는 의존성 gate다. Plan 08 Task 1이 완료되면 src/lib/supabase/realtime.ts가 존재하고 subscribeApplicationsForJob을 export한다.

  ```bash
  if ! grep -q "subscribeApplicationsForJob" src/lib/supabase/realtime.ts 2>/dev/null; then
    echo "BLOCKED: Plan 08 Task 1 (src/lib/supabase/realtime.ts) must complete first"
    exit 1
  fi
  echo "OK: realtime helper available"
  ```

  만약 Plan 08이 아직 realtime.ts를 만들지 않았다면 Plan 09 실행을 중단하고 Plan 08 Task 1 완료를 기다린다.
  </action>
  <verify>
    <automated>bash -c 'grep -q "subscribeApplicationsForJob" src/lib/supabase/realtime.ts && echo "GATE PASSED"'</automated>
  </verify>
  <done>
    - realtime.ts 존재 + subscribeApplicationsForJob export 확인
  </done>
</task>

<task type="auto">
  <name>Task 2: /biz/posts/[id]/applicants — 실 데이터 + Realtime + accept/reject</name>
  <files>src/app/biz/posts/[id]/applicants/page.tsx, src/app/biz/posts/[id]/applicants/applicants-client.tsx</files>
  <read_first>
    - src/app/biz/posts/[id]/applicants/page.tsx (인라인 APPLICANTS 상수 위치)
    - src/app/biz/posts/[id]/applicants/actions.ts (Plan 04 Server Actions)
    - src/lib/db/queries.ts (getApplicationsByJob)
    - src/lib/supabase/realtime.ts (subscribeApplicationsForJob)
    - .planning/phases/04-db/04-UI-SPEC.md (지원자 카드 색/여백, teal accept 버튼, 자동수락 타이머 progress)
  </read_first>
  <action>
  **1. page.tsx (server component) — 인라인 APPLICANTS 삭제:**

  ```typescript
  import { requireBusiness } from '@/lib/dal'
  import { prisma } from '@/lib/db'
  import { getApplicationsByJob } from '@/lib/db/queries'
  import { notFound } from 'next/navigation'
  import { ApplicantsClient } from './applicants-client'

  export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await requireBusiness()
    const job = await prisma.job.findUnique({ where: { id } })
    if (!job || job.authorId !== session.id) return notFound()

    const applications = await getApplicationsByJob(id)
    // Serialize for client (Dates → ISO strings if needed)
    const serialized = JSON.parse(JSON.stringify(applications))

    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">지원자 관리 — {job.title}</h1>
        <ApplicantsClient jobId={id} initialApplications={serialized} />
      </div>
    )
  }
  ```

  **기존 인라인 `const APPLICANTS = [...]` 상수 완전 삭제.**

  **2. applicants-client.tsx (client component):**

  ```typescript
  'use client'
  import { useEffect, useState, useTransition } from 'react'
  import { useRouter } from 'next/navigation'
  import { Hourglass, CheckCircle2, XCircle, Zap, CheckCheck, Star } from 'lucide-react'
  import { toast } from 'sonner'
  import { acceptApplication, rejectApplication } from './actions'
  import { applicationErrorToKorean } from '@/lib/errors/application-errors'
  import { subscribeApplicationsForJob } from '@/lib/supabase/realtime'
  import { Progress } from '@/components/ui/progress'
  import { ScrollArea } from '@/components/ui/scroll-area'

  type AppRow = any // shape from getApplicationsByJob + worker.workerProfile

  type Props = {
    jobId: string
    initialApplications: AppRow[]
  }

  const AUTO_ACCEPT_MS = 30 * 60 * 1000 // D-03 30 minutes

  export function ApplicantsClient({ jobId, initialApplications }: Props) {
    const router = useRouter()
    const [apps, setApps] = useState<AppRow[]>(initialApplications)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    useEffect(() => {
      const unsub = subscribeApplicationsForJob(jobId, (payload) => {
        // On any change, refresh server component via router.refresh
        startTransition(() => {
          router.refresh()
          // Also optimistically merge the payload for instant feedback
          if (payload.eventType === 'INSERT' && payload.new) {
            setApps((prev) => [...prev, payload.new])
            toast.info('새 지원자가 있습니다')
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setApps((prev) => prev.map((a) => a.id === payload.new.id ? { ...a, ...payload.new } : a))
          }
        })
      })
      return unsub
    }, [jobId, router])

    // Re-sync from server when props change (after router.refresh)
    useEffect(() => {
      setApps(initialApplications)
    }, [initialApplications])

    async function handleAccept(id: string) {
      setPendingId(id)
      const res = await acceptApplication(id)
      setPendingId(null)
      if (res.success) toast.success('수락되었습니다')
      else toast.error(applicationErrorToKorean(res.error))
    }

    async function handleReject(id: string) {
      setPendingId(id)
      const res = await rejectApplication(id)
      setPendingId(null)
      if (res.success) toast.success('거절되었습니다')
      else toast.error(applicationErrorToKorean(res.error))
    }

    if (apps.length === 0) {
      return <p className="text-center py-16 text-muted-foreground">아직 지원자가 없습니다</p>
    }

    return (
      <ScrollArea className="max-h-[70vh]">
        <ul className="space-y-4">
          {apps.map((app) => (
            <ApplicantCard
              key={app.id}
              app={app}
              pending={pendingId === app.id}
              onAccept={() => handleAccept(app.id)}
              onReject={() => handleReject(app.id)}
            />
          ))}
        </ul>
      </ScrollArea>
    )
  }

  function ApplicantCard({ app, pending, onAccept, onReject }: { app: AppRow; pending: boolean; onAccept: () => void; onReject: () => void }) {
    const showAutoAcceptTimer = app.status === 'pending'
    const [percentElapsed, setPercentElapsed] = useState(0)

    useEffect(() => {
      if (!showAutoAcceptTimer) return
      const appliedAt = new Date(app.appliedAt).getTime()
      function tick() {
        const elapsed = Date.now() - appliedAt
        const pct = Math.min(100, (elapsed / AUTO_ACCEPT_MS) * 100)
        setPercentElapsed(pct)
      }
      tick()
      const interval = setInterval(tick, 5000) // every 5s is enough UX-wise
      return () => clearInterval(interval)
    }, [app.appliedAt, showAutoAcceptTimer])

    const worker = app.worker
    const profile = worker?.workerProfile

    return (
      <li className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{profile?.avatar ?? '👤'}</div>
          <div className="flex-1">
            <p className="font-bold">{profile?.name ?? '익명'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(profile?.rating ?? 0).toFixed(1)} · 완료 {profile?.totalJobs ?? 0}회
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {showAutoAcceptTimer && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>자동 수락까지</span>
              <span>{Math.max(0, Math.round(30 - (percentElapsed * 30 / 100)))}분 남음</span>
            </div>
            <Progress value={percentElapsed} />
          </div>
        )}

        {(app.status === 'pending' || app.status === 'confirmed') && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              disabled={pending || app.status === 'confirmed'}
              className="flex-1 rounded-md px-4 py-2 text-sm font-bold bg-teal text-white hover:bg-teal/90 disabled:opacity-50"
            >
              {app.status === 'confirmed' ? '수락됨' : '수락'}
            </button>
            <button
              onClick={onReject}
              disabled={pending}
              className="flex-1 rounded-md px-4 py-2 text-sm font-bold border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              거절
            </button>
          </div>
        )}
      </li>
    )
  }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string; Icon: any }> = {
      pending:     { label: '대기 중',   className: 'bg-status-pending-bg text-status-pending-fg', Icon: Hourglass },
      confirmed:   { label: '수락됨',    className: 'bg-teal/10 text-teal',                      Icon: CheckCircle2 },
      in_progress: { label: '근무 중',   className: 'bg-green-500/10 text-green-700',             Icon: Zap },
      completed:   { label: '완료',      className: 'bg-muted text-muted-foreground',             Icon: CheckCheck },
      cancelled:   { label: '취소됨',    className: 'bg-destructive/10 text-destructive',         Icon: XCircle },
    }
    const entry = map[status] ?? map.pending
    const Icon = entry.Icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${entry.className}`}>
        <Icon className="h-3 w-3" />
        {entry.label}
      </span>
    )
  }
  ```

  shadcn primitives 필요한 것 설치 (Plan 08 Task 3에서 이미 일부 설치했으면 skip):
  ```
  npx shadcn@latest add progress scroll-area
  ```
  (dialog, alert-dialog, sonner, tooltip, sheet 은 Plan 08에서 설치 완료 가정)
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/biz/posts/[id]/applicants/applicants-client.tsx" && ! grep -q "const APPLICANTS\s*=" "src/app/biz/posts/[id]/applicants/page.tsx" && grep -q "getApplicationsByJob" "src/app/biz/posts/[id]/applicants/page.tsx" && grep -q "acceptApplication" "src/app/biz/posts/[id]/applicants/applicants-client.tsx" && grep -q "subscribeApplicationsForJob" "src/app/biz/posts/[id]/applicants/applicants-client.tsx" && test -f src/components/ui/progress.tsx && test -f src/components/ui/scroll-area.tsx && echo OK'</automated>
  </verify>
  <done>
    - page.tsx에서 인라인 APPLICANTS 삭제
    - applicants-client.tsx: accept/reject + Realtime + 자동수락 타이머 progress
  </done>
</task>

<task type="auto">
  <name>Task 3: CheckoutQrModal 컴포넌트 — QR SVG + 10분 카운트다운 + 자동 재생성</name>
  <files>src/components/biz/checkout-qr-modal.tsx</files>
  <read_first>
    - src/app/biz/posts/[id]/actions.ts (generateCheckoutQrToken)
    - .planning/phases/04-db/04-CONTEXT.md D-15, D-16
    - .planning/phases/04-db/04-UI-SPEC.md (dialog + progress)
    - node_modules/qrcode/README.md (QRCode.toString API)
  </read_first>
  <action>
  ```typescript
  'use client'
  import { useCallback, useEffect, useRef, useState } from 'react'
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
  import { Progress } from '@/components/ui/progress'
  import { toast } from 'sonner'
  import { generateCheckoutQrToken } from '@/app/biz/posts/[id]/actions'
  import { applicationErrorToKorean } from '@/lib/errors/application-errors'

  type Props = {
    jobId: string
    trigger: React.ReactNode
  }

  const TOKEN_LIFETIME_MS = 10 * 60 * 1000 // 10 minutes
  const REGENERATE_BEFORE_EXPIRY_MS = 10 * 1000 // regenerate 10s before expiry

  export function CheckoutQrModal({ jobId, trigger }: Props) {
    const [open, setOpen] = useState(false)
    const [svg, setSvg] = useState<string | null>(null)
    const [expiresAt, setExpiresAt] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const regenerateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchNewToken = useCallback(async () => {
      setLoading(true)
      const result = await generateCheckoutQrToken(jobId)
      if (!result.success) {
        toast.error(applicationErrorToKorean(result.error as any))
        setLoading(false)
        return
      }
      try {
        const QRCode = await import('qrcode')
        const svgString = await QRCode.toString(result.token, { type: 'svg', width: 280, margin: 2 })
        setSvg(svgString)
        setExpiresAt(new Date(result.expiresAt).getTime())
      } catch (e) {
        console.error('[qr] SVG generation failed', e)
        toast.error('QR 생성에 실패했습니다')
      } finally {
        setLoading(false)
      }
    }, [jobId])

    // On open → fetch; on close → cleanup
    useEffect(() => {
      if (open && !svg) {
        fetchNewToken()
      }
      if (!open) {
        setSvg(null)
        setExpiresAt(null)
        if (regenerateTimer.current) clearTimeout(regenerateTimer.current)
      }
    }, [open, svg, fetchNewToken])

    // Countdown + auto-regenerate
    const [msLeft, setMsLeft] = useState<number>(0)
    useEffect(() => {
      if (!expiresAt) return
      function tick() {
        const remaining = Math.max(0, expiresAt! - Date.now())
        setMsLeft(remaining)
        if (remaining <= REGENERATE_BEFORE_EXPIRY_MS) {
          fetchNewToken()
          return
        }
      }
      tick()
      const interval = setInterval(tick, 1000)
      return () => clearInterval(interval)
    }, [expiresAt, fetchNewToken])

    const minutes = Math.floor(msLeft / 60000)
    const seconds = Math.floor((msLeft % 60000) / 1000)
    const pctLeft = expiresAt ? Math.max(0, (msLeft / TOKEN_LIFETIME_MS) * 100) : 0

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>퇴근 QR 코드</DialogTitle>
            <DialogDescription>
              Worker가 이 QR을 스캔하면 체크아웃이 완료됩니다. 10분마다 자동 갱신됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {loading && !svg && <p className="text-sm text-muted-foreground">QR 생성 중...</p>}
            {svg && (
              <>
                <div
                  aria-label="체크아웃 QR 코드"
                  className="rounded-lg border p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>남은 시간</span>
                    <span className="tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                  </div>
                  <Progress value={pctLeft} />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  ```

  **SVG inject 보안 주의:** `dangerouslySetInnerHTML`로 SVG 삽입은 `qrcode` 라이브러리가 생성한 안전한 SVG에 한해서만 사용. QRCode.toString은 사용자 입력을 그대로 렌더하지 않고 QR 비트맵을 렌더하므로 XSS 위험 없음.

  shadcn dialog 설치 (Plan 08 Task 3에서 설치 안했으면):
  ```
  npx shadcn@latest add dialog
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/components/biz/checkout-qr-modal.tsx && grep -q "generateCheckoutQrToken" src/components/biz/checkout-qr-modal.tsx && grep -q "QRCode.toString" src/components/biz/checkout-qr-modal.tsx && test -f src/components/ui/dialog.tsx && echo OK'</automated>
  </verify>
  <done>
    - CheckoutQrModal 컴포넌트 완성
    - QR SVG + 카운트다운 + 자동 재생성
  </done>
</task>

<task type="auto">
  <name>Task 4: /biz/posts/[id] 페이지 — "퇴근 QR 열기" 버튼 wiring</name>
  <files>src/app/biz/posts/[id]/page.tsx</files>
  <read_first>
    - src/app/biz/posts/[id]/page.tsx (현재 공고 상세 구조)
    - src/components/biz/checkout-qr-modal.tsx (Task 3)
  </read_first>
  <action>
  현재 page.tsx를 읽고 CTA 버튼 영역에 CheckoutQrModal 렌더 삽입. 기존 수정/삭제/지원자 관리 버튼 근처에 추가:

  ```typescript
  import { CheckoutQrModal } from '@/components/biz/checkout-qr-modal'
  // ... 기존 imports

  // JSX:
  <CheckoutQrModal
    jobId={job.id}
    trigger={
      <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
        퇴근 QR 열기
      </button>
    }
  />
  ```

  **중요:** 이 페이지는 이미 server component일 가능성이 높다. CheckoutQrModal은 client component이므로 import해서 JSX에 직접 placement 가능 (Next.js App Router는 server component가 client component를 자식으로 렌더 허용).

  `async params` 패턴도 확인 (Next 16: `params: Promise<{ id: string }>`).

  `mock-data.ts` import가 이 파일에 있으면 제거.
  </action>
  <verify>
    <automated>bash -c 'grep -q "CheckoutQrModal" "src/app/biz/posts/[id]/page.tsx" && ! grep -q "from .*mock-data" "src/app/biz/posts/[id]/page.tsx" && echo OK'</automated>
  </verify>
  <done>
    - CheckoutQrModal wired to page
    - mock-data import 없음
  </done>
</task>

<task type="auto">
  <name>Task 5: mock-data grep 최종 확인 (biz 루트)</name>
  <files>(verification only)</files>
  <read_first>
    - src/app/biz/ (grep 대상)
  </read_first>
  <action>
  ```bash
  grep -rn "from .*mock-data" "src/app/biz/posts" 2>&1
  ```
  결과 0 이어야 한다. 있다면 해당 파일 수정 (타입은 @/lib/types/job, 데이터는 prisma query).
  </action>
  <verify>
    <automated>bash -c 'count=$(grep -rln "from .*mock-data" "src/app/biz/posts" 2>/dev/null | wc -l); if [ "$count" = "0" ]; then echo "OK 0 refs"; else echo "FAIL $count refs"; grep -rln "from .*mock-data" "src/app/biz/posts"; exit 1; fi'</automated>
  </verify>
  <done>
    - biz posts 디렉토리에 mock-data 참조 0
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 6: Biz 화면 수동 검증 checkpoint</name>
  <files>(checkpoint — no files modified)</files>
  <action>See <how-to-verify> below. Checker performs the listed manual steps and responds via <resume-signal>.</action>
  <verify>
    <automated>echo "human verify required — see how-to-verify block"</automated>
  </verify>
  <done>Checker responds with approved / partial / failed per resume-signal contract.</done>
  <what-built>
    - /biz/posts/[id]/applicants Realtime + accept/reject
    - 자동수락 30분 타이머 progress bar
    - /biz/posts/[id]에 "퇴근 QR 열기" 버튼 + 모달
    - 인라인 APPLICANTS 상수 삭제
  </what-built>
  <how-to-verify>
    Dev server 실행 후:

    1. Business 계정 로그인 → `/biz/posts` → 공고 하나 선택 → "지원자 관리"
    2. (준비) Worker 계정으로 다른 브라우저 탭에서 해당 공고에 지원
    3. Biz 탭에 새 지원자 카드가 자동으로 나타남 (Realtime or 60초 이내 router.refresh)
    4. pending 상태 카드에 "자동 수락까지 X분 남음" 타이머 표시 확인 (progress bar 애니메이션)
    5. "수락" (teal) 버튼 클릭 → Worker 탭의 `/my/applications`에서 "수락됨"으로 전환 확인
    6. `/biz/posts/[jobId]` 이동 → "퇴근 QR 열기" 버튼 클릭 → 모달에 QR SVG 표시 + "10:00" 카운트다운 확인
    7. 모달 열어둔 채 1~2분 기다리면 QR 갱신되는지 관찰 (또는 DevTools로 expiresAt을 수동 단축)
    8. "거절" 버튼 클릭 시나리오: 또 다른 지원을 만들어서 거절 → application cancelled + jobs.filled 차감 확인

    Approve:
    - [ ] 1~8 모두 PASS → "approved"
    - [ ] 일부 실패 → 실패 항목 설명
  </how-to-verify>
  <resume-signal>"approved" 또는 이슈 설명</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Biz client → acceptApplication/rejectApplication | Server Action verifies via loadAppAndVerifyOwner |
| QR SVG rendering via dangerouslySetInnerHTML | Source is qrcode library, not user input |
| Realtime subscription filter jobId=eq.X | RLS cross-checks session.id === job.authorId |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-51 | Elevation | Biz accepting another Biz's applications | mitigate | Plan 04 loadAppAndVerifyOwner checks job.authorId === session.id |
| T-04-52 | Info Disclosure | Realtime leaking applications from other jobs | mitigate | RLS applications_select_business (Plan 03) gates dispatch by EXISTS join |
| T-04-53 | XSS via QR SVG | dangerouslySetInnerHTML | mitigate | qrcode library SVG output is a fixed vocabulary (<svg><path d="..." />); no user-controlled strings |
| T-04-54 | Token leak via QR | Biz phones screenshot | accept | 10min expiry + nonce; worst case replay within window = Worker still has to be in check-in state + pass ownership check |
| T-04-55 | Tampering | Biz modifying progress percentage to bypass 30min wait | accept | Progress is UI-only; actual transition uses pg_cron server-side |
| T-04-56 | DoS | Opening/closing QR modal spamming generateCheckoutQrToken | mitigate | Plan 05 Task 7 rate limit 30s in-process |
</threat_model>

<verification>
- `grep -r "mock-data" src/app/biz/posts` → 0 matches
- Manual checkpoint PASS
- Biz + Worker tests still GREEN (regression)
</verification>

<success_criteria>
- [x] /biz applicants 인라인 APPLICANTS 제거
- [x] applicants-client: accept/reject + Realtime + auto-accept progress timer
- [x] /biz/posts/[id] CheckoutQrModal wiring
- [x] mock-data 0 in biz touched dirs
- [x] Checkpoint PASS
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-09-SUMMARY.md` with:
- Biz screens diff
- QR flow sequence
- Known follow-ups for HUMAN-UAT
</output>
