---
phase: 06-admin-backoffice
plan: 04
type: execute
wave: 3
depends_on: [02]
files_modified:
  - src/lib/ocr/clova.ts
  - src/lib/supabase/storage-biz-reg.ts
  - src/lib/commission.ts
  - src/lib/strings.ts
autonomous: true
requirements: [D-32, D-33, D-34, D-35, D-36, D-38]
must_haves:
  truths:
    - "runBizLicenseOcr posts multipart/form-data to CLOVA with 15s AbortController timeout"
    - "OCR module gracefully degrades when CLOVA env missing (returns { ok:false, reason:'api_error' } without throwing)"
    - "uploadBusinessRegFile writes to business-reg-docs/{userId}/{businessId}.{ext} with server-side client"
    - "createSignedBusinessRegUrl(path) returns a 1h-TTL URL for admin view"
    - "getEffectiveCommissionRate returns Prisma.Decimal, respecting BusinessProfile override then env default then '0'"
    - "computeCommissionSnapshot rounds with ROUND_HALF_UP and returns integer krw values"
    - "normalizeDigits utility exists and is used by search + OCR comparison"
  artifacts:
    - path: "src/lib/ocr/clova.ts"
      provides: "runBizLicenseOcr(fileBuffer, mimeType)"
      exports: ["runBizLicenseOcr", "ClovaOcrResult"]
      min_lines: 50
    - path: "src/lib/supabase/storage-biz-reg.ts"
      provides: "uploadBusinessRegFile + createSignedBusinessRegUrl"
      exports: ["uploadBusinessRegFile", "createSignedBusinessRegUrl", "BUSINESS_REG_BUCKET"]
    - path: "src/lib/commission.ts"
      provides: "getEffectiveCommissionRate + computeCommissionSnapshot"
      exports: ["getEffectiveCommissionRate", "computeCommissionSnapshot"]
    - path: "src/lib/strings.ts"
      provides: "normalizeDigits"
      exports: ["normalizeDigits"]
  key_links:
    - from: "src/lib/ocr/clova.ts"
      to: "process.env.CLOVA_OCR_SECRET / CLOVA_OCR_API_URL"
      via: "native fetch + FormData + AbortController(15000)"
      pattern: "X-OCR-SECRET"
    - from: "src/lib/supabase/storage-biz-reg.ts"
      to: "supabase.storage.from('business-reg-docs')"
      via: "@supabase/ssr server client"
      pattern: "createSignedUrl"
    - from: "src/lib/commission.ts"
      to: "process.env.PLATFORM_DEFAULT_COMMISSION_RATE"
      via: "Prisma.Decimal fallback chain"
      pattern: "ROUND_HALF_UP"
---

<objective>
Four small, independently-testable library modules that Waves 4-5 call. This plan runs in parallel with Plan 06-03 (both in Wave 3, zero file overlap).

Purpose: Isolate the three net-new capabilities (OCR call, private bucket upload, commission math) into pure modules so the Server Actions in Wave 4-5 are thin orchestrators. Makes each capability independently testable.
Output: 4 library files + Wave 0 `tests/ocr/clova-parser.test.ts` flips RED→GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@src/lib/supabase/storage.ts
@src/lib/supabase/server.ts
@src/app/(worker)/my/profile/edit/actions.ts
@src/app/(worker)/my/applications/[id]/check-in/actions.ts
@tests/ocr/clova-parser.test.ts
</context>

<interfaces>
```typescript
// src/lib/ocr/clova.ts
export type ClovaOcrResult =
  | { ok: true; fullText: string; candidateRegNumbers: string[] }
  | { ok: false; reason: 'timeout' | 'api_error' | 'unparseable' }

export async function runBizLicenseOcr(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ClovaOcrResult>

// src/lib/supabase/storage-biz-reg.ts
export const BUSINESS_REG_BUCKET = 'business-reg-docs'

export async function uploadBusinessRegFile(
  file: File,
  opts: { userId: string; businessId: string },
): Promise<{ ok: true; path: string } | { ok: false; error: string }>

export async function createSignedBusinessRegUrl(
  path: string,
  ttlSeconds?: number, // default 3600
): Promise<string | null>

// src/lib/commission.ts
import { Prisma } from '@/generated/prisma/client'

export function getEffectiveCommissionRate(
  businessRate: Prisma.Decimal | null | undefined,
): Prisma.Decimal

export function computeCommissionSnapshot(
  gross: number,
  rate: Prisma.Decimal,
): { rate: Prisma.Decimal; commissionAmount: number; netEarnings: number }

// src/lib/strings.ts
export function normalizeDigits(s: string): string  // removes non-digit chars
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: CLOVA OCR + normalizeDigits utility</name>
  <files>src/lib/ocr/clova.ts, src/lib/strings.ts</files>
  <behavior>
    Covered by Wave 0 `tests/ocr/clova-parser.test.ts`:
    - Happy path: CLOVA returns inferText with regnumber → candidateRegNumbers has digit-only 10-char string
    - Multiple candidates extracted
    - No 10-digit sequence → candidateRegNumbers = []
    - AbortController timeout at 15s → reason='timeout'
    - HTTP 500 → reason='api_error'
    - Missing env vars → reason='api_error', NO fetch call
    - `normalizeDigits('123-45-67890')` === '1234567890'
  </behavior>
  <action>
    1. Create `src/lib/strings.ts` with single export:
       ```typescript
       export function normalizeDigits(s: string): string {
         return s.replace(/\D/g, '')
       }
       ```

    2. Create `src/lib/ocr/clova.ts` implementing `runBizLicenseOcr` per RESEARCH.md §Example 5 with these concretions:
       - `import 'server-only'` at top (prevents client bundle import)
       - Check env BEFORE constructing FormData (skips work on missing env)
       - `AbortController` with `setTimeout(() => ctrl.abort(), 15_000)` + `clearTimeout` in finally
       - Build CLOVA v2 `message` object (version:'V2', requestId:crypto.randomUUID(), timestamp, images[0].format derived from mimeType: 'pdf'|'png'|'jpg')
       - Send multipart: `form.append('message', JSON.stringify(msg))` + `form.append('file', new Blob([fileBuffer], {type:mimeType}), 'biz-license')`
       - Headers: `'X-OCR-SECRET': secret`, body: form (no content-type — fetch sets it with boundary)
       - On !res.ok → `{ ok:false, reason:'api_error' }`
       - Parse JSON, walk `images[0].fields` array, concat all `inferText` into fullText
       - Extract candidates via `fullText.matchAll(/\d{3}-?\d{2}-?\d{5}/g)` → map to `normalizeDigits(m[0])`
       - catch AbortError → 'timeout'; other errors → 'api_error'

    3. Flip `tests/ocr/clova-parser.test.ts` from `describe.skip` to `describe` (edit test file).
  </action>
  <verify>
    <automated>npx vitest run tests/ocr/clova-parser.test.ts</automated>
  </verify>
  <done>All clova-parser.test.ts assertions green. `grep "import 'server-only'"` in clova.ts returns a hit.</done>
</task>

<task type="auto">
  <name>Task 2: Private storage helper for business-reg-docs</name>
  <files>src/lib/supabase/storage-biz-reg.ts</files>
  <action>
    Mirror `src/lib/supabase/storage.ts` (avatars helper) but for private bucket:

    ```typescript
    import 'server-only'
    import { createClient } from '@/lib/supabase/server'

    export const BUSINESS_REG_BUCKET = 'business-reg-docs'
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'] as const
    const MAX_BYTES = 10 * 1024 * 1024

    function extFromMime(mime: string): string {
      if (mime === 'image/jpeg') return 'jpg'
      if (mime === 'image/png')  return 'png'
      if (mime === 'application/pdf') return 'pdf'
      return 'bin'
    }

    export async function uploadBusinessRegFile(
      file: File,
      opts: { userId: string; businessId: string },
    ): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
      if (!ALLOWED_MIME.includes(file.type as typeof ALLOWED_MIME[number])) {
        return { ok: false, error: 'unsupported_mime' }
      }
      if (file.size > MAX_BYTES) {
        return { ok: false, error: 'too_large' }
      }
      const ext = extFromMime(file.type)
      const path = `${opts.userId}/${opts.businessId}.${ext}`
      const supabase = await createClient()
      const { error } = await supabase.storage
        .from(BUSINESS_REG_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) return { ok: false, error: error.message }
      return { ok: true, path }
    }

    export async function createSignedBusinessRegUrl(
      path: string,
      ttlSeconds = 3600,
    ): Promise<string | null> {
      const supabase = await createClient()
      const { data, error } = await supabase.storage
        .from(BUSINESS_REG_BUCKET)
        .createSignedUrl(path, ttlSeconds)
      if (error || !data) return null
      return data.signedUrl
    }
    ```

    Export `BUSINESS_REG_BUCKET` constant so the verify page Server Action can reference the same bucket name.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>File compiles. Imports from `@/lib/supabase/server` resolve.</done>
</task>

<task type="auto">
  <name>Task 3: Commission math module</name>
  <files>src/lib/commission.ts</files>
  <action>
    ```typescript
    import { Prisma } from '@/generated/prisma/client'

    const ZERO = new Prisma.Decimal(0)

    export function getEffectiveCommissionRate(
      businessRate: Prisma.Decimal | null | undefined,
    ): Prisma.Decimal {
      if (businessRate != null) return new Prisma.Decimal(businessRate)
      const raw = process.env.PLATFORM_DEFAULT_COMMISSION_RATE
      if (!raw || raw.trim() === '') return ZERO
      try {
        return new Prisma.Decimal(raw)
      } catch {
        return ZERO
      }
    }

    export function computeCommissionSnapshot(
      gross: number,
      rate: Prisma.Decimal,
    ): { rate: Prisma.Decimal; commissionAmount: number; netEarnings: number } {
      const grossDec = new Prisma.Decimal(Math.trunc(gross))
      const commissionDec = grossDec
        .mul(rate)
        .div(100)
        .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      const commissionAmount = commissionDec.toNumber()
      const netEarnings = Math.trunc(gross) - commissionAmount
      return { rate, commissionAmount, netEarnings }
    }
    ```

    Key decisions (commit these as inline comments):
    - Rate stored as percentage form (5.00 = 5%) — div by 100
    - `toDecimalPlaces(0, ROUND_HALF_UP)` — krw has no fractional units
    - Env unset → 0 rate → commissionAmount=0, netEarnings=gross (graceful default per D-35)
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    - File compiles
    - Manual sanity check (note in SUMMARY): `computeCommissionSnapshot(10000, new Decimal('5.00'))` returns `{ commissionAmount: 500, netEarnings: 9500 }`
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server Action → CLOVA external API | Untrusted response; validate shape before indexing |
| Signed URL → admin browser | Time-limited (1h TTL); do not log URL |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-07 | Information Disclosure | CLOVA secret leak to client bundle | mitigate | `import 'server-only'` at top of `src/lib/ocr/clova.ts` — Next.js build fails if imported from "use client" |
| T-06-08 | XSS via OCR response | CLOVA fullText rendered to admin UI | mitigate | Store only digit-only `candidateRegNumbers` in DB; discard fullText. If UI displays OCR text, rely on JSX auto-escape + short summary only |
| T-06-09 | DoS via slow CLOVA | Server Action hangs | mitigate | AbortController 15s timeout; fail-open per D-33 (image still saved, admin flag set) |
| T-06-10 | File upload bypassing type check | Malicious filename | mitigate | MIME allowlist app-layer + bucket-level + file size check; bucket RLS restricts to auth.uid() folder |
| T-06-11 | Commission rounding drift | fp arithmetic | mitigate | Prisma.Decimal throughout; explicit ROUND_HALF_UP |
</threat_model>

<verification>
- `tests/ocr/clova-parser.test.ts` GREEN (flipped from skip)
- `npx tsc --noEmit` passes
- `grep -rn "import 'server-only'" src/lib/ocr src/lib/supabase/storage-biz-reg.ts` returns hits for both files
</verification>

<success_criteria>
- 4 lib files exist and are pure (no Server Action or DB write logic — those live in Wave 4/5)
- OCR tests green
- No regressions in existing lib tests
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-04-SUMMARY.md` — document:
- Exact env var contract for CLOVA (what happens on empty, what happens on 500, on timeout)
- The storage path convention (`{userId}/{businessId}.{ext}`) so Wave 4 callers agree
- One worked commission example (gross=10000, rate=5.00 → commission=500, net=9500)
</output>
