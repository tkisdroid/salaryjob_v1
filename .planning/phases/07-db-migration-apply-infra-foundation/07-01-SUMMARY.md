---
phase: 07-db-migration-apply-infra-foundation
plan: 01
subsystem: infra-foundation
tags:
  - docs
  - mock-policy
  - infra
  - external-keys
requirements:
  - INFRA-01
  - INFRA-03
dependency-graph:
  requires: []
  provides:
    - MOCK-LOG standard template (`.planning/templates/MOCK-LOG.md`)
    - Milestone MOCK index (`.planning/MOCK-INDEX.md`)
    - Planning README with MOCK policy section
    - Phase 6 deferred MOCK-LOG instance (3 entries)
    - CLOVA OCR 5-minute provisioning guide (`docs/external-keys.md`)
    - `.env.example` → `docs/external-keys.md` link comment
  affects:
    - Phase 6 deferred Scenarios 7, 8, 9 are now tracked
    - Phase 8 UAT-04 can append entries to the existing Phase 6 MOCK-LOG
    - Phase 10 LEG-03 MOCK removal gate has a canonical index to scan
tech-stack:
  added: []
  patterns:
    - markdown 4-field MOCK-LOG table (D-50)
    - milestone MOCK index (pipe table) (D-51)
    - text-only NCP checklist (D-48 no screenshots)
key-files:
  created:
    - .planning/templates/MOCK-LOG.md
    - .planning/MOCK-INDEX.md
    - .planning/README.md
    - .planning/phases/06-admin-backoffice/MOCK-LOG.md
    - docs/external-keys.md
  modified:
    - .env.example (1-line docs link comment)
decisions:
  - D-49 applied: template at `.planning/templates/MOCK-LOG.md`, phase instance at `.planning/phases/<phase>/MOCK-LOG.md`
  - D-50 applied: 4 mandatory fields only (Mocked path / Reason / Real-key re-verify step / Target milestone); no date/owner/PR-link
  - D-51 applied: pipe table index with 5 columns; Phase 6 seeded with 3 rows (Sc.9, Sc.7, Sc.8)
  - D-52 applied: README MOCK section = 30 lines (well under 1-page / ≤60 line limit)
  - D-47/D-48 applied: `docs/external-keys.md` = 6-step NCP text checklist, no image embeds
  - D-53 applied: prep-only scope — no network operations touched
metrics:
  duration: ~10 minutes
  completed: 2026-04-15
  tasks-completed: 2/2
  files-created: 5
  files-modified: 1
---

# Phase 7 Plan 01: DB Migration Apply & Infra Foundation — Prep (Docs + MOCK Policy) Summary

**One-liner:** Prep-only plan — established 4-field MOCK-LOG template, milestone MOCK index, planning README policy section, Phase 6 deferred MOCK-LOG (3 entries), and CLOVA OCR 5-minute provisioning guide, all without any Supabase network dependency.

## What Was Built

### Task 1 — MOCK-LOG Infrastructure (`ea9cd67`)

Created 4 planning files that establish the milestone-wide MOCK tracking standard:

1. **`.planning/templates/MOCK-LOG.md`** — Standard template with exactly 4 fields (D-50): Mocked path / Reason / Real-key re-verify step / Target milestone. HTML comment directs users to repeat the `## Entry:` block per mocked scenario. No date/owner/PR-link fields (D-50 explicitly excludes these as over-engineering for a single-developer project).

2. **`.planning/MOCK-INDEX.md`** — Milestone-level aggregation table with columns `Phase | Mocked path | Reason | Target milestone | MOCK-LOG`. Pre-populated with 3 Phase 6 deferred rows linking to the Phase 6 MOCK-LOG instance. Pipe-table format per D-51 and PATTERNS.md §"Markdown Table Format".

3. **`.planning/README.md`** — Created from scratch (file did not previously exist). 30 lines total (well under the D-52 60-line soft limit). Contains brief `.planning/` orientation (5 lines) followed by `## MOCK 정책 및 템플릿 사용법` section covering: what MOCK-LOG is, 4 mandatory fields, template path, 4-step usage procedure, and the trigger rule quoted from ROADMAP §"MOCK Policy".

4. **`.planning/phases/06-admin-backoffice/MOCK-LOG.md`** — First instantiation of the template. 3 `## Entry:` blocks with verbatim content from 07-PATTERNS.md lines 173-206:
   - **Sc.9** — Admin Detail Signed Image Viewing (target v1.1; Phase 7 apply 단계에서 즉시 해소 예정)
   - **Sc.7** — CLOVA OCR Happy-Path Round-Trip (target v1.2)
   - **Sc.8** — CLOVA OCR Mismatch Graceful Degradation (target v1.2)

### Task 2 — CLOVA OCR Provisioning Guide + .env.example Link (`abe246a`)

Created the first `docs/` file (the folder itself is new to the repo) and annotated `.env.example`:

1. **`docs/external-keys.md`** — Per D-47/D-48: 6-step NCP Console → CLOVA OCR General 도메인 → API Gateway Invoke URL + X-OCR-SECRET 복사 → `.env.local` → `npm run dev` 재시작 → `/biz/verify` 검증 체크리스트. Exactly 6 `- [ ]` items. No screenshots (D-48). References the two exact env var names from `src/lib/ocr/clova.ts:42-50` (`CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL`) so the docs stay in lockstep with the code. Includes graceful-fail reminder quote at the bottom.

2. **`.env.example`** — Single-line annotation inserted between the existing graceful-degradation comment and the `CLOVA_OCR_SECRET=` line: `# Provisioning guide: docs/external-keys.md §CLOVA OCR`. Diff = exactly 1 line added. `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` values remain blank (T-INFRA-01 mitigation — no secrets in repo).

## Key Decisions

- **D-50 4-field rigor** — All four MOCK-LOG artifacts use the same 4-field table header verbatim so grep-based validation in downstream phases is trivial.
- **D-48 no screenshots** — Text-only NCP checklist survives NCP console UI changes without going stale; matches the "maintenance burden minimum" v1.1 posture.
- **Prep/apply split honored (D-53)** — This plan touched zero network-dependent resources. Everything here was committable without Supabase access. Admin seed SQL mutation, `apply-supabase-migrations.ts`, `prisma migrate status`, and signed-URL TTL measurement are deferred to 07-02 apply plan.
- **Main-repo pollution fix during Task 1** — Initial Write tool calls with absolute paths landed in the main repo root (`C:\Users\A\Desktop\salaryjob_v1\.planning\…`) instead of the worktree (`C:\…\.claude\worktrees\agent-a69d5ac6\.planning\…`). Mid-task I moved the 4 files to the worktree via `mv`, then `rmdir`'d the empty directories from the main repo to prevent bleed-through into sibling worktrees. Task 2 used the correct worktree absolute path from the start. Git history in the worktree is clean — commits contain only the intended additions.

## Verification Evidence

### Automated (all passed)

```bash
test -f .planning/templates/MOCK-LOG.md                                        # PASS
test -f .planning/MOCK-INDEX.md                                                # PASS
test -f .planning/README.md                                                    # PASS
test -f .planning/phases/06-admin-backoffice/MOCK-LOG.md                       # PASS
test -f docs/external-keys.md                                                  # PASS
grep -q "Mocked path" .planning/templates/MOCK-LOG.md                          # PASS
grep -q "Real-key re-verify step" .planning/templates/MOCK-LOG.md              # PASS
grep -q "Target milestone" .planning/templates/MOCK-LOG.md                     # PASS
grep -q "Reason" .planning/templates/MOCK-LOG.md                               # PASS
grep -q "MOCK 정책" .planning/README.md                                         # PASS
grep -q "templates/MOCK-LOG.md" .planning/README.md                            # PASS
grep -q "phases/06-admin-backoffice/MOCK-LOG.md" .planning/MOCK-INDEX.md       # PASS
grep -c "^## Entry:" .planning/phases/06-admin-backoffice/MOCK-LOG.md          # 3
grep -q "Phase 6 Scenario 9" .planning/phases/06-admin-backoffice/MOCK-LOG.md  # PASS
grep -q "CLOVA_OCR_SECRET" .planning/phases/06-admin-backoffice/MOCK-LOG.md    # PASS
grep -c "^- \[ \]" docs/external-keys.md                                       # 6
! grep -qE "!\[.*\]\(" docs/external-keys.md                                   # PASS (no images)
grep -q "docs/external-keys.md" .env.example                                   # PASS
grep -q "^CLOVA_OCR_SECRET=$" .env.example                                     # PASS (blank preserved)
grep -q "^CLOVA_OCR_API_URL=$" .env.example                                    # PASS (blank preserved)
wc -l .planning/README.md                                                      # 30 (≤60)
```

### Plan-level one-shot (from `<verification>` block)

```
07-01 prep: all artifacts present
```

### .env.example diff (1-line addition only)

```diff
@@ -66,6 +66,7 @@ APPLICATION_JWT_SECRET=
 # ============================================================================
 # Naver CLOVA OCR General (biz license extraction) — https://guide.ncloud-docs.com/docs/en/clovaocr-overview
 # Leave blank to disable OCR (D-33 graceful degradation: image still saves, admin review flag set)
+# Provisioning guide: docs/external-keys.md §CLOVA OCR
 CLOVA_OCR_SECRET=
 CLOVA_OCR_API_URL=
```

## Deviations from Plan

None — plan executed exactly as written. Auto-fix rules 1-3 were not triggered. No checkpoints, no architectural decisions surfaced. No authentication gates (this plan is entirely offline).

## Threat Model Compliance

- **T-INFRA-01 (Information Disclosure — `.env.example` / `docs/external-keys.md`):** Mitigation enforced. Automated grep `^CLOVA_OCR_SECRET=$` confirms the placeholder stays blank post-edit. `docs/external-keys.md` contains zero secret values — only provisioning procedures and official NCP links.
- **T-07P01-02 (Tampering — MOCK-LOG template / instance):** Accepted per plan. Git ledger tracks changes; no additional signature/verification gate introduced (consistent with D-50 single-developer posture).
- **T-07P01-03 (Repudiation — MOCK-INDEX edit history):** Accepted per plan. Commit messages `ea9cd67` and `abe246a` with co-author trailer provide the audit trail.

## Success Criteria Check

- INFRA-03 (5): `.planning/templates/MOCK-LOG.md` 4-field standard exists + `.planning/phases/06-admin-backoffice/MOCK-LOG.md` pre-populated with 3 deferred entries — MET.
- INFRA-01 (4 partial): `docs/external-keys.md` with 6-step checklist + `.env.example` link comment — MET. The "5-minute completion wall-clock" criterion is `<manual-only>` per 07-VALIDATION.md and is outside this plan's automation scope.
- MOCK policy documentation complete — Phase 8 UAT-04 can append entries to `.planning/phases/06-admin-backoffice/MOCK-LOG.md` without further template work.

## Known Stubs

None. All files in this plan are complete, self-contained documentation artifacts. No code paths, no empty-data renders, no placeholders that flow to UI. The `<dev-email>` placeholder in the admin seed SQL is explicitly out of scope (it belongs to 07-02 apply).

## Deferred Issues

None from this plan.

## Exit State

Ready for plan 07-02 (apply stage). The two checkpoints that 07-02 will need are:

1. Supabase network access confirmed (per STATE.md blocker)
2. Dev email chosen for admin promotion (will be substituted into `supabase/migrations/20260414000005_phase6_admin_seed.sql` `<dev-email>` placeholder)

Commits on this worktree branch:

| Task | Name                                                 | Commit    | Files                                                                                                                            |
| ---- | ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1    | MOCK-LOG infrastructure                              | `ea9cd67` | `.planning/templates/MOCK-LOG.md`, `.planning/MOCK-INDEX.md`, `.planning/README.md`, `.planning/phases/06-admin-backoffice/MOCK-LOG.md` |
| 2    | CLOVA OCR provisioning guide + .env.example link     | `abe246a` | `docs/external-keys.md`, `.env.example`                                                                                          |

## Self-Check: PASSED

Verified at write time:

- `test -f .planning/templates/MOCK-LOG.md` → FOUND
- `test -f .planning/MOCK-INDEX.md` → FOUND
- `test -f .planning/README.md` → FOUND
- `test -f .planning/phases/06-admin-backoffice/MOCK-LOG.md` → FOUND
- `test -f docs/external-keys.md` → FOUND
- `.env.example` modified (1-line addition) → FOUND
- Commit `ea9cd67` → FOUND in `git log`
- Commit `abe246a` → FOUND in `git log`
