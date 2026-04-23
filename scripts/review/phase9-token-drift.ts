/**
 * scripts/review/phase9-token-drift.ts
 *
 * Static token-drift detector for QA-05a — 3-tier regex analyzer
 * per 09-RESEARCH.md Pitfall 5.
 *
 *   Tier 1 REJECT: bg-[#hex], text-[#hex], border-[#hex]
 *                  (raw hex inside Tailwind arbitrary values)
 *   Tier 2 ALLOW:  bg-[color-mix(...var(--X)...)], bg-[var(--X)],
 *                  text-[var(--X)], border-[var(--X)]
 *   Tier 3 REJECT: bg-{red|blue|pink|purple|indigo|violet|fuchsia|rose}-\d+
 *                  EXCEPT `bg-destructive` (shadcn token alias).
 *
 * Input:  src filetree under TS/TSX extensions.
 * Output: .review/phase9-token-drift.json   (Phase9Issue[] shape)
 * Exit:   0 when 0 findings, non-zero when findings present
 *         (so a CI job or Plan 03 Task 03-01a can fail-fast).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import fg from "fast-glob";
import allowlist from "../../tests/review/phase9/config/token-allowlist.json";
import type { Phase9Issue } from "../../tests/review/phase9/checklist-base";

const HEX_REJECT = new RegExp(allowlist.forbiddenHexRegex);
const HUE_REJECT = new RegExp(
  `\\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:${allowlist.forbiddenHueFamilies.join("|")})-\\d+`,
  "g",
);

type Hit = {
  file: string;
  line: number;
  match: string;
  tier: "hex" | "hue";
};

/**
 * Walk src/ (or a caller-provided root) and return Phase 9 issues for every
 * line that matches Tier 1 (raw hex) or Tier 3 (forbidden hue family). The
 * `bg-destructive` exception is honored in Tier 3.
 */
export async function scanDrift(srcDir = "src"): Promise<Phase9Issue[]> {
  const files = await fg([`${srcDir}/**/*.{ts,tsx}`], { absolute: false });
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Tier 1 — raw hex in arbitrary value.
      const hex = line.match(HEX_REJECT);
      if (hex) {
        hits.push({ file, line: i + 1, match: hex[0]!, tier: "hex" });
      }

      // Tier 3 — forbidden hue family (with bg-destructive exception).
      // HUE_REJECT is a global regex so we drive it with matchAll.
      const hueMatches = line.matchAll(HUE_REJECT);
      for (const m of hueMatches) {
        if (m[0] === "bg-destructive") continue;
        hits.push({ file, line: i + 1, match: m[0]!, tier: "hue" });
      }
    }
  }

  return hits.map((h, idx) => ({
    id: `q05a-${h.tier}-${h.file.replace(/[^a-z0-9]/gi, "-")}-${h.line}-${idx}`,
    severity: h.tier === "hex" ? "high" : "medium",
    route: "(static-analysis)",
    viewport: "review-desktop" as const,
    persona: "anon" as const,
    bucket: "token-drift" as const,
    message:
      h.tier === "hex"
        ? `Raw hex in arbitrary className: ${h.match}`
        : `Forbidden hue family: ${h.match}`,
    evidence: `${h.file}:${h.line}`,
  }));
}

async function main(): Promise<void> {
  const issues = await scanDrift("src");
  mkdirSync(".review", { recursive: true });
  writeFileSync(
    ".review/phase9-token-drift.json",
    JSON.stringify(issues, null, 2),
  );
  console.log(
    `[phase9-token-drift] ${issues.length} finding(s) written to .review/phase9-token-drift.json`,
  );
  process.exit(issues.length === 0 ? 0 : 1);
}

if (require.main === module) void main();
