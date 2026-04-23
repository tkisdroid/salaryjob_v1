import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Phase 07.1 — when REVIEW_RUN=1, prefer .env.test (local Supabase stack per D-04)
// over the production .env.local / .env. Other shells still see the prod env.
if (process.env.REVIEW_RUN === '1') loadEnv({ path: '.env.test' });
loadEnv({ path: '.env.local' });
loadEnv();

const isReview = process.env.REVIEW_RUN === '1';

// Phase 07.1 D-09 — setup projects + review-desktop + mobile-375 gate on REVIEW_RUN=1
// so the existing `chromium` e2e pipeline is unaffected when the env flag is absent.
const reviewProjects = isReview
  ? [
      {
        name: 'setup-worker',
        testDir: './tests/review',
        testMatch: /auth\.setup\.ts/,
        use: {},
        metadata: { persona: 'worker' as const },
      },
      {
        name: 'setup-biz',
        testDir: './tests/review',
        testMatch: /auth\.setup\.ts/,
        use: {},
        metadata: { persona: 'biz' as const },
      },
      {
        name: 'setup-admin',
        testDir: './tests/review',
        testMatch: /auth\.setup\.ts/,
        use: {},
        metadata: { persona: 'admin' as const },
      },
      {
        name: 'review-desktop',
        testDir: './tests/review',
        // Ignore auth.setup.ts (run as its own project) AND any `.test.ts`
        // file — the latter is vitest territory (Phase 9 static-analysis tests
        // under tests/review/phase9/). Playwright's default testMatch covers
        // both `.spec.ts` and `.test.ts`, so we narrow it here to keep the
        // two runners non-overlapping.
        testIgnore: [/auth\.setup\.ts/, /.*\.test\.ts$/],
        dependencies: ['setup-worker', 'setup-biz', 'setup-admin'],
        use: { ...devices['Desktop Chrome'] },
      },
      {
        // D-09 exact project name — required by verification grep `mobile-375`.
        name: 'mobile-375',
        testDir: './tests/review',
        testIgnore: [/auth\.setup\.ts/, /.*\.test\.ts$/],
        dependencies: ['setup-worker', 'setup-biz', 'setup-admin'],
        use: {
          ...devices['iPhone 13 Mini'],
          viewport: { width: 375, height: 812 },
        },
      },
    ]
  : [];

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  // Supabase-backed auth E2E reuses shared seeded accounts. Run serially so
  // concurrent logout/login tests do not invalidate each other's sessions.
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/review/_results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...reviewProjects,
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // Pitfall 3 — under REVIEW_RUN=1 prefer production build so networkidle
        // assertions don't race the Next.js HMR websocket heartbeat.
        command: isReview ? 'npm run build && npm run start' : 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: isReview ? 180_000 : 120_000,
      },
});
