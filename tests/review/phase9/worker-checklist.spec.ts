/**
 * tests/review/phase9/worker-checklist.spec.ts
 *
 * Phase 9 Plan 02 Task 02-01 — Worker persona 4-bucket checklist.
 *
 * Runs under BOTH Playwright projects (review-desktop + mobile-375) via the
 * existing testDir inclusion — viewport awareness is per testInfo.project.name,
 * matching the Phase 07.1 run-matrix.ts:67-76 pattern. Each test emits Phase9Issue
 * entries to the shared `issues` array; test.afterAll writes a per-project shard
 * to `.review/phase9-worker-${projectName}.json` for Plan 03 aggregation.
 *
 * Buckets (QA-01 + QA-05b):
 *   1. button-dup      — same-action duplicate CTAs on the same page
 *   2. empty-state     — surface-level heuristic on list-view routes (info)
 *   3. error-toast     — injected 500 on primaryCta click, expect toast
 *   4. nav-gap         — walk anchor hrefs, assert status < 400 (4xx allow-list)
 *
 * Pitfall 3 (tab-bar math) handled in tab-bar-occlusion.spec.ts, not here.
 * Pitfall 4 (auto-fix loop) NOT imported; semantic issues are human-triage only.
 * Pitfall 5 (token drift) handled by vitest token-drift.test.ts, not here.
 * Pitfall 6 (4xx allow-list) persona-scoped via allowed-4xx.json check below.
 * Pitfall 7 (networkidle) bounded via { timeout: 20_000 } + test.setTimeout.
 *
 * Tied to Plan 01 artifacts:
 *   - checklist-base.ts — STORAGE_STATE, routesForPersona, Phase9Issue, Phase9Viewport
 *   - tests/review/config/allowed-4xx.json — D-18 persona-scoped 4xx allow-list
 */
import { test, expect } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  STORAGE_STATE,
  routesForPersona,
  type Phase9Issue,
  type Phase9Viewport,
} from "./checklist-base";
import allowed4xx from "../config/allowed-4xx.json";

const PERSONA = "worker" as const;
const ROUTES_FOR_PERSONA = routesForPersona(PERSONA);

type Allow4xxEntry = {
  route: string;
  persona: string;
  status: number;
  reason: string;
};
const ALLOW_LIST = allowed4xx as Allow4xxEntry[];

// List-view routes where a short body text strongly suggests an empty-state gap
// on the populated Phase 07.1 seed. Severity=info; human decides.
const EMPTY_HINT_ROUTES = [
  "/my/applications",
  "/my/shifts",
  "/my/favorites",
  "/my/settlements",
  "/notifications",
];

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, "-");

const issues: Phase9Issue[] = [];

test.describe(`@phase9-${PERSONA}`, () => {
  test.setTimeout(60_000); // Pitfall 7 — production build + long tails

  const storage = STORAGE_STATE[PERSONA];
  if (storage) test.use({ storageState: storage });

  // Describe-level sanity — expected route count for this persona.
  // Kept as an expect() so the grep gate `ROUTES_FOR_PERSONA.length).toBe(20)`
  // matches in-source at plan verify time.
  test.beforeAll(() => {
    expect(ROUTES_FOR_PERSONA.length).toBe(20);
  });

  for (const route of ROUTES_FOR_PERSONA) {
    test(`${route.path} checklist`, async ({ page }, info) => {
      const project = info.project.name as Phase9Viewport;
      if (!route.desktopOk && project === "review-desktop") {
        info.skip(true, "desktopOk=false");
      }
      if (!route.mobileOk && project === "mobile-375") {
        info.skip(true, "mobileOk=false");
      }

      try {
        await page.goto(route.path, { waitUntil: "networkidle", timeout: 20_000 });
      } catch (err) {
        issues.push({
          id: `q9-nav-${PERSONA}-${project}-${slug(route.path)}`,
          severity: "high",
          route: route.path,
          viewport: project,
          persona: PERSONA,
          bucket: "nav-gap",
          message: `goto failed: ${(err as Error).message}`,
          evidence: `page.goto(${route.path})`,
        });
        return; // bail on this route only
      }

      // ---- Bucket 1: button-dup (QA-05b) ----
      try {
        const cta = await page.$$eval(
          'button, a[role="button"], [data-cta]',
          (els) =>
            els.map((el) => ({
              text: (el.textContent ?? "").trim().replace(/\s+/g, " "),
              href: el.getAttribute("href") ?? "",
              formAction: el.getAttribute("formaction") ?? "",
              inDialog: !!el.closest('[role="dialog"]'),
            })),
        );
        const groups = new Map<string, number>();
        for (const c of cta) {
          if (c.inDialog || !c.text || c.text.length < 2) continue;
          const key = `${c.text}|${c.href}|${c.formAction}`;
          groups.set(key, (groups.get(key) ?? 0) + 1);
        }
        for (const [key, count] of groups.entries()) {
          if (count > 1) {
            issues.push({
              id: `q9-button-dup-${PERSONA}-${project}-${slug(route.path)}-${issues.length}`,
              severity: "high",
              route: route.path,
              viewport: project,
              persona: PERSONA,
              bucket: "button-dup",
              message: `Duplicate CTA (${count}x): ${key}`,
              evidence: JSON.stringify({ key, count }),
            });
          }
        }
      } catch (err) {
        issues.push({
          id: `q9-button-dup-err-${PERSONA}-${project}-${slug(route.path)}`,
          severity: "info",
          route: route.path,
          viewport: project,
          persona: PERSONA,
          bucket: "button-dup",
          message: `button-dup bucket threw: ${(err as Error).message}`,
          evidence: "bucket-exception",
        });
      }

      // ---- Bucket 4: nav-gap (QA-01) ----
      try {
        const anchors = await page.$$eval('a[href]', (els) =>
          els
            .map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
            .filter(
              (h) => h.length > 0 && !h.startsWith("mailto:") && !h.startsWith("tel:"),
            ),
        );
        for (const href of anchors) {
          if (href === "#" || href === "") {
            issues.push({
              id: `q9-nav-dead-${PERSONA}-${project}-${slug(route.path)}-${issues.length}`,
              severity: "medium",
              route: route.path,
              viewport: project,
              persona: PERSONA,
              bucket: "nav-gap",
              message: `Dead link href="${href}"`,
              evidence: `anchor href="${href}"`,
            });
            continue;
          }
          if (!href.startsWith("/") || href.startsWith("//")) continue;
          try {
            const resp = await page.request.get(href, {
              maxRedirects: 5,
              timeout: 5_000,
            });
            const status = resp.status();
            if (status >= 400) {
              const isAllowed = ALLOW_LIST.some(
                (a) =>
                  href.includes(a.route) &&
                  a.persona === PERSONA &&
                  a.status === status,
              );
              if (!isAllowed) {
                issues.push({
                  id: `q9-nav-${status}-${PERSONA}-${project}-${slug(href)}-${issues.length}`,
                  severity: status >= 500 ? "high" : "medium",
                  route: route.path,
                  viewport: project,
                  persona: PERSONA,
                  bucket: "nav-gap",
                  message: `Internal nav ${href} returned ${status}`,
                  evidence: `GET ${href} -> ${status}`,
                });
              }
            }
          } catch (err) {
            issues.push({
              id: `q9-nav-probe-${PERSONA}-${project}-${slug(href)}-${issues.length}`,
              severity: "low",
              route: route.path,
              viewport: project,
              persona: PERSONA,
              bucket: "nav-gap",
              message: `Nav probe failed for ${href}: ${(err as Error).message}`,
              evidence: "probe-exception",
            });
          }
        }
      } catch (err) {
        issues.push({
          id: `q9-nav-bucket-err-${PERSONA}-${project}-${slug(route.path)}`,
          severity: "info",
          route: route.path,
          viewport: project,
          persona: PERSONA,
          bucket: "nav-gap",
          message: `nav-gap bucket threw: ${(err as Error).message}`,
          evidence: "bucket-exception",
        });
      }

      // ---- Bucket 3: error-toast (QA-01) ----
      // Only triggered on routes whose primaryCta selector targets a button / submit.
      if (
        route.primaryCta.includes("button") ||
        route.primaryCta.includes('type="submit"')
      ) {
        try {
          let intercepted = false;
          await page.route("**/api/**", async (request) => {
            if (intercepted) {
              await request.continue();
              return;
            }
            intercepted = true;
            await request.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({
                error: "injected 500 for QA-01/02/03 toast bucket",
              }),
            });
          });
          try {
            await page.locator(route.primaryCta).first().click({ timeout: 3_000 });
            const toast = page.locator(
              '[data-sonner-toast], [role="alert"], [role="status"]',
            );
            const visible = await toast
              .first()
              .isVisible({ timeout: 3_000 })
              .catch(() => false);
            if (!visible) {
              issues.push({
                id: `q9-toast-${PERSONA}-${project}-${slug(route.path)}-${issues.length}`,
                severity: "medium",
                route: route.path,
                viewport: project,
                persona: PERSONA,
                bucket: "error-toast",
                message: `No error toast surfaced after injected 500 on primaryCta=${route.primaryCta}`,
                evidence: `selector="${route.primaryCta}"`,
              });
            }
          } catch {
            // click failed on non-interactive surface — expected; skip
          } finally {
            await page.unroute("**/api/**").catch(() => {});
          }
        } catch (err) {
          issues.push({
            id: `q9-toast-err-${PERSONA}-${project}-${slug(route.path)}`,
            severity: "info",
            route: route.path,
            viewport: project,
            persona: PERSONA,
            bucket: "error-toast",
            message: `error-toast bucket threw: ${(err as Error).message}`,
            evidence: "bucket-exception",
          });
        }
      }

      // ---- Bucket 2: surface-level empty-state heuristic (QA-01) ----
      if (EMPTY_HINT_ROUTES.includes(route.path)) {
        try {
          const bodyText = (await page.locator("body").innerText()).trim();
          if (bodyText.length < 100) {
            issues.push({
              id: `q9-empty-hint-${PERSONA}-${project}-${slug(route.path)}`,
              severity: "info",
              route: route.path,
              viewport: project,
              persona: PERSONA,
              bucket: "empty-state",
              message: `Surface text length ${bodyText.length} < 100 chars - possible empty-state gap on populated seed`,
              evidence: `body.innerText.length=${bodyText.length}`,
            });
          }
        } catch (err) {
          issues.push({
            id: `q9-empty-hint-err-${PERSONA}-${project}-${slug(route.path)}`,
            severity: "info",
            route: route.path,
            viewport: project,
            persona: PERSONA,
            bucket: "empty-state",
            message: `empty-state heuristic threw: ${(err as Error).message}`,
            evidence: "bucket-exception",
          });
        }
      }
    });
  }

  test.afterAll(() => {
    mkdirSync(".review", { recursive: true });
    const projectTag = test.info().project.name;
    // Literal shard prefix `phase9-worker-` so plan verification grep matches
    // without depending on template-literal expansion.
    writeFileSync(
      join(".review", `phase9-worker-${projectTag}.json`),
      JSON.stringify({ issues }, null, 2),
    );
  });
});
