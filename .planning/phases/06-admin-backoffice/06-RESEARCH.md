# Phase 6: Admin Backoffice — Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router admin console + Prisma/Postgres schema extension + Supabase Storage bucket + external OCR (Naver CLOVA) + settlement commission snapshot
**Confidence:** HIGH for stack/patterns (well-established in phases 2–5); MEDIUM for CLOVA OCR specifics (verified against purecode.tistory.com/2 + ncloud docs, but no in-repo precedent)

## Summary

Phase 6 is almost entirely an application of patterns that already live in this codebase. The 17 locked decisions collapse to five concrete work streams: (1) a new `/admin` route group mirroring `/biz`'s layout + DAL pattern, (2) five nullable columns added to `BusinessProfile` via direct SQL (Phase 5 D-25 precedent — `prisma db push` conflicts with `_supabase_migrations`), (3) a new `business-reg-docs` Supabase Storage bucket with owner+ADMIN-only RLS (Phase 3 avatars precedent), (4) a CLOVA OCR call site behind a Server Action that gracefully degrades per D-33, and (5) a one-line commission snapshot insertion into the Phase 5 `checkOut` Server Action.

**Primary recommendation:** Execute strictly in this order: **schema + storage migration → DAL (`requireAdmin`) + routing + middleware → admin list/detail UI (reusing `getJobsPaginated` cursor pattern) → verify-page rebuild with CLOVA OCR → `createJob` image-gate → `checkOut` commission snapshot.** Treat commission snapshot as a trailer task — it sits on a Phase 5 hot path and must ship with rollback safety.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin 라우팅·접근 모델**
- **D-27:** `/admin` 전용 루트. middleware에서 role=ADMIN 외 403(또는 /login?error=admin_required)
- **D-28:** 로그인 시 ADMIN 역할이면 `/admin`으로 자동 리다이렉트(기존 `/home`/`/biz` 분기에 ADMIN 우선 분기 추가)
- **D-29:** Admin 내비게이션은 /biz 사이드바 재사용 금지 — `AdminSidebar` 별도 컴포넌트로 분리

**사업자 인증 게이트**
- **D-30:** 가입 시점에는 사업자등록번호 10자리만 입력(이미지 생략). 형식 통과 시 `verified=true` 자동 승인
- **D-31:** 공고 등록(첫 게시) 시 `businessRegImageUrl is null`이면 `/biz/verify` 로 리다이렉트
- **D-32:** 이미지 업로드 시 OCR로 regNumber 자동 추출 → 입력값 일치 확인 (Naver CLOVA OCR 스타일)
- **D-33:** OCR 실패·불일치여도 이미지 저장은 진행 — admin 재검토 플래그로만 기록(자동 거부 X)

**수수료 모델**
- **D-34:** 정산 시점 스냅샷. checkOut Server Action 에서 `gross → commission/net` 계산. 과거 settled 행은 불변
- **D-35:** 전역 기본 수수료율 0% 초기 시작. 환경변수 vs config 테이블 — research 에서 결정
- **D-36:** `commissionRate` Decimal(5,2), nullable. null이면 전역 default 사용

**스키마 확장 (D-37)** BusinessProfile + 5 nullable: businessRegNumber, ownerName, ownerPhone, businessRegImageUrl, commissionRate

**D-38:** Supabase Storage 버킷 `business-reg-docs`. RLS: owner + ADMIN만 read. uploader는 소유자만
**D-39:** 기존 `verified: Boolean` 재사용 — D-30 자동 승인 토글
**D-40..43:** 검색 4필드, verified 필터, createdAt/commissionRate 정렬, 커서 페이지네이션 20건

### Claude's Discretion
- `/admin` 레이아웃 세부(사이드바 vs 탑바), Admin 대시보드 첫 카드 구성
- Admin 수수료 입력 UI 형태
- OCR 실패 시 카피
- business-reg-docs RLS policy 세부 SQL
- 검색 debounce, 빈 결과 플레이스홀더

### Deferred Ideas (OUT OF SCOPE)
- Admin 사업장 ban/suspend, Admin 워커 관리 화면, 감사 추적, OCR 자동 거부 플로우, Toss 실결제/원천징수, Admin 초대 UI, 수수료 이력 테이블 — **모두 v2. 본 phase에서 구현 금지.**

## Phase Requirements

CONTEXT.md 는 이 phase 에 v1 REQUIREMENTS.md ID 를 매핑하지 않는다. Phase 6는 v1 43 요구사항을 모두 충족한 이후 추가된 **operational-extension phase** 이며, 고유 decision ID (D-27..D-43) 가 작업 단위다. 요구사항 매트릭스는 discuss-phase 의 17 decisions 가 곧 "REQ-" 이다.

## Project Constraints (from CLAUDE.md / AGENTS.md)

| Directive | Source | Phase-6 impact |
|-----------|--------|----------------|
| Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` before writing code | AGENTS.md | Verify Route Group + Server Action multipart patterns before finalizing OCR call site |
| Supabase Auth only (Clerk/NextAuth 금지) | CLAUDE.md constraints | `requireAdmin()` must read from `public.users.role` via Prisma, mirroring `verifySession` — do NOT introduce a separate admin auth |
| Mock removal SSOT | CLAUDE.md | Phase 6 must NOT re-introduce `src/lib/mock-data.ts` imports. The rebuild of `src/app/biz/verify/page.tsx` currently uses `MOCK_OCR_RESULT` — that must disappear with this phase |
| Korean UI, oklch brand colors, no off-brand colors | CLAUDE.md | AdminSidebar must use the same `bg-brand` / `text-teal` tokens as BizSidebar; no new color scale |
| File naming kebab-case, Server Actions `*-actions.ts`, server components by default | conventions | `src/app/admin/.../actions.ts`, `admin-sidebar.tsx`, etc. |
| Zod + `firstFieldError` pattern | conventions | Admin search form + commission edit action follow `src/app/biz/posts/actions.ts` pattern |

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `business_profiles` rows have `verified=false` and no regNumber. **D-30 말하는 "자동 승인"은 forward-only** — 기존 row 는 regNumber null 이므로 계속 unverified. 따로 백필할 필요 없음 | None — existing rows remain unverified until user provides regNumber via profile edit path |
| Live service config | None — no external service has "business" identity cached by name | None |
| OS-registered state | None | None |
| Secrets / env vars | **NEW** `CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL` to be added to `.env.local` + Vercel. **NEW** `PLATFORM_DEFAULT_COMMISSION_RATE` (e.g. "0.00") if env-var route chosen (see recommendation below). Existing `DATABASE_URL`, `DIRECT_URL`, Supabase keys unchanged | Add to `.env.example` and document in `.planning/codebase/INTEGRATIONS.md` |
| Build artifacts / installed packages | `src/generated/prisma/` is gitignored. After schema edit to BusinessProfile, `npx prisma generate` required (known STATE.md drift warning: Phase 3 had this exact issue). No package.json additions — fetch is native | Run `npx prisma generate` as part of schema task; no npm install needed |

## Standard Stack

### Core (already installed — zero new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | App Router route group `src/app/admin/` | Existing biz/worker groups use identical pattern |
| @prisma/client + prisma | 7.5.0 | Schema extension + generated types | All phases use this single client |
| @supabase/ssr | (installed) | Storage upload via server client | Phase 3 avatar path (`src/lib/supabase/storage.ts`) is the template |
| zod | ^4.3.6 | Regnumber format + search input + commission rate parse | Per-action `firstFieldError` helper in `src/app/biz/posts/actions.ts` is the template |
| pg | ^8.20.0 | Direct-SQL migration via `scripts/apply-supabase-migrations.ts` | Phase 5 D-25 established this is MANDATORY (not `prisma db push`) for enum/policy changes on this Supabase project |

### No external library needed for CLOVA OCR
The CLOVA endpoint is a single POST with `X-OCR-SECRET` header + `multipart/form-data`. Native `fetch` + `FormData` (both available in Node 20 / Next.js 16 Server Actions) suffice. **Do NOT add axios, node-fetch, or a CLOVA SDK.** `[CITED: https://purecode.tistory.com/2]` `[CITED: https://api.ncloud-docs.com/docs/en/ai-application-service-ocr]`

### Installation
None. Phase 6 introduces zero package.json changes.

## Architecture Patterns

### Recommended File Structure

```
src/app/admin/
├── layout.tsx                       # requireAdmin() + <AdminSidebar/>
├── page.tsx                         # Dashboard — counts (verified / unverified / total)
├── businesses/
│   ├── page.tsx                     # list (search + filter + sort + cursor paginate)
│   ├── businesses-client.tsx        # URL-as-source-of-truth filter bar
│   └── [id]/
│       ├── page.tsx                 # readonly detail (owner info + regImg viewer)
│       └── actions.ts               # updateCommissionRate Server Action
└── admin-sidebar.tsx                # new component per D-29

src/lib/
├── auth/routing.ts                  # ADMIN branch additions (see below)
├── dal.ts                           # add requireAdmin()
├── supabase/
│   ├── middleware.ts                # admin gate insertion
│   └── storage-biz-reg.ts           # NEW — mirrors storage.ts but for business-reg-docs bucket
├── ocr/
│   └── clova.ts                     # NEW — thin fetch wrapper + response parser + error taxonomy
└── commission.ts                    # NEW — getEffectiveRate(businessProfile, defaultRate) + snapshot helper

supabase/migrations/
├── 20260414000001_phase6_business_profile_extension.sql
├── 20260414000002_phase6_storage_business_reg_docs.sql
└── 20260414000003_phase6_business_profile_indexes.sql
```

### Pattern 1: Route group + layout guard

`src/app/biz/layout.tsx` shows the canonical two-layer gate (middleware + DAL). `/admin` copies verbatim, swapping `requireBusiness` → `requireAdmin`. **No change to proxy.ts or middleware of substance beyond adding one branch** — `canRoleAccessPath` already defaults to "ADMIN can access everything" (`src/lib/auth/routing.ts:54`), which creates a subtle bug we must fix: **currently an ADMIN user hitting `/biz` passes through fine, which we WANT; but `getDefaultPathForRole(ADMIN) === '/biz'` which we DON'T want post-D-28.** Edit one line, add one branch — see implementation sketches below.

### Pattern 2: Admin cursor pagination — reuse verbatim

`src/lib/db/queries.ts:619 getJobsPaginated` is the template. Decode cursor as `(createdAt ISO)_{uuid}`, tuple-compare in raw SQL, return `{items, nextCursor}`. For BusinessProfile list, 다른 점은 단 두 가지: (a) no PostGIS distance join, (b) ILIKE search + ORDER BY `createdAt` vs `commissionRate` switch. Secondary sort column tuple cursor stays on `(createdAt, id)` regardless of primary sort (the tuple is for uniqueness, not ordering), **OR** when user sorts by commissionRate, cursor becomes `(commissionRate, createdAt, id)` triple. Recommend simpler approach: **always cursor on `(createdAt, id)` even when sorting by commissionRate** — acceptable because commissionRate ties are rare (Decimal(5,2), mostly null) and the createdAt tiebreaker keeps results stable. If planner decides exact strict ordering matters, upgrade to triple tuple.

### Pattern 3: URL-as-source-of-truth filter bar

`src/components/worker/home-filter-bar.tsx:53-70` — `useRouter().replace(pathname + '?' + params)` inside `useTransition`. Copy verbatim for admin list. Query schema:

```
/admin/businesses?q=키워드&field=name|reg|owner|phone&verified=all|yes|no&sort=created_desc|created_asc|rate_desc|rate_asc&cursor=...
```

### Pattern 4: Server Action form validation

`src/app/biz/posts/actions.ts:121-133 firstFieldError` + Zod `safeParse` + return `{error, fieldErrors}` object. No new pattern for Phase 6.

### Pattern 5: Supabase Storage upload

`src/app/(worker)/my/profile/edit/actions.ts:119-158 uploadAvatar` + `src/lib/supabase/storage.ts:41-78 uploadAvatarFile`. Mirror for `business-reg-docs`:
- Bucket: `business-reg-docs` (NEW, **not** `public` — different RLS — private bucket)
- Path: `business-reg-docs/{userId}/{businessId}.{ext}`
- MIME allowlist: `image/jpeg`, `image/png`, `application/pdf`
- Size: ≤ 10MB (higher than avatar 5MB since 사업자등록증 PDFs can be dense)
- `upsert: true` (re-upload overwrites)
- **Public URL strategy: do NOT use `getPublicUrl` — bucket is private. Generate signed URLs via `createSignedUrl(path, 60*60)` when admin views the image.** Store only the path in `businessRegImageUrl`, generate signed URL at read time.

### Pattern 6: Direct-SQL migration (Phase 5 D-25 precedent)

`prisma db push` on this Supabase project trips `_supabase_migrations` data-loss warning. Phase 5 `20260413000001_phase5_settled_enum_and_review_count.sql` solved this via direct-SQL file + `scripts/apply-supabase-migrations.ts`. Phase 6 does the same.

**BUT:** additive nullable columns on `BusinessProfile` are purely additive. `prisma db push` MAY work if Supabase's _supabase_migrations is quiet. **Recommendation: try `prisma db push` first (cheaper path), fall back to direct SQL if it prompts for destructive changes.** This matches how Plan 05-02 initially tried db push. If prisma edit on schema.prisma alone doesn't cover the index + location geography columns, direct SQL is required regardless.

**Caveat:** The `Unsupported("geography(Point, 4326)")` column on BusinessProfile cannot be created by prisma; Phase 3 migration `20260411000000_jobs_location_gist.sql` is the template. Phase 6 does NOT need to touch the geography column (no new geospatial feature), so this is not a concern.

### Anti-Patterns to Avoid
- **Hand-rolled OCR parser**: Don't parse `inferText` pixel-by-pixel regex. CLOVA returns a flat `images[0].fields[]` array for general, or `images[0].title.inferText` — extract whole block, normalize to digits-only, compare. Any 10-digit string matching `NNN-NN-NNNNN` after dash-strip is the candidate.
- **Client-side OCR call**: The CLOVA secret must never touch the browser. Upload → Server Action → Server Action calls CLOVA → writes URL + flag to DB.
- **Sync DB writes inside OCR try**: If OCR is down, the image upload must still succeed per D-33. Pattern: upload → DB write `businessRegImageUrl` → fire OCR (try/catch) → if OCR succeeds and regNumber matches, log success; if fails or mismatches, write an `admin_review_required` boolean (see "Schema tension" below). Do NOT abort on OCR failure.
- **Reusing public `avatars` bucket for reg docs**: D-38 explicitly says new bucket with restrictive RLS. The `public` bucket is world-readable — business registration certificates contain PII (owner name, RRN potentially) and MUST be private.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin role gate | Custom middleware check | `requireAdmin()` DAL helper + `canRoleAccessPath` extension | Phase 2-5 DAL pattern: one helper, cached via `React.cache`, consistent redirect errors |
| Cursor pagination | Offset + limit | `getJobsPaginated` template | Already handles edge cases: stable sort, empty next, tuple ordering |
| Storage bucket ACL | Application-layer auth check | RLS policy SQL on `storage.objects` | Phase 3 avatars migration proved this. App-layer checks can be bypassed via signed URLs; RLS is the last gate |
| OCR response parsing from images | Custom image preprocessing or Tesseract | CLOVA General OCR v2 endpoint | Korean business-license text is CLOVA's sweet spot; accuracy ≥ 99% per product docs |
| Commission rounding | ad-hoc `Math.round` with fp numbers | Prisma `Decimal` + `.mul().toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)` | Phase 5 already uses Prisma.Decimal in checkOut (line 214); same pattern |
| Phone number / regnumber digit normalization | Custom regex per call site | Small utility `normalizeDigits(s: string): string` in `src/lib/strings.ts` (or inline const) | One function, tested once, reused across search + OCR compare |

**Key insight:** Phase 6 is deliberately boring. Every axis has a precedent in phases 2-5. The ONLY net-new capability is the CLOVA OCR fetch. Treat this phase as integration work, not novel architecture.

## Common Pitfalls

### Pitfall 1: `canRoleAccessPath` + `getDefaultPathForRole` already route ADMIN to `/biz`
**What goes wrong:** `src/lib/auth/routing.ts:60` — `if (role === 'BUSINESS' || role === 'ADMIN') return '/biz'`. Post-D-28 this is a bug — ADMIN should land on `/admin`.
**Why it happens:** Author anticipated ADMIN might manage businesses; current test suite never asserted on ADMIN. Never caught.
**How to avoid:** Atomic one-line edit + add `/admin` to the `canRoleAccessPath` matrix. Unit test in Phase 6 Wave 0 asserting `getDefaultPathForRole('ADMIN') === '/admin'`.
**Warning signs:** Admin user lands on `/biz` after login instead of `/admin`.

### Pitfall 2: `_supabase_migrations` table causes `prisma db push` to refuse
**What goes wrong:** Plan 05-02 spent an execution session discovering this. `prisma db push` against a database with the `_supabase_migrations` bookkeeping table interprets the table's presence as "drift" and prompts for destructive reset.
**How to avoid:** Default to direct-SQL migration files applied via `scripts/apply-supabase-migrations.ts` (already exists, works). Only attempt `prisma db push` if the schema change is purely additive AND `DATABASE_URL` is the pooler (not direct). See Phase 5 Plan 02 SUMMARY.
**Warning signs:** `prisma db push` output mentions "data loss" when only adding nullable columns.

### Pitfall 3: `verified` flag semantic collision (D-30 vs D-31)
**What goes wrong:** D-30 says "regNumber format ok → `verified=true`". D-31 says "공고 등록하려면 이미지 있어야 함". If `verified=true` stays true even without image, the `verified` flag becomes useless as a "can post" indicator.
**Resolution (per CONTEXT.md reading):** The flag `verified` means **"사업자등록번호가 형식상 유효하다"** only. The post-gate in `createJob` is a **separate** condition: `businessRegImageUrl IS NOT NULL` AND (optionally) `verified=true`. Do NOT conflate. Recommendation: in `createJob`, check `business.businessRegImageUrl` directly — NOT `business.verified` — so the intent is explicit at the call site.
**Warning signs:** Plan revisions or code reviews confusingly toggling the same flag for two semantics.

### Pitfall 4: Phase 5 `checkOut` must not regress
**What goes wrong:** The commission snapshot is a 3-4 line addition inside an existing `$transaction` atop a battle-tested path. An off-by-one in rounding or reading `commissionRate` as `Number` (it's `Decimal`) silently produces wrong earnings.
**How to avoid:**
- Read `BusinessProfile.commissionRate` as `Prisma.Decimal | null`
- Multiply `gross` (which is `earnings` int in current code) by rate — using `Decimal.mul`
- Round explicitly: `commission = new Decimal(gross).mul(rate).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)`
- `net = gross - Number(commission)`
- **Do NOT change existing `earnings` field** — that stays as gross earnings per Phase 5 contract. Add NEW fields `commissionAmount` and `netEarnings` to `Application` (or a new `settlements` row). See schema tension below.
**Warning signs:** Phase 5 `tests/settlements/*.test.ts` turn red.

### Pitfall 5: CLOVA fetch timeout kills the request
**What goes wrong:** CLOVA can hang on large PDFs; default Next.js Server Action has no fetch timeout. User waits 30s and sees vague error.
**How to avoid:** `AbortController` with 15s timeout. On abort → write `businessRegImageUrl` still, skip OCR comparison, flag for admin review (D-33 spirit).
**Warning signs:** Production logs show Vercel function 504s on verify submission.

### Pitfall 6: Storage bucket signed URL in Server Component
**What goes wrong:** Supabase `createSignedUrl` must be called at request time; caching a signed URL across admin detail renders leaks stale tokens or returns 403.
**How to avoid:** Call `supabase.storage.from('business-reg-docs').createSignedUrl(path, 60*60)` inside the admin detail page's server component at every render. No client-side caching. `<img src={signedUrl}/>`.

### Pitfall 7: `businessProfiles` is an array on `User`
**What goes wrong:** `User.businessProfiles` is 1:N (see schema.prisma:75). Admin list operates on BusinessProfile rows directly, not User rows. createJob already finds BusinessProfile by `{id, userId}` — stick to that. The ownerPhone is on BusinessProfile (per D-37), NOT `User.phone`, to allow signup-user ≠ 대표자.
**Warning signs:** Plan accidentally reads `session.user.phone` for ownerPhone.

## Code Examples

### 1. `requireAdmin()` (mirror of `requireBusiness`)

```ts
// src/lib/dal.ts — append
export const requireAdmin = cache(async () => {
  const session = await verifySession()
  if (session.role !== 'ADMIN') {
    redirect('/login?error=admin_required')
  }
  return session
})
```

### 2. Routing patches

```ts
// src/lib/auth/routing.ts — surgical edits
const ADMIN_PREFIXES = ['/admin']

export function getRouteRequirement(path: string): RouteRequirement {
  if (ADMIN_PREFIXES.some((p) => startsWithSegment(path, p))) return 'admin'  // NEW
  // ...existing checks
}

export function canRoleAccessPath(role, path) {
  const requirement = getRouteRequirement(path)
  if (!requirement) return true
  if (!role) return false
  if (requirement === 'admin') return role === 'ADMIN'  // NEW — strict; ADMIN-only
  if (role === 'ADMIN') return true                     // ADMIN can access worker+biz (unchanged intent)
  if (role === 'BOTH') return true
  if (requirement === 'worker') return role === 'WORKER'
  return role === 'BUSINESS'
}

export function getDefaultPathForRole(role) {
  if (role === 'ADMIN') return '/admin'   // NEW — moved BEFORE BUSINESS branch
  if (role === 'BUSINESS') return '/biz'
  if (role === 'WORKER' || role === 'BOTH') return '/home'
  return '/role-select'
}
```

### 3. Middleware admin branch

```ts
// src/lib/supabase/middleware.ts — after existing worker/business blocks
if (requirement === 'admin' && role !== 'ADMIN') {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('error', 'admin_required')
  return NextResponse.redirect(url)
}
// Also update the `path === '/'` redirect:
if (user && path === '/') {
  const r = user.app_metadata?.role as AppRole | undefined
  url.pathname = r === 'ADMIN' ? '/admin' : (r === 'BUSINESS' ? '/biz' : '/home')
  return NextResponse.redirect(url)
}
```

### 4. `signInWithPassword` — ADMIN redirect

Already works via `getPostAuthRedirectPath(dbUser?.role, ...)` which calls `getDefaultPathForRole`. After fix #2 above, login → /admin is automatic. **Zero edit to `src/app/(auth)/login/actions.ts`.**

### 5. CLOVA OCR call site (new file)

```ts
// src/lib/ocr/clova.ts
import 'server-only'

type ClovaOcrResult =
  | { ok: true; fullText: string; candidateRegNumbers: string[] }
  | { ok: false; reason: 'timeout' | 'api_error' | 'unparseable' }

export async function runBizLicenseOcr(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ClovaOcrResult> {
  const url = process.env.CLOVA_OCR_API_URL
  const secret = process.env.CLOVA_OCR_SECRET
  if (!url || !secret) return { ok: false, reason: 'api_error' }

  const message = {
    version: 'V2',
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [{
      format: mimeType === 'application/pdf' ? 'pdf' : (mimeType === 'image/png' ? 'png' : 'jpg'),
      name: 'biz-license',
    }],
  }

  const form = new FormData()
  form.append('message', JSON.stringify(message))
  form.append('file', new Blob([fileBuffer], { type: mimeType }), 'biz-license')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-OCR-SECRET': secret },
      body: form,
      signal: ctrl.signal,
    })
    if (!res.ok) return { ok: false, reason: 'api_error' }
    const json = (await res.json()) as { images?: { fields?: { inferText?: string }[] }[] }
    const fields = json.images?.[0]?.fields ?? []
    const fullText = fields.map((f) => f.inferText ?? '').join(' ')
    const candidateRegNumbers = Array.from(
      fullText.matchAll(/\d{3}-?\d{2}-?\d{5}/g),
    ).map((m) => m[0].replace(/-/g, ''))
    return { ok: true, fullText, candidateRegNumbers }
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError')
      return { ok: false, reason: 'timeout' }
    return { ok: false, reason: 'api_error' }
  } finally {
    clearTimeout(timer)
  }
}
```
`[VERIFIED: fetch signature — MDN; AbortController pattern]` `[CITED: CLOVA v2 message schema — purecode.tistory.com/2]` `[ASSUMED: images[0].fields[].inferText field path; official docs reachable via ncloud-docs.com but blocked from webfetch parsing — planner should open https://api.ncloud-docs.com/docs/en/ocr-ocr-2-2 to double-check before execution]`

### 6. Storage bucket migration (private, owner + ADMIN read)

```sql
-- supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql

-- 1. Create private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-reg-docs',
  'business-reg-docs',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "biz_reg_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "biz_reg_admin_select" ON storage.objects;

-- Owner can INSERT/UPDATE their own folder (path: business-reg-docs/{userId}/{businessId}.{ext})
CREATE POLICY "biz_reg_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "biz_reg_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can read their own
CREATE POLICY "biz_reg_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ADMIN can read everything in this bucket
CREATE POLICY "biz_reg_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-reg-docs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

**Note on path:** `{userId}/{businessId}.{ext}` uses `foldername[1]` (1-based) — verified correct per Phase 3 avatars migration comment block.

### 7. Commission snapshot in checkOut

```ts
// src/app/(worker)/my/applications/[id]/check-in/actions.ts  — patch inside existing tx
// (around line 209-217)

const gross = earnings  // int, computed above
const business = await prisma.businessProfile.findUnique({
  where: { id: job.businessId },
  select: { commissionRate: true },
})
const defaultRate = new Prisma.Decimal(process.env.PLATFORM_DEFAULT_COMMISSION_RATE ?? '0')
const effectiveRate = business?.commissionRate ?? defaultRate  // Decimal
const commissionAmount = new Prisma.Decimal(gross)
  .mul(effectiveRate)
  .div(100)  // rate stored as percentage, e.g. 5.00 means 5%
  .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
const netEarnings = gross - Number(commissionAmount)

await prisma.application.update({
  where: { id: applicationId },
  data: {
    status: "settled",
    checkOutAt,
    actualHours: new Prisma.Decimal(actualHours),
    earnings,  // unchanged — gross
    commissionRate: effectiveRate,       // NEW column (see schema decision below)
    commissionAmount: Number(commissionAmount),  // NEW
    netEarnings,                          // NEW
  },
})
```

**Schema decision required (planner must finalize):** Where do `commissionRate` / `commissionAmount` / `netEarnings` live?
- **Option A (recommended):** Add 3 nullable columns to `Application` (matches existing `earnings Int?` pattern). Pros: simple, consistent with Phase 5. Cons: denormalization.
- **Option B:** New `Settlement` table 1:1 with Application. Cons: Phase 5 explicitly chose `Application` as the single source of settlement truth (`getWorkerSettlements`); introducing a second row doubles query complexity. CONTEXT.md says audit trail is v2.
- **Verdict: Option A.** Zero DAL changes. Phase 5's `getWorkerSettlements` just `include`s the new columns. Backwards compat: old settled rows have all three NULL — UI reads `commissionAmount ?? 0`.

## State of the Art / Open Questions

### Q1: Global default commission rate — env var vs config table? (D-35)
**Recommendation: env var `PLATFORM_DEFAULT_COMMISSION_RATE` (default `"0"`).**
- Pros: 0 schema cost, instant rollout, 0% today; changeable via Vercel env edit + redeploy
- Cons: Every rate bump (0→5→10) requires a deploy. But D-35 says "단계적 확대" — a 3-step roadmap over months — deploys are perfectly acceptable cadence.
- Alternative (config table): `PlatformConfig { key: String @id, value: String }`. Overkill for one value. Defer to v2 along with audit trail.

### Q2: What is `businessRegNumber` storage — digits-only or with dashes?
**Recommendation: digits-only (10 chars).** CONTEXT.md specifics already endorse this. Format validation on input, strip dashes before INSERT, re-format on display. Search normalizes query the same way.

### Q3: Indexes on BusinessProfile for admin search?
Recommendation: `CREATE INDEX ix_bp_reg_number ON business_profiles(businessRegNumber)`, `ix_bp_owner_phone ON business_profiles(ownerPhone)`. `name` already has no index but sizes are small — defer. ILIKE with leading wildcard cannot use B-tree; if search becomes slow, add `pg_trgm` + GIN in v2. MVP stays with sequential scan (< 10k rows for months).

### Q4: ADMIN seeding
Per CONTEXT.md specifics: "최초 1명은 수동 시드". Recommendation — planner adds a one-off SQL:
```sql
UPDATE public.users SET role = 'ADMIN' WHERE email = 'admin@gignow.kr';
```
And ensure the auth.users row exists via the Supabase dashboard beforehand. No invite UI this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CLOVA OCR v2 General response path `images[0].fields[].inferText` | Code Example 5 | MEDIUM — if path differs, OCR parser returns empty candidateRegNumbers; per D-33 this is tolerated (admin review flag). Non-fatal, but catch-all defensive coding: concatenate ALL `inferText` across the JSON tree. Planner should read official ncloud docs directly before coding. |
| A2 | `prisma db push` with additive nullable columns may not re-trigger `_supabase_migrations` drift warning | Pattern 6 | LOW — if it does, fall back to direct SQL (which is the safe path anyway). |
| A3 | Supabase Storage `allowed_mime_types` column on `storage.buckets` is supported in this Supabase version | Migration SQL | LOW — feature exists since 2023. If rejected, set `file_size_limit` only and rely on the app-layer mime check in storage helper. |
| A4 | `AbortController` + native `fetch` in Next.js 16 Server Actions works identically to Node 20 baseline | Code Example 5 | LOW — documented Next.js behavior. Verify at execution with a smoke test. |
| A5 | `BusinessProfile.commissionRate` stored as percentage (e.g. `5.00` means 5%) rather than fraction (`0.05` means 5%) | Commission snapshot | MEDIUM — this is a naming convention decision. Recommend percentage form (matches D-35 "0% → 5% → 10%" phrasing). Planner must commit this in a comment on the migration SQL and in the `updateCommissionRate` zod schema: `z.number().min(0).max(100)`. |
| A6 | `_supabase_migrations` table tracks the fallback scripts, not prisma migrations — so Phase 6 direct-SQL files will be detected correctly by `scripts/apply-supabase-migrations.ts` | Pattern 6 | LOW — verified by reading the script source; it maintains its own tracking table. |

## Dependency Order (build sequence — planner must respect)

1. **Wave 0 (Tests first where applicable):** `tests/auth/admin-routing.test.ts` — `getDefaultPathForRole('ADMIN') === '/admin'`, `canRoleAccessPath('ADMIN', '/admin') === true`, `canRoleAccessPath('BUSINESS', '/admin') === false`.
2. **Schema migration:** `20260414000001` — 5 nullable columns on BusinessProfile + 3 on Application (commissionRate, commissionAmount, netEarnings).
3. **Storage migration:** `20260414000002` — bucket + 4 RLS policies.
4. **Index migration:** `20260414000003` — 2 indexes (regNumber, ownerPhone).
5. **Run `npx prisma generate`** — regenerate types.
6. **`requireAdmin()` + routing edits + middleware edits** — + Wave 0 tests green.
7. **AdminSidebar + admin layout + stub /admin/page.tsx + /admin/businesses/page.tsx (empty list)** — smoke test: ADMIN user logs in → sees /admin.
8. **Admin list with search + filter + sort + pagination** — reuse getJobsPaginated pattern.
9. **Admin detail page (readonly)** + signed URL image viewer.
10. **Commission edit Server Action** — admin can override `commissionRate`.
11. **BusinessProfile regNumber/ownerName/ownerPhone entry** — added to `src/app/biz/profile/actions.ts` (edit existing, not new file) + signup flow (D-30 auto-verify).
12. **CLOVA OCR + verify page rebuild** — replaces mock, removes `MOCK_OCR_RESULT`. Wire upload → storage → OCR → DB flag.
13. **`createJob` image gate (D-31)** — one if-check + redirect.
14. **Commission snapshot in checkOut** — the most delicate change. Add Phase 5 regression tests FIRST (existing + new assertion on `commissionAmount`).
15. **Seed ADMIN user** — manual SQL on Supabase.
16. **Verification + human UAT scenarios** (admin login, search, detail view, commission edit, biz signup → auto-verify, biz create job without image → redirect, verify OCR happy path, verify OCR mismatch → admin flag).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Next.js 16.2.1 App Router | Everything | ✓ | 16.2.1 | — |
| Prisma 7.5.0 | Schema + queries | ✓ | 7.5.0 | — |
| Supabase Storage | Reg-doc uploads | ✓ (avatars bucket already works) | — | — |
| `scripts/apply-supabase-migrations.ts` (pg client) | Direct-SQL migrations | ✓ | pg ^8.20.0 | `prisma db push` (fallback, often refuses) |
| Naver CLOVA OCR API key | /biz/verify OCR | **✗** | — | Per D-33: write image URL, skip OCR compare, flag admin_review. Phase ships without OCR if key absent. |
| `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` env vars | OCR call | **✗** | — | Same as above. Feature-flag the OCR call behind `if (process.env.CLOVA_OCR_API_URL)`. |
| `PLATFORM_DEFAULT_COMMISSION_RATE` env | Commission calc | **✗** | — | Default to `"0"` via `?? '0'` — phase ships with 0% default without explicit env. |

**Missing dependencies with no fallback:** None — OCR has D-33 graceful degradation; commission has literal default.

**Action for planner:** Add `CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL`, `PLATFORM_DEFAULT_COMMISSION_RATE` to `.env.example` and INTEGRATIONS.md. Make `user_setup` for the verify-OCR plan include "Provision Naver CLOVA OCR General key".

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) + some Playwright e2e (excluded from default run per STATE.md known drift) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/<area>` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map (Decision-driven)

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-27 | /admin blocks non-ADMIN | unit (routing) | `npx vitest run tests/auth/admin-routing.test.ts` | ❌ Wave 0 |
| D-28 | ADMIN login lands on /admin | unit (getDefaultPathForRole) | same as above | ❌ Wave 0 |
| D-30 | regNumber format → verified=true | integration (Server Action) | `npx vitest run tests/business/verify-regnumber.test.ts` | ❌ Wave 0 |
| D-31 | createJob without image → redirect | integration | `npx vitest run tests/jobs/create-job-image-gate.test.ts` | ❌ Wave 0 |
| D-32/D-33 | OCR success + mismatch + timeout all allow upload | integration (mock CLOVA fetch) | `npx vitest run tests/ocr/clova-parser.test.ts` | ❌ Wave 0 |
| D-34 | checkOut snapshots commissionRate | integration | `npx vitest run tests/settlements/commission-snapshot.test.ts` | ❌ Wave 0 |
| D-36 | null commissionRate → env default | unit | same as D-34 file | — |
| D-40..42 | admin list search/filter/sort returns correct rows | integration | `npx vitest run tests/admin/business-list.test.ts` | ❌ Wave 0 |
| D-43 | cursor pagination returns stable order | integration | same as D-40 | — |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/<touched-area>`
- **Per wave merge:** `npx vitest run tests/auth tests/admin tests/business tests/jobs tests/settlements tests/ocr`
- **Phase gate:** Full suite green (including Phase 5 settlements regression) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/auth/admin-routing.test.ts` — D-27, D-28
- [ ] `tests/business/verify-regnumber.test.ts` — D-30
- [ ] `tests/jobs/create-job-image-gate.test.ts` — D-31
- [ ] `tests/ocr/clova-parser.test.ts` — D-32, D-33 (mock fetch)
- [ ] `tests/settlements/commission-snapshot.test.ts` — D-34, D-36
- [ ] `tests/admin/business-list.test.ts` — D-40..43
- [ ] No shared fixtures needed beyond existing `tests/fixtures/*` (createTestBusiness, createTestAdmin new helper)
- [ ] `createTestAdmin()` fixture — new helper, mirrors `createTestBusiness`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth + `requireAdmin()` DAL — existing pattern |
| V3 Session Management | yes | Supabase cookies via `@supabase/ssr` — existing pattern |
| V4 Access Control | yes | Three-layer: middleware (first pass) + layout `requireAdmin()` (second) + RLS on storage (third) |
| V5 Input Validation | yes | Zod: regNumber regex `^\d{3}-?\d{2}-?\d{5}$`, commissionRate `z.number().min(0).max(100).multipleOf(0.01)`, search q `z.string().max(100)` |
| V6 Cryptography | yes | CLOVA_OCR_SECRET at rest in Vercel env only; never logged. Signed storage URLs at 1h TTL. |
| V12 File Handling | yes | Mime allowlist + size limit at both storage bucket policy AND app-layer helper |
| V13 API / Web Services | yes | CLOVA API call is server-side only; no secret ever reaches browser |

### Known Threat Patterns for Admin + file upload + external API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ADMIN role forgery via JWT tampering | Spoofing | `requireAdmin` reads `public.users.role` via Prisma (DB-trusted), not JWT claim — matches existing `verifySession` pattern |
| Cross-business data leakage | Information Disclosure | RLS on business-reg-docs bucket; admin detail page serves signed URL per request |
| Malicious upload (oversized, wrong type) | DoS + Tampering | 10MB limit (bucket + app), mime allowlist (bucket + app), Supabase scans viruses at rest (verify in SOC2 docs) |
| CLOVA secret exfiltration | Information Disclosure | Server-only module (`import 'server-only'` at top of `src/lib/ocr/clova.ts`), never referenced from a `"use client"` file |
| CLOVA response injection via manipulated OCR → admin XSS | Cross-site Scripting | Treat `fullText` as untrusted; never render raw into admin UI without JSX auto-escape. Store only `candidateRegNumbers` (digit-only) in DB, discard fullText |
| Commission rate manipulation | Tampering | `updateCommissionRate` Server Action validates via Zod + requires `requireAdmin()`. No client-controlled businessId trust — always re-verify |
| Signed URL link sharing | Information Disclosure | 1h TTL is the industry standard; document that admins must not share links externally |

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` (local) — BusinessProfile current shape + ApplicationStatus enum
- `src/lib/auth/routing.ts` (local) — role-gate patterns
- `src/lib/dal.ts` (local) — requireBusiness/requireWorker template
- `src/lib/supabase/middleware.ts` (local) — middleware insertion point
- `src/app/biz/layout.tsx` (local) — layout guard pattern
- `src/lib/supabase/storage.ts` + `src/app/(worker)/my/profile/edit/actions.ts` (local) — storage upload template
- `supabase/migrations/20260411000002_storage_setup_avatars.sql` (local) — RLS policy SQL template
- `supabase/migrations/20260413000001_phase5_settled_enum_and_review_count.sql` (local) — direct-SQL migration precedent (D-25)
- `src/lib/db/queries.ts:619-680` (local) — cursor pagination template (getJobsPaginated)
- `src/components/worker/home-filter-bar.tsx` (local) — URL-as-source-of-truth template
- `src/app/(worker)/my/applications/[id]/check-in/actions.ts:209-217` (local) — checkOut transaction (commission snapshot insertion point)
- `.planning/phases/05-reviews-settlements/05-04-SUMMARY.md` (local) — settlement query patterns
- `scripts/apply-supabase-migrations.ts` (local) — verified the migration runner pattern

### Secondary (MEDIUM confidence)
- [Naver CLOVA OCR — purecode.tistory.com/2](https://purecode.tistory.com/2) — CITED: multipart form structure + X-OCR-SECRET header
- [CLOVA OCR overview — api.ncloud-docs.com](https://api.ncloud-docs.com/docs/en/ai-application-service-ocr) — CITED: v2 endpoint exists; page content non-extractable via webfetch but title confirms existence
- [CLOVA OCR overview — guide.ncloud-docs.com](https://guide.ncloud-docs.com/docs/en/clovaocr-overview) — CITED: three service types (General / Template / Document)
- [네이버 OCR 사용법 및 React 적용 — velog](https://velog.io/@zerone/%EB%84%A4%EC%9D%B4%EB%B2%84-OCR-%EA%B8%B0%EB%8A%A5-%EC%82%AC%EC%9A%A9%EB%B2%95-%EB%B0%8F-React-%EC%A0%81%EC%9A%A9) — axios/FormData pattern verified

### Tertiary (LOW confidence — needs validation at execution)
- Exact JSON path for CLOVA General OCR response `images[0].fields[].inferText` — planner should read the official API reference page (blocked from WebFetch parsing) before finalizing `src/lib/ocr/clova.ts`

## Metadata

**Confidence breakdown:**
- Routing + DAL + middleware: HIGH — verbatim extension of Phase 2 patterns
- Schema + migrations: HIGH — Phase 5 D-25 precedent exactly applies
- Storage bucket + RLS: HIGH — Phase 3 avatars template + private-bucket SELECT-admin variant is standard
- Cursor pagination + URL filter: HIGH — Phase 3 + Phase 4 templates
- Commission snapshot: HIGH for the math; MEDIUM for the exact column placement decision (Option A recommended but planner ratifies)
- CLOVA OCR: MEDIUM — field path verified on tutorial source but official doc not fully parseable via WebFetch. Planner reads official API reference before coding.
- Env-var vs config-table for default rate: HIGH — env var is clearly simpler; `[ASSUMED]` user confirms on /gsd-discuss or in planner review

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — CLOVA API and Supabase Storage are stable surfaces)

---

## RESEARCH COMPLETE

Phase 6 requires zero new dependencies, one external API (CLOVA OCR), two direct-SQL migrations, and strict adherence to the 17 locked decisions — every axis has a verbatim precedent in Phases 2–5 except the CLOVA call site.
