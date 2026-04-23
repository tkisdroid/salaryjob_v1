#!/usr/bin/env node
/**
 * LEG-03 Regression Gate — Phase 10
 *
 * Fails fast if any file under src/ imports from @/lib/mock-data or a relative
 * mock-data path. Intended to run in CI and (optionally) pre-commit.
 *
 * Why a Node script and not `grep -rE`:
 *   1. Cross-platform — Windows devs run this without WSL.
 *   2. Zero runtime dependency — no `bash`/`rg`/`grep` assumptions.
 *   3. Consistent regex with tests/exit/mock-removal.test.ts (DATA-05 exit gate).
 *
 * Exit codes:
 *   0 — no violations
 *   1 — violation(s) found (prints list to stderr)
 *   2 — internal error (e.g., src/ missing)
 *
 * Usage:
 *   node scripts/check-no-mock-imports.mjs
 *   npm run check:no-mock
 */

import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "src");

// Same pattern as tests/exit/mock-removal.test.ts line 67.
const IMPORT_PATTERN = /from\s+['"](?:@\/lib\/mock-data|\.+\/.*mock-data)['"]/;

const SKIP_DIRS = new Set([
  "node_modules",
  "generated", // Prisma generated output
  ".next",
  ".git",
  "dist",
  "build",
]);

const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...(await collectSourceFiles(full)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (INCLUDE_EXT.has(ext)) out.push(full);
    }
  }
  return out;
}

async function main() {
  try {
    await readdir(SRC_DIR);
  } catch {
    console.error(`[check-no-mock-imports] FATAL: src/ not found at ${SRC_DIR}`);
    process.exit(2);
  }

  const files = await collectSourceFiles(SRC_DIR);
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (IMPORT_PATTERN.test(content)) {
      violations.push(path.relative(REPO_ROOT, file));
    }
  }

  if (violations.length === 0) {
    console.log(
      `[check-no-mock-imports] OK - ${files.length} source files scanned, 0 mock-data imports found.`,
    );
    process.exit(0);
  }

  console.error(
    `[check-no-mock-imports] FAIL - ${violations.length} file(s) import from src/lib/mock-data:`,
  );
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  console.error(
    "\nRefusing to commit/build. Remove these imports before continuing.",
  );
  console.error(
    "Context: CLAUDE.md \"Mock removal\" + Phase 10 LEG-03 regression prevention.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("[check-no-mock-imports] INTERNAL ERROR:", err);
  process.exit(2);
});
