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
    exclude: ['node_modules', 'tests/e2e/**', '.next'],
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
