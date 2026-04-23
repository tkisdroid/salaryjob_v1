/**
 * tests/review/helpers/loading-states.ts
 *
 * D-11e loading-skeleton selector list. Referenced by checkPageReady() assertion (e) —
 * any of these still visible after 5s stabilization window = FAIL (D-22 white-screen guard).
 *
 * Additions require a code-comment justification; removals require CONTEXT.md amendment.
 */

export const LOADING_SELECTORS: readonly string[] = [
  '[data-testid="loading"]',
  '[data-testid="skeleton"]',
  '[role="status"][aria-busy="true"]',
  ".animate-pulse", // Tailwind skeleton idiom
  'text="로딩 중"', // Korean loading text
  'text="불러오는 중"', // Korean "fetching..."
];
