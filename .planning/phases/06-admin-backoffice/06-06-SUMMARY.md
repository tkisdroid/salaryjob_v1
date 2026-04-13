---
phase: 06-admin-backoffice
plan: "06"
subsystem: biz-verify-ocr
tags: [validation, ocr, business-profile, server-action, form]
dependency_graph:
  requires: [06-02, 06-04]
  provides: [regNumber-auto-verify, biz-verify-upload, ocr-mismatch-flag]
  affects: [admin-console-06-05, biz-profile-form, biz-verify-page]
tech_stack:
  added: []
  patterns: [zod-validation, server-action-void-wrapper, graceful-ocr-degradation]
key_files:
  created:
    - src/lib/validations/business.ts
    - src/app/biz/signup/actions.ts
    - src/app/biz/verify/actions.ts
  modified:
    - src/app/biz/profile/actions.ts
    - src/app/biz/profile/biz-profile-edit-form.tsx
    - src/app/biz/profile/page.tsx
    - src/app/biz/verify/page.tsx
    - tests/business/verify-regnumber.test.ts
decisions:
  - "verifyBusinessRegNumber placed at src/app/biz/signup/actions.ts to match test import path"
  - "void wrapper submitBusinessRegImage added for Next.js <form action> type compatibility"
  - "OCR mismatch → regNumberOcrMismatched=true but verified stays unchanged (D-33 non-blocking)"
  - "normalizeRegNumber delegates to normalizeDigits from src/lib/strings.ts (no duplication)"
metrics:
  duration: "35m"
  completed: "2026-04-13"
  tasks: 2
  files: 8
---

# Phase 06 Plan 06: Biz Verify OCR Summary

**One-liner:** Business reg-number D-30 auto-verify via Zod + /biz/verify rebuilt with real CLOVA OCR upload, OCR mismatch writes to existing regNumberOcrMismatched column.

## What Was Built

### Task 1: Validation module + profile action extension + form UI (D-30)

**`src/lib/validations/business.ts`** — New validation module:
- `RegNumberSchema`: Zod regex `/^\d{3}-?\d{2}-?\d{5}$/` — accepts hyphenated or digit-only
- `normalizeRegNumber(s)`: delegates to `normalizeDigits`, strips all non-digits
- `formatRegNumber(s)`: inserts dashes at positions 3 and 5 (e.g. `'1234567890'` → `'123-45-67890'`)
- `OwnerPhoneSchema`: Zod regex for Korean phone/contact numbers

**`src/app/biz/signup/actions.ts`** — New `verifyBusinessRegNumber` Server Action:
- Validates format via `RegNumberSchema`
- T-06-16 owner check: `findFirst({ id: businessId, userId: session.id })`
- On valid format: writes digit-only `businessRegNumber` + `verified: true` atomically (D-30)
- On invalid format: returns `{ success: false, error, fieldErrors }` — no DB write

**`src/app/biz/profile/actions.ts`** — Extended `updateBusinessProfile`:
- Added `businessRegNumber`, `ownerName`, `ownerPhone` to Zod schema and raw FormData extraction
- D-30 verified auto-toggle: valid regNumber → `verified: true`; empty regNumber → `verified: false`; absent field → no-op
- Stores digits-only via `normalizeRegNumber()` before DB write
- Does NOT touch `businessRegImageUrl` or `regNumberOcrMismatched` (those belong to the verify page)

**`src/app/biz/profile/biz-profile-edit-form.tsx`** — Added "사업자 인증 정보" section:
- 사업자등록번호 input with `onBlur` auto-format via `formatRegNumber`, shows verified state
- 대표자명 text input
- 대표자 연락처 tel input (placeholder `010-0000-0000`)
- All 3 inputs have `minHeight: 44px` (Korean 44px tap target requirement)
- Help text: "사업자등록번호를 입력하면 형식 검증 후 자동 인증됩니다. 공고 등록 시 사업자등록증 이미지가 추가로 필요합니다."

**`src/app/biz/profile/page.tsx`** — Passes new props (`initialBusinessRegNumber`, `initialOwnerName`, `initialOwnerPhone`) to `BizProfileEditForm`.

### Task 2: /biz/verify rebuild — real upload + OCR wiring (D-31/D-32/D-33)

**`src/app/biz/verify/actions.ts`** — New `uploadBusinessRegImage` Server Action:
1. `requireBusiness()` + owner check via `findFirst({ id: businessId, userId: session.id })` (T-06-16)
2. File validation via `uploadBusinessRegFile` (MIME allowlist + 10MB limit — T-06-17)
3. Upload to `business-reg-docs` private bucket
4. Write `businessRegImageUrl = path` + reset `regNumberOcrMismatched = false` (D-33: URL first)
5. Read buffer → call `runBizLicenseOcr` (graceful: env missing → `ok:false` → `ocr:'skipped'`)
6. Compare `candidateRegNumbers` to stored `businessRegNumber`:
   - Match → `ocr: 'matched'`, mismatched stays false
   - Mismatch/no candidates → `regNumberOcrMismatched = true`, `ocr: 'mismatched'`, verified UNCHANGED (D-33)
7. `revalidatePath('/biz/verify')`
8. `submitBusinessRegImage` void wrapper for `<form action>` type compatibility

**`src/app/biz/verify/page.tsx`** — Fully rebuilt as server component:
- Loads real DB state via `prisma.businessProfile.findFirst`
- Shows current upload state indicator (업로드됨 / 미업로드)
- Shows signed-URL image preview if already uploaded (via `createSignedBusinessRegUrl`)
- Shows non-blocking OCR mismatch notice when `regNumberOcrMismatched === true`
- File input: `accept="image/jpeg,image/png,application/pdf"`, single file, 44px height
- **MOCK_OCR_RESULT completely removed** — grep of `MOCK_OCR_RESULT` in `src/` returns 0 matches

## Migration Confirmation

**No new migration files were created in this plan.**

`ls supabase/migrations/20260414*.sql` returns exactly 3 files:
1. `20260414000001_phase6_business_profile_extension.sql` — added all Phase 6 columns including `regNumberOcrMismatched`
2. `20260414000002_phase6_storage_business_reg_docs.sql` — bucket + RLS policies
3. `20260414000003_phase6_business_profile_indexes.sql` — indexes

The `regNumberOcrMismatched` column referenced in this plan was provisioned in Plan 06-02 Task 1. This plan only reads and writes to the existing column.

## Worked Examples

### Example A: Matching OCR
- Business has `businessRegNumber = '1234567890'`, `verified = true`
- Upload image → OCR returns `candidateRegNumbers: ['1234567890']`
- Action: `regNumberOcrMismatched = false` (reset on upload, stays false), `businessRegImageUrl = path`
- Return: `{ ok: true, ocr: 'matched' }`
- DB state: `verified = true`, `regNumberOcrMismatched = false`, `businessRegImageUrl != null`

### Example B: Mismatching OCR (D-33)
- Business has `businessRegNumber = '1234567890'`, `verified = true`
- Upload image → OCR returns `candidateRegNumbers: ['9999999999']`
- Action: `regNumberOcrMismatched = true`, image URL still written (D-33)
- Return: `{ ok: true, ocr: 'mismatched' }`
- DB state: `verified = true` (UNCHANGED — mismatch is advisory only), `regNumberOcrMismatched = true`, `businessRegImageUrl != null`

### Example C: Missing CLOVA env (development / CI)
- `CLOVA_OCR_SECRET` or `CLOVA_OCR_API_URL` not set → `runBizLicenseOcr` returns `{ ok: false, reason: 'api_error' }`
- Action: OCR block skipped, `regNumberOcrMismatched` stays false (reset on upload)
- Return: `{ ok: true, ocr: 'skipped' }`
- DB state: image saved, `regNumberOcrMismatched = false`

## Known Limitation

Without `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` env vars, every upload returns `ocr: 'skipped'` and `regNumberOcrMismatched` is left `false`. This is intentional per D-33 (fail-open) — OCR is advisory, not a gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] void wrapper for Next.js `<form action>` type**
- **Found during:** Task 2 TypeScript check
- **Issue:** Next.js 16 `<form action>` prop requires `(formData: FormData) => void | Promise<void>`. `uploadBusinessRegImage` returns a typed result union, causing TS2322.
- **Fix:** Added `submitBusinessRegImage` void wrapper in `src/app/biz/verify/actions.ts` that calls `uploadBusinessRegImage` and discards the return value. The page uses the wrapper; tests call `uploadBusinessRegImage` directly for result assertions.
- **Files modified:** `src/app/biz/verify/actions.ts`, `src/app/biz/verify/page.tsx`

**2. [Rule 1 - Bug] Stale `@ts-expect-error` directives in test file**
- **Found during:** Task 1 TypeScript check
- **Issue:** Test file had `@ts-expect-error wave-6-not-yet-implemented` on 3 import lines and `result.error` / `result.ocr` direct property access without type guards.
- **Fix:** Removed `@ts-expect-error` directives (now that modules exist); added `'error' in result &&` and `result.ok &&` type guards for discriminated union access.
- **Files modified:** `tests/business/verify-regnumber.test.ts`

**3. [Rule 2 - Missing] `verifyBusinessRegNumber` placed at `src/app/biz/signup/actions.ts`**
- **Context:** The plan described extending `role-select/actions.ts` but that action only handles role assignment — it does not create BusinessProfile rows. The test imports from `@/app/biz/signup/actions`, so the standalone action was placed there to match the test import contract. The `updateBusinessProfile` in `biz/profile/actions.ts` covers the profile-edit path with identical auto-verify logic.

## Self-Check

### Files created/modified exist:
- src/lib/validations/business.ts — FOUND
- src/app/biz/signup/actions.ts — FOUND
- src/app/biz/verify/actions.ts — FOUND
- src/app/biz/profile/actions.ts — FOUND (modified)
- src/app/biz/profile/biz-profile-edit-form.tsx — FOUND (modified)
- src/app/biz/profile/page.tsx — FOUND (modified)
- src/app/biz/verify/page.tsx — FOUND (modified)
- tests/business/verify-regnumber.test.ts — FOUND (modified)

### Commits:
- c961a88 — feat(06-06): D-30 reg-number validation + profile form 3 new inputs
- a0b774a — feat(06-06): rebuild /biz/verify with real upload+OCR, remove MOCK_OCR_RESULT

### Migration count: 3 (no new files)

### MOCK_OCR_RESULT in src/: 0 matches

## Self-Check: PASSED
