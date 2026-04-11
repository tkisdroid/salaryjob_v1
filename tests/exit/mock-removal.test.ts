// RED BASELINE (Wave 0): This test will FAIL on first run because:
//   1. src/lib/mock-data.ts still exists
//   2. grep still finds imports in src/
//   3. prisma/seed.ts still imports from mock-data
// Plan 06 turns all 3 assertions GREEN.
// REQ: DATA-05 — Phase 5 종료 시 mock-data.ts 의존 경로 0개 (파일 삭제 + grep 검증)

import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

describe("DATA-05: mock-data.ts exit gate", () => {
  it("src/lib/mock-data.ts file does not exist", async () => {
    const fs = await import("node:fs/promises");
    await expect(fs.stat("src/lib/mock-data.ts")).rejects.toThrow(/ENOENT/);
  });

  it("zero src/ imports of mock-data", () => {
    let matches = "";
    try {
      matches = execSync(
        `grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' ` +
          `-E "from ['\\"](@/lib/mock-data|\\.\\.\\.?/.*mock-data)['\\"]" ` +
          `src/ --exclude-dir=generated`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch (e: unknown) {
      // grep exit code 1 = no matches = SUCCESS
      const status = (e as { status?: number } | null)?.status;
      if (status === 1) return; // PASS
      throw e;
    }
    // If we got here, grep found matches → FAIL with helpful output
    throw new Error(
      `DATA-05 EXIT GATE FAILED — mock-data imports still exist in src/:\n${matches}`,
    );
  });

  it("prisma/seed.ts does not import from src/lib/mock-data", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("prisma/seed.ts", "utf8");
    expect(content).not.toMatch(/mock-data/);
  });
});
