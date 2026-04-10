import { describe, it } from "vitest";

describe.skip("Phase 3 — Worker Profile CRUD (WORK-01..04)", () => {
  describe("WORK-01: name, nickname, avatar, bio", () => {
    it.todo("updateWorkerProfile persists name + nickname + bio to DB");
    it.todo("avatar field stores public URL after upload");
  });

  describe("WORK-02: preferredCategories", () => {
    it.todo("stores JobCategory[] array in DB");
    it.todo("re-reading workerProfile returns same categories");
  });

  describe("WORK-03: badge/rating/totalJobs readonly exposure", () => {
    it.todo("getCurrentWorker returns real badgeLevel, rating, totalJobs from DB");
    it.todo("completionRate is read-only in form (cannot be set via Server Action)");
  });

  describe("WORK-04: own-row RLS + DAL owner check", () => {
    it.todo("updateWorkerProfile uses requireWorker session.id — no userId param from form");
    it.todo("attempting to update another user's workerProfile throws/redirects");
  });
});
