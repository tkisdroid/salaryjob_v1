# Phase 9: UI/UX Full Sweep — Research

**Researched:** 2026-04-23
**Domain:** Automated UI/UX QA sweep across 54 routes × 2 viewports, built on top of the Phase 07.1 harness (Playwright + axe + Lighthouse + deterministic Supabase seed) with Phase 9-specific checklist overlays (button duplication, empty states, error toasts, navigation, shadcn token drift, mobile tab-bar CTA occlusion).
**Confidence:** HIGH (stack, infrastructure, harness reuse decisions); MEDIUM (exact automation boundary per checklist bucket — some semantic decisions remain Claude's Discretion per planner).

## Summary

Phase 9 is **not a net-new QA phase** — it is a **checklist overlay on the Phase 07.1 harness**. The existing harness already enforces a 16-gate zero-error policy (D-17) across 108 route-scenarios (54 routes × 2 viewports: `review-desktop` + `mobile-375`). Phase 07.1's goal was "nothing is broken" (runtime errors, console errors, network errors, a11y critical+serious, perf budget, content assertions). Phase 9's goal is the semantic layer above that: **"nothing looks wrong or behaves confusingly"** — same 54 routes, but now auditing visual consistency (shadcn token drift), interaction affordance (no duplicate buttons for the same action, no dead/disabled CTAs), state completeness (empty states render correctly when the seed has zero rows for a persona), and viewport-specific occlusion (mobile tab bar hiding primary CTAs).

The research confirms three things with high confidence:

1. **Route count is 54, not 55.** `fast-glob src/app/**/page.tsx` returns 54 entries; `tests/review/routes/manifest.ts` enumerates 54. The ROADMAP's "55 routes" label is a pre-harness estimate and should be treated as a documentation ghost — the authoritative count is 54 × 2 viewports = 108 scenarios, matching the Phase 07.1 harness.
2. **Phase 9 should extend the harness, not rebuild it.** All of `playwright.config.ts` (review-desktop + mobile-375 projects), `tests/review/routes/manifest.ts` (D-14 schema with per-route CTA + content anchor), `tests/review/helpers/{page-ready,cta-probe,a11y,errors,loading-states}.ts`, `scripts/review/{run-full-sweep,auto-fix-loop,report-writer}.ts`, `scripts/review/seed-test-data.ts`, and `tests/review/fixtures/ids.ts` already exist and are production-grade. Phase 9 should add a **Phase-9 checklist spec** (`tests/review/checklist/*.spec.ts` or equivalent) that runs under the same two Playwright projects and reuses the same auth storage states.
3. **Not every checklist bucket can be fully automated — and that is fine.** The automation boundary per QA-0N requirement is explicit below (Validation Architecture section). The harness should automate what can be automated (~70–80% of the checklist) and route the remainder to a lightweight human-checkpoint format with screenshots attached as evidence.

**Primary recommendation:** Plan 9 as two Waves — Wave 0 extends the manifest schema with checklist-overlay fields (buttonDuplicatePolicy, expectedEmptyStatePhrase, expectedErrorPhrase, tabBarHidden), Wave 1 adds one Playwright spec per checklist bucket under `tests/review/checklist/` that runs across the existing 108 scenarios and writes per-issue entries to `.review/phase9-issues.json`, and Wave 2 (optional) runs a short human-eye spot-check on the subset flagged by the automated pass.

## User Constraints (from phase description + depends-on)

### Locked Constraints (from ROADMAP Phase 9 + REQUIREMENTS QA-01..05)

- **Viewports:** Desktop (default `devices['Desktop Chrome']` per Phase 07.1 D-09) + Mobile 375×812 (`devices['iPhone 13 Mini']` viewport override per Phase 07.1 D-09). No other viewports.
- **Personas:** Worker, Business, Admin. `anon` routes also present (login, signup, /, /privacy, /terms, /licenses, /role-select, /auth/check-email, /auth/error, /design-index) and inherit the checklist.
- **Checklist buckets (4 + 3 for QA-05):**
  1. Button duplication / broken / disabled — QA-01/02/03
  2. Empty state rendering — QA-01/02/03
  3. Error toast presence on failure paths — QA-01/02/03
  4. Navigation gap (broken/missing nav link) — QA-01/02/03
  5. shadcn token drift (QA-05)
  6. Duplicate button for same action across a page (QA-05)
  7. Mobile tab-bar CTA occlusion (QA-05)
- **Issue triage:** critical/high must be fixed before phase close (QA-04); low/info may be backlog'd. Fix commits must link to the issue entry.
- **Exit gate:** "UI/UX QA 체크리스트 0 critical/high" per milestone v1.1 acceptance gate in REQUIREMENTS.md.

### Phase Dependencies (locked per ROADMAP)

- **Phase 7:** Required (real DB needed to see empty-state + error paths end-to-end). Phase 7 is still "not started" as of 2026-04-22 per STATE.md, but Phase 07.1 runs against a **local Supabase stack** that provides the same substrate — so Phase 9 can proceed on the Phase 07.1 local stack without blocking on Phase 7's production migration.
- **Phase 07.1:** Hard prerequisite. Plan 01 (harness infrastructure) is ✅ green; Plan 02 Task 4 + Task 6 human checkpoints are still pending but their completion does not block Phase 9 (the harness runs as-is today; `production_ready: true` is a Phase 07.1 close signal, not a Phase 9 entry gate).
- **Phase 8:** Parallel to Phase 9 per ROADMAP ("순차 진행 권장" — sequential recommended only for single-developer context bandwidth, not a hard dependency).

### Claude's Discretion (per ROADMAP + planner contract)

- Exact spec file layout under `tests/review/` (one file per checklist bucket vs. one file per persona vs. consolidated)
- Screenshot format + where to stash evidence (PNG at 1× DPR is the Phase 07.1 default; Phase 9 should reuse `.review/screenshots/` per 07.1 REVIEW.md Evidence Index)
- Exact JSON schema for `.review/phase9-issues.json` (planner picks)
- Whether to split Worker/Business/Admin into parallel Playwright projects (the harness already runs all personas via storageState; no new project needed)
- Auto-fix loop reuse vs. dedicated Phase-9 loop (strong recommendation: **do not run auto-fix on Phase 9 findings** — see Pitfall 4 below; flag as issues for human fix)

### Deferred Ideas (OUT OF SCOPE)

- Dark mode QA (deferred per Phase 07.1 `<deferred>` §)
- RTL / i18n QA (deferred)
- Firefox/WebKit cross-browser (Chromium-only per Phase 07.1 D-09)
- Pixel-perfect baseline visual regression (explicitly rejected per Phase 07.1 `<deferred>`: "Visual regression baselining with pixel-diff tool — considered and rejected in favor of semantic content assertions"). **Do not introduce `toHaveScreenshot()` baselines in Phase 9** — they contradict a locked Phase 07.1 decision.
- Real device farm (BrowserStack / real iOS-Android devices) — deferred
- Dependency/design-system rework (Phase 9 is QA, not redesign; QA-05 is "drift detection + fix", not "token redesign")

## Project Constraints (from CLAUDE.md + AGENTS.md)

- **Next.js 16 + React 19:** "This is NOT the Next.js you know" (AGENTS.md). Any test code invoking Next internals (e.g., server actions, middleware behavior) must be cross-checked against `node_modules/next/dist/docs/` before execution. Phase 07.1 already handles this — Phase 9 specs should only interact with rendered DOM, not Next.js internals.
- **Korean UI language:** All text assertions in Korean. Existing `manifest.ts` uses Korean regexes; Phase 9 additions must follow the same convention.
- **shadcn/Tailwind CSS 4:** `src/app/globals.css` defines the token registry via OKLCH `@theme inline` + CSS custom properties. Any Phase 9 drift detection rule must reference these tokens (e.g., `bg-brand`, `text-ink`, `bg-surface-2`) — not hex literals.
- **Kebab-case filenames:** `tests/review/checklist/button-duplication.spec.ts` not `ButtonDuplication.spec.ts`.
- **GSD workflow enforcement:** Phase 9 must go through `/gsd:discuss-phase` + `/gsd:plan-phase` before any file edits. RESEARCH.md (this file) is consumed by `gsd-planner` per the GSD flow.
- **Immutability / small files:** `components` layer already respects this — Phase 9 should add small focused spec files (< 400 lines), not one mega-spec.

## Standard Stack

### Core — Already Installed

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | 1.59.1 (latest) | Browser automation + test runner | Already wired into Phase 07.1 harness; reuse `review-desktop` + `mobile-375` projects |
| `@axe-core/playwright` | 4.11.2 (latest) | a11y violations (critical+serious filter) | Already in helper `tests/review/helpers/a11y.ts`; reuse for Phase 9 nav/button checks |
| `@lhci/cli` | 0.15.1 (latest) | Lighthouse CI — perf budget | Already wired via `.lighthouserc.js` per Phase 07.1 G9–G12; Phase 9 does NOT add new perf gates |
| `supabase` | 2.93.1 | Local Supabase stack | Required for real DB substrate; Phase 07.1 already boots this |
| `vitest` | 3.2.4 | Unit tests | Not used for Phase 9 UI sweep, but kept in test pipeline via G16 |
| `fast-glob` | 3.3.3 | Route discovery | Already used by `tests/review/routes/discover.ts` |

Verified via `npm view <pkg> version` on 2026-04-23 — all installed versions match latest.

### Supporting — Recommend Adding

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none — no new deps needed) | — | — | The stack is complete |

**Key insight:** Phase 9 needs ZERO new runtime dependencies. Every capability is already in the tree. The work is authoring specs + schema extensions, not installing tools.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright DOM assertions for token drift | `toHaveScreenshot()` visual snapshots | **Rejected** — Phase 07.1 `<deferred>` explicitly rejects pixel-diff tooling. Also: snapshots flake on font load / animation / date/time rendering. DOM-level drift detection (className regex) is more robust. |
| axe-core for nav gap detection | Custom DOM crawler | axe does not check for broken nav affordances. Use Playwright `locator('a').all()` + `response.status()` instead. |
| Custom `@playwright/visual-comparisons` | Built-in `toHaveScreenshot()` | Same rejection as above. |
| Percy / Chromatic | — | **Rejected** in Phase 07.1 (external service, pixel-diff paradigm). |

**Installation:** No `npm install` needed. If Phase 9 adds a tiny dev helper (e.g., a CSS parser for token-allow-list), prefer `postcss` (already transitive via Tailwind) over a new dep.

**Version verification:** Verified 2026-04-23 via `npm view` — all tools at their latest published versions, no upgrades needed.

## Architecture Patterns

### Recommended Project Structure

```
tests/review/
├── checklist/                      # NEW — Phase 9 specs
│   ├── 01-button-duplication.spec.ts       # same-action duplicate detector (QA-05)
│   ├── 02-empty-states.spec.ts             # expectedEmptyStatePhrase matcher (QA-01/02/03)
│   ├── 03-error-toasts.spec.ts             # failure-path toast probe (QA-01/02/03)
│   ├── 04-navigation-gaps.spec.ts          # anchor href reachability + active-state sanity (QA-01/02/03)
│   ├── 05-token-drift.spec.ts              # className allow-list + rejected patterns (QA-05)
│   └── 06-mobile-tab-bar-occlusion.spec.ts # sticky-CTA vs. tab-bar overlap (QA-05)
├── config/
│   ├── allowed-4xx.json            # EXISTING — Phase 07.1 D-18 allow-list
│   ├── phase9-token-allowlist.json # NEW — permitted className patterns
│   └── phase9-empty-state-map.json # NEW — per-route expected empty-state phrase
├── fixtures/
│   ├── ids.ts                      # EXISTING — D-06 deterministic UUIDs
│   └── phase9-empty-persona.ts     # NEW — seed-overlay for "new worker w/ 0 applications" etc.
├── flows/                          # EXISTING — 7 E2E loops (Phase 07.1 D-15)
├── helpers/                        # EXISTING — reuse all 5
├── routes/
│   ├── manifest.ts                 # EXTEND — add optional Phase-9 fields per route
│   ├── discover.ts                 # EXISTING
│   └── run-matrix.ts               # EXISTING — Phase 07.1 matrix (leave untouched)
├── smoke/                          # EXISTING
└── auth.setup.ts                   # EXISTING

scripts/review/
├── phase9-issue-collector.ts       # NEW — aggregates checklist/*.spec.ts output → .review/phase9-issues.json
├── phase9-report-writer.ts         # NEW — emits 09-REVIEW.md modeled on 07.1-REVIEW.md
├── run-full-sweep.ts               # EXISTING — do not modify
├── auto-fix-loop.ts                # EXISTING — do not invoke for Phase 9 (see Pitfall 4)
└── (others)                        # EXISTING
```

### Pattern 1: Checklist Overlay on Existing Matrix

**What:** Each Phase 9 checklist bucket becomes ONE Playwright `test.describe()` that iterates the existing `ROUTES` manifest, runs under both `review-desktop` + `mobile-375` projects via `testDir` inclusion, and uses the existing persona storageState.

**When to use:** Every QA-0N check that is mostly automatable.

**Example:**

```typescript
// tests/review/checklist/01-button-duplication.spec.ts
// Phase 9 QA-05 — same-action duplicate button detector.
//
// A "same action" is defined as any two `<button>` or `<a role="button">`
// elements on the same page whose (normalized textContent + href + onClick
// target selector) tuple is identical. Multiple "취소" buttons in distinct
// modals are OK (different modal context); two "지원하기" on a job-detail page
// is NOT OK.

import { test, expect } from "@playwright/test";
import { ROUTES } from "../routes/manifest";
import { STORAGE_STATE } from "../routes/run-matrix"; // export from existing matrix

for (const route of ROUTES) {
  const personaStorage = STORAGE_STATE[route.seedAs];

  test.describe(`@phase9-q05 ${route.seedAs} ${route.path}`, () => {
    if (personaStorage) test.use({ storageState: personaStorage });

    test(`${route.path} — no duplicate same-action buttons`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "networkidle" });

      // Collect candidate CTAs
      const cta = await page.$$eval(
        'button, a[role="button"], [data-cta]',
        (els) =>
          els.map((el) => ({
            text: (el.textContent ?? "").trim().replace(/\s+/g, " "),
            href: el.getAttribute("href") ?? "",
            formAction: el.getAttribute("formaction") ?? "",
            // Exclude elements inside [role="dialog"] — different modal
            // context counts as a different action.
            inDialog: !!el.closest('[role="dialog"]'),
          }))
      );

      // Group by (text + href + formAction), excluding modal-scoped entries.
      const groups = new Map<string, number>();
      for (const c of cta) {
        if (c.inDialog) continue;
        if (!c.text || c.text.length < 2) continue; // skip icon-only
        const key = `${c.text}|${c.href}|${c.formAction}`;
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }

      const duplicates = [...groups.entries()].filter(([, n]) => n > 1);
      expect(
        duplicates,
        `QA-05 duplicate CTAs on ${route.path}: ${JSON.stringify(duplicates)}`
      ).toHaveLength(0);
    });
  });
}
```

### Pattern 2: Fail-Then-Collect (Not Fail-Fast)

**What:** Each checklist spec accumulates issues instead of throwing on first failure, writes `.review/phase9-issues.json`, and exits 0 even when issues are present — the **aggregator** writes the pass/fail verdict to 09-REVIEW.md.

**When to use:** All Phase 9 specs. Rationale — one route with a broken CTA should not hide 53 other routes' issues; we want a full picture, not the first hit.

**Example:**

```typescript
// At the end of each spec file:
test.afterAll(async () => {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(".review", { recursive: true });
  writeFileSync(
    `.review/phase9-${test.info().project.name}-${BUCKET_ID}.json`,
    JSON.stringify(collectedIssues, null, 2),
  );
});
```

The aggregator (`scripts/review/phase9-issue-collector.ts`) reads all `.review/phase9-*.json` files and emits the unified 09-REVIEW.md.

### Pattern 3: Empty-State Seed Overlay

**What:** Phase 9's empty-state checks require a persona with **zero rows** (new worker with no applications, biz with no posts). The Phase 07.1 deterministic seed (D-07) instead creates 3 workers / 3 biz / 10 jobs / 5 applications — all NON-empty.

**Solution:** Introduce a SECOND seed profile `scripts/review/seed-test-data.ts --profile=empty` that inserts accounts **without** relations. The `review-runner.ts` gets a `--seed-profile=empty` flag; the matrix spec for empty-state checks runs against it.

**When to use:** Strictly for QA-01/02/03 empty-state bucket (~5 routes per persona — applications inbox, shifts, reviews, settlements, favorites).

**Example conceptual flow:**

```
# Normal sweep (Phase 07.1 substrate)
REVIEW_RUN=1 npm run review:seed                   # 3+3+1 personas WITH data
REVIEW_RUN=1 npm run review:phase9 -- --bucket=all # runs buckets 1,3,4,5,6 (no empty)

# Empty-state sweep (Phase 9 overlay)
REVIEW_RUN=1 npm run review:seed -- --profile=empty  # same personas, zero rows
REVIEW_RUN=1 npm run review:phase9 -- --bucket=empty # runs bucket 2 only
```

### Anti-Patterns to Avoid

- **`toHaveScreenshot()` for token drift:** Rejected in Phase 07.1 `<deferred>`. Pixel-diff flakes on fonts, animations, anti-aliasing, date values. Use className regex against the canonical token registry (`src/app/globals.css`) instead.
- **Checking for specific hex colors:** The project uses OKLCH tokens. Never grep for `#41b66e` — always assert against `--brand` or `bg-brand`.
- **Running auto-fix loop on Phase 9 issues:** Phase 9 findings are usually semantic (wrong CTA label, missing empty state, overlapped button) — a regex auto-fix loop will produce wrong fixes. See Pitfall 4.
- **Re-running manifest discovery in Phase 9:** Phase 07.1 already enumerated all 54 routes. If a new route is added between Phase 07.1 close and Phase 9 kickoff, the manifest self-check catches it. Don't re-invent.
- **Mocking the mobile tab bar:** Phase 9 specifically needs to test occlusion — `MobileTabBar` must render in the Playwright session. Don't stub it out.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route enumeration | custom glob script | `tests/review/routes/discover.ts` (existing) | Already tested, self-checks against manifest, handles route groups + dynamic segments |
| Per-route persona auth | new login flow in spec | `STORAGE_STATE` map + `auth.setup.ts` (existing) | Auth is deterministic, one-time cost, enforced by Playwright project deps |
| a11y violation collector | custom axe wrapper | `runAxeCriticalSerious()` in `helpers/a11y.ts` (existing) | Correct post-filter for critical+serious per D-12; already handles Phase 07.1 Pitfall 4 |
| JS error collection | `page.evaluate(() => window.onerror)` | `hookErrorCollectors()` in `helpers/errors.ts` (existing) | Hooks BEFORE navigation (the race Phase 07.1 had to solve) |
| CTA probe | custom click + wait | `probeCta()` in `helpers/cta-probe.ts` (existing) | Multi-signal (url/modal/toast/network) with timeouts already calibrated |
| Page-ready detection | custom `waitFor` loops | `checkPageReady()` in `helpers/page-ready.ts` (existing) | 5-assertion D-11 already exported, already guards white-screen |
| Loading-skeleton detection | custom selectors | `LOADING_SELECTORS` in `helpers/loading-states.ts` (existing) | Korean i18n-aware, project-specific |
| Token registry | hardcoded string list | `src/app/globals.css` `@theme inline` (existing) | Single source of truth; parse this for drift allow-list generation |
| Aggregate report emitter | custom MD writer | clone/extend `scripts/review/report-writer.ts` pattern (existing) | Frontmatter schema already proven in 07.1-REVIEW.md |
| Issue tracking storage | GitHub issues via `gh` CLI | `.review/phase9-issues.json` + 09-REVIEW.md table | Local-first, git-reviewable, matches QA-04's "fix commit links to issue entry" via commit SHA in JSON |

**Key insight:** Phase 07.1 already paid the infrastructure cost. Every line of new Phase 9 code should be a **checklist rule**, not plumbing. If you find yourself writing `page.on('response')`, stop and reuse `hookErrorCollectors`.

## Runtime State Inventory

Phase 9 is a QA/verification phase, NOT a rename/refactor/migration. No runtime state to catalog. If Phase 9 finds critical/high issues whose fix requires data migration (e.g., "empty-state message is stored in DB and needs to be seeded"), that specific fix should be scoped as a separate `data migration` task inside the Phase 9 plan — NOT as a schema rename.

## Common Pitfalls

### Pitfall 1: "Route count is 55" ghost

**What goes wrong:** ROADMAP.md, REQUIREMENTS.md, and the Phase 9 directory name all say "55 routes." A planner reads this and invents a 55th route, or flags the manifest as incomplete (54 entries).
**Why it happens:** ROADMAP was authored before Phase 07.1 discovery. "55" was a round-up estimate; `fast-glob src/app/**/page.tsx` returned 54.
**How to avoid:** Treat the glob result as authoritative. `tests/review/routes/manifest.ts` (54 entries) + `discoverRoutes()` (54 returns) + `REVIEW_MANIFEST_SELFCHECK=1` (passes today) all agree. Document "54 is the real count; 55 is the ROADMAP label from before the harness existed" in the Phase 9 plan.
**Warning signs:** A 55th route entry appears in the manifest. Self-check fails. Something was invented.

### Pitfall 2: Empty-state checks produce false positives on the Phase 07.1 seed

**What goes wrong:** Phase 07.1's seed creates 5 applications, 2 shifts, 3 reviews — so the empty-state check for `/my/applications` **never fires** on the Phase 07.1 seed. The test either silently passes (no assertion made) or falsely fails (asserts empty-state phrase present when there are 5 applications).
**Why it happens:** Phase 07.1's D-07 seed is MAXIMAL-COVERAGE (every status/role variety). Empty-state testing needs MINIMAL-COVERAGE.
**How to avoid:** Add a `--profile=empty` flag to `seed-test-data.ts` that inserts the 3+3+1 personas with ZERO relations. Run the empty-state bucket against this profile only. Document in `09-PLAN.md` Wave 0.
**Warning signs:** Empty-state spec never reports any issues in dry-run. Or, it reports "expected '빈 지원 내역' but got '5개 지원'" on the default Phase 07.1 seed.

### Pitfall 3: Mobile tab-bar overlap detection is viewport + CSS-dependent

**What goes wrong:** The mobile tab bar is `fixed bottom-0 ... z-50` (`src/components/shared/mobile-tab-bar.tsx`). Sticky CTAs at the bottom of worker pages (e.g., `/posts/[id]` apply bar) can be covered by the tab bar unless they have enough `bottom-` padding. Pure DOM inspection catches nothing — both elements have `position: fixed` and can overlap visually even though they "stack" in z-index.
**Why it happens:** `MobileTabBar` is `h-~66px` + safe-area-inset-bottom. CTAs rendered at `bottom-0` without offset will be under the tab bar.
**How to avoid:**
- Use Playwright's `elementHandle.boundingBox()` to get pixel coordinates for BOTH the tab bar and each visible primary CTA.
- Compute overlap: if CTA's `y + height > viewport.height - 66` AND tab bar is visible (not hidden via `HIDE_TAB_BAR_PATTERNS`) → FAIL QA-05 occlusion check.
- Note: `HIDE_TAB_BAR_PATTERNS` in `mobile-tab-bar.tsx` already excludes `/my/applications/*/check-in` and `/posts/*/apply`. The Phase 9 check should respect this whitelist — those routes purposefully replace the tab bar.
**Warning signs:** Apply-flow CTA fails in the test even though it renders fine in the browser. Likely root cause: the test is asserting on a route where `HIDE_TAB_BAR_PATTERNS` is active.

### Pitfall 4: Auto-fix loop corrupts semantic checklist fixes

**What goes wrong:** Phase 07.1's `scripts/review/auto-fix-loop.ts` uses regex-based fix generation within the D-19 WHITELIST. If you invoke it on Phase 9 findings (e.g., "duplicate '지원하기' button on /posts/[id]"), a regex-based generator will delete ONE of the buttons — but it won't know WHICH one is the semantic leader. It may delete the sticky bottom CTA (the intended primary) and keep the card-embedded secondary.
**Why it happens:** Phase 07.1 auto-fix targets mechanical failures (missing content anchor, misconfigured network stub) — where the fix space is narrow. Phase 9 fixes are semantic (design decisions).
**How to avoid:** **Do NOT route Phase 9 issues through `auto-fix-loop.ts`.** Write issues to `.review/phase9-issues.json`, present in 09-REVIEW.md, and require human fix commits with an issue-ID back-reference (QA-04 mandates this anyway: "fix commit이 이슈에 링크"). The auto-fix loop stays dormant during Phase 9.
**Warning signs:** Auto-fix commits arrive for Phase 9 issues. Manual CTA's are being silently deleted.

### Pitfall 5: shadcn token drift check false-positive on custom-property inline styles

**What goes wrong:** The drift detector greps className strings for hex literals + non-brand color Tailwind classes (`bg-red-500`). But the project legitimately uses `bg-[color-mix(in_oklch,var(--surface)_92%,transparent)]` (seen in `mobile-tab-bar.tsx`) — a Tailwind arbitrary value referencing a CSS custom property. Naive regex `bg-\[` will flag these as drift.
**Why it happens:** Tailwind 4's arbitrary-value syntax `bg-[...]` is legal when the expression evaluates against a token (CSS custom property).
**How to avoid:** Two-tier regex:
- Tier 1 (REJECT): `bg-\[#[0-9a-fA-F]{3,8}\]` (raw hex)
- Tier 2 (ALLOW IF CONTAINS TOKEN REF): `bg-\[[^\]]*var\(--[a-z-]+\)[^\]]*\]`
- Tier 3 (REJECT): `bg-(red|blue|pink|purple|indigo|violet|fuchsia|rose)-[0-9]+` — forbidden hues per `globals.css` comment ("빨강/보라/강한 파랑은 경고 상황 외에는 사용하지 않음"). Exception: `bg-destructive` via shadcn token.
**Warning signs:** Drift detector flags every file. Root cause: regex too aggressive; layer the tiers above.

### Pitfall 6: Playwright 4xx allow-list is persona-specific

**What goes wrong:** Phase 9 nav gap check walks every `<a href>` on a page and asserts the target responds 200. But `/auth/whoami` returns 401 for the anon persona and that is expected (Phase 07.1 D-18 allow-list). The nav-gap check flags it as broken.
**Why it happens:** Phase 9 walks links but doesn't reuse the `allowed-4xx.json` allow-list.
**How to avoid:** Reuse `tests/review/config/allowed-4xx.json`. Extend its schema if needed (Phase 9 can add a `phase9_nav_allow` field that is also persona-scoped).
**Warning signs:** Every anon run reports `/auth/whoami` 401 as a broken nav link.

### Pitfall 7: `networkidle` hangs on routes with long-polling Realtime subscriptions

**What goes wrong:** `/chat/[id]` and `/biz/chat/[id]` may establish a Supabase Realtime websocket that keeps the network busy; `waitForLoadState('networkidle', { timeout: 15000 })` times out; `checkPageReady` reports false negative.
**Why it happens:** Realtime + Next 16 RSC streaming can keep background network activity alive.
**How to avoid:** This is a known Phase 07.1 concern (`playwright.config.ts` comment "networkidle assertions don't race the Next.js HMR websocket heartbeat" addresses a similar issue via prod build). Phase 9 inherits the fix (REVIEW_RUN=1 → `npm run build && npm run start`). Confirm the harness is run with `REVIEW_RUN=1` before flagging intermittent chat failures.
**Warning signs:** Chat routes intermittently fail `checkPageReady.b_loaded`; other routes are green.

## Code Examples

Verified patterns from the existing codebase (not external docs — the harness already solved these).

### Example 1: Reusing the Persona Storage Map

```typescript
// From tests/review/routes/run-matrix.ts — existing pattern.
// Phase 9 specs should import this map OR re-export it.
const STORAGE_STATE: Record<string, string | undefined> = {
  worker: "playwright/.auth/worker.json",
  biz: "playwright/.auth/biz.json",
  admin: "playwright/.auth/admin.json",
  anon: undefined,
};

// In a Phase 9 spec:
test.use({ storageState: STORAGE_STATE[route.seedAs] });
```

### Example 2: Running Under Both Desktop + Mobile Projects (no code — config does it)

```typescript
// From playwright.config.ts — REVIEW_RUN=1 adds both projects, testDir './tests/review'.
// Phase 9 specs placed under tests/review/checklist/ AUTOMATICALLY run under both.
// No per-project explicit listing needed — the project config matches testDir.
```

### Example 3: Viewport-Aware Skip for Desktop-Only Checks

```typescript
// Pattern lifted from run-matrix.ts (D-14 desktopOk/mobileOk gates).
test(`${route.path} — bucket check`, async ({ page }, testInfo) => {
  // Some checklist buckets only apply to mobile (e.g., tab-bar occlusion).
  if (BUCKET === "tab-bar-occlusion" && testInfo.project.name !== "mobile-375") {
    testInfo.skip(true, "tab-bar-occlusion is mobile-only");
  }
  // ...
});
```

### Example 4: Empty-State Phrase Matcher

```typescript
// tests/review/checklist/02-empty-states.spec.ts (sketch)
// Uses existing contentAssertion field as base + new expectedEmptyStatePhrase overlay.

import emptyStateMap from "../config/phase9-empty-state-map.json";

type EmptyStateEntry = { path: string; phrase: string | RegExp };

for (const entry of emptyStateMap as EmptyStateEntry[]) {
  test(`${entry.path} — empty state phrase`, async ({ page }) => {
    await page.goto(entry.path);
    await page.waitForLoadState("networkidle");
    const phrase = typeof entry.phrase === "string" ? entry.phrase : entry.phrase;
    await expect(page.getByText(phrase, { exact: false })).toBeVisible({
      timeout: 5_000,
    });
  });
}
```

### Example 5: Tab-Bar Occlusion Detection

```typescript
// tests/review/checklist/06-mobile-tab-bar-occlusion.spec.ts
import { test, expect } from "@playwright/test";
import { ROUTES } from "../routes/manifest";

const TAB_BAR_HEIGHT = 66; // MobileTabBar h + safe-area; measured from the component

const TAB_BAR_HIDDEN = [
  /^\/my\/applications\/[^/]+\/check-in$/,
  /^\/posts\/[^/]+\/apply$/,
]; // match mobile-tab-bar.tsx HIDE_TAB_BAR_PATTERNS

for (const route of ROUTES) {
  test(`@phase9-q05-occlusion ${route.path}`, async ({ page }, info) => {
    if (info.project.name !== "mobile-375") info.skip(true, "mobile-only");
    if (TAB_BAR_HIDDEN.some((re) => re.test(route.path))) info.skip(true, "tab-bar hidden here by design");

    await page.goto(route.path, { waitUntil: "networkidle" });

    const vp = page.viewportSize();
    if (!vp) throw new Error("no viewport");

    // Find sticky-bottom primary CTA candidates
    const ctas = await page
      .locator("button, a[role='button']")
      .filter({ has: page.locator(":scope") })
      .evaluateAll((els, vh) => {
        return els
          .filter((el) => {
            const s = window.getComputedStyle(el);
            if (s.position !== "fixed" && s.position !== "sticky") return false;
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.height > 20 && r.bottom > vh - 120;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { bottom: r.bottom, top: r.top, text: (el.textContent ?? "").trim() };
          });
      }, vp.height);

    const occluded = ctas.filter((c) => c.bottom > vp.height - TAB_BAR_HEIGHT);
    expect(
      occluded,
      `QA-05 occluded CTA on ${route.path}: ${JSON.stringify(occluded)}`
    ).toHaveLength(0);
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pixel-diff visual regression (Percy, Chromatic) | Semantic DOM assertions + className allow-list | Phase 07.1 D-11c, `<deferred>` § | Less flaky, git-diffable, no external service |
| axe-core all severities | axe-core critical+serious only (post-filtered) | Phase 07.1 D-12 + Pitfall 4 | Stops moderate-noise fatigue; critical/high = production blockers |
| Lighthouse on full sweep | Lighthouse on representative 10-route slice | Phase 07.1 `run-full-sweep.ts` Stage 4 | Wall-clock within D-17 30-min budget |
| Auth per-test | Auth once via `storageState.json` per persona | Phase 07.1 `auth.setup.ts` | 108 scenarios × 0 auth flows instead of 108 |
| `waitForLoadState('load')` | `waitForLoadState('networkidle', { timeout: 15000 })` + content anchor | Phase 07.1 D-11b + Pitfall 3 | Catches "loaded but stuck on skeleton" |

**Deprecated/outdated (do not use):**
- `page.waitForTimeout(N)` as a main sync primitive — use `waitForLoadState` + `waitForSelector` instead (Phase 07.1 uses the former only for the 5s skeleton-stabilization window, which is justified).
- `toMatchSnapshot()` for textual regression — Phase 07.1 rejected this in favor of explicit `contentAssertion` regex per manifest entry.

## Open Questions

1. **Where does the 09-REVIEW.md live + what's the frontmatter?**
   - What we know: Phase 07.1 puts REVIEW.md at `.planning/phases/{phase}/{phase}-REVIEW.md` with YAML frontmatter (`production_ready: bool`, `iteration: n`, gates passed/failed counts).
   - What's unclear: Phase 9 doesn't have a "gates" concept — it has "checklist buckets + severity counts." Frontmatter schema needs to be planner-decided.
   - Recommendation: Mirror 07.1-REVIEW.md shape. Suggested frontmatter:
     ```yaml
     phase9_complete: true|false
     iteration: N
     critical_issues: 0    # must be 0 to close
     high_issues: 0        # must be 0 to close
     medium_issues: <n>    # backlog candidates
     low_issues: <n>       # backlog candidates
     routes_swept: 54
     viewports: [review-desktop, mobile-375]
     ```

2. **Should the auto-fix loop's WHITELIST be extended for Phase 9?**
   - What we know: Phase 07.1 D-19 allows writes to `src/components/**`, `src/app/**/{page,layout,loading,error,not-found}.tsx`, `src/styles/**`, Tailwind classes.
   - What's unclear: If Phase 9 finds a CTA occlusion and the fix is "add `pb-20` to the apply-confirm-flow container," that edit is in-whitelist — but per Pitfall 4, we don't want the auto-fix loop running on semantic issues.
   - Recommendation: **Don't extend the WHITELIST.** Keep Phase 9 fixes in human-authored commits. The whitelist is a safety net for accidental over-reach, not an encouragement to auto-fix.

3. **Parallelism — can Worker / Business / Admin sweeps run as 3 parallel waves?**
   - What we know: `playwright.config.ts` has `fullyParallel: false` + `workers: 1` because Supabase-backed auth E2E tests share seeded accounts and concurrent logout/login would invalidate each other.
   - What's unclear: Phase 9 specs don't perform logout — they just goto() under an already-established storageState. They could run with `workers > 1` SAFELY.
   - Recommendation: Phase 9 specs can opt into `test.describe.parallel()` per bucket since they don't perform auth operations. Validate in a single dry-run that no test mutates seed data (most Phase 9 specs are read-only; button-duplication and token-drift specs definitely are). Error-toast specs DO trigger failures — those should stay serial.

4. **Issue tracking — file-based vs. GitHub issues?**
   - What we know: QA-04 requires "fix commit linked to issue." Phase 10 already uses `.planning/phases/{phase}/{phase}-SUMMARY.md` as the issue + closure record.
   - What's unclear: Nothing. No ambiguity — this is Claude's Discretion per ROADMAP.
   - Recommendation: **File-based.** `.review/phase9-issues.json` is the source of truth; 09-REVIEW.md embeds a table rendering of it; fix commits use `fix(09): <issue-slug> [qa-NN]` convention (same pattern as Phase 07.1 commits). No GitHub issues needed for a local-first milestone close.

5. **Does Phase 9 need its own `config.json` flag or mode?**
   - Recommendation: No. The existing `REVIEW_RUN=1` already gates the harness projects. Phase 9 specs run under the same flag; adding a `PHASE9_RUN=1` would duplicate without benefit. Optional: `PHASE9_BUCKET=empty` environment variable to filter which buckets run during iteration.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all test commands | ✓ | v24.13.1 | — |
| npm | dependency mgmt | ✓ | 11.10.0 | — |
| Docker Desktop | Supabase CLI local stack | ✓ | 29.2.1 | — |
| Supabase CLI (via `npx supabase`) | local stack boot per Phase 07.1 D-01 | ✓ | 2.93.1 | Direct-prisma on dev Supabase (Phase 7 pattern) if local stack fails |
| Playwright | browser automation | ✓ | 1.59.1 | — |
| Playwright Chromium browser | test execution | ✓ (assumed — Phase 07.1 smoke ran) | — | — |
| `@axe-core/playwright` | a11y gate | ✓ | 4.11.2 | — |
| `@lhci/cli` | perf budget | ✓ | 0.15.1 | — (already running under Phase 07.1) |
| `tsx` | script runner | ✓ | 4.21.0 | — |
| `fast-glob` | route discovery | ✓ | 3.3.3 | — |
| `cross-env` | Windows env var setting | ✓ | 7.0.3 | — |
| PostCSS / Tailwind 4 | token parsing (optional, only if we auto-generate allow-list from `globals.css`) | ✓ (transitive via `@tailwindcss/postcss` + `tailwindcss`) | 4.x | Hand-maintain allow-list JSON |
| Git (for commits linking issues) | QA-04 evidence | ✓ | — | — |

**Missing dependencies with no fallback:** None. All required tools are present.
**Missing dependencies with fallback:** None needed.
**Notes on Windows/WSL2 (from Phase 07.1 D-03):** `supabase start` requires Docker Desktop running; confirmed available (v29.2.1). `cross-env` handles the `REVIEW_RUN=1` prefix across shells. Phase 9 inherits all of this — no Phase-specific environment setup beyond what Phase 07.1 already documented in `docs/review-harness.md`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `@playwright/test` 1.59.1 (browser) + `@axe-core/playwright` 4.11.2 (a11y) + `vitest` 3.2.4 (any unit helpers) |
| Config file | `playwright.config.ts` (existing; `review-desktop` + `mobile-375` projects under `REVIEW_RUN=1`) |
| Quick run command | `REVIEW_RUN=1 npx playwright test --grep @phase9 --project=review-desktop` (subset; one bucket; ~2-5 min) |
| Full suite command | `REVIEW_RUN=1 npm run review:phase9` (NEW npm script — wires all 6 checklist specs across both projects; ~15-20 min wall-clock) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QA-01 (Worker routes checklist) | Every Worker route on Desktop + Mobile passes 4-bucket checklist (button, empty, toast, nav) | e2e (Playwright) | `REVIEW_RUN=1 npx playwright test tests/review/checklist/ --grep "worker"` across both projects | ❌ Wave 0 |
| QA-02 (Business routes checklist) | Every Business route passes same 4-bucket checklist | e2e (Playwright) | `REVIEW_RUN=1 npx playwright test tests/review/checklist/ --grep "biz"` | ❌ Wave 0 |
| QA-03 (Admin routes checklist) | Every Admin route passes same 4-bucket checklist | e2e (Playwright) | `REVIEW_RUN=1 npx playwright test tests/review/checklist/ --grep "admin"` | ❌ Wave 0 |
| QA-04 (critical/high issues fixed + commits linked) | `.review/phase9-issues.json` has zero critical/high severity entries; each fix commit message references the issue ID | static-analysis + git-log | `npx tsx scripts/review/phase9-issue-collector.ts --assert=no-critical-high` (exits 0 when passing; parses `.review/phase9-*.json`); `git log --grep='fix(09):'` matches issue IDs | ❌ Wave 0 |
| QA-05a (shadcn token drift) | No className uses forbidden hex or forbidden hue families (red/purple/indigo/violet/fuchsia/rose except shadcn token aliases) | static-analysis | `npx tsx scripts/review/phase9-token-drift.ts --src=src/` (regex scan with 3-tier allow-list per Pitfall 5; exits 0 = zero drift) | ❌ Wave 0 |
| QA-05b (duplicate same-action buttons) | On any rendered page, no two non-modal CTAs share (text, href, formAction) tuple | e2e (Playwright) | `REVIEW_RUN=1 npx playwright test tests/review/checklist/01-button-duplication.spec.ts` | ❌ Wave 0 |
| QA-05c (mobile tab-bar CTA occlusion) | No fixed/sticky bottom CTA overlaps `MobileTabBar` on mobile-375 for routes not in `HIDE_TAB_BAR_PATTERNS` | e2e (Playwright) | `REVIEW_RUN=1 npx playwright test tests/review/checklist/06-mobile-tab-bar-occlusion.spec.ts --project=mobile-375` | ❌ Wave 0 |

**Per-checklist-bucket detail (finer-grained than the 5 QA- IDs):**

| Bucket | Requirement(s) | Automation | Per-route runtime | Human-checkpoint required? |
|--------|----------------|------------|-------------------|---------------------------|
| 1. Button duplication / broken / disabled | QA-01/02/03, QA-05b | FULL (DOM scan; multi-CTA same-action detection) | ~2-4 s/route | No (automated pass) |
| 2. Empty states | QA-01/02/03 | MOSTLY — needs `--profile=empty` seed overlay to make tests meaningful; route-specific expected phrase | ~3-5 s/route | Partial — planner reviews empty-state phrase map during Wave 0 |
| 3. Error toasts | QA-01/02/03 | MOSTLY — for forms, inject invalid input + assert toast; for API 500, use Playwright route interception | ~5-8 s/route | No (automated) |
| 4. Navigation gaps | QA-01/02/03 | FULL — walk all `<a href>`, assert response 200 (with allowed-4xx.json merge), assert no `href="#"` dead links | ~4-6 s/route | No (automated) |
| 5. shadcn token drift | QA-05a | FULL — static-analysis over src/; no browser needed | ~10 s for entire src/ (once, not per-route) | No (automated) |
| 6. Duplicate button (same page) | QA-05b | FULL (subset of bucket 1 — it's the "duplicate same-action" part) | included in bucket 1 | No |
| 7. Mobile tab-bar CTA occlusion | QA-05c | FULL — `getBoundingClientRect()` arithmetic; mobile-375 only | ~2-3 s/route × (54 × 0.5 eligible routes) | Partial — human reviews automated findings before filing |
| 8. Visual spot-check (final gate) | QA-04 evidence | **HUMAN CHECKPOINT** — planner/executor opens ≤ 10 random routes in headed mode, eyeballs for "looks wrong" cases the automated pass missed | N/A | **YES** — resume-signal `approved: <date>, n random routes spot-checked`. |

**What passes:** 09-REVIEW.md frontmatter `phase9_complete: true`, `critical_issues: 0`, `high_issues: 0`. All 5 QA- requirements have their automated commands exit 0. Visual spot-check attested by human.
**What fails:** Any critical/high in `.review/phase9-issues.json` without a corresponding `fix(09):` commit. Token-drift scanner reports non-zero. Tab-bar occlusion spec reports any non-whitelisted overlap. Spot-check discovers a "looks wrong" case not surfaced by automation → file as new issue → fix → re-run.

**Estimated runtime per route:**
- Button/nav/empty/toast buckets: ~15-25 s per route per project. 54 routes × 2 projects × 4 buckets = ~108 scenario-bucket cells × 20 s = ~36 min total if serial, ~10-15 min with `test.describe.parallel()` where safe.
- Token drift (one-shot static analysis): ~10 s total.
- Tab-bar occlusion (mobile only, ~50 routes): ~2-3 min.
- **Full Phase 9 sweep wall-clock target: ≤ 30 min**, matching the Phase 07.1 D-17 budget. If exceeded, shard by persona across multiple workers.

### Sampling Rate

- **Per task commit:** `REVIEW_RUN=1 npx playwright test tests/review/checklist/<bucket>.spec.ts --grep <touched-route>` — runs the single affected bucket spec against the single route being fixed (~30 sec).
- **Per wave merge:** `REVIEW_RUN=1 npm run review:phase9 -- --quick` — runs all 6 bucket specs against the Phase 07.1 seed (skips `--profile=empty` sweep); ~15 min.
- **Phase gate:** `REVIEW_RUN=1 npm run review:phase9 -- --full` — full sweep including both seed profiles + visual spot-check checkpoint; ~25-30 min. 09-REVIEW.md must show `phase9_complete: true` before `/gsd:verify-work 9`.

### Wave 0 Gaps

Files/infrastructure that must exist BEFORE Wave 1 implementation:

- [ ] `tests/review/checklist/01-button-duplication.spec.ts` — covers QA-01/02/03/05b
- [ ] `tests/review/checklist/02-empty-states.spec.ts` — covers QA-01/02/03 (empty bucket)
- [ ] `tests/review/checklist/03-error-toasts.spec.ts` — covers QA-01/02/03 (toast bucket)
- [ ] `tests/review/checklist/04-navigation-gaps.spec.ts` — covers QA-01/02/03 (nav bucket)
- [ ] `tests/review/checklist/05-token-drift.spec.ts` — covers QA-05a (calls static-analysis helper)
- [ ] `tests/review/checklist/06-mobile-tab-bar-occlusion.spec.ts` — covers QA-05c (mobile only)
- [ ] `tests/review/config/phase9-empty-state-map.json` — per-route expected empty-state phrase (14-18 routes)
- [ ] `tests/review/config/phase9-token-allowlist.json` — permitted className patterns (or generated from `globals.css`)
- [ ] `scripts/review/phase9-token-drift.ts` — static-analysis walker over src/
- [ ] `scripts/review/phase9-issue-collector.ts` — aggregator for `.review/phase9-*.json` → `.review/phase9-issues.json`
- [ ] `scripts/review/phase9-report-writer.ts` — 09-REVIEW.md emitter (model on `report-writer.ts`)
- [ ] `scripts/review/seed-test-data.ts` — EXTEND with `--profile=empty` flag
- [ ] `package.json` — add `review:phase9` script wiring
- [ ] Update `.planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-VALIDATION.md` seeded from this section

**Framework install:** None needed. All deps already present.

## Sources

### Primary (HIGH confidence)

- `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-CONTEXT.md` — D-01..D-22 decisions; `<deferred>` block rejecting pixel-diff; `<success_criteria>` 11 criteria; `<for_downstream_agents>` directives.
- `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-VALIDATION.md` — existing per-task sampling rates + command templates reused for Phase 9.
- `tests/review/routes/manifest.ts` — 54 entries, D-14 schema with per-route `contentAssertion` + `primaryCta` + `seedAs`.
- `tests/review/routes/discover.ts` — `fast-glob src/app/**/page.tsx` returns 54 (verified 2026-04-23).
- `playwright.config.ts` — `review-desktop` + `mobile-375` projects under `REVIEW_RUN=1`.
- `tests/review/helpers/{page-ready,cta-probe,a11y,errors,loading-states}.ts` — D-11/D-13/D-12 helpers.
- `scripts/review/{run-full-sweep,auto-fix-loop,report-writer}.ts` — 16-gate aggregator, D-19/D-20 auto-fix loop, MD report emitter.
- `src/app/globals.css` — OKLCH token registry + allowed hue policy (brand ≈ 152°, forbidden families: red/purple/strong blue outside warning/destructive).
- `src/components/shared/mobile-tab-bar.tsx` — `HIDE_TAB_BAR_PATTERNS` exclusion list + 66px height calc for occlusion math.
- `src/components/ui/button-variants.ts` — shadcn variant definitions (default/ink/brand/destructive/outline/secondary/ghost/ghost-premium/link × default/sm/lg/xl/icon).
- `package.json` — installed versions: `@playwright/test@1.59.1`, `@axe-core/playwright@4.11.2`, `@lhci/cli@0.15.1`, `supabase@2.93.1`, `vitest@3.2.4`, `fast-glob@3.3.3`, `cross-env@7.0.3`, `tsx@4.21.0`.
- `AGENTS.md` — Next.js 16 breaking-changes notice; `node_modules/next/dist/docs/` is authoritative (verified present: `01-app/`, `02-pages/`, `03-architecture/`, `04-community/`).
- `CLAUDE.md` — project stack, Korean UI, shadcn/Tailwind 4, mock-removal policy, GSD workflow enforcement.
- `.planning/STATE.md` — Phase 9 depends on Phase 7; Phase 07.1 Plan 01 ✅, Plan 02 partial (Task 4/6 human checkpoints pending but not Phase 9-blocking).
- `.planning/ROADMAP.md` Phase 9 §.
- `.planning/REQUIREMENTS.md` QA-01..QA-05 text.
- Verified 2026-04-23: `npm view <pkg> version` confirms all installed versions are latest.

### Secondary (MEDIUM confidence)

- Playwright visual-testing 2026 guidance (WebSearch, 2026-04) — confirms `toHaveScreenshot()` exists, but also confirms WHY Phase 07.1 rejected it (flakiness on timing/rendering/env drift; maintenance cost of baselines in CI). Reinforces Pitfall 4 anti-pattern.
- Phase 07.1 code review records (`reviews/07.1-codex-review.md`, `reviews/07.1-local-code-review.md`) — confirm the harness design is production-grade; Phase 9 can trust and extend.

### Tertiary (LOW confidence — flagged for planner validation)

- Exact TAB_BAR_HEIGHT = 66px — measured from `mobile-tab-bar.tsx` layout (`h-12 w-full` + `pt-2 pb-2` + `env(safe-area-inset-bottom)`), but actual pixel height can differ per device under simulation. **Planner should verify** by running a quick `await tabBar.boundingBox()` probe in Wave 0 smoke; if the measured height differs, update the constant in `06-mobile-tab-bar-occlusion.spec.ts`.
- "Full Phase 9 sweep ≤ 30 min" runtime estimate — derived from per-bucket per-route estimates (~20 s × 108 × 4 buckets). **Planner should validate** by running a single-bucket single-route smoke and extrapolating. If it exceeds budget, shard via `--workers=N` (safe for non-mutating specs per Open Question 3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps installed, versions verified against registry on 2026-04-23
- Architecture / harness reuse: HIGH — reading the existing code shows all helpers, projects, auth, seed, aggregator are production-grade and exactly suited to being extended
- Route inventory: HIGH — `discoverRoutes()` and `manifest.ts` agree on 54; manifest self-check PASS per Phase 07.1 VALIDATION.md row 07.1-01-03
- Pitfalls: HIGH — each pitfall derives from a specific existing code artifact (manifest self-check, allow-list schema, MobileTabBar layout, tab-bar hide patterns, auto-fix loop whitelist)
- Automation boundary per bucket: MEDIUM — the buckets themselves are clear, but whether bucket 3 (error toasts) needs route interception per-route or a handful of generic failure-injection patterns is a planner-discretion detail. Documented the two options in the Validation Architecture section.
- Runtime estimates: LOW — these are back-of-envelope. Planner should smoke one full route-bucket cell and extrapolate.

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days — test stack is stable; Phase 07.1 substrate is not expected to change under Phase 9)

---

## RESEARCH COMPLETE

**Phase:** 9 - UI/UX Full Sweep (54 routes × Desktop + Mobile 375px)
**Confidence:** HIGH

### Key Findings

- **Route count is 54, not 55** — authoritative source is `discoverRoutes()` + `tests/review/routes/manifest.ts` (self-checked). ROADMAP's "55" is a pre-harness estimate; do not invent a 55th route.
- **Phase 9 extends Phase 07.1, does not rebuild** — `review-desktop` + `mobile-375` Playwright projects, D-14 manifest schema, 5 helpers (page-ready, cta-probe, a11y, errors, loading-states), deterministic Supabase seed, MD report writer — all production-grade, reusable as-is.
- **Zero new runtime dependencies** — `@playwright/test` 1.59.1, `@axe-core/playwright` 4.11.2, `@lhci/cli` 0.15.1, `supabase` 2.93.1 already installed and at latest versions.
- **Automation boundary is ~70-80%** — 4 checklist buckets fully automatable (button duplication, navigation gaps, token drift, tab-bar occlusion); 2 require overlays (empty-state needs `--profile=empty` seed; error-toast needs failure-injection); final visual spot-check is a mandatory human checkpoint for QA-04 evidence.
- **Do NOT invoke Phase 07.1 auto-fix loop on Phase 9 issues** — Phase 9 findings are semantic (design decisions), not mechanical. Regex fix generation will make wrong choices. Human-authored commits linking `.review/phase9-issues.json` entries is the correct path per QA-04.

### File Created

`C:\Users\TK\Desktop\salaryjob_v1\.planning\phases\09-ui-ux-full-sweep-55-routes-desktop-mobile-375px\09-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All deps installed and at latest (verified via `npm view`) |
| Architecture | HIGH | Harness reuse path reads directly from existing working code |
| Pitfalls | HIGH | Each pitfall anchored to a specific line/file in the existing harness |
| Automation per QA- | MEDIUM | Bucket boundaries clear; some intra-bucket strategy left to planner discretion |
| Runtime estimates | LOW | Back-of-envelope; planner should smoke one cell and extrapolate |

### Open Questions

See `## Open Questions` section (5 items): frontmatter schema for 09-REVIEW.md, auto-fix whitelist extension (recommendation: don't), parallelism (safe for read-only specs), issue tracking (file-based recommended), new `PHASE9_RUN=1` flag (recommendation: not needed).

### Ready for Planning

Research complete. Planner can produce 09-01-PLAN.md (Wave 0 — infra extension: manifest fields, seed profile, token allow-list, issue collector, report writer) + 09-02-PLAN.md (Wave 1 — 6 checklist specs + visual spot-check checkpoint + fix loop of human-authored commits linked to issues).
