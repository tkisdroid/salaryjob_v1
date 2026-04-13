// Wave 0 RED tests — D-27/D-28 admin routing assertions
//
// These tests are INTENTIONALLY RED until Wave 3 patches src/lib/auth/routing.ts
// to add ADMIN-specific routing behaviour.
//
// Flip to GREEN: Wave 3 (Plan 06-03) must:
//   1. getDefaultPathForRole('ADMIN') → '/admin'
//   2. canRoleAccessPath('ADMIN', '/admin') → true
//   3. canRoleAccessPath('BUSINESS', '/admin') → false
//   4. canRoleAccessPath('WORKER', '/admin') → false
//   5. canRoleAccessPath('ADMIN', '/biz') → true (cross-access retained)
//   6. canRoleAccessPath('ADMIN', '/home') → true (cross-access retained)
//
// No DB required — pure unit test on the routing helpers.

import { describe, it, expect } from "vitest";
import {
  getDefaultPathForRole,
  canRoleAccessPath,
} from "@/lib/auth/routing";

describe("D-27/D-28 ADMIN routing", () => {
  it("getDefaultPathForRole('ADMIN') returns '/admin'", () => {
    expect(getDefaultPathForRole("ADMIN")).toBe("/admin");
  });

  it("canRoleAccessPath('ADMIN', '/admin') returns true", () => {
    expect(canRoleAccessPath("ADMIN", "/admin")).toBe(true);
  });

  it("canRoleAccessPath('BUSINESS', '/admin') returns false (non-admin blocked)", () => {
    expect(canRoleAccessPath("BUSINESS", "/admin")).toBe(false);
  });

  it("canRoleAccessPath('WORKER', '/admin') returns false (non-admin blocked)", () => {
    expect(canRoleAccessPath("WORKER", "/admin")).toBe(false);
  });

  it("canRoleAccessPath('ADMIN', '/biz') returns true (ADMIN retains cross-access)", () => {
    expect(canRoleAccessPath("ADMIN", "/biz")).toBe(true);
  });

  it("canRoleAccessPath('ADMIN', '/home') returns true (ADMIN retains cross-access)", () => {
    expect(canRoleAccessPath("ADMIN", "/home")).toBe(true);
  });
});
