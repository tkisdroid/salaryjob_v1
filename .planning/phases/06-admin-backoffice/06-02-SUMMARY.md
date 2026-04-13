---
phase: 06-admin-backoffice
plan: "02"
subsystem: database-schema
tags: [schema-migration, supabase-storage, prisma, rls, commission]
dependency_graph:
  requires: [06-01]
  provides: [BusinessProfile.businessRegNumber, BusinessProfile.regNumberOcrMismatched, BusinessProfile.commissionRate, Application.commissionAmount, Application.netEarnings, storage:business-reg-docs]
  affects: [06-03, 06-04, 06-05, 06-06, 06-07]
tech_stack:
  added: []
  patterns: [direct-SQL-migration, prisma-generate-only, supabase-storage-rls, owner-folder-rls]
key_files:
  created:
    - supabase/migrations/20260414000001_phase6_business_profile_extension.sql
    - supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql
    - supabase/migrations/20260414000003_phase6_business_profile_indexes.sql
  modified:
    - prisma/schema.prisma
    - .env.example
decisions:
  - "Direct-SQL migration (Phase 5 D-25 precedent) — prisma db push not used"
  - "Commission snapshot stored on Application (Option A) — 3 nullable cols, immutable after settled"
  - "regNumberOcrMismatched: NOT NULL DEFAULT false so Wave 4 admin queries safe without NULL check"
  - "Storage path: {userId}/{businessId}.{ext} — foldername[1]=userId for RLS anchor"
  - "Admin SELECT policy joins public.users (T-06-02) — JWT claim alone insufficient"
metrics:
  duration: "~6 minutes"
  completed: "2026-04-13T06:20:37Z"
  tasks: 3
  files: 5
---

# Phase 6 Plan 02: Schema + Storage Migration Summary

One-liner: Direct-SQL schema extension adding 9 new columns (6 on BusinessProfile including D-33 OCR mismatch flag + 3 on Application for commission snapshot) plus private Supabase Storage bucket with owner+ADMIN RLS.

## What Was Built

### Migration 000001 — BusinessProfile + Application columns
File: `supabase/migrations/20260414000001_phase6_business_profile_extension.sql`

**business_profiles new columns:**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| businessRegNumber | VARCHAR(10) | YES | NULL | Korean biz reg number (digits only) |
| ownerName | TEXT | YES | NULL | 대표자명 (may differ from signup user) |
| ownerPhone | VARCHAR(20) | YES | NULL | 대표자 연락처 |
| businessRegImageUrl | TEXT | YES | NULL | Path in business-reg-docs bucket (NOT full URL) |
| commissionRate | DECIMAL(5,2) | YES | NULL | Override rate as % (5.00=5%). NULL→env default |
| regNumberOcrMismatched | BOOLEAN | NO | false | D-33 admin-review flag — OCR number mismatch |

**applications new columns:**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| commissionRate | DECIMAL(5,2) | YES | NULL | Snapshot of effective rate at checkOut |
| commissionAmount | INTEGER | YES | NULL | KRW commission (half-up rounded) |
| netEarnings | INTEGER | YES | NULL | gross - commissionAmount |

### Migration 000002 — Storage bucket + RLS
File: `supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql`

- Bucket `business-reg-docs`: public=false, file_size_limit=10485760 (10MB), allowed_mime_types=['image/jpeg','image/png','application/pdf']
- 4 RLS policies on storage.objects:
  1. `biz_reg_owner_insert` — authenticated owner INSERT to foldername[1]=auth.uid()
  2. `biz_reg_owner_update` — owner UPDATE (USING + WITH CHECK)
  3. `biz_reg_owner_select` — owner SELECT their folder
  4. `biz_reg_admin_select` — ADMIN SELECT any row via `EXISTS (SELECT 1 FROM public.users WHERE id=auth.uid() AND role='ADMIN')`
- Idempotent: ON CONFLICT (id) DO NOTHING + DROP POLICY IF EXISTS before each CREATE

### Migration 000003 — Indexes
File: `supabase/migrations/20260414000003_phase6_business_profile_indexes.sql`

- `ix_bp_reg_number ON business_profiles("businessRegNumber")` — supports D-40 admin search
- `ix_bp_owner_phone ON business_profiles("ownerPhone")` — supports D-40 admin search

### prisma/schema.prisma
Updated `model BusinessProfile` and `model Application` to mirror all 9 new columns.
Two new `@@index` directives added for businessRegNumber and ownerPhone.

### .env.example
Added Phase 6 section:
```
CLOVA_OCR_SECRET=
CLOVA_OCR_API_URL=
PLATFORM_DEFAULT_COMMISSION_RATE=0
```

### Prisma client regenerated
`npx prisma generate` run successfully. Confirmed in generated types:
- `src/generated/prisma/internal/prismaNamespace.ts`: `businessRegNumber`, `regNumberOcrMismatched`, `commissionAmount`, `netEarnings` present
- `src/generated/prisma/models/BusinessProfile.ts`: all 6 new fields typed

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Schema + migration 000001 | b967d22 | prisma/schema.prisma, 20260414000001_*.sql |
| Task 2: Storage bucket + RLS migration 000002 | d017307 | 20260414000002_*.sql |
| Task 3: Indexes + .env.example migration 000003 | 0943d9c | 20260414000003_*.sql, .env.example |

## Deviations from Plan

### Infrastructure Deviation: Supabase DB unreachable from agent environment

**Found during:** All 3 tasks
**Issue:** `getaddrinfo ENOTFOUND db.lkntomgdhfvxzvnzmlct.supabase.co` — DNS resolution fails for the Supabase host from this machine/network. The migration runner (`scripts/apply-supabase-migrations.ts`) correctly detects and lists all 3 new migration files but cannot connect.
**Impact:** SQL changes are NOT applied to the live Supabase database. Schema changes are only in migration files + Prisma schema + regenerated client.
**Resolution:** Run `npm run db:supabase` (or `npx tsx scripts/apply-supabase-migrations.ts`) from a machine with Supabase network access (e.g., developer's local machine or CI). The migration runner is idempotent — reruns skip already-applied files.
**Prisma generate:** Ran successfully (no DB connection needed for schema-only generate). All new types are in the generated client.

### No other deviations — plan executed exactly as specified.

## Plan Integrity: regNumberOcrMismatched for Wave 4

The `regNumberOcrMismatched BOOLEAN NOT NULL DEFAULT false` column is confirmed in:
1. `supabase/migrations/20260414000001_*.sql` — SQL source of truth
2. `prisma/schema.prisma` — `regNumberOcrMismatched Boolean @default(false)`
3. Generated client (`prismaNamespace.ts`) — `regNumberOcrMismatched: 'regNumberOcrMismatched'`

Wave 4 admin list queries (Plan 06-05) can safely `WHERE "regNumberOcrMismatched" = true` without NULL guards. Plan 06-06 OCR write path will set `regNumberOcrMismatched: true` on mismatch.

## Threat Surface Scan

No new network endpoints introduced. Storage RLS policies follow T-06-02/T-06-03/T-06-04 mitigations as specified in threat model.

## Known Stubs

None. This plan creates schema artifacts only — no UI, no data wired to components.

## Self-Check: PASSED

Files created/exist:
- [x] supabase/migrations/20260414000001_phase6_business_profile_extension.sql
- [x] supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql
- [x] supabase/migrations/20260414000003_phase6_business_profile_indexes.sql
- [x] prisma/schema.prisma (updated with 9 new columns + 2 indexes)
- [x] .env.example (Phase 6 section appended)

Commits verified:
- [x] b967d22 — feat(06-02): BusinessProfile + Application schema extension (migration 000001)
- [x] d017307 — feat(06-02): private Storage bucket + 4 RLS policies (migration 000002)
- [x] 0943d9c — feat(06-02): business_profiles indexes + .env.example Phase 6 vars (migration 000003)

Prisma types confirmed: businessRegNumber, regNumberOcrMismatched, commissionAmount, netEarnings all present in src/generated/prisma/.

TypeScript compile: All errors are in test files referencing modules not yet created (future plans 06-03..06-07). The @ts-expect-error directives in commission-snapshot.test.ts becoming "unused" confirms the new Prisma types resolved the expected type errors — this is the GREEN signal for Plan 06-01 RED tests.
