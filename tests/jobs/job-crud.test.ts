import { describe, it } from "vitest";

describe.skip("Phase 3 — Job CRUD (POST-01..03)", () => {
  describe("POST-01: createJob stores full payload", () => {
    it.todo("persists title/category/hourlyPay/transportFee/workDate/startTime/endTime/headcount");
    it.todo("persists address/addressDetail/dressCode/duties/requirements/whatToBring/tags arrays");
    it.todo("computes workHours from startTime/endTime");
    it.todo("copies lat/lng from BusinessProfile when form omits them");
  });

  describe("POST-02: getJobsByBusiness", () => {
    it.todo("returns jobs only for the requireBusiness session's BusinessProfile ids");
    it.todo("does NOT return jobs from other businesses");
  });

  describe("POST-03: updateJob + deleteJob owner auth check", () => {
    it.todo("updateJob succeeds when session.id === job.authorId");
    it.todo("updateJob throws when session.id !== job.authorId (non-owner)");
    it.todo("deleteJob throws when session.id !== job.authorId");
  });
});
