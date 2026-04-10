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
