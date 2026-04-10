// Empty stub for 'server-only' package in Vitest test environment.
// Next.js bundles 'server-only' internally; vitest runs outside Next's resolver.
// This stub allows modules that import "server-only" (a marker to prevent
// accidental client-side imports) to be loaded in the test runner.
export {};
