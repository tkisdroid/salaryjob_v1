/**
 * DATA-05 Exit Gate — Phase 5 Plan 06
 *
 * Asserts that src/lib/mock-data.ts has been permanently deleted and that
 * no source file in src/ imports from it. This test must stay GREEN forever:
 * any re-introduction of mock-data will immediately fail CI.
 *
 * 3 assertions:
 *   1. src/lib/mock-data.ts does not exist (fs.stat → ENOENT)
 *   2. No src/ .ts/.tsx file contains an import from @/lib/mock-data or relative mock-data path
 *   3. prisma/seed.ts does NOT contain an import from ../src/lib/mock-data
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

/**
 * Recursively collect all .ts/.tsx files under a directory,
 * skipping node_modules and generated directories.
 */
async function collectTsFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "generated" ||
        entry.name === ".next" ||
        entry.name === ".git"
      ) {
        continue;
      }
      results.push(...(await collectTsFiles(fullPath)));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("DATA-05 exit gate: mock-data.ts permanently removed", () => {
  it("src/lib/mock-data.ts does not exist (ENOENT)", async () => {
    const filePath = path.join(ROOT, "src", "lib", "mock-data.ts");
    const err = await fs.stat(filePath).then(
      () => null,
      (e: NodeJS.ErrnoException) => e
    );
    expect(err, "mock-data.ts still exists — DATA-05 not satisfied").not.toBeNull();
    expect(err!.code, "Expected ENOENT but got a different error").toBe("ENOENT");
  });

  it("no src/ file imports from @/lib/mock-data or relative mock-data path", async () => {
    const srcDir = path.join(ROOT, "src");
    const files = await collectTsFiles(srcDir);

    // Pattern: from "@/lib/mock-data" OR from "../lib/mock-data" etc.
    const importPattern = /from\s+['"](?:@\/lib\/mock-data|\.+\/.*mock-data)['"]/;

    const violations: string[] = [];
    for (const file of files) {
      const content = await fs.readFile(file, "utf8");
      if (importPattern.test(content)) {
        violations.push(path.relative(ROOT, file));
      }
    }

    expect(
      violations,
      `Found mock-data imports in src/ — remove these:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });

  it("prisma/seed.ts does not import from ../src/lib/mock-data", async () => {
    const seedPath = path.join(ROOT, "prisma", "seed.ts");
    const content = await fs.readFile(seedPath, "utf8");
    expect(
      content,
      "prisma/seed.ts still references src/lib/mock-data — detach it to prisma/seed-data.ts"
    ).not.toContain("src/lib/mock-data");
  });
});
