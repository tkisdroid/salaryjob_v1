---
phase: 06-admin-backoffice
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - tests/auth/admin-routing.test.ts
  - tests/business/verify-regnumber.test.ts
  - tests/jobs/create-job-image-gate.test.ts
  - tests/ocr/clova-parser.test.ts
  - tests/settlements/commission-snapshot.test.ts
  - tests/admin/business-list.test.ts
  - tests/fixtures/phase6.ts
autonomous: true
requirements: [D-27, D-28, D-30, D-31, D-32, D-33, D-34, D-36, D-40, D-41, D-42, D-43]
must_haves:
  truths:
    - "6 Wave 0 RED test files exist and fail (or skip) with clear RED signal until implementation lands"
    - "createTestAdmin fixture exists alongside createTestBusiness/createTestWorker"
    - "Each test file maps 1:1 to the Phase 6 decision → test matrix in 06-RESEARCH.md"
    - "verify-regnumber.test.ts contains an integration scenario asserting regNumberOcrMismatched=true is written when OCR returns non-matching candidates (D-33 coverage)"
  artifacts:
    - path: "tests/auth/admin-routing.test.ts"
      provides: "D-27/D-28 routing assertions"
      contains: "getDefaultPathForRole"
    - path: "tests/business/verify-regnumber.test.ts"
      provides: "D-30 regnumber auto-verify behavior + D-33 OCR mismatch integration (regNumberOcrMismatched flag)"
    - path: "tests/jobs/create-job-image-gate.test.ts"
      provides: "D-31 createJob redirect when businessRegImageUrl null"
    - path: "tests/ocr/clova-parser.test.ts"
      provides: "D-32/D-33 OCR happy path + mismatch + timeout paths (pure parser unit)"
    - path: "tests/settlements/commission-snapshot.test.ts"
      provides: "D-34/D-36 checkOut writes commissionRate/commissionAmount/netEarnings"
    - path: "tests/admin/business-list.test.ts"
      provides: "D-40..43 search/filter/sort/pagination"
    - path: "tests/fixtures/phase6.ts"
      provides: "createTestAdmin() + business fixture extensions (regNumber/image/rate)"
  key_links:
    - from: "tests/fixtures/phase6.ts"
      to: "tests/fixtures/index.ts (or Phase 4/5 fixture barrel)"
      via: "re-export"
      pattern: "createTestAdmin"
---

<objective>
Wave 0 RED tests for every Phase 6 decision. Tests MUST fail or skip with a clear MISSING-implementation signal until later waves ship. This freezes behavior contracts before any implementation code is written.

Purpose: Phase 2-5 precedent — every non-trivial Phase wrote its RED tests first. Phase 6 follows the same rhythm. Tests become the executable spec for waves 2-5.
Output: 6 test files + 1 fixture file, all failing initially with test runner reporting clear names.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/06-admin-backoffice/06-CONTEXT.md
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@tests/fixtures
@src/lib/auth/routing.ts
@tests/applications/apply-race.test.ts
</context>

<interfaces>
<!-- Key contracts the executor will assert against. Later waves MUST match these signatures. -->

Routing (to be patched in Wave 3):
```typescript
export function getDefaultPathForRole(role: AppRole | null | undefined): string
// Wave 3 MUST return '/admin' for role === 'ADMIN'

export function canRoleAccessPath(role: AppRole | null | undefined, path: string): boolean
// Wave 3 MUST return true for ('ADMIN', '/admin'), false for ('BUSINESS', '/admin'),
// true for ('ADMIN', '/biz'), true for ('ADMIN', '/home')
```

OCR module (Wave 3, new file `src/lib/ocr/clova.ts`):
```typescript
type ClovaOcrResult =
  | { ok: true; fullText: string; candidateRegNumbers: string[] }
  | { ok: false; reason: 'timeout' | 'api_error' | 'unparseable' }

export async function runBizLicenseOcr(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<ClovaOcrResult>
```

Commission helper (Wave 3, new file `src/lib/commission.ts`):
```typescript
import { Prisma } from '@/generated/prisma/client'
export function getEffectiveCommissionRate(
  businessRate: Prisma.Decimal | null | undefined
): Prisma.Decimal  // falls back to PLATFORM_DEFAULT_COMMISSION_RATE env or '0'

export function computeCommissionSnapshot(gross: number, rate: Prisma.Decimal): {
  rate: Prisma.Decimal
  commissionAmount: number  // rounded to integer krw
  netEarnings: number
}
```

Admin list query (Wave 4, new `src/lib/db/admin-queries.ts`):
```typescript
export async function getBusinessesPaginated(args: {
  q?: string
  field?: 'name' | 'reg' | 'owner' | 'phone'
  verified?: 'all' | 'yes' | 'no'
  sort: 'created_desc' | 'created_asc' | 'rate_desc' | 'rate_asc'
  cursor?: string | null
  limit?: number  // default 20
}): Promise<{ items: BusinessProfileListRow[]; nextCursor: string | null }>
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Test fixtures for admin + business reg number</name>
  <files>tests/fixtures/phase6.ts</files>
  <behavior>
    - `createTestAdmin(overrides?)` inserts a `public.users` row with role='ADMIN' and returns `{ id, email }`. Mirrors `createTestBusiness` shape.
    - `createTestBusinessWithReg({ regNumber, imagePath?, commissionRate? })` inserts a BusinessProfile row with the extended columns populated. Used by D-30/D-31/D-40 tests.
    - `cleanupPhase6Fixtures()` deletes admin + business fixture rows by id suffix pattern.
  </behavior>
  <action>
    Create `tests/fixtures/phase6.ts` exporting:
    - `createTestAdmin(overrides?: { email?: string }): Promise<{ id: string; email: string | null }>` — insert into public.users with role='ADMIN', email defaults to `admin-${randomUUID()}@test.local`.
    - `createTestBusinessWithReg(opts: { userId: string; regNumber?: string | null; businessRegImageUrl?: string | null; commissionRate?: string | null; verified?: boolean; name?: string; ownerName?: string; ownerPhone?: string }): Promise<{ id: string }>` — uses raw SQL INSERT so it works even before the Wave 2 schema push regenerates the Prisma client (the new columns won't exist in Prisma types until Wave 2 runs `prisma generate`).
    - Re-export from existing `tests/fixtures/index.ts` if that barrel exists (grep first).

    Use Prisma `$executeRaw` for the BusinessProfile insert to bypass type mismatches pre-Wave 2. Insert of `public.users` can use prisma.user.create since role='ADMIN' already exists in the UserRole enum.
  </action>
  <verify>
    <automated>npx vitest run tests/fixtures/phase6.ts --run 2>&1 | grep -E "(Test Files|PASS|FAIL)" | head -5</automated>
  </verify>
  <done>File compiles (tsc --noEmit passes for this file). No test assertions inside fixture file — just helpers.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: RED tests — routing + business regnumber + createJob gate + admin list</name>
  <files>tests/auth/admin-routing.test.ts, tests/business/verify-regnumber.test.ts, tests/jobs/create-job-image-gate.test.ts, tests/admin/business-list.test.ts</files>
  <behavior>
    `tests/auth/admin-routing.test.ts` (unit — no DB):
    - `getDefaultPathForRole('ADMIN')` returns `/admin`
    - `canRoleAccessPath('ADMIN', '/admin')` returns true
    - `canRoleAccessPath('BUSINESS', '/admin')` returns false
    - `canRoleAccessPath('WORKER', '/admin')` returns false
    - `canRoleAccessPath('ADMIN', '/biz')` returns true (ADMIN retains cross-access)
    - `canRoleAccessPath('ADMIN', '/home')` returns true

    `tests/business/verify-regnumber.test.ts` (integration — calls Server Action):
    - Valid format `123-45-67890` → BusinessProfile row has `businessRegNumber='1234567890'` (digit-only) AND `verified=true`
    - Invalid format `abc-12-34567` → action returns field error, no DB write, verified stays false
    - Duplicate format-valid regnumber for distinct businesses → both accepted (no uniqueness per D-30)

    `tests/jobs/create-job-image-gate.test.ts` (integration):
    - BusinessProfile with `businessRegImageUrl=null` + valid POST payload → `createJob` returns `{ error: 'verify_required', redirectTo: '/biz/verify' }` (or equivalent sentinel) and inserts ZERO Job rows
    - BusinessProfile with `businessRegImageUrl='some/path.png'` → `createJob` proceeds and inserts 1 Job row
    - The gate checks `businessRegImageUrl IS NOT NULL` explicitly — NOT `verified` (per Pitfall 3)

    `tests/admin/business-list.test.ts` (integration):
    - Seed 5 BusinessProfiles with varying regNumber/ownerPhone/createdAt/commissionRate
    - `getBusinessesPaginated({ sort: 'created_desc' })` → 5 items, newest first
    - `getBusinessesPaginated({ q: 'fixture-name', field: 'name', sort: 'created_desc' })` → ILIKE matches only that name
    - `getBusinessesPaginated({ q: '123-45', field: 'reg', sort: 'created_desc' })` → dashes normalized; matches digit-only storage `1234567890`
    - `getBusinessesPaginated({ verified: 'no', sort: 'created_desc' })` → only verified=false rows
    - `getBusinessesPaginated({ sort: 'rate_desc' })` → nulls last (or first — assert what the impl chooses, but be explicit)
    - Cursor test: first call with `limit: 2` returns `nextCursor`; second call with that cursor returns next 2 distinct items
  </behavior>
  <action>
    Create all four files. Import `describe/it/expect` from 'vitest'. Use `tests/fixtures/phase6.ts` helpers created in Task 1.

    For the routing test: plain unit, no beforeEach DB setup, just import from `@/lib/auth/routing`. This test file WILL turn green the instant Wave 3 patches `routing.ts`.

    For the Server Action tests, follow the pattern in `tests/applications/*.test.ts` — they invoke Server Actions directly via function import with NODE_ENV=test + VITEST=true bypass. Accept that the tests will fail initially with `ReferenceError` or TypeScript missing-export errors — that IS the RED signal. Add `// @ts-expect-error wave-3-not-yet-implemented` comments where type errors are expected so CI passes tsc but vitest still reports the failure at runtime.

    For `business-list.test.ts`, import from `@/lib/db/admin-queries` (file will not exist yet — import will throw). Mark the whole file with `describe.skip` OR use `it.todo` for now with inline contract descriptions. Prefer `describe.skip(..., () => { ... })` so that Wave 4 just flips skip→run.

    NO implementation code in this task — test files only.
  </action>
  <verify>
    <automated>npx vitest run tests/auth/admin-routing.test.ts tests/business/verify-regnumber.test.ts tests/jobs/create-job-image-gate.test.ts tests/admin/business-list.test.ts 2>&1 | tail -20</automated>
  </verify>
  <done>All four files exist. admin-routing.test.ts reports RED (6 failing). Other three report RED or skip with clear messages tying back to waves 3-5.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: RED tests — CLOVA OCR parser + commission snapshot + OCR mismatch integration (D-33)</name>
  <files>tests/ocr/clova-parser.test.ts, tests/settlements/commission-snapshot.test.ts, tests/business/verify-regnumber.test.ts</files>
  <behavior>
    `tests/ocr/clova-parser.test.ts` (unit — mocks global fetch):
    - Happy path: CLOVA returns `{ images: [{ fields: [{ inferText: '123-45-67890' }, { inferText: '홍길동' }] }] }` → `runBizLicenseOcr` returns `{ ok: true, candidateRegNumbers: ['1234567890'] }`
    - Multiple candidates: inferText contains two regnumber-shaped strings → both appear in candidateRegNumbers (digit-only)
    - Mismatch (parser level): inferText has no 10-digit sequence → `{ ok: true, fullText: '...', candidateRegNumbers: [] }` (mismatch is caller's concern — D-33 says "log flag, still save image")
    - Timeout: mock fetch returns a promise that rejects with AbortError → `{ ok: false, reason: 'timeout' }`
    - API error (500): `{ ok: false, reason: 'api_error' }`
    - Missing env vars: `CLOVA_OCR_SECRET` unset → `{ ok: false, reason: 'api_error' }` (no fetch call made)

    `tests/settlements/commission-snapshot.test.ts` (integration):
    - Setup: BusinessProfile with `commissionRate=5.00`, Application at checkIn state with actualHours prepared
    - Invoke checkOut action → Application row has `commissionRate=5.00`, `commissionAmount = round(earnings * 0.05)`, `netEarnings = earnings - commissionAmount`
    - Null rate: BusinessProfile with `commissionRate=null` + env `PLATFORM_DEFAULT_COMMISSION_RATE='10.00'` → commissionAmount = round(earnings * 0.10)
    - Null rate + env unset: commissionAmount = 0, netEarnings = earnings
    - Rounding: earnings=10000 × 5.00% = 500 exact; earnings=10001 × 5.00% = 500.05 → ROUND_HALF_UP → 500
    - Regression: existing Phase 5 `earnings` field remains equal to gross (not net) — `application.earnings === grossEarnings`

    `tests/business/verify-regnumber.test.ts` — EXTEND with D-33 OCR-mismatch integration scenario (appended to the file created in Task 2):
    - Setup: BusinessProfile with `businessRegNumber='1234567890'` (stored), valid auth session for that business user.
    - Mock `runBizLicenseOcr` via `vi.mock('@/lib/ocr/clova', ...)` so it returns `{ ok: true, fullText: 'some scan text', candidateRegNumbers: ['9999999999'] }` (non-matching).
    - Prepare an in-memory `File` (PNG, ~1KB fake bytes) and build a `FormData` with `file` + `businessId`.
    - Invoke `uploadBusinessRegImage(formData)` directly (the Server Action from Plan 06-06). It must return `{ ok: true, ocr: 'mismatched' }`.
    - Assert DB state after the action completes:
      - `businessProfile.regNumberOcrMismatched === true`
      - `businessProfile.businessRegImageUrl !== null` (image was still stored despite the OCR mismatch — D-33 graceful degradation)
      - `businessProfile.verified` is unchanged from its pre-call value (OCR mismatch never flips verified)
    - Additional positive case: mock OCR returns `{ ok: true, candidateRegNumbers: ['1234567890'] }` (matching) → action returns `{ ok: true, ocr: 'matched' }`, `regNumberOcrMismatched === false`, image URL is set.
    - Because this scenario depends on Wave 2 schema (regNumberOcrMismatched column) AND Wave 4 implementation (Plan 06-06 Task 2 Server Action + storage helper), wrap ONLY this integration scenario in a `describe.skip` block tagged `// TODO(wave-4): flip skip→run once Plan 06-06 Task 2 lands`. The D-30 format-validation scenarios above stay RED (not skipped) so Plan 06-06 Task 1 flips them on its own.
  </behavior>
  <action>
    Create both OCR + commission files. For `clova-parser.test.ts` use `vi.stubGlobal('fetch', vi.fn())` and `vi.stubEnv('CLOVA_OCR_API_URL', ...)`. Import `runBizLicenseOcr` from `@/lib/ocr/clova` (file not yet exists — will fail at import; mark with `describe.skip` and leave a TODO-flip note for Wave 3).

    For `commission-snapshot.test.ts` extend the Phase 5 settlement test pattern at `tests/settlements/` — read one existing file first to mirror the setup/teardown. Use `createTestBusinessWithReg` from fixtures. Action file for checkOut is `src/app/(worker)/my/applications/[id]/check-in/actions.ts` (research line 413) — import checkOut directly and invoke.

    Since `commission-snapshot.test.ts` depends on Wave 2 schema (`commissionRate` column on Application) AND Wave 5 implementation, mark with `describe.skip`. Wave 5 will flip to `describe`.

    For the D-33 extension to `tests/business/verify-regnumber.test.ts`:
    - Append a new `describe.skip('D-33 OCR mismatch — image still saved, flag set', ...)` block at the end of the file that was created in Task 2.
    - Inside, use `vi.mock('@/lib/ocr/clova', () => ({ runBizLicenseOcr: vi.fn() }))` and inside each `it` call `vi.mocked(runBizLicenseOcr).mockResolvedValueOnce(...)`.
    - Import the action dynamically: `const { uploadBusinessRegImage } = await import('@/app/biz/verify/actions')` so test collection doesn't fail pre-Wave 4.
    - Use `createTestBusinessWithReg({ regNumber: '1234567890', verified: true })` for setup.
    - After each action invocation, reload the business row via raw SQL (`prisma.$queryRawUnsafe`) since the column may not be in the client types until Wave 2 regen: `SELECT "regNumberOcrMismatched", "businessRegImageUrl", verified FROM public.business_profiles WHERE id = $1`.
    - Assertions use `expect(row.regNumberOcrMismatched).toBe(true)`, `expect(row.businessRegImageUrl).not.toBeNull()`, `expect(row.verified).toBe(true)`.

    Use `Prisma.Decimal` for rate comparisons in commission tests — `expect(row.commissionRate?.toString()).toBe('5')` or `.toNumber()`.

    Keep the two files already created in Task 2 intact — only append the new describe.skip block to `tests/business/verify-regnumber.test.ts`.
  </action>
  <verify>
    <automated>npx vitest run tests/ocr tests/settlements/commission-snapshot.test.ts tests/business/verify-regnumber.test.ts 2>&1 | tail -15</automated>
  </verify>
  <done>
    - `tests/ocr/clova-parser.test.ts` + `tests/settlements/commission-snapshot.test.ts` exist and report skip with visible describe names matching Phase 6 decision IDs.
    - `tests/business/verify-regnumber.test.ts` now contains TWO describe blocks: the D-30 format-validation block from Task 2 (RED, not skipped) AND a D-33 OCR-mismatch integration block (skipped, labeled for Wave 4 flip).
  </done>
</task>

</tasks>

<verification>
After all three tasks:
1. `npx vitest run tests/auth/admin-routing.test.ts` — reports 6 FAIL (routing unchanged)
2. `npx vitest run tests/ocr tests/admin tests/business/verify-regnumber.test.ts tests/jobs/create-job-image-gate.test.ts tests/settlements/commission-snapshot.test.ts` — all report RED or describe.skip consistently
3. `tests/business/verify-regnumber.test.ts` output shows BOTH the D-30 block (RED) and the D-33 OCR-mismatch block (skipped)
4. Phase 5 regression: `npx vitest run tests/settlements` still green (100% pass on existing files)
</verification>

<success_criteria>
- 7 files created, 0 existing files modified
- admin-routing.test.ts is truly RED (will go GREEN the moment Wave 3 patches routing.ts)
- Other test files stand as skips with clear "Waiting for wave N" notes
- D-33 has an explicit automated-test scenario (regNumberOcrMismatched write assertion) in verify-regnumber.test.ts, not only the parser-level coverage in clova-parser.test.ts
- Phase 5 test suite not regressed
</success_criteria>

<output>
After completion, create `.planning/phases/06-admin-backoffice/06-01-SUMMARY.md` documenting:
- List of test files created
- Exact skip → run flip instructions for waves 3-5 (including the D-33 block in verify-regnumber.test.ts which flips at Wave 4 alongside Plan 06-06 Task 2)
- Any deviations from the research test matrix
</output>
