---
phase: 06-admin-backoffice
plan: "04"
subsystem: libs-ocr-storage-commission
tags: [ocr, storage, commission, utilities, wave-3]
dependency_graph:
  requires: [06-02]
  provides: [src/lib/ocr/clova.ts, src/lib/supabase/storage-biz-reg.ts, src/lib/commission.ts, src/lib/strings.ts]
  affects: [06-05, 06-06, 06-07]
tech_stack:
  added: []
  patterns:
    - native fetch + AbortController (no new npm deps)
    - Prisma.Decimal ROUND_HALF_UP for KRW commission math
    - import 'server-only' to prevent client bundle inclusion
    - Supabase Storage signed URL (1h TTL) for private bucket access
key_files:
  created:
    - src/lib/ocr/clova.ts
    - src/lib/supabase/storage-biz-reg.ts
    - src/lib/commission.ts
    - src/lib/strings.ts
  modified:
    - tests/ocr/clova-parser.test.ts
decisions:
  - "Native fetch + AbortController at 15s — no axios/sdk per constraint"
  - "MIME allowlist at app layer (T-06-10): jpeg, png, pdf only, 10MB max"
  - "Storage path {userId}/{businessId}.{ext} — aligns with RLS owner-folder policy"
  - "Commission rate stored as percentage (5.00 = 5%); divide by 100 in math"
  - "ROUND_HALF_UP via Prisma.Decimal.ROUND_HALF_UP — KRW has no fractional units"
  - "Env unset → 0% rate — graceful default per D-35"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-13"
  tasks: 3
  files: 5
---

# Phase 06 Plan 04: Libs — OCR, Storage, Commission, Strings Summary

**One-liner:** Four pure library modules — CLOVA OCR multipart caller with 15s timeout, private business-reg-docs storage helper with signed URLs, Prisma.Decimal commission math with ROUND_HALF_UP, and a normalizeDigits utility — enabling Wave 4/5 Server Actions to be thin orchestrators.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CLOVA OCR + normalizeDigits | 4e65e0e | src/lib/ocr/clova.ts, src/lib/strings.ts, tests/ocr/clova-parser.test.ts |
| 2 | Private storage helper | ff4b323 | src/lib/supabase/storage-biz-reg.ts |
| 3 | Commission math module | d4a7c79 | src/lib/commission.ts |

## Environment Variable Contract (CLOVA OCR)

| Variable | Required | Behavior when absent |
|----------|----------|---------------------|
| `CLOVA_OCR_SECRET` | Yes | Returns `{ ok: false, reason: 'api_error' }` immediately; no fetch call made |
| `CLOVA_OCR_API_URL` | Yes | Returns `{ ok: false, reason: 'api_error' }` immediately; no fetch call made |

**Failure path matrix:**

| Scenario | Result |
|----------|--------|
| Missing or empty `CLOVA_OCR_SECRET` | `{ ok: false, reason: 'api_error' }` — no HTTP call |
| Missing or empty `CLOVA_OCR_API_URL` | `{ ok: false, reason: 'api_error' }` — no HTTP call |
| `AbortController` fires at 15s | `{ ok: false, reason: 'timeout' }` |
| CLOVA returns non-2xx HTTP | `{ ok: false, reason: 'api_error' }` |
| Response JSON has no `images` array | `{ ok: false, reason: 'unparseable' }` |
| Response has no matching 10-digit pattern | `{ ok: true, fullText: "...", candidateRegNumbers: [] }` |
| Happy path | `{ ok: true, fullText: "...", candidateRegNumbers: ["1234567890", ...] }` |

**Critical**: All failure paths return `ok: false` without throwing — callers must NOT wrap in try/catch expecting throws. Per D-33, image storage proceeds even when OCR fails; the calling Server Action sets `regNumberOcrMismatched = true` for admin review.

## Storage Path Convention

```
business-reg-docs/{userId}/{businessId}.{ext}
```

- `ext` is derived from MIME: `image/jpeg → jpg`, `image/png → png`, `application/pdf → pdf`
- `userId` is the Supabase auth user ID — matches the first folder segment checked by bucket RLS
- `businessId` is the `BusinessProfile.id` UUID
- Wave 4 callers store **only the path** in `BusinessProfile.businessRegImageUrl` — never a full URL
- Full URL is derived at read time via `createSignedBusinessRegUrl(path)` to keep bucket private

**Access pattern:** `uploadBusinessRegFile(file, { userId, businessId })` → returns `{ ok: true, path }` → store `path` in DB → at read time: `createSignedBusinessRegUrl(path)` → returns 1h-TTL signed URL.

## Commission Math — Worked Example

```
gross = 10,000 KRW
rate  = 5.00 (Prisma.Decimal — represents 5%)

commissionAmount = ROUND_HALF_UP(10000 * 5.00 / 100)
                 = ROUND_HALF_UP(500.00)
                 = 500 KRW

netEarnings      = 10000 - 500
                 = 9,500 KRW
```

Additional rounding edge case (verified by plan spec):
```
gross = 10,001 KRW, rate = 5.00%
commission = ROUND_HALF_UP(10001 * 0.05) = ROUND_HALF_UP(500.05) = 500 KRW
net = 10001 - 500 = 9,501 KRW
```

**Rate fallback chain** (getEffectiveCommissionRate):
1. `BusinessProfile.commissionRate` (not null) → use it directly
2. `process.env.PLATFORM_DEFAULT_COMMISSION_RATE` (set, valid decimal) → use it
3. All else → `Prisma.Decimal(0)` → 0% → commissionAmount=0, netEarnings=gross

## Test Results

```
tests/ocr/clova-parser.test.ts — 7/7 PASSED (flipped from describe.skip → describe)
  ✓ D-32 happy path: single regNumber → candidateRegNumbers=['1234567890']
  ✓ D-32 multiple candidates: both digit-only 10-char strings returned
  ✓ D-33 no 10-digit sequence → candidateRegNumbers=[]
  ✓ D-33 timeout: AbortError → reason='timeout'
  ✓ D-33 API error 500 → reason='api_error'
  ✓ D-33 missing env vars → reason='api_error', fetch NOT called
  ✓ D-33 unparseable response: graceful, no throw
```

`commission-snapshot.test.ts` remains `describe.skip` — it tests DB writes in the checkOut Server Action which is Wave 7 (Plan 06-07). That file is unchanged in this plan.

## Verification

- [x] `tests/ocr/clova-parser.test.ts` GREEN (7/7)
- [x] `npx tsc --noEmit` — zero errors in new files
- [x] `grep "import 'server-only'" src/lib/ocr/clova.ts src/lib/supabase/storage-biz-reg.ts` — both hit
- [x] All 4 lib files exist and are pure (no Server Action or DB write logic)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all four modules are fully implemented with no placeholder values or mock returns.

## Threat Flags

No new network endpoints or auth paths introduced beyond what the plan's threat model covers. All T-06-07 through T-06-11 mitigations applied as specified.

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/ocr/clova.ts
- FOUND: src/lib/supabase/storage-biz-reg.ts
- FOUND: src/lib/commission.ts
- FOUND: src/lib/strings.ts

Commits exist:
- FOUND: 4e65e0e (feat(06-04): CLOVA OCR wrapper + normalizeDigits utility)
- FOUND: ff4b323 (feat(06-04): private storage helper for business-reg-docs bucket)
- FOUND: d4a7c79 (feat(06-04): commission math module with Prisma.Decimal ROUND_HALF_UP)
