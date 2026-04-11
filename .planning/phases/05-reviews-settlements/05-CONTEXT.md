# Phase 5: 리뷰·정산·목업 제거 — Context

**Gathered:** 2026-04-11
**Status:** Ready for research & planning
**Source:** Inline discuss capture (within /gsd-plan-phase 5)

<domain>
## Phase Boundary

Phase 5 is the **final v1 milestone phase**. It delivers:

1. **Bilateral reviews**: Worker↔Business mutual rating on completed applications (star + tags + optional comment). One-shot per application, auto-aggregates rating/reviewCount on submission.
2. **Settlement lifecycle**: Immediate transition on successful checkout: `Application.status = confirmed → settled`, `earnings` locked. Worker sees settlement list with total/this-month aggregates. Business sees own settlement history (paid/pending).
3. **Mock removal (exit gate)**: `src/lib/mock-data.ts` file deleted. Zero imports of that path anywhere in `src/` (grep-verified). This is the Phase 5 (and v1 milestone) exit criterion.
4. **End-to-end loop validation**: "탐색 → 지원 → 근무 → 리뷰 → 정산 확인" completes under 1 minute with real Supabase round-trips.

**In scope**
- `prisma/schema.prisma` Review model (if not already present) + rating/reviewCount columns on WorkerProfile/BusinessProfile
- Review Server Actions (create, list-by-application, aggregate rating update)
- Settlement Server Actions (list worker settlements, list biz settlements, totals)
- `/my/applications/[id]/review` page
- `/my/settlements` worker settlement dashboard page
- `/biz/settlements` biz settlement history page
- Settled-state transition hook inside existing Phase 4 `checkOut` Server Action
- Final mock-data.ts deletion plan (dedicated plan = exit gate)

**Out of scope (v2 or later)**
- Review editing/deletion after submission (v1: write-once)
- Review moderation / reporting
- Toss Payments real settlement (still mock)
- Withholding tax calculations
- Review-based matching algorithm
- Admin review management

</domain>

<decisions>
## Implementation Decisions

### Review Timing — LOCKED
- Worker can write Biz review **immediately after successful checkout** (same flow — check-out success page exposes review CTA).
- Business can write Worker review **immediately after Application transitions to `settled`** (which happens on worker's checkout success — same instant).
- No delayed window, no moderation queue, no "wait until settlement" UX.
- **Rationale**: Timee "즉시 정산" culture — reviews are part of the closure ritual, not a separate follow-up.

### Settlement Transition Timing — LOCKED
- `checkOut` Server Action (from Phase 4) success = Application.status `confirmed → settled` + `earnings` computed and locked **in the same transaction**.
- No intermediate `completed` state, no cron batch settlement job.
- **Rationale**: Matches Timee "근무 후 즉시 정산" value and avoids async state drift. Phase 4's checkOut already computes earnings — Phase 5 just extends the transaction to also flip status.
- Phase 5 plans must modify Phase 4's `checkOut` action (or add a small hook) rather than adding a separate state machine.

### Mock Removal Strategy — LOCKED
- **Single dedicated final plan** (Phase 5's last plan = exit gate).
- Order: implement REV + SETL against real DB first (mock-data.ts still present), then run the exit plan which:
  1. Greps every `src/` import of `@/lib/mock-data` or `src/lib/mock-data`.
  2. Replaces each site with real DB query or in-place placeholder.
  3. Deletes `src/lib/mock-data.ts`.
  4. Grep verifies 0 matches across `src/` (excluding `src/generated/**`).
- **Rationale**: Progressive removal risks half-migrated state and merge conflicts. Single atomic plan = one verifiable exit condition.
- **Exclude**: `src/generated/prisma/**` (contains unrelated "mock-data" literals) and `.planning/**`.

### Review Tag Schema — LOCKED
- **Single hardcoded tag set** per direction — NOT a separate table.
- Storage: `String[]` column on Review model (Postgres text[]).
- ~8 tags for worker→biz direction (e.g., "친절해요", "분위기 좋음", "시간 엄수", "지시 명확", "업무량 적당", "재방문 의사", "위치 좋음", "추가 수당 지급").
- ~8 tags for biz→worker direction (e.g., "성실함", "밝음", "시간 엄수", "업무 숙련도", "의사소통 원활", "재고용 희망", "복장 단정", "팀워크 좋음").
- Tags are **display-only** in v1. No search/filter by tag. Just rendered as chips under star rating.
- Exact tag lists deferred to the planner — should match Timee/당근알바 conventions for Korean short-term work.

### Review ↔ Settlement Coupling — LOCKED
- **Decoupled**. Review is NEVER a prerequisite for settlement.
- Worker receives `settled` state and earnings regardless of whether they wrote a review.
- Non-reviewers see a persistent "리뷰 작성하기" banner on `/my/settlements` until they submit.
- **Rationale**: Immediate-settlement principle is inviolable. Review rate is nudged via UX, not gated.

### Review Write-Once — LOCKED (from REV-03)
- Unique constraint: `(applicationId, direction)` where direction ∈ {`worker_to_biz`, `biz_to_worker`}.
- Or simpler: separate `WorkerReview` and `BizReview` models each with unique on `applicationId`.
- Planner picks the cleaner representation.

### Rating Aggregation — LOCKED (from REV-04)
- On review insert (inside same transaction):
  - Compute new avg: `(prev_rating * prev_count + new_stars) / (prev_count + 1)`.
  - Update `WorkerProfile.rating` + `WorkerProfile.reviewCount` (for biz→worker) OR `BusinessProfile.rating` + `reviewCount` (for worker→biz).
- Use Prisma interactive transaction to ensure atomicity.
- Trigger alternative (pg trigger on review insert) is out of scope — keep it in app code for testability.

### Settlement Aggregation Scope — LOCKED
- Worker `/my/settlements` shows:
  - **총수입**: sum of all `settled` application earnings for this worker (all time).
  - **이번 달 수입**: same, filtered where `workDate` within current KST month.
  - **정산 목록**: paginated list, newest first, showing job title + date + earnings + biz name.
- Biz `/biz/settlements` shows:
  - **이번 달 지급**: sum of all settled earnings across own jobs this month.
  - **누적 지급**: all-time.
  - **정산 히스토리**: list grouped by job or flat paginated, showing worker + date + amount.
- Date boundaries: Asia/Seoul timezone (consistent with Phase 4 night-shift logic).

### UI-SPEC — LOCKED (no separate /gsd-ui-phase 5)
- Reuse Phase 4 UI tokens: shadcn shims (dialog, progress, alert, toggle-group), sonner toaster, mobile tab bar.
- New components needed:
  - `star-rating-input.tsx` (interactive 5-star picker) in `src/components/ui/`
  - `tag-chip-picker.tsx` (multi-select chip group for review tags) in `src/components/ui/`
  - `review-form.tsx` (composes star + tags + optional textarea) in `src/components/worker/` and `src/components/biz/`
  - `settlement-card.tsx` (one line item in settlement list) in `src/components/worker/` or shared
- Color tokens, typography, spacing: read `$HOME/.claude/get-shit-done/references/ui-brand.md` + existing `.planning/phases/04-db/04-UI-SPEC.md` and match.

### Claude's Discretion
- Exact Prisma model shape for Review(s) — single vs split tables.
- Whether to extend Phase 4's `checkOut` action in place or introduce a post-checkout hook.
- Settlement pagination strategy (offset vs cursor).
- Whether to use a new DAL helper or extend existing `dal.ts`.
- Minor UI polish (icons, micro-animations).
- Seed data for review/settlement fixtures in `prisma/seed.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 — upstream dependencies
- `.planning/phases/04-db/04-05-shift-actions-SUMMARY.md` — checkOut Server Action is the extension point for settlement transition
- `.planning/phases/04-db/04-04-application-actions-SUMMARY.md` — ApplicationStatus enum + ownership DAL helpers
- `.planning/phases/04-db/04-08-worker-ui-wiring-SUMMARY.md` — realtime.ts subscription API (reuse for settlement realtime if needed)
- `.planning/phases/04-db/VERIFICATION.md` — Phase 4 verification, integration concerns to carry forward

### Schema + DAL
- `prisma/schema.prisma` — current state has Phase 4 additions (ApplicationStatus.pending, noShowCount, PushSubscription)
- `src/lib/dal.ts` — requireWorker, requireBusiness, requireApplicationOwner, requireJobOwner already exist
- `src/lib/db/queries.ts` — add Review/Settlement queries here, follow existing patterns

### Mock removal
- `src/lib/mock-data.ts` — the file to delete (verify no other file re-exports it)

### Project-wide rules
- `CLAUDE.md` → AGENTS.md: Next.js 16 / React 19 / Prisma 7 breaking changes — read `node_modules/next/dist/docs/` before writing Next.js code
- `.planning/PROJECT.md` — Timee benchmark, 3 axes (면접 없음·당일 근무·즉시 정산), phase 5 exit criterion
- `.planning/REQUIREMENTS.md` — REV-01..04, SETL-01..03, DATA-05 rows
- `.planning/ROADMAP.md` — Phase 5 section with success criteria

### UI
- `$HOME/.claude/get-shit-done/references/ui-brand.md` — design tokens
- `.planning/phases/04-db/04-UI-SPEC.md` — Phase 4 component patterns to mirror

</canonical_refs>

<specifics>
## Specific Ideas

- Review form should feel like the check-in confirmation flow — single screen, star picker top, tag chips middle, optional text bottom, submit button sticky.
- Settlement totals should be computed server-side (Server Components / `getWorkerSettlements`) not client-side to avoid exposing all records for client aggregation.
- The exit-gate plan's grep verification should produce a machine-readable assertion ("0 matches across src/") that can be asserted in a test, not just eyeballed.
- Consider adding a `prisma/seed.ts` extension for Phase 5 sample reviews so /my/settlements demo data renders in dev.
- Mock removal plan must also handle stale route imports — some routes might have `import { ... } from "@/lib/mock-data"` for types that need to be redefined in the real types location.

</specifics>

<deferred>
## Deferred Ideas (v2 or later)

- Review editing / deletion after submission
- Review moderation, reporting, or admin view
- Review reply / thread
- Photo attachments to reviews
- Weekly/monthly settlement summary emails
- Toss Payments real money movement (still mocked — settlement is a DB state flip)
- Withholding tax / 원천징수 calculation
- Review-based sort/filter on worker search
- Business "featured review" highlight
- CSV export of settlement history

</deferred>

---

*Phase: 05-reviews-settlements*
*Context gathered: 2026-04-11 via inline /gsd-plan-phase discuss capture*
