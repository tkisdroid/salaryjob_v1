import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environmentMatchGlobs: [
      ['tests/data/**', 'node'],
      ['tests/auth/**', 'node'],
      ['tests/proxy/**', 'node'],
      ['tests/components/**', 'jsdom'],
      ['**', 'node'],
    ],
    setupFiles: ['tests/setup.ts'],
    // Phase 9 note: narrow the `tests/review/**` exclude so vitest discovers
    // `tests/review/phase9/**/*.test.ts` (static-analysis unit tests) while
    // still excluding all Playwright specs (`*.spec.ts`) and the Phase 07.1
    // sub-trees (routes, fixtures, helpers, flows, smoke, config). The Phase 9
    // `.test.ts` files are vitest targets by design per 09-02-PLAN Task 02-05.
    exclude: [
      'node_modules',
      'tests/e2e/**',
      'tests/review/**/*.spec.ts',
      'tests/review/routes/**',
      'tests/review/fixtures/**',
      'tests/review/helpers/**',
      'tests/review/flows/**',
      'tests/review/smoke/**',
      'tests/review/config/**',
      'tests/review/auth.setup.ts',
      'tests/review/_results.json',
      '.next',
    ],
    testTimeout: 15000,
    // Phase 4 Plan 04 — disable file-level parallelism.
    // tests/applications/*.test.ts share the Supabase DB and each file runs
    // `TRUNCATE TABLE ... CASCADE` in beforeEach/afterEach. Running multiple
    // files in parallel would make one suite wipe rows that another suite is
    // mid-insert on, producing spurious FK violations.
    // Within a single file, `describe.it` concurrency is still allowed so
    // race tests using `Promise.all` continue to exercise real concurrency
    // inside Postgres (which is the property actually under test).
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next.js bundles 'server-only' internally; vitest runs outside Next's resolver
      // so we stub it to an empty module for Node test execution.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
