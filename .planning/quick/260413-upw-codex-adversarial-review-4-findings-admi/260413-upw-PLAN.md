---
phase: 260413-upw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260414000005_phase6_admin_seed.sql
  - src/app/biz/profile/actions.ts
  - src/app/biz/signup/actions.ts
  - src/app/biz/verify/actions.ts
  - src/app/biz/verify/page.tsx
  - src/app/biz/posts/actions.ts
  - src/lib/db/admin-queries.ts
  - src/lib/db/__tests__/admin-queries-rate-cursor.test.ts
autonomous: true
requirements:
  - CODEX-1-ADMIN-SEED-JWT
  - CODEX-2-VERIFIED-AUTOAPPROVE
  - CODEX-3-MULTI-BUSINESS-VERIFY
  - CODEX-4-RATE-CURSOR-BUG

must_haves:
  truths:
    - "Admin seed SQL promotes BOTH auth.users.raw_app_meta_data.role AND public.users.role to ADMIN, so a re-logged-in user can reach /admin without redirect."
    - "BusinessProfile.verified is NEVER set to true based on regex format alone — only OCR match (or admin override outside this scope) flips it to true."
    - "/biz/verify supports ?businessId=<uuid> param so multi-business owners can verify the specific blocked profile rather than always the oldest one."
    - "Admin business list rate_desc/rate_asc pagination returns no duplicates and no skipped rows across page boundaries, including null commissionRate handling."
  artifacts:
    - path: "supabase/migrations/20260414000005_phase6_admin_seed.sql"
      provides: "Documented SQL block updating both auth.users.raw_app_meta_data and public.users.role"
      contains: "raw_app_meta_data"
    - path: "src/app/biz/profile/actions.ts"
      provides: "updateBusinessProfile WITHOUT auto-flipping verified=true on regex pass"
    - path: "src/app/biz/signup/actions.ts"
      provides: "verifyBusinessRegNumber that stores normalized regNumber WITHOUT setting verified=true"
    - path: "src/app/biz/verify/actions.ts"
      provides: "uploadBusinessRegImage that sets verified=true ONLY on OCR match (D-33 success path)"
    - path: "src/app/biz/verify/page.tsx"
      provides: "Server Component honoring ?businessId= query param with ownership re-check"
    - path: "src/app/biz/posts/actions.ts"
      provides: "createJob redirectTo includes ?businessId=<id> for the blocked profile"
    - path: "src/lib/db/admin-queries.ts"
      provides: "Composite cursor (commissionRate, createdAt, id) for rate_* sorts with null handling"
    - path: "src/lib/db/__tests__/admin-queries-rate-cursor.test.ts"
      provides: "Regression test covering 2 pages of rate_desc with mixed null/non-null commissionRate"
  key_links:
    - from: "src/app/biz/posts/actions.ts (createJob)"
      to: "src/app/biz/verify/page.tsx"
      via: "redirectTo string"
      pattern: "/biz/verify\\?businessId="
    - from: "src/app/biz/verify/actions.ts (uploadBusinessRegImage)"
      to: "BusinessProfile.verified column"
      via: "prisma.businessProfile.update on OCR match branch"
      pattern: "verified:\\s*true"
    - from: "supabase/migrations/20260414000005_phase6_admin_seed.sql"
      to: "src/lib/supabase/middleware.ts (admin gate reads JWT app_metadata.role)"
      via: "auth.users.raw_app_meta_data update mirrors role-select/actions.ts pattern"
      pattern: "raw_app_meta_data"
---

<objective>
Close 4 Codex adversarial review findings (verdict: needs-attention) discovered in Phase 6 (Admin Console). All 4 findings are independent and atomic — one commit per finding. No new dependencies, no v2 scope creep (no OCR provider work, no admin invite UI, no verifiedAt column).

Purpose: Restore correctness of the admin gate (Issue 1), remove false-positive "verified" trust signals shown to workers (Issue 2), unblock multi-business owners stuck on verify gate (Issue 3), and fix admin-list pagination skip/dup bug (Issue 4).

Output: Updated migration SQL + 5 source files patched + 1 new regression test for the cursor fix.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md

# Issue 1 — middleware reads JWT app_metadata.role only
@src/lib/supabase/middleware.ts
# Issue 1 — pattern to mirror (updates BOTH auth.users + public.users)
@src/app/(auth)/role-select/actions.ts
# Issue 1 — current no-op seed
@supabase/migrations/20260414000005_phase6_admin_seed.sql

# Issue 2 — verified=true side-effects to remove
@src/app/biz/profile/actions.ts
@src/app/biz/signup/actions.ts
# Issue 2 — verified=true should be set ONLY here on OCR match
@src/app/biz/verify/actions.ts
# Issue 2 — verified badge consumers (no change needed; just confirm semantic)
@src/app/biz/page.tsx
@src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx

# Issue 3 — findFirst single-profile bug + redirect site
@src/app/biz/verify/page.tsx
@src/app/biz/posts/actions.ts

# Issue 4 — cursor bug in rate_* sorts
@src/lib/db/admin-queries.ts

<interfaces>
<!-- Key types/exports referenced across these tasks. Embedded so executor needs no exploration. -->

From src/lib/form-state.ts:
```typescript
// JobFormState supports a redirectTo sentinel for verify gate (D-31)
export type JobFormState =
  | { ... }
  | { error: string; redirectTo: string };
```

From src/lib/dal.ts:
```typescript
export async function requireBusiness(): Promise<{ id: string; ... }>;
// Throws/redirects if not authenticated or not BUSINESS role
```

From src/lib/validations/business.ts:
```typescript
export const RegNumberSchema: z.ZodSchema<string>;
export function normalizeRegNumber(input: string): string; // returns digits-only
```

From src/app/(auth)/role-select/actions.ts (PATTERN TO MIRROR for Issue 1):
```typescript
// Updates BOTH:
//   1) public.users.role via Prisma
//   2) auth.users app_metadata.role via supabase admin client
// We replicate equivalent SQL: UPDATE auth.users SET raw_app_meta_data = ...
```

From src/lib/db/admin-queries.ts (Issue 4 cursor signature):
```typescript
export type BusinessListArgs = {
  q?: string; field?: 'name' | 'reg' | 'owner' | 'phone';
  verified?: 'all' | 'yes' | 'no';
  sort?: 'created_desc' | 'created_asc' | 'rate_desc' | 'rate_asc';
  cursor?: string | null; limit?: number;
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1 (Issue 1, HIGH): Admin seed SQL promotes BOTH auth.users.raw_app_meta_data AND public.users.role</name>
  <files>supabase/migrations/20260414000005_phase6_admin_seed.sql</files>
  <action>
Rewrite the documented (commented) SQL block in `supabase/migrations/20260414000005_phase6_admin_seed.sql` so it mirrors the role-select/actions.ts:30-38 pattern: a single transaction that updates BOTH `public.users.role` AND `auth.users.raw_app_meta_data->>'role'`.

Keep the file a default no-op (the BEGIN/UPDATE/COMMIT block stays commented out so `apply-supabase-migrations.ts` records it without mutation, per the existing comment header).

Update the documented block to (substitute the email):

```sql
-- BEGIN;
--   UPDATE public.users
--   SET    role = 'ADMIN'
--   WHERE  email = 'admin@gignow.kr';
--
--   -- IMPORTANT: middleware reads JWT app_metadata.role (NOT public.users.role).
--   -- We MUST mirror the role into auth.users.raw_app_meta_data so that on the
--   -- user's NEXT login (or token refresh), the JWT carries app_metadata.role='ADMIN'.
--   -- This mirrors the runtime pattern in src/app/(auth)/role-select/actions.ts:30-38.
--   UPDATE auth.users
--   SET    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
--                              || jsonb_build_object('role', 'ADMIN')
--   WHERE  email = 'admin@gignow.kr';
-- COMMIT;
--
-- POST-PROMOTION: the promoted user MUST log out and log back in for the new
-- JWT claim to take effect. Without re-login, /admin will still redirect to /login
-- because the existing session token still carries the previous role (or no role).
```

Also update the HOW TO USE block to add a step:
- Add step "5. Tell the promoted user to log out and log back in (JWT refresh required)."

Keep the trailing `SELECT 1;` no-op.

Do NOT add a new migration file — modify the existing one in place (per constraints).
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('supabase/migrations/20260414000005_phase6_admin_seed.sql','utf8'); if(!s.includes('raw_app_meta_data')) {console.error('FAIL: raw_app_meta_data not present'); process.exit(1)}; if(!s.includes('SELECT 1;')) {console.error('FAIL: no-op SELECT 1 missing'); process.exit(1)}; if(!s.match(/log out and log back in/i)) {console.error('FAIL: re-login note missing'); process.exit(1)}; console.log('OK')"</automated>
  </verify>
  <done>
File contains the mirrored UPDATE for auth.users.raw_app_meta_data alongside the public.users update, both inside the (still-commented) BEGIN/COMMIT block. No-op `SELECT 1;` retained at the bottom. Re-login instruction added to HOW TO USE.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2 (Issue 2, HIGH): Remove verified=true side-effect from format validation; only OCR match flips verified</name>
  <files>src/app/biz/profile/actions.ts, src/app/biz/signup/actions.ts, src/app/biz/verify/actions.ts</files>
  <action>
Three files. The semantic rule across all three: **`verified=true` is set ONLY when OCR successfully matches the stored regNumber (verify/actions.ts D-33 success branch). Format validity alone (regex pass) NEVER flips `verified` to true.**

**File 1: `src/app/biz/profile/actions.ts` (lines 130-167):**
- Remove the auto-set `verifiedUpdate = true` on the regex-pass branch.
- Keep the explicit clear: when `rawReg === ''` (user wiped the field), still set `verifiedUpdate = false` and `normalizedRegNumber = null` — clearing the regNumber MUST revoke verification (otherwise stale `verified=true` persists with no number).
- Result: the only paths that touch `verified` are (a) explicit clear → false. The regex-pass-with-value path now leaves `verified` unchanged.
- Update the inline comment block (currently "D-30: Determine verified state...") to read: "verified is NOT auto-set here — it flips true only via OCR match in /biz/verify (D-33). Clearing the regNumber still revokes verified=false to prevent stale trust."
- Spread `...(verifiedUpdate !== undefined && { verified: verifiedUpdate })` stays — it's now only triggered on the clear branch.

**File 2: `src/app/biz/signup/actions.ts` (lines 60-67, the `verifyBusinessRegNumber` action):**
- Change the `prisma.businessProfile.update` data block to write ONLY `businessRegNumber: digitOnly`. Remove the `verified: true` line entirely (and remove the `// D-30 auto-approve` trailing comment).
- Update the JSDoc header (lines 10-12) — replace:
  - "Writes digit-only regNumber to businessRegNumber column" stays
  - DELETE the line: "Sets verified=true atomically (D-30)"
  - ADD: "Does NOT set verified=true — verification requires OCR match in /biz/verify (D-33)."

**File 3: `src/app/biz/verify/actions.ts` (lines 89-111, the OCR comparison block):**
- This file is correct in shape but currently does NOT set `verified=true` on the OCR-match branch. We need to ADD it.
- In the OCR `match` branch (around line 96), update the existing reset (currently the "stays false" comment branch) to also set `verified: true`. Replace the bare comment with a real prisma.update:
  ```typescript
  if (stored && result.candidateRegNumbers.includes(stored)) {
    ocr = 'matched'
    // D-33 success: OCR-confirmed → flip verified=true. This is the ONLY
    // path that auto-sets verified (regex format alone is insufficient — see
    // /biz/profile/actions.ts and /biz/signup/actions.ts).
    await prisma.businessProfile.update({
      where: { id: business.id },
      data: { verified: true },
    })
  } else {
    ocr = 'mismatched'
    // ... existing mismatch update (regNumberOcrMismatched: true) — DO NOT touch verified here.
  }
  ```
- Leave the mismatch branch exactly as-is (it sets `regNumberOcrMismatched: true` and intentionally does NOT touch `verified`).
- Update the file's top-level JSDoc bullet (around line 14) — change "Match → regNumberOcrMismatched stays false, return { ok:true, ocr:'matched' }" to "Match → set verified=true AND regNumberOcrMismatched stays false, return { ok:true, ocr:'matched' } (D-33 success path)".

**Do NOT touch:**
- `businessRegNumber` storage / normalization (D-30 normalization preserved).
- `regNumberOcrMismatched` reset-on-reupload (line 83) — unchanged.
- The verified badge consumers (`src/app/biz/page.tsx:78`, `src/app/(worker)/posts/[id]/apply/apply-confirm-flow.tsx:205`) — they correctly read `business.verified`; the semantic of that field is what we're hardening.
- Do NOT add a `verifiedAt` column (explicitly out of scope).

Korean UI: no user-facing strings change in any of the three files.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(profile/actions|signup/actions|verify/actions)\.ts" | head -20; node -e "const fs=require('fs'); const a=fs.readFileSync('src/app/biz/signup/actions.ts','utf8'); if(a.match(/verified:\s*true/)) {console.error('FAIL: signup/actions.ts still sets verified=true'); process.exit(1)}; const b=fs.readFileSync('src/app/biz/profile/actions.ts','utf8'); if(b.match(/verifiedUpdate\s*=\s*true/)) {console.error('FAIL: profile/actions.ts still auto-sets verifiedUpdate=true'); process.exit(1)}; const c=fs.readFileSync('src/app/biz/verify/actions.ts','utf8'); if(!c.match(/verified:\s*true/)) {console.error('FAIL: verify/actions.ts does NOT set verified=true on OCR match'); process.exit(1)}; console.log('OK: verified semantic correct in all 3 files')"</automated>
  </verify>
  <done>
- `signup/actions.ts` no longer sets `verified: true` (regex-pass path is storage-only).
- `profile/actions.ts` no longer auto-sets `verifiedUpdate = true` on regex pass; clear-to-empty still revokes (`verified: false`).
- `verify/actions.ts` OCR-match branch now writes `verified: true` via prisma.update; mismatch branch unchanged.
- All three JSDoc/inline comments updated to reflect the new semantic.
- `tsc --noEmit` reports no new errors in these files.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3 (Issue 3, MEDIUM): /biz/verify accepts ?businessId= param; createJob redirect carries it</name>
  <files>src/app/biz/verify/page.tsx, src/app/biz/posts/actions.ts</files>
  <action>
**File 1: `src/app/biz/verify/page.tsx` (lines 19-43):**

Change the page signature to accept Next 16 App Router `searchParams` (Promise-shaped per Next 16 conventions — verify against `node_modules/next/dist/docs/` if uncertain):

```typescript
export default async function BizVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const session = await requireBusiness()
  const params = await searchParams
  const requestedId = params.businessId?.trim()

  // UUID guard — drop garbage silently and fall back to findFirst behavior
  const isValidUuid = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId)

  let business
  if (isValidUuid) {
    // Targeted: load the requested profile, RE-VERIFY ownership (requireBusiness
    // already gated role; userId match prevents A→B's profile cross-tenant access)
    business = await prisma.businessProfile.findFirst({
      where: { id: requestedId, userId: session.id },
      select: {
        id: true,
        businessRegNumber: true,
        businessRegImageUrl: true,
        regNumberOcrMismatched: true,
        verified: true,
      },
    })
  } else {
    // Fallback: original behavior — oldest profile for this user
    business = await prisma.businessProfile.findFirst({
      where: { userId: session.id },
      select: {
        id: true,
        businessRegNumber: true,
        businessRegImageUrl: true,
        regNumberOcrMismatched: true,
        verified: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!business) {
    return ( /* unchanged "no profile" UI */ )
  }
  // ... rest of file unchanged
}
```

The hidden `<input name="businessId" value={business.id} />` is already in the form (line 120) and works correctly.

**File 2: `src/app/biz/posts/actions.ts` (lines 218-226):**

In `createJob`, the existing D-31 image gate returns `{ error: 'verify_required', redirectTo: '/biz/verify' as const }`. Change the `redirectTo` to include the businessId query param:

```typescript
if (!business.businessRegImageUrl) {
  return {
    error: "verify_required",
    redirectTo: `/biz/verify?businessId=${d.businessId}` as const,
  };
}
```

Note: `redirectTo` is typed as `string` in `JobFormState` (per the interfaces block above), so a template-literal string is type-compatible. The `as const` is preserved for parity with the existing line; if TS complains, drop it (template literals can't always be widened to a literal type).

**Do NOT touch:**
- The hidden form input in verify/page.tsx (already correct).
- The applicants page or any other consumer.
- Korean UI strings.

Edge cases handled:
- Garbage / non-UUID `?businessId=` → silently falls back to oldest (no info disclosure, no error spam).
- `?businessId=` for a profile owned by a DIFFERENT user → `findFirst` with `userId: session.id` returns null → "등록된 사업장 프로필이 없습니다" UI shows. Acceptable — does not leak existence of other-user data.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(verify/page|posts/actions)\.ts" | head -20; node -e "const fs=require('fs'); const a=fs.readFileSync('src/app/biz/verify/page.tsx','utf8'); if(!a.includes('searchParams')) {console.error('FAIL: page.tsx missing searchParams'); process.exit(1)}; if(!a.match(/businessId\?:/)) {console.error('FAIL: page.tsx missing businessId param type'); process.exit(1)}; const b=fs.readFileSync('src/app/biz/posts/actions.ts','utf8'); if(!b.match(/\\/biz\\/verify\\?businessId=/)) {console.error('FAIL: createJob redirectTo does not include businessId'); process.exit(1)}; console.log('OK: multi-business verify wired')"</automated>
  </verify>
  <done>
- `/biz/verify` page accepts optional `?businessId=` param; loads that specific profile (with userId ownership re-check) when valid; falls back to oldest profile otherwise.
- `createJob` D-31 gate redirects to `/biz/verify?businessId=<id>` so the multi-business owner lands on the BLOCKED profile, not the oldest one.
- UUID-guarded — invalid param degrades silently to fallback.
- `tsc --noEmit` clean for both files.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4 (Issue 4, MEDIUM): Composite cursor for rate_* sorts + regression test</name>
  <files>src/lib/db/admin-queries.ts, src/lib/db/__tests__/admin-queries-rate-cursor.test.ts</files>
  <behavior>
    - Test 1 (rate_desc page boundary): seed 5 businesses with commissionRate values [0.10, 0.08, NULL, 0.05, NULL], page through with limit=2; assert page1=[0.10, 0.08], page2=[0.05] then NULLs (NULLs last per current orderBy), page3 = remaining NULLs. No id appears in two pages; total returned = 5 unique ids.
    - Test 2 (rate_asc with ties): seed 4 businesses, two sharing commissionRate=0.05, paginate with limit=2; assert tie-breaker uses (createdAt, id) deterministically and no duplication across pages.
    - Test 3 (cursor decode rejects malformed): pass cursor missing the rate prefix → query treats it as no-cursor (first page) rather than throwing.
  </behavior>
  <action>
**File 1: `src/lib/db/admin-queries.ts`**

The bug: `ORDER BY (commissionRate, createdAt, id)` but cursor filter uses ONLY `(createdAt, id)`. On page 2+ this skips and duplicates rows because Postgres breaks ties on commissionRate, but the cursor WHERE doesn't match that ordering.

Fix (option b from task brief — the correct one): composite cursor that includes commissionRate.

**Cursor format change:**
- Old: `"{createdAtISO}_{uuid}"` for ALL sorts
- New: keep that for created_* sorts, add `"r:{rateOrNULL}_{createdAtISO}_{uuid}"` for rate_* sorts. Prefix `r:` distinguishes the two encodings (back-compat: any cursor without `r:` decodes as the old created-only format, used only by created_* sorts).

**Implement:**

1. Add a new encode/decode pair next to the existing ones:

```typescript
// Composite cursor for rate_* sorts: rate (Decimal | null) + createdAt + id
function encodeRateCursor(row: {
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  id: string
}): string {
  const rateStr = row.commissionRate === null ? 'NULL' : row.commissionRate.toString()
  return `r:${rateStr}_${row.createdAt.toISOString()}_${row.id}`
}

function decodeRateCursor(cursor: string): {
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  id: string
} | null {
  if (!cursor.startsWith('r:')) return null
  const body = cursor.slice(2)
  // Find the FIRST underscore (separates rate from createdAtISO).
  // Rate is either 'NULL' or a decimal like '0.0500' — neither contains underscore.
  const firstUnderscore = body.indexOf('_')
  if (firstUnderscore === -1) return null
  const ratePart = body.slice(0, firstUnderscore)
  const rest = body.slice(firstUnderscore + 1)
  // Reuse decodeCursor logic for the rest
  const restDecoded = decodeCursor(rest)
  if (!restDecoded) return null
  let commissionRate: Prisma.Decimal | null
  if (ratePart === 'NULL') {
    commissionRate = null
  } else {
    try {
      commissionRate = new Prisma.Decimal(ratePart)
    } catch {
      return null
    }
  }
  return { commissionRate, createdAt: restDecoded.createdAt, id: restDecoded.id }
}
```

2. Branch cursor decoding by sort type. Replace the current `decoded`/`cursorWhere` block (lines 126-146) with:

```typescript
const isRateSort = sort === 'rate_desc' || sort === 'rate_asc'
const isAsc = sort === 'created_asc' || sort === 'rate_asc'

let cursorWhere: Prisma.BusinessProfileWhereInput | undefined

if (args.cursor) {
  if (isRateSort) {
    const dec = decodeRateCursor(args.cursor)
    if (dec) {
      // ORDER BY commissionRate {sort} NULLS LAST, createdAt {sort}, id {sort}
      // Tuple comparison in Prisma form. NULLS LAST means:
      //   - desc: non-null > null, so 'next page after non-null' includes
      //     anything strictly less in rate, OR equal rate with later (createdAt,id),
      //     OR null rates (which sort after).
      //   - asc:  non-null < null, mirror.
      // Rather than encode all 6 sub-cases, we do the practical thing:
      //   - If cursor's rate is non-null:
      //       desc: next page = (rate < cursorRate) OR (rate = cursorRate AND tuple<) OR (rate IS NULL)
      //       asc : next page = (rate > cursorRate) OR (rate = cursorRate AND tuple>) OR (rate IS NULL)
      //   - If cursor's rate is null (we're already in the NULL-tail page):
      //       both: next page = (rate IS NULL) AND tuple comparison

      if (dec.commissionRate === null) {
        // We're in the NULL tail — paginate by (createdAt, id) only, within nulls
        cursorWhere = {
          commissionRate: null,
          OR: isAsc
            ? [
                { createdAt: { gt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { gt: dec.id } },
              ]
            : [
                { createdAt: { lt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { lt: dec.id } },
              ],
        }
      } else {
        const rateCmp = isAsc ? { gt: dec.commissionRate } : { lt: dec.commissionRate }
        const tupleCmp = isAsc
          ? [
              { createdAt: { gt: dec.createdAt } },
              { createdAt: dec.createdAt, id: { gt: dec.id } },
            ]
          : [
              { createdAt: { lt: dec.createdAt } },
              { createdAt: dec.createdAt, id: { lt: dec.id } },
            ]
        cursorWhere = {
          OR: [
            { commissionRate: rateCmp },
            { commissionRate: dec.commissionRate, OR: tupleCmp },
            { commissionRate: null }, // NULLS LAST → always after non-null page
          ],
        }
      }
    }
  } else {
    const dec = decodeCursor(args.cursor)
    if (dec) {
      cursorWhere = isAsc
        ? {
            OR: [
              { createdAt: { gt: dec.createdAt } },
              { createdAt: dec.createdAt, id: { gt: dec.id } },
            ],
          }
        : {
            OR: [
              { createdAt: { lt: dec.createdAt } },
              { createdAt: dec.createdAt, id: { lt: dec.id } },
            ],
          }
    }
  }
}
```

3. Update `nextCursor` emission to pick the correct encoder based on sort:

```typescript
const nextCursor =
  hasMore && items.length > 0
    ? (isRateSort
        ? encodeRateCursor(items[items.length - 1])
        : encodeCursor(items[items.length - 1]))
    : null
```

4. Update the comment block above the cursor section (currently "rate_* sorts still cursor on createdAt+id for stability") — replace with: "rate_* sorts use composite (commissionRate, createdAt, id) cursor; created_* sorts use (createdAt, id). Encoder/decoder selected by sort type."

**File 2: `src/lib/db/__tests__/admin-queries-rate-cursor.test.ts` (NEW)**

Create a unit test using the project's existing test runner (check `package.json` test script — likely vitest or jest based on ESM/Next 16 conventions; if no test runner is configured, create the test file using `vitest` syntax — `describe`/`it`/`expect` — since vitest has near-zero setup cost; if `package.json` has no `test` script, add a TODO comment in the file header noting "Run with: npx vitest run src/lib/db/__tests__/admin-queries-rate-cursor.test.ts" and DO NOT add vitest as a dependency — leave the test file as documentation for now since constraints forbid new npm packages).

Behavior to cover (from <behavior> block above):

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest' // or jest
import { prisma } from '@/lib/db'
import { getBusinessesPaginated } from '@/lib/db/admin-queries'

describe('getBusinessesPaginated rate_* cursor', () => {
  // Seed 5 BusinessProfiles with controlled commissionRate values.
  // Use a unique name prefix like 'CURSOR_TEST_' to allow targeted cleanup.
  // Skip if no DATABASE_URL.

  beforeAll(async () => { /* seed: rates [0.10, 0.08, null, 0.05, null] */ })
  afterAll(async () => { /* delete WHERE name LIKE 'CURSOR_TEST_%' */ })

  it('rate_desc paginates without skip or duplication across NULL boundary', async () => {
    const seen = new Set<string>()
    let cursor: string | null = null
    let pages = 0
    do {
      const { items, nextCursor } = await getBusinessesPaginated({
        sort: 'rate_desc', limit: 2, cursor,
        // narrow to test seed only
        q: 'CURSOR_TEST_', field: 'name',
      })
      for (const it of items) {
        expect(seen.has(it.id)).toBe(false) // no duplication
        seen.add(it.id)
      }
      cursor = nextCursor
      pages++
    } while (cursor && pages < 10)
    expect(seen.size).toBe(5) // no skip
  })

  it('rate_asc tie-break is deterministic', async () => {
    // similar pattern with two rows sharing commissionRate=0.05
  })

  it('malformed cursor degrades to first page (no throw)', async () => {
    const { items } = await getBusinessesPaginated({
      sort: 'rate_desc', limit: 2, cursor: 'garbage_no_prefix',
      q: 'CURSOR_TEST_', field: 'name',
    })
    expect(Array.isArray(items)).toBe(true)
  })
})
```

If no test runner is configured in `package.json`, write the file BUT add this header comment at the top:

```typescript
/**
 * Regression test for Issue 4 (Codex finding) — admin-queries rate_* cursor.
 *
 * NO TEST RUNNER CONFIGURED in package.json as of this commit. To run, install
 * vitest dev-only (out of scope for this quick task — adds new dep) or run
 * the test logic manually via `npx tsx <this-file-path>` after wiring a tiny
 * harness. Documented here so a future test infra task can wire it up.
 */
```

Then still write the test code (it documents intent even if not executed automatically). This satisfies the "include a brief unit test" requirement from the task brief without violating the "no new npm packages" constraint.
  </action>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "admin-queries" | head -20; node -e "const fs=require('fs'); const a=fs.readFileSync('src/lib/db/admin-queries.ts','utf8'); if(!a.includes('encodeRateCursor')) {console.error('FAIL: encodeRateCursor not added'); process.exit(1)}; if(!a.includes('decodeRateCursor')) {console.error('FAIL: decodeRateCursor not added'); process.exit(1)}; if(!a.match(/r:\\\$\\{/)) {console.error('NOTE: r: prefix template literal check skipped (regex weak); manual review'); }; const b=fs.readFileSync('src/lib/db/__tests__/admin-queries-rate-cursor.test.ts','utf8'); if(!b.match(/rate_desc/)) {console.error('FAIL: regression test missing rate_desc case'); process.exit(1)}; console.log('OK: rate cursor fix + regression test in place')"</automated>
  </verify>
  <done>
- `admin-queries.ts` adds `encodeRateCursor`/`decodeRateCursor` with `r:` prefix; cursor selection branches by `isRateSort`; rate_* tuple comparison correctly handles NULL-tail page and non-null pages.
- created_* sort behavior unchanged (back-compat with existing cursors via `decodeCursor`).
- New test file `src/lib/db/__tests__/admin-queries-rate-cursor.test.ts` documents 3 regression cases; runnable if a test runner gets wired up later (no new npm packages added per constraints).
- `tsc --noEmit` clean for both files.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| anonymous → /admin | Middleware (`src/lib/supabase/middleware.ts`) reads JWT app_metadata.role. Issue 1 ensures the seed actually populates the JWT-readable claim. |
| business user → other businesses' /biz/verify | `findFirst({ id: requestedId, userId: session.id })` (Issue 3) prevents cross-tenant verify-state read/write. |
| worker → biz verified badge | `business.verified` semantic (Issue 2) — false-positive trust signal removed; badge now reflects OCR-confirmed state only. |
| admin user → business list pagination | `getBusinessesPaginated` (Issue 4) — pagination correctness, not a security boundary, but bug could mask records during admin review. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260413-upw-01 | Elevation of Privilege | Admin seed migration | mitigate | Issue 1 — seed updates BOTH auth.users.raw_app_meta_data AND public.users.role so middleware JWT check sees ADMIN; documented re-login requirement. |
| T-260413-upw-02 | Spoofing (false trust signal) | BusinessProfile.verified shown to workers in apply-confirm-flow.tsx and biz/page.tsx | mitigate | Issue 2 — `verified=true` only set on OCR match (D-33), not on regex format alone. Removes false ShieldCheck badge for unverified businesses. |
| T-260413-upw-03 | Information Disclosure / IDOR | /biz/verify accepting ?businessId= | mitigate | Issue 3 — server re-runs `findFirst({ id, userId: session.id })` so a malicious businessId param targeting another user's profile silently returns null (degrades to "no profile" UI without confirming existence). UUID format pre-check drops garbage. |
| T-260413-upw-04 | Tampering / Information Disclosure (admin pagination) | getBusinessesPaginated rate_* cursor | mitigate | Issue 4 — composite cursor (commissionRate, createdAt, id) prevents skipping rows during admin review (could otherwise mask a problematic business profile from review by ordering luck). |
| T-260413-upw-05 | Repudiation | Admin promotion via direct SQL | accept | Out of scope for this quick task. The seed migration is operator-run; audit trail lives in operator's command history. v2 admin invite flow (deferred per constraints) will add structured logging. |
</threat_model>

<verification>
After all 4 tasks complete, the following must hold:

1. **`grep -rn "verified:\s*true" src/app/biz/`** returns matches ONLY in `src/app/biz/verify/actions.ts` (the OCR-match branch). signup/actions.ts and profile/actions.ts MUST NOT contain `verified: true`.
2. **`grep "raw_app_meta_data" supabase/migrations/20260414000005_phase6_admin_seed.sql`** returns a match.
3. **`grep "businessId=" src/app/biz/posts/actions.ts`** returns the redirect line.
4. **`grep -E "encodeRateCursor|decodeRateCursor" src/lib/db/admin-queries.ts`** returns 4+ matches (definitions + usages).
5. **`npx tsc --noEmit -p tsconfig.json`** completes without NEW errors in any of the 7 modified source files.
6. **Manual smoke (out of band, not blocking commit):** start dev server, log in as a multi-business user with one blocked profile, click "공고 등록" → confirm redirect URL contains `?businessId=` of the blocked profile, not the oldest one.

Atomic commits: 4 separate commits, one per task, in order Task 1 → 2 → 3 → 4.
</verification>

<success_criteria>
- 4 atomic commits land on master, one per Codex finding, in task order.
- `verified=true` semantic is correct: OCR match is the ONLY auto-promotion path; regex format alone never flips it.
- Admin seed file is self-documenting and produces a working ADMIN promotion (operator runs the uncommented block in Supabase SQL editor + asks user to re-login).
- Multi-business owners can land on `/biz/verify?businessId=<their blocked profile>` from createJob and see the right profile's state.
- `getBusinessesPaginated` rate_desc/rate_asc returns no duplicate or skipped rows across pages, including the non-null → null transition.
- No new npm dependencies. Korean UI text unchanged. No v2 scope (no verifiedAt, no OCR provider work, no admin invite UI, no new migrations).
</success_criteria>

<output>
After completion, create `.planning/quick/260413-upw-codex-adversarial-review-4-findings-admi/260413-upw-SUMMARY.md` documenting:
- Each commit hash + Codex finding it closes
- Verification command outputs
- Any deviations from the plan (e.g., test runner status for Task 4)
- Re-login note for Issue 1 promoted accounts
</output>
