---
phase: 06-admin-backoffice
plan: 06
type: execute
wave: 4
depends_on: [03, 04]
files_modified:
  - src/app/biz/profile/actions.ts
  - src/app/biz/profile/biz-profile-edit-form.tsx
  - src/app/(auth)/role-select/actions.ts
  - src/app/biz/verify/page.tsx
  - src/app/biz/verify/actions.ts
  - src/lib/validations/business.ts
autonomous: true
requirements: [D-30, D-31, D-32, D-33, D-37, D-39]
must_haves:
  truths:
    - "사업자 프로필 편집/생성 경로에서 사업자등록번호(NNN-NN-NNNNN) + 대표자명 + 연락처를 저장할 수 있다"
    - "유효한 regNumber 저장 시 verified=true 자동 승인 (D-30). 형식 오류는 필드 에러로 거부"
    - "/biz/verify 페이지가 이미지 업로드 form으로 완전히 재작성됨 — MOCK_OCR_RESULT 제거"
    - "업로드된 파일이 business-reg-docs 프라이빗 버킷에 저장되고 businessRegImageUrl에 경로 기록"
    - "업로드 성공시 CLOVA OCR 호출 → 실패/timeout/mismatch 여도 이미지 저장은 성공 (D-33 graceful)"
    - "OCR 결과 regNumber가 입력값과 불일치하면 regNumberOcrMismatched=true 를 기존 컬럼(Wave 2에서 이미 생성됨)에 write — 새 migration 생성 금지"
    - "tests/business/verify-regnumber.test.ts GREEN (D-30 format 블록 + D-33 OCR-mismatch describe.skip 블록 둘 다 unskip)"
  artifacts:
    - path: "src/lib/validations/business.ts"
      provides: "RegNumberSchema + OwnerSchema + normalizeRegNumber"
      exports: ["RegNumberSchema", "normalizeRegNumber", "formatRegNumber"]
    - path: "src/app/biz/verify/page.tsx"
      provides: "Rebuilt upload form (no mock data)"
    - path: "src/app/biz/verify/actions.ts"
      provides: "uploadBusinessRegImage Server Action — writes to existing regNumberOcrMismatched column"
      exports: ["uploadBusinessRegImage"]
    - path: "src/app/biz/profile/actions.ts"
      provides: "Extended updateBusinessProfile with regNumber/ownerName/ownerPhone fields + verified auto-toggle"
    - path: "src/app/biz/profile/biz-profile-edit-form.tsx"
      provides: "3 new inputs (regNumber/ownerName/ownerPhone) under 사업자 인증 정보 section"
  key_links:
    - from: "src/app/biz/verify/actions.ts"
      to: "src/lib/supabase/storage-biz-reg.ts"
      via: "uploadBusinessRegFile"
      pattern: "uploadBusinessRegFile"
    - from: "src/app/biz/verify/actions.ts"
      to: "src/lib/ocr/clova.ts"
      via: "runBizLicenseOcr"
      pattern: "runBizLicenseOcr"
    - from: "src/app/biz/profile/actions.ts"
      to: "src/lib/validations/business.ts"
      via: "RegNumberSchema.safeParse"
      pattern: "RegNumberSchema"
    - from: "src/app/biz/profile/biz-profile-edit-form.tsx"
      to: "src/app/biz/profile/actions.ts"
      via: "form submit → updateBusinessProfile"
      pattern: "updateBusinessProfile"
---

<objective>
Implement the business-side flows that populate the new columns: (a) biz profile edit/create collects regNumber + ownerName + ownerPhone with auto-verify per D-30, (b) /biz/verify page is rebuilt as a real image upload + OCR call, removing all mock references. OCR-mismatch writes go to the `regNumberOcrMismatched` column that already exists from Plan 06-02 — this plan creates NO new migration files.

Purpose: Without this wave, the admin console shows empty rows — no sources of truth feed the schema extensions.
Output: 6 files touched. `tests/business/verify-regnumber.test.ts` flips RED→GREEN on both the D-30 format block AND the D-33 OCR-mismatch block.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@.planning/phases/06-admin-backoffice/06-CONTEXT.md
@src/app/biz/profile/actions.ts
@src/app/biz/profile/biz-profile-edit-form.tsx
@src/app/biz/profile/page.tsx
@src/app/biz/verify/page.tsx
@src/app/(auth)/role-select/actions.ts
@src/app/biz/posts/actions.ts
@src/lib/supabase/storage-biz-reg.ts
@src/lib/ocr/clova.ts
@tests/business/verify-regnumber.test.ts
</context>

<interfaces>
```typescript
// src/lib/validations/business.ts
import { z } from 'zod'

export const RegNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{3}-?\d{2}-?\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다 (NNN-NN-NNNNN)')

export function normalizeRegNumber(s: string): string  // '123-45-67890' -> '1234567890'
export function formatRegNumber(s: string): string     // '1234567890' -> '123-45-67890'

export const OwnerPhoneSchema = z.string().regex(/^[0-9\-\+\s]{7,20}$/)

// src/app/biz/verify/actions.ts
export async function uploadBusinessRegImage(formData: FormData): Promise<
  | { ok: true; ocr: 'matched' | 'mismatched' | 'skipped' }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
>
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Regnumber validation module + profile action extension + profile form UI (D-30)</name>
  <files>src/lib/validations/business.ts, src/app/biz/profile/actions.ts, src/app/biz/profile/biz-profile-edit-form.tsx, src/app/(auth)/role-select/actions.ts</files>
  <behavior>
    Covered by `tests/business/verify-regnumber.test.ts` (D-30 format-validation block, which turns GREEN after this task):
    - Valid `123-45-67890` → row has businessRegNumber='1234567890' (digit-only), verified=true
    - Valid without dashes `1234567890` → same outcome
    - Invalid `abc-12-34567` → fieldErrors returned, no DB write, verified unchanged
    - Updating regNumber does NOT touch existing businessRegImageUrl or regNumberOcrMismatched columns
  </behavior>
  <action>
    1. Create `src/lib/validations/business.ts` per interface block above. `normalizeRegNumber` uses `normalizeDigits` from `src/lib/strings.ts`; `formatRegNumber` inserts dashes at positions 3 and 5.

    2. Edit `src/app/biz/profile/actions.ts` (existing file — read first):
       - Locate the existing `updateBusinessProfile` or similar Server Action (there may be create + update — grep `business_profile` writes).
       - Extend the Zod schema to accept optional `businessRegNumber`, `ownerName`, `ownerPhone`. Use `RegNumberSchema` and `OwnerPhoneSchema`.
       - On write:
         - `normalizeRegNumber(data.businessRegNumber)` → store digits-only
         - If regNumber provided + format valid → set `verified: true` atomically (D-30, D-39)
         - If regNumber cleared → set `verified: false` (per Pitfall 3 — verified semantics)
         - `ownerName` / `ownerPhone` plain string write
       - Do NOT touch `businessRegImageUrl` or `regNumberOcrMismatched` from this action — those are the verify page's concern.

    3. Edit `src/app/(auth)/role-select/actions.ts` (signup completion flow) — add the same 3 optional fields to the BusinessProfile create branch with identical auto-verify logic. Only add; do NOT reshape existing WORKER path.

    4. Edit `src/app/biz/profile/biz-profile-edit-form.tsx` — this is the existing biz profile edit UI surfaced by `src/app/biz/profile/page.tsx`. Add a new "사업자 인증 정보" section containing 3 inputs:
       - 사업자등록번호 — text input, auto-format on blur via `formatRegNumber`, help text shows current verified state.
       - 대표자명 — text input.
       - 대표자 연락처 — tel input, placeholder `010-0000-0000`.
       Wire each field into the existing form's state + submit handler so the values reach `updateBusinessProfile`. Include section-level help text: "사업자등록번호를 입력하면 형식 검증 후 자동 인증됩니다. 공고 등록 시 사업자등록증 이미지가 추가로 필요합니다." — this explains the D-30↔D-31 split to the user.

    5. Flip the D-30 format-validation `describe.skip` block in `tests/business/verify-regnumber.test.ts` to `describe` (the D-33 OCR-mismatch block in the same file stays skipped until Task 2).
  </action>
  <verify>
    <automated>npx vitest run tests/business/verify-regnumber.test.ts -t "D-30" && npx tsc --noEmit</automated>
  </verify>
  <done>
    - verify-regnumber.test.ts D-30 block GREEN (D-33 OCR-mismatch block still skipped — Task 2 flips it).
    - `src/app/biz/profile/biz-profile-edit-form.tsx` now renders 3 new inputs wired into the submit handler.
    - Manual: /biz/profile edit with regnumber → verified badge appears.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: /biz/verify rebuild — real upload + OCR wiring (writes to existing regNumberOcrMismatched column)</name>
  <files>src/app/biz/verify/page.tsx, src/app/biz/verify/actions.ts</files>
  <behavior>
    - Page is a server component rendering a form targeting `uploadBusinessRegImage`
    - Form has file input (accept=image/jpeg,image/png,application/pdf, multiple=false) + submit button
    - Server Action:
      1. requireBusiness + load the business row via session.id (business context derived from session+businessId form field since user may have multiple BusinessProfiles)
      2. Validate file (MIME + size) via uploadBusinessRegFile helper
      3. Upload to storage — on error return `{ ok:false, error }`
      4. Write `businessRegImageUrl = path` to BusinessProfile (always, per D-33)
      5. Read file buffer, call `runBizLicenseOcr(buffer, mimeType)`. On `ok:false` → OCR skipped, proceed
      6. If `ok:true`, compare `candidateRegNumbers` to the business's normalized `businessRegNumber`:
         - Match → return `{ ok:true, ocr:'matched' }`, set `regNumberOcrMismatched=false`
         - No candidates OR mismatch → return `{ ok:true, ocr:'mismatched' }` — do NOT unset verified, do NOT fail. Set `regNumberOcrMismatched=true`.
      7. revalidatePath('/biz/verify') + redirect to /biz/posts/new (or referer) so user can proceed to post

    - MOCK_OCR_RESULT reference must be GONE from the file tree — grep verification in Plan 08.
    - This task MUST NOT create any migration files. The `regNumberOcrMismatched` column already exists (Plan 06-02 Task 1 declared and migrated it). Plan 06-05 (Wave 4, parallel) depends on this column existing at Wave 2 time, NOT at Wave 4 time.
  </behavior>
  <action>
    **Column reference:** `regNumberOcrMismatched Boolean NOT NULL DEFAULT false` was added to `business_profiles` in Plan 06-02 Task 1. This plan only READS/WRITES the column — it does not alter schema.

    1. `src/app/biz/verify/page.tsx`:
       - Delete all references to `MOCK_OCR_RESULT`, mock images, etc.
       - Layout: title "사업자등록증 업로드", brief instruction paragraph (Korean), current state indicator ("업로드됨" if businessRegImageUrl exists else "미업로드"), file input, submit button.
       - If already uploaded, show "재업로드" wording + a signed-URL preview via createSignedBusinessRegUrl.
       - Display OCR mismatch notice if `regNumberOcrMismatched===true` AND regNumber exists: "이미지에서 추출한 사업자번호가 입력값과 일치하지 않습니다. 관리자 재검토 대상으로 등록되었습니다." (non-blocking — per D-33 this isn't a failure).

    2. `src/app/biz/verify/actions.ts`:
       ```typescript
       'use server'
       import { requireBusiness } from '@/lib/dal'
       import { prisma } from '@/lib/db'
       import { uploadBusinessRegFile } from '@/lib/supabase/storage-biz-reg'
       import { runBizLicenseOcr } from '@/lib/ocr/clova'
       import { normalizeRegNumber } from '@/lib/validations/business'
       import { revalidatePath } from 'next/cache'

       export async function uploadBusinessRegImage(formData: FormData) {
         const session = await requireBusiness()
         const businessId = String(formData.get('businessId') ?? '')
         const file = formData.get('file')
         if (!(file instanceof File) || file.size === 0) {
           return { ok: false as const, error: 'file_missing' }
         }
         const business = await prisma.businessProfile.findFirst({
           where: { id: businessId, userId: session.id },
           select: { id: true, businessRegNumber: true },
         })
         if (!business) return { ok: false as const, error: 'business_not_found' }

         const uploadResult = await uploadBusinessRegFile(file, {
           userId: session.id,
           businessId: business.id,
         })
         if (!uploadResult.ok) {
           return { ok: false as const, error: uploadResult.error }
         }

         // D-33: write URL FIRST, OCR after. OCR failure never blocks.
         // Reset regNumberOcrMismatched on re-upload; we'll set it below if OCR says mismatch.
         await prisma.businessProfile.update({
           where: { id: business.id },
           data: { businessRegImageUrl: uploadResult.path, regNumberOcrMismatched: false },
         })

         let ocr: 'matched' | 'mismatched' | 'skipped' = 'skipped'
         try {
           const buffer = await file.arrayBuffer()
           const result = await runBizLicenseOcr(buffer, file.type)
           if (result.ok) {
             const stored = business.businessRegNumber
             if (stored && result.candidateRegNumbers.includes(stored)) {
               ocr = 'matched'
             } else {
               ocr = 'mismatched'
               await prisma.businessProfile.update({
                 where: { id: business.id },
                 data: { regNumberOcrMismatched: true },
               })
             }
           }
         } catch {
           // Swallow — D-33: image save is authoritative; OCR is advisory.
         }

         revalidatePath('/biz/verify')
         return { ok: true as const, ocr }
       }
       ```

    3. Flip the D-33 OCR-mismatch `describe.skip` block in `tests/business/verify-regnumber.test.ts` to `describe`. This is the scenario authored in Plan 06-01 Task 3 that asserts `regNumberOcrMismatched=true` + `businessRegImageUrl !== null` after a non-matching OCR.
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -rn "MOCK_OCR_RESULT\|mock-ocr" src/ 2>&1 | head -5 && npx vitest run tests/business/verify-regnumber.test.ts</automated>
  </verify>
  <done>
    - grep of MOCK_OCR* in src/ returns 0 matches
    - Files compile
    - No new migration files were created in this task (confirm `ls supabase/migrations/20260414*` still shows only the 3 files created in Plan 06-02).
    - `tests/business/verify-regnumber.test.ts` fully GREEN (both D-30 format block AND D-33 OCR-mismatch block unskipped and passing).
    - Manual smoke: upload sample image with CLOVA env unset → returns `ocr:'skipped'`, image saved, DB row updated.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client form → uploadBusinessRegImage | File, businessId (untrusted) |
| Server Action → Supabase Storage | Uploader identity enforced via auth.uid() folder RLS |
| Server Action → CLOVA external | CLOVA response untrusted — only digit extractions persisted |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-16 | Tampering | businessId form field | mitigate | `findFirst({ id, userId: session.id })` — action works only on businesses owned by the session user |
| T-06-17 | DoS | Large file upload blocking Server Action | mitigate | 10MB bucket limit + app-layer check; CLOVA 15s timeout prevents hung reads |
| T-06-18 | Repudiation | OCR mismatch without audit | accept | Audit trail is v2 (CONTEXT.md deferred). regNumberOcrMismatched bool + updatedAt suffices for MVP |
| T-06-19 | Information Disclosure | OCR fullText contains owner RRN | mitigate | Do NOT persist fullText. Only digit-only candidateRegNumbers compared server-side and dropped. |
</threat_model>

<verification>
- `tests/business/verify-regnumber.test.ts` GREEN (both D-30 + D-33 blocks)
- `tests/ocr/clova-parser.test.ts` still GREEN
- `grep MOCK_OCR src/` returns empty
- `ls supabase/migrations/20260414*` returns exactly 3 files (no 4th migration created by this plan)
- `psql "\d business_profiles"` shows regNumberOcrMismatched column (added in Plan 06-02, referenced here)
- Phase 5 test suite unaffected
</verification>

<success_criteria>
- Business profile form collects regNumber/ownerName/ownerPhone with D-30 auto-verify
- Biz profile edit form UI (biz-profile-edit-form.tsx) exposes the 3 new inputs
- /biz/verify page rebuilt without mock data
- OCR graceful degradation: env missing / timeout / mismatch → image still saves
- regNumberOcrMismatched flag correctly toggled on mismatch / reset on matched re-upload
- No migration files created in this plan
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-06-SUMMARY.md` — document:
- Confirmation that no new migration files were created (the column was provisioned in Plan 06-02)
- A worked example: regNumber '1234567890' + OCR returning ['1234567890'] → verified stays true, mismatched=false
- A worked example: regNumber '1234567890' + OCR returning ['9999999999'] → verified stays true, mismatched=true, image URL still set (D-33)
- Known limitation: without CLOVA env, every upload goes through as ocr='skipped' (regNumberOcrMismatched left false)
</output>
