/**
 * tests/review/helpers/cta-probe.ts
 *
 * D-13 interaction probe: click the route's primary CTA and assert ONE of
 *   'url' (URL changed) | 'modal' (role=dialog appeared) | 'toast' (role=status / sonner) |
 *   'network' (any request/response fired)
 * Zero response => 'no-response' (FAIL — triggers D-22 white-screen guard).
 *
 * Source: RESEARCH.md Code Example 4; CONTEXT.md D-13.
 */

import type { Page } from "@playwright/test";

export type CtaProbeResult =
  | "url"
  | "modal"
  | "toast"
  | "network"
  | "no-response";

export async function probeCta(
  page: Page,
  selector: string,
): Promise<CtaProbeResult> {
  const startUrl = page.url();

  // Race both request and response with short timeout — swallow timeouts into null.
  const reqPromise = page
    .waitForRequest(() => true, { timeout: 3_000 })
    .catch(() => null);
  const responsePromise = page
    .waitForResponse(() => true, { timeout: 3_000 })
    .catch(() => null);

  // Best-effort click; missing selector should not throw the probe, just fall through.
  await page
    .locator(selector)
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {});

  // Modal / toast sync DOM checks take precedence over URL/network (cheapest signals).
  if ((await page.locator('[role="dialog"]').count()) > 0) return "modal";
  if (
    (await page.locator('[data-sonner-toast], [role="status"]').count()) > 0
  ) {
    return "toast";
  }

  if (page.url() !== startUrl) return "url";

  const req = await reqPromise;
  const res = await responsePromise;
  if (req || res) return "network";

  return "no-response";
}
