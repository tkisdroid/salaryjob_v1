---
phase: 06-admin-backoffice
plan: 05
type: execute
wave: 4
depends_on: [03, 04]
files_modified:
  - src/lib/db/admin-queries.ts
  - src/app/admin/layout.tsx
  - src/app/admin/page.tsx
  - src/app/admin/admin-sidebar.tsx
  - src/app/admin/businesses/page.tsx
  - src/app/admin/businesses/businesses-client.tsx
  - src/app/admin/businesses/[id]/page.tsx
  - src/app/admin/businesses/[id]/actions.ts
autonomous: true
requirements: [D-27, D-28, D-29, D-36, D-40, D-41, D-42, D-43]
must_haves:
  truths:
    - "ADMIN user can log in and land on /admin (dashboard)"
    - "/admin/businesses shows paginated list with 4-field search, verified filter, 4 sort options, cursor pagination 20/page"
    - "/admin/businesses/[id] shows readonly owner info (name/phone/regNumber) + signed-URL reg image viewer"
    - "/admin/businesses/[id] lets ADMIN override commissionRate (Decimal 5,2, 0..100)"
    - "AdminSidebar is a separate component (not /biz sidebar reuse, per D-29)"
    - "URL is source of truth for filter state — reload preserves q/field/verified/sort/cursor"
    - "Non-ADMIN roles get 302 to /login?error=admin_required at both middleware and layout"
  artifacts:
    - path: "src/lib/db/admin-queries.ts"
      provides: "getBusinessesPaginated + getBusinessById"
      exports: ["getBusinessesPaginated", "getBusinessById"]
      min_lines: 80
    - path: "src/app/admin/layout.tsx"
      provides: "requireAdmin() gate + AdminSidebar shell"
    - path: "src/app/admin/page.tsx"
      provides: "Dashboard cards (total / verified / unverified counts)"
    - path: "src/app/admin/businesses/page.tsx"
      provides: "Server component list with URL-driven filters"
    - path: "src/app/admin/businesses/businesses-client.tsx"
      provides: "Client filter bar (useRouter.replace + useTransition)"
    - path: "src/app/admin/businesses/[id]/page.tsx"
      provides: "Readonly detail + signed image + commission edit form"
    - path: "src/app/admin/businesses/[id]/actions.ts"
      provides: "updateCommissionRate Server Action"
      exports: ["updateCommissionRate"]
    - path: "src/app/admin/admin-sidebar.tsx"
      provides: "New sidebar component (D-29)"
  key_links:
    - from: "src/app/admin/businesses/page.tsx"
      to: "src/lib/db/admin-queries.ts"
      via: "getBusinessesPaginated"
      pattern: "getBusinessesPaginated\\("
    - from: "src/app/admin/businesses/[id]/page.tsx"
      to: "src/lib/supabase/storage-biz-reg.ts"
      via: "createSignedBusinessRegUrl (called per render)"
      pattern: "createSignedBusinessRegUrl"
    - from: "src/app/admin/businesses/[id]/actions.ts"
      to: "src/lib/dal.ts:requireAdmin"
      via: "auth gate at action start"
      pattern: "requireAdmin\\("
---

<objective>
Build the admin console — list + detail + commission edit — entirely against patterns already in the codebase. Zero new capabilities beyond combining `requireAdmin` (Plan 03) + `createSignedBusinessRegUrl` (Plan 04) + cursor pagination (Phase 3) + URL-driven filter bar (Phase 4).

Purpose: Deliver the core deliverable visible to the human UAT reviewer — "Admin can find a business, see its reg docs, change its commission rate".
Output: 8 files. `tests/admin/business-list.test.ts` flips RED→GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@src/lib/db/queries.ts
@src/components/worker/home-filter-bar.tsx
@src/app/biz/layout.tsx
@src/app/biz/posts/actions.ts
@src/components/ui/input.tsx
@src/components/ui/card.tsx
@src/components/ui/toggle-group.tsx
@tests/admin/business-list.test.ts
</context>

<interfaces>
```typescript
// src/lib/db/admin-queries.ts
export type BusinessListRow = {
  id: string
  name: string
  businessRegNumber: string | null
  ownerName: string | null
  ownerPhone: string | null
  verified: boolean
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  category: JobCategory
}

export type BusinessListArgs = {
  q?: string
  field?: 'name' | 'reg' | 'owner' | 'phone'
  verified?: 'all' | 'yes' | 'no'
  sort?: 'created_desc' | 'created_asc' | 'rate_desc' | 'rate_asc'
  cursor?: string | null
  limit?: number
}

export async function getBusinessesPaginated(
  args: BusinessListArgs,
): Promise<{ items: BusinessListRow[]; nextCursor: string | null }>

export async function getBusinessById(id: string): Promise<{
  id: string
  name: string
  category: JobCategory
  address: string
  addressDetail: string | null
  businessRegNumber: string | null
  ownerName: string | null
  ownerPhone: string | null
  businessRegImageUrl: string | null
  commissionRate: Prisma.Decimal | null
  verified: boolean
  createdAt: Date
  user: { id: string; email: string | null; phone: string | null }
  _counts: { jobs: number }
} | null>
```

URL schema (client ↔ server contract):
```
/admin/businesses?q=키워드&field=name|reg|owner|phone&verified=all|yes|no&sort=created_desc|created_asc|rate_desc|rate_asc&cursor=...
```
Cursor format: `{createdAtISO}_{uuid}` (same as Phase 3 `getJobsPaginated`). When sort is rate_*, still cursor on createdAt+id (tuple ordering for stability; rate ties rare).
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Admin queries + list page + filter bar + Wave 0 test flip</name>
  <files>src/lib/db/admin-queries.ts, src/app/admin/businesses/page.tsx, src/app/admin/businesses/businesses-client.tsx</files>
  <behavior>
    Covered by `tests/admin/business-list.test.ts`:
    - Default sort created_desc returns all 5 fixture rows newest-first
    - ILIKE search on name/reg/owner/phone
    - Reg search normalizes dashes: query '123-45' matches stored '1234567890' (LIKE '%12345%' after normalizeDigits)
    - verified=no returns only verified=false rows
    - Cursor pagination: limit=2 → first page 2 items + nextCursor; next call with cursor → distinct 2 items
    - sort=rate_desc places highest rate first, nulls consistently (document the choice)
  </behavior>
  <action>
    1. `src/lib/db/admin-queries.ts`:
       - Mirror `getJobsPaginated` from `src/lib/db/queries.ts` (line 619-680). Read that file first.
       - Use `prisma.businessProfile.findMany` with Prisma `OR` for search (NOT raw SQL — simpler). For reg search, apply `normalizeDigits(q)` from `src/lib/strings.ts` and search `businessRegNumber: { contains }`.
       - Sort mapping:
         - created_desc → `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`
         - created_asc  → `orderBy: [{ createdAt: 'asc' },  { id: 'asc' }]`
         - rate_desc    → `orderBy: [{ commissionRate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'desc' }]`
         - rate_asc     → `orderBy: [{ commissionRate: { sort: 'asc',  nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }]`
       - Cursor decode/encode: `{createdAtISO}_{uuid}`. Apply `where: { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }] }` for desc; flip ops for asc. (For rate_* sorts, still cursor on createdAt+id pair — stable enough per RESEARCH §Pattern 2.)
       - `limit = Math.min(args.limit ?? 20, 100)`
       - Fetch `limit + 1` rows, slice to detect `nextCursor`.
       - `getBusinessById(id)` uses `findUnique` with `include: { user: { select: {...} }, _count: { select: { jobs: true } } }`.

    2. `src/app/admin/businesses/page.tsx` (Server Component):
       - `await requireAdmin()`
       - Parse `searchParams` → `BusinessListArgs` (coerce defaults, clamp verified/sort/field to valid enums via Zod or switch-case)
       - Call `getBusinessesPaginated(args)`
       - Render:
         - `<BusinessesClient initialQuery={...} />` (client filter bar)
         - Server-rendered `<table>` or card list of 20 rows (name + 사업자번호 + 대표자 + verified badge + commissionRate + createdAt). Use `<Link href="/admin/businesses/{id}">`.
         - "다음 페이지" link if `nextCursor`, constructs new URL with cursor appended.
       - Korean UI; 44px tap target; use shadcn `Table` if available, else `Card` per row.
       - Empty state: "조건에 해당하는 사업장이 없습니다." with reset link.

    3. `src/app/admin/businesses/businesses-client.tsx` ("use client"):
       - Mirror `src/components/worker/home-filter-bar.tsx:53-70`. `useRouter().replace(pathname + '?' + params.toString())` inside `useTransition`.
       - Form controls:
         - Search input with 300ms debounce + field selector (ToggleGroup: 사업장명/사업자번호/대표자/연락처)
         - Verified ToggleGroup: 전체 / verified / unverified
         - Sort Select: 최신순 / 오래된순 / 수수료높은순 / 수수료낮은순
       - When any control changes, rebuild URLSearchParams, drop `cursor`, navigate.
       - Pure URL control — no local state persistence beyond React controlled inputs.

    4. Flip `tests/admin/business-list.test.ts` from `describe.skip` to `describe`.
  </action>
  <verify>
    <automated>npx vitest run tests/admin/business-list.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>
    - business-list.test.ts GREEN
    - Manual smoke (note in SUMMARY): navigate to /admin/businesses as ADMIN → sees seeded fixture rows
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Admin shell (layout + dashboard + sidebar)</name>
  <files>src/app/admin/layout.tsx, src/app/admin/page.tsx, src/app/admin/admin-sidebar.tsx</files>
  <behavior>
    - `/admin` layout calls `requireAdmin()` — non-ADMIN gets redirected
    - Dashboard displays 3 counter cards (총 사업장 / 인증됨 / 미인증)
    - AdminSidebar is a new component — MUST NOT import or extend `BizSidebar` (per D-29)
    - Sidebar links: 대시보드 (/admin), 사업장 관리 (/admin/businesses). Logout button at bottom.
  </behavior>
  <action>
    1. `src/app/admin/layout.tsx` (Server Component):
       ```tsx
       import { requireAdmin } from '@/lib/dal'
       import AdminSidebar from './admin-sidebar'

       export default async function AdminLayout({ children }) {
         await requireAdmin()
         return (
           <div className="min-h-screen flex bg-background">
             <AdminSidebar />
             <main className="flex-1 p-6 overflow-auto">{children}</main>
           </div>
         )
       }
       ```

    2. `src/app/admin/admin-sidebar.tsx` (Server Component OK — pure links):
       - 3 sections: Brand logo (reuse existing brand token colors — oklch), Nav (2 links), Logout form action (reuse existing logout Server Action from /biz or /my — grep for it first).
       - Use `bg-brand`, `text-teal` tokens per impeccable skill — do NOT introduce new grey/red scales.
       - Width 240px desktop, collapse on mobile to icon-only or hide (admin is desktop-first per Claude discretion).

    3. `src/app/admin/page.tsx`:
       - `await requireAdmin()` (defensive — layout already does but harmless)
       - Query 3 counts via Prisma: `prisma.businessProfile.count()`, `count({ where: { verified: true } })`, `count({ where: { verified: false } })`
       - Render 3 `<Card>` components side-by-side on desktop, stacked on mobile. Each shows a number + Korean label.
       - Add one pending-review CTA card: list count of `BusinessProfile.businessRegImageUrl IS NOT NULL AND verified=false` (the "admin review required" cohort hinted by D-33). Optional — Claude's discretion.
  </action>
  <verify>
    <automated>npx tsc --noEmit && curl -I http://localhost:3000/admin 2>&1 | head -3 || echo "skipped runtime curl — manual smoke in SUMMARY"</automated>
  </verify>
  <done>
    - Files compile
    - When logged in as ADMIN, /admin renders dashboard; logged in as BUSINESS, /admin redirects to /login?error=admin_required
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Business detail page + commission edit Server Action</name>
  <files>src/app/admin/businesses/[id]/page.tsx, src/app/admin/businesses/[id]/actions.ts</files>
  <behavior>
    - Detail page is readonly EXCEPT for commission rate input
    - Business reg image viewer uses freshly-signed URL (no client caching)
    - updateCommissionRate Server Action:
      - Requires ADMIN (requireAdmin)
      - Zod validates `rate: z.coerce.number().min(0).max(100).multipleOf(0.01).nullable()` (null allowed → reset to env default)
      - Writes `Prisma.Decimal(rate)` to `BusinessProfile.commissionRate`
      - Uses `firstFieldError` helper pattern (grep existing usage in `src/app/biz/posts/actions.ts`)
      - Returns `{ ok: true }` or `{ error: string; fieldErrors?: Record<string,string> }`
      - Calls `revalidatePath('/admin/businesses/' + id)` on success
  </behavior>
  <action>
    1. `src/app/admin/businesses/[id]/page.tsx` (Server Component):
       - `await requireAdmin()`
       - `const business = await getBusinessById(params.id)` (null → `notFound()`)
       - If `business.businessRegImageUrl`:
         - `const signedUrl = await createSignedBusinessRegUrl(business.businessRegImageUrl, 3600)`
         - Render `<img src={signedUrl} alt="사업자등록증" />` or `<object>` for PDF
         - If signedUrl null → fallback message "이미지 열람에 실패했습니다"
       - Render sections:
         - 사업장 정보 (name, category, address)
         - 사업자 정보 (ownerName, ownerPhone, businessRegNumber formatted as NNN-NN-NNNNN)
         - 계정 정보 (user.email, user.phone)
         - 등록증 (image or "업로드 전" badge)
         - 수수료 설정 — form calling updateCommissionRate
         - 실적 (jobs count)
       - Commission form: `<form action={updateCommissionRate}>` with hidden businessId + input[type=number, step=0.01, min=0, max=100] + button. Show current effective rate + its source (override vs env default) above the input.

    2. `src/app/admin/businesses/[id]/actions.ts`:
       ```typescript
       'use server'
       import { z } from 'zod'
       import { requireAdmin } from '@/lib/dal'
       import { prisma } from '@/lib/db'
       import { Prisma } from '@/generated/prisma/client'
       import { revalidatePath } from 'next/cache'

       const UpdateCommissionSchema = z.object({
         businessId: z.string().uuid(),
         rate: z.union([
           z.literal(''),
           z.coerce.number().min(0).max(100).multipleOf(0.01),
         ]),
       })

       export async function updateCommissionRate(formData: FormData) {
         await requireAdmin()
         const parsed = UpdateCommissionSchema.safeParse({
           businessId: formData.get('businessId'),
           rate: formData.get('rate'),
         })
         if (!parsed.success) {
           return { error: 'invalid_input', fieldErrors: parsed.error.flatten().fieldErrors }
         }
         const { businessId, rate } = parsed.data
         const rateDecimal = rate === '' ? null : new Prisma.Decimal(rate)
         await prisma.businessProfile.update({
           where: { id: businessId },
           data: { commissionRate: rateDecimal },
         })
         revalidatePath(`/admin/businesses/${businessId}`)
         return { ok: true as const }
       }
       ```

       Empty input → null → reset to env default (explicitly allowed per D-36).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    - Detail page renders all sections
    - Commission update writes Decimal or null
    - Signed URL regenerates per render
    - Manual smoke: admin changes rate from 0 to 5 → row updated in DB
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL searchParams → getBusinessesPaginated | Untrusted strings; Zod coerce + enum clamp |
| FormData → updateCommissionRate | Untrusted rate input; Zod min/max + server-side role gate |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-12 | Tampering | commissionRate via updateCommissionRate | mitigate | requireAdmin() + Zod min(0).max(100).multipleOf(0.01). Non-admin gets redirect, non-numeric rejected. |
| T-06-13 | Injection | q/field searchParams → Prisma | mitigate | Prisma parameterized `contains`; `field` enum-clamped; `q` length<=100. No raw SQL with user input. |
| T-06-14 | Information Disclosure | Signed URL log leak | mitigate | URL generated per render, 1h TTL. Never passed through URL params on admin page. Do not add to server logs. |
| T-06-15 | Elevation | Admin detail page bypass | mitigate | `requireAdmin()` at layout + redundantly at page (per existing dal pattern) |
</threat_model>

<verification>
- `tests/admin/business-list.test.ts` GREEN
- `tests/auth/admin-routing.test.ts` still GREEN
- Manual: ADMIN login → /admin dashboard → /admin/businesses list → click row → detail page → change rate → row updated
- Non-ADMIN accessing /admin → /login?error=admin_required
</verification>

<success_criteria>
- All 8 files exist and compile
- List + filter + sort + pagination behaves per URL schema
- Detail page displays signed image
- Commission edit writes correctly
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-05-SUMMARY.md` — document:
- Final URL schema (filters)
- Screenshot-style textual description of dashboard + list + detail layouts
- Exact cursor format chosen and why (stability over strict rate order)
</output>
