// Phase 07.1 — deterministic test fixtures. D-06 (fixed UUIDs), D-07 (coverage), D-08 (reserved local email).
// DO NOT change these values without amending CONTEXT.md decisions.

export const WORKER_IDS = {
  verified: "11111111-1111-4111-8111-111111111111",
  newly_joined: "22222222-2222-4222-8222-222222222222",
  banned: "33333333-3333-4333-8333-333333333333",
} as const;

export const BIZ_IDS = {
  verified: "44444444-4444-4444-8444-444444444444",
  pending_ocr: "55555555-5555-4555-8555-555555555555",
  rejected: "66666666-6666-4666-8666-666666666666",
} as const;

export const ADMIN_ID = "77777777-7777-4777-8777-777777777777";

export const WORKER_EMAIL = "dev+worker@local.test";
export const BIZ_EMAIL = "dev+biz@local.test";
export const ADMIN_EMAIL = "dev+admin@local.test"; // D-08 reserved local-only

export const JOB_IDS = Array.from(
  { length: 10 },
  (_, i) => `88888888-8888-4888-8888-${String(i + 1).padStart(12, "0")}`,
) as readonly string[];

export const APPLICATION_IDS = Array.from(
  { length: 5 },
  (_, i) => `99999999-9999-4999-8999-${String(i + 1).padStart(12, "0")}`,
) as readonly string[];

export const SHIFT_IDS = [
  "aaaa1111-1111-4111-8111-111111111111",
  "aaaa2222-2222-4222-8222-222222222222",
] as const;

export const REVIEW_IDS = [
  "bbbb1111-1111-4111-8111-111111111111", // worker→biz
  "bbbb2222-2222-4222-8222-222222222222", // biz→worker
  "bbbb3333-3333-4333-8333-333333333333", // both-sided paired
] as const;

export const SETTLEMENT_IDS = [
  "cccc1111-1111-4111-8111-111111111111", // processed
] as const;

// Freeze-time anchor (D-06) — seeds use this in created_at / updated_at for stable snapshots
export const FROZEN_NOW = "2026-04-20T09:00:00.000Z";
