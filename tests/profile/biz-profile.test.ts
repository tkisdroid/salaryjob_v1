import { describe, it } from "vitest";

describe.skip("Phase 3 — Business Profile CRUD (BIZ-01..03)", () => {
  describe("BIZ-01: name, address, category, logo emoji, description", () => {
    it.todo("updateBusinessProfile persists name/category/logo/address/description");
    it.todo("lat/lng persist as Decimal");
  });

  describe("BIZ-02: rating/reviewCount/completionRate readonly", () => {
    it.todo("getBusinessProfileByUserId returns rating/reviewCount/completionRate as read-only");
  });

  describe("BIZ-03: owner-only edit", () => {
    it.todo("updateBusinessProfile uses requireBusiness session.id, not form-supplied id");
    it.todo("attempting to update another user's businessProfile throws/redirects");
  });
});
