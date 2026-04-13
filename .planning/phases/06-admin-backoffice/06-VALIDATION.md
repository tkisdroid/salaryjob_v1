# Phase 6 Validation Matrix — Nyquist-Style Test Map

**Scaffolded:** 2026-04-13 (Phase 6 planning)
**Final evidence:** populated by Plan 06-08 Task 1 (post-execution)

Every Phase 6 decision maps to at least one automated test. Tests are authored RED in Plan 06-01 and flip to GREEN as later waves ship implementations.

| Decision | Behavior | Test File | Wave Authored | Wave Flips GREEN | Command |
|----------|----------|-----------|---------------|-------------------|---------|
| D-27 | /admin blocks non-ADMIN; `canRoleAccessPath('BUSINESS','/admin')===false` | `tests/auth/admin-routing.test.ts` | 01 | 03 | `npx vitest run tests/auth/admin-routing.test.ts` |
| D-28 | `getDefaultPathForRole('ADMIN')==='/admin'`; ADMIN login → /admin (pure-function coverage; middleware-level root redirect → Human UAT Scenario 1) | `tests/auth/admin-routing.test.ts` | 01 | 03 | same |
| D-29 | AdminSidebar separate component, not /biz reuse | manual/grep | — | 05 | `grep -rn "BizSidebar" src/app/admin` returns 0 matches |
| D-30 | Valid regNumber format → verified=true auto | `tests/business/verify-regnumber.test.ts` (D-30 format-validation `describe` block) | 01 | 06 (Task 1) | `npx vitest run tests/business/verify-regnumber.test.ts -t "D-30"` |
| D-31 | createJob with null businessRegImageUrl → redirect sentinel | `tests/jobs/create-job-image-gate.test.ts` | 01 | 07 | `npx vitest run tests/jobs/create-job-image-gate.test.ts` |
| D-32 | runBizLicenseOcr parses CLOVA response; extracts digit-only 10-char candidates | `tests/ocr/clova-parser.test.ts` | 01 | 04 | `npx vitest run tests/ocr/clova-parser.test.ts` |
| D-33 | OCR timeout/error/mismatch → image still saved, no user-facing failure, `regNumberOcrMismatched=true` written on non-matching OCR candidates | `tests/ocr/clova-parser.test.ts` (parser-level error/timeout/empty-candidate coverage) + `tests/business/verify-regnumber.test.ts` — D-33 integration `describe` block: mocks `runBizLicenseOcr` to return `{ ok: true, candidateRegNumbers: ['9999999999'] }`, invokes `uploadBusinessRegImage`, asserts `businessProfile.regNumberOcrMismatched === true` AND `businessProfile.businessRegImageUrl IS NOT NULL` | 01 | 04 (parser) + 06 Task 2 (integration flag write) | `npx vitest run tests/ocr/clova-parser.test.ts tests/business/verify-regnumber.test.ts -t "D-33"` |
| D-34 | checkOut writes commissionRate + commissionAmount + netEarnings snapshot | `tests/settlements/commission-snapshot.test.ts` | 01 | 07 | `npx vitest run tests/settlements/commission-snapshot.test.ts` |
| D-35 | Null rate falls back to PLATFORM_DEFAULT_COMMISSION_RATE env | same as D-34 | 01 | 07 | same |
| D-36 | commissionRate Decimal(5,2), nullable; override supersedes env | same as D-34 | 01 | 07 | same |
| D-37 | BusinessProfile has 6 new columns (5 nullable + `regNumberOcrMismatched` NOT NULL DEFAULT false); Application has 3 new nullable columns | `psql "\d business_profiles"` + `"\d applications"` | — | 02 | see `.planning/phases/06-admin-backoffice/06-VERIFICATION.md` |
| D-38 | Bucket `business-reg-docs` private + 4 RLS policies | `SELECT polname FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'biz_reg_%'` returns 4 | — | 02 | `.planning/phases/06-admin-backoffice/06-VERIFICATION.md` |
| D-39 | `verified` column semantics = regNumber-format ok (not image-uploaded) | `tests/business/verify-regnumber.test.ts` covers flip; `tests/jobs/create-job-image-gate.test.ts` covers image-gate explicit check | 01 | 06+07 | combined |
| D-40 | Admin list searches name/reg/owner/phone via ILIKE with dash-normalized reg | `tests/admin/business-list.test.ts` | 01 | 05 | `npx vitest run tests/admin/business-list.test.ts` |
| D-41 | verified filter (all/yes/no) | same | 01 | 05 | same |
| D-42 | sort by createdAt asc/desc and commissionRate asc/desc | same | 01 | 05 | same |
| D-43 | Cursor pagination 20/page, stable order | same | 01 | 05 | same |

## Sampling Plan

| Layer | When Run | Scope |
|-------|----------|-------|
| Per task commit | After `git add` | `npx vitest run tests/<touched-area>` |
| Per plan merge | After last task in each plan | `npx vitest run tests/auth tests/admin tests/business tests/jobs tests/settlements tests/ocr` |
| Phase gate | Plan 06-08 Task 1 | Full suite + `next build` + grep sanity (MOCK_OCR / mock-data) |

## Deferred (Human UAT only)

- D-28 middleware-level root redirect for ADMIN (`/` → `/admin`) — Scenario 1 (middleware not exercised by vitest; `getDefaultPathForRole` unit test covers the pure-function side)
- D-29 visual check (sidebar not reusing biz styles) — Scenario 2
- D-32 end-to-end CLOVA round trip — Scenario 7 (requires env)
- D-33 real timeout scenario — Scenario 8 (requires env OR network disable). Automated coverage for the `regNumberOcrMismatched` flag write is handled by the D-33 integration block in `tests/business/verify-regnumber.test.ts` — only the real-network timeout path is deferred to UAT.
- Signed URL viewing — Scenario 3

All deferred items listed in `.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md`.
