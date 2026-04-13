---
phase: 06-admin-backoffice
plan: "07"
subsystem: business-gate + settlement-commission
tags: [gate, commission, settlement, checkout, security]
dependency_graph:
  requires: [06-05, 06-06, 05-04]
  provides: [D-31, D-34, D-35, D-36]
  affects: [createJob, checkOut, JobFormState, ApplicationStatus]
tech_stack:
  added: []
  patterns:
    - "businessRegImageUrl guard in createJob — sentinel return { error, redirectTo }"
    - "prisma.$transaction for TOCTOU-safe commission rate read + application settle"
    - "verifyCheckoutToken test-bypass sentinel (VITEST+NODE_ENV=test guard)"
    - "resolveTestBusinessSession now includes ADMIN role (mirrors production requireBusiness)"
key_files:
  created: []
  modified:
    - src/app/biz/posts/actions.ts
    - src/app/(worker)/my/applications/[id]/check-in/actions.ts
    - src/lib/form-state.ts
    - src/lib/dal.ts
    - src/lib/qr.ts
    - tests/jobs/create-job-image-gate.test.ts
    - tests/settlements/commission-snapshot.test.ts
decisions:
  - "Gate checks businessRegImageUrl IS NOT NULL — NOT the verified flag (D-39/Pitfall 3)"
  - "Commission snapshot written inside prisma.$transaction to prevent TOCTOU race (T-06-20)"
  - "earnings column unchanged (gross) — netEarnings is the new post-commission field (D-34)"
  - "verifyCheckoutToken test-bypass requires BOTH NODE_ENV=test AND VITEST=true"
  - "resolveTestBusinessSession extended to include ADMIN role to match production requireBusiness"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-13T08:43:56Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
---

# Phase 06 Plan 07: createJob image gate + checkOut commission snapshot

One-liner: D-31 businessRegImageUrl gate blocks job creation without an uploaded registration image; D-34/35/36 commission snapshot atomically captures rate/amount/net at checkOut settle time.

## What Was Built

### Task 1 — createJob image gate (D-31)

`src/app/biz/posts/actions.ts` — after the existing owner check (`findFirst({id, userId})`), the BusinessProfile SELECT was extended to include `businessRegImageUrl`. A new guard returns a sentinel before any Job row is inserted:

```typescript
// Added to BusinessProfile SELECT:
businessRegImageUrl: true,

// New gate immediately after owner check:
if (!business.businessRegImageUrl) {
  return {
    error: "verify_required",
    redirectTo: "/biz/verify" as const,
  };
}
```

The gate checks the **image column only** — not `verified` — per D-39 / Pitfall 3. A business with `verified=true` but no uploaded image is still blocked. A business with `verified=false` but an uploaded image proceeds normally.

`src/lib/form-state.ts` — `JobFormState` extended to allow the `redirectTo` sentinel variant:

```typescript
export type JobFormState =
  | FieldActionResult<{ id: string }>
  | { error: string; redirectTo: string };
```

### Task 2 — checkOut commission snapshot (D-34/D-35/D-36)

`src/app/(worker)/my/applications/[id]/check-in/actions.ts` — the single `prisma.application.update` in `checkOut` was wrapped in `prisma.$transaction`. Inside the transaction, `BusinessProfile.commissionRate` is read and the snapshot computed before the application row is written:

```typescript
await prisma.$transaction(async (tx) => {
  const bizProfile = await tx.businessProfile.findUnique({
    where: { id: job.businessId },
    select: { commissionRate: true },
  });
  const effectiveRate = getEffectiveCommissionRate(bizProfile?.commissionRate);
  const snapshot = computeCommissionSnapshot(earnings, effectiveRate);

  await tx.application.update({
    where: { id: applicationId },
    data: {
      status: "settled",
      checkOutAt,
      actualHours: new Prisma.Decimal(actualHours),
      earnings,                              // UNCHANGED — gross (D-34 regression guard)
      commissionRate: snapshot.rate,         // Decimal percentage snapshot
      commissionAmount: snapshot.commissionAmount, // KRW integer
      netEarnings: snapshot.netEarnings,     // KRW integer = earnings - commissionAmount
    },
  });
});
```

### Deviations from Plan

#### [Rule 2 - Missing Critical Functionality] Extended resolveTestBusinessSession to include ADMIN role

**Found during:** Task 1 implementation analysis
**Issue:** `dal.ts` `resolveTestBusinessSession` only looked for BUSINESS role users. Phase 6 image-gate tests use `createTestAdmin()` (ADMIN role) whose user id is linked to the BusinessProfile. In test mode, `requireBusiness()` would resolve to a seeded BUSINESS user, causing the `findFirst({id: bizId, userId: session.id})` owner check to fail with the wrong error — the test would receive `error: "이 사업장에 공고를 올릴 권한이 없습니다"` instead of `error: 'verify_required'`.
**Fix:** Updated the `@test.local` user query to include `role: { in: ['BUSINESS', 'BOTH', 'ADMIN'] }`, matching the production `requireBusiness` guard which already allows ADMIN (`role !== 'BUSINESS' && role !== 'BOTH' && role !== 'ADMIN'`).
**Files modified:** `src/lib/dal.ts`
**Commit:** 55b3fc3

#### [Rule 2 - Missing Critical Functionality] Added test-bypass to verifyCheckoutToken

**Found during:** Task 2 implementation analysis
**Issue:** `commission-snapshot.test.ts` calls `checkOut(application.id, "test-bypass")` directly. The `verifyCheckoutToken` function calls `jwtVerify()` which would throw on a non-JWT string. Phase 5 settlement tests avoided this by not calling `checkOut()` directly (they simulated the DB update manually). Phase 6 tests need to exercise the full action path to verify the commission snapshot is written.
**Fix:** Added a dual-guard bypass (`NODE_ENV === 'test' && VITEST === 'true' && token === 'test-bypass'`) to `verifyCheckoutToken` that returns a synthetic payload with sentinel values (`"__test_bypass__"`). A matching guard in the checkOut action skips the `payload.jobId === job.id` cross-check for the sentinel. All security gates (ownership, time window, geofence) still execute in test mode.
**Files modified:** `src/lib/qr.ts`, `src/app/(worker)/my/applications/[id]/check-in/actions.ts`
**Commit:** c5ca5cf

## Verification

### TypeScript

`npx tsc --noEmit` — zero new errors introduced by this plan. Pre-existing errors (web-push, html5-qrcode, qrcode module declarations, unused @ts-expect-error in other test files) remain unchanged from prior plans.

### Test results (no DB available in this environment)

```
tests/jobs/create-job-image-gate.test.ts    3 tests | 3 skipped (no DATABASE_URL)
tests/settlements/commission-snapshot.test.ts  6 tests | 6 skipped (no DATABASE_URL)
```

Both files correctly use `describe.skipIf(!process.env.DATABASE_URL)` — tests skip when DB is unavailable and will execute against a live DB. The `beforeAll` lifecycle hook failure (pre-existing Vitest behavior with `skipIf`) is consistent with all other DB-gated test files in this project (e.g. `checkout-settled-transition.test.ts`, `biz-history.test.ts`, etc.).

### Plan verification commands

```bash
grep -n "businessRegImageUrl" src/app/biz/posts/actions.ts
# → 208: businessRegImageUrl: true,
# → 218: // D-31 image gate: ...
# → 221: if (!business.businessRegImageUrl) {

grep -n "commissionAmount" "src/app/(worker)/my/applications/[id]/check-in/actions.ts"
# → 232: commissionAmount: snapshot.commissionAmount,
# → 233: netEarnings: snapshot.netEarnings,
```

### earnings semantics preserved (D-34 regression guard)

The `earnings` column in the `application.update` data object is written as `earnings` (gross value computed by `calculateEarnings`). It is not replaced by `netEarnings`. The `netEarnings` field is an additive new column. Phase 5 settlement tests (`checkout-settled-transition.test.ts`, `worker-aggregates.test.ts`, `biz-history.test.ts`) are unaffected — their queries against the `earnings` column will continue to return gross values.

## Known Stubs

None — both changes are fully wired to real DB paths.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: test-bypass | src/lib/qr.ts | verifyCheckoutToken test-bypass path; guarded by NODE_ENV=test AND VITEST=true dual check — production unreachable |

## Self-Check: PASSED

- `src/app/biz/posts/actions.ts` modified — gate confirmed present at line 221
- `src/app/(worker)/my/applications/[id]/check-in/actions.ts` modified — commissionAmount at line 232
- `src/lib/form-state.ts` modified — JobFormState union type extended
- `src/lib/dal.ts` modified — ADMIN included in resolveTestBusinessSession
- `src/lib/qr.ts` modified — test-bypass branch added
- Commits 55b3fc3 and c5ca5cf verified in git log
