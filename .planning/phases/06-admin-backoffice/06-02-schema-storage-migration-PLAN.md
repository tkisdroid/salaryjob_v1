---
phase: 06-admin-backoffice
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - prisma/schema.prisma
  - supabase/migrations/20260414000001_phase6_business_profile_extension.sql
  - supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql
  - supabase/migrations/20260414000003_phase6_business_profile_indexes.sql
  - .env.example
autonomous: true
requirements: [D-33, D-37, D-38, D-43]
must_haves:
  truths:
    - "BusinessProfile has 6 new columns (businessRegNumber, ownerName, ownerPhone, businessRegImageUrl, commissionRate — all nullable; regNumberOcrMismatched BOOLEAN NOT NULL DEFAULT false)"
    - "Application has 3 new nullable columns (commissionRate, commissionAmount, netEarnings)"
    - "regNumberOcrMismatched column exists on BusinessProfile with NOT NULL DEFAULT false so Plan 06-05 admin list queries can safely reference it in Wave 4"
    - "Supabase Storage bucket business-reg-docs exists as PRIVATE with 4 RLS policies (owner insert/update/select + admin select)"
    - "2 indexes on BusinessProfile (businessRegNumber, ownerPhone)"
    - "Prisma client regenerated with new columns visible in types"
    - ".env.example documents CLOVA_OCR_SECRET, CLOVA_OCR_API_URL, PLATFORM_DEFAULT_COMMISSION_RATE"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Updated BusinessProfile (6 new cols) + Application (3 new cols) models"
      contains: "businessRegNumber"
    - path: "supabase/migrations/20260414000001_phase6_business_profile_extension.sql"
      provides: "ALTER TABLE statements for 9 new columns (6 on business_profiles including regNumberOcrMismatched, 3 on applications)"
    - path: "supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql"
      provides: "Bucket + RLS policies"
    - path: "supabase/migrations/20260414000003_phase6_business_profile_indexes.sql"
      provides: "regNumber + ownerPhone indexes"
  key_links:
    - from: "prisma/schema.prisma"
      to: "supabase/migrations/20260414000001_*.sql"
      via: "schema mirror — SQL is source of truth for Supabase, Prisma schema mirrors for type generation"
      pattern: "businessRegNumber|commissionRate|regNumberOcrMismatched"
    - from: "scripts/apply-supabase-migrations.ts"
      to: "supabase/migrations/20260414*.sql"
      via: "migration runner applies in filename order"
      pattern: "20260414000001|20260414000002|20260414000003"
---

<objective>
Extend the database schema and create the private Supabase Storage bucket that all subsequent waves depend on. This is the BLOCKING wave — nothing downstream runs until `prisma generate` produces the new types.

Purpose: Phase 5 D-25 established direct-SQL is mandatory for this Supabase project. Phase 6 follows verbatim — 3 SQL migration files + schema mirror + `prisma generate`.
Output: 4 files modified/created, `_supabase_migrations` table records 3 new rows, Prisma client regenerated.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/06-admin-backoffice/06-CONTEXT.md
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
@prisma/schema.prisma
@supabase/migrations/20260413000001_phase5_settled_enum_and_review_count.sql
@supabase/migrations/20260411000002_storage_setup_avatars.sql
@scripts/apply-supabase-migrations.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Schema mirror + migration SQL — BusinessProfile + Application columns</name>
  <files>prisma/schema.prisma, supabase/migrations/20260414000001_phase6_business_profile_extension.sql</files>
  <action>
    1. Edit `prisma/schema.prisma` `model BusinessProfile` — add 6 new columns (5 nullable + 1 NOT NULL DEFAULT false):
       - `businessRegNumber String? @db.VarChar(10)` (digits-only, 10 chars)
       - `ownerName         String?`
       - `ownerPhone        String? @db.VarChar(20)`
       - `businessRegImageUrl String?` (stores path within bucket, NOT a full URL)
       - `commissionRate    Decimal? @db.Decimal(5, 2)` (percentage form per A5, e.g. 5.00 = 5%)
       - `regNumberOcrMismatched Boolean @default(false)` (D-33 — admin-review flag; TRUE when CLOVA OCR extracted a regNumber that did not match the stored `businessRegNumber`. Written by Plan 06-06 Task 2; read by Plan 06-05 admin list/detail.)

    2. Edit `prisma/schema.prisma` `model Application` — add 3 nullable columns (per research Option A):
       - `commissionRate    Decimal? @db.Decimal(5, 2)` (snapshot at settlement time)
       - `commissionAmount  Int?` (krw, rounded half-up)
       - `netEarnings       Int?` (gross - commission)

    3. Create `supabase/migrations/20260414000001_phase6_business_profile_extension.sql` with ALTER TABLE statements that match the Prisma column names EXACTLY (quoted identifiers because Prisma uses camelCase). Reference Phase 5 `20260413000001_phase5_settled_enum_and_review_count.sql` for the quoting convention.

    ```sql
    BEGIN;

    ALTER TABLE public.business_profiles
      ADD COLUMN IF NOT EXISTS "businessRegNumber"       VARCHAR(10),
      ADD COLUMN IF NOT EXISTS "ownerName"               TEXT,
      ADD COLUMN IF NOT EXISTS "ownerPhone"              VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "businessRegImageUrl"     TEXT,
      ADD COLUMN IF NOT EXISTS "commissionRate"          DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "regNumberOcrMismatched"  BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE public.applications
      ADD COLUMN IF NOT EXISTS "commissionRate"      DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "commissionAmount"    INTEGER,
      ADD COLUMN IF NOT EXISTS "netEarnings"         INTEGER;

    -- Inline comment: commissionRate stored as percentage (5.00 = 5%), NOT fraction.
    -- Default rate falls back to env PLATFORM_DEFAULT_COMMISSION_RATE or '0'.
    COMMENT ON COLUMN public.business_profiles."commissionRate" IS
      'Override commission rate as percentage (5.00 = 5%). NULL means use PLATFORM_DEFAULT_COMMISSION_RATE env (fallback "0").';
    COMMENT ON COLUMN public.business_profiles."regNumberOcrMismatched" IS
      'D-33 admin-review flag. TRUE when CLOVA OCR extracted a regNumber that did not match the stored businessRegNumber. Written by /biz/verify upload flow. Default false so Wave 4 admin queries can safely filter/display.';
    COMMENT ON COLUMN public.applications."commissionRate" IS
      'Snapshot of effective commission rate at checkOut time. Never mutated after settlement.';

    COMMIT;
    ```

    4. Apply via `npx tsx scripts/apply-supabase-migrations.ts` (existing runner tracks its own migrations table). If the script name differs, grep first.

    5. Run `npx prisma generate` to regenerate types.

    6. Do NOT run `prisma db push` — precedent from Phase 5 D-25 says direct SQL only. If the executor's judgment says db push works for additive columns, FINE, but the SQL file must still exist so Supabase prod migration runner sees it.
  </action>
  <verify>
    <automated>npx tsx scripts/apply-supabase-migrations.ts && npx prisma generate && npx tsc --noEmit 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Schema file mirrors 9 new columns (6 on BusinessProfile including regNumberOcrMismatched, 3 on Application)
    - SQL applied (check Supabase table or `psql` via DATABASE_URL: `\d business_profiles` shows new columns including `regNumberOcrMismatched boolean NOT NULL DEFAULT false`)
    - `src/generated/prisma/client.d.ts` includes `businessRegNumber`, `commissionRate`, `regNumberOcrMismatched` etc. (grep confirms)
    - TypeScript compile passes (existing code shouldn't break — all nullable or have defaults)
  </done>
</task>

<task type="auto">
  <name>Task 2: Storage bucket + RLS policies</name>
  <files>supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql</files>
  <action>
    Create `supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql` using the RESEARCH.md §6 template verbatim. Key details:

    - Bucket id/name: `business-reg-docs`
    - `public=false` (private)
    - `file_size_limit=10485760` (10MB)
    - `allowed_mime_types=ARRAY['image/jpeg', 'image/png', 'application/pdf']`
    - 4 RLS policies on `storage.objects`:
      1. `biz_reg_owner_insert` — authenticated users can INSERT only into folder matching their `auth.uid()`
      2. `biz_reg_owner_update` — same folder constraint for UPDATE (both USING and WITH CHECK)
      3. `biz_reg_owner_select` — users can SELECT only their own folder
      4. `biz_reg_admin_select` — users with `public.users.role = 'ADMIN'` can SELECT anything in the bucket

    Use `ON CONFLICT (id) DO NOTHING` on the INSERT INTO storage.buckets line so reruns are idempotent.

    Use `DROP POLICY IF EXISTS` before each CREATE POLICY so the migration is rerunnable.

    Path convention documented in bucket comment: `business-reg-docs/{userId}/{businessId}.{ext}` — folder[1] (1-based) = userId.

    Apply via `npx tsx scripts/apply-supabase-migrations.ts`.
  </action>
  <verify>
    <automated>npx tsx scripts/apply-supabase-migrations.ts 2>&1 | tail -10 && psql "$DATABASE_URL" -c "SELECT id, public, file_size_limit FROM storage.buckets WHERE id='business-reg-docs';" 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Bucket row exists with public=false, file_size_limit=10485760
    - 4 RLS policies exist on storage.objects filtered by bucket_id='business-reg-docs' (verify via `SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass`)
  </done>
</task>

<task type="auto">
  <name>Task 3: Indexes + .env.example + prisma generate commit</name>
  <files>supabase/migrations/20260414000003_phase6_business_profile_indexes.sql, .env.example</files>
  <action>
    1. Create `supabase/migrations/20260414000003_phase6_business_profile_indexes.sql`:
    ```sql
    BEGIN;
    CREATE INDEX IF NOT EXISTS ix_bp_reg_number  ON public.business_profiles("businessRegNumber");
    CREATE INDEX IF NOT EXISTS ix_bp_owner_phone ON public.business_profiles("ownerPhone");
    COMMIT;
    ```
    (Research Q3: skip name trigram GIN for MVP, ILIKE sequential scan is fine under ~10k rows.)

    2. Edit `.env.example` — append a "Phase 6 — Admin backoffice & OCR" section:
    ```
    # Phase 6 — Admin backoffice & OCR
    # Naver CLOVA OCR General (biz license extraction) — https://guide.ncloud-docs.com/docs/en/clovaocr-overview
    # Leave blank to disable OCR (D-33 graceful degradation: image still saves, admin review flag set)
    CLOVA_OCR_SECRET=
    CLOVA_OCR_API_URL=
    # Platform commission rate default, percentage form (e.g. "5.00" means 5%). Empty/unset = 0%.
    PLATFORM_DEFAULT_COMMISSION_RATE=0
    ```

    3. Apply migration via `npx tsx scripts/apply-supabase-migrations.ts`.

    4. Run `npx prisma generate` one more time to ensure the generated client includes the index metadata (usually not needed for indexes, but harmless).
  </action>
  <verify>
    <automated>npx tsx scripts/apply-supabase-migrations.ts 2>&1 | tail -5 && psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename='business_profiles' AND indexname LIKE 'ix_bp_%';" 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Both indexes exist
    - .env.example documents all 3 new env vars with guidance
    - `npx tsc --noEmit` still passes
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client upload → storage.objects | Authenticated user uploads biz license; only their own folder permitted |
| admin browser → storage.objects SELECT | ADMIN read of any row in bucket must re-verify role at DB level (RLS), not just app-layer |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Tampering | business_profiles column types | mitigate | Decimal(5,2) constrains commissionRate to [-999.99, 999.99]; zod validator in Wave 4 further clamps 0..100 |
| T-06-02 | Information Disclosure | storage.objects SELECT policy | mitigate | biz_reg_admin_select joins public.users with role='ADMIN' — JWT claim alone insufficient |
| T-06-03 | DoS | storage upload size | mitigate | file_size_limit=10MB at bucket level + allowed_mime_types restricts to 3 MIME types |
| T-06-04 | Spoofing | owner folder enforcement | mitigate | `(storage.foldername(name))[1] = auth.uid()::text` — auth.uid() cannot be forged from client |
</threat_model>

<verification>
- `psql "$DATABASE_URL" -c "\d business_profiles"` shows 6 new columns including `regNumberOcrMismatched boolean NOT NULL DEFAULT false`
- `psql "$DATABASE_URL" -c "\d applications"` shows 3 new columns
- `SELECT COUNT(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'biz_reg_%'` returns 4
- `SELECT indexname FROM pg_indexes WHERE tablename='business_profiles' AND indexname LIKE 'ix_bp_%'` returns 2
- `grep 'businessRegNumber\|regNumberOcrMismatched' src/generated/prisma/client.d.ts` returns matches
- Phase 5 tests still pass: `npx vitest run tests/settlements tests/reviews`
</verification>

<success_criteria>
- 3 SQL migration files applied successfully
- Prisma client regenerated, new types visible (including regNumberOcrMismatched)
- No regression in Phase 5 test suite
- .env.example updated
</success_criteria>

<output>
After completion, create `.planning/phases/06-admin-backoffice/06-02-SUMMARY.md` documenting:
- Migration file names + applied timestamp
- Output of `\d business_profiles` and `\d applications` (new columns only)
- Confirmation that `regNumberOcrMismatched` column is in place for Wave 4 admin queries and Plan 06-06 OCR writes
- Any deviations from direct-SQL path (fallback to prisma db push if taken)
</output>
