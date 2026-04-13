---
phase: 06-admin-backoffice
plan: 08
type: execute
wave: 6
depends_on: [07]
files_modified:
  - .planning/phases/06-admin-backoffice/06-VERIFICATION.md
  - .planning/phases/06-admin-backoffice/06-HUMAN-UAT.md
  - supabase/migrations/20260414000005_phase6_admin_seed.sql
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
autonomous: false
requirements: [D-27, D-28, D-29, D-30, D-31, D-32, D-33, D-34, D-35, D-36, D-37, D-38, D-39, D-40, D-41, D-42, D-43]
must_haves:
  truths:
    - "Full vitest suite passes (no new failures beyond pre-existing deferred e2e)"
    - "Next production build succeeds with new /admin routes listed"
    - "06-VERIFICATION.md documents every D-XX → evidence mapping"
    - "06-HUMAN-UAT.md lists 8 manual scenarios with expected outcomes"
    - "Admin seed SQL exists and is documented (manual step explicitly called out)"
    - "STATE.md + ROADMAP.md + REQUIREMENTS.md updated to reflect Phase 6 code-complete"
  artifacts:
    - path: ".planning/phases/06-admin-backoffice/06-VERIFICATION.md"
      provides: "Automated evidence for every Phase 6 decision"
    - path: ".planning/phases/06-admin-backoffice/06-HUMAN-UAT.md"
      provides: "8 manual scenarios (admin login/search/detail/commission-edit, biz signup auto-verify, biz no-image redirect, OCR happy, OCR mismatch)"
    - path: "supabase/migrations/20260414000005_phase6_admin_seed.sql"
      provides: "One-off UPDATE that promotes a dev email to ADMIN (parameterized by comment)"
  key_links:
    - from: ".planning/ROADMAP.md"
      to: "Phase 6 entry"
      via: "status flip + plan list"
      pattern: "Phase 6"
---

<objective>
Close Phase 6: run the full verification battery, author the UAT script, seed the first admin user, and update project state documents. Includes one human checkpoint because an admin user must be verified end-to-end in the browser.

Purpose: Every Phase 2-5 ended with this shape. Phase 6 is no different.
Output: 3 doc files + 1 seed migration + 3 state file updates.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/05-reviews-settlements/05-VERIFICATION.md
@.planning/phases/05-reviews-settlements/05-HUMAN-UAT.md
@.planning/phases/06-admin-backoffice/06-CONTEXT.md
@.planning/phases/06-admin-backoffice/06-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Full automated verification + VERIFICATION.md</name>
  <files>.planning/phases/06-admin-backoffice/06-VERIFICATION.md</files>
  <action>
    1. Run full vitest: `npx vitest run 2>&1 | tee /tmp/phase6-vitest.log`. Expect all Phase 6 Wave-0 tests green, Phase 2-5 tests green, known deferred e2e specs still excluded (per STATE.md).

    2. Run production build: `NODE_ENV=production npx next build 2>&1 | tee /tmp/phase6-build.log`. Verify new routes appear in the route table: `/admin`, `/admin/businesses`, `/admin/businesses/[id]`, `/biz/verify` (rebuilt).

    3. Run grep sanity checks:
       - `grep -rn "MOCK_OCR" src/` → 0 matches
       - `grep -rn "mock-data" src/` → 0 matches (Phase 5 gate still satisfied)
       - `grep -rn "requireAdmin" src/` → expected hits (dal.ts + admin routes + actions)

    4. Author `.planning/phases/06-admin-backoffice/06-VERIFICATION.md` using Phase 5's 05-VERIFICATION.md as the template. For each decision D-27..D-43, include:
       - The decision text
       - Test command that proves it (from the RESEARCH.md §Validation Architecture matrix)
       - Pass/fail marker
       - Pointer to the code file + line that implements it

    5. Include one "known limitation" section:
       - "CLOVA_OCR_SECRET + CLOVA_OCR_API_URL not provisioned in local env — OCR tests use mocked fetch. Production gate behavior verified via unit mocks only. Human UAT scenario 7 requires real key."
  </action>
  <verify>
    <automated>npx vitest run && NODE_ENV=production npx next build 2>&1 | grep -E "(error|Route)" | head -40</automated>
  </verify>
  <done>
    - All tests green
    - Build succeeds with /admin routes listed
    - 06-VERIFICATION.md authored with every decision marked
  </done>
</task>

<task type="auto">
  <name>Task 2: HUMAN-UAT.md + admin seed migration</name>
  <files>.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md, supabase/migrations/20260414000005_phase6_admin_seed.sql</files>
  <action>
    1. Create `supabase/migrations/20260414000005_phase6_admin_seed.sql`:
       ```sql
       -- Phase 6 admin seed. This migration is a NO-OP by default.
       -- To promote a dev user to ADMIN, uncomment the UPDATE below and set the email.
       -- The corresponding auth.users row must already exist (create via Supabase dashboard).
       -- BEGIN;
       --   UPDATE public.users SET role = 'ADMIN' WHERE email = 'admin@gignow.kr';
       -- COMMIT;

       -- Intentionally empty so apply-supabase-migrations records it without mutation.
       SELECT 1;
       ```

    2. Create `.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md` with 8 scenarios:

       **Scenario 1 — Admin login + dashboard**
       Steps: (a) Promote dev account to ADMIN via seed SQL (uncomment & run), (b) log in, (c) land on /admin, (d) see 3 counter cards.
       Expected: dashboard rendered, non-404, counts accurate vs `SELECT count(*) FROM business_profiles`.

       **Scenario 2 — Admin businesses list search/filter/sort**
       Steps: navigate /admin/businesses → search by name/reg/owner/phone → toggle verified filter → switch sort between created and rate → paginate via cursor.
       Expected: URL updates per action; results match filters; pagination stable (no dup rows across pages).

       **Scenario 3 — Admin business detail + signed image**
       Steps: click a business with businessRegImageUrl set → detail page loads → image is visible → refresh once (URL changes or still works within 1h TTL).
       Expected: signed URL works; owner info + regNumber in NNN-NN-NNNNN format; reg image preview renders.

       **Scenario 4 — Admin commission edit**
       Steps: detail page → enter "5.00" in rate → submit → refresh → rate persists → clear field → submit → rate shows "env default".
       Expected: DB column updates; UI reflects change; zod rejects 101 with field error.

       **Scenario 5 — Biz signup → auto-verify (D-30)**
       Steps: sign up new business → profile edit → enter regNumber "123-45-67890" → save → verified badge visible.
       Expected: verified=true in DB; 사업자번호 stored digit-only.

       **Scenario 6 — Biz createJob without image → redirect (D-31)**
       Steps: logged-in biz (verified=true but no reg image yet) → try to create a job → get redirected to /biz/verify.
       Expected: no Job row created; land on /biz/verify with friendly instruction.

       **Scenario 7 — OCR happy path (requires CLOVA env)**
       Steps: set CLOVA_OCR_SECRET+URL → upload a real 사업자등록증 image that contains the biz's regNumber → submit.
       Expected: ocr='matched' returned; regNumberOcrMismatched=false; businessRegImageUrl populated.

       **Scenario 8 — OCR mismatch / timeout (D-33 graceful)**
       Steps: upload an unrelated image OR disable network at upload moment → submit.
       Expected: image saved; regNumberOcrMismatched set true (mismatch) OR skipped (timeout); user sees neutral success + advisory notice; no blocking error.

       For each scenario, include: preconditions, verification SQL (where relevant), pass/fail boxes, and a notes section.
  </action>
  <verify>
    <automated>ls .planning/phases/06-admin-backoffice/06-HUMAN-UAT.md supabase/migrations/20260414000005_phase6_admin_seed.sql && npx tsx scripts/apply-supabase-migrations.ts 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Seed migration applied (no-op but recorded)
    - UAT doc has 8 scenarios with testable steps
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human UAT smoke — scenarios 1, 2, 4, 5, 6 (no external deps)</name>
  <action>
    Execute the 5 human UAT scenarios that require no external dependencies. Scenarios 3 (needs an uploaded image), 7 (needs CLOVA env), and 8 (needs CLOVA env or network disable) are deferred to post-deploy UAT.

    What was built in Phase 6:
    - /admin dashboard + AdminSidebar (new component per D-29)
    - /admin/businesses list with 4-field search + verified filter + 4 sort options + cursor pagination
    - /admin/businesses/[id] detail with signed image + commission edit
    - /biz/profile regNumber + ownerName + ownerPhone inputs with D-30 auto-verify
    - /biz/verify rebuilt with real upload + OCR (graceful degradation)
    - createJob image gate (D-31)
    - checkOut commission snapshot (D-34/D-35/D-36)

    How to verify:
    Run `npm run dev`. Open `.planning/phases/06-admin-backoffice/06-HUMAN-UAT.md`. Complete scenarios 1, 2, 4, 5, 6. Mark each as PASS/FAIL in the doc.

    Specifically verify:
    - [ ] Scenario 1: /admin dashboard renders for ADMIN account
    - [ ] Scenario 2: search by 사업자번호 with dashes ('123-45') matches digit-only storage
    - [ ] Scenario 4: commission rate 5.00 persists and reappears on refresh
    - [ ] Scenario 5: regNumber "123-45-67890" flips verified badge
    - [ ] Scenario 6: createJob without reg image redirects to /biz/verify
  </action>
  <verify>Human reviewer marks 5/5 scenarios as PASS in 06-HUMAN-UAT.md</verify>
  <done>5/5 no-dep scenarios pass. Scenarios 3/7/8 explicitly logged as deferred in SUMMARY.</done>
  <resume-signal>Reply "approved — 5/5 basic scenarios pass" or describe failures with scenario number + expected vs actual</resume-signal>
</task>

<task type="auto">
  <name>Task 4: Update STATE.md + ROADMAP.md + REQUIREMENTS.md</name>
  <files>.planning/STATE.md, .planning/ROADMAP.md, .planning/REQUIREMENTS.md</files>
  <action>
    1. `.planning/ROADMAP.md`:
       - Update Phase 6 section Goal from `[To be planned]` to: "관리자(ADMIN)가 사업장 검색·수수료 관리·사업자등록증 열람을 할 수 있고, 사업자는 등록번호 자동 인증 + 첫 공고 등록 시 등록증 이미지 업로드 게이트를 통과한다"
       - Update plan count: `**Plans:** 8 plans`
       - Replace the placeholder plan list with the 8 actual plans (with objectives)
       - Flip status to "Code Complete [date] — HUMAN-UAT 3 시나리오 (3/7/8) 대기" depending on human checkpoint outcome

    2. `.planning/STATE.md`:
       - Update progress frontmatter: total_phases 6, completed_phases 5 (if phase 5 not yet validated) or 6 (if it is)
       - Update `Current Position` to Phase 06 code-complete
       - Append to `Accumulated Context > Key Decisions` table: D-27..D-43 one-liner entries with 2026-04-13 date
       - Append phase summary row to Phase Progress table
       - Append to Open TODOs: remaining human UAT scenarios (3, 7, 8)

    3. `.planning/REQUIREMENTS.md`:
       - Add a new section "Phase 6 Operational Requirements (D-27..D-43)" listing all 17 decisions with pass/fail markers tied to 06-VERIFICATION.md
       - Update header requirement total if using traceability matrix
  </action>
  <verify>
    <automated>grep -c "Phase 6" .planning/ROADMAP.md && grep -c "D-27" .planning/REQUIREMENTS.md && grep -c "Phase 06 code" .planning/STATE.md</automated>
  </verify>
  <done>3 state docs updated, Phase 6 visibility in roadmap/state/requirements matches Phase 5 style.</done>
</task>

</tasks>

<verification>
- Full vitest suite green (with known deferred exclusions documented)
- Production build succeeds
- 06-VERIFICATION.md complete
- 06-HUMAN-UAT.md has 8 scenarios
- 5/8 human scenarios verified (3 deferred require external setup)
- State docs updated
</verification>

<success_criteria>
- Phase 6 code-complete
- All automated gates passed
- Documentation complete
- Outstanding human UAT items explicitly recorded
</success_criteria>

<output>
`.planning/phases/06-admin-backoffice/06-08-SUMMARY.md` — single source of truth for Phase 6 completion:
- Final test/build metrics
- Human UAT pass/fail summary
- Links to VERIFICATION + HUMAN-UAT docs
- Commit hash(es) delivering the phase
</output>
