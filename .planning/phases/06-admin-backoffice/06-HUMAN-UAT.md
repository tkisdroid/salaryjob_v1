# Phase 6 Human UAT — Admin Backoffice

**Authored:** 2026-04-13 (Plan 06-08 Task 2)
**Status:** PENDING — awaiting human verification
**Supabase DB:** NOT YET APPLIED — run `npx tsx scripts/apply-supabase-migrations.ts` first

---

## Preconditions (all scenarios)

1. `npm run dev` running locally
2. Supabase project has Phase 6 migrations applied (files `20260414000001..000005`)
3. Seed data loaded (`npx tsx prisma/seed.ts`) — provides 6 dev accounts
4. At least one user promoted to ADMIN via seed migration (uncomment UPDATE in `20260414000005`)
5. For scenarios 7-8 only: `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` in `.env.local`

> **DB apply required note:** The Supabase project `db.lkntomgdhfvxzvnzmlct.supabase.co` is unreachable from the development machine where this plan was executed. Migrations 000001-000005 exist on disk but have NOT been applied. All 8 scenarios require a live DB. Run the apply script from a machine with Supabase network access before testing.

---

## Scenario 1 — Admin login + dashboard

**Capability axis:** D-27, D-28, D-29
**Depends on:** ADMIN user promoted via seed SQL, no external deps

### Preconditions

- User `admin@gignow.kr` (or equivalent) has `role = 'ADMIN'` in `public.users`
- Phase 6 migrations applied (ADMIN branch in middleware + routing)

### Steps

1. Open `http://localhost:3000/login`
2. Log in with the ADMIN account credentials
3. Observe the redirect destination
4. Navigate to `http://localhost:3000/admin` directly
5. Inspect the dashboard — check for the 3 counter cards (총 사업장, 인증 완료, 미인증)
6. Inspect the left sidebar — verify it is the AdminSidebar, not the BizSidebar

### Expected Outcome

- Login redirects to `/admin` (not `/home` or `/biz`) — D-28
- `/admin` renders without 403/redirect — D-27
- 3 counter cards visible with numbers (may be 0 if no businesses seeded yet) — D-29
- Sidebar links are admin-specific (사업장 관리, 대시보드), no biz-specific items — D-29

### Verification SQL

```sql
SELECT id, email, role FROM public.users WHERE email = 'admin@gignow.kr';
-- Expected: role = 'ADMIN'

SELECT COUNT(*) FROM public.business_profiles;
-- Expected: matches "총 사업장" card count
```

### PASS / FAIL

- [ ] Login → `/admin` redirect — PASS / FAIL
- [ ] Dashboard 3 cards render — PASS / FAIL
- [ ] AdminSidebar (not BizSidebar) — PASS / FAIL

### Notes

---

## Scenario 2 — Admin businesses list: search / filter / sort / pagination

**Capability axis:** D-40, D-41, D-42, D-43
**Depends on:** ADMIN login + at least 3 seeded BusinessProfiles, no external deps

### Preconditions

- Logged in as ADMIN
- At least one BusinessProfile with `businessRegNumber = '1234567890'` (digits-only, no dashes)

### Steps

1. Navigate to `http://localhost:3000/admin/businesses`
2. **Search by 사업자번호 with dashes:** Enter `123-45` in the search field → wait 300ms debounce → check results include the business with reg `1234567890`
3. **Search by name:** Clear, enter partial business name → verify ILIKE match
4. **Search by 대표자명:** Enter owner name partial → verify match
5. **Filter verified:** Toggle "인증 완료" filter → list shows only `verified=true` businesses
6. **Filter unverified:** Toggle "미인증" → list shows only `verified=false`
7. **Filter all:** Reset to "전체" → all businesses visible
8. **Sort by newest:** Confirm default sort is newest-first
9. **Sort by oldest:** Switch sort → list re-orders
10. **Sort by commission asc/desc:** Switch to commission rate sorts → verify ordering
11. **Pagination:** If >20 businesses exist, click next-page cursor → no duplicate rows across pages

### Expected Outcome

- `123-45` query matches `businessRegNumber = '1234567890'` (dash-normalized) — D-40
- Verified filter works correctly — D-41
- All 4 sort options change the order — D-42
- No duplicate rows when paginating — D-43
- URL params update on each action (source of truth in URL)

### Verification SQL

```sql
SELECT id, name, "businessRegNumber", verified, "commissionRate", "createdAt"
FROM public.business_profiles
ORDER BY "createdAt" DESC
LIMIT 5;
```

### PASS / FAIL

- [ ] Dash-normalized reg search matches digit-only DB value — PASS / FAIL
- [ ] Verified filter correct — PASS / FAIL
- [ ] 4 sort options work — PASS / FAIL
- [ ] Pagination stable (no dups) — PASS / FAIL

### Notes

---

## Scenario 3 — Admin business detail + signed image

**Capability axis:** D-29 (admin UI), D-38 (private bucket signed URL)
**Depends on:** An uploaded `businessRegImageUrl` — requires Scenario 8 to run first (or manual upload)
**Deferred:** Requires real uploaded image in private bucket

### Preconditions

- A BusinessProfile with `businessRegImageUrl IS NOT NULL`
- Phase 6 migration 000002 applied (`business-reg-docs` bucket + RLS)

### Steps

1. Navigate to `/admin/businesses`
2. Click on a business that has a reg image uploaded
3. Detail page loads — check owner info section
4. Verify `businessRegNumber` is displayed in NNN-NN-NNNNN format (with dashes) even though stored digit-only
5. Click/view the reg image — signed URL should serve the image
6. Wait or refresh within 1 hour — URL may change (TTL) but image still loads

### Expected Outcome

- Detail page renders, no 404 — D-29
- `businessRegNumber` displayed as `NNN-NN-NNNNN` (formatted, not raw digits)
- Image loads via signed URL with 1h TTL — D-38
- RLS prevents direct unauthenticated access to the bucket object

### Verification SQL

```sql
SELECT "businessRegNumber", "businessRegImageUrl", "ownerName", "ownerPhone"
FROM public.business_profiles
WHERE "businessRegImageUrl" IS NOT NULL
LIMIT 3;
```

### PASS / FAIL

- [ ] Detail page renders — PASS / FAIL
- [ ] RegNumber formatted NNN-NN-NNNNN — PASS / FAIL
- [ ] Signed image URL loads — PASS / FAIL

### Notes

**DEFERRED — requires uploaded image in private bucket. Cannot be tested until Scenario 6 (or manual upload via Supabase dashboard) provides a businessRegImageUrl value.**

---

## Scenario 4 — Admin commission rate edit

**Capability axis:** D-34, D-35, D-36
**Depends on:** ADMIN login + any BusinessProfile, no external deps

### Preconditions

- Logged in as ADMIN
- Any BusinessProfile visible in `/admin/businesses`

### Steps

1. Navigate to `/admin/businesses/[id]` for any business
2. Locate the commission rate input field (default shows "env default" or current rate)
3. **Set rate to 5.00:** Enter `5.00` → submit → observe success toast/message
4. Refresh page → verify rate shows `5.00`
5. **Reset to env default:** Clear the field → submit → rate shows "env default" (null in DB)
6. Refresh → confirm rate field is empty/shows env default
7. **Validation check:** Enter `101` → verify field error appears (Zod rejects >100)
8. **Validation check:** Enter `-1` → verify field error (must be >= 0)

### Expected Outcome

- Rate `5.00` persists in DB and reappears on refresh — D-36
- Clearing field resets to `null` → shows env default — D-35
- Values > 100 rejected with field error — D-36 Zod schema
- Change is atomic (no partial update) — D-34

### Verification SQL

```sql
SELECT id, name, "commissionRate"
FROM public.business_profiles
WHERE id = '<the business id you tested>';
-- After setting 5.00: commissionRate = 5.00
-- After clearing: commissionRate = NULL
```

### PASS / FAIL

- [ ] Rate 5.00 persists on refresh — PASS / FAIL
- [ ] Clear → null → shows env default — PASS / FAIL
- [ ] 101 rejected with field error — PASS / FAIL

### Notes

---

## Scenario 5 — Biz signup + regNumber auto-verify (D-30)

**Capability axis:** D-30, D-39
**Depends on:** Biz user account + profile edit page, no external deps

### Preconditions

- A BUSINESS user logged in (or create new via signup)
- `/biz/profile` accessible

### Steps

1. Log in as a BUSINESS user
2. Navigate to `/biz/profile` → click edit
3. Locate the 사업자등록번호 field
4. **Valid format:** Enter `123-45-67890` (10 digits with dashes) → save
5. Return to profile view → check for "인증 완료" or verified badge
6. **Verify DB:** Run SQL below — `businessRegNumber` should be digit-only, `verified=true`
7. **Invalid format:** Edit again → enter `123-45-678` (9 digits) → save → expect field error
8. Confirm verified badge does NOT appear for invalid format

### Expected Outcome

- `123-45-67890` → stored as `1234567890` (digits-only 10 chars), `verified=true` — D-30
- Invalid format → validation error, `verified` unchanged — D-30
- `verified` flag controls badge display, not `businessRegImageUrl` — D-39

### Verification SQL

```sql
SELECT "businessRegNumber", verified, "businessRegImageUrl"
FROM public.business_profiles
WHERE "userId" = '<your biz user id>';
-- Expected: businessRegNumber='1234567890', verified=true, businessRegImageUrl=NULL
```

### PASS / FAIL

- [ ] Valid regNumber → verified=true, stored digit-only — PASS / FAIL
- [ ] Invalid regNumber → field error, no flip — PASS / FAIL
- [ ] Verified badge visible after valid regNumber — PASS / FAIL

### Notes

---

## Scenario 6 — Biz createJob without reg image → redirect (D-31)

**Capability axis:** D-31
**Depends on:** Biz user with `verified=true` but `businessRegImageUrl IS NULL`, no external deps

### Preconditions

- BUSINESS user with `businessRegNumber` set (verified=true) but NO uploaded reg image
- Use the user from Scenario 5 immediately after that scenario (businessRegImageUrl should still be null)

### Steps

1. Logged in as BUSINESS user (verified=true, no image)
2. Navigate to `/biz/posts/new`
3. Fill in the job form (title, category, date, time, pay, location — all required fields)
4. Click "공고 등록" / submit
5. Observe the result

### Expected Outcome

- Form submit does NOT create a Job row — D-31
- User is redirected to `/biz/verify` — D-31
- Friendly instruction on `/biz/verify` explaining they need to upload a registration image

### Verification SQL

```sql
SELECT COUNT(*)
FROM public.jobs
WHERE "authorId" = '<your biz user id>'
  AND "createdAt" > NOW() - INTERVAL '1 minute';
-- Expected: 0 (no job row created)
```

### PASS / FAIL

- [ ] Submit redirects to /biz/verify — PASS / FAIL
- [ ] Zero Job rows created in DB — PASS / FAIL
- [ ] /biz/verify shows friendly instruction — PASS / FAIL

### Notes

---

## Scenario 7 — OCR happy path (requires CLOVA env)

**Capability axis:** D-32, D-33
**Depends on:** `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` in `.env.local` + real 사업자등록증 image
**Deferred:** Requires external CLOVA API credentials

### Preconditions

- `CLOVA_OCR_SECRET` and `CLOVA_OCR_API_URL` set in `.env.local`
- A real 사업자등록증 image file (jpg/png) where the regNumber matches the BusinessProfile's `businessRegNumber`
- BUSINESS user with `verified=true` and `businessRegNumber` set

### Steps

1. Logged in as BUSINESS user
2. Navigate to `/biz/verify`
3. Upload the matching 사업자등록증 image
4. Submit / wait for OCR processing
5. Check the response message and DB state

### Expected Outcome

- Image uploaded to `business-reg-docs` bucket — D-38
- OCR extracts regNumber from image — D-32
- Extracted number matches `businessProfile.businessRegNumber` → `ocr='matched'`, `regNumberOcrMismatched=false` — D-32
- `businessRegImageUrl` populated with the storage path — D-37

### Verification SQL

```sql
SELECT "businessRegImageUrl", "regNumberOcrMismatched"
FROM public.business_profiles
WHERE "userId" = '<your biz user id>';
-- Expected: businessRegImageUrl IS NOT NULL, regNumberOcrMismatched = false
```

### PASS / FAIL

- [ ] Image uploaded to bucket — PASS / FAIL
- [ ] OCR matches regNumber — PASS / FAIL
- [ ] regNumberOcrMismatched=false — PASS / FAIL

### Notes

**DEFERRED — requires CLOVA_OCR_SECRET + CLOVA_OCR_API_URL. Unit-level OCR parser tests (tests/ocr/clova-parser.test.ts) are GREEN with mocked fetch. Human UAT needed for real CLOVA round-trip.**

---

## Scenario 8 — OCR mismatch / timeout (graceful degradation, D-33)

**Capability axis:** D-33
**Depends on:** CLOVA env OR ability to disable network at upload moment
**Deferred:** Requires external CLOVA API credentials or controlled network disruption

### Preconditions

Option A (mismatch): `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` set; upload an image that does NOT contain the businessRegNumber
Option B (timeout): Disable outbound network or point `CLOVA_OCR_API_URL` to an unreachable host

### Steps (Option A — mismatch)

1. BUSINESS user navigated to `/biz/verify`
2. Upload an unrelated image (e.g. a receipt, not a 사업자등록증)
3. Submit and wait for response

### Steps (Option B — timeout)

1. Set `CLOVA_OCR_API_URL` to `http://127.0.0.1:1` (unreachable)
2. Upload any image
3. Submit and wait (expect a delay up to the fetch timeout)

### Expected Outcome (both options)

- Image is still saved to the bucket — `businessRegImageUrl` populated — D-33
- `regNumberOcrMismatched=true` (Option A: mismatch) OR OCR skipped gracefully (Option B: timeout/error) — D-33
- User sees a non-blocking success message + advisory notice (not an error wall) — D-33
- No Job creation blocked by this flow (blocking is separate via D-31 gate) — D-33

### Verification SQL

```sql
SELECT "businessRegImageUrl", "regNumberOcrMismatched"
FROM public.business_profiles
WHERE "userId" = '<your biz user id>';
-- Option A expected: businessRegImageUrl IS NOT NULL, regNumberOcrMismatched = true
-- Option B expected: businessRegImageUrl IS NOT NULL, regNumberOcrMismatched unchanged (false if skipped)
```

### PASS / FAIL

- [ ] Image saved even on mismatch/timeout — PASS / FAIL
- [ ] regNumberOcrMismatched=true on mismatch — PASS / FAIL
- [ ] No blocking error shown to user — PASS / FAIL

### Notes

**DEFERRED — requires CLOVA credentials or controlled network environment. Automated unit tests for D-33 parser-level error paths are GREEN (7 tests in tests/ocr/clova-parser.test.ts). Integration-level flag write tested in tests/business/verify-regnumber.test.ts D-33 block (skipped without DB).**

---

## Summary Table

| # | Scenario | Capability | External Deps | Status |
|---|----------|-----------|---------------|--------|
| 1 | Admin login + dashboard | D-27, D-28, D-29 | DB only | PENDING |
| 2 | Admin list search/filter/sort | D-40, D-41, D-42, D-43 | DB only | PENDING |
| 3 | Admin detail + signed image | D-29, D-38 | Uploaded image | DEFERRED |
| 4 | Admin commission edit | D-34, D-35, D-36 | DB only | PENDING |
| 5 | Biz regNumber auto-verify | D-30, D-39 | DB only | PENDING |
| 6 | Biz createJob image gate | D-31 | DB only | PENDING |
| 7 | OCR happy path | D-32, D-33 | CLOVA API key | DEFERRED |
| 8 | OCR mismatch/timeout | D-33 | CLOVA or net-off | DEFERRED |

**5 scenarios executable without external API deps (1, 2, 4, 5, 6)**
**3 scenarios deferred (3, 7, 8) — require uploaded image or CLOVA env**

---

## Deferred from Automated

Automated test equivalents exist for all 8 scenarios:

| Scenario | Automated test | Status |
|----------|---------------|--------|
| 1 | `tests/auth/admin-routing.test.ts` — pure unit, D-27/D-28 routing functions | GREEN (12 tests) |
| 2 | `tests/admin/business-list.test.ts` — DB-gated, skipped without connectivity | SKIP (DB unreachable) |
| 3 | No automated equivalent for signed URL TTL — inherently manual | N/A |
| 4 | `tests/admin/business-list.test.ts` — commission edit action | SKIP (DB unreachable) |
| 5 | `tests/business/verify-regnumber.test.ts` — D-30 format validation | SKIP (DB unreachable) |
| 6 | `tests/jobs/create-job-image-gate.test.ts` — D-31 gate sentinel | SKIP (DB unreachable) |
| 7 | `tests/ocr/clova-parser.test.ts` — mocked CLOVA fetch, D-32 happy path | GREEN (7 tests) |
| 8 | `tests/ocr/clova-parser.test.ts` — timeout/error/mismatch paths (D-33) | GREEN (7 tests) |
| 8+ | `tests/business/verify-regnumber.test.ts` — D-33 flag write integration | SKIP (DB unreachable) |

See `06-VALIDATION.md` for full decision-to-test mapping.
