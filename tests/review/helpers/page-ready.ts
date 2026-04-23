/**
 * tests/review/helpers/page-ready.ts
 *
 * D-11 five-assertion reusable helper. Each sub-assertion is independently FAIL-capable
 * and emits a `_msg` field on failure so the aggregator can report WHICH sub-assertion
 * failed (closing note of D-11: "each assertion is independently FAIL-capable").
 *
 *   (a) a_status     — page status 200..399 (no error redirect loop)
 *   (b) b_loaded     — domcontentloaded within 5s AND networkidle within 15s
 *   (c) c_content    — `[data-testid="page-root"]` OR route-specific anchor text found
 *   (d) d_textLen    — body innerText length > 50 chars (D-22 white-screen guard)
 *   (e) e_noSkeleton — no LOADING_SELECTORS element visible after 5s stabilization
 *
 * Source: RESEARCH.md Pattern 3; CONTEXT.md D-11.
 */

import type { Page } from "@playwright/test";
import { LOADING_SELECTORS } from "./loading-states";

export type PageReadyResult = {
  a_status: boolean;
  a_status_msg?: string;
  b_loaded: boolean;
  b_loaded_msg?: string;
  c_content: boolean;
  c_content_msg?: string;
  d_textLen: boolean;
  d_textLen_msg?: string;
  e_noSkeleton: boolean;
  e_noSkeleton_msg?: string;
};

export async function checkPageReady(
  page: Page,
  path: string,
  contentAssertion: string | RegExp,
): Promise<PageReadyResult> {
  const r: PageReadyResult = {
    a_status: false,
    b_loaded: false,
    c_content: false,
    d_textLen: false,
    e_noSkeleton: false,
  };

  // (a) status 200..399 (no redirect-loop — page.goto throws on infinite redirects)
  try {
    const response = await page.goto(path, { waitUntil: "commit" });
    if (!response) {
      r.a_status_msg = "no response from page.goto";
      return r;
    }
    const status = response.status();
    r.a_status = status >= 200 && status < 400;
    if (!r.a_status) r.a_status_msg = `status=${status}`;
  } catch (e) {
    r.a_status_msg = (e as Error).message;
    return r;
  }

  // (b) domcontentloaded within 5s + networkidle within 15s
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    r.b_loaded = true;
  } catch (e) {
    r.b_loaded_msg = (e as Error).message;
  }

  // (c) content assertion — `[data-testid="page-root"]` OR manifest-specified anchor
  const root = page.locator('[data-testid="page-root"]');
  if ((await root.count()) > 0) {
    r.c_content = true;
  } else {
    const anchor =
      typeof contentAssertion === "string"
        ? page.getByText(contentAssertion, { exact: false })
        : page.getByText(contentAssertion);
    if ((await anchor.count()) > 0) {
      r.c_content = true;
    } else {
      r.c_content_msg = `neither page-root testid nor anchor '${String(contentAssertion)}' found`;
    }
  }

  // (d) body innerText length > 50 chars
  const body = page.locator("body");
  const txt = (await body.innerText()).trim();
  r.d_textLen = txt.length > 50;
  if (!r.d_textLen) r.d_textLen_msg = `only ${txt.length} chars visible`;

  // (e) no loading skeleton/spinner after 5s stabilization
  await page.waitForTimeout(5_000);
  const counts = await Promise.all(
    LOADING_SELECTORS.map((s) => page.locator(s).count()),
  );
  r.e_noSkeleton = counts.every((n) => n === 0);
  if (!r.e_noSkeleton) {
    const idx = counts.findIndex((n) => n > 0);
    r.e_noSkeleton_msg = `loading element still visible: ${LOADING_SELECTORS[idx]}`;
  }

  return r;
}
