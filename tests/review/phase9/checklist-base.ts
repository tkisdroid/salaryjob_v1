/**
 * tests/review/phase9/checklist-base.ts
 *
 * Phase 9 — UI/UX Full Sweep checklist overlay base.
 *
 * Rationale: Phase 07.1 produced all the substrate (54-route manifest, persona
 * storageStates, Playwright review-desktop + mobile-375 projects, helpers). Phase 9
 * is a SEMANTIC overlay on that substrate — duplicate CTAs, empty-state phrases,
 * error toasts, navigation gaps, token drift, mobile tab-bar occlusion.
 *
 * This module MUST NOT duplicate Phase 07.1 logic. It re-exports `ROUTES` from the
 * authoritative manifest and re-uses the `STORAGE_STATE` shape defined in
 * tests/review/routes/run-matrix.ts lines 51-57.
 *
 * See:
 *   - .planning/phases/09-ui-ux-full-sweep/09-RESEARCH.md — Pattern 1 (Checklist
 *     Overlay), Pitfall 3 (tab-bar math), Pitfall 5 (3-tier token regex)
 *   - src/components/shared/mobile-tab-bar.tsx — HIDE_TAB_BAR_PATTERNS + height calc
 */

import type { ReviewRoute, ReviewSeedAs } from "../routes/manifest";
import { ROUTES } from "../routes/manifest";

// Re-export the 54-route manifest verbatim so downstream specs never fork it.
export { ROUTES };
export type { ReviewRoute, ReviewSeedAs };

/**
 * Persona storage-state map — same shape as tests/review/routes/run-matrix.ts:51-57.
 * Keys are `ReviewSeedAs`; values are the persona auth JSON path produced by
 * `tests/review/auth.setup.ts`. `anon` has no storageState (unauthenticated).
 */
export const STORAGE_STATE: Record<ReviewSeedAs, string | undefined> = {
  worker: "playwright/.auth/worker.json",
  biz: "playwright/.auth/biz.json",
  admin: "playwright/.auth/admin.json",
  anon: undefined,
};

/**
 * Mobile tab bar height in pixels under the Playwright `mobile-375` project.
 *
 * Measured from src/components/shared/mobile-tab-bar.tsx: the `<nav>` uses
 * `h-12` (48px) for the icon row, `pt-2 pb-2` (16px total vertical padding on
 * the inner <ul>), plus a 1-2px top border (`border-t border-border-soft`).
 * `env(safe-area-inset-bottom)` is 0 inside Playwright Chromium. Total ~= 66px.
 *
 * If a future redesign changes the height, update this constant AND the
 * `mobile-tab-bar.tsx` tokens together in the same commit.
 */
export const TAB_BAR_HEIGHT = 66;

/**
 * Routes where the mobile tab bar is intentionally hidden (HIDE_TAB_BAR_PATTERNS
 * in src/components/shared/mobile-tab-bar.tsx:30-33). These are byte-for-byte
 * identical — the occlusion check must use the SAME regexes or it will false-
 * positive on routes that purposefully replace the tab bar with a focused CTA.
 *
 *   /^\/my\/applications\/[^/]+\/check-in$/ — check-in flow (own sticky CTA)
 *   /^\/posts\/[^/]+\/apply$/               — apply-confirm flow (own sticky CTA)
 */
export const TAB_BAR_HIDDEN: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/,
  /^\/posts\/[^/]+\/apply$/,
];

/**
 * Phase 9 runs under the two Playwright projects Phase 07.1 already wired
 * (playwright.config.ts lines 37-53). No new Playwright project is added.
 */
export const PHASE9_VIEWPORTS = ["review-desktop", "mobile-375"] as const;
export type Phase9Viewport = (typeof PHASE9_VIEWPORTS)[number];

/**
 * Forbidden Tailwind color hue families per src/app/globals.css comment block
 * "빨강/보라/강한 파랑은 경고 상황 외에는 사용하지 않음". The one allowed
 * exception is `bg-destructive` (shadcn token alias, not a raw hue).
 */
export const FORBIDDEN_HUE_FAMILIES = [
  "red",
  "blue",
  "pink",
  "purple",
  "indigo",
  "violet",
  "fuchsia",
  "rose",
] as const;

export type Phase9Severity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type Phase9Bucket =
  | "button-dup"
  | "empty-state"
  | "error-toast"
  | "nav-gap"
  | "token-drift"
  | "tab-bar-occlusion";

/**
 * Canonical Phase 9 issue record. Written by Plan 02 checklist specs to
 * `.review/phase9-*.json` shards; aggregated by
 * `scripts/review/phase9-issue-writer.ts --aggregate` to
 * `.review/phase9-issues.json`. Humans populate `fixCommit` after authoring
 * a fix commit (QA-04 — fix commits linked to issue entries).
 */
export type Phase9Issue = {
  /** Stable slug e.g. "q05b-posts-id-button-dup-review-desktop". */
  id: string;
  severity: Phase9Severity;
  route: string;
  viewport: Phase9Viewport;
  persona: ReviewSeedAs;
  bucket: Phase9Bucket;
  message: string;
  /** Free-form — selector snapshot, JSON dump, or file:line anchor. */
  evidence: string;
  /** Short SHA of the fix commit (populated by human after fix lands). */
  fixCommit?: string;
};

/**
 * Filter the 54-route manifest by persona. Used by Plan 02 specs to shard
 * worker / biz / admin checklists into separate files.
 */
export function routesForPersona(
  persona: ReviewSeedAs,
): readonly ReviewRoute[] {
  return ROUTES.filter((r) => r.seedAs === persona);
}

/**
 * Returns true if the given path matches any TAB_BAR_HIDDEN pattern — i.e.,
 * the tab bar is intentionally hidden on this route by design. The
 * tab-bar-occlusion spec MUST skip these routes.
 */
export function isTabBarHidden(path: string): boolean {
  return TAB_BAR_HIDDEN.some((re) => re.test(path));
}
