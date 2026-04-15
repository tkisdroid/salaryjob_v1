---
phase: 7
slug: db-migration-apply-infra-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 7 is infrastructure/docs-heavy; most signals are CLI-command output + file-existence checks rather than unit tests.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — Phase 7 validates via Prisma CLI + curl + file grep |
| **Config file** | n/a |
| **Quick run command** | `npx prisma validate` |
| **Full suite command** | `npx prisma migrate status && npx prisma validate && npx prisma generate` |
| **Estimated runtime** | ~30 seconds (network-bound) |

---

## Sampling Rate

- **After every task commit (prep group):** `ls` / `grep` the artifact just written (file-existence + required-fields check).
- **After every task commit (apply group):** Re-run the relevant Prisma / curl command to confirm no regression.
- **After every plan wave:** Full suite command above (apply group only).
- **Before `/gsd-verify-work`:** Full suite green + Admin login manual verification + signed URL 200 OK captured.
- **Max feedback latency:** 60 seconds (one command round-trip to Supabase).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01-prep | 1 | INFRA-03 | — | n/a | file | `test -f .planning/templates/MOCK-LOG.md` | ✅ W0 | ⬜ pending |
| 07-01-02 | 01-prep | 1 | INFRA-03 | — | n/a | file | `test -f .planning/MOCK-INDEX.md && grep -q "Phase 6" .planning/MOCK-INDEX.md` | ✅ W0 | ⬜ pending |
| 07-01-03 | 01-prep | 1 | INFRA-03 | — | n/a | file | `grep -q "MOCK" .planning/README.md` | ✅ W0 | ⬜ pending |
| 07-01-04 | 01-prep | 1 | INFRA-03 | — | n/a | file | `test -f .planning/phases/06-admin-backoffice/MOCK-LOG.md && grep -c "Mocked path" .planning/phases/06-admin-backoffice/MOCK-LOG.md` | ✅ W0 | ⬜ pending |
| 07-01-05 | 01-prep | 1 | INFRA-01 | — | secret not checked in | file | `test -f docs/external-keys.md && grep -q "CLOVA_OCR_SECRET" docs/external-keys.md` | ✅ W0 | ⬜ pending |
| 07-01-06 | 01-prep | 1 | INFRA-01 | — | docs link only | grep | `grep -q "docs/external-keys.md" .env.example` | ✅ W0 | ⬜ pending |
| 07-02-01 | 02-apply | 2 | MIG-03 | — | admin seed email parameterized | grep | `! grep -q "admin@gignow.kr" supabase/migrations/20260414000005_phase6_admin_seed.sql` | ✅ W0 | ⬜ pending |
| 07-02-02 | 02-apply | 2 | MIG-01 | — | all migrations tracked | cli | `npx tsx scripts/apply-supabase-migrations.ts` | ✅ W0 | ⬜ pending |
| 07-02-03 | 02-apply | 2 | MIG-01 | — | drift = 0 | cli | `npx prisma migrate status` (exit 0) | ✅ W0 | ⬜ pending |
| 07-02-04 | 02-apply | 2 | MIG-01 | — | schema valid | cli | `npx prisma validate` | ✅ W0 | ⬜ pending |
| 07-02-05 | 02-apply | 2 | MIG-01 | — | client generated | cli | `npx prisma generate` | ✅ W0 | ⬜ pending |
| 07-02-06 | 02-apply | 2 | MIG-03 | — | role mirrored to app_metadata | sql | `SELECT role FROM public.users WHERE email = $1` + `SELECT raw_app_meta_data->>'role' FROM auth.users WHERE email = $1` (both return 'ADMIN') | ✅ W0 | ⬜ pending |
| 07-02-07 | 02-apply | 2 | MIG-02 | T-MIG-02 | RLS blocks unauthenticated read | curl | `curl -I <signed_url>` returns 200, `curl -I <raw_bucket_url>` returns 400/403 | ⚠️ manual | ⬜ pending |
| 07-02-08 | 02-apply | 2 | MIG-04 | — | /admin route accessible as ADMIN | manual | browser login → /admin, /admin/businesses, /admin/businesses/[id] all render (no redirect to /login) | ⚠️ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — Phase 7 has no unit-test scaffolding; all validation is CLI-based + file presence + two manual browser checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Signed URL 200 OK + unauthenticated raw URL blocked | MIG-02 | Supabase Storage signed URLs are ephemeral (TTL 3600s); curl timing + TTL measurement must be captured live during VERIFICATION. | 1. Upload test image via `/biz/verify` as authenticated Business user. 2. Query `storage.objects` for the path. 3. Create signed URL (supabase-js `createSignedUrl(3600)`). 4. `curl -I <signed_url>` → expect `HTTP/2 200`. 5. `curl -I https://<project>.supabase.co/storage/v1/object/public/business-reg-docs/<path>` → expect `400` or `403`. Paste both responses into VERIFICATION.md (mask tokens). |
| Admin login → `/admin` 3 routes accessible | MIG-04 | JWT refresh requires manual logout → re-login after `raw_app_meta_data.role` update. Cannot be automated without a full headless-browser fixture (out of scope for v1.1). | 1. Log out of current dev session. 2. Log in with the seeded Admin email. 3. Navigate to `/admin`, `/admin/businesses`, `/admin/businesses/[id]`. 4. Capture screenshot or status: all 3 render without redirect to `/login`. 5. Note JWT refresh occurred (inspect session cookie `role` claim). |
| CLOVA env provisioning 5-minute check | INFRA-01 | The "5 minutes" claim in the success criterion can only be validated by a fresh developer running the guide end-to-end. | At execute close: one self-timed dry run of `docs/external-keys.md` §CLOVA section from NCP console signup → `.env.local` write → local Next.js restart verification. Record elapsed time in VERIFICATION.md. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (Phase 7: CLI + file-grep count as automated; 3 manual items acknowledged above)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (n/a — no test framework scaffolding)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter after planner populates concrete task IDs

**Approval:** pending
