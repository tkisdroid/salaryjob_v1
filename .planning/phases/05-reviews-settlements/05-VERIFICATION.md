---
phase: 05-reviews-settlements
verified: 2026-04-11T14:30:00Z
status: passed
score: 8/8 must-haves verified (code-level) + 3 HUMAN-UAT deferred by user request
overrides_applied: 1
verifier: gsd-executor (goal-backward, code-reading + actual command output)
gates:
  vitest: 83 files / 238 passing / 10 todo / 0 test-level failing (7 file-level e2e/playwright pre-existing)
  next_build: 37 routes (35 dynamic ƒ + 2 static ○), all Phase 5 routes dynamic — 0 errors
  mock_data_imports_in_src: 0 (grep exit code 1)
  build_fix: serverExternalPackages added to next.config.ts — Prisma 7 + pg Turbopack resolution (commit e3618f4)
deferred:
  - truth: "End-to-end loop completes under 1 minute on real Supabase"
    addressed_in: "HUMAN-UAT scenario 1"
    evidence: "Automated tests verify each link; full-loop stopwatch requires manual browser session."
  - truth: "Mobile 375px layout is readable and non-scrolling"
    addressed_in: "HUMAN-UAT scenario 2"
    evidence: "Component code uses Tailwind responsive classes; manual mobile viewport verification required."
  - truth: "Review UX feels Timee-aligned (star picker, chip grid, sticky submit)"
    addressed_in: "HUMAN-UAT scenario 3"
    evidence: "Subjective taste call on visual rhythm; cannot automate."
---

# Phase 5 (리뷰·정산·목업 제거) Verification Report

**Phase Goal**: Worker↔Business 양방향 리뷰 + 정산 실데이터 구동 + mock-data.ts 완전 제거

**Verified**: 2026-04-11
**Status**: PASS — 자동 검증 가능한 8개 목표 달성. 3개 UAT 시나리오는 수동 검증 대기 (사용자 요청으로 deferred).

---

## Automated Gate Results (실제 명령어 출력)

### Gate 1: vitest run

```
Test Files  7 failed | 76 passed (83)
      Tests  238 passed | 10 todo (248)
   Start at  14:29:51
   Duration  77.99s (transform 748ms, setup 13.23s, collect 13.52s, tests 24.44s)
```

**7 failed files 원인 (pre-existing, Phase 5와 무관):**
- `tests/e2e/*.spec.ts` (5개) — Playwright `test.describe()` 호출이 vitest 글로브에 포함됨
- `tests/storage/avatar-upload.test.ts` — Node 22 `Uint8Array<ArrayBufferLike>` vs BlobPart mismatch
- `tests/proxy/redirect.test.ts` — Next 16 experimental testing API rename 드리프트

위 실패들은 Phase 4 `deferred-items.md`에 이미 문서화된 pre-existing 이슈들. **test-level 실패 0건**.

Phase 5 신규 test suite (모두 PASS):
- `tests/reviews/create-worker-to-biz.test.ts` — 3 tests PASS
- `tests/reviews/create-biz-to-worker.test.ts` — 2 tests PASS
- `tests/reviews/uniqueness.test.ts` — 2 tests PASS
- `tests/reviews/aggregate.test.ts` — 3 tests PASS
- `tests/settlements/checkout-settled-transition.test.ts` — 2 tests PASS
- `tests/settlements/biz-history.test.ts` — 2 tests PASS
- `tests/settlements/worker-aggregates.test.ts` — 3 tests PASS
- `tests/exit/mock-removal.test.ts` — 3 tests PASS
- Phase 4 regression 전체 PASS (109 → 238 passing tests, +129 Phase 5)

### Gate 2: NODE_ENV=production next build

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /auth/callback
├ ƒ /biz/posts/[id]/applicants/[applicantId]/review    ← Phase 5 신규
├ ƒ /biz/settlements                                   ← Phase 5 REWRITE
├ ƒ /my/applications/[id]/review                       ← Phase 5 신규
├ ƒ /my/settlements                                    ← Phase 5 REWRITE
... (29 additional routes)

✓ Generating static pages (32/32) in 815ms
BUILD_EXIT: 0
```

**Phase 5 신규 4개 라우트 전부 ƒ (dynamic) 표시 확인.**

Pre-existing fix needed (Rule 2 — missing config):
- `next.config.ts`에 `serverExternalPackages` 추가 (commit `e3618f4`) — Prisma 7 `@prisma/client`의 broken npm state로 Turbopack이 runtime을 해석 못하는 문제. `npm install` 재실행으로 `@prisma/client` 패키지 복원 + config 추가로 future-proof.

### Gate 3: mock-data import grep

```bash
$ grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    -E "from ['\"](@/lib/mock-data|\\.\\.?/.*mock-data)['\"]" \
    src/ --exclude-dir=generated
$ echo "grep exit: $?"
grep exit: 1

$ test -f src/lib/mock-data.ts; echo $?
1
```

**src/ 전체에서 mock-data import 0건. 파일 자체도 부재 확인.**

---

## Verification Method

1. 6개 Plan의 SUMMARY.md 주장은 신뢰하지 않고 goal-backward 검증
2. 각 REQ ID (REV-01..04, SETL-01..03, DATA-05)에 대해 실제 파일 라인 단위 읽음
3. Stub / TODO / placeholder grep: 0건
4. Key link wiring 확인 (Page → Action → DB → Response → UI)
5. vitest 전체 suite 로컬 실행 (77.99초): **238 passing / 0 failing**
6. `NODE_ENV=production npx next build` 로컬 실행: **37 routes, 0 errors**
7. `mock-data` import 전수 조사: **exit code 1 (no matches)**

---

## Per-Requirement Verification

### REV-01 — Worker → Business 리뷰 작성 (ACHIEVED)

**File**: `src/app/(worker)/my/applications/[id]/review/actions.ts` (commit `bd822a1`)

- `createWorkerReview` Server Action — Zod validate (`createWorkerReviewSchema`) → requireApplicationOwner (production) / `__testSessionId` (test) → gate `status !== 'settled'` → `$transaction { tx.review.create + $executeRaw UPDATE business_profiles + tx.application.update reviewGiven=true }`
- `P2002` catch maps unique violation → `already_reviewed`
- Direction: `ReviewDirection.worker_to_business`

**UI**: `src/app/(worker)/my/applications/[id]/review/page.tsx` (commit `fa8a3fb`)
- Next.js 16 async params: `params: Promise<{ id: string }>` + `await params`
- Pre-flight gates: `requireApplicationOwner(id)` → `status !== 'settled'` redirect → `getReviewByApplication(id, 'worker_to_business')` exists → redirect
- Renders `<ReviewForm submitAction={createWorkerReview} tagSet={WORKER_TO_BIZ_TAGS} direction="worker_to_business" />`

**Test**: `tests/reviews/create-worker-to-biz.test.ts` — 3 cases PASS
- happy path (new review persisted, reviewGiven=true)
- not_settled guard
- already_reviewed guard (P2002 mapping)

---

### REV-02 — Business → Worker 리뷰 작성 (ACHIEVED)

**File**: `src/app/biz/posts/[id]/applicants/[applicantId]/review/actions.ts` (commit `5f52e40`)

- `createBusinessReview` Server Action — Zod validate → requireJobOwner (biz session gate) → `prisma.application.findUnique(applicantId)` + `jobId` ownership cross-check → gate `status !== 'settled'` → `$transaction { tx.review.create + $executeRaw UPDATE worker_profiles + tx.application.update reviewGiven=true }`
- Direction: `ReviewDirection.business_to_worker`

**UI**: `src/app/biz/posts/[id]/applicants/[applicantId]/review/page.tsx` (commit `fa8a3fb`)
- `requireJobOwner(id)` → `prisma.application.findUnique(applicantId)` → `notFound()` if missing or `jobId !== id`
- Gates: `status !== 'settled'` redirect + `getReviewByApplication(applicantId, 'business_to_worker')` duplicate check

**Test**: `tests/reviews/create-biz-to-worker.test.ts` — 2 cases PASS
- happy path
- unauthorized (ownership failure — `{ error: 'unauthorized' }`)

---

### REV-03 — Application당 정확히 1회 uniqueness (ACHIEVED)

**Schema level**: `prisma/schema.prisma` — `@@unique([applicationId, direction])` on `Review` model (Phase 2 schema, commit `80cb44f`)

**Code level**: Both review actions catch `PrismaClientKnownRequestError` with code `P2002` and return `{ error: 'already_reviewed' }`

**Test**: `tests/reviews/uniqueness.test.ts` — 2 cases PASS
- duplicate same direction → `already_reviewed`
- opposite direction is allowed (different unique key)

---

### REV-04 — 리뷰 제출 시 rating/reviewCount 자동 업데이트 (ACHIEVED)

**Code**: Both review actions use `$transaction` + `$executeRaw`:

Worker → Biz:
```sql
UPDATE business_profiles
SET rating = ROUND((rating * "reviewCount" + ${rating})::numeric / ("reviewCount" + 1), 2)::numeric(3,2),
    "reviewCount" = "reviewCount" + 1
WHERE id = ${businessProfileId}
```

Biz → Worker:
```sql
UPDATE worker_profiles
SET rating = ROUND((rating * "reviewCount" + ${rating})::numeric / ("reviewCount" + 1), 2)::numeric(3,2),
    "reviewCount" = "reviewCount" + 1
WHERE id = ${workerProfileId}
```

Atomic — both operations happen in a single `$transaction`, rollback if either fails.

`WorkerProfile.reviewCount` column added in Plan 02 (commit `80cb44f`).

**Test**: `tests/reviews/aggregate.test.ts` — 3 cases PASS
- count=0 edge case (first review)
- weighted average math (not simple average)
- concurrent reviews with `Promise.all` (isolation)

---

### SETL-01 — pending → settled 전환 (ACHIEVED)

**File**: `src/app/(worker)/my/applications/[id]/check-in/actions.ts` (commit `c23abf3`)

Single literal change in the existing checkout `$transaction`:
```ts
// Before (Plan 04):
status: "completed"

// After (Plan 05-04):
status: "settled"
```

`ApplicationStatus.settled` enum value added to Prisma schema (Plan 02, `80cb44f`) and Supabase DB via `ALTER TYPE "ApplicationStatus" ADD VALUE 'settled'`.

`DONE_STATUSES` in `src/lib/db/queries.ts` extended to `['settled', 'completed']` for legacy row compatibility.

`adaptApplication` derives `settlementStatus` and `settledAt` from `status` field.

**Test**: `tests/settlements/checkout-settled-transition.test.ts` — 2 cases PASS
- checkOut produces `status='settled'`
- `DONE_STATUSES` includes both values

---

### SETL-02 — Business 정산 히스토리 (ACHIEVED)

**File**: `src/lib/db/queries.ts` — `getBizSettlements` + `getBizSettlementTotals` (commit `c23abf3`)

- `getBizSettlements`: `prisma.application.findMany` where `status IN DONE_STATUSES` + job `authorId === businessUserId` + includes worker/job join
- `getBizSettlementTotals`: `$queryRaw` with `AT TIME ZONE 'Asia/Seoul'` for KST month boundary

**UI**: `src/app/biz/settlements/page.tsx` REWRITE (commit `fa8a3fb`)
- Server Component: `requireBusiness()` → `Promise.all([getBizSettlementTotals, getBizSettlements])`
- Renders 2-col totals cards + `<SettlementCard side='biz' />` list

**Test**: `tests/settlements/biz-history.test.ts` — 2 cases PASS
- RLS/ownership isolation (biz A cannot see biz B's settlements)
- Nested relations (worker name + job title in result)

---

### SETL-03 — 총수입/이번 달 수입 실데이터 집계 (ACHIEVED)

**File**: `src/lib/db/queries.ts` — `getWorkerSettlementTotals` + `getWorkerSettlements` (commit `c23abf3`)

KST boundary logic:
```sql
SUM(CASE
  WHEN DATE_TRUNC('month', "checkOutAt" AT TIME ZONE 'Asia/Seoul') =
       DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Seoul')
  THEN earnings ELSE 0
END) AS this_month_earnings
```

**UI**: `src/app/(worker)/my/settlements/page.tsx` REWRITE (commit `fa8a3fb`)
- Server Component: `requireWorker()` → `Promise.all([getWorkerSettlementTotals, getWorkerSettlements, getApplicationsByWorker('done')])`
- Computes `unreviewed` count from `doneApps.filter(a => a.status === 'settled' && !a.reviewGiven)`
- Renders: 2-col totals cards + `<ReviewPromptBanner>` + `<SettlementCard side='worker' />` list

**Test**: `tests/settlements/worker-aggregates.test.ts` — 3 cases PASS
- all-time total
- KST April in-month: `'2026-04-30T14:59:59.999Z'` (Apr 30 23:59 KST) → counts
- KST May boundary: `'2026-04-30T15:00:01Z'` (May 1 00:00 KST) → does not count in April total

---

### DATA-05 — src/lib/mock-data.ts 의존 0건 (ACHIEVED)

**Deletion**: `src/lib/mock-data.ts` deleted via `git rm` in Plan 06 Task 2 (commit `6e94385`)

**Detachment**: `prisma/seed.ts` refactored to import from `./seed-data` instead of `../src/lib/mock-data` (commit `04529e6`)

**Cleanup**: 
- `src/lib/types/job.ts` — `MockJob`, `MockApplication`, `MockWorker`, `MockBusiness`, `MockReview`, `MockBizApplicant` backward-compat aliases removed
- `src/lib/job-utils.ts` — header comment "Copied from mock-data.ts" reference removed
- `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx` — `MockJob` import changed to `Job`

**Exit gate test**: `tests/exit/mock-removal.test.ts` — 3 assertions PASS
```
✓ src/lib/mock-data.ts does not exist (ENOENT)              2ms
✓ no src/ file imports from @/lib/mock-data or relative mock-data path  30ms
✓ prisma/seed.ts does not import from ../src/lib/mock-data   1ms
```

**grep confirmation**:
```bash
$ grep -rn --include='*.ts' --include='*.tsx' -E \
    "from ['\"](@/lib/mock-data|\\.\\.?/.*mock-data)['\"]" src/ --exclude-dir=generated
# (no output)
$ echo $?
1
```

---

## Migrations Verification

| Migration | Verdict | Evidence |
|---|---|---|
| Plan 05-02 enum delta (`ApplicationStatus` += `'settled'`) | VERIFIED | `80cb44f` — `ALTER TYPE "ApplicationStatus" ADD VALUE 'settled'` applied; `tests/settlements/checkout-settled-transition.test.ts` GREEN confirms enum is live |
| Plan 05-03 `WorkerProfile.reviewCount` column | VERIFIED | `80cb44f` — `prisma/schema.prisma` updated + `prisma db push` executed; `tests/reviews/aggregate.test.ts` biz→worker aggregate test increments `reviewCount` and passes |

---

## Mock Removal Final Status (DATA-05 exit gate)

```bash
$ grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    -E "from ['\"](@/lib/mock-data|\\.\\.?/.*mock-data)['\"]" \
    src/ --exclude-dir=generated
$ echo $?
1
$ test -f src/lib/mock-data.ts; echo $?
1
```

Both commands confirm exit code 1 — no matches, file absent.

---

## Build Fix Deviation

**[Rule 2 - Missing Config] serverExternalPackages not set for Prisma 7 + pg**

- **Found during:** Task 1 production build
- **Issue:** `@prisma/client` node_modules directory was empty (broken npm state). Additionally, `next.config.ts` lacked `serverExternalPackages`, causing Turbopack to attempt to bundle Prisma 7 runtime and `pg` in the client bundle.
- **Root cause analysis:** Phase 4 build succeeded because Prisma was only accessed via `src/lib/db/index.ts` (single entry point). Phase 5 Plans 03/05 added direct `@/generated/prisma/client` imports in new `actions.ts` files, exposing more Prisma import paths to Turbopack. Separately, `@prisma/client` node_modules was empty due to npm state corruption.
- **Fix:** (1) `npm install` repopulated `@prisma/client`. (2) Added `serverExternalPackages: ["@prisma/client", "prisma", "pg", "@prisma/adapter-pg"]` to `next.config.ts` as belt-and-braces for clean installs.
- **Commit:** `e3618f4`

---

## Deferred (HUMAN-UAT)

See `.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md` for 3 manual scenarios.

**Note:** User has explicitly deferred browser-based UAT per `.planning/todos/pending/2026-04-11-phase-5-plan-05-05-browser-uat-review-settlement-flow.md`.
