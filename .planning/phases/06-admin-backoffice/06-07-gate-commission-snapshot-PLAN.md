---
phase: 06-admin-backoffice
plan: 07
type: execute
wave: 5
depends_on: [05, 06]
files_modified:
  - src/app/biz/posts/actions.ts
  - src/app/(worker)/my/applications/[id]/check-in/actions.ts
autonomous: true
requirements: [D-31, D-34, D-35, D-36]
must_haves:
  truths:
    - "createJob refuses to create a Job row when the business's businessRegImageUrl IS NULL and returns a redirect sentinel to /biz/verify"
    - "createJob proceeds normally when businessRegImageUrl IS NOT NULL"
    - "checkOut writes commissionRate/commissionAmount/netEarnings to Application on settle"
    - "Existing earnings column continues to hold GROSS earnings — Phase 5 settlement tests stay green"
    - "Null BusinessProfile.commissionRate uses PLATFORM_DEFAULT_COMMISSION_RATE env (or 0 if unset)"
    - "tests/jobs/create-job-image-gate.test.ts + tests/settlements/commission-snapshot.test.ts GREEN"
    - "All Phase 5 settlement tests remain GREEN (zero regression)"
  artifacts:
    - path: "src/app/biz/posts/actions.ts"
      provides: "createJob image gate insertion"
    - path: "src/app/(worker)/my/applications/[id]/check-in/actions.ts"
      provides: "checkOut commission snapshot insertion inside existing $transaction"
  key_links:
    - from: "src/app/biz/posts/actions.ts"
      to: "src/app/biz/verify/page.tsx"
      via: "redirect sentinel {error:'verify_required', redirectTo:'/biz/verify'}"
      pattern: "businessRegImageUrl"
    - from: "src/app/(worker)/my/applications/[id]/check-in/actions.ts"
      to: "src/lib/commission.ts"
      via: "getEffectiveCommissionRate + computeCommissionSnapshot inside prisma.$transaction"
      pattern: "computeCommissionSnapshot\\("
---

<objective>
The two most delicate edits of Phase 6: (1) add a regImage gate to createJob, (2) insert commission snapshot into the battle-tested Phase 5 checkOut transaction. Both changes touch hot paths. Both must ship with rollback safety and zero regression.

Purpose: Delivers D-31 (gate) and D-34/D-35/D-36 (snapshot). Last implementation wave — Plan 08 is purely verification.
Output: 2 files patched. 2 Wave-0 tests flip RED→GREEN. Phase 5 test suite unchanged.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@src/app/biz/posts/actions.ts
@src/app/(worker)/my/applications/[id]/check-in/actions.ts
@src/lib/commission.ts
@tests/jobs/create-job-image-gate.test.ts
@tests/settlements/commission-snapshot.test.ts
@.planning/phases/05-reviews-settlements/05-04-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: createJob image gate (D-31)</name>
  <files>src/app/biz/posts/actions.ts</files>
  <behavior>
    Covered by `tests/jobs/create-job-image-gate.test.ts`:
    - BusinessProfile.businessRegImageUrl=null → action returns `{ ok:false, error:'verify_required', redirectTo:'/biz/verify' }` and inserts 0 rows
    - BusinessProfile.businessRegImageUrl='path/x.png' → action proceeds and inserts a Job row
    - Gate explicitly checks image column, NOT the `verified` flag (Pitfall 3)
  </behavior>
  <action>
    1. Open `src/app/biz/posts/actions.ts`. Find `createJob` (or equivalent). The insertion point is AFTER `requireBusiness()` and AFTER loading the BusinessProfile row (createJob already loads it to set `businessId`). Grep for the existing `BusinessProfile` / `business_profile` read.

    2. Extend the existing SELECT to include `businessRegImageUrl`:
       ```typescript
       const business = await prisma.businessProfile.findFirst({
         where: { id: businessId, userId: session.id },
         select: { id: true, businessRegImageUrl: true /* plus existing fields */ },
       })
       if (!business) return { error: 'business_not_found' }
       if (!business.businessRegImageUrl) {
         return { error: 'verify_required', redirectTo: '/biz/verify' as const }
       }
       // ... proceed with existing job create logic
       ```

    3. Update the call-site UI (the form/page that invokes createJob — grep usage). If the call site already handles `{error: string}` returns with a toast, extend it to check `redirectTo` and call `router.push(redirectTo)` when present. If the existing pattern is server-action + redirect, use `redirect('/biz/verify')` inside the action instead of returning the sentinel (both work — match whatever exists). **Prefer the sentinel return** to keep the gate testable (tests/jobs/create-job-image-gate.test.ts asserts on returned shape, not redirect exception).

    4. Flip `tests/jobs/create-job-image-gate.test.ts` from skip to run.
  </action>
  <verify>
    <automated>npx vitest run tests/jobs/create-job-image-gate.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>
    - create-job-image-gate.test.ts GREEN
    - Manual: biz user with no uploaded image clicks "공고 등록" → redirected to /biz/verify
    - Manual: biz user after upload → createJob succeeds
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: checkOut commission snapshot (D-34/D-35/D-36)</name>
  <files>src/app/(worker)/my/applications/[id]/check-in/actions.ts</files>
  <behavior>
    Covered by `tests/settlements/commission-snapshot.test.ts`:
    - rate=5.00 + earnings=10000 → commissionRate=5.00, commissionAmount=500, netEarnings=9500
    - rate=null + env='10.00' → commissionAmount=earnings*0.10 rounded
    - rate=null + env unset → commissionAmount=0, netEarnings=earnings
    - Existing `earnings` column STILL equals gross (Phase 5 contract)
    - All Phase 5 settlement tests remain green
  </behavior>
  <action>
    1. Open `src/app/(worker)/my/applications/[id]/check-in/actions.ts`. Locate the `checkOut` Server Action — it's the one that flips `status` to `'settled'` and writes `earnings` + `actualHours`. Research cites around line 209-217.

    2. Inside the existing `prisma.$transaction` block (do NOT break the transaction boundary), add BEFORE the `application.update({ ... status: 'settled' ... })`:

       ```typescript
       import { getEffectiveCommissionRate, computeCommissionSnapshot } from '@/lib/commission'

       // ... existing earnings calc ...
       const gross = earnings  // int, already computed

       // Phase 6 D-34: commission snapshot at settle time
       const business = await tx.businessProfile.findUnique({
         where: { id: job.businessId },
         select: { commissionRate: true },
       })
       const effectiveRate = getEffectiveCommissionRate(business?.commissionRate)
       const snapshot = computeCommissionSnapshot(gross, effectiveRate)
       ```

    3. Extend the `application.update(... data: {...})` data object with three new fields:
       ```typescript
       data: {
         status: 'settled',
         checkOutAt,
         actualHours: new Prisma.Decimal(actualHours),
         earnings,  // UNCHANGED — gross stays here per Phase 5
         commissionRate:   snapshot.rate,            // Decimal
         commissionAmount: snapshot.commissionAmount, // Int
         netEarnings:      snapshot.netEarnings,      // Int
       }
       ```

    4. Flip `tests/settlements/commission-snapshot.test.ts` from skip to run.

    5. Run full Phase 5 settlement suite: `npx vitest run tests/settlements tests/reviews` — assert zero regressions.

    6. Do NOT change any code path outside the single update call. Do NOT rename `earnings`. Do NOT change how `actualHours` is computed. The scope is additive only.
  </action>
  <verify>
    <automated>npx vitest run tests/settlements tests/reviews 2>&1 | tail -20</automated>
  </verify>
  <done>
    - commission-snapshot.test.ts GREEN
    - All Phase 5 settlement/review tests GREEN (regression check)
    - Manual: an existing settled Application has all three new columns populated
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Worker checkOut → Application update | Untrusted client timing; server computes from DB checkInAt + now() |
| BusinessProfile.commissionRate → settlement | Admin-controlled; read inside atomic $transaction to prevent TOCTOU |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-20 | Tampering | commission rate read outside transaction | mitigate | findUnique inside `tx` (the Prisma transaction client) — a mid-settle rate update cannot race this write |
| T-06-21 | Elevation | Worker bypassing image gate via direct Server Action | mitigate | createJob runs `requireBusiness()` + `findFirst({id, userId})` — worker role can't reach it at all |
| T-06-22 | Denial of Service | checkOut regression breaks mock-removed Phase 5 | mitigate | Additive-only edit; Phase 5 test suite is the regression canary (Task 2 verify step) |
</threat_model>

<verification>
- `npx vitest run tests/jobs tests/settlements tests/reviews` — all green
- `npx vitest run` (full) — no new failures beyond pre-existing deferred e2e specs documented in STATE.md
- `grep -n "businessRegImageUrl" src/app/biz/posts/actions.ts` returns the gate line
- `grep -n "commissionAmount" src/app/(worker)/my/applications/[id]/check-in/actions.ts` returns the new data field
</verification>

<success_criteria>
- 2 Wave-0 tests flip GREEN
- Phase 5 settlement tests untouched
- createJob gates on image only (not verified flag)
- Commission snapshot uses Prisma.Decimal throughout with ROUND_HALF_UP
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-07-SUMMARY.md` — document:
- Exact diff of both files (fenced code blocks)
- Regression suite output (full green confirmation)
- Confirmation that `earnings` semantics preserved (still gross)
</output>
