# Review Harness — Phase 07.1

> Self-contained QA harness per `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-CONTEXT.md`.
> Platform reference: **Windows 11 + WSL2 + Docker Desktop** (D-03). Other platforms work but are untested.

## Windows/WSL2/Docker Desktop — First-Run Checklist

1. **Install WSL2:**
   ```powershell
   wsl --install
   wsl --status   # confirm Version: 2
   ```

2. **Install Docker Desktop:** https://www.docker.com/products/docker-desktop
   - Settings → General → "Use the WSL 2 based engine" ON
   - Settings → Resources → WSL integration: enable for your distro
   - Settings → Resources → Advanced: ≥ 8 GB memory, ≥ 4 CPUs (Pitfall 2)

3. **Tune `.wslconfig`** (`%USERPROFILE%\.wslconfig`):
   ```
   [wsl2]
   memory=8GB
   processors=4
   autoMemoryReclaim=gradual
   ```
   Then `wsl --shutdown` and restart Docker Desktop.

4. **Verify Docker is reachable:**
   ```bash
   docker info   # must exit 0
   ```

5. **Port collision mitigation** (Pitfall 1): If `npm run review:stack` fails with "port reserved / WSAEACCES" on 54321/54322/54323/54324, run in admin cmd:
   ```cmd
   net stop hns && net start hns
   ```
   Then retry. Do NOT shift ports (D-04 locks defaults).

6. **Install Node ≥ 20:** `node -v` should print v20.x or later.

7. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```

## Usage

```bash
npm run review:stack     # boot supabase + migrations + seed (5-10 min cold start)
npm run review:smoke     # single-route smoke (< 60s)
npm run review           # full sweep + auto-fix + report (≤ 30 min)
```

## Environment Variables

`.env.test` (gitignored, auto-written by `scripts/review/start-local-stack.ts`):
```
API_URL=http://127.0.0.1:54321
DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
STUDIO_URL=http://127.0.0.1:54323
INBUCKET_URL=http://127.0.0.1:54324
```
(D-04 locked values — do not edit manually.)

`SEED_DEV_PASSWORD` — optional; defaults to `gignowdev`. Must match the password used by the seed script when it calls `auth.admin.createUser`.

## D-17 Gate Table (reference)

G1 runtime JS errors = 0; G2 console errors = 0; G3 console warnings = 0; G4 network 4xx = 0 (except D-18 allow-list); G5 network 5xx = 0; G6 tsc --noEmit = 0 errors; G7 eslint errors = 0 (warnings allowed); G8 axe critical+serious = 0; G9 LCP ≤ 2.5s; G10 TTI ≤ 3.5s; G11 initial JS ≤ 200KB; G12 CLS ≤ 0.1; G13 D-11 content assertions all pass; G14 D-13 CTA probe all pass; G15 7 E2E loops each ≤ 60s; G16 vitest run all pass.

## Auto-fix Scope (D-19 / D-20)

**Writable (WHITELIST):** `src/components/**`, `src/app/**/{page,layout,loading,error,not-found}.tsx`, `src/lib/actions/**`, `src/app/api/**/route.ts` (except webhooks), `src/lib/services/**` (except payment*), `src/lib/validations/**`, `src/styles/**`, Tailwind classes, `tests/**`.

**Blocked (DENY):** `src/lib/supabase/**`, `prisma/schema.prisma` core fields (id/@relation/timestamps/required PK-FK), `supabase/migrations/**`, `.env*`, `next.config.ts`, `package.json` deps, `src/app/api/webhooks/**`, `src/lib/services/payment*`, `middleware.ts`.

Any denied-path edit attempt → abort + `MANUAL-FIX-NEEDED.md` entry (requires human "reviewed by human, accepted" footer before phase close per SC #6).

## Local Stack URLs Quick Reference (D-04)

| Service | URL | Port |
|---------|-----|------|
| Supabase REST API | http://127.0.0.1:54321 | 54321 |
| Postgres DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres | 54322 |
| Supabase Studio | http://127.0.0.1:54323 | 54323 |
| Inbucket (email catcher) | http://127.0.0.1:54324 | 54324 |

## Troubleshooting

### `supabase start` hangs on "Creating container..."
Windows HNS reserved-port conflict. Run `net stop hns && net start hns` as admin, retry.

### `waitForLoadState('networkidle')` times out on all routes
Docker memory starvation. Increase `.wslconfig` `memory=8GB`, run `wsl --shutdown`, restart Docker Desktop.

### LHCI stalls downloading Chromium on first run
LHCI is fetching its own Chromium (~200 MB). `.lighthouserc.js` sets `chromePath: chromium.executablePath()` to reuse Playwright's. Run `npx playwright install chromium` first.

### Prisma client reports "Unknown argument"
`src/generated/prisma` drift. Run `npx prisma generate` and retry.

## First-Run Time Target (QA-06 acceptance)

A new developer on a freshly-installed Windows 11 / WSL2 / Docker Desktop host should complete steps 1-7 above and reach `npm run review:stack` READY in **< 15 minutes** (excluding Docker Desktop installer download time). If slower, capture the slow step and file against QA-06.

## References

- Phase context: `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-CONTEXT.md`
- Research pitfalls: `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-RESEARCH.md`
- Validation map: `.planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-VALIDATION.md`
- Supabase CLI: https://supabase.com/docs/guides/cli/local-development
- Playwright projects + auth: https://playwright.dev/docs/auth#multiple-signed-in-roles
- @axe-core/playwright: https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
- Lighthouse CI: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html
