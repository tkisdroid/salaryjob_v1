// Phase 07.1 — Lighthouse CI config. G9..G12 budget assertions per D-17.
// Source: RESEARCH.md Pattern 5.
// Chromium path pinned to Playwright's bundle (Pitfall 5) so LHCI doesn't download
// its own 200MB binary and we avoid LCP drift between Playwright and LHCI runs.

const { chromium } = require('@playwright/test');

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/', // smoke URL; full-sweep runner overrides dynamically
      ],
      numberOfRuns: 3,
      // LHCI must own its own Next.js server lifecycle. Prior to this, the
      // Playwright subprocess was starting the server via webServer config, and
      // the server was torn down when the Playwright process exited — leaving
      // LHCI autorun (which runs after Playwright) with nothing at :3000.
      // startServerCommand + startServerReadyPattern make LHCI spin up its own
      // `next start` and wait for the ready log line before probing URLs.
      startServerCommand: 'npm run build && npm run start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 180000,
      chromePath: chromium.executablePath(), // Pitfall 5 — reuse Playwright Chromium
      settings: {
        preset: 'desktop',
        chromeFlags: '--headless=new --no-sandbox',
        skipAudits: ['uses-http2'], // HTTP/1.1 from `next start` topology
      },
    },
    assert: {
      assertions: {
        // D-17 G9 — Largest Contentful Paint ≤ 2.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        // D-17 G10 — Time To Interactive ≤ 3.5s
        interactive: ['error', { maxNumericValue: 3500 }],
        // D-17 G12 — Cumulative Layout Shift ≤ 0.1
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // D-17 G11 — initial JS transfer ≤ 200 KB (204800 bytes)
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 204800 },
        ],
      },
    },
    upload: { target: 'filesystem', outputDir: '.review/lhci' },
  },
};
