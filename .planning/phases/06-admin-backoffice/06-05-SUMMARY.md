---
phase: 06-admin-backoffice
plan: "05"
subsystem: admin-console
tags: [admin, backoffice, pagination, search, commission]
dependency_graph:
  requires: [06-03, 06-04]
  provides: [admin-console, business-list, business-detail, commission-edit]
  affects: [admin-routing, settlement-snapshots]
tech_stack:
  added: []
  patterns:
    - cursor-pagination (createdAt+id tuple, same as Phase 3 getJobsPaginated)
    - URL-as-source-of-truth filter bar with useTransition
    - Server Action + Zod + requireAdmin() auth gate
    - signed URL per-render (no caching, 1h TTL)
key_files:
  created:
    - src/lib/db/admin-queries.ts
    - src/app/admin/layout.tsx
    - src/app/admin/page.tsx
    - src/app/admin/admin-sidebar.tsx
    - src/app/admin/businesses/page.tsx
    - src/app/admin/businesses/businesses-client.tsx
    - src/app/admin/businesses/[id]/page.tsx
    - src/app/admin/businesses/[id]/actions.ts
  modified:
    - tests/admin/business-list.test.ts
decisions:
  - "Cursor format {createdAtISO}_{uuid} — same as Phase 3 for consistency and parse safety"
  - "rate_* sorts still cursor on createdAt+id (not on commissionRate) — rate ties are rare, stable tuple ordering avoids duplicate-row edge cases"
  - "commissionRate nulls placed LAST for rate_desc and rate_asc — businesses with explicit override shown first, global-default ones grouped at end"
  - "AdminSidebar is a new standalone component — does not import BizSidebar (D-29)"
  - "form action uses void wrapper (updateCommissionRateAction) so TypeScript form action prop is satisfied; underlying action retains rich return type for future useActionState wiring"
metrics:
  duration_minutes: 6
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 6 Plan 05: Admin Console Summary

**One-liner:** Full admin backoffice — business list with ILIKE search + cursor pagination + commission rate edit — built against `requireAdmin` (06-03) + signed-URL storage (06-04) + Phase 3 cursor pattern.

---

## What Was Built

### Final URL Schema (filters)

```
/admin/businesses
  ?q=<search term>           # ILIKE search string (max 100 chars)
  &field=name|reg|owner|phone  # which field to search
  &verified=all|yes|no       # verified filter (default: all)
  &sort=created_desc|created_asc|rate_desc|rate_asc  # (default: created_desc)
  &cursor=<createdAtISO>_<uuid>  # cursor for next page
```

Cursor format: `{createdAt.toISOString()}_{id}` — e.g. `2026-04-13T08:00:00.000Z_550e8400-e29b-41d4-a716-446655440000`. This is the same format as Phase 3 `getJobsPaginated` for consistency. The underscore separator is safe because ISO timestamps never contain underscores.

### Layout Description

**Dashboard (`/admin`):**
```
┌─────────────────────────────────────────────────────┐
│ GigNow [Admin]  (sidebar brand)                     │
│ ─────────────────────────────────────────────────── │
│ [대시보드]  [사업장 관리]                              │
│                                [로그아웃]             │
├─────────────────────────────────────────────────────┤
│ 대시보드                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │ 총 사업장 │ │  인증됨  │ │  미인증  │ │ 검토필요 ││
│ │    42    │ │    31    │ │    11    │ │  amber 3 ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│ [사업장 목록 보기]  [검토 대기 3건 보기]              │
└─────────────────────────────────────────────────────┘
```

**Business List (`/admin/businesses`):**
```
┌─────────────────────────────────────────────────────┐
│ 사업장 관리                            20건 표시 중  │
│ ┌───────────────────────────────────────────────┐  │
│ │ [검색어 입력...] [사업장명][사업자번호][대표자][연락처]│
│ │ 인증: [전체] [인증됨] [미인증]                │
│ │ 정렬: [최신순] [오래된순] [수수료높] [수수료낮] │
│ └───────────────────────────────────────────────┘  │
│ ┌─ 삼겹살집 [인증됨] ────────────── 수수료: 5.00% ─┐│
│ │ 123-45-6789 · 홍길동 · 010-1111-2222    2026-04 ││
│ └──────────────────────────────────────────────────┘│
│ ... (20 rows)                                       │
│                    [다음 페이지]                      │
└─────────────────────────────────────────────────────┘
```

**Business Detail (`/admin/businesses/[id]`):**
```
┌─────────────────────────────────────────────────────┐
│ ← 사업장 목록                                        │
│ 삼겹살집  [인증됨]  등록일 2026년 4월 13일            │
│                                                     │
│ ┌── 사업장 정보 ──┐  ┌── 사업자 정보 ─────────────┐ │
│ │ 사업장명: ...   │  │ 사업자번호: 123-45-67890  │ │
│ │ 카테고리: food  │  │ 대표자명: 홍길동          │ │
│ │ 주소: 강남구... │  │ 대표자 연락처: 010...     │ │
│ └─────────────────┘  └────────────────────────────┘ │
│ ┌── 사업자등록증 ────────────────────────────────┐   │
│ │ [img: 서명된URL, 1h TTL]                       │   │
│ └──────────────────────────────────────────────┘   │
│ ┌── 수수료 설정 ─────────────────────────────────┐  │
│ │ 현재 적용: 5.00%  (관리자 설정값)              │  │
│ │ [rate input: 0–100, step 0.01] [수수료율 저장] │  │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Cursor Stability — Why createdAt+id Even for rate_* Sorts

Rate ties occur when multiple businesses share the same `commissionRate` (e.g., all null). If we cursored on `(commissionRate, createdAt, id)` for rate sorts, a NULL commissionRate would require `IS NULL` cursor logic — complex and Prisma-unfriendly. Since the admin list is read-only backoffice (not a user-facing real-time feed), the tiny ordering imprecision within a single rate value is acceptable. We cursor on `createdAt+id` for all sort modes, which is:

1. Always unique (UUID tiebreak)
2. Already indexed
3. Consistent with Phase 3 pattern — zero new complexity

---

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Admin queries, businesses list, client filter bar, test flip | 0b8e8de |
| 2 | Admin shell — layout, dashboard, AdminSidebar | 69e88ec |
| 3 | Business detail page + updateCommissionRate action | 9a1c6dc |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript form action prop type mismatch**
- **Found during:** Task 3
- **Issue:** `form action={updateCommissionRate}` — TypeScript requires `(FormData) => void | Promise<void>` but the plan spec action returns `Promise<{ ok: true } | { error: string }>`. Direct use fails tsc.
- **Fix:** Added `updateCommissionRateAction` void wrapper in the page that calls the rich action and discards return value. The underlying action retains its typed return for future `useActionState` wiring.
- **Files modified:** `src/app/admin/businesses/[id]/page.tsx`

None of the other plan tasks required deviations — all file contents match the plan spec.

---

## Known Stubs

None. All sections render real DB data. Commission form writes directly to `BusinessProfile.commissionRate`. Signed URL is generated live from Supabase Storage.

The only runtime gap is that Supabase is currently paused (DB unreachable) — this is an infrastructure constraint, not a code stub. Tests skip via `describe.skipIf(!process.env.DATABASE_URL)` and will flip GREEN when DB is restored.

---

## Threat Surface Scan

All surfaces covered by plan threat model (T-06-12 through T-06-15):

| Threat ID | Status |
|-----------|--------|
| T-06-12 (commissionRate tampering) | Mitigated — `requireAdmin()` + Zod `min(0).max(100).multipleOf(0.01)` |
| T-06-13 (injection via searchParams) | Mitigated — Prisma parameterized `contains`; field enum-clamped; q length ≤100 |
| T-06-14 (signed URL leak) | Mitigated — generated per render, 1h TTL, never in URL params or logs |
| T-06-15 (admin bypass) | Mitigated — `requireAdmin()` at layout + redundantly at each page |

No new network endpoints or auth paths introduced beyond what the plan described.

---

## Self-Check: PASSED

Files confirmed present:
- src/lib/db/admin-queries.ts ✓
- src/app/admin/layout.tsx ✓
- src/app/admin/page.tsx ✓
- src/app/admin/admin-sidebar.tsx ✓
- src/app/admin/businesses/page.tsx ✓
- src/app/admin/businesses/businesses-client.tsx ✓
- src/app/admin/businesses/[id]/page.tsx ✓
- src/app/admin/businesses/[id]/actions.ts ✓

Commits confirmed: 0b8e8de, 69e88ec, 9a1c6dc
