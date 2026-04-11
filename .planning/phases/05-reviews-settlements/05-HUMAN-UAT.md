# Phase 5 HUMAN-UAT Scenarios

**Phase**: 05-reviews-settlements
**Created**: 2026-04-11
**Status**: DEFERRED — user has requested deferral; see `.planning/todos/pending/2026-04-11-phase-5-plan-05-05-browser-uat-review-settlement-flow.md`
**Prerequisite**: Phase 5 Plans 01-07 complete, `npm run dev` running, seeded dev DB with at least 3 settled applications for the test worker.

---

## Scenario 1 — End-to-end loop under 1 minute

**Goal**: Verify ROADMAP success criterion #5: "탐색 → 지원 → 근무 → 리뷰 → 정산 확인 loop completes in under 1 minute with real Supabase round-trips."

**Setup**:
- Use the seeded worker account (e.g. worker@dev.gignow.com).
- Use a business + job where time window gates allow immediate check-in (e.g. manipulate job.workDate + startTime to "now" via seed or admin SQL).
- Have the biz side open in a second tab for QR token generation.

**Steps** (stopwatch on):
1. (0s) Navigate to `/home`. Browse list or map toggle.
2. (5s) Open a job detail page, click "원탭 지원".
3. (10s) Switch to biz tab, refresh applicants list, click "수락".
4. (15s) Back to worker tab, navigate to `/my/applications/{id}/check-in`, click check-in (use fake GPS within geofence if necessary).
5. (25s) Wait or fast-forward actualHours, then click "체크아웃" (requires QR scan from biz tab).
6. (45s) On the worker's success screen, click "리뷰 작성". Fill 5 stars + 2 tags + short comment. Submit.
7. (55s) Navigate to `/my/settlements`. Verify the just-completed shift appears in the list with correct earnings.
8. Stop stopwatch.

**Pass criteria**: Total elapsed time ≤ 60 seconds from step 1 to step 8. Every step responds within 1-2 seconds of the previous action.

**Observed**: (fill in during UAT)
**Verdict**: (pass/fail)

---

## Scenario 2 — Mobile 375px layout readability

**Goal**: Verify REV-01/02 and SETL-02/03 UIs work on a mobile viewport without horizontal scroll or unreadable text.

**Setup**: Chrome DevTools device toolbar, iPhone SE (375×667) preset.

**Pages to verify**:
1. `/my/settlements` — totals cards fit in 2-column grid; settlement cards don't overflow; review prompt banner is readable.
2. `/my/applications/{id}/review` — star picker is large enough to tap; tag chips wrap to multiple rows; textarea and submit button are reachable without zoom.
3. `/biz/settlements` — same checks for biz side.
4. `/biz/posts/{jobId}/applicants/{applicantId}/review` — same as worker review page.

**Pass criteria**:
- Zero horizontal scroll on any page
- All Korean text legible at 375px without zoom
- All interactive elements (star buttons, chips, submit) have ≥ 44×44 pt touch targets
- No layout shifts after initial paint

**Observed**: (fill in)
**Verdict**: (pass/fail)

---

## Scenario 3 — Review UX feel matches Timee / check-in flow rhythm

**Goal**: Verify REV-01/02 UIs subjectively align with the Phase 4 check-in confirmation flow's "single-screen stepped" visual rhythm.

**Compare**:
- Side-by-side: `/my/applications/{id}/check-in` (Phase 4) vs `/my/applications/{id}/review` (Phase 5).

**Checkpoints**:
- Both pages have a prominent single-purpose heading at the top
- Both pages use sections with small bold labels above the interactive elements
- Both pages have a sticky-at-bottom action button
- Both pages use consistent spacing (gap-6 between sections) and card-free flat layout for the main form
- Korean microcopy (section labels, button text) matches the project voice (polite, concise, no unnecessary explanations)

**Pass criteria**: Subjective but verifiable by inspection — the review page "feels like" a continuation of the check-in page, not a different app.

**Observed**: (fill in)
**Verdict**: (pass/fail)

---

## Sign-off

- [ ] Scenario 1: end-to-end loop under 1 minute
- [ ] Scenario 2: mobile 375px layout
- [ ] Scenario 3: review UX rhythm match

When all 3 pass, Phase 5 is complete at the UAT level as well as the automated-gate level. Update STATE.md milestone status to v1-complete.
