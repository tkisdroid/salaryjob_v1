# Testing Setup and Coverage (Updated 2026-04-23 for Phase 07.1)

## Current State

- **Unit framework**: `vitest@^3.2.4` (installed); config at `vitest.config.ts`. Quick run: `npm run test -- --run`.
- **E2E framework**: `@playwright/test@^1.59.1` (installed); config at `playwright.config.ts`. Chromium Desktop project is live; Phase 07.1 adds `mobile-375` + 3 setup projects.
- **A11y engine**: `@axe-core/playwright@^4.11` (added in Phase 07.1).
- **Perf engine**: `@lhci/cli@^0.15` (added in Phase 07.1).
- **Local DB**: `supabase` CLI `^2.90` (devDep in Phase 07.1); stack at 127.0.0.1:54321/54322/54323/54324 per D-04.

## Test Directories

- `tests/e2e/` — 19 existing specs (Phase 4/5/6 baseline; Success Criteria #8 requires GREEN).
- `tests/admin`, `tests/applications`, `tests/auth`, `tests/availability`, `tests/business`, `tests/data`, `tests/errors`, `tests/exit`, `tests/fixtures`, `tests/helpers`, `tests/jobs`, `tests/ocr`, `tests/profile`, `tests/proxy`, `tests/storage` — vitest unit/integration.
- `tests/review/` — NEW (Phase 07.1): `fixtures/`, `routes/`, `helpers/`, `flows/`, `smoke/`, `config/`, `auth.setup.ts`.

## Scripts

- `npm run test` — vitest (existing)
- `npm run test:e2e` — playwright against prod Supabase (existing; unchanged by 07.1)
- `npm run review:stack` — boot local Supabase stack + apply migrations + seed (NEW, D-01..D-08)
- `npm run review:seed` — re-run deterministic seed against running stack
- `npm run review:smoke` — single-route smoke path (all gates, 1 URL)
- `npm run review:quality` — tsc + eslint + vitest + e2e smoke
- `npm run review` — orchestrates stack + seed + full sweep + auto-fix + report (Plan 02)

## Environment files

- `.env.local` — production Supabase (unchanged)
- `.env.test` — local stack URLs (gitignored, written at runtime by `start-local-stack.ts`). Preferred when `REVIEW_RUN=1` env is set.

## Known Drift (2026-04-23)

- `tests/proxy/redirect.test.ts` + `tests/storage/avatar-upload.test.ts` + Phase 5 `tests/e2e/*.spec.ts` have pre-existing TS drift (STATE.md Known Risks); out of scope for 07.1.

## Conventions

- Fixtures: `tests/helpers/*` + `tests/review/fixtures/*`. Fixed UUIDs for review seed per D-06/D-08.
- Auth pattern: `storageState.json` per persona via Playwright setup-project + project dependencies.
- Assertion philosophy (07.1): content anchor (D-11c) is the true readiness gate; `networkidle` kept for compat per Pitfall 3.
