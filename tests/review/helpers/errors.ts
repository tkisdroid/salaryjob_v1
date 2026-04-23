/**
 * tests/review/helpers/errors.ts
 *
 * G1/G2/G3/G4/G5 runtime collectors (D-17). Call once per test at the start
 * (before navigation) to accumulate:
 *   G1 jsErrors          — uncaught JS exceptions
 *   G2 consoleErrors     — console.level === 'error'
 *   G3 consoleWarnings   — console.level === 'warning'
 *   G4/G5 badResponses   — any response status >= 400
 *
 * Caller filters 4xx allow-list against tests/review/config/allowed-4xx.json (D-18).
 *
 * Source: RESEARCH.md Code Example 2.
 */

import type { Page } from "@playwright/test";

export type RuntimeCollectors = {
  jsErrors: Error[];
  consoleErrors: string[];
  consoleWarnings: string[];
  badResponses: { url: string; status: number }[];
};

export function hookErrorCollectors(page: Page): RuntimeCollectors {
  const jsErrors: Error[] = [];
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const badResponses: { url: string; status: number }[] = [];

  page.on("pageerror", (err) => jsErrors.push(err));

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
    if (msg.type() === "warning") consoleWarnings.push(msg.text());
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) badResponses.push({ url: res.url(), status });
  });

  return { jsErrors, consoleErrors, consoleWarnings, badResponses };
}
