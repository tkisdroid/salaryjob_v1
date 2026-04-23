/**
 * tests/review/phase9/admin-checklist.spec.ts
 *
 * Phase 9 Plan 02 Task 02-02 — Admin persona 4-bucket checklist.
 *
 * Clone of worker-checklist.spec.ts with PERSONA=admin + admin-specific
 * EMPTY_HINT_ROUTES. All bucket logic is functionally identical; documentation
 * lives in worker-checklist.spec.ts module header.
 *
 * Covers QA-03 (Admin routes all buckets) for the 4 admin routes in
 * tests/review/routes/manifest.ts seedAs='admin'.
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

const PERSONA = "admin" as const;
const ROUTES_FOR_PERSONA = routesForPersona(PERSONA);

type Allow4xxEntry = {
  route: string;
  persona: string;
  status: number;
  reason: string;
};
const ALLOW_LIST = allowed4xx as Allow4xxEntry[];

const EMPTY_HINT_ROUTES = ["/admin/businesses", "/admin/settlements"];

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, "-");

const issues: Phase9Issue[] = [];

test.describe(`@phase9-${PERSONA}`, () => {
  test.setTimeout(60_000);

  const storage = STORAGE_STATE[PERSONA];
  if (storage) test.use({ storageState: storage });

  test.beforeAll(() => {
    expect(ROUTES_FOR_PERSONA.length).toBe(4);
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
        return;
      }

      // ---- Bucket 1: button-dup ----
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

      // ---- Bucket 4: nav-gap ----
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

      // ---- Bucket 3: error-toast ----
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

      // ---- Bucket 2: empty-state heuristic ----
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
    // Literal shard prefix `phase9-admin-` so plan verification grep matches
    // without depending on template-literal expansion.
    writeFileSync(
      join(".review", `phase9-admin-${projectTag}.json`),
      JSON.stringify({ issues }, null, 2),
    );
  });
});
